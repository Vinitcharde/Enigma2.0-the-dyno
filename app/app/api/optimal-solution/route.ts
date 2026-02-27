import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { question, language, role } = await req.json();

    if (!process.env.SAMBANOVA_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.SAMBANOVA_API_KEY,
      baseURL: 'https://api.sambanova.ai/v1',
    });

    const prompt = `You are a world-class competitive programmer. A candidate has struggled with this problem twice and needs to see the optimal solution.

Language: ${language}
Role: ${role || 'Software Engineer'}
Problem:
"""
${question}
"""

Provide the BEST possible solution with:
- Optimal time complexity (as low as possible — prefer O(n) over O(n log n) over O(n²))
- Minimal space complexity (in-place if possible)
- Clean, production-quality code with comments explaining the approach
- Correct handling of all edge cases

Respond ONLY with a JSON object in this EXACT format (no markdown, no extra text):
{
  "code": "full solution code here as a string with \\n for newlines",
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(1)",
  "approach": "2-3 sentence explanation of the algorithm used and why it is optimal",
  "keyInsight": "The single most important insight that makes this solution optimal"
}`;

    const response = await openai.chat.completions.create({
      model: 'Meta-Llama-3.3-70B-Instruct',
      messages: [
        { role: 'system', content: 'You are an expert algorithm designer. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1200,
      temperature: 0.15,
    });

    let raw = response.choices[0]?.message?.content?.trim() || '';
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    const result = JSON.parse(raw);
    return NextResponse.json({ success: true, ...result });

  } catch (err: any) {
    console.error('Optimal solution error:', err.message);
    return NextResponse.json({ success: false, error: 'Failed to generate optimal solution.' }, { status: 500 });
  }
}
