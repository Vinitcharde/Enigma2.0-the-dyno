'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import { Brain, Code2, Mic, Clock, Target, ChevronRight, Zap, Star, Shield, UserPlus } from 'lucide-react';

const JOB_ROLES = [
  { role: 'Full Stack Developer', icon: '🌐', tags: ['React', 'Node.js', 'System Design'] },
  { role: 'Backend Engineer', icon: '⚙️', tags: ['DSA', 'Databases', 'APIs'] },
  { role: 'Data Scientist', icon: '📊', tags: ['ML', 'Statistics', 'Python'] },
  { role: 'ML Engineer', icon: '🤖', tags: ['Deep Learning', 'PyTorch', 'MLOps'] },
  { role: 'DevOps Engineer', icon: '🚀', tags: ['Docker', 'K8s', 'CI/CD'] },
  { role: 'Frontend Developer', icon: '🎨', tags: ['React', 'CSS', 'Performance'] },
  { role: 'Product Manager', icon: '📋', tags: ['Strategy', 'Metrics', 'Roadmap'] },
  { role: 'System Design', icon: '🏗️', tags: ['Scalability', 'Architecture', 'CAP'] },
];

const INTERVIEW_TYPES = [
  { id: 'full', label: 'Full Interview', desc: 'DSA + System Design + Behavioral (45-60 min)', icon: Zap, color: '#a78bfa', recommended: true },
  { id: 'dsa', label: 'DSA Focus', desc: 'Algorithm and data structure problems (30 min)', icon: Code2, color: '#22d3ee', recommended: false },
  { id: 'behavioral', label: 'Behavioral', desc: 'STAR method answers + communication scoring (20 min)', icon: Mic, color: '#34d399', recommended: false },
  { id: 'avatar', label: 'HR Avatar Mode', desc: 'Immersive AI HR Avatar + JD Ingestion + Multi-format Rubric (30 min)', icon: UserPlus, color: '#ec4899', recommended: false },
];

