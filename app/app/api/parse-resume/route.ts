import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import crypto from 'crypto';
import { saveResumeAnalysis, getCachedAnalysis } from '@/lib/database';

// ── Prompt ────────────────────────────────────────────────────────────────────
const PROMPT = `You are an expert ATS resume analyst. Analyze the provided resume and return ONLY a JSON object with this exact structure (no markdown, no extra text, no explanation):

{
  "ats": {
    "score": <integer 0-100: MUST equal the sum of all 5 breakdown values below>,
    "grade": <"A" if score>=80 | "B" if 65-79 | "C" if 50-64 | "D" if <50>,
    "label": <"Excellent" if A | "Good" if B | "Average" if C | "Needs Work" if D>,
    "breakdown": {
      "Skills & Keywords": <integer 0-30: score based on quantity and relevance of technical skills, tools, certifications, keywords recruiters search for>,
      "Sections Completeness": <integer 0-25: score for having all key sections: contact, education, experience/projects, skills, summary/objective>,
      "Action Verbs & Impact": <integer 0-15: score for strong action verbs like Built/Led/Designed/Optimized and quantified achievements with numbers>,
      "Contact Information": <integer 0-15: score for having name, email, phone, LinkedIn, GitHub, location>,
      "Content Density": <integer 0-15: score for appropriate detail level — not too sparse, not too verbose, good use of bullet points>
    },
    "suggestions": [
      { "type": "good", "message": "<what the resume does well — be specific>" },
      { "type": "good", "message": "<another strength>" },
      { "type": "warning", "message": "<something that could be improved — be specific and actionable>" },
      { "type": "warning", "message": "<another improvement area>" },
      { "type": "error", "message": "<a critical missing element or serious weakness — be specific>" }
    ]
  },
  "extracted": {
    "name": "<full name from resume>",
    "email": "<email address or empty string>",
    "phone": "<phone number or empty string>",
    "cgpa": "<GPA/CGPA value or empty string>",
    "skills": ["<10-15 specific technical skills, languages, frameworks, tools, platforms actually found in the resume>"],
    "yearsOfExperience": <integer: 0 for fresher/student, estimate from work history>,
    "technicalScore": <integer 0-100: depth and breadth of technical skills, projects, and technical achievements>,
    "communicationScore": <integer 0-100: writing quality, clarity, use of action verbs, quantified results, grammar>,
    "suggestedRoles": ["<Role Name (XX% match)", "<Role Name (XX% match)", "<Role Name (XX% match)"],
    "summary": "<2-3 sentence professional summary describing this candidate's profile, strengths, and suitability>"
  }
}

Critical rules:
- ats.score MUST equal exactly: Skills&Keywords + SectionsCompleteness + ActionVerbs + ContactInfo + ContentDensity
- Be realistic and strict: average student resume = 45-62, good experienced = 70-82, exceptional = 83+
- technicalScore and communicationScore are independent 0-100 scores, NOT capped by ATS score
- Give exactly 5 suggestions (2 good, 2 warning, 1 error minimum)
- ONLY return the JSON object, no other text`;

// ── PDF text extraction ───────────────────────────────────────────────────────
async function extractPDFText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    // pdf-parse exports a single async default function — NOT a class
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const result = await pdfParse(buffer);
    return {
      text: (result.text || '').trim(),
      pageCount: result.numpages || 1,
    };
  } catch (e) {
    console.error('PDF parse error:', e);
    // Raw fallback — scrape printable strings from PDF binary
    const raw = buffer.toString('latin1');
    const matches = raw.match(/\(([^)]{3,300})\)/g) || [];
    const text = matches
      .map(m => m.slice(1, -1).replace(/\\[nrt]/g, ' '))
      .filter(t => /[a-zA-Z]{3,}/.test(t))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { text, pageCount: 1 };
  }
}

