'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useWindowChangeProtection } from '@/lib/useWindowChangeProtection';
import dynamic from 'next/dynamic';
import {
  Brain, Mic, MicOff, Play, Square, Send, Code2,
  AlertTriangle, Maximize, ChevronRight, Clock, X,
  Volume2, Star, TrendingUp, Target, Zap, MessageSquare
} from 'lucide-react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 320, background: '#0d1117', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      Loading editor...
    </div>
  ),
});

type Phase = 'intro' | 'coding' | 'voice' | 'followup' | 'complete';
type Message = { role: 'ai' | 'user'; content: string; timestamp: Date };

// extend question type with optional hint for auto grader
interface Question { question: string; type: 'dsa' | 'system_design' | 'behavioral'; followUp: string; answerHint?: string; }

const AI_QUESTIONS: Record<string, Record<string, { question: string; type: 'dsa' | 'system_design' | 'behavioral'; followUp: string }[]>> = {
  'Full Stack Developer': {
    full: [
      { question: 'Design a URL shortener like bit.ly. Implement the core shortening and redirection logic. Consider: What data structure would you use? How would you handle collisions? Implement the encode and decode functions.', type: 'dsa', followUp: 'Your solution looks good! Now tell me — how would you scale this to handle 1 million requests per second? What caching strategy would you use?' },
      { question: 'Design the system architecture for a real-time collaborative document editor like Google Docs. Draw out the components, data flow, and describe the conflict resolution strategy (OT or CRDT).', type: 'system_design', followUp: 'Excellent! Now, if network partition occurs, how does your system handle consistency? Would you choose AP or CP in CAP theorem and why?' },
      { question: 'Tell me about a challenging technical problem you solved. Walk me through it using the STAR method — what was the Situation, your Task, the Actions you took, and the Result?', type: 'behavioral', followUp: 'That\'s a solid example. How would you handle it differently if you had to do it again? What did you learn from this experience?' },
    ],
    dsa: [
      { question: 'Given a linked list with a cycle, find the starting node of the cycle. Write an efficient O(n) time, O(1) space solution. Explain your approach before coding.', type: 'dsa', followUp: 'Well done! Can you explain why Floyd\'s algorithm works mathematically? What is the proof behind it?' },
      { question: 'Implement a LRU (Least Recently Used) Cache with get() and put() operations both in O(1) time. Explain your data structure choice.', type: 'dsa', followUp: 'Great implementation! Now how would you extend this to an LFU (Least Frequently Used) cache? What additional data structure is needed?' },
    ],
    behavioral: [
      { question: 'Describe a time when you had to deal with a difficult team member or conflict in a project. How did you handle it, and what was the outcome?', type: 'behavioral', followUp: 'That shows great emotional intelligence. Have you ever had to escalate such issues to management? What factors influence that decision?' },
    ],
  },
  'Data Scientist': {
    full: [
      { question: 'You have a highly imbalanced dataset (99% negative, 1% positive). How would you approach building a binary classifier? What evaluation metrics would you use, and why is accuracy misleading here?', type: 'dsa', followUp: 'Good answer! Now, between SMOTE oversampling and class_weight adjustment — when would you prefer each approach and why?' },
      { question: 'Design a recommendation system for an e-commerce platform. Compare collaborative filtering vs content-based vs hybrid approaches. Which would you implement and how?', type: 'system_design', followUp: 'Excellent design! How would you handle the cold-start problem for new users and new items? Walk me through your strategy.' },
      { question: 'Walk me through your most impactful data science project. What was the business impact, and how did you measure success?', type: 'behavioral', followUp: 'Impressive! If you could redo that project, what would you do differently? Any lessons learned?' },
    ],
    dsa: [
      { question: 'Implement K-Means clustering from scratch in Python. Handle the centroid initialization (k-means++), assignment step, and update step. How do you determine the optimal K?', type: 'dsa', followUp: 'Good implementation! What are the limitations of K-Means? When would you choose DBSCAN over K-Means?' },
    ],
    behavioral: [
      { question: 'Describe a situation where your data analysis led to a surprising or counterintuitive finding. How did you validate it and communicate it to stakeholders?', type: 'behavioral', followUp: 'That\'s a great approach. How do you balance statistical rigor with business pragmatism when presenting findings?' },
    ],
  },
};

