'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import { Brain, Code2, Mic, Zap, Shield, Layers } from 'lucide-react';

// ─── Domain-organized job roles with languages & question domains ─────────────
const JOB_DOMAINS = [
  {
    domain: 'Software Engineering',
    color: '#a78bfa',
    roles: [
      { role: 'Full Stack Developer', icon: '🌐', tags: ['React', 'Node.js', 'TypeScript'], languages: ['JavaScript', 'TypeScript', 'Python'], questionFocus: ['DSA', 'System Design', 'Behavioral'] },
      { role: 'Frontend Developer', icon: '🎨', tags: ['React', 'CSS', 'Performance'], languages: ['JavaScript', 'TypeScript', 'HTML/CSS'], questionFocus: ['UI DSA', 'Browser APIs', 'Behavioral'] },
      { role: 'Backend Engineer', icon: '⚙️', tags: ['APIs', 'Databases', 'Caching'], languages: ['Python', 'Java', 'Go', 'Node.js'], questionFocus: ['DSA', 'System Design', 'SQL'] },
      { role: 'Mobile Developer', icon: '📱', tags: ['iOS/Android', 'React Native', 'Flutter'], languages: ['Swift', 'Kotlin', 'Dart'], questionFocus: ['Mobile DSA', 'UI Patterns', 'Platform APIs'] },
    ],
  },
  {
    domain: 'Data & AI',
    color: '#22d3ee',
    roles: [
      { role: 'Data Scientist', icon: '📊', tags: ['ML', 'Statistics', 'Python'], languages: ['Python', 'R', 'SQL'], questionFocus: ['ML Algorithms', 'Statistics', 'Data Wrangling'] },
      { role: 'ML Engineer', icon: '🤖', tags: ['Deep Learning', 'PyTorch', 'MLOps'], languages: ['Python', 'CUDA', 'Bash'], questionFocus: ['Neural Networks', 'Model Deployment', 'Optimization'] },
      { role: 'Data Engineer', icon: '🔄', tags: ['Spark', 'ETL', 'Pipelines'], languages: ['Python', 'SQL', 'Scala'], questionFocus: ['Big Data', 'Pipeline Design', 'Data Modeling'] },
      { role: 'AI / NLP Engineer', icon: '🧠', tags: ['Transformers', 'HuggingFace', 'NLP'], languages: ['Python', 'CUDA', 'HuggingFace'], questionFocus: ['NLP Algorithms', 'LLM Fine-tuning', 'Embeddings'] },
    ],
  },
  {
    domain: 'Infrastructure & Cloud',
    color: '#34d399',
    roles: [
      { role: 'DevOps Engineer', icon: '🚀', tags: ['Docker', 'K8s', 'CI/CD'], languages: ['Bash', 'Python', 'Go', 'YAML'], questionFocus: ['Container Orchestration', 'CI/CD', 'Scripting'] },
      { role: 'Cloud Architect', icon: '☁️', tags: ['AWS', 'GCP', 'Terraform'], languages: ['Terraform', 'Python', 'Bash', 'YAML'], questionFocus: ['Cloud Design', 'Security', 'Cost Optimization'] },
      { role: 'Site Reliability Engineer', icon: '🔧', tags: ['Observability', 'Incident Mgmt', 'Go'], languages: ['Go', 'Python', 'Bash'], questionFocus: ['SLOs/SLAs', 'Incident Response', 'Automation'] },
    ],
  },
  {
    domain: 'Security',
    color: '#f87171',
    roles: [
      { role: 'Security Engineer', icon: '🔐', tags: ['Cryptography', 'Auth', 'Vulnerability'], languages: ['Python', 'C', 'Bash'], questionFocus: ['Security Concepts', 'Cryptography', 'Attack Vectors'] },
      { role: 'Penetration Tester', icon: '🕵️', tags: ['Ethical Hacking', 'OSINT', 'CTF'], languages: ['Python', 'Bash', 'Ruby'], questionFocus: ['Recon', 'Exploitation', 'Reporting'] },
    ],
  },
  {
    domain: 'Specialized',
    color: '#f59e0b',
    roles: [
      { role: 'Blockchain Developer', icon: '⛓️', tags: ['Solidity', 'Web3', 'Smart Contracts'], languages: ['Solidity', 'JavaScript', 'Rust'], questionFocus: ['Smart Contracts', 'Consensus', 'Token Standards'] },
      { role: 'Game Developer', icon: '🎮', tags: ['Unity', 'C++', 'Physics Engine'], languages: ['C++', 'C#', 'Python'], questionFocus: ['Game Loop', 'Physics', 'Performance'] },
      { role: 'Embedded Systems', icon: '🔩', tags: ['RTOS', 'C/C++', 'Hardware'], languages: ['C', 'C++', 'Assembly'], questionFocus: ['Memory Management', 'Interrupts', 'Low-level'] },
    ],
  },
  {
    domain: 'Product & Management',
    color: '#818cf8',
    roles: [
      { role: 'Product Manager', icon: '📋', tags: ['Strategy', 'Metrics', 'Roadmap'], languages: ['No Coding Required'], questionFocus: ['Prioritization', 'User Research', 'Metrics'] },
      { role: 'Business Analyst', icon: '📈', tags: ['SQL', 'Requirements', 'Analytics'], languages: ['SQL', 'Excel', 'Python'], questionFocus: ['Requirements Analysis', 'Reporting', 'Stakeholder Mgmt'] },
    ],
  },
];

