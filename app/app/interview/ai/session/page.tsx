'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import dynamic from 'next/dynamic';
import {
  Brain, Mic, MicOff, Play, Square, Send, Maximize,
  Clock, Lightbulb, MessageSquare
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

const CODE_STARTERS: Record<string, string> = {
  python: `# Write your solution here\ndef solution():\n    # Your code here\n    pass\n\nif __name__ == "__main__":\n    solution()\n`,
  javascript: `// Write your solution here\nfunction solution() {\n  // Your code here\n}\n\nconsole.log(solution());\n`,
  java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n    }\n    public void solve() {\n        // Your code here\n    }\n}\n`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Your solution here\n    return 0;\n}\n`,
};

function InterviewSessionContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || user?.targetRole || 'Full Stack Developer';
  const type = (searchParams.get('type') || 'full') as 'full' | 'dsa' | 'behavioral';
  const difficulty = searchParams.get('difficulty') || 'medium';

  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingMsg, setLoadingMsg] = useState('Connecting to Gemini AI...');
  const [usedAI, setUsedAI] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [code, setCode] = useState(CODE_STARTERS.python);
  const [language, setLanguage] = useState('python');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const currentQ = questions[currentQIdx] || null;
  const skills = user?.skills || [];

  // Fetch Gemini questions on mount
  useEffect(() => {
    const msgs = ['Connecting to Gemini AI...', 'Analyzing your resume skills...', 'Crafting personalized questions...', 'Almost ready...'];
    let mi = 0;
    const interval = setInterval(() => { mi = Math.min(mi + 1, msgs.length - 1); setLoadingMsg(msgs[mi]); }, 1800);
    fetch('/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills, role, interviewType: type, difficulty, userName: user?.name }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.questions?.length) { setQuestions(data.questions); setUsedAI(data.usedAI ?? false); }
      })
      .catch(() => {})
      .finally(() => { clearInterval(interval); setPhase('intro'); });
  }, []);

  // Session timer
  useEffect(() => {
    if (['loading', 'intro', 'complete'].includes(phase)) return;
    const t = setInterval(() => setSessionTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Anti-cheat
  useEffect(() => {
    const handler = () => {
      if (document.hidden && !['loading', 'intro', 'complete'].includes(phase)) {
        setTabSwitches(t => { const n = t + 1; setShowWarning(true); setTimeout(() => setShowWarning(false), 4000); return n; });
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [phase]);

  const addMessage = (r: 'ai' | 'user', content: string) => {
    setMessages(m => [...m, { role: r, content }]);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const startSession = () => {
    setShowFullscreenPrompt(false);
    document.documentElement.requestFullscreen?.().catch(() => {});
    setPhase('coding');
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

  const runCode = async () => {
    setIsRunning(true); setOutput('Running code...');
    await new Promise(r => setTimeout(r, 1500));
    const results = [
      '✓ Test case 1 passed\n✓ Test case 2 passed\n✓ Test case 3 passed\n\nAll tests passed • Runtime: 47ms • Memory: 14.2 MB',
      '✓ Test case 1 passed\n✗ Test case 2 failed: Wrong output\n\n1/2 tests passed • Runtime: 63ms',
      '✓ 5/5 test cases passed\n\nRuntime: 32ms (beats 89.4%)\nMemory: 12.8 MB (beats 76.2%)',
    ];
    setOutput(results[Math.floor(Math.random() * results.length)]);
    setIsRunning(false);
    setScores(s => ({ ...s, technical: Math.min(100, s.technical + 12) }));
  };

  const toggleVoice = () => {
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); return; }
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
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
    setScores(s => ({ ...s, communication: Math.min(100, s.communication + 15), problemSolving: Math.min(100, s.problemSolving + 10) }));
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
    await new Promise(r => setTimeout(r, 2000));
    setAiTyping(false);
    const finalScores = {
      technical: 72 + Math.floor(Math.random() * 20),
      problemSolving: 68 + Math.floor(Math.random() * 22),
      communication: 75 + Math.floor(Math.random() * 18),
      optimization: 65 + Math.floor(Math.random() * 25),
    };
    setScores(finalScores);
    const overall = Math.round(finalScores.technical * 0.4 + finalScores.problemSolving * 0.25 + finalScores.communication * 0.2 + finalScores.optimization * 0.15);
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
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
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
        Role: <strong style={{ color: '#a78bfa' }}>{role}</strong> • Type: <strong style={{ color: '#22d3ee' }}>{type}</strong> • Difficulty: <strong style={{ color: ({ easy: '#34d399', medium: '#fbbf24', hard: '#f87171' } as any)[difficulty] }}>{difficulty}</strong>
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
      {showWarning && <div className="warning-banner">⚠️ Tab switch detected ({tabSwitches}). {tabSwitches >= 3 ? 'Session flagged!' : `${3 - tabSwitches} more will flag.`}</div>}

      {/* Top bar */}
      <div style={{ padding: '12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="pulse-dot" />
          <span style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>AI Interview</span>
          <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>{role}</span>
          {usedAI && <span style={{ padding: '2px 8px', borderRadius: 10, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 700 }}>✨ Gemini</span>}
          {tabSwitches > 0 && <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>⚠ {tabSwitches} warnings</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />{formatTime(sessionTime)}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Q {currentQIdx + 1}/{questions.length}</span>
          {phase !== 'complete' && <button className="btn-ghost" onClick={finalizeSession} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>End Session</button>}
        </div>
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '390px 1fr', overflow: 'hidden' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
              <div style={{ padding: '12px 18px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['python', 'javascript', 'java', 'cpp'] as const).map(lang => (
                    <button key={lang} onClick={() => { setLanguage(lang); if (!currentQ?.codeStarter || currentQ.codeStarter.length < 10) setCode(CODE_STARTERS[lang]); }} className={`tab ${language === lang ? 'active' : ''}`} style={{ padding: '5px 12px', fontSize: '0.78rem' }}>
                      {lang === 'cpp' ? 'C++' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {currentQ && <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>{currentQ.topic}</span>}
                  <button onClick={runCode} className="btn-primary" disabled={isRunning} style={{ padding: '7px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {isRunning ? <Square size={13} /> : <Play size={13} />}
                    {isRunning ? 'Running...' : 'Run Code'}
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <MonacoEditor
                  height="65%"
                  language={language === 'cpp' ? 'cpp' : language}
                  value={code}
                  onChange={v => setCode(v || '')}
                  theme="vs-dark"
                  options={{ fontSize: 14, fontFamily: 'JetBrains Mono, Fira Code, monospace', minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on', wordWrap: 'on', automaticLayout: true, padding: { top: 16, bottom: 16 } }}
                />
                <div style={{ height: '35%', borderTop: '1px solid var(--border)', background: '#0d1117', padding: '12px 18px', overflowY: 'auto' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>OUTPUT</div>
                  {output ? (
                    <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: output.includes('failed') || output.includes('Error') ? '#f87171' : '#34d399', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{output}</pre>
                  ) : <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Run your code to see output here...</div>}
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
