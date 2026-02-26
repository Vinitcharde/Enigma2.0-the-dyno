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
- When resume data is provided, personalize questions to the candidate's experience and skill set

Guidelines:
- Keep responses concise (2-4 paragraphs max)
- Use markdown for readability: **bold** for emphasis, bullet points for lists
- Be specific — reference actual code/concepts the candidate used
- If code is wrong, explain WHY and give hints, don't just give the answer
- Adjust difficulty based on candidate performance
- Be warm and professional — this should feel like a real interview, not a test
- When evaluating voice/verbal responses, assess: clarity, technical accuracy, logical flow, confidence, and depth

Evaluation Criteria:
Communication evaluation is integral to DSA interviews, comprising 30-50% of the assessment alongside coding skills, as it reveals how candidates collaborate, reason under pressure, and translate logic into team-friendly explanations.

- Core Integration Points: Interviewers score communication from the start: clarifying requirements (e.g., edge cases), thinking aloud (brute force -> optimal), and discussing trade-offs before coding. It fits via real-time verbalization—silence signals poor process visibility, while structured narration (problem restate -> approach -> complexity) builds trust.
- Evaluation Framework: Rubrics at FAANG-like firms grade on three pillars: problem-solving (via voice), code quality, and communication clarity/effectiveness. Strong communicators advance even with suboptimal code; e.g., explaining optimizations aloud compensates for minor bugs.`;

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

// External ML QA Model Integration (HuggingFace Pipeline)
async function callHuggingFaceQA(question: string, context: string): Promise<string | null> {
    try {
        const response = await fetch('https://api-inference.huggingface.co/models/deepset/roberta-base-squad2', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.HF_API_KEY || ''}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ inputs: { question, context } }),
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.answer || null;
    } catch {
        return null;
    }
}

function buildResumeContext(resumeData: any): string {
    if (!resumeData) return '';

    let context = '\n\n--- CANDIDATE RESUME CONTEXT ---\n';
    if (resumeData.name) context += `Name: ${resumeData.name}\n`;
    if (resumeData.seniorityLevel) context += `Seniority: ${resumeData.seniorityLevel}\n`;
    if (resumeData.yearsOfExperience) context += `Years of Experience: ${resumeData.yearsOfExperience}\n`;

    if (resumeData.skills?.length > 0) {
        context += `Skills: ${resumeData.skills.join(', ')}\n`;
    }

    if (resumeData.skillCategories) {
        for (const [category, skills] of Object.entries(resumeData.skillCategories)) {
            if ((skills as string[]).length > 0) {
                context += `  ${category}: ${(skills as string[]).join(', ')}\n`;
            }
        }
    }

    if (resumeData.experience?.length > 0) {
        context += `\nExperience:\n`;
        resumeData.experience.slice(0, 3).forEach((exp: string, i: number) => {
            context += `  ${i + 1}. ${exp.substring(0, 200)}\n`;
        });
    }

    if (resumeData.projects?.length > 0) {
        context += `\nProjects:\n`;
        resumeData.projects.slice(0, 3).forEach((proj: string, i: number) => {
            context += `  ${i + 1}. ${proj.substring(0, 200)}\n`;
        });
    }

    if (resumeData.summary) {
        context += `\nSummary: ${resumeData.summary.substring(0, 300)}\n`;
    }

    context += '--- END RESUME CONTEXT ---\n';
    return context;
}

export async function POST(req: NextRequest) {
    let action = 'evaluate_response';

    try {
        const body = await req.json();
        action = body.action || 'evaluate_response';
        const { role, type, difficulty, question, code, language, userMessage, chatHistory, resumeData, jd } = body;

        const resumeContext = buildResumeContext(resumeData);

        let avatarContext = '';
        if (type === 'avatar') {
            avatarContext = `\n\n--- AVATAR HR MODE ---\nYou are Arjun, an expert AI HR Director. Conduct the interview strictly mimicking a real HR/Technical leader. Constantly push deeper with follow-up questions linked to core competencies (Communication, Problem-Solving, Leadership). You must actively grade their Sentence Formation, Vocabulary, and Keyword Rubric Usage.\n`;
            if (jd) {
                avatarContext += `\n\n--- TARGET JOB DESCRIPTION ---\n${jd}\n--- END JD ---\nThe candidate is applying specifically to this role. Prioritize the exact keywords, frameworks, and scenarios mentioned in this JD.\n`;
            }
        }

        // Build chat history in OpenAI format
        const messages: ChatMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT + resumeContext + avatarContext },
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
            case 'generate_resume_questions': {
                prompt = `Based on the candidate's resume context provided in the system message, generate a personalized interview for a **${role}** position at **${difficulty}** difficulty.

Generate exactly 3 interview questions:
1. A **technical/DSA question** related to their strongest skills
2. A **system design question** related to their projects or experience
3. A **behavioral question** referencing their specific experience

