'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Users, Brain, BookOpen, TrendingUp, Star, Shield, Activity, Globe } from 'lucide-react';

const SIGNUP_DATA = [
  { month: 'Aug', students: 820, experts: 42 },
  { month: 'Sep', students: 1230, experts: 63 },
  { month: 'Oct', students: 1890, experts: 78 },
  { month: 'Nov', students: 2540, experts: 94 },
  { month: 'Dec', students: 3200, experts: 115 },
  { month: 'Jan', students: 4100, experts: 138 },
  { month: 'Feb', students: 5300, experts: 164 },
];

const INTERVIEW_DATA = [
  { day: 'Mon', ai: 340, human: 48 },
  { day: 'Tue', ai: 420, human: 62 },
  { day: 'Wed', ai: 380, human: 55 },
  { day: 'Thu', ai: 510, human: 71 },
  { day: 'Fri', ai: 470, human: 83 },
  { day: 'Sat', ai: 290, human: 94 },
  { day: 'Sun', ai: 220, human: 40 },
];

const PLACEMENT_RATE = [
  { name: 'Placed (< 3 months)', value: 62, color: '#34d399' },
  { name: 'Placed (3-6 months)', value: 21, color: '#a78bfa' },
  { name: 'Still Preparing', value: 17, color: '#374151' },
];

const TOP_ROLES = [
  { role: 'Full Stack Dev', count: 1842 },
  { role: 'Backend Eng.', count: 1531 },
  { role: 'Data Scientist', count: 1289 },
  { role: 'ML Engineer', count: 987 },
  { role: 'Frontend Dev', count: 876 },
  { role: 'DevOps', count: 654 },
];

const CUSTOM_TOOLTIP_STYLE = {
  background: '#12121f',
  border: '1px solid #1e1e3a',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#e8e8f0',
  fontSize: '0.82rem',
};

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) router.push('/auth/login');
  }, [user, isLoading, router]);

  if (!user || user.role !== 'admin') return null;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '32px 36px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: 6 }}>Platform Analytics</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Real-time overview of the PlaceAI platform. Last updated: Feb 26, 2026</p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginBottom: 32 }}>
          {[
            { label: 'Total Users', value: '52,847', change: '+18% MoM', icon: Users, color: '#a78bfa', bg: 'rgba(124,58,237,0.1)' },
            { label: 'AI Interviews', value: '1.2M', change: '+34% MoM', icon: Brain, color: '#22d3ee', bg: 'rgba(6,182,212,0.1)' },
            { label: 'Aptitude Tests', value: '3.8M', change: '+22% MoM', icon: BookOpen, color: '#34d399', bg: 'rgba(16,185,129,0.1)' },
            { label: 'Placement Rate', value: '83%', change: '+5% QoQ', icon: TrendingUp, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          ].map(({ label, value, change, icon: Icon, color, bg }) => (
            <div key={label} className="stat-box">
              <div className="stat-box-icon" style={{ background: bg, border: `1px solid ${color}30` }}>
                <Icon size={20} color={color} />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6 }}>{label}</div>
              <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: 4, fontWeight: 600 }}>{change}</div>
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, marginBottom: 24 }}>
          {/* User growth */}
          <div className="card-no-hover" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 20, fontSize: '0.95rem' }}>📈 User Growth (Last 7 Months)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={SIGNUP_DATA}>
                <defs>
                  <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExperts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
                <XAxis dataKey="month" stroke="#5a5a7a" fontSize={12} />
                <YAxis stroke="#5a5a7a" fontSize={12} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Legend />
                <Area type="monotone" dataKey="students" stroke="#7c3aed" fill="url(#colorStudents)" strokeWidth={2} name="Students" />
                <Area type="monotone" dataKey="experts" stroke="#06b6d4" fill="url(#colorExperts)" strokeWidth={2} name="Experts" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Placement rate pie */}
          <div className="card-no-hover" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 20, fontSize: '0.95rem' }}>🎯 Placement Status</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={PLACEMENT_RATE} innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {PLACEMENT_RATE.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {PLACEMENT_RATE.map(({ name, value, color }) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                    {name}
                  </div>
                  <span style={{ fontWeight: 700, color, fontSize: '0.82rem' }}>{value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Daily interviews */}
          <div className="card-no-hover" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 20, fontSize: '0.95rem' }}>🤖 Interview Sessions (This Week)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={INTERVIEW_DATA} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
                <XAxis dataKey="day" stroke="#5a5a7a" fontSize={12} />
                <YAxis stroke="#5a5a7a" fontSize={12} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Legend />
                <Bar dataKey="ai" fill="#7c3aed" radius={[4, 4, 0, 0]} name="AI Sessions" />
                <Bar dataKey="human" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Human Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top roles */}
          <div className="card-no-hover" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 20, fontSize: '0.95rem' }}>💼 Most Practiced Job Roles</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {TOP_ROLES.map(({ role, count }, i) => {
                const pct = Math.round((count / TOP_ROLES[0].count) * 100);
                const colors = ['#a78bfa', '#22d3ee', '#34d399', '#f59e0b', '#f87171', '#ec4899'];
                return (
                  <div key={role}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.82rem' }}>
                      <span style={{ color: 'white', fontWeight: 500 }}>#{i + 1} {role}</span>
                      <span style={{ color: colors[i], fontWeight: 700 }}>{count.toLocaleString()}</span>
                    </div>
                    <div className="progress-bar" style={{ height: 6 }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: colors[i] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Platform health */}
        <div className="card-no-hover" style={{ padding: 24 }}>
          <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 20, fontSize: '0.95rem' }}>⚡ System Health</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { label: 'API Uptime', value: '99.98%', icon: Activity, color: '#34d399' },
              { label: 'Avg Response', value: '142ms', icon: Globe, color: '#22d3ee' },
              { label: 'Flagged Sessions', value: '0.3%', icon: Shield, color: '#f59e0b' },
              { label: 'Expert Rating Avg', value: '4.8★', icon: Star, color: '#a78bfa' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} style={{ padding: '16px', borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} color={color} />
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
