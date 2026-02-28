'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import { Clock, CheckCircle, XCircle, AlertTriangle, ChevronRight, ChevronLeft, Flag, Loader2, Brain, Zap } from 'lucide-react';

/* ── Fallback questions for common tech skills ─────────────────────────── */
type FallbackQ = { question: string; options: string[]; answer: number; explanation: string };

const TECH_FALLBACK: FallbackQ[] = [
  { question: 'In React, what is the purpose of the useEffect hook?', options: ['Managing component state', 'Performing side effects in function components', 'Creating reusable UI components', 'Optimising render performance'], answer: 1, explanation: 'useEffect allows you to perform side effects (data fetching, subscriptions, DOM mutations) in function components.' },
  { question: 'What does the SQL keyword "INNER JOIN" return?', options: ['All rows from both tables', 'Only matching rows from both tables', 'All rows from the left table', 'Only non-matching rows'], answer: 1, explanation: 'INNER JOIN returns only the rows where the join condition is met in both tables.' },
  { question: 'In Python, which data structure uses key-value pairs?', options: ['List', 'Tuple', 'Dictionary', 'Set'], answer: 2, explanation: 'Python dictionaries store data as key-value pairs and are implemented as hash maps.' },
  { question: 'What is the time complexity of binary search?', options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'], answer: 2, explanation: 'Binary search halves the search space each step, giving O(log n) complexity.' },
  { question: 'In Node.js, what does the event loop allow you to do?', options: ['Run multi-threaded code', 'Handle async operations without blocking', 'Access the file system synchronously', 'Manage memory allocation'], answer: 1, explanation: 'The event loop enables non-blocking I/O by offloading operations and handling callbacks when they complete.' },
  { question: 'Which HTTP method is idempotent AND changes server state?', options: ['GET', 'POST', 'PUT', 'PATCH'], answer: 2, explanation: 'PUT is idempotent — calling it multiple times with the same data produces the same result, and it does change server state.' },
  { question: 'What is the main advantage of Docker containers over virtual machines?', options: ['Better security isolation', 'Lower overhead — share the host OS kernel', 'Native GPU support', 'Built-in load balancing'], answer: 1, explanation: 'Containers share the host kernel and package only app dependencies, making them much lighter than full VMs.' },
  { question: 'In JavaScript, what does "async/await" build on top of?', options: ['Callbacks', 'Generators', 'Promises', 'Event Emitters'], answer: 2, explanation: 'async/await is syntactic sugar over Promises, making asynchronous code look synchronous.' },
  { question: 'Which Git command merges a feature branch into main while keeping a linear history?', options: ['git merge', 'git rebase', 'git cherry-pick', 'git stash'], answer: 1, explanation: 'git rebase re-applies commits on top of another branch, maintaining a cleaner linear history.' },
  { question: 'What is the primary purpose of an index in a relational database?', options: ['Enforce referential integrity', 'Speed up data retrieval operations', 'Encrypt column data', 'Limit row access'], answer: 1, explanation: 'Indexes create a data structure (usually B-tree) that allows the database engine to find rows faster without scanning the entire table.' },
  { question: 'In CSS, what does "position: sticky" do?', options: ['Removes the element from document flow', 'Fixes element relative to the viewport always', 'Toggles between relative and fixed based on scroll', 'Makes element overlap others'], answer: 2, explanation: 'sticky acts as relative until the element reaches a scroll threshold, then becomes fixed.' },
  { question: 'What does the CAP theorem state about distributed systems?', options: ['You can achieve all three: Consistency, Availability, Partition tolerance', 'A system can only guarantee two of three: C, A, P', 'Partition tolerance is always optional', 'Availability is always sacrificed for consistency'], answer: 1, explanation: 'CAP theorem states you can only guarantee 2 of 3 properties simultaneously in a distributed system.' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleQuestions(qs: FallbackQ[]): FallbackQ[] {
  return shuffle(qs).map((q: FallbackQ) => {
    const indices: number[] = [0, 1, 2, 3];
    const shuffled: number[] = shuffle(indices);
    const newOptions: string[] = shuffled.map((i: number) => q.options[i]);
    const newAnswer: number = shuffled.indexOf(q.answer);
    return { ...q, options: newOptions, answer: newAnswer };
  });
}

type Question = { question: string; options: string[]; answer: number; explanation: string };

const TOTAL_TIME = 15 * 60; // 15 minutes

export default function ResumeQuizPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Skills from resume (stored by profile page) or fallback to user.skills
  const [quizSkills, setQuizSkills] = useState<string[]>([]);
  const [quizRoles, setQuizRoles] = useState<string[]>([]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    // Read skills stored by profile page
    try {
      const stored = localStorage.getItem('placeai_resume_quiz_skills');
      const storedRoles = localStorage.getItem('placeai_resume_quiz_roles');
      const skills: string[] = stored ? JSON.parse(stored) : (user.skills || []);
      const roles: string[] = storedRoles ? JSON.parse(storedRoles) : [];
      setQuizSkills(skills.length > 0 ? skills : (user.skills || []));
      setQuizRoles(roles);
    } catch {
      setQuizSkills(user.skills || []);
    }
  }, [user]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/generate-aptitude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'resume', count: 10, skills: quizSkills, roles: quizRoles }),
      });
      const data = await res.json();
      if (data.success && data.questions?.length >= 5) {
        setQuestions(data.questions);
        setAnswers(Array(data.questions.length).fill(null));
        setStarted(true);
      } else {
        throw new Error('Insufficient questions from AI');
      }
    } catch {
      // Fallback to shuffled hardcoded technical questions
      const shuffled = shuffleQuestions(TECH_FALLBACK).slice(0, 10);
      setQuestions(shuffled);
      setAnswers(Array(shuffled.length).fill(null));
      setStarted(true);
    } finally {
      setLoading(false);
    }
  }, [quizSkills, quizRoles]);

  // Countdown timer
  useEffect(() => {
    if (!started || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, submitted]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (started && !submitted && timeLeft === 0) handleSubmit();
  }, [timeLeft, started, submitted]);

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    const sc = answers.filter((a, i) => a === questions[i]?.answer).length;
    const acc = Math.round((sc / questions.length) * 100);
    const tu = TOTAL_TIME - timeLeft;
    if (user) {
      fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveQuizAttempt',
          attempt: {
            userEmail: user.email, section: 'resume',
            score: sc, total: questions.length, accuracy: acc,
            timeUsed: tu, answers,
          },
        }),
      }).catch(() => {});
    }
  }, [answers, questions, timeLeft, user]);

  // Anti-cheat: auto-submit on tab switch
  useEffect(() => {
    if (!started || submitted) return;
    const handler = () => { if (document.hidden) handleSubmit(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [started, submitted, handleSubmit]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const toggleFlag = () => setFlagged(f => { const n = new Set(f); n.has(current) ? n.delete(current) : n.add(current); return n; });

  const score = questions.length > 0 ? answers.filter((a, i) => a === questions[i]?.answer).length : 0;
  const accuracy = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const timeUsed = TOTAL_TIME - timeLeft;

  const handleRetake = () => {
    setStarted(false); setSubmitted(false); setQuestions([]); setAnswers([]);
    setTimeLeft(TOTAL_TIME); setCurrent(0); setFlagged(new Set());
  };

  if (!user) return null;

  /* ── Intro Screen ───────────────────────────────────────────────────────── */
  if (!started) return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div className="card-no-hover" style={{ maxWidth: 580, width: '100%', padding: 48, textAlign: 'center' }}>
          {/* Icon */}
          <div style={{ width: 72, height: 72, borderRadius: 18, background: 'rgba(124,58,237,0.18)', border: '2px solid rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Brain size={36} color="#a78bfa" />
          </div>

          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'white', marginBottom: 8 }}>Resume-Based Quiz</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.6 }}>
            10 AI-generated technical questions tailored to the skills on your resume
          </p>

          {/* Role tags */}
          {quizRoles.length > 0 && (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
              {quizRoles.slice(0, 2).map(r => (
                <span key={r} style={{ padding: '3px 12px', borderRadius: 20, background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)', color: '#22d3ee', fontSize: '0.76rem', fontWeight: 700 }}>
                  🎯 {r.split(' (')[0]}
                </span>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Questions', val: '10' },
              { label: 'Duration', val: '15 min' },
              { label: 'Marks', val: '10 / 0' },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '14px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>{val}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Skills being tested */}
          {quizSkills.length > 0 && (
            <div style={{ marginBottom: 24, padding: '14px 18px', borderRadius: 12, background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.25)', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Zap size={13} color="#a78bfa" />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.05em' }}>SKILLS BEING TESTED</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {quizSkills.slice(0, 10).map(s => (
                  <span key={s} style={{ padding: '3px 10px', borderRadius: 10, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: '0.76rem', fontWeight: 600 }}>{s}</span>
                ))}
                {quizSkills.length > 10 && <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem', alignSelf: 'center' }}>+{quizSkills.length - 10} more</span>}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.28)', borderRadius: 10, padding: '14px 18px', marginBottom: 28, textAlign: 'left' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#fbbf24', fontWeight: 600, fontSize: '0.83rem', marginBottom: 6 }}>
              <AlertTriangle size={15} /> Instructions
            </div>
            <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4, margin: 0 }}>
              <li>Timer starts when you click Begin Quiz</li>
              <li>Questions are AI-generated based on your exact resume skills</li>
              <li>Flag questions to revisit before submitting</li>
              <li style={{ color: '#f87171', fontWeight: 600 }}>⚠ Switching tabs auto-submits your quiz</li>
            </ul>
          </div>

          {loadError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#f87171', fontSize: '0.83rem' }}>
              {loadError}
            </div>
          )}

          {quizSkills.length === 0 && (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#fbbf24', fontSize: '0.83rem' }}>
              ⚠ No resume skills found. Please upload your resume on the Profile page first, or questions will use general technical topics.
            </div>
          )}

          <button
            className="btn-primary"
            onClick={loadQuestions}
            disabled={loading}
            style={{ width: '100%', padding: '16px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <><Loader2 size={18} className="spin-icon" /> Generating Questions from Resume...</>
            ) : (
              '🚀 Begin Resume Quiz'
            )}
          </button>
          <button className="btn-ghost" onClick={() => router.push('/profile')} style={{ width: '100%', marginTop: 10, padding: '12px', fontSize: '0.9rem' }}>
            ← Back to Profile
          </button>
        </div>
      </main>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin-icon { animation: spin 1s linear infinite; }`}</style>
    </div>
  );

  /* ── Results Screen ─────────────────────────────────────────────────────── */
  if (submitted) return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '32px 36px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>{accuracy >= 80 ? '🏆' : accuracy >= 60 ? '👍' : '📚'}</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: 6 }}>Quiz Complete!</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Resume-Based Technical Quiz Results</p>
          </div>

          {/* Score summary */}
          <div className="card-no-hover" style={{ padding: 36, marginBottom: 24, textAlign: 'center' }}>
            <div style={{ fontSize: '4.5rem', fontWeight: 900, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
              {accuracy}%
            </div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>Overall Accuracy</div>
            <div style={{ fontSize: '0.82rem', color: accuracy >= 80 ? '#34d399' : accuracy >= 60 ? '#fbbf24' : '#f87171', fontWeight: 600, marginBottom: 28 }}>
              {accuracy >= 80 ? '🔥 Excellent! Your resume skills are solid.' : accuracy >= 60 ? '👌 Good job! Keep practising.' : '📖 Room to grow — revisit your core skills.'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
              {[
                { label: 'Correct', val: score, color: '#34d399' },
                { label: 'Wrong', val: questions.length - score, color: '#f87171' },
                { label: 'Total', val: questions.length, color: '#a78bfa' },
                { label: 'Time Used', val: formatTime(timeUsed), color: '#22d3ee' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{val}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills tested */}
          {quizSkills.length > 0 && (
            <div className="card-no-hover" style={{ padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 10 }}>SKILLS TESTED</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {quizSkills.slice(0, 10).map(s => (
                  <span key={s} style={{ padding: '3px 10px', borderRadius: 10, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: '0.76rem', fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Question review */}
          <div className="card-no-hover" style={{ padding: 28 }}>
            <h2 style={{ fontWeight: 700, color: 'white', marginBottom: 20, fontSize: '1.05rem' }}>Question Review</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {questions.map((q, i) => {
                const isCorrect = answers[i] === q.answer;
                return (
                  <div key={i} style={{ padding: '18px', borderRadius: 12, border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, background: isCorrect ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                      {isCorrect ? <CheckCircle size={18} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} /> : <XCircle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />}
                      <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 500, lineHeight: 1.5 }}>Q{i + 1}. {q.question}</div>
                    </div>
                    <div style={{ paddingLeft: 28, fontSize: '0.82rem' }}>
                      <div style={{ color: '#34d399', marginBottom: 4 }}>✓ Correct: {q.options[q.answer]}</div>
                      {!isCorrect && answers[i] !== null && <div style={{ color: '#f87171', marginBottom: 4 }}>✗ Your answer: {q.options[answers[i]!]}</div>}
                      {answers[i] === null && <div style={{ color: '#f59e0b', marginBottom: 4 }}>— Not attempted</div>}
                      <div style={{ color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>💡 {q.explanation}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button className="btn-primary" onClick={handleRetake} style={{ flex: 1, padding: '14px' }}>
              Retake Quiz (New Questions)
            </button>
            <button className="btn-secondary" onClick={() => router.push('/profile')} style={{ flex: 1, padding: '14px' }}>
              ← Back to Profile
            </button>
            <button className="btn-ghost" onClick={() => router.push('/aptitude')} style={{ flex: 1, padding: '14px' }}>
              Aptitude Hub
            </button>
          </div>
        </div>
      </main>
    </div>
  );

  /* ── Active Quiz Screen ─────────────────────────────────────────────────── */
  const q = questions[current];
  if (!q) return null;
  const timeWarning = timeLeft < 120;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '24px 28px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, padding: '14px 20px', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>Resume-Based Quiz</div>
            <div style={{ fontSize: '0.75rem', color: '#a78bfa', marginTop: 2 }}>
              {quizSkills.slice(0, 3).join(' · ')}{quizSkills.length > 3 ? ` +${quizSkills.length - 3}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Q {current + 1}/{questions.length}</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20,
              background: timeWarning ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.15)',
              border: `1px solid ${timeWarning ? 'rgba(239,68,68,0.4)' : 'rgba(124,58,237,0.4)'}`,
            }}>
              <Clock size={15} color={timeWarning ? '#f87171' : '#a78bfa'} />
              <span style={{ fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: timeWarning ? '#f87171' : '#a78bfa', fontSize: '0.95rem' }}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <button className="btn-primary" onClick={handleSubmit} style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
              Submit Quiz
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 20 }}>
          {/* Question card */}
          <div className="card-no-hover" style={{ padding: 32 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 28 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: 'white', flexShrink: 0 }}>
                {current + 1}
              </div>
              <p style={{ fontSize: '1.05rem', color: 'white', lineHeight: 1.7, fontWeight: 500 }}>{q.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {q.options.map((opt, i) => {
                const selected = answers[current] === i;
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers(a => { const n = [...a]; n[current] = i; return n; })}
                    style={{
                      padding: '14px 20px', borderRadius: 12,
                      border: `2px solid ${selected ? 'var(--accent-purple)' : 'var(--border)'}`,
                      background: selected ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                      textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', width: '100%',
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      border: `2px solid ${selected ? 'var(--accent-purple)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.82rem',
                      color: selected ? '#a78bfa' : 'var(--text-secondary)', flexShrink: 0,
                      background: selected ? 'rgba(124,58,237,0.2)' : 'transparent',
                    }}>
                      {['A', 'B', 'C', 'D'][i]}
                    </div>
                    <span style={{ fontSize: '0.95rem', color: selected ? 'white' : 'var(--text-secondary)', textAlign: 'left', lineHeight: 1.5 }}>{opt}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn-ghost" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', opacity: current === 0 ? 0.4 : 1 }}>
                <ChevronLeft size={16} /> Previous
              </button>
              <button
                onClick={toggleFlag}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, cursor: 'pointer',
                  background: flagged.has(current) ? 'rgba(245,158,11,0.2)' : 'transparent',
                  border: `1px solid ${flagged.has(current) ? 'rgba(245,158,11,0.5)' : 'var(--border)'}`,
                  color: flagged.has(current) ? '#fbbf24' : 'var(--text-secondary)',
                  fontSize: '0.85rem', fontWeight: 500,
                }}
              >
                <Flag size={14} /> {flagged.has(current) ? 'Flagged' : 'Flag'}
              </button>
              <button className="btn-primary" onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))} disabled={current === questions.length - 1} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', opacity: current === questions.length - 1 ? 0.4 : 1 }}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Question navigator */}
          <div className="card-no-hover" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, color: 'white', fontSize: '0.85rem', marginBottom: 16 }}>Questions</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 20 }}>
              {questions.map((_, i) => {
                const ans = answers[i] !== null;
                const isCurr = i === current;
                const isFlag = flagged.has(i);
                return (
                  <button key={i} onClick={() => setCurrent(i)} style={{
                    aspectRatio: '1', borderRadius: 6,
                    border: `2px solid ${isCurr ? 'var(--accent-purple)' : isFlag ? 'rgba(245,158,11,0.6)' : ans ? 'rgba(16,185,129,0.5)' : 'var(--border)'}`,
                    background: isCurr ? 'rgba(124,58,237,0.3)' : isFlag ? 'rgba(245,158,11,0.15)' : ans ? 'rgba(16,185,129,0.15)' : 'transparent',
                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                    color: isCurr ? '#a78bfa' : isFlag ? '#fbbf24' : ans ? '#34d399' : 'var(--text-secondary)',
                  }}>{i + 1}</button>
                );
              })}
            </div>
            <div style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { color: 'rgba(16,185,129,0.6)', label: 'Answered' },
                { color: 'rgba(245,158,11,0.6)', label: 'Flagged' },
                { color: 'rgba(255,255,255,0.15)', label: 'Not visited' },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
                  {label}
                </div>
              ))}
            </div>
            {/* Progress */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>Progress</div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ height: '100%', borderRadius: 3, background: 'var(--gradient-primary)', width: `${(answers.filter(a => a !== null).length / questions.length) * 100}%`, transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                {answers.filter(a => a !== null).length}/{questions.length} answered
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
