'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import { Calendar, Clock, User, Star, Briefcase, CheckCircle, ChevronRight, Search, Filter, Loader2, AlertCircle } from 'lucide-react';

const JOB_ROLES = ['Full Stack Developer', 'Backend Engineer', 'Data Scientist', 'ML Engineer', 'Frontend Developer', 'DevOps Engineer', 'Product Manager'];

// Domain-specific experts mapped to each role
const ROLE_EXPERTS: Record<string, typeof EXPERTS_ALL[number][]> = {
  'Full Stack Developer': [
    { id: 'fs1', name: 'Priya Mehta', company: 'Google', designation: 'Senior SWE', expertise: ['React', 'Node.js', 'System Design'], rating: 4.9, sessions: 142, avatar: 'PM', color: '#a78bfa', bio: '8+ years at Google. Ex-interviewer for 3 years. Built multiple full-stack products used by millions.' },
    { id: 'fs2', name: 'Rohit Jain', company: 'Flipkart', designation: 'Staff Engineer', expertise: ['Next.js', 'TypeScript', 'Microservices'], rating: 4.7, sessions: 89, avatar: 'RJ', color: '#22d3ee', bio: 'Staff Engineer at Flipkart. Full stack expert with 6+ years. Mentored 200+ students.' },
    { id: 'fs3', name: 'Ananya Das', company: 'Atlassian', designation: 'Tech Lead', expertise: ['MERN Stack', 'GraphQL', 'AWS'], rating: 4.8, sessions: 110, avatar: 'AD', color: '#34d399', bio: 'Tech Lead at Atlassian. Specializes in scalable full-stack architectures and cloud deployments.' },
  ],
  'Backend Engineer': [
    { id: 'be1', name: 'Arjun Kapoor', company: 'Amazon', designation: 'Principal Engineer', expertise: ['Distributed Systems', 'Java', 'AWS'], rating: 4.8, sessions: 98, avatar: 'AK', color: '#22d3ee', bio: 'Amazon L7. Expert in distributed systems and leadership principles. Bar-raiser interviewer.' },
    { id: 'be2', name: 'Karthik Rao', company: 'Uber', designation: 'Senior Backend Engineer', expertise: ['Go', 'Kafka', 'System Design'], rating: 4.6, sessions: 72, avatar: 'KR', color: '#f59e0b', bio: '5+ years at Uber. Specializes in high-throughput backend systems and real-time data pipelines.' },
    { id: 'be3', name: 'Neha Gupta', company: 'Razorpay', designation: 'Engineering Manager', expertise: ['Python', 'PostgreSQL', 'Docker'], rating: 4.7, sessions: 85, avatar: 'NG', color: '#a78bfa', bio: 'EM at Razorpay. Built payment infrastructure handling millions of transactions daily.' },
  ],
  'Data Scientist': [
    { id: 'ds1', name: 'Sneha Reddy', company: 'Microsoft', designation: 'Data Science Lead', expertise: ['Python', 'ML', 'Statistics'], rating: 4.7, sessions: 76, avatar: 'SR', color: '#34d399', bio: 'Azure AI team. Hired 50+ data scientists. Strong background in applied ML and statistics.' },
    { id: 'ds2', name: 'Aditya Sharma', company: 'Meta', designation: 'Staff Data Scientist', expertise: ['Deep Learning', 'NLP', 'A/B Testing'], rating: 4.9, sessions: 120, avatar: 'AS', color: '#a78bfa', bio: 'Staff DS at Meta. Led recommendation systems impacting 2B+ users. PhD in ML from Stanford.' },
    { id: 'ds3', name: 'Ritu Patel', company: 'Swiggy', designation: 'Senior Data Scientist', expertise: ['Demand Forecasting', 'SQL', 'Tableau'], rating: 4.5, sessions: 58, avatar: 'RP', color: '#f59e0b', bio: 'Senior DS at Swiggy. Expert in supply-demand optimization and business analytics.' },
  ],
  'ML Engineer': [
    { id: 'ml1', name: 'Vikram Iyer', company: 'NVIDIA', designation: 'ML Infrastructure Lead', expertise: ['PyTorch', 'CUDA', 'MLOps'], rating: 4.9, sessions: 95, avatar: 'VI', color: '#22d3ee', bio: 'ML Infra Lead at NVIDIA. Expert in training large-scale models and GPU optimization.' },
    { id: 'ml2', name: 'Deepa Nair', company: 'Google DeepMind', designation: 'Research Engineer', expertise: ['TensorFlow', 'Reinforcement Learning', 'Computer Vision'], rating: 4.8, sessions: 67, avatar: 'DN', color: '#34d399', bio: 'Research Engineer at DeepMind. Published 15+ papers in top-tier ML conferences.' },
    { id: 'ml3', name: 'Saurabh Verma', company: 'Amazon Science', designation: 'Applied ML Scientist', expertise: ['Feature Engineering', 'SageMaker', 'NLP'], rating: 4.6, sessions: 82, avatar: 'SV', color: '#f59e0b', bio: 'Applied Scientist at Amazon. Built production ML systems for Alexa and recommendation engines.' },
  ],
  'Frontend Developer': [
    { id: 'fe1', name: 'Kavya Krishnan', company: 'Airbnb', designation: 'Senior Frontend Engineer', expertise: ['React', 'CSS Architecture', 'Performance'], rating: 4.8, sessions: 104, avatar: 'KK', color: '#a78bfa', bio: 'Senior FE at Airbnb. Expert in design systems, accessibility, and web performance optimization.' },
    { id: 'fe2', name: 'Manish Tiwari', company: 'Razorpay', designation: 'Frontend Lead', expertise: ['Next.js', 'TypeScript', 'Testing'], rating: 4.7, sessions: 91, avatar: 'MT', color: '#22d3ee', bio: 'Frontend Lead at Razorpay. Built checkout SDK used by 8M+ merchants. TDD advocate.' },
    { id: 'fe3', name: 'Shruti Bose', company: 'Figma', designation: 'Staff Engineer', expertise: ['WebGL', 'Canvas', 'State Management'], rating: 4.9, sessions: 73, avatar: 'SB', color: '#34d399', bio: 'Staff Engineer at Figma. Expert in rendering engines and complex interactive web applications.' },
  ],
  'DevOps Engineer': [
    { id: 'do1', name: 'Rajesh Kumar', company: 'Netflix', designation: 'Senior SRE', expertise: ['Kubernetes', 'Terraform', 'CI/CD'], rating: 4.7, sessions: 88, avatar: 'RK', color: '#f59e0b', bio: 'Senior SRE at Netflix. Manages infrastructure serving 200M+ subscribers globally.' },
    { id: 'do2', name: 'Pooja Singh', company: 'AWS', designation: 'Cloud Solutions Architect', expertise: ['AWS', 'CloudFormation', 'Security'], rating: 4.8, sessions: 106, avatar: 'PS', color: '#a78bfa', bio: 'Solutions Architect at AWS. Helped 100+ enterprises migrate to cloud. AWS certified x5.' },
    { id: 'do3', name: 'Amit Desai', company: 'Zomato', designation: 'Platform Engineer', expertise: ['Docker', 'Prometheus', 'Linux'], rating: 4.5, sessions: 64, avatar: 'AD2', color: '#22d3ee', bio: 'Platform Engineer at Zomato. Built monitoring and deployment pipelines for 500+ microservices.' },
  ],
  'Product Manager': [
    { id: 'pm1', name: 'Vikram Singh', company: 'Flipkart', designation: 'Director of Product', expertise: ['Product Strategy', 'Analytics', 'UX'], rating: 4.6, sessions: 65, avatar: 'VS', color: '#f59e0b', bio: 'Director of Product at Flipkart. Led grocery vertical from 0 to $1B GMV. IIM-A graduate.' },
    { id: 'pm2', name: 'Megha Arora', company: 'Google', designation: 'Group PM', expertise: ['Data Products', 'Growth', 'Roadmapping'], rating: 4.9, sessions: 112, avatar: 'MA', color: '#a78bfa', bio: 'Group PM at Google. Led products used by 500M+ users. Expert in data-driven product decisions.' },
    { id: 'pm3', name: 'Nitin Bhatt', company: 'Cred', designation: 'Senior PM', expertise: ['Fintech', 'User Research', 'GTM Strategy'], rating: 4.7, sessions: 79, avatar: 'NB', color: '#34d399', bio: 'Senior PM at CRED. Built credit card rewards platform. Strong in 0-to-1 product building.' },
  ],
};

