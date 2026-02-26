'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useWindowChangeProtection } from '@/lib/useWindowChangeProtection';
import Sidebar from '@/components/Sidebar';
import { Clock, CheckCircle, XCircle, AlertTriangle, ChevronRight, ChevronLeft, Flag } from 'lucide-react';

const QUIZ_DATA: Record<string, { question: string; options: string[]; answer: number; explanation: string }[]> = {
  quantitative: [
    { question: 'A train travels 360 km at a uniform speed. If the speed had been 5 km/h more, it would have taken 1 hour less. Find the original speed.', options: ['40 km/h', '45 km/h', '36 km/h', '50 km/h'], answer: 0, explanation: 'Let speed = x. 360/x - 360/(x+5) = 1. Solving: x = 40 km/h.' },
    { question: 'What is 15% of 80% of 500?', options: ['60', '72', '50', '80'], answer: 0, explanation: '80% of 500 = 400. 15% of 400 = 60.' },
    { question: 'If 6 workers can complete a job in 12 days, how many days will 9 workers take?', options: ['8 days', '9 days', '6 days', '10 days'], answer: 0, explanation: '6×12 = 9×d → d = 8 days.' },
    { question: 'Find the compound interest on ₹10,000 at 10% per annum for 2 years.', options: ['₹2,100', '₹2,000', '₹1,900', '₹2,500'], answer: 0, explanation: 'CI = 10000(1.1²) - 10000 = 10000×0.21 = ₹2,100.' },
    { question: 'The average of 5 numbers is 18. Four of them are 12, 15, 22, 19. Find the fifth.', options: ['22', '24', '20', '18'], answer: 0, explanation: '5×18 = 90. Sum of 4 = 68. Fifth = 90-68 = 22.' },
    { question: 'Two pipes A and B can fill a tank in 20 and 30 minutes. Both opened together, when will the tank be full?', options: ['12 min', '10 min', '15 min', '8 min'], answer: 0, explanation: 'Combined rate = 1/20+1/30 = 5/60 = 1/12. Time = 12 min.' },
    { question: 'A shopkeeper sells goods at 20% loss on cost price. SP is ₹160. Find CP.', options: ['₹200', '₹180', '₹192', '₹220'], answer: 0, explanation: 'CP × 0.8 = 160 → CP = ₹200.' },
    { question: 'What is the LCM of 12, 15, and 20?', options: ['60', '45', '30', '120'], answer: 0, explanation: 'LCM(12,15,20) = 60.' },
    { question: 'If 3x - 7 = 11, what is the value of x?', options: ['6', '4', '8', '5'], answer: 0, explanation: '3x = 18 → x = 6.' },
    { question: 'A rectangle has length 15 cm and width 8 cm. Find its diagonal.', options: ['17 cm', '15 cm', '20 cm', '13 cm'], answer: 0, explanation: '√(15²+8²) = √(225+64) = √289 = 17 cm.' },
  ],
  logical: [
    { question: 'Complete the series: 2, 6, 12, 20, 30, ?', options: ['42', '40', '36', '44'], answer: 0, explanation: 'Differences: 4,6,8,10,12. Next = 30+12 = 42.' },
    { question: 'If MANGO = 13-1-14-7-15, what is APPLE?', options: ['1-16-16-12-5', '1-15-16-12-5', '1-16-17-12-5', '2-16-16-12-5'], answer: 0, explanation: 'Each letter = its position in alphabet. A=1,P=16,P=16,L=12,E=5.' },
    { question: 'A is B\'s sister. C is B\'s mother. D is C\'s father. E is D\'s mother. How is A related to D?', options: ['Granddaughter', 'Daughter', 'Grandmother', 'Sister'], answer: 0, explanation: 'D is C\'s father → C\'s father→B\'s grandfather→A\'s grandfather. A is D\'s granddaughter.' },
    { question: 'Find the odd one out: 3, 5, 7, 9, 11, 13', options: ['9', '3', '11', '13'], answer: 0, explanation: '9 = 3² is a perfect square; all others are prime.' },
    { question: 'If ROSE → TQUG, then BALE → ?', options: ['DCNG', 'DCOF', 'DBNG', 'ECNG'], answer: 0, explanation: 'Each letter +2. B+2=D, A+2=C, L+2=N, E+2=G → DCNG.' },
    { question: 'Walking at 3/4 of his usual speed, a person reaches office 20 min late. Usual time?', options: ['60 min', '45 min', '80 min', '50 min'], answer: 0, explanation: 'If speed = 3/4, time = 4/3 normal. Extra time = 1/3 × T = 20 min → T = 60 min.' },
    { question: 'If all Roses are Flowers and some Flowers are Red, then which is definitely true?', options: ['Some roses may be red', 'All roses are red', 'No roses are red', 'All red are flowers'], answer: 0, explanation: 'We cannot conclude all roses are red. But some roses may be red (possible).' },
    { question: 'Point A is 30m East of B. C is 20m South of A. D is 30m West of C. What direction is D from B?', options: ['South', 'East', 'North', 'West'], answer: 0, explanation: 'B→30E→A→20S→C→30W=D. D is directly South of B.' },
    { question: 'Find the next term: 1, 4, 9, 16, 25, ?', options: ['36', '30', '49', '35'], answer: 0, explanation: 'Perfect squares: 1²,2²,3²,4²,5²,6²=36.' },
    { question: 'In a line of boys, Raj is 15th from left and 20th from right. How many boys?', options: ['34', '35', '36', '33'], answer: 0, explanation: '15+20-1 = 34 boys.' },
  ],
  verbal: [
    { question: 'Choose the word most similar in meaning to BENEVOLENT:', options: ['Kind', 'Cruel', 'Selfish', 'Harsh'], answer: 0, explanation: 'Benevolent = kind, generous, well-meaning.' },
    { question: 'Choose the antonym of VERBOSE:', options: ['Concise', 'Wordy', 'Talkative', 'Lengthy'], answer: 0, explanation: 'Verbose = using too many words. Antonym = concise.' },
    { question: 'Identify the error: "She don\'t know the answer."', options: ['don\'t → doesn\'t', 'She → Her', 'know → knew', 'No error'], answer: 0, explanation: 'Third person singular requires "doesn\'t".' },
    { question: 'Fill in: The manager along with his teammates ___ present at the meeting.', options: ['was', 'were', 'are', 'have been'], answer: 0, explanation: '"Along with" does not make the subject plural. "Manager" is singular → "was".' },
    { question: 'Select the correctly spelled word:', options: ['Occurrence', 'Occurence', 'Occurance', 'Ocurrence'], answer: 0, explanation: 'Correct spelling is "Occurrence" (double c, double r).' },
    { question: 'BOOK : LIBRARY :: PAINTING : ?', options: ['Gallery', 'Museum', 'Art', 'Canvas'], answer: 0, explanation: 'Books are kept in Library; Paintings are kept in Gallery.' },
    { question: 'Rearrange: "always / should / the truth / you / speak" to form a sentence:', options: ['You should always speak the truth', 'You always should speak the truth', 'Always you should speak the truth', 'You should speak always the truth'], answer: 0, explanation: 'Correct: "You should always speak the truth."' },
    { question: 'One-word substitute for: "Unable to be corrected or amended":', options: ['Incorrigible', 'Intangible', 'Invincible', 'Inevitable'], answer: 0, explanation: 'Incorrigible = not able to be corrected.' },
    { question: 'Choose the correct idiom meaning for "Bite the bullet":', options: ['Endure pain stoically', 'Shoot someone', 'Eat quickly', 'Face a problem'], answer: 0, explanation: '"Bite the bullet" means to endure a painful situation bravely.' },
    { question: 'Reading passage: "Success is not final, failure is not fatal: it is the courage to continue that counts." This quote emphasizes:', options: ['Perseverance', 'Talent', 'Luck', 'Intelligence'], answer: 0, explanation: 'The quote emphasizes perseverance—courage to continue despite outcomes.' },
  ],
};

