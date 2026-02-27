'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import dynamic from 'next/dynamic';
import {
  Brain, Mic, MicOff, Play, Square, Send, Maximize,
  Clock, Lightbulb, MessageSquare, Zap, ChevronDown
} from 'lucide-react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div style={{ height: 320, background: '#0d1117', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading editor...</div>,
});

type Phase = 'loading' | 'intro' | 'coding' | 'voice' | 'followup' | 'complete';
type Message = { role: 'ai' | 'user'; content: string };

interface Question {
  id: number;
  question: string;
  type: 'dsa' | 'system_design' | 'behavioral';
  topic: string;
  hint: string;
  followUp: string;
  codeStarter: string;
}

interface RunResult {
  isCorrect: boolean;
  passedCases: number;
  totalCases: number;
  testResults: { input: string; expected: string; actual: string; passed: boolean }[];
  errorMessage: string;
  runtime: string;
  memory: string;
  verdict: string;
  wrongReason: string;
}

interface AISolution {
  code: string;
  timeComplexity: string;
  spaceComplexity: string;
  approach: string;
  keyInsight: string;
}

interface ComplexityResult {
  timeComplexity: string;
  spaceComplexity: string;
  timeExplanation: string;
  spaceExplanation: string;
  codeQuality: number;
  correctness: number;
  optimizationScore: number;
  feedback: string;
  suggestion: string;
  isOptimal: boolean;
}

// ─── All supported languages with Monaco IDs and display names ───────────────
const LANG_META: Record<string, { monacoId: string; label: string; color: string }> = {
  python:     { monacoId: 'python',     label: 'Python',     color: '#3b82f6' },
  javascript: { monacoId: 'javascript', label: 'JavaScript', color: '#f59e0b' },
  typescript: { monacoId: 'typescript', label: 'TypeScript', color: '#3b82f6' },
  java:       { monacoId: 'java',       label: 'Java',       color: '#f87171' },
  cpp:        { monacoId: 'cpp',        label: 'C++',        color: '#a78bfa' },
  go:         { monacoId: 'go',         label: 'Go',         color: '#22d3ee' },
  rust:       { monacoId: 'rust',       label: 'Rust',       color: '#f97316' },
  swift:      { monacoId: 'swift',      label: 'Swift',      color: '#f87171' },
  kotlin:     { monacoId: 'kotlin',     label: 'Kotlin',     color: '#a78bfa' },
  dart:       { monacoId: 'dart',       label: 'Dart',       color: '#22d3ee' },
  csharp:     { monacoId: 'csharp',     label: 'C#',         color: '#34d399' },
  r:          { monacoId: 'r',          label: 'R',          color: '#60a5fa' },
  sql:        { monacoId: 'sql',        label: 'SQL',        color: '#fbbf24' },
  bash:       { monacoId: 'shell',      label: 'Bash',       color: '#34d399' },
  solidity:   { monacoId: 'sol',        label: 'Solidity',   color: '#a78bfa' },
  c:          { monacoId: 'c',          label: 'C',          color: '#94a3b8' },
  scala:      { monacoId: 'scala',      label: 'Scala',      color: '#f87171' },
};

// Per-role preferred languages (first = default)
const ROLE_LANGS: Record<string, string[]> = {
  'Full Stack Developer':       ['javascript', 'typescript', 'python', 'java', 'cpp'],
  'Frontend Developer':         ['javascript', 'typescript', 'cpp', 'python'],
  'Backend Engineer':           ['python', 'java', 'go', 'cpp', 'javascript'],
  'Mobile Developer':           ['swift', 'kotlin', 'dart', 'java'],
  'Data Scientist':             ['python', 'r', 'sql', 'cpp'],
  'ML Engineer':                ['python', 'cpp', 'bash', 'r'],
  'Data Engineer':              ['python', 'sql', 'scala', 'java'],
  'AI / NLP Engineer':          ['python', 'cpp', 'bash'],
  'DevOps Engineer':            ['bash', 'python', 'go'],
  'Cloud Architect':            ['bash', 'python', 'go'],
  'Site Reliability Engineer':  ['go', 'python', 'bash'],
  'Security Engineer':          ['python', 'c', 'bash'],
  'Penetration Tester':         ['python', 'bash'],
  'Blockchain Developer':       ['solidity', 'javascript', 'rust'],
  'Game Developer':             ['cpp', 'csharp', 'python'],
  'Embedded Systems':           ['c', 'cpp'],
  'Product Manager':            ['python', 'sql'],
  'Business Analyst':           ['sql', 'python'],
};

