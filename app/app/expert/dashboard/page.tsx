'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import { Calendar, Users, Star, Clock, CheckCircle, Book, TrendingUp, MessageSquare, User, ChevronRight, XCircle, AlertCircle, Video } from 'lucide-react';

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

  // Load bookings from DB API
  useEffect(() => {
    if (!user || user.role !== 'expert') return;
    const loadBookings = async () => {
      try {
        const expertIdRaw = user.id.replace('expert-', '');
        const res = await fetch(`/api/db?action=getBookingsByExpert&expertId=${encodeURIComponent(expertIdRaw)}`);
        if (res.ok) {
          const data = await res.json();
          setAllBookings(data);
        }
      } catch {}
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
  const UPCOMING_BOOKINGS = [...confirmedBookings, ...pendingBookings];

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
    // Generate a unique meeting room for this interview
    const meetingRoom = generateMeetingRoom(bookingId);
    const meetingLink = `https://meet.jit.si/${meetingRoom}`;

    try {
      await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateBookingStatus', bookingId, status: 'approved', meetingRoom, meetingLink }),
      });

      // Also add a notification for the student with meeting link
      const booking = allBookings.find(b => b.id === bookingId);
      if (booking) {
        await fetch('/api/db', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'createNotification',
            notification: {
              id: `notif-${Date.now()}`,
              type: 'approved',
              studentEmail: booking.studentEmail,
              expertName: booking.expertName,
              expertCompany: booking.expertCompany,
              role: booking.role,
              date: booking.date,
              time: booking.time,
              meetingLink,
              meetingRoom,
              message: `Your interview with ${booking.expertName} (${booking.expertCompany}) for ${booking.role} on ${booking.date} at ${booking.time} has been APPROVED! ✅ Click Join to start your video interview.`,
            },
          }),
        });
      }
    } catch {}

    setAllBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'approved', meetingLink, meetingRoom } : b));
  };

  const handleReject = async (bookingId: string) => {
    try {
      await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateBookingStatus', bookingId, status: 'rejected' }),
      });

      const booking = allBookings.find(b => b.id === bookingId);
      if (booking) {
        await fetch('/api/db', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'createNotification',
            notification: {
              id: `notif-${Date.now()}`,
              type: 'rejected',
              studentEmail: booking.studentEmail,
              expertName: booking.expertName,
              expertCompany: booking.expertCompany,
              role: booking.role,
              date: booking.date,
              time: booking.time,
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
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user.name}. You have {confirmedBookings.length} confirmed and {pendingBookings.length} pending sessions.</p>
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
          {/* Upcoming bookings */}
          <div>
            {/* Pending Approval Section */}
            {pendingBookings.length > 0 && (
              <div className="card-no-hover" style={{ padding: 28, marginBottom: 24, border: '1px solid rgba(245,158,11,0.3)' }}>
                <h2 style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={18} color="#f59e0b" /> Pending Approval ({pendingBookings.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {pendingBookings.map(booking => (
                    <div key={booking.id} style={{ padding: '18px', borderRadius: 12, border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>
                            {booking.studentName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>{booking.studentName}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{booking.college}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="badge" style={{ fontSize: '0.72rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>⏳ Pending</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: '0.82rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>🎯 {booking.role}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>📅 {booking.date}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>🕐 {booking.time}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                        {booking.skills.slice(0, 3).map(s => <span key={s} className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{s}</span>)}
                        {booking.skills.length > 3 && <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>+{booking.skills.length - 3}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => handleApprove(booking.id)} style={{
                          flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.4)',
                          background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 700, fontSize: '0.85rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          transition: 'all 0.2s',
                        }}>
                          <CheckCircle size={16} /> Approve
                        </button>
                        <button onClick={() => handleReject(booking.id)} style={{
                          flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)',
                          background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 700, fontSize: '0.85rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          transition: 'all 0.2s',
                        }}>
                          <XCircle size={16} /> Reject
                        </button>
                        <button onClick={() => { setSelectedStudentId(booking.id); setActiveView('student'); }} style={{
                          padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.82rem',
                          cursor: 'pointer',
                        }}>
                          View Profile
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmed Bookings */}
            <div className="card-no-hover" style={{ padding: 28 }}>
              <h2 style={{ fontWeight: 700, color: 'white', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} color="var(--accent-cyan)" /> Confirmed Interviews ({confirmedBookings.length})
              </h2>
              {confirmedBookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  No confirmed interviews yet.
                </div>
              ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {confirmedBookings.map(booking => (
                <div key={booking.id} style={{ padding: '18px', borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>
                        {booking.studentName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>{booking.studentName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{booking.college}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>✓ {booking.status === 'approved' ? 'Approved' : 'Confirmed'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>🎯 {booking.role}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>📅 {booking.date}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>🕐 {booking.time}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    {booking.skills.slice(0, 3).map(s => <span key={s} className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{s}</span>)}
                    {booking.skills.length > 3 && <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>+{booking.skills.length - 3}</span>}
                    <span style={{ marginLeft: 4, color: '#f87171', fontSize: '0.76rem', alignSelf: 'center' }}>
                      ⚠ Weak: {booking.weakAreas[0]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {booking.meetingRoom && (
                      <button onClick={() => router.push(buildMeetingUrl(booking, booking.meetingRoom!))} style={{
                        flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.4)',
                        background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 700, fontSize: '0.85rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                        <Video size={16} /> Join Interview
                      </button>
                    )}
                    <button className="btn-primary" onClick={() => { setSelectedStudentId(booking.id); setActiveView('student'); }} style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}>
                      View Profile & Rate →
                    </button>
                  </div>
                </div>
              ))}
              </div>
              )}
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
