'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import { Calendar, Clock, User, Star, Briefcase, CheckCircle, ChevronRight, Search, Filter } from 'lucide-react';

const JOB_ROLES = ['Full Stack Developer', 'Backend Engineer', 'Data Scientist', 'ML Engineer', 'Frontend Developer', 'DevOps Engineer', 'Product Manager'];

const EXPERTS = [
  {
    id: 'e1', name: 'Priya Mehta', company: 'Google', designation: 'Senior SWE',
    expertise: ['System Design', 'DSA', 'Full Stack'], rating: 4.9, sessions: 142,
    avatar: 'PM', color: '#a78bfa', bio: '8+ years at Google. Ex-interviewer for 3 years. Specializes in system design and DSA.'
  },
  {
    id: 'e2', name: 'Arjun Kapoor', company: 'Amazon', designation: 'Principal Engineer',
    expertise: ['Backend', 'Distributed Systems', 'Leadership'], rating: 4.8, sessions: 98,
    avatar: 'AK', color: '#22d3ee', bio: 'Amazon L7. Expert in distributed systems and leadership principles. Bar-raiser interviewer.'
  },
  {
    id: 'e3', name: 'Sneha Reddy', company: 'Microsoft', designation: 'Data Science Lead',
    expertise: ['Data Science', 'ML', 'Python'], rating: 4.7, sessions: 76,
    avatar: 'SR', color: '#34d399', bio: 'Azure AI team. Hired 50+ data scientists. Strong background in applied ML and statistics.'
  },
  {
    id: 'e4', name: 'Vikram Singh', company: 'Flipkart', designation: 'Engineering Manager',
    expertise: ['Engineering Management', 'System Design', 'Java'], rating: 4.6, sessions: 65,
    avatar: 'VS', color: '#f59e0b', bio: 'EM at Flipkart Scale. Conducts Behavioral + System Design interviews. Great mentor.'
  },
];

const TIME_SLOTS = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM', '07:00 PM'];

const NEXT_3_DAYS = (() => {
  const days = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(2026, 1, 26 + i); // Feb 27-29
    days.push({
      date: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    });
  }
  return days;
})();

type BookingStep = 1 | 2 | 3 | 4;