// ── Main Route Handler ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('resume') as File | null;
    const userEmail = (formData.get('email') as string) || 'anonymous';

    if (!file) return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });

    const fileName = file.name.toLowerCase();
    const isPDF = fileName.endsWith('.pdf');
    const isImage = /\.(png|jpg|jpeg|webp)$/.test(fileName);

    if (!isPDF && !isImage) {
      return NextResponse.json({ error: 'Only PDF and image files (PNG, JPG, JPEG, WEBP) supported.' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 });
    }
    if (!process.env.SAMBANOVA_API_KEY) {
      return NextResponse.json({ error: 'SambaNova API key not configured.' }, { status: 500 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ── Check cache first (by file hash) ─────────────────────────────────
    const fileHash = crypto.createHash('md5').update(buffer).digest('hex');
    const cached = await getCachedAnalysis(fileHash);
    if (cached) {
      console.log('✅ Returning cached resume analysis for hash:', fileHash);
      return NextResponse.json({ success: true, usedAI: true, cached: true, ...cached });
    }

    const openai = new OpenAI({
      apiKey: process.env.SAMBANOVA_API_KEY,
      baseURL: 'https://api.sambanova.ai/v1',
    });
    
    let parsed: any;

    if (isImage) {
      // ── IMAGE → Llama 3.2 11B Vision Instruct ────────────────────────
      const base64 = buffer.toString('base64');
      const ext = fileName.split('.').pop() || 'jpg';
      const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }[ext] || 'image/jpeg';

      const res = await openai.chat.completions.create({
        model: 'Llama-3.2-11B-Vision-Instruct',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
            { type: 'text', text: `${PROMPT}\n\nThis is an image of a resume — extract all visible text and analyze it. Return ONLY the JSON object.` },
          ],
        }],
        max_tokens: 1500,
        temperature: 0.1,
      });
      let rawImg = res.choices[0]?.message?.content?.trim() || '{}';
      rawImg = rawImg.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      const jsonMatchImg = rawImg.match(/\{[\s\S]*\}/);
      if (jsonMatchImg) rawImg = jsonMatchImg[0];
      parsed = JSON.parse(rawImg);
      // Images are single-page; estimate word count from extracted skills/summary
      if (parsed.extracted) {
        parsed.extracted.pageCount = parsed.extracted.pageCount || 1;
        const textForWc = [parsed.extracted.summary || '', (parsed.extracted.skills || []).join(' ')].join(' ');
        parsed.extracted.wordCount = parsed.extracted.wordCount || Math.max(50, textForWc.split(/\s+/).filter(Boolean).length);
      }

    } else {
      // ── PDF → extract text → Meta-Llama-3.3-70B-Instruct ──────────────
      const { text, pageCount: pdfPageCount } = await extractPDFText(buffer);
      if (!text || text.length < 80) {
        return NextResponse.json({
          error: 'Could not extract text from this PDF. If it is scanned, upload it as a PNG/JPG image instead.',
        }, { status: 400 });
      }

      const wordCount = text.split(/\s+/).filter(Boolean).length;

      const res = await openai.chat.completions.create({
        model: 'Meta-Llama-3.3-70B-Instruct',
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: `Resume text:\n---\n${text.slice(0, 5000)}\n---\nReturn ONLY the JSON object.` },
        ],
        max_tokens: 1500,
        temperature: 0.1,
      });
      let raw = res.choices[0]?.message?.content?.trim() || '{}';
      // Strip any markdown code fences the model might add
      raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      // Extract JSON object if there's extra text around it
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) raw = jsonMatch[0];
      parsed = JSON.parse(raw);
      // Attach PDF-derived metadata so the UI can display it
      if (parsed.extracted) {
        parsed.extracted.wordCount = wordCount;
        parsed.extracted.pageCount = pdfPageCount;
      }
    }

    // ── Validate & fill defaults ──────────────────────────────────────────
    if (!parsed.ats || !parsed.extracted) throw new Error('Invalid response structure from SambaNova');

    parsed.extracted.skills = parsed.extracted.skills || [];
    parsed.extracted.suggestedRoles = parsed.extracted.suggestedRoles || [];
    parsed.ats.suggestions = parsed.ats.suggestions || [];
    parsed.extracted.technicalScore = parsed.extracted.technicalScore ?? 0;
    parsed.extracted.communicationScore = parsed.extracted.communicationScore ?? 0;

    // ── Enforce: ATS score = sum of breakdown values ──────────────────────
    const bd = parsed.ats.breakdown || {};
    const BREAKDOWN_MAX: Record<string, number> = {
      'Skills & Keywords': 30,
      'Sections Completeness': 25,
      'Action Verbs & Impact': 15,
      'Contact Information': 15,
      'Content Density': 15,
    };
    // Clamp each breakdown value to its max
    for (const [key, max] of Object.entries(BREAKDOWN_MAX)) {
      if (bd[key] === undefined || bd[key] === null) bd[key] = 0;
      bd[key] = Math.min(Math.max(0, Number(bd[key])), max);
    }
    parsed.ats.breakdown = bd;
    // Recalculate total from breakdown so score is always consistent
    const bdSum = Object.values(bd).reduce((a: number, v) => a + (Number(v) || 0), 0);
    parsed.ats.score = bdSum;
    // Re-derive grade and label from corrected score
    parsed.ats.grade  = bdSum >= 80 ? 'A' : bdSum >= 65 ? 'B' : bdSum >= 50 ? 'C' : 'D';
    parsed.ats.label  = bdSum >= 80 ? 'Excellent' : bdSum >= 65 ? 'Good' : bdSum >= 50 ? 'Average' : 'Needs Work';

    // ── Save to Supabase ──────────────────────────────────────────────────
    try {
      await saveResumeAnalysis(userEmail, fileName, fileHash, parsed);
      console.log('✅ Saved resume analysis to Supabase for:', userEmail);
    } catch (dbErr: any) {
      console.warn('DB save warning:', dbErr.message);
    }

    return NextResponse.json({ success: true, usedAI: true, cached: false, ...parsed });

  } catch (err: any) {
    console.error('Resume analysis error:', err.message);
    let msg = 'Failed to analyze resume.';
    if (err.status === 429 || err.message?.includes('429') || err.message?.includes('rate')) {
      msg = 'AI rate limit reached. Please wait a moment and try again.';
    } else if (err.status === 401 || err.message?.includes('401')) {
      msg = 'Invalid SambaNova API key. Please check your configuration.';
    } else if (err.message?.includes('JSON') || err.message?.includes('parse')) {
      msg = 'Could not parse resume content. Please try a different file.';
    } else if (err.message) {
      msg = err.message;
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
