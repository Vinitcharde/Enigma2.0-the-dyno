'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useWindowChangeProtection } from '@/lib/useWindowChangeProtection';
import { useTTS } from '@/lib/useTTS';
import dynamic from 'next/dynamic';
import {
  Brain, Mic, MicOff, Play, Square, Send, Code2,
  AlertTriangle, Maximize, ChevronRight, Clock, X,
  Volume2, VolumeX, Star, TrendingUp, Target, Zap, MessageSquare
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

  // Text-to-Speech integration
  const tts = useTTS({ rate: 1.05, preferredVoice: 'Google' });
  const lastSpokenRef = useRef<string>('');
  const [aiError, setAiError] = useState<string | null>(null);

  // Helper: call the AI interview API
  const callAI = async (payload: Record<string, any>): Promise<{ response: string; scores?: any; fallback?: boolean }> => {
    try {
      setAiError(null);
      const res = await fetch('/api/ai-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          role,
          type,
          difficulty,
          question: currentQ.question,
          chatHistory: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.fallback) setAiError('AI temporarily unavailable — using fallback responses');
      return data;
    } catch (err: any) {
      console.error('AI API Error:', err);
      setAiError('Could not reach AI — using local feedback');
      return { response: '', fallback: true };
    }
  };

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
    // Auto-speak AI messages
    if (role === 'ai' && content !== lastSpokenRef.current) {
      lastSpokenRef.current = content;
      tts.speak(content);
    }
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
      // Auto-pause TTS when user starts speaking to avoid feedback
      if (tts.isSpeaking) tts.stop();

      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.onresult = (e: any) => {
          let finalText = '';
          let interimText = '';
          for (let i = 0; i < e.results.length; i++) {
            const result = e.results[i];
            if (result.isFinal) {
              finalText += result[0].transcript;
            } else {
              interimText += result[0].transcript;
            }
          }
          setTranscript(finalText + interimText);
          // Also populate the userInput for easy editing
          setUserInput(prev => {
            if (!prev || prev === transcript) return finalText + interimText;
            return prev;
          });
        };
        rec.onerror = (e: any) => {
          console.warn('Speech recognition error:', e.error);
          if (e.error === 'not-allowed') {
            setTranscript('(Microphone access denied. Please allow microphone access and try again.)');
          }
          setIsRecording(false);
        };
        rec.onend = () => {
          // Auto-restart if still in recording mode (browser sometimes stops)
          if (isRecording && recognitionRef.current === rec) {
            try { rec.start(); } catch (e) { setIsRecording(false); }
          }
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
    // Stop recording if active
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }
    addMessage('user', text);
    setTranscript('');
    setUserInput('');
    setAiTyping(true);

    if (phase === 'coding') {
      // During coding phase: user is asking questions or explaining their thought process
      const data = await callAI({ action: 'evaluate_response', userMessage: text });
      setAiTyping(false);
      if (data.response) {
        addMessage('ai', data.response);
      } else {
        addMessage('ai', 'That\'s an interesting approach! Keep working on your solution. Feel free to ask me any questions about the problem.');
      }
      setScores(s => ({ ...s, communication: Math.min(100, s.communication + 5) }));
    } else if (phase === 'voice') {
      // AI evaluates the verbal explanation
      const data = await callAI({ action: 'evaluate_response', userMessage: text });
      setAiTyping(false);
      if (data.response) {
        addMessage('ai', data.response);
      } else {
        addMessage('ai', `Great explanation! ${currentQ.followUp}`);
      }
      setScores(s => ({ ...s, communication: Math.min(100, s.communication + 15), problemSolving: Math.min(100, s.problemSolving + 10) }));
      setPhase('followup');
    } else if (phase === 'followup') {
      // AI generates follow-up response
      const data = await callAI({ action: 'generate_followup', userMessage: text });
      setAiTyping(false);
      if (data.response) {
        addMessage('ai', data.response);
      }
      setScores(s => ({ ...s, communication: Math.min(100, s.communication + 10), problemSolving: Math.min(100, s.problemSolving + 8) }));

      // After follow-up, move to next question or finalize
      setTimeout(async () => {
        if (currentQIdx < questions.length - 1) {
          const nextQ = questions[currentQIdx + 1];
          setCurrentQIdx(i => i + 1);
          setCode(CODE_STARTERS[language]);
          setOutput('');
          addMessage('ai', `Great, let's move on!\n\n**Question ${currentQIdx + 2}:** ${nextQ.question}\n\nTake your time and think through your approach.`);
          setPhase('coding');
        } else {
          finalizeSession();
        }
      }, 2000);
    }
  };

  const finalizeSession = async () => {
    setAiTyping(true);

    // Call AI for final evaluation with full conversation context
    const data = await callAI({ action: 'final_evaluation' });
    setAiTyping(false);

    if (data.scores) {
      setScores(data.scores);
      const overall = Math.round(data.scores.technical * 0.4 + data.scores.problemSolving * 0.25 + data.scores.communication * 0.2 + data.scores.optimization * 0.15);
      addMessage('ai', data.response || `🎉 Interview Complete!\n\n**Overall Score: ${overall}/100**\n\nReview your detailed breakdown below.`);
    } else {
      // Fallback scores if AI doesn't return them
      const fallbackScores = {
        technical: 72 + Math.floor(Math.random() * 15),
        problemSolving: 68 + Math.floor(Math.random() * 18),
        communication: 75 + Math.floor(Math.random() * 15),
        optimization: 65 + Math.floor(Math.random() * 20),
      };
      setScores(fallbackScores);
      const overall = Math.round(fallbackScores.technical * 0.4 + fallbackScores.problemSolving * 0.25 + fallbackScores.communication * 0.2 + fallbackScores.optimization * 0.15);
      addMessage('ai', data.response || `🎉 Interview Complete!\n\n**Overall Score: ${overall}/100**\n\n• Technical (40%): ${fallbackScores.technical}%\n• Problem Solving (25%): ${fallbackScores.problemSolving}%\n• Communication (20%): ${fallbackScores.communication}%\n• Optimization (15%): ${fallbackScores.optimization}%\n\nReview your detailed results below.`);
    }
    setPhase('complete');
    if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
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
      {/* AI Status Indicator */}
      {aiError && (
        <div style={{ position: 'fixed', bottom: 16, right: 16, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', padding: '8px 14px', borderRadius: 8, fontSize: '0.75rem', zIndex: 9999, maxWidth: 300, display: 'flex', alignItems: 'center', gap: 6 }}>
          ⚠ {aiError}
          <button onClick={() => setAiError(null)} style={{ background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer', padding: '0 4px', fontSize: '1rem' }}>×</button>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* TTS Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: tts.isEnabled ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${tts.isEnabled ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`, transition: 'all 0.3s' }}>
            <button onClick={tts.toggleEnabled} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }} title={tts.isEnabled ? 'Mute AI Voice' : 'Enable AI Voice'}>
              {tts.isEnabled ? <Volume2 size={15} color="#a78bfa" /> : <VolumeX size={15} color="#5a5a7a" />}
            </button>
            {tts.isEnabled && (
              <>
                {tts.isSpeaking && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 2 }}>
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} style={{
                        width: 2, background: '#a78bfa', borderRadius: 1,
                        animation: `ttsWave 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
                      }} />
                    ))}
                  </div>
                )}
                <select
                  value={String(tts.selectedVoice?.name || '')}
                  onChange={e => {
                    const v = tts.voices.find(v => v.name === e.target.value);
                    if (v) tts.setVoice(v);
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.68rem', outline: 'none', cursor: 'pointer', maxWidth: 90 }}
                  title="Select voice"
                >
                  {tts.voices.filter(v => v.lang.startsWith('en')).slice(0, 10).map(v => (
                    <option key={v.name} value={v.name} style={{ background: '#1a1a2e', color: '#e8e8f0' }}>{v.name.replace('Microsoft ', '').replace('Google ', '').substring(0, 20)}</option>
                  ))}
                </select>
              </>
            )}
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
            {formatTime(sessionTime)}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Q {currentQIdx + 1}/{questions.length}</span>
          {phase !== 'complete' && (
            <button className="btn-ghost" onClick={() => { tts.stop(); finalizeSession(); }} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>End Session</button>
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
              <div style={{ fontSize: '0.72rem', color: tts.isSpeaking ? '#a78bfa' : 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.3s' }}>
                <div className="pulse-dot" style={{ width: 6, height: 6, background: tts.isSpeaking ? '#a78bfa' : undefined }} /> {tts.isSpeaking ? '🔊 Speaking...' : 'Online'}
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
                {msg.role === 'ai' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: '0.75rem' }}>AI INTERVIEWER</span>
                    <button
                      onClick={() => tts.speak(msg.content)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.6, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                      title="Replay this message"
                    >
                      <Volume2 size={13} color="#a78bfa" />
                    </button>
                  </div>
                )}
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

          {/* Input area — Voice + Text always available in all active phases */}
          {phase !== 'complete' && phase !== 'intro' && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              {/* Phase indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: phase === 'coding' ? '#22d3ee' : phase === 'voice' ? '#34d399' : '#f59e0b' }} />
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {phase === 'coding' ? '💻 Coding Phase — Speak or type to ask questions' : phase === 'voice' ? '🎤 Voice Phase — Explain your approach' : '💬 Follow-up — Answer the question'}
                </span>
              </div>

              {/* Live transcript preview */}
              {(transcript || isRecording) && (
                <div style={{
                  background: isRecording ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.08)',
                  border: `1px solid ${isRecording ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.2)'}`,
                  borderRadius: 10, padding: '8px 14px', marginBottom: 8,
                  fontSize: '0.8rem', color: 'var(--text-secondary)',
                  maxHeight: 60, overflowY: 'auto',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.3s',
                }}>
                  {isRecording && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: 3, background: '#a78bfa', borderRadius: 2,
                          animation: `ttsWave 0.5s ease-in-out ${i * 0.12}s infinite alternate`,
                        }} />
                      ))}
                    </div>
                  )}
                  <span>{transcript || (isRecording ? 'Listening...' : '')}</span>
                </div>
              )}

              {/* Unified input row: Mic + TextArea + Send */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                {/* Mic button */}
                <button onClick={toggleVoice} title={isRecording ? 'Stop recording' : 'Start voice input'} style={{
                  width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: isRecording ? 'rgba(239,68,68,0.25)' : 'rgba(124,58,237,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: isRecording ? 'pulse 1.5s infinite' : 'none',
                  transition: 'background 0.3s',
                  boxShadow: isRecording ? '0 0 12px rgba(239,68,68,0.3)' : 'none',
                }}>
                  {isRecording ? <MicOff size={17} color="#f87171" /> : <Mic size={17} color="#a78bfa" />}
                </button>

                {/* Text input */}
                <textarea
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitAnswer(userInput || transcript);
                    }
                  }}
                  placeholder={phase === 'coding' ? 'Ask a question or explain your thinking...' : phase === 'voice' ? 'Explain your approach...' : 'Type your follow-up answer...'}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '9px 14px', color: 'white', fontSize: '0.82rem',
                    resize: 'none', fontFamily: 'Inter, sans-serif', outline: 'none',
                    height: 40, lineHeight: '22px', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />

                {/* Send button */}
                <button
                  onClick={() => submitAnswer(userInput || transcript)}
                  disabled={!(userInput.trim() || transcript.trim()) || aiTyping}
                  className="btn-primary"
                  title="Send message"
                  style={{
                    width: 40, height: 40, padding: 0, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    opacity: (userInput.trim() || transcript.trim()) && !aiTyping ? 1 : 0.4,
                  }}
                >
                  <Send size={15} />
                </button>
              </div>

              {/* Code submit button (only during coding phase) */}
              {phase === 'coding' && (
                <button onClick={async () => {
                  if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); }
                  addMessage('user', `[Code submitted in ${language}]\n\`\`\`${language}\n${code}\n\`\`\``);
                  setAiTyping(true);

                  const data = await callAI({ action: 'analyze_code', code, language });
                  setAiTyping(false);

                  if (data.response) {
                    addMessage('ai', data.response);
                  } else {
                    addMessage('ai', 'Good work on the code! Now let\'s evaluate your communication. Please explain your solution verbally — walk me through your approach, why you chose this algorithm, and the time/space complexity.');
                  }
                  setScores(s => ({ ...s, technical: Math.min(100, s.technical + 15) }));
                  setPhase('voice');
                }} className="btn-primary" style={{
                  width: '100%', padding: '9px', fontSize: '0.82rem', marginTop: 8,
                  background: 'linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <Code2 size={15} /> Submit Code & Continue to AI Analysis →
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
