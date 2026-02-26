import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import crypto from 'crypto';
import { saveResumeAnalysis, getCachedAnalysis } from '@/lib/database';

// ── Prompt ────────────────────────────────────────────────────────────────────
const PROMPT = `You are an expert ATS resume analyst and technical interviewer. Analyze the resume and return ONLY a JSON object with this exact structure (no markdown, no extra text):

{
  "ats": {
    "score": <integer 0-100: realistic ATS score>,
    "grade": <"A"|"B"|"C"|"D">,
    "label": <"Excellent"|"Good"|"Average"|"Needs Work">,
    "breakdown": {
      "Skills & Keywords": <integer 0-30>,
      "Sections Completeness": <integer 0-25>,
      "Action Verbs & Impact": <integer 0-15>,
      "Contact Information": <integer 0-15>,
      "Content Density": <integer 0-15>
    },
    "suggestions": [
      { "type": "good"|"warning"|"error", "message": "<actionable suggestion>" }
    ]
  },
  "extracted": {
    "name": "<full name>",
    "email": "<email or empty string>",
    "phone": "<phone or empty string>",
    "cgpa": "<cgpa/gpa or empty string>",
    "skills": ["<10-15 specific tech skills found: languages, frameworks, tools, platforms>"],
    "yearsOfExperience": <integer>,
    "technicalScore": <integer 0-100: depth of technical skills found>,
    "communicationScore": <integer 0-100: quality of writing, clarity, action verbs, impact statements>,
    "suggestedRoles": ["<Top 3 job roles with % match e.g. Full Stack Developer (88% match)>"],
    "summary": "<2-3 sentence professional summary of this candidate>"
  }
}

Scoring rules:
- ATS score: A=80-100, B=65-79, C=50-64, D=0-49. Average fresher = 45-65, be strict
- technicalScore: based on breadth/depth of tech skills, projects, certifications
- communicationScore: based on clarity, use of action verbs, quantified achievements, grammar
- Give 4-6 suggestions, mix of good/warning/error
- ONLY respond with the JSON object, nothing else.`;

// ── PDF text extraction ───────────────────────────────────────────────────────
async function extractPDFText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return (result.text || '').trim();
  } catch (e) {
    console.error('PDF parse error:', e);
    // Raw fallback — extract text objects from PDF binary
    const raw = buffer.toString('latin1');
    const matches = raw.match(/\(([^)]{3,300})\)/g) || [];
    const text = matches
      .map(m => m.slice(1, -1).replace(/\\[nrt]/g, ' '))
      .filter(t => /[a-zA-Z]{3,}/.test(t))
      .join(' ');
    return text.replace(/\s+/g, ' ').trim();
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
    const cached = getCachedAnalysis(fileHash);
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
      const raw = res.choices[0]?.message?.content?.trim() || '{}';
      parsed = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim());

    } else {
      // ── PDF → extract text → Meta-Llama-3.3-70B-Instruct ──────────────
      const text = await extractPDFText(buffer);
      if (!text || text.length < 80) {
        return NextResponse.json({
          error: 'Could not extract text from this PDF. If it is scanned, upload it as a PNG/JPG image instead.',
        }, { status: 400 });
      }

      const res = await openai.chat.completions.create({
        model: 'Meta-Llama-3.3-70B-Instruct',
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: `Resume text:\n---\n${text.slice(0, 5000)}\n---\nReturn ONLY the JSON object.` },
        ],
        max_tokens: 1500,
        temperature: 0.1,
      });
      const raw = res.choices[0]?.message?.content?.trim() || '{}';
      parsed = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim());
    }

    // ── Validate & fill defaults ──────────────────────────────────────────
    if (!parsed.ats || !parsed.extracted) throw new Error('Invalid response structure from SambaNova');

    parsed.extracted.skills = parsed.extracted.skills || [];
    parsed.extracted.suggestedRoles = parsed.extracted.suggestedRoles || [];
    parsed.ats.suggestions = parsed.ats.suggestions || [];
    parsed.extracted.technicalScore = parsed.extracted.technicalScore ?? 0;
    parsed.extracted.communicationScore = parsed.extracted.communicationScore ?? 0;

    // ── Save to SQLite ────────────────────────────────────────────────────
    try {
      saveResumeAnalysis(userEmail, fileName, fileHash, parsed);
      console.log('✅ Saved resume analysis to SQLite for:', userEmail);
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
