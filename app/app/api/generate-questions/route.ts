import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Role → canonical languages and question domains
const ROLE_META: Record<string, { languages: string[]; focus: string[] }> = {
  'Full Stack Developer':       { languages: ['JavaScript', 'TypeScript', 'Python'],      focus: ['DSA', 'System Design', 'React internals', 'REST APIs'] },
  'Frontend Developer':         { languages: ['JavaScript', 'TypeScript', 'HTML/CSS'],    focus: ['DOM manipulation', 'React/Vue hooks', 'Performance optimisation', 'Accessibility'] },
  'Backend Engineer':           { languages: ['Python', 'Java', 'Go', 'Node.js'],         focus: ['DSA', 'Database design', 'REST/gRPC', 'Caching'] },
  'Mobile Developer':           { languages: ['Swift', 'Kotlin', 'Dart'],                 focus: ['Mobile DSA', 'Lifecycle management', 'State management', 'Platform APIs'] },
  'Data Scientist':             { languages: ['Python', 'R', 'SQL'],                      focus: ['ML algorithms', 'Statistics', 'Feature engineering', 'Model evaluation'] },
  'ML Engineer':                { languages: ['Python', 'CUDA', 'Bash'],                  focus: ['Neural networks', 'Model deployment', 'MLOps', 'Optimisation'] },
  'Data Engineer':              { languages: ['Python', 'SQL', 'Scala'],                  focus: ['Pipeline design', 'Big data', 'ETL', 'Data modelling'] },
  'AI / NLP Engineer':          { languages: ['Python', 'HuggingFace', 'CUDA'],           focus: ['Transformers', 'Tokenization', 'Fine-tuning LLMs', 'Embeddings'] },
  'DevOps Engineer':            { languages: ['Bash', 'Python', 'Go', 'YAML'],            focus: ['Container orchestration', 'CI/CD pipelines', 'IaC', 'Monitoring'] },
  'Cloud Architect':            { languages: ['Terraform', 'Python', 'Bash'],             focus: ['Cloud architecture', 'Security', 'Cost optimisation', 'Multi-region design'] },
  'Site Reliability Engineer':  { languages: ['Go', 'Python', 'Bash'],                    focus: ['SLO/SLA', 'Incident response', 'Observability', 'Automation'] },
  'Security Engineer':          { languages: ['Python', 'C', 'Bash'],                     focus: ['Vulnerability analysis', 'Cryptography', 'Auth flows', 'OWASP'] },
  'Penetration Tester':         { languages: ['Python', 'Bash', 'Ruby'],                  focus: ['Recon techniques', 'Exploitation', 'Report writing', 'OSINT'] },
  'Blockchain Developer':       { languages: ['Solidity', 'JavaScript', 'Rust'],          focus: ['Smart contracts', 'Consensus mechanisms', 'Token standards', 'Gas optimisation'] },
  'Game Developer':             { languages: ['C++', 'C#', 'Python'],                     focus: ['Game loop', 'Physics simulation', 'Performance', 'Design patterns'] },
  'Embedded Systems':           { languages: ['C', 'C++', 'Assembly'],                    focus: ['Memory management', 'Interrupts', 'RTOS', 'Low-level optimisation'] },
  'Product Manager':            { languages: ['No coding required'],                      focus: ['Prioritisation frameworks', 'User research', 'Metrics & KPIs', 'Roadmapping'] },
  'Business Analyst':           { languages: ['SQL', 'Excel', 'Python'],                  focus: ['Requirements analysis', 'Stakeholder management', 'Reporting', 'Process modelling'] },
};

function getRoleMeta(role: string) {
  return ROLE_META[role] || { languages: ['Python', 'JavaScript'], focus: ['DSA', 'System Design', 'Behavioral'] };
}

export async function POST(req: NextRequest) {
  try {
    const { skills, roles, role: legacyRole, interviewType, difficulty, userName } = await req.json();

    // Support both multi-role (new) and single-role (legacy)
    const selectedRoles: string[] = Array.isArray(roles) && roles.length > 0
      ? roles
      : [legacyRole || 'Full Stack Developer'];

    if (!process.env.SAMBANOVA_API_KEY) {
      return NextResponse.json({ error: 'SambaNova API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.SAMBANOVA_API_KEY,
      baseURL: 'https://api.sambanova.ai/v1',
    });

    const skillList = (skills || []).slice(0, 15).join(', ') || 'general programming';
    const questionCount = interviewType === 'full' ? 3 : 2;

    // Build per-role language and focus context
    const roleMetas = selectedRoles.map(r => {
      const meta = getRoleMeta(r);
      return `${r} (languages: ${meta.languages.slice(0, 3).join(', ')}; focus: ${meta.focus.slice(0, 3).join(', ')})`;
    });

    const difficultyDesc =
      difficulty === 'easy'   ? 'beginner-friendly (0–1 year experience) — basics, simple patterns, no edge cases required' :
      difficulty === 'hard'   ? 'senior-level (5+ years, FAANG standard) — optimal solutions, edge cases, follow-ups on trade-offs mandatory' :
      'mid-level (2–4 years experience) — expect clean code, O(n log n) preferred, basic trade-offs';

    const typeInstructions: Record<string, string> = {
      full:          'Mix: 1 DSA/coding problem, 1 system design question, 1 behavioral question (STAR format)',
      dsa:           'All DSA/algorithm/coding problems only — domain-specific algorithms preferred',
      behavioral:    'All behavioral/situational questions only — STAR method, leadership, conflict resolution',
      system_design: 'All system design questions only — scalability, databases, caching, load balancing, distributed systems',
    };

    const systemPrompt = `You are a senior technical interviewer at a top tech company (Google/Amazon/Microsoft). Generate personalized interview questions as a JSON array only — no markdown, no extra text.`;

    const userPrompt = `Generate ${questionCount} personalized interview questions for a candidate applying for: ${selectedRoles.join(' AND ')}

Role-specific languages & domains:
${roleMetas.map(r => `- ${r}`).join('\n')}

Candidate skills from resume: ${skillList}
Interview type: ${interviewType} — ${typeInstructions[interviewType] || typeInstructions.full}
Difficulty: ${difficultyDesc}
Candidate name: ${userName || 'the candidate'}

Return ONLY a JSON array in this exact format:
[
  {
    "id": 1,
    "question": "<full question, 2-4 sentences, specific to their roles and skills>",
    "type": "<dsa|system_design|behavioral>",
    "topic": "<specific topic e.g. Dynamic Programming, Microservices, Leadership>",
    "hint": "<helpful hint without giving away the answer>",
    "followUp": "<follow-up question to probe deeper>",
    "codeStarter": "<domain-appropriate starter code in the role's primary language if coding question, empty string otherwise>"
  }
]

Critical rules:
- Questions MUST be domain-specific to the selected roles and their languages
- DSA questions: use the role's primary language for starter code (e.g. Solidity for Blockchain, Swift for Mobile)
- System design questions: reference the role's specific tech stack
- Difficulty ${difficulty}: ${difficulty === 'easy' ? 'avoid complex optimizations' : difficulty === 'hard' ? 'require O(n log n) solutions and trade-off discussion' : 'expect working solution with brief complexity explanation'}
- Code starters must use the appropriate programming language for the role
- Follow-ups must dig deeper into the same topic
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
