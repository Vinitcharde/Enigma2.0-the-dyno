import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { code, language, question, role } = await req.json();

    if (!code?.trim() || code.trim().length < 20) {
      return NextResponse.json({ success: false, error: 'No meaningful code provided' }, { status: 400 });
    }

    if (!process.env.SAMBANOVA_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.SAMBANOVA_API_KEY,
      baseURL: 'https://api.sambanova.ai/v1',
    });

    const prompt = `You are an expert coding judge evaluating a candidate's code submission for a technical interview.

Language: ${language}
Role: ${role || 'Software Engineer'}
Interview Question:
"""
${question || 'General coding problem'}
"""

Submitted Code:
\`\`\`${language}
${code}
\`\`\`

Carefully analyze whether this code:
1. Correctly solves the stated problem
2. Handles edge cases (empty input, null, single element, large input)
3. Produces logically correct output

Generate 3-5 realistic test cases for this problem and evaluate the code against them mentally.

Respond ONLY with a JSON object in this EXACT format (no markdown, no extra text):
{
  "isCorrect": true,
  "passedCases": 3,
  "totalCases": 4,
  "testResults": [
    { "input": "example input", "expected": "expected output", "actual": "actual output", "passed": true },
    { "input": "edge case", "expected": "expected output", "actual": "wrong output", "passed": false }
  ],
  "errorMessage": "",
  "runtime": "48ms",
  "memory": "13.4 MB",
  "verdict": "One sentence verdict explaining the result clearly",
  "wrongReason": "If isCorrect is false, explain specifically what case fails and why, otherwise empty string"
}

Rules:
- isCorrect = true only if ALL test cases pass
- Be strict and accurate — do not mark incorrect code as correct
- runtime and memory should be realistic estimates based on the algorithm's complexity
- If code has syntax errors or won't compile, isCorrect = false with passedCases = 0`;

    const response = await openai.chat.completions.create({
      model: 'Meta-Llama-3.3-70B-Instruct',
      messages: [
        { role: 'system', content: 'You are a strict coding judge. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 600,
      temperature: 0.1,
    });

    let raw = response.choices[0]?.message?.content?.trim() || '';
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    const result = JSON.parse(raw);
    return NextResponse.json({ success: true, ...result });

  } catch (err: any) {
    console.error('Run code error:', err.message);
    return NextResponse.json({ success: false, error: 'Failed to evaluate code. Check API key.' }, { status: 500 });
  }
}