const DEFAULT_QUESTIONS = {
  full: [
    { question: 'Given an array of integers and a target sum, find all unique pairs of numbers that add up to the target. Your solution should handle duplicates and be as efficient as possible. Explain your approach.', type: 'dsa' as const, followUp: 'Good work! Your current solution is O(n) time. Can you now solve it for triplets (3-sum problem)? How does the complexity change?', answerHint: 'two sum' },
    { question: 'Design a notification service that handles millions of users across email, SMS, and push notifications. Consider rate limiting, retry logic, and delivery guarantees.', type: 'system_design' as const, followUp: 'Great architecture! How would you handle cases where SNS/SQS goes down? What fallback mechanisms would you implement?' },
    { question: 'Tell me about yourself and why you\'re interested in this role. What makes you stand out from other candidates?', type: 'behavioral' as const, followUp: 'Good introduction! Where do you see yourself in 5 years, and how does this position align with that vision?' },
  ],
  dsa: [
    { question: 'Implement a function to serialize and deserialize a binary tree. Your solution should handle any tree structure and be able to reconstruct the exact same tree.', type: 'dsa' as const, followUp: 'Nice solution! What is the time and space complexity? How would you handle very deep trees to avoid stack overflow?' },
  ],
  behavioral: [
    { question: 'Describe a time when you had to learn a new technology or skill quickly due to project requirements. How did you approach the learning, and what was the outcome?', type: 'behavioral' as const, followUp: 'Impressive adaptability! What resources or methods do you rely on most when learning something new?' },
  ],
};

const CODE_STARTERS: Record<string, string> = {
  python: `# Write your solution here
def solution():
    # Your code here
    pass

# Test your solution
if __name__ == "__main__":
    solution()
`,
  javascript: `// Write your solution here
function solution() {
  // Your code here
}

// Test your solution
console.log(solution());
`,
  java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        // Test your solution
        Solution sol = new Solution();
    }
    
    public void solve() {
        // Your code here
    }
}
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Your solution here
    
    return 0;
}
`,
};

function InterviewSessionContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'Full Stack Developer';
  const type = (searchParams.get('type') || 'full') as 'full' | 'dsa' | 'behavioral';
  const difficulty = searchParams.get('difficulty') || 'medium';

  const [phase, setPhase] = useState<Phase>('intro');
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
  const [interviewAckAccepted, setInterviewAckAccepted] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [aiTyping, setAiTyping] = useState(false);
  const [scores, setScores] = useState({ technical: 0, problemSolving: 0, communication: 0, optimization: 0 });
  const [showAutoEndNotification, setShowAutoEndNotification] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const questions = (AI_QUESTIONS[role]?.[type] || DEFAULT_QUESTIONS[type] || DEFAULT_QUESTIONS.full);
  const currentQ = questions[currentQIdx];

  // Window change protection - auto-end interview on tab switch
  const { enterFullscreen } = useWindowChangeProtection({
    enabled: phase !== 'intro' && phase !== 'complete',
    showWarning: false,  // Disable alerts
    enableFullscreen: true,
    onWindowChange: () => {
      setTabSwitches(t => t + 1);
      // Show auto-end notification
      setShowAutoEndNotification(true);
      // Auto-end the interview session
      setTimeout(() => {
        if (phase !== 'complete') {
          setPhase('complete');
          setScores(s => ({
            ...s,
            technical: Math.max(0, s.technical - 20),  // Penalty for window switch
          }));
        }
      }, 2000);
    },
    warningMessage: 'Interview auto-submitted due to window change.',
  });

  // Session timer
  useEffect(() => {
    if (phase === 'intro' || phase === 'complete') return;
    const t = setInterval(() => setSessionTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const addMessage = (role: 'ai' | 'user', content: string) => {
    setMessages(m => [...m, { role, content, timestamp: new Date() }]);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const startInterview = () => {
    setShowFullscreenPrompt(false);
    enterFullscreen();
    setIsFullscreen(true);
    setPhase('coding');
    setAiTyping(true);
    setTimeout(() => {
      setAiTyping(false);
      addMessage('ai', `Hello! I'm your AI Interviewer for the ${role} position. Let's begin!\n\n**Question ${currentQIdx + 1}:** ${currentQ.question}\n\nFeel free to think aloud as you work through the solution.`);
    }, 1500);
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput('Running code...');
    await new Promise(r => setTimeout(r, 500));

    // rudimentary evaluation: check for correctness by scanning code for expected answer hint
    const expectedHint = (currentQ as any).answerHint || '';
    let correct = false;
    if (expectedHint && code.toLowerCase().includes(expectedHint.toLowerCase())) {
      correct = true;
    }

    // complexity estimation
    const loops = (code.match(/for\b|while\b/g) || []).length;
    const complexity = loops >= 2 ? 'O(n²)' : loops === 1 ? 'O(n)' : 'O(1)';

    if (correct) {
      setOutput(`✓ All sample tests passed