// Flat list for quick lookup
const ALL_ROLES = JOB_DOMAINS.flatMap(d => d.roles);

const INTERVIEW_TYPES = [
  {
    id: 'full',
    label: 'Full Interview',
    desc: 'Combined: DSA + System Design + Behavioral — complete assessment (45–60 min)',
    icon: Zap,
    color: '#a78bfa',
    recommended: true,
    badge: 'DSA · System Design · Behavioral',
  },
  {
    id: 'dsa',
    label: 'DSA Focus',
    desc: 'Algorithm & data structure coding problems with complexity analysis (30 min)',
    icon: Code2,
    color: '#22d3ee',
    recommended: false,
    badge: 'Coding · Algorithms',
  },
  {
    id: 'behavioral',
    label: 'Behavioral',
    desc: 'STAR-method situational questions with communication & leadership scoring (20 min)',
    icon: Mic,
    color: '#34d399',
    recommended: false,
    badge: 'STAR · Communication',
  },
  {
    id: 'system_design',
    label: 'System Design',
    desc: 'Scalability, architecture trade-offs, database design & distributed systems (30 min)',
    icon: Layers,
    color: '#f59e0b',
    recommended: false,
    badge: 'Scalability · Architecture',
  },
];

const DIFFICULTY_META = {
  easy:   { emoji: '🌱', label: 'Easy',   color: '#34d399', bg: 'rgba(16,185,129,0.1)',  desc: '0–1 yr · Fundamentals & basics' },
  medium: { emoji: '⚡', label: 'Medium', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)',  desc: '2–4 yr · Standard interview level' },
  hard:   { emoji: '🔥', label: 'Hard',   color: '#f87171', bg: 'rgba(239,68,68,0.1)',   desc: '5+ yr · FAANG / senior level' },
};