const EXPERTS_ALL = Object.values(ROLE_EXPERTS).flat();

const TIME_SLOTS = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM', '07:00 PM'];

// Always generate from today — never hardcode dates
const NEXT_3_DAYS = (() => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      date: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    });
  }
  return days;
})();

// Returns true if the given date+time slot is in the past
function isSlotExpired(date: string, time: string): boolean {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  if (date < today) return true;   // past date — all slots gone
  if (date > today) return false;  // future date — never expired
  // Same day: parse the time string (e.g. "09:00 AM")
  const [timePart, meridiem] = time.split(' ');
  const [h, m] = timePart.split(':').map(Number);
  let hour24 = h;
  if (meridiem === 'PM' && h !== 12) hour24 = h + 12;
  if (meridiem === 'AM' && h === 12) hour24 = 0;
  const slotTime = new Date();
  slotTime.setHours(hour24, m, 0, 0);
  return now >= slotTime;
}

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  // Get experts for the selected role
  const availableExperts = selectedRole ? (ROLE_EXPERTS[selectedRole] || []) : [];
  const expert = availableExperts.find(e => e.id === selectedExpert) || EXPERTS_ALL.find(e => e.id === selectedExpert);

  const handleBook = async () => {
    setIsSubmitting(true);

    // Save booking to DB via API
    const booking = {
      id: `booking-${Date.now()}`,
      studentId: user.id,
      studentName: user.name,
      studentEmail: user.email,
      college: user.college || 'N/A',
      role: selectedRole,
      expertId: selectedExpert,
      expertName: expert?.name || '',
      expertCompany: expert?.company || '',
      expertDesignation: expert?.designation || '',
      expertAvatar: expert?.avatar || '',
      expertColor: expert?.color || '#a78bfa',
      date: NEXT_3_DAYS.find(d => d.date === selectedDate)?.label || '',
      time: selectedTime,
      status: 'pending',
      skills: user.skills || [],
      aiScore: 79,
      weakAreas: ['System Design', 'Optimization'],
      aptitudeScores: { quantitative: 82, logical: 78, verbal: 65 },
    };

    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createBooking', booking }),
      });
      // Log activity
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'logActivity',
          entry: {
            userEmail: user.email,
            type: 'booking',
            title: `Mock Interview booked with ${expert?.name}`,
            detail: selectedRole,
            score: null,
            icon: 'calendar',
            color: '#34d399',
          },
        }),
      });
    } catch {}

    setIsSubmitting(false);
    setBooked(true);
  };

  if (booked) return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div className="card-no-hover" style={{ maxWidth: 520, width: '100%', padding: 48, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(245,158,11,0.2)', border: '2px solid rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Clock size={36} color="#f59e0b" />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', marginBottom: 8 }}>Booking Submitted! ⏳</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.7 }}>
            Your mock interview request with <strong style={{ color: 'white' }}>{expert?.name}</strong> from <strong style={{ color: '#a78bfa' }}>{expert?.company}</strong> has been sent.
          </p>
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '14px 20px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <div className="pulse-dot" style={{ background: '#f59e0b' }} />
              <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem' }}>Waiting for Expert Approval</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 8 }}>
              The expert will review and approve your booking. You&apos;ll receive a notification on your dashboard once confirmed.
            </p>
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 20, marginBottom: 28, textAlign: 'left' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 12, fontWeight: 700 }}>BOOKING DETAILS</div>
            {[
              { label: 'Status', val: '⏳ Pending Approval' },
              { label: 'Role', val: selectedRole },
              { label: 'Expert', val: `${expert?.name} (${expert?.designation})` },
              { label: 'Date', val: NEXT_3_DAYS.find(d => d.date === selectedDate)?.label },
              { label: 'Time', val: selectedTime },
              { label: 'Duration', val: '60 minutes' },
              { label: 'Mode', val: 'Video Call (link sent after approval)' },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ color: label === 'Status' ? '#f59e0b' : 'white', fontWeight: label === 'Status' ? 700 : 500 }}>{val}</span>
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
                  <button key={role} onClick={() => { setSelectedRole(role); setSelectedExpert(''); }} style={{
                    padding: '16px', borderRadius: 12, border: `2px solid ${selectedRole === role ? 'var(--accent-purple)' : 'var(--border)'}`,
                    background: selectedRole === role ? 'rgba(124,58,237,0.12)' : 'var(--bg-card)',
                    cursor: 'pointer', fontWeight: 600, color: selectedRole === role ? 'white' : 'var(--text-secondary)',
                    fontSize: '0.9rem', transition: 'all 0.2s',
                  }}>
                    {role}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {(ROLE_EXPERTS[role] || []).length} experts available
                    </div>
                  </button>
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
                {availableExperts.map((exp) => (
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
                        const expired = isSlotExpired(date, time);
                        const isAvailable = !expired && (i % 2 === 0 || i === 3);
                        const isSelected = selectedDate === date && selectedTime === time;
                        return (
                          <button
                            key={time}
                            onClick={() => { if (isAvailable) { setSelectedDate(date); setSelectedTime(time); } }}
                            disabled={!isAvailable}
                            title={expired ? 'This time slot has already passed' : !isAvailable ? 'Slot already booked' : ''}
                            style={{
                              padding: '10px', borderRadius: 8, fontSize: '0.82rem', transition: 'all 0.15s',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              border: `1px solid ${
                                isSelected ? 'var(--accent-purple)'
                                : expired ? 'rgba(239,68,68,0.2)'
                                : isAvailable ? 'var(--border)'
                                : 'transparent'
                              }`,
                              background: isSelected ? 'rgba(124,58,237,0.2)'
                                : expired ? 'rgba(239,68,68,0.05)'
                                : isAvailable ? 'transparent'
                                : 'rgba(255,255,255,0.02)',
                              color: isSelected ? '#a78bfa'
                                : expired ? '#6b7280'
                                : isAvailable ? 'var(--text-secondary)'
                                : 'var(--text-muted)',
                              cursor: isAvailable ? 'pointer' : 'not-allowed',
                              fontWeight: isSelected ? 700 : 500,
                              textDecoration: expired || !isAvailable ? 'line-through' : 'none',
                              opacity: expired ? 0.55 : 1,
                            }}
                          >
                            <span>{time}</span>
                            {expired && (
                              <span style={{ fontSize: '0.65rem', color: '#ef4444', background: 'rgba(239,68,68,0.12)', padding: '2px 6px', borderRadius: 4, fontWeight: 700, textDecoration: 'none' }}>EXPIRED</span>
                            )}
                            {!expired && !isAvailable && (
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Booked</span>
                            )}
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
                <button className="btn-primary" onClick={handleBook} disabled={isSubmitting} style={{ flex: 1, padding: '13px', opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {isSubmitting ? (
                    <>
                      <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                      Submitting Request...
                    </>
                  ) : (
                    '✓ Submit Booking Request'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
