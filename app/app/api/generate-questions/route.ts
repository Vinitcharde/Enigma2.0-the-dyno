import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { skills, role, interviewType, difficulty, userName } = await req.json();

    if (!process.env.SAMBANOVA_API_KEY) {
      return NextResponse.json({ error: 'SambaNova API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.SAMBANOVA_API_KEY,
      baseURL: 'https://api.sambanova.ai/v1',
    });

    const skillList = (skills || []).slice(0, 15).join(', ') || 'general programming';
    const questionCount = interviewType === 'full' ? 3 : 2;
    const difficultyDesc = difficulty === 'easy' ? 'beginner-friendly (1-2 years experience)' : difficulty === 'hard' ? 'senior-level (5+ years experience)' : 'mid-level (2-4 years experience)';
    const typeInstructions: Record<string, string> = {
      full: 'Mix: 1 DSA/coding problem, 1 system design question, 1 behavioral question',
      dsa: 'All DSA/algorithm/coding problems only',
      behavioral: 'All behavioral/situational/HR questions only',
    };

    const systemPrompt = `You are a senior technical interviewer at a top tech company (Google/Amazon/Microsoft). Generate personalized interview questions as a JSON array only — no markdown, no extra text.`;

    const userPrompt = `Generate ${questionCount} personalized interview questions for:
- Role: "${role}"
- Candidate skills: ${skillList}
- Interview type: ${interviewType} — ${typeInstructions[interviewType] || typeInstructions.full}
- Difficulty: ${difficultyDesc}
- Candidate name: ${userName || 'the candidate'}

Return ONLY a JSON array in this exact format:
[
  {
    "id": 1,
    "question": "<full question, 2-4 sentences, specific to their skill set>",
    "type": "<dsa|system_design|behavioral>",
    "topic": "<specific topic e.g. Dynamic Programming, Microservices, Leadership>",
    "hint": "<helpful hint without giving away the answer>",
    "followUp": "<follow-up question to probe deeper>",
    "codeStarter": "<starter code in Python if coding question, empty string otherwise>"
  }
]

Rules:
- Questions MUST target their actual skills (${skillList})
- DSA questions must have a concrete coding problem
- System design questions must reference their tech stack
- Follow-ups must dig deeper into the same topic
- Code starters should have function signatures with examples
Respond with ONLY the JSON array.`;

    const response = await openai.chat.completions.create({
      model: 'Meta-Llama-3.3-70B-Instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    let raw = response.choices[0]?.message?.content?.trim() || '';
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    const questions = JSON.parse(raw);
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('Invalid response');

    return NextResponse.json({ success: true, questions, usedAI: true });

  } catch (err: any) {
    console.error('Question generation error:', err.message);
    // Fallback questions
    return NextResponse.json({
      success: true,
      usedAI: false,
      questions: [
        {
          id: 1,
          question: 'Given an array of integers, find the longest subarray with a sum equal to a given target k. Implement your solution.',
          type: 'dsa',
          topic: 'Sliding Window / HashMap',
          hint: 'Consider using a HashMap to store prefix sums and their indices.',
          followUp: 'What is the time and space complexity? Can you optimize further?',
          codeStarter: 'def longest_subarray(arr, k):\n    # Your solution here\n    pass\n\nprint(longest_subarray([1,2,3,-2,5], 5))',
        },
        {
          id: 2,
          question: 'Design a rate limiter system that limits each user to N requests per minute in a distributed environment.',
          type: 'system_design',
          topic: 'System Design / Rate Limiting',
          hint: 'Think about Token Bucket or Sliding Window algorithms. Redis is commonly used for distributed state.',
          followUp: 'How would you handle Redis downtime? What about burst traffic?',
          codeStarter: '',
        },
        {
          id: 3,
          question: 'Tell me about a time you had to make a difficult technical decision under time pressure. What was the outcome?',
          type: 'behavioral',
          topic: 'Decision Making Under Pressure',
          hint: 'Use the STAR method: Situation, Task, Action, Result.',
          followUp: 'What would you do differently now? What did you learn?',
          codeStarter: '',
        },
      ],
    });
  }
}