export default function AIInterviewSetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(user?.targetRole || '');
  const [selectedType, setSelectedType] = useState('full');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [jd, setJd] = useState('');

  if (!user) return null;

  const handleStart = () => {
    if (!selectedRole && selectedType !== 'avatar') return;
    router.push(`/interview/ai/session?role=${encodeURIComponent(selectedRole || 'Custom Role')}&type=${selectedType}&difficulty=${difficulty}${jd ? `&jd=${encodeURIComponent(jd)}` : ''}`);
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '32px 36px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={22} color="white" />
              </div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>AI Interview Simulation</h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginLeft: 54 }}>
              Personalized interview powered by AI — questions generated from your resume & selected role
            </p>
          </div>

          {/* What to expect */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 36 }}>
            {[
              { icon: Brain, label: 'AI Interviewer', desc: 'Asks follow-ups', color: '#a78bfa' },
              { icon: Code2, label: 'Live Coding', desc: 'Monaco Editor', color: '#22d3ee' },
              { icon: Mic, label: 'Voice Eval', desc: 'Speech scoring', color: '#34d399' },
              { icon: Star, label: 'Full Report', desc: '4-metric score', color: '#f59e0b' },
            ].map(({ icon: Icon, label, desc, color }) => (
              <div key={label} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-card)', textAlign: 'center' }}>
                <Icon size={22} color={color} style={{ margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 700, color: 'white', fontSize: '0.88rem' }}>{label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3 }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* Select Job Role */}
          <div className="card-no-hover" style={{ padding: 28, marginBottom: 24 }}>
            <h2 style={{ fontWeight: 700, color: 'white', marginBottom: 6, fontSize: '1rem' }}>
              1. Select Job Role <span style={{ color: '#f87171', fontSize: '0.8rem' }}>*</span>
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              Questions will be personalized to this role + your resume skills: {user.skills?.slice(0, 3).join(', ') || 'None added yet'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {JOB_ROLES.map(({ role, icon, tags }) => (
                <button key={role} onClick={() => setSelectedRole(role)} style={{
                  padding: '16px', borderRadius: 12, border: `2px solid ${selectedRole === role ? 'var(--accent-purple)' : 'var(--border)'}`,
                  background: selectedRole === role ? 'rgba(124,58,237,0.12)' : 'var(--bg-card)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontWeight: 700, color: 'white', fontSize: '0.82rem', marginBottom: 6, lineHeight: 1.3 }}>{role}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {tags.map(t => <span key={t} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 4 }}>{t}</span>)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Interview Type */}
          <div className="card-no-hover" style={{ padding: 28, marginBottom: 24 }}>
            <h2 style={{ fontWeight: 700, color: 'white', marginBottom: 20, fontSize: '1rem' }}>2. Interview Type</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {INTERVIEW_TYPES.map(({ id, label, desc, icon: Icon, color, recommended }) => (
                <button key={id} onClick={() => setSelectedType(id)} style={{
                  padding: '18px 20px', borderRadius: 12, border: `2px solid ${selectedType === id ? color : 'var(--border)'}`,
                  background: selectedType === id ? `${color}15` : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s', width: '100%',
                }}>
                  <Icon size={22} color={color} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>{label}</span>
                      {recommended && <span style={{ fontSize: '0.65rem', background: 'var(--gradient-primary)', color: 'white', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>RECOMMENDED</span>}
                    </div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{desc}</span>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selectedType === id ? color : 'var(--border)'}`, background: selectedType === id ? color : 'transparent', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="card-no-hover" style={{ padding: 28, marginBottom: 32 }}>
            <h2 style={{ fontWeight: 700, color: 'white', marginBottom: 20, fontSize: '1rem' }}>3. Difficulty Level</h2>
            <div style={{ display: 'flex', gap: 12 }}>
              {(['easy', 'medium', 'hard'] as const).map(d => (
                <button key={d} onClick={() => setDifficulty(d)} style={{
                  flex: 1, padding: '14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                  border: `2px solid ${difficulty === d ? { easy: '#34d399', medium: '#f59e0b', hard: '#f87171' }[d] : 'var(--border)'}`,
                  background: difficulty === d ? `${{ easy: 'rgba(16,185,129,0.1)', medium: 'rgba(245,158,11,0.1)', hard: 'rgba(239,68,68,0.1)' }[d]}` : 'transparent',
                  color: difficulty === d ? { easy: '#34d399', medium: '#fbbf24', hard: '#f87171' }[d] : 'var(--text-secondary)',
                  fontWeight: 700, textTransform: 'capitalize', fontSize: '0.9rem',
                }}>
                  {d === 'easy' ? '🌱 Easy' : d === 'medium' ? '⚡ Medium' : '🔥 Hard'}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Job Description Input for Avatar Mode */}
          {selectedType === 'avatar' && (
            <div className="card-no-hover" style={{ padding: 28, marginBottom: 32, background: 'linear-gradient(135deg, rgba(236,72,153,0.1) 0%, transparent 100%)', border: '1px solid rgba(236,72,153,0.3)' }}>
              <h2 style={{ fontWeight: 700, color: 'white', marginBottom: 12, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={18} color="#ec4899" /> 4. Ingest Job Description (Optional)
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
                Paste the specific JD. The AI Avatar will tailor its behavioral, technical, and case scenarios specifically to the keywords and requirements mentioned.
              </p>
              <textarea
                value={jd}
                onChange={e => setJd(e.target.value)}
                placeholder="E.g., Looking for a senior developer proficient in Node.js, microservices architecture, and team leadership..."
                style={{ width: '100%', height: 120, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, color: 'white', fontSize: '0.9rem', resize: 'vertical' }}
              />
            </div>
          )}

          {/* Anti-cheat notice */}
          <div style={{ padding: '14px 20px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
            <Shield size={18} color="#f87171" />
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <span style={{ color: '#f87171', fontWeight: 600 }}>Anti-Cheat Active: </span>
              Tab switching, fullscreen exit, and copy-paste will be monitored. 3+ violations will flag your session.
            </p>
          </div>

          <button className="btn-primary" onClick={handleStart} disabled={!selectedRole}
            style={{ width: '100%', padding: '18px', fontSize: '1.05rem', opacity: !selectedRole ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Brain size={20} /> Begin AI Interview Session
          </button>
        </div>
      </main>
    </div>
  );
}
