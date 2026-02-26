'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { Brain, TrendingUp, Target, AlertTriangle, CheckCircle, BookOpen } from 'lucide-react';

const RADAR_DATA = [
  { subject: 'Quantitative', score: 78, fullMark: 100 },
  { subject: 'Logical', score: 91, fullMark: 100 },
  { subject: 'Verbal', score: 65, fullMark: 100 },
  { subject: 'Technical', score: 82, fullMark: 100 },
  { subject: 'Communication', score: 88, fullMark: 100 },
  { subject: 'Problem Solving', score: 76, fullMark: 100 },
];

const TREND_DATA = [
  { date: 'Jan 15', score: 62 },
  { date: 'Jan 22', score: 68 },
  { date: 'Feb 1', score: 71 },
  { date: 'Feb 8', score: 75 },
  { date: 'Feb 15', score: 80 },
  { date: 'Feb 22', score: 84 },
];

const WEAK_AREAS = [
  { area: 'Verbal Ability', reason: 'Vocabulary and reading comprehension need improvement', priority: 'High' },
  { area: 'Problem Solving', reason: 'Edge cases and optimization thinking need work', priority: 'Medium' },
  { area: 'Quantitative - Probability', reason: 'Bayesian and combinatorics problems are hard', priority: 'Medium' },
];

const RECOMMENDATIONS = [
  'Practice 5 Verbal Ability questions daily for the next 2 weeks',
  'Solve 2-3 system design problems per week on LeetCode/Pramp',
  'Watch MIT OpenCourseWare probability lectures',
  'Book an expert session focused on communication clarity',
  'Complete the AI interview for Product Manager to verify recommendation',
];

export default function AnalyticsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  if (!user) return null;

  const TOOLTIP_STYLE = { background: '#12121f', border: '1px solid #1e1e3a', borderRadius: 8, padding: '10px 14px', color: '#e8e8f0', fontSize: '0.82rem' };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '32px 36px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: 6 }}>📊 Performance Analytics</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Your complete learning & readiness analytics — personalized improvement roadmap</p>
          </div>

          {/* Overall readiness */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginBottom: 28 }}>
            {[
              { label: 'Placement Readiness', value: '82%', color: '#a78bfa', icon: Target },
              { label: 'Interview Score Trend', value: '↑ +22%', color: '#34d399', icon: TrendingUp },
              { label: 'Sessions Completed', value: '38', color: '#22d3ee', icon: Brain },
              { label: 'Quizzes Attempted', value: '13', color: '#f59e0b', icon: BookOpen },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="stat-box">
                <div className="stat-box-icon" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  <Icon size={20} color={color} />
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            {/* Radar chart */}
            <div className="card-no-hover" style={{ padding: 28 }}>
              <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 20, fontSize: '0.95rem' }}>🕸 Skill Web — Overall Performance</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={RADAR_DATA}>
                  <PolarGrid stroke="#1e1e3a" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9090b0', fontSize: 11 }} />
                  <Radar name="Score" dataKey="score" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Score trend */}
            <div className="card-no-hover" style={{ padding: 28 }}>
              <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 20, fontSize: '0.95rem' }}>📈 Interview Score Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={TREND_DATA}>
                  <defs>
                    <linearGradient id="cgScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
                  <XAxis dataKey="date" stroke="#5a5a7a" fontSize={11} />
                  <YAxis domain={[50, 100]} stroke="#5a5a7a" fontSize={11} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="score" stroke="#7c3aed" fill="url(#cgScore)" strokeWidth={2} name="Score %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section breakdown */}
          <div className="card-no-hover" style={{ padding: 28, marginBottom: 24 }}>
            <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 20, fontSize: '0.95rem' }}>📋 Section-wise Accuracy</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Logical Reasoning', best: 91, avg: 85, attempts: 6, color: '#22d3ee', trend: '+8%' },
                { label: 'Technical (AI Interviews)', best: 87, avg: 82, attempts: 12, color: '#a78bfa', trend: '+11%' },
                { label: 'Communication', best: 88, avg: 80, attempts: 12, color: '#34d399', trend: '+15%' },
                { label: 'Quantitative Aptitude', best: 82, avg: 78, attempts: 4, color: '#f59e0b', trend: '+5%' },
                { label: 'Verbal Ability', best: 72, avg: 65, attempts: 3, color: '#f87171', trend: '+4%' },
                { label: 'Optimization Thinking', best: 75, avg: 68, attempts: 12, color: '#ec4899', trend: '+9%' },
              ].map(({ label, best, avg, attempts, color, trend }) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '220px 1fr 80px 70px 60px', gap: 16, alignItems: 'center' }}>
                  <span style={{ color: 'white', fontWeight: 600, fontSize: '0.88rem' }}>{label}</span>
                  <div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${avg}%`, background: color }} />
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, color, fontSize: '0.88rem' }}>{avg}% avg</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{attempts}x</span>
                  <span style={{ color: '#34d399', fontSize: '0.78rem', fontWeight: 600 }}>{trend}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Weak areas */}
            <div className="card-no-hover" style={{ padding: 28 }}>
              <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 20, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} color="#f59e0b" /> Identified Weak Areas
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {WEAK_AREAS.map(({ area, reason, priority }) => (
                  <div key={area} style={{ padding: '14px', borderRadius: 10, border: `1px solid ${priority === 'High' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`, background: priority === 'High' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: 'white', fontSize: '0.88rem' }}>{area}</span>
                      <span className={`badge ${priority === 'High' ? 'badge-red' : 'badge-orange'}`} style={{ fontSize: '0.7rem' }}>{priority}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="card-no-hover" style={{ padding: 28 }}>
              <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 20, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Brain size={18} color="var(--accent-purple)" /> AI Improvement Plan
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {RECOMMENDATIONS.map((rec, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.72rem', color: 'white', flexShrink: 0, marginTop: 1 }}>
                      {i + 1}
                    </div>
                    <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{rec}</p>
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
