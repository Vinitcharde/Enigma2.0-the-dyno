import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { section, count = 10 } = await req.json();

    if (!process.env.SAMBANOVA_API_KEY) {
      return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 });
    }

    const sectionPrompts: Record<string, string> = {
      quantitative: `Generate ${count} Quantitative Aptitude MCQ questions covering: Arithmetic, Algebra, Percentages, Number Systems, Time & Work, Profit & Loss, Compound Interest, Speed & Distance, Averages, LCM/HCF, Geometry, Probability. Questions should be placement-exam level (TCS, Infosys, Wipro style).`,
      logical: `Generate ${count} Logical Reasoning MCQ questions covering: Number Series, Letter Series, Coding-Decoding, Blood Relations, Direction Sense, Syllogisms, Puzzles, Odd One Out, Analogies, Seating Arrangement. Questions should be placement-exam level.`,
      verbal: `Generate ${count} Verbal Ability MCQ questions covering: Synonyms, Antonyms, Grammar Correction, Sentence Completion, Reading Comprehension, Idioms, One-Word Substitution, Para Jumbles, Analogies, Spelling. Questions should be placement-exam level.`,
    };

    const prompt = sectionPrompts[section];
    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Invalid section' }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: process.env.SAMBANOVA_API_KEY,
      baseURL: 'https://api.sambanova.ai/v1',
    });

    const response = await openai.chat.completions.create({
      model: 'Meta-Llama-3.3-70B-Instruct',
      messages: [
        {
          role: 'system',
          content: `You are an expert aptitude test question generator for placement exams. Generate questions as a JSON array ONLY — no markdown, no extra text, no code fences. Each question must have EXACTLY 4 options and the correct answer must be randomly distributed among options (not always the first option). Vary the difficulty across Easy, Medium, and Hard.`,
        },
        {
          role: 'user',
          content: `${prompt}

Return ONLY a JSON array in this EXACT format (no markdown, no code blocks):
[
  {
    "question": "Full question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 2,
    "explanation": "Step-by-step solution explaining why option at index 2 is correct"
  }
]

CRITICAL RULES:
- "answer" is the 0-based index of the correct option (0, 1, 2, or 3)
- Distribute correct answers randomly — do NOT always put the correct answer at index 0
- Each question must have exactly 4 distinct options
- Explanations must show the solving approach
- Questions should be unique and not repetitive
- Vary difficulty: ~30% Easy, ~50% Medium, ~20% Hard
- Return ONLY the JSON array, nothing else`,
        },
      ],
      max_tokens: 4000,
      temperature: 0.85,
    });

    let raw = response.choices[0]?.message?.content?.trim() || '';
    // Strip markdown code fences if present
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    const questions = JSON.parse(raw);
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid AI response format');
    }

    // Validate and sanitize each question
    const validated = questions
      .filter((q: any) =>
        q.question &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.answer === 'number' &&
        q.answer >= 0 &&
        q.answer <= 3 &&
        q.explanation
      )
      .slice(0, count);

    if (validated.length < Math.max(3, Math.ceil(count / 3))) {
      throw new Error('Too few valid questions generated');
    }

    return NextResponse.json({ success: true, questions: validated, generated: true });
  } catch (err: any) {
    console.error('Aptitude question generation error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