export default function AIInterviewSetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    user?.targetRole ? [user.targetRole] : []
  );
  const [selectedType, setSelectedType] = useState('full');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  if (!user) return null;

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const getSelectedRoleMeta = () =>
    ALL_ROLES.filter(r => selectedRoles.includes(r.role));

  const handleStart = () => {
    if (selectedRoles.length === 0) return;
    const rolesParam = selectedRoles.map(r => encodeURIComponent(r)).join(',');
    router.push(
      `/interview/ai/session?roles=${rolesParam}&type=${selectedType}&difficulty=${difficulty}`
    );
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '32px 36px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={22} color="white" />
              </div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>AI Interview Simulation</h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginLeft: 54 }}>
              Personalized questions generated from your selected roles, skills &amp; difficulty level
            </p>
          </div>

          {/* ── Step 1: Job Role (multi-select, by domain) ─────────────────── */}
          <div className="card-no-hover" style={{ padding: 28, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <h2 style={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>
                1. Select Job Role(s) <span style={{ color: '#f87171', fontSize: '0.8rem' }}>*</span>
              </h2>
              {selectedRoles.length > 0 && (
                <span style={{ fontSize: '0.75rem', background: 'rgba(124,58,237,0.2)', color: '#a78bfa', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                  {selectedRoles.length} selected
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              Select one or more roles — questions &amp; programming languages will be tailored to your domains
            </p>

            {JOB_DOMAINS.map(({ domain, color, roles }) => (
              <div key={domain} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                  {domain}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {roles.map(({ role, icon, tags, languages }) => {
                    const selected = selectedRoles.includes(role);
                    return (
                      <button
                        key={role}
                        onClick={() => toggleRole(role)}
                        style={{
                          padding: '14px 16px', borderRadius: 12,
                          border: `2px solid ${selected ? color : 'var(--border)'}`,
                          background: selected ? `${color}18` : 'var(--bg-card)',
                          cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s', position: 'relative',
                        }}
                      >
                        {selected && (
                          <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: 'white', fontSize: '0.65rem', fontWeight: 900 }}>✓</span>
                          </div>
                        )}
                        <div style={{ fontSize: '1.3rem', marginBottom: 5 }}>{icon}</div>
                        <div style={{ fontWeight: 700, color: 'white', fontSize: '0.82rem', marginBottom: 5, lineHeight: 1.3 }}>{role}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
                          {tags.map(t => (
                            <span key={t} style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.07)', color: 'var(--text-muted)', padding: '2px 5px', borderRadius: 4 }}>{t}</span>
                          ))}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: selected ? color : 'var(--text-muted)', fontWeight: 600 }}>
                          🖥 {languages.slice(0, 2).join(' · ')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Selected roles summary */}
            {selectedRoles.length > 0 && (
              <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 10, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)' }}>
                <div style={{ fontSize: '0.78rem', color: '#a78bfa', fontWeight: 700, marginBottom: 8 }}>Selected Role Domains &amp; Languages</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {getSelectedRoleMeta().map(r => (
                    <div key={r.role} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 10px', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'white', fontWeight: 600 }}>{r.icon} {r.role}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>· {r.languages.slice(0, 2).join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Step 2: Interview Type ──────────────────────────────────────── */}
          <div className="card-no-hover" style={{ padding: 28, marginBottom: 24 }}>
            <h2 style={{ fontWeight: 700, color: 'white', marginBottom: 6, fontSize: '1rem' }}>2. Interview Type</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 18 }}>
              <strong style={{ color: '#a78bfa' }}>Full Interview</strong> combines all three pillars — DSA, System Design &amp; Behavioral — in one session
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {INTERVIEW_TYPES.map(({ id, label, desc, icon: Icon, color, recommended, badge }) => (
                <button
                  key={id}
                  onClick={() => setSelectedType(id)}
                  style={{
                    padding: '16px 20px', borderRadius: 12,
                    border: `2px solid ${selectedType === id ? color : 'var(--border)'}`,
                    background: selectedType === id ? `${color}15` : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
                    transition: 'all 0.18s', width: '100%',
                  }}
                >
                  <Icon size={20} color={color} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, color: 'white', fontSize: '0.92rem' }}>{label}</span>
                      {recommended && (
                        <span style={{ fontSize: '0.62rem', background: 'var(--gradient-primary)', color: 'white', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>RECOMMENDED</span>
                      )}
                      <span style={{ fontSize: '0.65rem', background: `${color}22`, color, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{badge}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{desc}</span>
                  </div>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selectedType === id ? color : 'var(--border)'}`, background: selectedType === id ? color : 'transparent', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>

          {/* ── Step 3: Difficulty ─────────────────────────────────────────── */}
          <div className="card-no-hover" style={{ padding: 28, marginBottom: 32 }}>
            <h2 style={{ fontWeight: 700, color: 'white', marginBottom: 6, fontSize: '1rem' }}>3. Difficulty Level</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 18 }}>
              Controls question complexity — harder levels include senior-level optimisation &amp; edge-case reasoning
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              {(['easy', 'medium', 'hard'] as const).map(d => {
                const meta = DIFFICULTY_META[d];
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    style={{
                      flex: 1, padding: '16px', borderRadius: 12, cursor: 'pointer',
                      transition: 'all 0.18s', textAlign: 'left',
                      border: `2px solid ${difficulty === d ? meta.color : 'var(--border)'}`,
                      background: difficulty === d ? meta.bg : 'transparent',
                    }}
                  >
                    <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{meta.emoji}</div>
                    <div style={{ fontWeight: 700, color: difficulty === d ? meta.color : 'white', fontSize: '0.92rem', marginBottom: 3 }}>{meta.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{meta.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Anti-cheat notice ──────────────────────────────────────────── */}
          <div style={{ padding: '14px 20px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
            <Shield size={18} color="#f87171" />
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <span style={{ color: '#f87171', fontWeight: 600 }}>Anti-Cheat Active: </span>
              Tab switching, fullscreen exit &amp; copy-paste will be monitored. 3+ violations will flag your session.
            </p>
          </div>

          <button
            className="btn-primary"
            onClick={handleStart}
            disabled={selectedRoles.length === 0}
            style={{ width: '100%', padding: '18px', fontSize: '1.05rem', opacity: selectedRoles.length === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            <Brain size={20} />
            {selectedRoles.length === 0
              ? 'Select at least one role to begin'
              : `Begin ${DIFFICULTY_META[difficulty].label} ${INTERVIEW_TYPES.find(t => t.id === selectedType)?.label} — ${selectedRoles.length} role${selectedRoles.length > 1 ? 's' : ''}`
            }
          </button>
        </div>
      </main>
    </div>
  );
}