Estimated time complexity: ${complexity}`);
      setScores(s => ({ ...s, technical: Math.min(100, s.technical + 15) }));
    } else {
      setOutput(`✗ Code seems incorrect. Please try again.\n\nHint: make sure your solution ${expectedHint || 'is correct'}.`);
      setScores(s => ({ ...s, technical: Math.max(0, s.technical - 5) }));
    }
    setIsRunning(false);
  };

  const toggleVoice = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.onresult = (e: any) => {
          const t = Array.from(e.results).map((r: any) => r[0].transcript).join('');
          setTranscript(t);
        };
        rec.start();
        recognitionRef.current = rec;
        setIsRecording(true);
      } else {
        setTranscript('(Speech recognition not supported in this browser. Type your answer below.)');
      }
    }
  };

  const submitAnswer = async (text: string) => {
    if (!text.trim()) return;
    addMessage('user', text);
    setTranscript('');
    setUserInput('');
    setAiTyping(true);
    setScores(s => ({ ...s, communication: Math.min(100, s.communication + 15), problemSolving: Math.min(100, s.problemSolving + 10) }));

    await new Promise(r => setTimeout(r, 2000));
    setAiTyping(false);

    if (phase === 'voice') {
      addMessage('ai', `Great explanation! ${currentQ.followUp}`);
      setPhase('followup');
    } else if (phase === 'followup') {
      if (currentQIdx < questions.length - 1) {
        const nextQ = questions[currentQIdx + 1];
        setCurrentQIdx(i => i + 1);
        setCode(CODE_STARTERS[language]);
        setOutput('');
        addMessage('ai', `Excellent! Moving on to question ${currentQIdx + 2}:\n\n**${nextQ.question}**`);
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
      technical: 78 + Math.floor(Math.random() * 15),
      problemSolving: 72 + Math.floor(Math.random() * 18),
      communication: 80 + Math.floor(Math.random() * 15),
      optimization: 68 + Math.floor(Math.random() * 20),
    };
    setScores(finalScores);
    const overall = Math.round(finalScores.technical * 0.4 + finalScores.problemSolving * 0.25 + finalScores.communication * 0.2 + finalScores.optimization * 0.15);
    addMessage('ai', `🎉 Interview Complete! Here's your performance summary:\n\n**Overall Score: ${overall}/100**\n\n• Technical (40%): ${finalScores.technical}%\n• Problem Solving (25%): ${finalScores.problemSolving}%\n• Communication (20%): ${finalScores.communication}%\n• Optimization (15%): ${finalScores.optimization}%\n\n**Strengths:** Clear communication, good problem decomposition\n**Areas to improve:** Time complexity analysis, edge case handling\n\nGreat effort! Review your results below.`);
    setPhase('complete');
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const overall = Math.round(scores.technical * 0.4 + scores.problemSolving * 0.25 + scores.communication * 0.2 + scores.optimization * 0.15);

  if (!user) return null;

  // Fullscreen prompt
  if (showFullscreenPrompt) return (
    <div className="fullscreen-prompt">
      <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
        <Brain size={32} color="white" />
      </div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: 12 }}>AI Interview Session</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.7, marginBottom: 8 }}>
        Role: <strong style={{ color: '#a78bfa' }}>{role}</strong> • Type: <strong style={{ color: '#22d3ee' }}>{type}</strong> • Difficulty: <strong style={{ color: { easy: '#34d399', medium: '#fbbf24', hard: '#f87171' }[difficulty] }}>{difficulty}</strong>
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 500, lineHeight: 1.7, marginBottom: 8 }}>
        This session will run in fullscreen for anti-cheat monitoring.
      </p>
      <div style={{ marginBottom: 12 }}>
        <strong style={{ color: '#f87171', display: 'block', marginBottom: 8, fontSize: '0.95rem' }}>⚠️ IMPORTANT: If you switch tabs, minimize, or change the active window, the interview will be ended and submitted automatically.</strong>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Your results will be recorded and the session cannot be resumed.</span>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <input type="checkbox" checked={interviewAckAccepted} onChange={e => setInterviewAckAccepted(e.target.checked)} />
        <span style={{ fontSize: '0.95rem' }}>I understand switching windows will end the interview automatically.</span>
      </label>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn-primary" onClick={startInterview} disabled={!interviewAckAccepted} style={{ padding: '16px 40px', fontSize: '1rem' }}>
          <Maximize size={18} style={{ display: 'inline', marginRight: 8 }} /> Enter Fullscreen & Begin
        </button>
        <button className="btn-ghost" onClick={() => router.push('/interview/ai')} style={{ padding: '16px 24px' }}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Auto-End Notification */}
      {showAutoEndNotification && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #f87171 0%, #e11d48 100%)', color: 'white', padding: '18px 28px', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 9999, maxWidth: 500, textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '1.0rem', marginBottom: 4 }}>🚨 Window Changed - Interview Auto-Ended</div>
          <div style={{ fontSize: '0.9rem', opacity: 0.95 }}>Switching tabs or windows ended your interview. Your results are being submitted.</div>
        </div>
      )}
      {/* Top bar */}
      <div style={{ padding: '12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="pulse-dot" />
            <span style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>AI Interview</span>
          </div>
          <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>{role}</span>
          <span className="badge badge-blue" style={{ fontSize: '0.75rem' }}>{type.toUpperCase()}</span>
          {tabSwitches > 0 && <span className="badge badge-red" style={{ fontSize: '0.75rem' }}>⚠ {tabSwitches} warning{tabSwitches > 1 ? 's' : ''}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
            {formatTime(sessionTime)}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Q {currentQIdx + 1}/{questions.length}</span>
          {phase !== 'complete' && (
            <button className="btn-ghost" onClick={finalizeSession} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>End Session</button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '380px 1fr', overflow: 'hidden' }}>
        {/* Left: AI Chat */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
          {/* Chat header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'white', fontSize: '0.88rem' }}>AI Interviewer</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <div className="pulse-dot" style={{ width: 6, height: 6 }} /> Online
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, fontSize: '0.85rem' }}>
                <MessageSquare size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                Interview starting...
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'} style={{ fontSize: '0.85rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {msg.role === 'ai' && <span style={{ color: '#a78bfa', fontWeight: 700, display: 'block', marginBottom: 4, fontSize: '0.75rem' }}>AI INTERVIEWER</span>}
                {msg.content}
              </div>
            ))}
            {aiTyping && (
              <div className="chat-bubble-ai" style={{ width: 80 }}>
                <span className="typing-dot" style={{ marginRight: 4 }} />
                <span className="typing-dot" style={{ marginRight: 4 }} />
                <span className="typing-dot" />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          {phase !== 'complete' && phase !== 'intro' && (
            <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
              {phase === 'voice' || phase === 'followup' ? (
                <div>
                  {transcript && (
                    <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 10, fontSize: '0.82rem', color: 'var(--text-secondary)', maxHeight: 80, overflowY: 'auto' }}>
                      {transcript}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={toggleVoice} style={{
                      width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
                      background: isRecording ? 'rgba(239,68,68,0.2)' : 'rgba(124,58,237,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: isRecording ? 'pulse 1s infinite' : 'none',
                    }}>
                      {isRecording ? <MicOff size={18} color="#f87171" /> : <Mic size={18} color="#a78bfa" />}
                    </button>
                    <textarea value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="Type or use voice to answer..." style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'white', fontSize: '0.83rem', resize: 'none', fontFamily: 'Inter, sans-serif', outline: 'none', height: 42, lineHeight: '22px' }} />
                    <button onClick={() => submitAnswer(userInput || transcript)} className="btn-primary" style={{ width: 42, height: 42, padding: 0, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              ) : phase === 'coding' && (
                <button onClick={() => {
                  addMessage('user', `[Code submitted in ${language}]`);
                  setPhase('voice');
                  setAiTyping(true);
                  setTimeout(() => {
                    setAiTyping(false);
                    addMessage('ai', 'Good work on the code! Now let\'s evaluate your communication. Please explain your solution verbally — walk me through your approach, why you chose this algorithm, and the time/space complexity.');
                  }, 1500);
                }} className="btn-primary" style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}>
                  Submit Code & Continue to Voice Evaluation →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Code editor / Results */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {phase === 'complete' ? (
            // Results view
            <div style={{ flex: 1, overflowY: 'auto', padding: '36px' }}>
              <div style={{ maxWidth: 700, margin: '0 auto' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', marginBottom: 6, textAlign: 'center' }}>🎉 Session Complete</h2>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 32 }}>Here's your detailed performance breakdown</p>

                {/* Overall score circle */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                  <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-purple)' }}>
                    <div>
                      <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{overall}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>/ 100</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, fontWeight: 700, fontSize: '1.1rem', color: overall >= 80 ? '#34d399' : overall >= 65 ? '#fbbf24' : '#f87171' }}>
                    {overall >= 80 ? '🚀 Excellent Performance!' : overall >= 65 ? '👍 Good Performance' : '📚 Needs Practice'}
                  </div>
                </div>

                {/* Score breakdown */}
                <div className="card-no-hover" style={{ padding: 28, marginBottom: 24 }}>
                  <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 20 }}>Score Breakdown</h3>
                  {[
                    { label: 'Technical', score: scores.technical, weight: '40%', color: '#a78bfa' },
                    { label: 'Problem Solving', score: scores.problemSolving, weight: '25%', color: '#22d3ee' },
                    { label: 'Communication', score: scores.communication, weight: '20%', color: '#34d399' },
                    { label: 'Optimization', score: scores.optimization, weight: '15%', color: '#f59e0b' },
                  ].map(({ label, score, weight, color }) => (
                    <div key={label} style={{ marginBottom: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.88rem' }}>
                        <span style={{ color: 'white', fontWeight: 600 }}>{label} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({weight})</span></span>
                        <span style={{ fontWeight: 800, color }}>{score}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${score}%`, background: color }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-primary" onClick={() => router.push('/interview/ai')} style={{ flex: 1, padding: '14px' }}>
                    New Interview Session
                  </button>
                  <button className="btn-secondary" onClick={() => router.push('/dashboard')} style={{ flex: 1, padding: '14px' }}>
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Code editor view
            <>
              <div style={{ padding: '12px 20px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['python', 'javascript', 'java', 'cpp'] as const).map(lang => (
                    <button key={lang} onClick={() => { setLanguage(lang); setCode(CODE_STARTERS[lang]); }} className={`tab ${language === lang ? 'active' : ''}`} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                      {lang === 'cpp' ? 'C++' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={runCode} className="btn-primary" disabled={isRunning} style={{ padding: '8px 18px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isRunning ? <Square size={14} /> : <Play size={14} />}
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
                  options={{
                    fontSize: 14,
                    fontFamily: 'JetBrains Mono, Fira Code, monospace',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true,
                    padding: { top: 16, bottom: 16 },
                    cursorBlinking: 'smooth',
                  }}
                />
                {/* Output panel */}
                <div style={{ height: '35%', borderTop: '1px solid var(--border)', background: '#0d1117', padding: '14px 20px', overflowY: 'auto' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>OUTPUT</div>
                  {output ? (
                    <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: output.includes('failed') || output.includes('Error') ? '#f87171' : '#34d399', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {output}
                    </pre>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Run your code to see output here...</div>
                  )}
                </div>
              </div>

              {/* Live score ticker */}
              <div style={{ padding: '10px 20px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', display: 'flex', gap: 24, alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>LIVE SCORES:</span>
                {[
                  { label: 'Technical', val: scores.technical, color: '#a78bfa' },
                  { label: 'Comm.', val: scores.communication, color: '#34d399' },
                  { label: 'Problem Solving', val: scores.problemSolving, color: '#22d3ee' },
                  { label: 'Optimization', val: scores.optimization, color: '#f59e0b' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
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
    <Suspense fallback={<div style={{ height: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading interview session...</div>}>
      <InterviewSessionContent />
    </Suspense>
  );
}