export default function QuizPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const section = params?.section as string;

  const questions = QUIZ_DATA[section] || [];
  const TOTAL_TIME = section === 'logical' ? 25 * 60 : 20 * 60; // seconds

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null));
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [ackAccepted, setAckAccepted] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showAutoSubmitNotification, setShowAutoSubmitNotification] = useState(false);

  const titles: Record<string, string> = {
    quantitative: 'Quantitative Aptitude',
    logical: 'Logical Reasoning',
    verbal: 'Verbal Ability',
  };

  // Window change protection - auto-submit on tab switch
  const { enterFullscreen } = useWindowChangeProtection({
    enabled: started && !submitted,
    showWarning: false,  // Disable alerts
    enableFullscreen: true,
    onWindowChange: () => {
      setTabSwitches(t => t + 1);
      // Show auto-submit notification
      setShowAutoSubmitNotification(true);
      // Auto-submit the quiz
      setTimeout(() => setSubmitted(true), 2000);
    },
    warningMessage: 'Quiz auto-submitted due to window change.',
  });

  useEffect(() => {
    if (!started || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, submitted]);

  const handleSubmit = useCallback(() => setSubmitted(true), []);

  const handleQuizStart = useCallback(() => {
    enterFullscreen();
    setStarted(true);
  }, [enterFullscreen]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const score = answers.filter((a, i) => a === questions[i]?.answer).length;
  const accuracy = Math.round((score / questions.length) * 100);
  const timeUsed = TOTAL_TIME - timeLeft;

  const toggleFlag = () => {
    setFlagged(f => {
      const n = new Set(f);
      n.has(current) ? n.delete(current) : n.add(current);
      return n;
    });
  };

  if (!user) return null;

  // Start screen
  if (!started) return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div className="card-no-hover" style={{ maxWidth: 560, width: '100%', padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>
            {section === 'quantitative' ? '🔢' : section === 'logical' ? '🧩' : '📝'}
          </div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'white', marginBottom: 8 }}>{titles[section]}</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.6 }}>
            {questions.length} questions • {TOTAL_TIME / 60} minutes • No negative marking
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 36 }}>
            {[
              { label: 'Questions', val: questions.length },
              { label: 'Duration', val: `${TOTAL_TIME / 60} min` },
              { label: 'Marks', val: `${questions.length}/0` },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>{val}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 28, textAlign: 'left' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#fbbf24', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6 }}>
              <AlertTriangle size={16} /> Instructions
            </div>
            <ul style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Timer starts when you click Begin Quiz</li>
              <li>You can flag questions to review later</li>
              <li>Click Submit Quiz when done</li>
              <li>Results shown immediately after submission</li>
            </ul>
          </div>
          <button className="btn-primary" onClick={() => setShowInstructionModal(true)} style={{ width: '100%', padding: '16px', fontSize: '1rem' }}>
            🚀 Begin Quiz
          </button>
          <button className="btn-ghost" onClick={() => router.push('/aptitude')} style={{ width: '100%', marginTop: 10, padding: '12px', fontSize: '0.9rem' }}>
            Cancel
          </button>
          {showInstructionModal && (
            <div className="instruction-modal" style={{ marginTop: 18, background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: 18, borderRadius: 10 }}>
              <h3 style={{ marginBottom: 8, fontWeight: 700 }}>Important Instructions</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: 12 }}>
                <strong style={{ color: '#f87171', display: 'block', marginBottom: 8 }}>⚠️ IMPORTANT: Switching tabs or changing the active window will automatically submit your quiz immediately.</strong>
                Please ensure you remain on this screen until you finish. Your answers will be recorded up to the point of submission and the session cannot be resumed.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <input type="checkbox" checked={ackAccepted} onChange={e => setAckAccepted(e.target.checked)} />
                <span style={{ fontSize: '0.9rem' }}>I understand that switching windows will auto-submit the quiz.</span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" disabled={!ackAccepted} onClick={() => { setShowInstructionModal(false); handleQuizStart(); }} style={{ padding: '10px 16px' }}>Start Quiz</button>
                <button className="btn-ghost" onClick={() => setShowInstructionModal(false)} style={{ padding: '10px 16px' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );

  // Results screen
  if (submitted) return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '32px 36px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>{accuracy >= 80 ? '🏆' : accuracy >= 60 ? '👍' : '📚'}</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: 6 }}>Quiz Complete!</h1>
            <p style={{ color: 'var(--text-secondary)' }}>{titles[section]} Results</p>
          </div>

          {/* Score card */}
          <div className="card-no-hover" style={{ padding: 36, marginBottom: 24, textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', fontWeight: 900, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
              {accuracy}%
            </div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>Overall Accuracy</div>
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

          {/* Q&A Review */}
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
                      <div style={{ color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>💡 {q.explanation}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button className="btn-primary" onClick={() => { setStarted(false); setSubmitted(false); setAnswers(Array(questions.length).fill(null)); setTimeLeft(TOTAL_TIME); setCurrent(0); setFlagged(new Set()); }} style={{ flex: 1, padding: '14px' }}>
              Retake Quiz
            </button>
            <button className="btn-secondary" onClick={() => router.push('/aptitude')} style={{ flex: 1, padding: '14px' }}>
              Back to Aptitude Hub
            </button>
          </div>
        </div>
      </main>
    </div>
  );

  // Quiz screen
  const q = questions[current];
  const timeWarning = timeLeft < 60;
  const timerPct = timeLeft / TOTAL_TIME;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '24px 28px' }}>
        {/* Auto-Submit Notification */}
        {showAutoSubmitNotification && (
          <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #f87171 0%, #e11d48 100%)', color: 'white', padding: '18px 28px', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 9999, maxWidth: 500, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.0rem', marginBottom: 4 }}>🚨 Window Changed - Quiz Auto-Submitted</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.95 }}>Your answers have been saved. Switching tabs triggered automatic submission.</div>
          </div>
        )}
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, padding: '14px 20px', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>{titles[section]}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Q {current + 1}/{questions.length}
            </div>
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
          {/* Question area */}
          <div className="card-no-hover" style={{ padding: 32 }}>
            {/* Question */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 28 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: 'white', flexShrink: 0 }}>
                {current + 1}
              </div>
              <p style={{ fontSize: '1.05rem', color: 'white', lineHeight: 1.7, fontWeight: 500 }}>{q.question}</p>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {q.options.map((opt, i) => {
                const selected = answers[current] === i;
                return (
                  <button key={i} onClick={() => setAnswers(a => { const n = [...a]; n[current] = i; return n; })} style={{
                    padding: '14px 20px', borderRadius: 12, border: `2px solid ${selected ? 'var(--accent-purple)' : 'var(--border)'}`,
                    background: selected ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                    text: 'left', cursor: 'pointer', transition: 'all 0.2s', width: '100%',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', border: `2px solid ${selected ? 'var(--accent-purple)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                      fontSize: '0.82rem', color: selected ? '#a78bfa' : 'var(--text-secondary)', flexShrink: 0,
                      background: selected ? 'rgba(124,58,237,0.2)' : 'transparent',
                    }}>
                      {['A','B','C','D'][i]}
                    </div>
                    <span style={{ fontSize: '0.95rem', color: selected ? 'white' : 'var(--text-secondary)', textAlign: 'left', lineHeight: 1.5 }}>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Nav buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn-ghost" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', opacity: current === 0 ? 0.4 : 1 }}>
                <ChevronLeft size={16} /> Previous
              </button>
              <button onClick={toggleFlag} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, cursor: 'pointer',
                background: flagged.has(current) ? 'rgba(245,158,11,0.2)' : 'transparent',
                border: `1px solid ${flagged.has(current) ? 'rgba(245,158,11,0.5)' : 'var(--border)'}`,
                color: flagged.has(current) ? '#fbbf24' : 'var(--text-secondary)',
                fontSize: '0.85rem', fontWeight: 500,
              }}>
                <Flag size={14} /> {flagged.has(current) ? 'Flagged' : 'Flag'}
              </button>
              <button className="btn-primary" onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))} disabled={current === questions.length - 1} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', opacity: current === questions.length - 1 ? 0.4 : 1 }}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Question grid navigator */}
          <div className="card-no-hover" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, color: 'white', fontSize: '0.85rem', marginBottom: 16 }}>Questions</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 20 }}>
              {questions.map((_, i) => {
                const ans = answers[i] !== null;
                const isCurr = i === current;
                const isFlag = flagged.has(i);
                return (
                  <button key={i} onClick={() => setCurrent(i)} style={{
                    aspectRatio: '1', borderRadius: 6, border: `2px solid ${isCurr ? 'var(--accent-purple)' : isFlag ? 'rgba(245,158,11,0.6)' : ans ? 'rgba(16,185,129,0.5)' : 'var(--border)'}`,
                    background: isCurr ? 'rgba(124,58,237,0.3)' : isFlag ? 'rgba(245,158,11,0.15)' : ans ? 'rgba(16,185,129,0.15)' : 'transparent',
                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                    color: isCurr ? '#a78bfa' : isFlag ? '#fbbf24' : ans ? '#34d399' : 'var(--text-secondary)',
                  }}>{i + 1}</button>
                );
              })}
            </div>
            <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
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
          </div>
        </div>
      </main>
    </div>
  );
}