const DEFAULT_LANGS = ['python', 'javascript', 'java', 'cpp', 'go'];

// ─── Code starters per language ──────────────────────────────────────────────
const CODE_STARTERS: Record<string, string> = {
  python:     `# Write your solution here\ndef solution():\n    # Your code here\n    pass\n\nif __name__ == "__main__":\n    solution()\n`,
  javascript: `// Write your solution here\nfunction solution() {\n  // Your code here\n}\nconsole.log(solution());\n`,
  typescript: `// Write your solution here\nfunction solution(): void {\n  // Your code here\n}\nsolution();\n`,
  java:       `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n    }\n    public void solve() {\n        // Your code here\n    }\n}\n`,
  cpp:        `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Your solution here\n    return 0;\n}\n`,
  go:         `package main\nimport "fmt"\n\nfunc solution() {\n    // Your code here\n    fmt.Println("result")\n}\n\nfunc main() {\n    solution()\n}\n`,
  rust:       `fn solution() {\n    // Your code here\n}\n\nfn main() {\n    solution();\n}\n`,
  swift:      `import Foundation\n\nfunc solution() {\n    // Your code here\n}\n\nsolution()\n`,
  kotlin:     `fun solution() {\n    // Your code here\n}\n\nfun main() {\n    solution()\n}\n`,
  dart:       `void solution() {\n  // Your code here\n}\n\nvoid main() {\n  solution();\n}\n`,
  csharp:     `using System;\n\nclass Solution {\n    static void Main() {\n        // Your code here\n    }\n}\n`,
  r:          `# Write your solution here\nsolution <- function() {\n  # Your code here\n}\n\nsolution()\n`,
  sql:        `-- Write your SQL query here\nSELECT *\nFROM your_table\nWHERE condition;\n`,
  bash:       `#!/bin/bash\n# Write your solution here\n\nsolution() {\n    # Your code here\n    echo "result"\n}\n\nsolution\n`,
  solidity:   `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract Solution {\n    // Your contract here\n    function solve() public {\n        // Your code here\n    }\n}\n`,
  c:          `#include <stdio.h>\n\nvoid solution() {\n    // Your code here\n}\n\nint main() {\n    solution();\n    return 0;\n}\n`,
  scala:      `object Solution extends App {\n  def solution(): Unit = {\n    // Your code here\n  }\n\n  solution()\n}\n`,
};

function InterviewSessionContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Support both ?roles=A,B,C (new) and legacy ?role=A
  const rolesRaw = searchParams.get('roles') || searchParams.get('role') || user?.targetRole || 'Full Stack Developer';
  const roles = rolesRaw.split(',').map(r => decodeURIComponent(r.trim())).filter(Boolean);
  const role = roles[0]; // primary role for display / legacy compat
  const type = (searchParams.get('type') || 'full') as 'full' | 'dsa' | 'behavioral' | 'system_design';
  const difficulty = searchParams.get('difficulty') || 'medium';

  // Build available languages from all selected roles, deduplicated, primary role first
  const availableLangs = Array.from(new Set(
    roles.flatMap(r => ROLE_LANGS[r] || DEFAULT_LANGS)
  ));
  const defaultLang = availableLangs[0] || 'python';

  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingMsg, setLoadingMsg] = useState('Connecting to AI...');
  const [usedAI, setUsedAI] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [code, setCode] = useState(CODE_STARTERS[defaultLang] || CODE_STARTERS.python);
  const [language, setLanguage] = useState(defaultLang);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [complexityResult, setComplexityResult] = useState<ComplexityResult | null>(null);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [userInput, setUserInput] = useState('');
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
  const [sessionTime, setSessionTime] = useState(0);
  const [aiTyping, setAiTyping] = useState(false);
  const [scores, setScores] = useState({ technical: 0, problemSolving: 0, communication: 0, optimization: 0 });
  const [showHint, setShowHint] = useState(false);
  const [wrongRunCount, setWrongRunCount] = useState(0);
  const [aiSolution, setAiSolution] = useState<AISolution | null>(null);
  const [isFetchingSolution, setIsFetchingSolution] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const autoSubmittedRef = useRef(false);

  const currentQ = questions[currentQIdx] || null;
  const skills = user?.skills || [];

  // Reset wrong run counter and AI solution whenever the question changes
  useEffect(() => {
    setWrongRunCount(0);
    setAiSolution(null);
    setRunResult(null);
    setOutput('');
  }, [currentQIdx]);

  // Fetch Gemini questions on mount
  useEffect(() => {
    const msgs = ['Connecting to Gemini AI...', 'Analyzing your resume skills...', 'Crafting personalized questions...', 'Almost ready...'];
    let mi = 0;
    const interval = setInterval(() => { mi = Math.min(mi + 1, msgs.length - 1); setLoadingMsg(msgs[mi]); }, 1800);
    fetch('/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills, roles, role, interviewType: type, difficulty, userName: user?.name }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.questions?.length) { setQuestions(data.questions); setUsedAI(data.usedAI ?? false); }
      })
      .catch(() => { })
      .finally(() => { clearInterval(interval); setPhase('intro'); });
  }, []);

  // Session timer
  useEffect(() => {
    if (['loading', 'intro', 'complete'].includes(phase)) return;
    const t = setInterval(() => setSessionTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Anti-cheat: auto-submit on first tab/window switch
  useEffect(() => {
    const handler = () => {
      if (document.hidden && !['loading', 'intro', 'complete'].includes(phase)) {
        const newCount = tabSwitches + 1;
        setTabSwitches(newCount);
        setShowWarning(true);
        if (!autoSubmittedRef.current) {
          autoSubmittedRef.current = true;
          // Show banner briefly then auto-finalize
          setTimeout(() => {
            finalizeSession();
          }, 2000);
        }
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [phase, tabSwitches]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const addMessage = (r: 'ai' | 'user', content: string) => {
    setMessages(m => [...m, { role: r, content }]);

    if (r === 'ai' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Remove decorators to make speech sound better
      const cleanText = content.replace(/[*_#]/g, '').replace(/━━━━━━━━━━━━━━━━━━━━━━━/g, '').replace(/💡|🎯|✨|🎉|✅|✓|✗|📌/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha') || v.lang === 'en-US');
      if (preferred) utterance.voice = preferred;
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      window.speechSynthesis.speak(utterance);
    }

    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const startSession = () => {
    setShowFullscreenPrompt(false);
    document.documentElement.requestFullscreen?.().catch(() => { });
    setPhase(type === 'system_design' ? 'voice' : 'coding');
    setAiTyping(true);
    const q = questions[0];
    const skillMention = skills.length > 0 ? ` I can see from your resume that you have experience with ${skills.slice(0, 3).join(', ')} — I'll tailor my questions accordingly.` : '';
    setTimeout(() => {
      setAiTyping(false);
      addMessage('ai', [
        `Hello${user?.name ? ` ${user.name.split(' ')[0]}` : ''}! I'm your AI Interviewer powered by Gemini.${skillMention}`,
        ``,
        usedAI ? `✨ I've crafted personalized questions based on your resume skills.` : `Let's begin your interview!`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━━━━`,
        `**Question 1 of ${questions.length} | ${q?.topic || 'Technical'}**`,
        `━━━━━━━━━━━━━━━━━━━━━━━`,
        q?.question || 'Tell me about yourself and your technical background.',
        ``,
        `💡 Take your time to think before coding. Ask for clarification if needed.`,
      ].join('\n'));
      if (q?.codeStarter && q.codeStarter.length > 10) setCode(q.codeStarter);
    }, 1500);
  };

  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    setShowLangDropdown(false);
    setComplexityResult(null);
    setOutput('');
    // Always switch to the new language's template so Monaco and the code stay in sync
    setCode(CODE_STARTERS[lang] || CODE_STARTERS.python);
  };

  const getOptimalSolution = async () => {
    if (!currentQ) return;
    setIsFetchingSolution(true);
    setOutput('🤖 AI is generating the optimal solution…');
    try {
      const res = await fetch('/api/optimal-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQ.question, language, role }),
      });
      const data = await res.json();
      if (data.success && data.code) {
        const solutionCode = data.code.replace(/\\n/g, '\n');
        setAiSolution(data);
        setCode(solutionCode);
        setOutput('');
        setScores(s => ({ ...s, technical: Math.min(100, s.technical + 5), optimization: Math.min(100, s.optimization + 5) }));
      } else {
        setOutput('❌ Could not generate optimal solution. Check your API key.');
      }
    } catch {
      setOutput('❌ Network error while fetching optimal solution.');
    } finally {
      setIsFetchingSolution(false);
    }
  };

  const runCode = async () => {
    const isBlank =
      !code.trim() ||
      code.trim() === (CODE_STARTERS[language] || CODE_STARTERS.python).trim();

    if (isBlank) {
      setOutput('⚠️ Please write your solution before running.');
      return;
    }

    setIsRunning(true);
    setRunResult(null);
    setOutput('⏳ Running your code against test cases…');

    try {
      const res = await fetch('/api/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, question: currentQ?.question || '', role }),
      });
      const data: RunResult & { success: boolean; error?: string } = await res.json();

      if (!data.success) {
        setOutput(`❌ ${data.error || 'Evaluation failed. Check your API key.'}`);
        setIsRunning(false);
        return;
      }

      setRunResult(data);
      setOutput(''); // clear — the card below renders the details

      if (data.isCorrect) {
        // Correct — reward score, reset wrong counter
        setWrongRunCount(0);
        setAiSolution(null);
        setScores(s => ({
          ...s,
          technical: Math.min(100, s.technical + 18),
          problemSolving: Math.min(100, s.problemSolving + 10),
        }));
      } else {
        // Wrong — increment counter; after 2 failures provide optimal AI solution
        const newCount = wrongRunCount + 1;
        setWrongRunCount(newCount);
        setScores(s => ({ ...s, technical: Math.max(0, s.technical - 3) }));
        if (newCount >= 2 && !aiSolution) {
          await getOptimalSolution();
        }
      }
    } catch {
      setOutput('❌ Could not run code. Check your API key.');
    } finally {
      setIsRunning(false);
    }
  };

  const analyzeComplexity = async () => {
    if (!code.trim() || code === (CODE_STARTERS[language] || CODE_STARTERS.python)) {
      setOutput('⚠️ Please write some code before analyzing complexity.');
      return;
    }
    setIsAnalyzing(true);
    setComplexityResult(null);
    try {
      const res = await fetch('/api/evaluate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          question: currentQ?.question || '',
          role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComplexityResult(data);
        setScores(s => ({
          ...s,
          technical: Math.min(100, Math.round((s.technical + data.codeQuality) / 2)),
          optimization: Math.min(100, Math.round((s.optimization + data.optimizationScore) / 2)),
        }));
      }
    } catch {
      setOutput('❌ Could not analyze complexity. Check your API key.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleVoice = () => {
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); return; }
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
      rec.onresult = (e: any) => setTranscript(Array.from(e.results).map((r: any) => r[0].transcript).join(''));
      rec.start(); recognitionRef.current = rec; setIsRecording(true);
    }
  };

  const submitAnswer = async (text: string) => {
    if (!text.trim()) return;
    addMessage('user', text);
    setTranscript(''); setUserInput('');
    setAiTyping(true);
    setScores(s => ({
      ...s,
      communication: Math.min(100, s.communication + 15),
      problemSolving: Math.min(100, s.problemSolving + 10),
    }));
    await new Promise(r => setTimeout(r, 1800));
    setAiTyping(false);
    const q = questions[currentQIdx];

    if (phase === 'voice') {
      addMessage('ai', `Good answer! Here's a follow-up:\n\n**${q?.followUp || 'Can you go deeper into your approach?'}**`);
      setPhase('followup');
    } else if (phase === 'followup') {
      if (currentQIdx < questions.length - 1) {
        const next = questions[currentQIdx + 1];
        setCurrentQIdx(i => i + 1);
        setCode(next?.codeStarter && next.codeStarter.length > 10 ? next.codeStarter : CODE_STARTERS[language]);
        setOutput(''); setShowHint(false);
        addMessage('ai', [
          `Excellent! Moving to the next question.`,
          ``,
          `━━━━━━━━━━━━━━━━━━━━━━━`,
          `**Question ${currentQIdx + 2} of ${questions.length} | ${next?.topic || 'Technical'}**`,
          `━━━━━━━━━━━━━━━━━━━━━━━`,
          next?.question || 'Next question...',
        ].join('\n'));
        setPhase('coding');
      } else {
        finalizeSession();
      }
    }
  };

  const finalizeSession = async () => {
    setAiTyping(true);
    await new Promise(r => setTimeout(r, 800));

    // ── Real AI evaluation ─────────────────────────────────────────────────────
    const hasCode =
      code.trim().length > 20 &&
      code.trim() !== (CODE_STARTERS[language] || CODE_STARTERS.python).trim();

    let aiTechnical = scores.technical > 0 ? scores.technical : null;
    let aiOptimization = scores.optimization > 0 ? scores.optimization : null;
    let aiCorrectness: number | null = null;

    if (hasCode) {
      try {
        const res = await fetch('/api/evaluate-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            language,
            question: questions.map(q => q.question).join('\n\n'),
            role,
          }),
        });
        const data = await res.json();
        if (data.success) {
          aiTechnical   = data.codeQuality;
          aiOptimization = data.optimizationScore;
          aiCorrectness  = data.correctness;
          setComplexityResult(data);
        }
      } catch { /* fall through */ }
    }

    // ── Derive final scores from real data ────────────────────────────────────
    const answersGiven = messages.filter(m => m.role === 'user').length;
    const commScore    = scores.communication  > 0 ? scores.communication  : Math.min(85, 45 + answersGiven * 10);
    const psScore      = scores.problemSolving > 0 ? scores.problemSolving  : Math.min(80, 40 + answersGiven * 8);
    const techScore    = aiTechnical   ?? (hasCode ? 55 : 30);
    const optScore     = aiOptimization ?? (hasCode ? 50 : 28);

    const finalScores = {
      technical:      techScore,
      problemSolving: psScore + (aiCorrectness != null ? Math.round(aiCorrectness * 0.1) : 0),
      communication:  commScore,
      optimization:   optScore,
    };

    setScores(finalScores);
    setAiTyping(false);
    const overall = Math.round(finalScores.technical * 0.4 + finalScores.problemSolving * 0.25 + finalScores.communication * 0.2 + finalScores.optimization * 0.15);

    // Save session to DB
    if (user) {
      fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveAISession',
          session: {
            userEmail: user.email,
            userName: user.name,
            jobRoles: roles,
            jobRole: roles.join(', '),
            interviewType: type,
            difficulty,
            questions: questions.map(q => q.question),
            answers: messages.filter(m => m.role === 'user').map(m => m.content),
            codeSnapshots: [code],
            scores: finalScores,
            overallScore: overall,
            tabSwitches,
            durationSec: sessionTime,
            completed: true,
          },
        }),
      }).catch(() => { });
    }

    addMessage('ai', [
      `🎉 **Interview Complete!**`,
      ``,
      `**Overall Score: ${overall}/100**`,
      `• Technical (40%): ${finalScores.technical}%`,
      `• Problem Solving (25%): ${finalScores.problemSolving}%`,
      `• Communication (20%): ${finalScores.communication}%`,
      `• Optimization (15%): ${finalScores.optimization}%`,
      ``,
      `📌 **Key Observations:**`,
      `• ${skills.length > 0 ? `Good coverage of ${skills.slice(0, 2).join(' and ')} concepts` : 'Solid foundational knowledge'}`,
      `• Communication was ${finalScores.communication >= 80 ? 'strong and clear' : 'decent, aim for more structured STAR answers'}`,
      `• ${finalScores.technical >= 80 ? 'Excellent technical implementation' : 'Focus on edge cases and time complexity'}`,
      ``,
      `Check your detailed results on the right →`,
    ].join('\n'));
    setPhase('complete');
    if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const overall = Math.round(scores.technical * 0.4 + scores.problemSolving * 0.25 + scores.communication * 0.2 + scores.optimization * 0.15);

  if (!user) return null;

  // Loading screen
  if (phase === 'loading') return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-purple)' }}>
        <Brain size={36} color="white" />
      </div>
      <div className="loading-spinner" style={{ width: 48, height: 48 }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, color: 'white', fontSize: '1.1rem', marginBottom: 8 }}>{loadingMsg}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          {skills.length > 0 ? `Personalizing for: ${skills.slice(0, 4).join(', ')}${skills.length > 4 ? '...' : ''}` : 'Preparing interview questions...'}
        </div>
      </div>
    </div>
  );

  // Fullscreen prompt
  if (showFullscreenPrompt) return (
    <div className="fullscreen-prompt">
      <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
        <Brain size={32} color="white" />
      </div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: 12 }}>AI Interview Session</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 520, lineHeight: 1.7, marginBottom: 8 }}>
        Roles: <strong style={{ color: '#a78bfa' }}>{roles.join(', ')}</strong> • Type: <strong style={{ color: '#22d3ee' }}>{type}</strong> • Difficulty: <strong style={{ color: ({ easy: '#34d399', medium: '#fbbf24', hard: '#f87171' } as any)[difficulty] }}>{difficulty}</strong>
      </p>
      {usedAI && skills.length > 0 && (
        <div style={{ padding: '8px 18px', borderRadius: 20, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.35)', color: '#a78bfa', fontSize: '0.82rem', fontWeight: 600, marginBottom: 16 }}>
          ✨ Gemini personalized {questions.length} questions for your skills: {skills.slice(0, 3).join(', ')}{skills.length > 3 ? '...' : ''}
        </div>
      )}
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: 500, lineHeight: 1.7, marginBottom: 32 }}>
        This session will run in fullscreen for anti-cheat monitoring. Tab switching will be logged.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn-primary" onClick={startSession} style={{ padding: '16px 40px', fontSize: '1rem' }}>
          <Maximize size={18} style={{ display: 'inline', marginRight: 8 }} /> Enter Fullscreen & Begin
        </button>
        <button className="btn-ghost" onClick={() => router.push('/interview/ai')} style={{ padding: '16px 24px' }}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {showWarning && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: 'rgba(239,68,68,0.95)', color: 'white', padding: '14px 24px', fontWeight: 700, textAlign: 'center', fontSize: '0.95rem' }}>
          🚨 Tab switch detected! Your session is being AUTO-SUBMITTED due to anti-cheat policy.
        </div>
      )}

      {/* Top bar */}
      <div style={{ padding: '10px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 12 }}>
        {/* Left: branding + roles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
          <div className="pulse-dot" />
          <span style={{ fontWeight: 700, color: 'white', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>AI Interview</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {roles.map((r, i) => <span key={i} className="badge badge-purple" style={{ fontSize: '0.68rem' }}>{r}</span>)}
          </div>
          {usedAI && <span style={{ padding: '2px 8px', borderRadius: 10, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)', color: '#a78bfa', fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>✨ AI</span>}
        </div>

        {/* Centre: Language selector (only shown for coding phases) */}
        {(phase === 'coding' || phase === 'followup' || phase === 'voice') && type !== 'system_design' && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowLangDropdown(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 8,
                background: `${LANG_META[language]?.color || '#a78bfa'}18`,
                border: `1px solid ${LANG_META[language]?.color || '#a78bfa'}50`,
                color: LANG_META[language]?.color || '#a78bfa',
                cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap',
              }}
            >
              💻 {LANG_META[language]?.label || language}
              <ChevronDown size={13} />
            </button>
            {showLangDropdown && (
              <div style={{
                position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)',
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
                padding: 8, zIndex: 1000, minWidth: 200,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
              }}>
                {availableLangs.map(lang => {
                  const m = LANG_META[lang];
                  if (!m) return null;
                  return (
                    <button
                      key={lang}
                      onClick={() => changeLanguage(lang)}
                      style={{
                        padding: '8px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600,
                        background: language === lang ? `${m.color}20` : 'transparent',
                        border: `1px solid ${language === lang ? m.color : 'transparent'}`,
                        color: language === lang ? m.color : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Right: timer + controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />{formatTime(sessionTime)}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Q {currentQIdx + 1}/{questions.length}</span>
          {tabSwitches > 0 && <span className="badge badge-red" style={{ fontSize: '0.68rem' }}>⚠ {tabSwitches}</span>}
          {phase !== 'complete' && <button className="btn-ghost" onClick={finalizeSession} style={{ padding: '5px 12px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>End Session</button>}
        </div>
      </div>

      {/* Main layout */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: type === 'system_design' && phase !== 'complete' ? '1fr' : '390px 1fr', overflow: 'hidden' }}>
        {/* Left: AI Chat */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={18} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'white', fontSize: '0.85rem' }}>Gemini AI Interviewer</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <div className="pulse-dot" style={{ width: 5, height: 5 }} /> Live
              </div>
            </div>
            {currentQ?.hint && phase !== 'complete' && (
              <button onClick={() => setShowHint(h => !h)} style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${showHint ? 'rgba(245,158,11,0.5)' : 'var(--border)'}`, background: showHint ? 'rgba(245,158,11,0.1)' : 'transparent', color: showHint ? '#fbbf24' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600 }}>
                <Lightbulb size={13} /> Hint
              </button>
            )}
          </div>

          {showHint && currentQ?.hint && (
            <div style={{ padding: '10px 16px', background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.2)', fontSize: '0.8rem', color: '#fbbf24', lineHeight: 1.5 }}>
              💡 <strong>Hint:</strong> {currentQ.hint}
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, fontSize: '0.83rem' }}>
                <MessageSquare size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                Interview starting...
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'} style={{ fontSize: '0.83rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {msg.role === 'ai' && <span style={{ color: '#a78bfa', fontWeight: 700, display: 'block', marginBottom: 4, fontSize: '0.7rem' }}>AI INTERVIEWER</span>}
                {msg.content}
              </div>
            ))}
            {aiTyping && (
              <div className="chat-bubble-ai" style={{ width: 70 }}>
                <span className="typing-dot" style={{ marginRight: 4 }} />
                <span className="typing-dot" style={{ marginRight: 4 }} />
                <span className="typing-dot" />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {phase !== 'complete' && phase !== 'intro' && (
            <div style={{ padding: '14px', borderTop: '1px solid var(--border)' }}>
              {(phase === 'voice' || phase === 'followup') ? (
                <div>
                  {transcript && (
                    <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 10, padding: '10px 12px', marginBottom: 8, fontSize: '0.8rem', color: 'var(--text-secondary)', maxHeight: 70, overflowY: 'auto' }}>
                      {transcript}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={toggleVoice} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, background: isRecording ? 'rgba(239,68,68,0.2)' : 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isRecording ? <MicOff size={16} color="#f87171" /> : <Mic size={16} color="#a78bfa" />}
                    </button>
                    <textarea value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="Type or speak your answer..." style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'white', fontSize: '0.82rem', resize: 'none', fontFamily: 'Inter, sans-serif', outline: 'none', height: 40, lineHeight: '20px' }} />
                    <button onClick={() => submitAnswer(userInput || transcript)} className="btn-primary" style={{ width: 40, height: 40, padding: 0, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              ) : phase === 'coding' && (
                <button onClick={() => {
                  addMessage('user', `[Code submitted in ${language}]`);
                  setPhase('voice'); setAiTyping(true);
                  setTimeout(() => {
                    setAiTyping(false);
                    addMessage('ai', `Good work on the code! Now let's evaluate your verbal communication.\n\nPlease explain your solution — walk me through your approach, why you chose this algorithm, and the time/space complexity.`);
                  }, 1500);
                }} className="btn-primary" style={{ width: '100%', padding: '10px', fontSize: '0.83rem' }}>
                  Submit Code & Continue to Voice →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Code editor / Results */}
          <div style={{ display: type === 'system_design' && phase !== 'complete' ? 'none' : 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {phase === 'complete' ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: '36px' }}>
              <div style={{ maxWidth: 680, margin: '0 auto' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', marginBottom: 6, textAlign: 'center' }}>🎉 Interview Complete</h2>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 32 }}>Your detailed performance breakdown</p>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-purple)' }}>
                    <div>
                      <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{overall}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>/ 100</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, fontWeight: 700, fontSize: '1.1rem', color: overall >= 80 ? '#34d399' : overall >= 65 ? '#fbbf24' : '#f87171' }}>
                    {overall >= 80 ? '🚀 Excellent!' : overall >= 65 ? '👍 Good Performance' : '📚 Keep Practicing'}
                  </div>
                </div>
                <div className="card-no-hover" style={{ padding: 24, marginBottom: 20 }}>
                  <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 18, fontSize: '0.95rem' }}>Score Breakdown</h3>
                  {[
                    { label: 'Technical', score: scores.technical, weight: '40%', color: '#a78bfa' },
                    { label: 'Problem Solving', score: scores.problemSolving, weight: '25%', color: '#22d3ee' },
                    { label: 'Communication', score: scores.communication, weight: '20%', color: '#34d399' },
                    { label: 'Optimization', score: scores.optimization, weight: '15%', color: '#f59e0b' },
                  ].map(({ label, score, weight, color }) => (
                    <div key={label} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                        <span style={{ color: 'white', fontWeight: 600 }}>{label} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({weight})</span></span>
                        <span style={{ fontWeight: 800, color }}>{score}%</span>
                      </div>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: `${score}%`, background: color }} /></div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-primary" onClick={() => router.push('/interview/ai')} style={{ flex: 1, padding: '14px' }}>New Interview</button>
                  <button className="btn-secondary" onClick={() => router.push('/dashboard')} style={{ flex: 1, padding: '14px' }}>Dashboard</button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Editor header: language tabs + action buttons */}
              <div style={{ padding: '8px 14px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0 }}>
                {/* Language tabs — dynamic, from selected roles */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                  {availableLangs.map(lang => {
                    const m = LANG_META[lang];
                    if (!m) return null;
                    const active = language === lang;
                    return (
                      <button
                        key={lang}
                        onClick={() => changeLanguage(lang)}
                        className={`tab ${active ? 'active' : ''}`}
                        style={{
                          padding: '5px 11px', fontSize: '0.76rem', fontWeight: active ? 700 : 500,
                          borderBottom: active ? `2px solid ${m.color}` : '2px solid transparent',
                          color: active ? m.color : 'var(--text-secondary)',
                          background: active ? `${m.color}12` : 'transparent',
                          borderRadius: 6, transition: 'all 0.15s',
                        }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                {/* Right controls */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  {currentQ && <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>{currentQ.topic}</span>}
                  <button
                    onClick={analyzeComplexity}
                    disabled={isAnalyzing}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '6px 13px',
                      borderRadius: 7, border: '1px solid rgba(251,191,36,0.4)',
                      background: 'rgba(251,191,36,0.08)', color: '#fbbf24',
                      fontSize: '0.78rem', fontWeight: 600, cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                      opacity: isAnalyzing ? 0.6 : 1, transition: 'all 0.15s',
                    }}
                  >
                    <Zap size={12} />
                    {isAnalyzing ? 'Analyzing…' : 'Analyze'}
                  </button>
                  <button onClick={runCode} className="btn-primary" disabled={isRunning} style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {isRunning ? <Square size={12} /> : <Play size={12} />}
                    {isRunning ? 'Running…' : 'Run Code'}
                  </button>
                </div>
              </div>

              {/* Monaco editor + output panel */}
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <MonacoEditor
                  height="60%"
                  language={LANG_META[language]?.monacoId || language}
                  value={code}
                  onChange={v => setCode(v || '')}
                  theme="vs-dark"
                  options={{ fontSize: 14, fontFamily: 'JetBrains Mono, Fira Code, monospace', minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on', wordWrap: 'on', automaticLayout: true, padding: { top: 16, bottom: 16 } }}
                />
                <div style={{ flex: 1, borderTop: '1px solid var(--border)', background: '#0d1117', padding: '10px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Text output */}
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 5, fontWeight: 700, letterSpacing: '0.06em' }}>OUTPUT</div>
                    {output ? (
                      <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.79rem', color: output.includes('failed') || output.includes('Error') || output.includes('❌') || output.includes('⚠️') ? '#f87171' : '#34d399', whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0 }}>{output}</pre>
                    ) : <div style={{ color: 'var(--text-muted)', fontSize: '0.79rem' }}>Run your code to see output…</div>}
                  </div>

                  {/* Complexity result card */}
                  {complexityResult && (
                    <div style={{ borderRadius: 10, border: '1px solid rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.05)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Zap size={13} style={{ color: '#fbbf24', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24' }}>Complexity Analysis</span>
                        {complexityResult.isOptimal && (
                          <span style={{ padding: '1px 8px', borderRadius: 20, background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.4)', color: '#34d399', fontSize: '0.68rem', fontWeight: 700 }}>✓ Optimal</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', fontSize: '0.75rem', fontWeight: 700 }}>Time: {complexityResult.timeComplexity}</span>
                        <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)', color: '#22d3ee', fontSize: '0.75rem', fontWeight: 700 }}>Space: {complexityResult.spaceComplexity}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {[
                          { label: 'Quality', val: complexityResult.codeQuality, color: '#a78bfa' },
                          { label: 'Correctness', val: complexityResult.correctness, color: '#34d399' },
                          { label: 'Optimization', val: complexityResult.optimizationScore, color: '#fbbf24' },
                        ].map(({ label, val, color }) => (
                          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color }}>{val}<span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>%</span></span>
                          </div>
                        ))}
                      </div>
                      {complexityResult.timeExplanation && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          <span style={{ color: '#a78bfa', fontWeight: 600 }}>Time: </span>{complexityResult.timeExplanation}
                        </div>
                      )}
                      {complexityResult.feedback && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          <span style={{ color: '#34d399', fontWeight: 600 }}>Feedback: </span>{complexityResult.feedback}
                        </div>
                      )}
                      {complexityResult.suggestion && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5, padding: '6px 10px', borderRadius: 6, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
                          <span style={{ color: '#fbbf24', fontWeight: 600 }}>💡 </span>{complexityResult.suggestion}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ padding: '8px 18px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', display: 'flex', gap: 24, alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>LIVE SCORES:</span>
                {[
                  { label: 'Technical', val: scores.technical, color: '#a78bfa' },
                  { label: 'Comm.', val: scores.communication, color: '#34d399' },
                  { label: 'Problem Solving', val: scores.problemSolving, color: '#22d3ee' },
                  { label: 'Optimization', val: scores.optimization, color: '#f59e0b' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
                    <span style={{ fontWeight: 800, color }}>{val || '--'}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InterviewSessionPage() {
  return (
    <Suspense fallback={<div style={{ height: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading session...</div>}>
      <InterviewSessionContent />
    </Suspense>
  );
}
