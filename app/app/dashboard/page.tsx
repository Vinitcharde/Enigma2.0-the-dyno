'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import {
  Brain, Code2, BookOpen, Calendar, TrendingUp, Target, Star, Clock,
  ArrowRight, Zap, CheckCircle, AlertCircle, ChevronRight, Activity, X, XCircle, Bell
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'approved' | 'rejected';
  studentEmail: string;
  expertName: string;
  expertCompany: string;
  role: string;
  date: string;
  time: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const RECENT_ACTIVITY = [
  { icon: BookOpen, color: '#a78bfa', text: 'Completed Quantitative Aptitude Quiz', time: '2h ago', score: '78%' },
  { icon: Code2, color: '#22d3ee', text: 'AI Interview — Full Stack Developer', time: '1d ago', score: '84%' },
  { icon: Calendar, color: '#34d399', text: 'Mock Interview booked with Priya Mehta', time: '2d ago', score: null },
  { icon: Brain, color: '#f59e0b', text: 'Completed Logical Reasoning quiz', time: '3d ago', score: '91%' },
];

const QUICK_STATS = [
  { label: 'AI Interviews', value: '12', change: '+3 this week', icon: Brain, color: '#a78bfa', bg: 'rgba(124,58,237,0.1)' },
  { label: 'Avg Score', value: '82%', change: '+6% improvement', icon: TrendingUp, color: '#22d3ee', bg: 'rgba(6,182,212,0.1)' },
  { label: 'Quizzes Done', value: '24', change: 'Across 3 sections', icon: BookOpen, color: '#34d399', bg: 'rgba(16,185,129,0.1)' },
  { label: 'Expert Sessions', value: '3', change: '1 upcoming', icon: Star, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
];

const JOB_RECOMMENDATIONS = [
  { role: 'Full Stack Developer', match: 94, skills: ['React', 'Node.js', 'SQL'], companies: ['Google', 'Flipkart', 'Swiggy'] },
  { role: 'Data Scientist', match: 87, skills: ['Python', 'ML', 'Statistics'], companies: ['Amazon', 'Myntra', 'Paytm'] },
  { role: 'Backend Engineer', match: 81, skills: ['Python', 'Node.js', 'SQL'], companies: ['Microsoft', 'Razorpay', 'Zepto'] },
];

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPopup, setShowPopup] = useState<Notification | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'student') {
      if (user.role === 'expert') router.push('/expert/dashboard');
      else router.push('/admin');
    }
  }, [user, isLoading, router]);

  // Poll for new notifications
  useEffect(() => {
    if (!user || user.role !== 'student') return;

    const checkNotifications = () => {
      const allNotifs: Notification[] = JSON.parse(localStorage.getItem('placeai_notifications') || '[]');
      const myNotifs = allNotifs.filter(n => n.studentEmail === user.email);
      setNotifications(myNotifs);

      // Show popup for the first unread notification that hasn't been dismissed
      const unread = myNotifs.find(n => !n.read && !dismissedIds.has(n.id));
      if (unread && (!showPopup || showPopup.id !== unread.id)) {
        setShowPopup(unread);
        // Mark as read
        const updated = allNotifs.map(n => n.id === unread.id ? { ...n, read: true } : n);
        localStorage.setItem('placeai_notifications', JSON.stringify(updated));
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 2000);
    return () => clearInterval(interval);
  }, [user, dismissedIds]);

  const dismissPopup = () => {
    if (showPopup) {
      setDismissedIds(prev => new Set([...prev, showPopup.id]));
    }
    setShowPopup(null);
  };

  if (isLoading || !user) return null;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />

      {/* Notification Popup Overlay */}
      {showPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{
            maxWidth: 460, width: '90%', borderRadius: 20, overflow: 'hidden',
            border: `2px solid ${showPopup.type === 'approved' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
            background: 'var(--bg-card)', animation: 'fadeInUp 0.4s ease',
          }}>
            {/* Popup Header */}
            <div style={{
              padding: '24px 28px 20px',
              background: showPopup.type === 'approved' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              textAlign: 'center', position: 'relative',
            }}>
              <button onClick={dismissPopup} style={{
                position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
              }}>
                <X size={20} />
              </button>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
                background: showPopup.type === 'approved' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                border: `2px solid ${showPopup.type === 'approved' ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {showPopup.type === 'approved' ? (
                  <CheckCircle size={32} color="#34d399" />
                ) : (
                  <XCircle size={32} color="#f87171" />
                )}
              </div>
              <h2 style={{
                fontSize: '1.4rem', fontWeight: 800, marginBottom: 6,
                color: showPopup.type === 'approved' ? '#34d399' : '#f87171',
              }}>
                {showPopup.type === 'approved' ? 'Interview Approved! 🎉' : 'Interview Not Approved'}
              </h2>
            </div>

            {/* Popup Body */}
            <div style={{ padding: '20px 28px 28px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 20, textAlign: 'center' }}>
                {showPopup.type === 'approved' ? (
                  <>Your mock interview with <strong style={{ color: 'white' }}>{showPopup.expertName}</strong> from <strong style={{ color: '#a78bfa' }}>{showPopup.expertCompany}</strong> has been approved!</>
                ) : (
                  <>Your interview request with <strong style={{ color: 'white' }}>{showPopup.expertName}</strong> from <strong style={{ color: '#a78bfa' }}>{showPopup.expertCompany}</strong> was not approved. Please try booking another slot.</>
                )}
              </p>

              {showPopup.type === 'approved' && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  {[
                    { label: 'Role', val: showPopup.role },
                    { label: 'Date', val: showPopup.date },
                    { label: 'Time', val: showPopup.time },
                    { label: 'Mode', val: 'Video Call' },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <span style={{ color: 'white', fontWeight: 600 }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                {showPopup.type === 'approved' ? (
                  <button className="btn-primary" onClick={dismissPopup} style={{ flex: 1, padding: '12px' }}>
                    Got it! 
                  </button>
                ) : (
                  <>
                    <button className="btn-secondary" onClick={dismissPopup} style={{ flex: 1, padding: '12px' }}>
                      Dismiss
                    </button>
                    <button className="btn-primary" onClick={() => { dismissPopup(); router.push('/interview/book'); }} style={{ flex: 1, padding: '12px' }}>
                      Book Another Slot
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="main-content" style={{ padding: '32px 36px', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'white', marginBottom: 6 }}>
                Good morning, {user.name.split(' ')[0]}! 👋
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                {user.college || 'Your placement journey continues.'}
                {user.targetRole && <span style={{ color: '#a78bfa', marginLeft: 8 }}>→ Target: {user.targetRole}</span>}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {/* Notification Bell */}
              {notifications.filter(n => !dismissedIds.has(n.id)).length > 0 && (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => {
                    const unread = notifications.find(n => !dismissedIds.has(n.id));
                    if (unread) setShowPopup(unread);
                  }} style={{
                    background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
                    borderRadius: 12, padding: '10px', cursor: 'pointer', position: 'relative',
                  }}>
                    <Bell size={20} color="#a78bfa" />
                    <div style={{
                      position: 'absolute', top: -4, right: -4, width: 18, height: 18,
                      borderRadius: '50%', background: '#ef4444', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem',
                      fontWeight: 800, color: 'white',
                    }}>
                      {notifications.filter(n => !dismissedIds.has(n.id)).length}
                    </div>
                  </button>
                </div>
              )}
              <button className="btn-primary" onClick={() => router.push('/interview/ai')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={16} /> Start AI Interview
              </button>
              <button className="btn-secondary" onClick={() => router.push('/aptitude')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={16} /> Take Quiz
              </button>
            </div>
          </div>
        </div>

        {/* Profile completion banner */}
        {!user.skills?.length && (
          <div style={{
            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: 14, padding: '16px 24px', marginBottom: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertCircle size={20} color="#a78bfa" />
              <span style={{ color: 'white', fontWeight: 600 }}>Complete your profile to unlock personalized AI interviews</span>
            </div>
            <button className="btn-primary" onClick={() => router.push('/profile')} style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
              Complete Profile <ArrowRight size={14} style={{ display: 'inline', marginLeft: 4 }} />
            </button>
          </div>
        )}

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
          {QUICK_STATS.map(({ label, value, change, icon: Icon, color, bg }) => (
            <div key={label} className="stat-box">
              <div className="stat-box-icon" style={{ background: bg, border: `1px solid ${color}30` }}>
                <Icon size={22} color={color} />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6, fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: '0.75rem', color, marginTop: 4, fontWeight: 600 }}>{change}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Job Recommendations */}
            <div className="card-no-hover" style={{ padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>🎯 Recommended Job Roles</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>Based on your aptitude scores & resume skills</p>
                </div>
                <Target size={20} color="var(--accent-purple)" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {JOB_RECOMMENDATIONS.map(({ role, match, skills, companies }, i) => (
                  <div key={role} style={{
                    padding: '18px', borderRadius: 12, border: '1px solid var(--border)',
                    background: i === 0 ? 'rgba(124,58,237,0.06)' : 'transparent',
                    borderColor: i === 0 ? 'rgba(124,58,237,0.3)' : 'var(--border)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }} onClick={() => router.push('/interview/ai')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {i === 0 && <span style={{ fontSize: '0.7rem', background: 'var(--gradient-primary)', color: 'white', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>BEST MATCH</span>}
                        <span style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>{role}</span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: i === 0 ? '#a78bfa' : 'var(--text-secondary)' }}>{match}%</div>
                    </div>
                    <div className="progress-bar" style={{ marginBottom: 10 }}>
                      <div className="progress-fill" style={{ width: `${match}%`, background: i === 0 ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.2)' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {skills.map(s => <span key={s} className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{s}</span>)}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>
                        @ {companies.join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aptitude overview */}
            <div className="card-no-hover" style={{ padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>📊 Aptitude Performance</h2>
                <button onClick={() => router.push('/aptitude')} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  View All <ChevronRight size={14} />
                </button>
              </div>
              {[
                { section: 'Quantitative Aptitude', score: 78, color: '#a78bfa', attempts: 4 },
                { section: 'Logical Reasoning', score: 91, color: '#22d3ee', attempts: 6 },
                { section: 'Verbal Ability', score: 65, color: '#f59e0b', attempts: 3 },
              ].map(({ section, score, color, attempts }) => (
                <div key={section} style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <span style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>{section}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 8 }}>{attempts} attempts</span>
                    </div>
                    <span style={{ fontWeight: 800, color }}>{score}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${score}%`, background: color }} />
                  </div>
                </div>
              ))}
              <button className="btn-secondary" onClick={() => router.push('/aptitude')} style={{ width: '100%', marginTop: 8, padding: '10px', fontSize: '0.85rem' }}>
                Practice More Sections →
              </button>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Recent activity */}
            <div className="card-no-hover" style={{ padding: 24 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={18} color="var(--accent-cyan)" /> Recent Activity
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {RECENT_ACTIVITY.map(({ icon: Icon, color, text, time, score }, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 16, borderBottom: i < RECENT_ACTIVITY.length - 1 ? '1px solid var(--border)' : 'none', paddingTop: i > 0 ? 16 : 0 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} color={color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', color: 'white', fontWeight: 500, marginBottom: 3, lineHeight: 1.4 }}>{text}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{time}</div>
                    </div>
                    {score && <span className="badge badge-green" style={{ fontSize: '0.7rem', flexShrink: 0 }}>{score}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="card-no-hover" style={{ padding: 24 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: 16 }}>⚡ Quick Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Start AI Interview', desc: 'DSA + Behavioral', color: '#a78bfa', href: '/interview/ai' },
                  { label: 'Take Aptitude Quiz', desc: 'Quant • Logical • Verbal', color: '#22d3ee', href: '/aptitude' },
                  { label: 'Book Expert Session', desc: 'Available today', color: '#34d399', href: '/interview/book' },
                  { label: 'Update Resume Skills', desc: 'Improve recommendations', color: '#f59e0b', href: '/profile' },
                ].map(({ label, desc, color, href }) => (
                  <button key={label} onClick={() => router.push(href)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)',
                    background: 'transparent', cursor: 'pointer', transition: 'all 0.2s',
                    width: '100%',
                  }}
                    onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, color: 'white', fontSize: '0.85rem' }}>{label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{desc}</div>
                    </div>
                    <ChevronRight size={16} color={color} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
