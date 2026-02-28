'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import { Calendar, Users, Star, CheckCircle, TrendingUp, MessageSquare, XCircle, Video } from 'lucide-react';

interface Booking {
  id: string;
  studentName: string;
  studentEmail: string;
  college: string;
  role: string;
  expertId: string;
  expertName: string;
  expertCompany: string;
  expertDesignation: string;
  expertAvatar: string;
  expertColor: string;
  date: string;
  time: string;
  status: 'pending' | 'approved' | 'rejected' | 'confirmed';
  meetingLink?: string;
  meetingRoom?: string;
  createdAt: string;
  skills: string[];
  aiScore: number;
  weakAreas: string[];
  aptitudeScores: { quantitative: number; logical: number; verbal: number };
}

// Hardcoded bookings that are already confirmed (legacy data)
const LEGACY_BOOKINGS: Booking[] = [];

type ActiveView = 'dashboard' | 'student';

export default function ExpertDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [ratings, setRatings] = useState<Record<string, { rating: number; feedback: string }>>({});
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [pastSessions, setPastSessions] = useState<{ studentName: string; role: string; date: string; rating: number; feedback: string }[]>([]);
  const [expertStats, setExpertStats] = useState({ totalSessions: 0, thisMonth: 0, avgRating: 0, positivePct: 0 });
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('all');

  // Load bookings from DB API
  useEffect(() => {
    if (!user || user.role !== 'expert') return;
    const expertIdKey = user.id.replace('expert-', '');
    const expertName = user.name || '';
    const expertCompany = user.company || '';

    // Seed demo bookings the FIRST time an expert logs in (so bookings section is never empty)
    const seedDemoBookings = () => {
      try {
        const all: any[] = JSON.parse(localStorage.getItem('placeai_bookings') || '[]');
        const hasOwn = all.some(b => b.expertId === expertIdKey);
        if (hasOwn) return; // already has bookings — don't seed again

        const today = new Date();
        const fmtDate = (offset: number) => {
          const d = new Date(today);
          d.setDate(today.getDate() + offset);
          return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        };

        const initials = (name: string) => name.split(' ').map(n => n[0]).join('');

        const seeds: any[] = [
          {
            id: `demo-${expertIdKey}-1`,
            studentId: 'student-demo', studentName: 'Rahul Sharma',
            studentEmail: 'student@demo.com', college: 'IIT Bombay',
            role: 'Full Stack Developer', expertId: expertIdKey,
            expertName, expertCompany, expertDesignation: '',
            expertAvatar: initials(expertName), expertColor: '#a78bfa',
            date: fmtDate(1), time: '11:00 AM', status: 'pending',
            skills: ['React', 'Node.js', 'MongoDB', 'TypeScript'],
            aiScore: 74, weakAreas: ['System Design', 'Optimization'],
            aptitudeScores: { quantitative: 80, logical: 72, verbal: 68 },
            createdAt: new Date().toISOString(),
          },
          {
            id: `demo-${expertIdKey}-2`,
            studentId: 'student-demo2', studentName: 'Priya Kumari',
            studentEmail: 'priya.k@demo.com', college: 'NIT Trichy',
            role: 'Backend Engineer', expertId: expertIdKey,
            expertName, expertCompany, expertDesignation: '',
            expertAvatar: initials(expertName), expertColor: '#22d3ee',
            date: fmtDate(2), time: '01:00 PM', status: 'pending',
            skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker'],
            aiScore: 82, weakAreas: ['Distributed Systems'],
            aptitudeScores: { quantitative: 85, logical: 78, verbal: 71 },
            createdAt: new Date().toISOString(),
          },
          {
            id: `demo-${expertIdKey}-3`,
            studentId: 'student-demo3', studentName: 'Aman Singh',
            studentEmail: 'aman.s@demo.com', college: 'BITS Pilani',
            role: 'Data Scientist', expertId: expertIdKey,
            expertName, expertCompany, expertDesignation: '',
            expertAvatar: initials(expertName), expertColor: '#34d399',
            date: fmtDate(0), time: '03:00 PM', status: 'approved',
            meetingLink: `https://meet.jit.si/PlaceAI-Demo-${expertIdKey}`,
            meetingRoom: `PlaceAI-Demo-${expertIdKey}`,
            skills: ['Python', 'Pandas', 'Scikit-learn', 'SQL'],
            aiScore: 88, weakAreas: ['Feature Engineering'],
            aptitudeScores: { quantitative: 90, logical: 85, verbal: 78 },
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ];

        all.push(...seeds);
        localStorage.setItem('placeai_bookings', JSON.stringify(all));
      } catch {}
    };

    seedDemoBookings();

    const loadBookings = async () => {
      // 1. Always load from localStorage (works when Supabase is paused)
      let localBookings: Booking[] = [];
      try {
        const stored: any[] = JSON.parse(localStorage.getItem('placeai_bookings') || '[]');
        localBookings = stored
          .filter(b => b.expertId === expertIdKey)
          .map(b => ({
            id: b.id, studentName: b.studentName, studentEmail: b.studentEmail,
            college: b.college, role: b.role, expertId: b.expertId,
            expertName: b.expertName, expertCompany: b.expertCompany,
            expertDesignation: b.expertDesignation, expertAvatar: b.expertAvatar,
            expertColor: b.expertColor, date: b.date, time: b.time,
            status: b.status, meetingLink: b.meetingLink, meetingRoom: b.meetingRoom,
            createdAt: b.createdAt || '', skills: b.skills || [],
            aiScore: b.aiScore || 0, weakAreas: b.weakAreas || [],
            aptitudeScores: b.aptitudeScores || { quantitative: 0, logical: 0, verbal: 0 },
          }));
      } catch {}

      // 2. Try DB and merge (DB result overwrites same ID from localStorage)
      try {
        const res = await fetch(`/api/db?action=getBookingsByExpert&expertId=${encodeURIComponent(expertIdKey)}`);
        if (res.ok) {
          const dbBookings: Booking[] = await res.json();
          const merged = [...localBookings];
          for (const db of dbBookings) {
            const idx = merged.findIndex(b => b.id === db.id);
            if (idx >= 0) merged[idx] = db; else merged.push(db);
          }
          setAllBookings(merged);
          return;
        }
      } catch {}

      // 3. Supabase unavailable — use localStorage only
      setAllBookings(localBookings);
    };
    const loadFeedback = async () => {
      try {
        const expertIdRaw = user.id.replace('expert-', '');
        const [fbRes, statsRes] = await Promise.all([
          fetch(`/api/db?action=getFeedbackByExpert&expertId=${encodeURIComponent(user.id)}`),
          fetch(`/api/db?action=getExpertStats&expertId=${encodeURIComponent(user.id)}`),
        ]);
        if (fbRes.ok) {
          const fb = await fbRes.json();
          setPastSessions(fb.map((f: any) => ({
            studentName: f.student_name, role: f.role,
            date: new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            rating: f.rating, feedback: f.feedback,
          })));
        }
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setExpertStats({
            totalSessions: stats.total_feedback || 0,
            thisMonth: stats.total_feedback || 0,
            avgRating: stats.avg_rating || 0,
            positivePct: Math.round(stats.positive_pct || 0),
          });
        }
      } catch {}
    };
    // Load both in parallel on mount
    Promise.all([loadBookings(), loadFeedback()]);
    // Poll for new bookings every 15 seconds (reduces Supabase load)
    const interval = setInterval(loadBookings, 15000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user || user.role !== 'expert') {
    return null;
  }

  const pendingBookings = allBookings.filter(b => b.status === 'pending');
  const confirmedBookings = allBookings.filter(b => b.status === 'confirmed' || b.status === 'approved');
  const rejectedBookings = allBookings.filter(b => b.status === 'rejected');

  const filteredBookings = bookingFilter === 'all' ? allBookings
    : bookingFilter === 'pending' ? pendingBookings
    : bookingFilter === 'confirmed' ? confirmedBookings
    : rejectedBookings;

  const selectedBooking = allBookings.find(b => b.id === selectedStudentId);

  const generateMeetingRoom = (bookingId: string) => {
    const sanitized = bookingId.replace(/[^a-zA-Z0-9]/g, '');
    const timestamp = Date.now().toString(36);
    return `PlaceAI-Interview-${sanitized}-${timestamp}`;
  };

  const buildMeetingUrl = (booking: Booking, roomName: string) => {
    const params = new URLSearchParams({
      room: roomName,
      bookingId: booking.id,
      expertName: booking.expertName,
      expertCompany: booking.expertCompany,
      studentName: booking.studentName,
      role: booking.role,
      date: booking.date,
      time: booking.time,
    });
    return `/interview/room?${params.toString()}`;
  };

  const handleApprove = async (bookingId: string) => {
    const meetingRoom = generateMeetingRoom(bookingId);
    const meetingLink = `https://meet.jit.si/${meetingRoom}`;
    const booking = allBookings.find(b => b.id === bookingId);

    // Update localStorage immediately (works without DB)
    try {
      const stored: any[] = JSON.parse(localStorage.getItem('placeai_bookings') || '[]');
      localStorage.setItem('placeai_bookings', JSON.stringify(
        stored.map(b => b.id === bookingId ? { ...b, status: 'approved', meetingLink, meetingRoom } : b)
      ));
      if (booking) {
        const notifs: any[] = JSON.parse(localStorage.getItem('placeai_notifications') || '[]');
        notifs.push({
          id: `notif-${Date.now()}`, type: 'approved',
          studentEmail: booking.studentEmail,
          expertName: booking.expertName, expertCompany: booking.expertCompany,
          role: booking.role, date: booking.date, time: booking.time,
          meetingLink, meetingRoom,
          message: `Your interview with ${booking.expertName} (${booking.expertCompany}) for ${booking.role} on ${booking.date} at ${booking.time} has been APPROVED! ✅ Click Join to start your video interview.`,
          read: false, createdAt: new Date().toISOString(),
        });
        localStorage.setItem('placeai_notifications', JSON.stringify(notifs));
      }
    } catch {}

    // Also try Supabase
    try {
      await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateBookingStatus', bookingId, status: 'approved', meetingRoom, meetingLink }),
      });
      if (booking) {
        await fetch('/api/db', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'createNotification',
            notification: {
              id: `notif-db-${Date.now()}`, type: 'approved',
              studentEmail: booking.studentEmail,
              expertName: booking.expertName, expertCompany: booking.expertCompany,
              role: booking.role, date: booking.date, time: booking.time,
              meetingLink, meetingRoom,
              message: `Your interview with ${booking.expertName} (${booking.expertCompany}) for ${booking.role} on ${booking.date} at ${booking.time} has been APPROVED! ✅`,
            },
          }),
        });
      }
    } catch {}

    setAllBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'approved', meetingLink, meetingRoom } : b));
  };

  const handleReject = async (bookingId: string) => {
    const booking = allBookings.find(b => b.id === bookingId);

    // Update localStorage immediately
    try {
      const stored: any[] = JSON.parse(localStorage.getItem('placeai_bookings') || '[]');
      localStorage.setItem('placeai_bookings', JSON.stringify(
        stored.map(b => b.id === bookingId ? { ...b, status: 'rejected' } : b)
      ));
      if (booking) {
        const notifs: any[] = JSON.parse(localStorage.getItem('placeai_notifications') || '[]');
        notifs.push({
          id: `notif-${Date.now()}`, type: 'rejected',
          studentEmail: booking.studentEmail,
          expertName: booking.expertName, expertCompany: booking.expertCompany,
          role: booking.role, date: booking.date, time: booking.time,
          message: `Your interview with ${booking.expertName} (${booking.expertCompany}) for ${booking.role} on ${booking.date} at ${booking.time} was not approved. Please try another slot.`,
          read: false, createdAt: new Date().toISOString(),
        });
        localStorage.setItem('placeai_notifications', JSON.stringify(notifs));
      }
    } catch {}

    // Also try Supabase
    try {
      await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateBookingStatus', bookingId, status: 'rejected' }),
      });
      if (booking) {
        await fetch('/api/db', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'createNotification',
            notification: {
              id: `notif-db-${Date.now()}`, type: 'rejected',
              studentEmail: booking.studentEmail,
              expertName: booking.expertName, expertCompany: booking.expertCompany,
              role: booking.role, date: booking.date, time: booking.time,
              message: `Your interview with ${booking.expertName} (${booking.expertCompany}) for ${booking.role} on ${booking.date} at ${booking.time} was not approved. Please try another slot.`,
            },
          }),
        });
      }
    } catch {}

    setAllBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'rejected' } : b));
  };

  const submitFeedback = async (bookingId: string) => {
    const r = ratings[bookingId] || { rating: 0, feedback: '' };
    const booking = allBookings.find(b => b.id === bookingId);
    try {
      await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveFeedback',
          feedback: {
            bookingId,
            expertId: user?.id || '',
            studentId: booking?.studentEmail || '',
            studentName: booking?.studentName || '',
            role: booking?.role || '',
            rating: r.rating,
            feedback: r.feedback,
          },
        }),
      });
    } catch {}
    setSubmitted(s => new Set([...s, bookingId]));
  };

  if (activeView === 'student' && selectedBooking) {
    const r = ratings[selectedBooking.id] || { rating: 0, feedback: '' };
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main className="main-content" style={{ padding: '32px 36px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <button onClick={() => setActiveView('dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, fontSize: '0.88rem' }}>
              ← Back to Dashboard
            </button>

            <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'white', marginBottom: 28 }}>
              Student Profile — <span style={{ color: '#a78bfa' }}>{selectedBooking.studentName}</span>
            </h1>

            {/* Student info */}
            <div className="card-no-hover" style={{ padding: 28, marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 24 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', color: 'white', flexShrink: 0 }}>
                  {selectedBooking.studentName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'white', fontSize: '1.1rem' }}>{selectedBooking.studentName}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{selectedBooking.college}</div>
                  <div style={{ color: '#a78bfa', fontSize: '0.82rem', fontWeight: 600, marginTop: 2 }}>Target: {selectedBooking.role}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <div style={{ textAlign: 'right', marginBottom: 4 }}>
                    <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>AI Score: {selectedBooking.aiScore}%</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selectedBooking.date} • {selectedBooking.time}</div>
                </div>
              </div>

              {/* Skills */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>TECHNICAL SKILLS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedBooking.skills.map(s => <span key={s} className="badge badge-purple" style={{ fontSize: '0.78rem' }}>{s}</span>)}
                </div>
              </div>

              {/* Aptitude breakdown */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 14 }}>APTITUDE PERFORMANCE</div>
                {[
                  { label: 'Quantitative', score: selectedBooking.aptitudeScores.quantitative, color: '#a78bfa' },
                  { label: 'Logical Reasoning', score: selectedBooking.aptitudeScores.logical, color: '#22d3ee' },
                  { label: 'Verbal Ability', score: selectedBooking.aptitudeScores.verbal, color: '#f59e0b' },
                ].map(({ label, score, color }) => (
                  <div key={label} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                      <span style={{ color: 'white' }}>{label}</span>
                      <span style={{ fontWeight: 700, color }}>{score}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${score}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Weak areas */}
              <div style={{ marginTop: 20, padding: '14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f87171', marginBottom: 6 }}>⚠️ WEAK AREAS TO FOCUS ON IN THIS INTERVIEW</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {selectedBooking.weakAreas.map(a => <span key={a} className="badge badge-red" style={{ fontSize: '0.75rem' }}>{a}</span>)}
                </div>
              </div>
            </div>

            {/* Feedback form */}
            {submitted.has(selectedBooking.id) ? (
              <div style={{ textAlign: 'center', padding: '36px', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 14, background: 'rgba(16,185,129,0.08)' }}>
                <CheckCircle size={40} color="#34d399" style={{ margin: '0 auto 16px' }} />
                <div style={{ fontWeight: 700, color: 'white', fontSize: '1.1rem', marginBottom: 6 }}>Feedback Submitted!</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>The student can now view your rating and feedback in their dashboard.</div>
              </div>
            ) : (
              <div className="card-no-hover" style={{ padding: 28 }}>
                <h2 style={{ fontWeight: 700, color: 'white', marginBottom: 20, fontSize: '1rem' }}>Post-Interview Feedback</h2>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 10 }}>Rating</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setRatings(prev => ({ ...prev, [selectedBooking.id]: { ...r, rating: n } }))} style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                      }}>
                        <Star size={32} style={{ fill: n <= r.rating ? '#fbbf24' : 'transparent' }} color="#fbbf24" />
                      </button>
                    ))}
                    <span style={{ alignSelf: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem', marginLeft: 8 }}>
                      {r.rating > 0 ? ['', 'Poor', 'Needs Work', 'Average', 'Good', 'Excellent'][r.rating] : 'Select rating'}
                    </span>
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 8 }}>Detailed Feedback</label>
                  <textarea className="input-field" rows={5} placeholder="Provide detailed feedback on the student's performance, strengths, areas to improve, and any specific recommendations..." value={r.feedback} onChange={e => setRatings(prev => ({ ...prev, [selectedBooking.id]: { ...r, feedback: e.target.value } }))} style={{ resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
                </div>
                <button className="btn-primary" onClick={() => submitFeedback(selectedBooking.id)} disabled={r.rating === 0 || !r.feedback.trim()} style={{ width: '100%', padding: '13px', opacity: r.rating === 0 || !r.feedback.trim() ? 0.5 : 1 }}>
                  Submit Feedback
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '32px 36px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: 6 }}>
            Expert Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user.name}. You have {confirmedBookings.length} confirmed, {pendingBookings.length} pending, and {rejectedBookings.length} rejected session{allBookings.length !== 1 ? 's' : ''}.</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginBottom: 32 }}>
          {[
            { label: 'Total Sessions', value: String(expertStats.totalSessions + confirmedBookings.length), icon: Users, color: '#a78bfa', bg: 'rgba(124,58,237,0.1)' },
            { label: 'This Month', value: String(expertStats.thisMonth + confirmedBookings.length), icon: Calendar, color: '#22d3ee', bg: 'rgba(6,182,212,0.1)' },
            { label: 'Avg Rating', value: expertStats.avgRating > 0 ? String(expertStats.avgRating) : '—', icon: Star, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
            { label: 'Positive Reviews', value: expertStats.positivePct > 0 ? `${expertStats.positivePct}%` : '—', icon: TrendingUp, color: '#34d399', bg: 'rgba(16,185,129,0.1)' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="stat-box">
              <div className="stat-box-icon" style={{ background: bg, border: `1px solid ${color}30` }}>
                <Icon size={20} color={color} />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          {/* Bookings panel with filter tabs */}
          <div>
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--bg-card)', borderRadius: 12, padding: '6px', border: '1px solid var(--border)' }}>
              {(
                [['all', `All (${allBookings.length})`, 'white'],
                 ['pending', `Pending (${pendingBookings.length})`, '#f59e0b'],
                 ['confirmed', `Confirmed (${confirmedBookings.length})`, '#34d399'],
                 ['rejected', `Rejected (${rejectedBookings.length})`, '#f87171']] as [string, string, string][]
              ).map(([key, label, color]) => (
                <button key={key} onClick={() => setBookingFilter(key as any)} style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                  background: bookingFilter === key ? 'rgba(124,58,237,0.25)' : 'transparent',
                  color: bookingFilter === key ? color : 'var(--text-muted)',
                  fontWeight: bookingFilter === key ? 700 : 500,
                  fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s',
                  outline: bookingFilter === key ? '1px solid rgba(124,58,237,0.5)' : 'none',
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Booking cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filteredBookings.length === 0 ? (
                <div className="card-no-hover" style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 12 }}>📭</div>
                  <div style={{ fontWeight: 600, color: 'white', marginBottom: 6 }}>No bookings found</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Students haven&apos;t booked any sessions yet, or try a different filter.</div>
                </div>
              ) : filteredBookings.map(booking => {
                const isPending = booking.status === 'pending';
                const isConfirmed = booking.status === 'confirmed' || booking.status === 'approved';
                const isRejected = booking.status === 'rejected';
                const borderColor = isPending ? 'rgba(245,158,11,0.3)'
                  : isConfirmed ? 'rgba(16,185,129,0.3)'
                  : 'rgba(239,68,68,0.2)';
                const bgColor = isPending ? 'rgba(245,158,11,0.04)'
                  : isConfirmed ? 'rgba(16,185,129,0.04)'
                  : 'rgba(239,68,68,0.04)';
                return (
                  <div key={booking.id} style={{ padding: '20px', borderRadius: 14, border: `1px solid ${borderColor}`, background: bgColor }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem', color: 'white', flexShrink: 0 }}>
                          {booking.studentName.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'white', fontSize: '0.98rem' }}>{booking.studentName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>{booking.college}</div>
                        </div>
                      </div>
                      <div>
                        {isPending && <span className="badge" style={{ fontSize: '0.72rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>⏳ Pending</span>}
                        {isConfirmed && <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>✓ {booking.status === 'approved' ? 'Approved' : 'Confirmed'}</span>}
                        {isRejected && <span className="badge" style={{ fontSize: '0.72rem', background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>✗ Rejected</span>}
                      </div>
                    </div>

                    {/* Meta */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: '0.82rem', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>🎯 {booking.role}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>📅 {booking.date}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>🕐 {booking.time}</span>
                      <span style={{ color: '#a78bfa', fontSize: '0.78rem', fontWeight: 600 }}>AI Score: {booking.aiScore}%</span>
                    </div>

                    {/* Skills */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                      {booking.skills.slice(0, 4).map((s: string) => <span key={s} className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{s}</span>)}
                      {booking.skills.length > 4 && <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>+{booking.skills.length - 4}</span>}
                      {booking.weakAreas[0] && <span style={{ marginLeft: 4, color: '#f87171', fontSize: '0.74rem', alignSelf: 'center' }}>⚠ {booking.weakAreas[0]}</span>}
                    </div>

                    {/* Action buttons */}
                    {!isRejected && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {isPending && (
                          <>
                            <button onClick={() => handleApprove(booking.id)} style={{
                              flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.4)',
                              background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 700, fontSize: '0.85rem',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}>
                              <CheckCircle size={16} /> Approve
                            </button>
                            <button onClick={() => handleReject(booking.id)} style={{
                              flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)',
                              background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 700, fontSize: '0.85rem',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}>
                              <XCircle size={16} /> Reject
                            </button>
                          </>
                        )}
                        {isConfirmed && booking.meetingRoom && (
                          <button onClick={() => router.push(buildMeetingUrl(booking, booking.meetingRoom!))} style={{
                            flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.4)',
                            background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 700, fontSize: '0.85rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}>
                            <Video size={16} /> Join Interview
                          </button>
                        )}
                        <button onClick={() => { setSelectedStudentId(booking.id); setActiveView('student'); }} style={{
                          flex: isConfirmed ? 1 : 'unset' as any,
                          padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.82rem',
                          cursor: 'pointer', whiteSpace: 'nowrap',
                        }}>
                          View Profile →
                        </button>
                      </div>
                    )}
                    {isRejected && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleApprove(booking.id)} style={{
                          padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.4)',
                          background: 'rgba(16,185,129,0.1)', color: '#34d399', fontWeight: 600, fontSize: '0.82rem',
                          cursor: 'pointer',
                        }}>
                          Re-approve
                        </button>
                        <button onClick={() => { setSelectedStudentId(booking.id); setActiveView('student'); }} style={{
                          padding: '9px 18px', borderRadius: 10, border: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.82rem',
                          cursor: 'pointer',
                        }}>
                          View Profile
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Past sessions */}
          <div>
            <div className="card-no-hover" style={{ padding: 24 }}>
              <h2 style={{ fontWeight: 700, color: 'white', marginBottom: 18, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={16} color="var(--accent-green)" /> Recent Feedback Given
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {pastSessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No feedback given yet.</div>
                ) : pastSessions.map((s, i) => (
                  <div key={i} style={{ padding: '14px', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: 'white', fontSize: '0.85rem' }}>{s.studentName}</span>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {Array.from({ length: s.rating }).map((_, j) => (
                          <Star key={j} size={12} style={{ fill: '#fbbf24', color: '#fbbf24' }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 6 }}>{s.role} • {s.date}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{s.feedback}"</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