export default function BookInterviewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<BookingStep>(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedExpert, setSelectedExpert] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [booked, setBooked] = useState(false);

  if (!user) return null;

  const expert = EXPERTS.find(e => e.id === selectedExpert);

  const handleBook = async () => {
    await new Promise(r => setTimeout(r, 1000));
    setBooked(true);
  };

  if (booked) return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div className="card-no-hover" style={{ maxWidth: 520, width: '100%', padding: 48, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', border: '2px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={36} color="#34d399" />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', marginBottom: 8 }}>Interview Booked! 🎉</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.7 }}>
            Your mock interview with <strong style={{ color: 'white' }}>{expert?.name}</strong> from <strong style={{ color: '#a78bfa' }}>{expert?.company}</strong> is confirmed for{' '}
            <strong style={{ color: 'white' }}>{NEXT_3_DAYS.find(d => d.date === selectedDate)?.label}</strong> at <strong style={{ color: 'white' }}>{selectedTime}</strong>.
          </p>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 20, marginBottom: 28, textAlign: 'left' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 12, fontWeight: 700 }}>BOOKING DETAILS</div>
            {[
              { label: 'Role', val: selectedRole },
              { label: 'Expert', val: `${expert?.name} (${expert?.designation})` },
              { label: 'Date', val: NEXT_3_DAYS.find(d => d.date === selectedDate)?.label },
              { label: 'Time', val: selectedTime },
              { label: 'Duration', val: '60 minutes' },
              { label: 'Mode', val: 'Video Call (link sent to email)' },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ color: 'white', fontWeight: 500 }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" onClick={() => router.push('/dashboard')} style={{ flex: 1, padding: '12px' }}>Go to Dashboard</button>
            <button className="btn-secondary" onClick={() => { setBooked(false); setStep(1); setSelectedRole(''); setSelectedExpert(''); setSelectedDate(''); setSelectedTime(''); }} style={{ flex: 1, padding: '12px' }}>Book Another</button>
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '32px 36px' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: 6 }}>Book Expert Mock Interview</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Connect with verified industry professionals for personalized mock interviews</p>
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 32, background: 'var(--bg-card)', borderRadius: 14, padding: '16px 24px', border: '1px solid var(--border)' }}>
            {[
              { n: 1, label: 'Select Role' },
              { n: 2, label: 'Choose Expert' },
              { n: 3, label: 'Pick Schedule' },
              { n: 4, label: 'Confirm' },
            ].map(({ n, label }, i, arr) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.85rem',
                    background: n < step ? '#34d399' : n === step ? 'var(--gradient-primary)' : 'var(--border)',
                    color: n <= step ? 'white' : 'var(--text-muted)',
                  }}>
                    {n < step ? '✓' : n}
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: n === step ? 'white' : n < step ? '#34d399' : 'var(--text-muted)' }}>{label}</span>
                </div>
                {i < arr.length - 1 && <div style={{ flex: 1, height: 1, background: n < step ? '#34d399' : 'var(--border)', margin: '0 12px' }} />}
              </div>
            ))}
          </div>

          {/* Step 1: Role */}
          {step === 1 && (
            <div>
              <h2 style={{ fontWeight: 700, color: 'white', marginBottom: 20, fontSize: '1.05rem' }}>What role are you preparing for?</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                {JOB_ROLES.map(role => (
                  <button key={role} onClick={() => setSelectedRole(role)} style={{
                    padding: '16px', borderRadius: 12, border: `2px solid ${selectedRole === role ? 'var(--accent-purple)' : 'var(--border)'}`,
                    background: selectedRole === role ? 'rgba(124,58,237,0.12)' : 'var(--bg-card)',
                    cursor: 'pointer', fontWeight: 600, color: selectedRole === role ? 'white' : 'var(--text-secondary)',
                    fontSize: '0.9rem', transition: 'all 0.2s',
                  }}>{role}</button>
                ))}
              </div>
              <button className="btn-primary" onClick={() => setStep(2)} disabled={!selectedRole} style={{ padding: '13px 36px', opacity: !selectedRole ? 0.5 : 1 }}>
                Continue <ChevronRight size={16} style={{ display: 'inline', marginLeft: 4 }} />
              </button>
            </div>
          )}

          {/* Step 2: Expert */}
          {step === 2 && (
            <div>
              <h2 style={{ fontWeight: 700, color: 'white', marginBottom: 20, fontSize: '1.05rem' }}>Available experts for <span style={{ color: '#a78bfa' }}>{selectedRole}</span></h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                {EXPERTS.map((exp) => (
                  <button key={exp.id} onClick={() => setSelectedExpert(exp.id)} style={{
                    padding: '20px', borderRadius: 14, border: `2px solid ${selectedExpert === exp.id ? exp.color : 'var(--border)'}`,
                    background: selectedExpert === exp.id ? `rgba(124,58,237,0.08)` : 'var(--bg-card)',
                    cursor: 'pointer', display: 'flex', gap: 20, alignItems: 'center', transition: 'all 0.2s', textAlign: 'left', width: '100%',
                  }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${exp.color}25`, border: `2px solid ${exp.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', color: exp.color, flexShrink: 0 }}>
                      {exp.avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>{exp.name}</span>
                        <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>{exp.designation}</span>
                        <span style={{ fontSize: '0.78rem', color: '#a78bfa', fontWeight: 600 }}>{exp.company}</span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>{exp.bio}</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {exp.expertise.map(t => <span key={t} className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{t}</span>)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fbbf24', fontSize: '0.9rem', fontWeight: 700, justifyContent: 'flex-end', marginBottom: 4 }}>
                        <Star size={14} style={{ fill: '#fbbf24' }} /> {exp.rating}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{exp.sessions} sessions</div>
                      <div style={{ marginTop: 8 }}>
                        <div className="pulse-dot" style={{ marginLeft: 'auto' }} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" onClick={() => setStep(1)} style={{ padding: '13px 24px' }}>← Back</button>
                <button className="btn-primary" onClick={() => setStep(3)} disabled={!selectedExpert} style={{ padding: '13px 36px', opacity: !selectedExpert ? 0.5 : 1 }}>
                  Choose Schedule <ChevronRight size={16} style={{ display: 'inline', marginLeft: 4 }} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Schedule */}
          {step === 3 && (
            <div>
              <h2 style={{ fontWeight: 700, color: 'white', marginBottom: 8, fontSize: '1.05rem' }}>
                Select date & time with <span style={{ color: '#a78bfa' }}>{expert?.name}</span>
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 24 }}>Showing next 3 days of availability</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
                {NEXT_3_DAYS.map(({ date, label }) => (
                  <div key={date} style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'white', fontSize: '0.88rem' }}>{label}</div>
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {TIME_SLOTS.map((time, i) => {
                        const isAvailable = i % 2 === 0 || i === 3; // mock availability
                        const isSelected = selectedDate === date && selectedTime === time;
                        return (
                          <button key={time} onClick={() => { if (isAvailable) { setSelectedDate(date); setSelectedTime(time); } }} disabled={!isAvailable} style={{
                            padding: '10px', borderRadius: 8, border: `1px solid ${isSelected ? 'var(--accent-purple)' : isAvailable ? 'var(--border)' : 'transparent'}`,
                            background: isSelected ? 'rgba(124,58,237,0.2)' : isAvailable ? 'transparent' : 'rgba(255,255,255,0.02)',
                            color: isSelected ? '#a78bfa' : isAvailable ? 'var(--text-secondary)' : 'var(--text-muted)',
                            cursor: isAvailable ? 'pointer' : 'not-allowed', fontSize: '0.82rem', fontWeight: isSelected ? 700 : 500,
                            textDecoration: !isAvailable ? 'line-through' : 'none', transition: 'all 0.15s',
                          }}>
                            {time} {!isAvailable && '(Booked)'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" onClick={() => setStep(2)} style={{ padding: '13px 24px' }}>← Back</button>
                <button className="btn-primary" onClick={() => setStep(4)} disabled={!selectedDate || !selectedTime} style={{ padding: '13px 36px', opacity: !selectedDate || !selectedTime ? 0.5 : 1 }}>
                  Review Booking <ChevronRight size={16} style={{ display: 'inline', marginLeft: 4 }} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && expert && (
            <div style={{ maxWidth: 600 }}>
              <h2 style={{ fontWeight: 700, color: 'white', marginBottom: 24, fontSize: '1.05rem' }}>Confirm your booking</h2>
              <div className="card-no-hover" style={{ padding: 28, marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${expert.color}25`, border: `2px solid ${expert.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: expert.color, flexShrink: 0 }}>
                    {expert.avatar}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>{expert.name}</div>
                    <div style={{ fontSize: '0.82rem', color: '#a78bfa' }}>{expert.designation} @ {expert.company}</div>
                  </div>
                </div>
                {[
                  { label: 'Job Role', val: selectedRole, icon: '🎯' },
                  { label: 'Date', val: NEXT_3_DAYS.find(d => d.date === selectedDate)?.label, icon: '📅' },
                  { label: 'Time', val: selectedTime, icon: '🕐' },
                  { label: 'Duration', val: '60 minutes', icon: '⏱' },
                  { label: 'Mode', val: 'Video Call', icon: '📹' },
                ].map(({ label, val, icon }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{icon} {label}</span>
                    <span style={{ color: 'white', fontWeight: 600, fontSize: '0.88rem' }}>{val}</span>
                  </div>
                ))}
                <div style={{ marginTop: 20, padding: '14px', borderRadius: 10, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}>
                  <div style={{ fontSize: '0.82rem', color: '#a78bfa', fontWeight: 600, marginBottom: 6 }}>ℹ️ What the expert will see:</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Your full profile, resume skills, aptitude scores (section-wise), AI interview history, and weak areas will be shared with the expert to prepare a personalized session.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" onClick={() => setStep(3)} style={{ padding: '13px 24px' }}>← Back</button>
                <button className="btn-primary" onClick={handleBook} style={{ flex: 1, padding: '13px' }}>
                  ✓ Confirm Booking
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
