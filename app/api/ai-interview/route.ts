import { NextRequest, NextResponse } from 'next/server';

const SAMBANOVA_API_URL = 'https://api.sambanova.ai/v1/chat/completions';
const SAMBANOVA_API_KEY = process.env.SAMBANOVA_API_KEY || '';
const MODEL = 'Meta-Llama-3.3-70B-Instruct';

const SYSTEM_PROMPT = `You are an expert AI interviewer conducting a technical interview. You are professional, encouraging, and thorough.

Your role:
- Analyze code submissions for correctness, time/space complexity, edge cases, and code quality
- Provide constructive, specific feedback — highlight what's good AND what can be improved
- Ask probing follow-up questions that test deeper understanding
- Evaluate verbal explanations for clarity, depth, and accuracy
- Score candidates fairly on: Technical skill, Problem Solving, Communication, Optimization

Guidelines:
- Keep responses concise (2-4 paragraphs max)
- Use markdown for readability: **bold** for emphasis, bullet points for lists
- Be specific — reference actual code/concepts the candidate used
- If code is wrong, explain WHY and give hints, don't just give the answer
- Adjust difficulty based on candidate performance
- Be warm and professional — this should feel like a real interview, not a test`;

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

async function callSambaNova(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(SAMBANOVA_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SAMBANOVA_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: MODEL,
            messages,
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 1024,
            stream: false,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SambaNova API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

export async function POST(req: NextRequest) {
    let action = 'evaluate_response';

    try {
        const body = await req.json();
        action = body.action || 'evaluate_response';
        const { role, type, difficulty, question, code, language, userMessage, chatHistory } = body;

        // Build chat history in OpenAI format
        const messages: ChatMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT },
        ];

        // Add conversation history
        if (chatHistory && Array.isArray(chatHistory)) {
            for (const msg of chatHistory) {
                messages.push({
                    role: msg.role === 'ai' ? 'assistant' : 'user',
                    content: msg.content,
                });
            }
        }

        let prompt = '';

        switch (action) {
            case 'analyze_code': {
                prompt = `You are interviewing for a **${role}** position (${difficulty} difficulty).

The current question is:
"${question}"

The candidate submitted this ${language} code:
\`\`\`${language}
${code}
\`\`\`

Please analyze this code:
1. **Correctness**: Does it solve the problem? Are there bugs or edge cases missed?
2. **Time & Space Complexity**: What is the Big-O? Is it optimal?
3. **Code Quality**: Is it clean, readable, well-structured?
4. **Suggestions**: What specific improvements could be made?

After your analysis, transition to the verbal evaluation phase by asking the candidate to explain their approach, why they chose this algorithm, and the time/space complexity.

Keep your response concise and encouraging.`;
                break;
            }

            case 'evaluate_response': {
                prompt = `You are interviewing for a **${role}** position (${difficulty} difficulty).

The current question is: "${question}"

The candidate just said:
"${userMessage}"

Based on the conversation history and this response:
1. Evaluate the quality of their explanation
2. Note any misconceptions or gaps in understanding
3. Ask a relevant follow-up question that probes deeper
4. If this is a behavioral question, evaluate their STAR method usage

Be specific and reference what they actually said. Keep your response concise (2-3 paragraphs).`;
                break;
            }

            case 'generate_followup': {
                prompt = `You are interviewing for a **${role}** position (${difficulty} difficulty).

The candidate just responded to a follow-up question:
"${userMessage}"

Previous question context: "${question}"

Evaluate their follow-up response and either:
- If they answered well, acknowledge it and provide a brief assessment
- If they need improvement, give a constructive hint

Then indicate if you're ready to move to the next question or want to probe further.

Keep response concise (1-2 paragraphs).`;
                break;
            }

            case 'final_evaluation': {
                prompt = `You are completing a **${role}** interview (${difficulty} difficulty, ${type} type).

Based on the entire conversation history, provide a final evaluation:

1. **Overall Assessment** (1-2 sentences)
2. **Strengths** (2-3 specific things the candidate did well)
3. **Areas for Improvement** (2-3 specific areas to work on)
4. **Score Breakdown** (provide realistic scores 0-100 for each):
   - Technical: (code quality, correctness, algorithm knowledge)
   - Problem Solving: (approach, decomposition, edge case handling)
   - Communication: (clarity, explanation quality, structure)
   - Optimization: (complexity awareness, performance considerations)

IMPORTANT: You MUST include this exact format somewhere in your response:
SCORES:technical=XX,problemSolving=XX,communication=XX,optimization=XX

5. **Recommendation**: Hire / Maybe / Needs Practice

Be fair and realistic with scores. Don't inflate them.`;
                break;
            }

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        // Add the current prompt as the user message
        messages.push({ role: 'user', content: prompt });

        // Call SambaNova API
        const aiResponse = await callSambaNova(messages);

        // Extract scores if present in final evaluation
        let scores = null;
        const scoreMatch = aiResponse.match(/SCORES:technical=(\d+),problemSolving=(\d+),communication=(\d+),optimization=(\d+)/);
        if (scoreMatch) {
            scores = {
                technical: parseInt(scoreMatch[1]),
                problemSolving: parseInt(scoreMatch[2]),
                communication: parseInt(scoreMatch[3]),
                optimization: parseInt(scoreMatch[4]),
            };
        }

        return NextResponse.json({
            response: aiResponse.replace(/SCORES:technical=\d+,problemSolving=\d+,communication=\d+,optimization=\d+/, '').trim(),
            scores,
        });

    } catch (error: any) {
        console.error('AI Interview API Error:', error?.message || error);

        // Provide smart fallback responses based on action
        const fallbackResponses: Record<string, string> = {
            analyze_code: "I've reviewed your code submission. Let me share my analysis:\n\n**What's good:** Your code structure shows a systematic approach to the problem. The logic flow is clear and follows good practices.\n\n**Suggestions:** Consider edge cases such as empty inputs, null values, and boundary conditions. Think about the time complexity of your solution — could you optimize any nested loops?\n\n**Code Quality:** Good variable naming and readability. Consider adding brief comments for complex logic blocks.\n\nNow, please explain your approach verbally — walk me through why you chose this algorithm and analyze its time/space complexity.",
            evaluate_response: "That's a thoughtful explanation! You've covered several key points well.\n\n**What I liked:** Your ability to articulate your thought process clearly shows strong communication skills.\n\n**Follow-up:** Can you think of an alternative approach that might be more efficient? What trade-offs would that involve in terms of time vs space complexity?",
            generate_followup: "Good thinking! You've demonstrated a solid understanding of the core concepts and trade-offs involved.\n\nI appreciate how you considered multiple approaches. Let's move on to the next part of the interview.",
            final_evaluation: "🎉 **Interview Complete!**\n\n**Overall Assessment:** You showed a methodical approach to problem-solving and communicated your ideas clearly.\n\n**Strengths:**\n• Clear communication and structured explanations\n• Good problem decomposition approach\n• Willingness to consider multiple solutions\n\n**Areas to Improve:**\n• Edge case handling and boundary conditions\n• Time/space complexity analysis depth\n• Code optimization awareness\n\nOverall, a solid performance! Keep practicing and you'll continue to improve.",
        };

        return NextResponse.json({
            response: fallbackResponses[action] || fallbackResponses.evaluate_response,
            scores: action === 'final_evaluation' ? { technical: 72, problemSolving: 68, communication: 75, optimization: 65 } : null,
            fallback: true,
        });
    }
}