For each question, provide:
- The question text (detailed, specific to their resume)
- The question type (dsa, system_design, or behavioral)
- A follow-up question

IMPORTANT: Format your response EXACTLY as JSON:
{
  "questions": [
    {
      "question": "...",
      "type": "dsa",
      "followUp": "..."
    },
    {
      "question": "...",
      "type": "system_design",
      "followUp": "..."
    },
    {
      "question": "...",
      "type": "behavioral",
      "followUp": "..."
    }
  ]
}

Make questions challenging but fair for their experience level (${resumeData?.seniorityLevel || 'Mid-Level'}).`;
                break;
            }

            case 'analyze_code': {
                prompt = `You are interviewing for a **${role}** position (${difficulty} difficulty).

The current question is:
"${question}"

The candidate submitted this ${language} code:
\`\`\`${language}
${code}
\`\`\`

Provide a Multi-Step AI Optimization Feedback. You MUST structure your response to provide exactly 3 actionable optimizations:
1. **Time/Space Complexity**: (Suggest structural algorithmic improvements)
2. **Edge Cases**: (Identify unhandled boundary conditions or potential bugs)
3. **Cleaner Syntax/Refactoring**: (Suggest idiomatic, cleaner syntax improvements)

This is designed to teach real interview iteration, going beyond basic scoring.
After providing the 3 optimizations, end your response EXACTLY with this voice prompt:
"Explain this refactor aloud."`;
                break;
            }

            case 'evaluate_response': {
                let mlQaExtraction = '';
                if (type === 'avatar' && jd) {
                    // Inject real ML QA Model factual extraction
                    const extractedFact = await callHuggingFaceQA(question, jd);
                    if (extractedFact) {
                        mlQaExtraction = `\n\n[ML QA MODEL SYSTEM NOTE]: A specialized deep-learning extractive QA model has parsed the Job Description and identified the following optimal factual answer snippet for this question: "${extractedFact}". Please strictly verify if the candidate's explanation aligns properly with this ML-extracted core fact.\n`;
                    }
                }

                prompt = `You are interviewing for a **${role}** position (${difficulty} difficulty).

The current question is: "${question}"

The candidate just said:
"${userMessage}"
${mlQaExtraction}
Based on the conversation history and this response:
1. Evaluate the quality of their explanation — assess **clarity**, **technical accuracy**, **logical flow**, and **depth**
2. Note any misconceptions or gaps in understanding
3. If they used good technical vocabulary, acknowledge it
4. Ask a relevant follow-up question that probes deeper
5. If this is a behavioral question, evaluate their STAR method usage

Be specific and reference what they actually said. Keep your response concise (2-3 paragraphs).`;
                break;
            }

            case 'evaluate_voice_explanation': {
                prompt = `You are interviewing for a **${role}** position (${difficulty} difficulty).

The current question is: "${question}"

The candidate just gave this VERBAL explanation (transcribed from speech):
"${userMessage}"

Analyze their verbal explanation across these dimensions:
1. **Semantic Coherence**: Does their explanation follow a logical flow?
2. **Technical Depth**: How well do they understand the underlying concepts?
3. **Vocabulary Usage**: Are they using appropriate technical terminology?
4. **Confidence Level**: Do they sound certain or hesitant? (presence of filler words, self-corrections)
5. **Communication Clarity**: Is their explanation clear enough for a team member to understand?

Provide specific feedback on HOW they communicated, not just WHAT they said.
Then ask a targeted follow-up based on any gaps you noticed.

IMPORTANT: Include a voice score at the end in this format:
VOICE_SCORES:clarity=XX,depth=XX,vocabulary=XX,confidence=XX,flow=XX

Each score should be 0-100.`;
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
${type === 'avatar' ? 'As Arjun (HR Director), provide a Rubric-based feedback dashboard analysis tied strictly to competencies (Communication, Problem-Solving, Leadership, Sentence Formation, Keyword Usage). Evaluate their communication skill analysis based on syntax and technical terminology.' : ''}

Based on the entire conversation history, provide a comprehensive final evaluation:

1. **Overall Assessment** (2-3 sentences)
2. **Strengths** (3-4 specific things the candidate did well, referencing actual moments)
3. **Areas for Improvement** (3-4 specific areas to work on with actionable advice)
4. **Voice & Communication Analysis**: How was their verbal communication? Were they clear, confident, structured?
5. **Iterative Learning Tracking**: Assess how the candidate handled the optimization/refactoring prompt. Did they incorporate feedback effectively? (We use this to track improvement across sessions)
6. **Resume Alignment**: How well did their performance match their resume skills?
7. **Score Breakdown** (provide realistic scores 0-100 for each):
   - Technical: (code quality, correctness, algorithm knowledge)
   - Problem Solving: (approach, decomposition, edge case handling)
   - Communication: (clarity, explanation quality, structure, voice fluency)
   - Optimization: (complexity awareness, handling of the 3-step refactoring)
   - Resume Relevance: (how well they demonstrated claimed skills)

IMPORTANT: You MUST include this exact format somewhere in your response:
SCORES:technical=XX,problemSolving=XX,communication=XX,optimization=XX,resumeRelevance=XX

7. **Recommendation**: Strong Hire / Hire / Maybe / Needs Practice
8. **Personalized Study Plan**: 3-5 specific topics they should study

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

        // Extract scores if present
        let scores = null;
        const scoreMatch = aiResponse.match(/SCORES:technical=(\d+),problemSolving=(\d+),communication=(\d+),optimization=(\d+)(?:,resumeRelevance=(\d+))?/);
        if (scoreMatch) {
            scores = {
                technical: parseInt(scoreMatch[1]),
                problemSolving: parseInt(scoreMatch[2]),
                communication: parseInt(scoreMatch[3]),
                optimization: parseInt(scoreMatch[4]),
                resumeRelevance: scoreMatch[5] ? parseInt(scoreMatch[5]) : 75,
            };
        }

        // Extract voice scores if present
        let voiceScores = null;
        const voiceMatch = aiResponse.match(/VOICE_SCORES:clarity=(\d+),depth=(\d+),vocabulary=(\d+),confidence=(\d+),flow=(\d+)/);
        if (voiceMatch) {
            voiceScores = {
                clarity: parseInt(voiceMatch[1]),
                depth: parseInt(voiceMatch[2]),
                vocabulary: parseInt(voiceMatch[3]),
                confidence: parseInt(voiceMatch[4]),
                flow: parseInt(voiceMatch[5]),
            };
        }

        // Try to parse questions if generate_resume_questions action
        let questions = null;
        if (action === 'generate_resume_questions') {
            try {
                const jsonMatch = aiResponse.match(/\{[\s\S]*"questions"[\s\S]*\}/);
                if (jsonMatch) {
                    questions = JSON.parse(jsonMatch[0]).questions;
                }
            } catch {
                // If JSON parsing fails, that's ok — we'll use fallback
            }
        }

        // Clean response text
        let cleanResponse = aiResponse
            .replace(/SCORES:technical=\d+,problemSolving=\d+,communication=\d+,optimization=\d+(?:,resumeRelevance=\d+)?/, '')
            .replace(/VOICE_SCORES:clarity=\d+,depth=\d+,vocabulary=\d+,confidence=\d+,flow=\d+/, '')
            .trim();

        return NextResponse.json({
            response: cleanResponse,
            scores,
            voiceScores,
            questions,
        });

    } catch (error: any) {
        console.error('AI Interview API Error:', error?.message || error);

        // Provide smart fallback responses based on action
        const fallbackResponses: Record<string, string> = {
            generate_resume_questions: '',
            analyze_code: "I've reviewed your code submission. Let's iterate on this approach!\n\nHere are 3 specific optimizations for your code:\n\n1. **Time/Space Complexity**: Consider using a hash map to reduce lookup time from O(n) to O(1).\n2. **Edge Cases**: You should handle empty inputs and null boundary conditions safely without crashing.\n3. **Cleaner Syntax/Refactoring**: Extract the nested logic into a helper function to improve readability and testability.\n\nExplain this refactor aloud.",
            evaluate_response: "That's a thoughtful explanation! You've covered several key points well.\n\n**What I liked:** Your ability to articulate your thought process clearly shows strong communication skills.\n\n**Follow-up:** Can you think of an alternative approach that might be more efficient? What trade-offs would that involve in terms of time vs space complexity?",
            evaluate_voice_explanation: "Good verbal explanation! You communicated the core concepts clearly.\n\n**Strengths:** You maintained a logical flow and used appropriate technical terminology.\n\n**Areas to improve:** Try to be more specific about complexity analysis and edge cases when explaining your approach.\n\nCan you elaborate on the time complexity of your solution and how it would perform with very large inputs?",
            generate_followup: "Good thinking! You've demonstrated a solid understanding of the core concepts and trade-offs involved.\n\nI appreciate how you considered multiple approaches. Let's move on to the next part of the interview.",
            final_evaluation: "🎉 **Interview Complete!**\n\n**Overall Assessment:** You showed a methodical approach to problem-solving and communicated your ideas clearly.\n\n**Strengths:**\n• Clear communication and structured explanations\n• Good problem decomposition approach\n• Willingness to consider multiple solutions\n\n**Areas to Improve:**\n• Edge case handling and boundary conditions\n• Time/space complexity analysis depth\n• Code optimization awareness\n\n**Recommendation:** Keep practicing with more challenging problems. Overall, a solid performance!",
        };

        return NextResponse.json({
            response: fallbackResponses[action] || fallbackResponses.evaluate_response,
            scores: action === 'final_evaluation' ? { technical: 72, problemSolving: 68, communication: 75, optimization: 65, resumeRelevance: 70 } : null,
            fallback: true,
        });
    }
}
