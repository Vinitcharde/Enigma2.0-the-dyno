'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  User, BookOpen, Link2, Upload, X, Plus, Save, CheckCircle,
  AlertTriangle, TrendingUp, Zap, Star, Target, Brain,
  FileText, RefreshCw, ChevronDown, ChevronUp, Info
} from 'lucide-react';

type Tab = 'basic' | 'education' | 'skills' | 'links';

interface ATSResult {
  usedAI?: boolean;
  ats: {
    score: number;
    breakdown: Record<string, number>;
    suggestions: { type: 'good' | 'warning' | 'error'; message: string }[];
    grade: string;
    label: string;
  };
  extracted: {
    name: string;
    email: string;
    phone: string;
    cgpa: string;
    skills: string[];
    yearsOfExperience: number;
    technicalScore: number;
    communicationScore: number;
    suggestedRoles: string[];
    summary?: string;
    wordCount: number;
    pageCount: number;
  };
}

const SKILL_SUGGESTIONS = [
  'React', 'Next.js', 'TypeScript', 'Python', 'Node.js', 'Java', 'C++', 'Go',
  'AWS', 'Docker', 'Kubernetes', 'MongoDB', 'PostgreSQL', 'Redis', 'GraphQL',
  'TensorFlow', 'PyTorch', 'Machine Learning', 'System Design', 'DSA',
  'Spring Boot', 'FastAPI', 'Django', 'Figma', 'CI/CD', 'Git', 'Linux',
];

const SCORE_COLOR = (s: number) => s >= 80 ? '#34d399' : s >= 65 ? '#fbbf24' : s >= 50 ? '#f97316' : '#f87171';
const SCORE_BG = (s: number) => s >= 80 ? 'rgba(16,185,129,0.1)' : s >= 65 ? 'rgba(245,158,11,0.1)' : s >= 50 ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.1)';
const SCORE_BORDER = (s: number) => s >= 80 ? 'rgba(16,185,129,0.3)' : s >= 65 ? 'rgba(245,158,11,0.3)' : s >= 50 ? 'rgba(249,115,22,0.3)' : 'rgba(239,68,68,0.3)';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    college: user?.college || '',
    cgpa: user?.cgpa || '',
    graduationYear: user?.graduationYear || '',
    targetRole: user?.targetRole || '',
    linkedin: user?.linkedin || '',
    github: user?.github || '',
  });
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [newSkill, setNewSkill] = useState('');

  // Resume upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [atsResult, setATSResult] = useState<ATSResult | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showExtracted, setShowExtracted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // onDrop MUST be declared before any early return to satisfy Rules of Hooks
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills, form]);

  useEffect(() => {
    if (!user) router.push('/auth/login');
  }, [user]);

  if (!user) return null;

  const setField = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    updateProfile({ ...form, skills });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const addSkill = (s: string) => {
    const t = s.trim();
    if (t && !skills.includes(t) && skills.length < 25) {
      setSkills([...skills, t]);
      setNewSkill('');
    }
  };

  const removeSkill = (s: string) => setSkills(skills.filter(x => x !== s));

  const handleFileUpload = async (file: File) => {
    const name = file.name.toLowerCase();
    const isPDF = name.endsWith('.pdf');
    const isImage = /\.(png|jpg|jpeg|webp)$/.test(name);
    if (!isPDF && !isImage) {
      setUploadError('Only PDF and image files (PNG, JPG, JPEG, WEBP) are supported.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File must be under 10MB.');
      return;
    }

    setUploadError('');
    setUploading(true);
    setResumeFile(file);
    setATSResult(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('email', user?.email || 'anonymous');
      const res = await fetch('/api/parse-resume', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to parse');
      setATSResult(json as ATSResult);

      // Auto-add extracted skills that aren't already in the list
      const newSkills = (json.extracted.skills as string[]).filter(s => !skills.includes(s));
      if (newSkills.length > 0) {
        setSkills(prev => [...prev, ...newSkills].slice(0, 25));
      }

      // Auto-fill extracted info if empty
      if (json.extracted.phone && !form.phone) setField('phone', json.extracted.phone);
      if (json.extracted.cgpa && !form.cgpa) setField('cgpa', json.extracted.cgpa);

      // Switch to skills tab to show what was added
      setTimeout(() => setActiveTab('skills'), 800);
    } catch (e: any) {
      setUploadError(e.message || 'Failed to analyze resume. Please try again.');
      setResumeFile(null);
    } finally {
      setUploading(false);
    }
  };

  const TABS: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'education', label: 'Education', icon: BookOpen },
    { id: 'skills', label: 'Skills', icon: Zap },
    { id: 'links', label: 'Links & Resume', icon: Link2 },
  ];

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '32px 36px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: 4 }}>My Profile</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Your profile powers AI interview personalization</p>
            </div>
            <button onClick={handleSave} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px' }}>
              {saved ? <><CheckCircle size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'var(--bg-secondary)', borderRadius: 12, padding: 6, border: '1px solid var(--border)' }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{
                flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
                background: activeTab === id ? 'var(--bg-card)' : 'transparent',
                border: activeTab === id ? '1px solid var(--border)' : '1px solid transparent',
                color: activeTab === id ? 'white' : 'var(--text-secondary)',
                fontWeight: activeTab === id ? 700 : 500, fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Icon size={15} /> {label}
                {id === 'skills' && skills.length > 0 && (
                  <span style={{ background: 'var(--accent-purple)', color: 'white', borderRadius: 4, padding: '1px 5px', fontSize: '0.7rem', fontWeight: 800 }}>
                    {skills.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Basic Info */}
          {activeTab === 'basic' && (
            <div className="card-no-hover" style={{ padding: 32 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label className="form-label">Full Name</label>
                  <input className="input-field" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Arjun Sharma" />
                </div>
                <div>
                  <label className="form-label">Phone Number</label>
                  <input className="input-field" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+91 98765 43210" />
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <label className="form-label">Professional Bio</label>
                <textarea className="input-field" rows={4} value={form.bio} onChange={e => setField('bio', e.target.value)} placeholder="Tell recruiters and experts about yourself..." style={{ resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
              </div>
              <div style={{ marginTop: 20 }}>
                <label className="form-label">Target Job Role</label>
                <select className="input-field" value={form.targetRole} onChange={e => setField('targetRole', e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', color: form.targetRole ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  <option value="" style={{ background: '#1a1a2e', color: '#9ca3af' }}>Select your target role</option>
                  {['Full Stack Developer', 'Backend Engineer', 'Frontend Developer', 'Data Scientist', 'ML Engineer', 'DevOps Engineer', 'Product Manager', 'Mobile Developer'].map(r => (
                    <option key={r} value={r} style={{ background: '#1a1a2e', color: '#e2e8f0' }}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Education */}
          {activeTab === 'education' && (
            <div className="card-no-hover" style={{ padding: 32 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label className="form-label">College / University</label>
                  <input className="input-field" value={form.college} onChange={e => setField('college', e.target.value)} placeholder="IIT Bombay" />
                </div>
                <div>
                  <label className="form-label">CGPA / GPA</label>
                  <input className="input-field" value={form.cgpa} onChange={e => setField('cgpa', e.target.value)} placeholder="8.5 / 10" />
                </div>
                <div>
                  <label className="form-label">Graduation Year</label>
                  <input className="input-field" value={form.graduationYear} onChange={e => setField('graduationYear', e.target.value)} placeholder="2025" />
                </div>
                <div>
                  <label className="form-label">Degree</label>
                  <select className="input-field" defaultValue="">
                    <option value="">Select degree</option>
                    {['B.Tech', 'B.E.', 'B.Sc', 'M.Tech', 'M.E.', 'M.Sc', 'MBA', 'BCA', 'MCA'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Skills */}
          {activeTab === 'skills' && (
            <div className="card-no-hover" style={{ padding: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label className="form-label" style={{ margin: 0 }}>Your Skills ({skills.length}/25)</label>
                {atsResult && <span style={{ fontSize: '0.78rem', color: '#a78bfa', fontWeight: 600 }}>✨ {atsResult.extracted.skills.length} skills auto-added from resume</span>}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 20 }}>
                These skills are used to personalize AI interview questions — be accurate!
              </p>

              {/* Current skills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, minHeight: 40 }}>
                {skills.map(s => (
                  <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.35)', color: '#a78bfa', fontSize: '0.85rem', fontWeight: 600 }}>
                    {s}
                    <button onClick={() => removeSkill(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'rgba(167,139,250,0.6)' }}>
                      <X size={13} />
                    </button>
                  </span>
                ))}
                {skills.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>No skills added yet. Upload resume or add manually below.</span>}
              </div>

              {/* Add skill */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                <input className="input-field" style={{ flex: 1 }} value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="Add a skill..." onKeyDown={e => e.key === 'Enter' && addSkill(newSkill)} />
                <button className="btn-primary" onClick={() => addSkill(newSkill)} style={{ padding: '10px 18px' }}>
                  <Plus size={16} />
                </button>
              </div>

              {/* Suggestions */}
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 10 }}>QUICK ADD — POPULAR SKILLS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SKILL_SUGGESTIONS.filter(s => !skills.includes(s)).map(s => (
                    <button key={s} onClick={() => addSkill(s)} style={{
                      padding: '5px 12px', borderRadius: 16, border: '1px solid var(--border)', background: 'transparent',
                      color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#a78bfa'; (e.target as HTMLElement).style.color = '#a78bfa'; }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--text-muted)'; }}
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI interview note */}
              {skills.length > 0 && (
                <div style={{ marginTop: 24, padding: '14px 18px', borderRadius: 10, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Brain size={18} color="#a78bfa" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>AI Interview Impact: </span>
                    Your AI interviewer will ask questions about <strong style={{ color: 'white' }}>{skills.slice(0, 4).join(', ')}</strong>{skills.length > 4 ? ` and ${skills.length - 4} more skills` : ''}. Keep this list accurate for the best practice!
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Links & Resume */}
          {activeTab === 'links' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Social links */}
              <div className="card-no-hover" style={{ padding: 28 }}>
                <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 18, fontSize: '0.95rem' }}>🔗 Social & Portfolio Links</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="form-label">LinkedIn Profile URL</label>
                    <input className="input-field" value={form.linkedin} onChange={e => setField('linkedin', e.target.value)} placeholder="https://linkedin.com/in/your-name" />
                  </div>
                  <div>
                    <label className="form-label">GitHub Profile URL</label>
                    <input className="input-field" value={form.github} onChange={e => setField('github', e.target.value)} placeholder="https://github.com/your-username" />
                  </div>
                </div>
              </div>

              {/* Resume Upload */}
              <div className="card-no-hover" style={{ padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <h3 style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>📄 Resume Upload & ATS Analysis</h3>
                  {resumeFile && (
                    <button onClick={() => { setResumeFile(null); setATSResult(null); setUploadError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
                      <RefreshCw size={13} /> Upload New
                    </button>
                  )}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 20 }}>
                  Upload your PDF resume — we'll extract your skills, calculate your ATS score, and personalize your AI interviews.
                </p>

                {!resumeFile ? (
                  // Drop zone
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragging ? 'var(--accent-purple)' : 'var(--border)'}`,
                      borderRadius: 14, padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
                      transition: 'all 0.2s', background: isDragging ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.01)',
                    }}
                  >
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Upload size={26} color="#a78bfa" />
                    </div>
                    <div style={{ fontWeight: 700, color: 'white', marginBottom: 6 }}>
                      {isDragging ? 'Drop your file here!' : 'Drag & drop your resume'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 6 }}>PDF, PNG, JPG, JPEG, WEBP • Max 10MB</div>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                      {['PDF', 'PNG', 'JPG', 'JPEG', 'WEBP'].map(f => <span key={f} style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 700 }}>{f}</span>)}
                    </div>
                    <button className="btn-primary" style={{ padding: '10px 28px', pointerEvents: 'none', fontSize: '0.88rem' }}>
                      <FileText size={15} style={{ display: 'inline', marginRight: 6 }} /> Choose File
                    </button>
                    <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
                  </div>
                ) : uploading ? (
                  // Uploading state
                  <div style={{ textAlign: 'center', padding: '48px', border: '1px solid var(--border)', borderRadius: 14 }}>
                    <div className="loading-spinner" style={{ width: 52, height: 52, borderWidth: 3, margin: '0 auto 20px' }} />
                    <div style={{ fontWeight: 700, color: 'white', marginBottom: 8 }}>Analyzing Resume...</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Extracting skills • Calculating ATS score • Detecting job roles</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                      {['Parsing PDF', 'Extracting Skills', 'Scoring ATS', 'Detecting Roles'].map((s, i) => (
                        <span key={s} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '3px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : atsResult ? (
                  // ── ATS Results ──────────────────────────────────────────────────
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* File info bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10 }}>
                      <CheckCircle size={18} color="#34d399" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'white', fontSize: '0.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resumeFile.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {(resumeFile.size / 1024).toFixed(0)} KB
                          {atsResult.extracted.pageCount ? ` • ${atsResult.extracted.pageCount} page${atsResult.extracted.pageCount > 1 ? 's' : ''}` : ''}
                          {atsResult.extracted.wordCount ? ` • ${atsResult.extracted.wordCount} words` : ''}
                        </div>
                      </div>
                      {atsResult.usedAI && <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>✨ SambaNova AI</span>}
                    </div>

                    {/* AI Summary */}
                    {atsResult.extracted.summary && (
                      <div style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', marginBottom: 6, letterSpacing: '0.05em' }}>✨ AI RESUME SUMMARY</div>
                        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{atsResult.extracted.summary}</p>
                      </div>
                    )}

                    {/* ── Score Hero ──────────────────────────────────────────────── */}
                    <div style={{ padding: 24, borderRadius: 14, background: SCORE_BG(atsResult.ats.score), border: `1px solid ${SCORE_BORDER(atsResult.ats.score)}` }}>
                      {/* Top row: circle + summary stats */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
                        {/* Animated ring */}
                        <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
                          <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
                            <circle cx="55" cy="55" r="46" fill="none" stroke={SCORE_COLOR(atsResult.ats.score)} strokeWidth="9"
                              strokeDasharray={`${2 * Math.PI * 46}`}
                              strokeDashoffset={`${2 * Math.PI * 46 * (1 - atsResult.ats.score / 100)}`}
                              strokeLinecap="round"
                              style={{ filter: `drop-shadow(0 0 6px ${SCORE_COLOR(atsResult.ats.score)}80)` }}
                            />
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '1.9rem', fontWeight: 900, color: SCORE_COLOR(atsResult.ats.score), lineHeight: 1 }}>{atsResult.ats.score}</span>
                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>/100</span>
                          </div>
                        </div>

                        {/* Grade + label + mini stats */}
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: SCORE_COLOR(atsResult.ats.score) }}>{atsResult.ats.label}</span>
                            <span style={{ padding: '3px 10px', borderRadius: 20, background: `${SCORE_COLOR(atsResult.ats.score)}20`, border: `1px solid ${SCORE_COLOR(atsResult.ats.score)}50`, color: SCORE_COLOR(atsResult.ats.score), fontSize: '0.8rem', fontWeight: 800 }}>Grade {atsResult.ats.grade}</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                            ATS Compatibility Score — {atsResult.ats.score >= 80 ? 'Likely to pass most ATS filters' : atsResult.ats.score >= 65 ? 'Passes many ATS systems' : atsResult.ats.score >= 50 ? 'May struggle with strict ATS filters' : 'Likely rejected by automated systems'}
                          </div>
                          {/* Technical + Communication mini cards */}
                          <div style={{ display: 'flex', gap: 10 }}>
                            {[
                              { label: 'Technical', val: atsResult.extracted.technicalScore || 0, color: '#a78bfa', icon: '⚙️' },
                              { label: 'Communication', val: atsResult.extracted.communicationScore || 0, color: '#22d3ee', icon: '💬' },
                              { label: 'Experience', val: Math.min(100, (atsResult.extracted.yearsOfExperience || 0) * 15), color: '#34d399', icon: '📅', raw: `${atsResult.extracted.yearsOfExperience || 0}yr` },
                            ].map(({ label, val, color, icon, raw }) => (
                              <div key={label} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 3 }}>{icon} {label}</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{raw ?? val}<span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: 1 }}>{raw ? '' : '%'}</span></div>
                                {!raw && (
                                  <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                                    <div style={{ height: '100%', borderRadius: 2, width: `${val}%`, background: color, transition: 'width 0.6s ease' }} />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ── Score Breakdown bars ──────────────────────────────── */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 18 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 14 }}>SCORE BREAKDOWN (total = {atsResult.ats.score}/100)</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {([
                            { key: 'Skills & Keywords',      max: 30, icon: '🔑', desc: 'Tech skills, tools, keywords' },
                            { key: 'Sections Completeness',  max: 25, icon: '📋', desc: 'Contact, education, experience, skills' },
                            { key: 'Action Verbs & Impact',  max: 15, icon: '⚡', desc: 'Built/Led/Designed + quantified results' },
                            { key: 'Contact Information',    max: 15, icon: '📞', desc: 'Name, email, phone, LinkedIn, GitHub' },
                            { key: 'Content Density',        max: 15, icon: '📝', desc: 'Detail level and bullet-point quality' },
                          ] as const).map(({ key, max, icon, desc }) => {
                            const val = Number((atsResult.ats.breakdown as Record<string, number>)[key] ?? 0);
                            const pct = max > 0 ? Math.round((val / max) * 100) : 0;
                            const color = SCORE_COLOR(pct);
                            return (
                              <div key={key}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: '0.85rem' }}>{icon}</span>
                                    <span style={{ fontSize: '0.82rem', color: 'white', fontWeight: 600 }}>{key}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>— {desc}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color }}>{val}<span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>/{max}</span></span>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: `${color}18`, color, border: `1px solid ${color}40` }}>{pct}%</span>
                                  </div>
                                </div>
                                <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})`, boxShadow: `0 0 8px ${color}60`, transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* ── Suggestions (always visible) ────────────────────────── */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 10 }}>AI SUGGESTIONS ({atsResult.ats.suggestions.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {atsResult.ats.suggestions.map((s, i) => {
                          const cfg = s.type === 'good'
                            ? { bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.25)', color: '#34d399', icon: '✅' }
                            : s.type === 'warning'
                            ? { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.25)', color: '#fbbf24', icon: '⚠️' }
                            : { bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.25)', color: '#f87171', icon: '❌' };
                          return (
                            <div key={i} style={{ padding: '10px 14px', borderRadius: 9, display: 'flex', gap: 10, alignItems: 'flex-start', background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                              <span style={{ flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6 }}>{s.message}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Extracted Info (collapsible) ─────────────────────────── */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                      <button onClick={() => setShowExtracted(b => !b)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, width: '100%', marginBottom: showExtracted ? 14 : 0 }}>
                        <Brain size={15} color="#a78bfa" />
                        AI Extracted Information
                        {showExtracted ? <ChevronUp size={14} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={14} style={{ marginLeft: 'auto' }} />}
                      </button>
                      {showExtracted && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                          <div style={{ padding: 16, borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 10 }}>DETECTED INFO</div>
                            {[
                              { label: 'Name',  val: atsResult.extracted.name  || 'Not detected' },
                              { label: 'Email', val: atsResult.extracted.email || 'Not detected' },
                              { label: 'Phone', val: atsResult.extracted.phone || 'Not detected' },
                              { label: 'CGPA',  val: atsResult.extracted.cgpa  || 'Not detected' },
                            ].map(({ label, val }) => (
                              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.81rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                                <span style={{ color: 'white', fontWeight: 500, maxWidth: 180, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{val}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ padding: 16, borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 10 }}>ROLE SUGGESTIONS</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {atsResult.extracted.suggestedRoles.map((r, i) => (
                                <button key={i} onClick={() => setField('targetRole', r.split(' (')[0])} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.79rem', textAlign: 'left' }}>
                                  <Target size={12} color="#a78bfa" />
                                  <span style={{ flex: 1 }}>{r}</span>
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Set →</span>
                                </button>
                              ))}
                              {atsResult.extracted.suggestedRoles.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.79rem' }}>Add more skills for role detection</span>}
                            </div>
                          </div>
                          <div style={{ gridColumn: '1 / -1', padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                              <Zap size={13} color="#a78bfa" />
                              <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 700 }}>SKILLS EXTRACTED & AUTO-ADDED ({atsResult.extracted.skills.length})</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {atsResult.extracted.skills.map(s => (
                                <span key={s} style={{ padding: '3px 10px', borderRadius: 12, background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.35)', color: '#a78bfa', fontSize: '0.76rem', fontWeight: 600 }}>{s}</span>
                              ))}
                            </div>
                            <div style={{ marginTop: 10, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              ✅ Auto-added to your Skills tab. <strong style={{ cursor: 'pointer', color: '#a78bfa' }} onClick={() => setActiveTab('skills')}>Go to Skills →</strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── AI Interview CTA ─────────────────────────────────────── */}
                    {atsResult.extracted.suggestedRoles.length > 0 && (
                      <div style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.25)' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                          <Brain size={15} color="#22d3ee" />
                          <span style={{ color: '#22d3ee', fontWeight: 700, fontSize: '0.82rem' }}>AI Interview Personalization Active</span>
                        </div>
                        <p style={{ fontSize: '0.79rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px' }}>
                          Your AI interviewer will ask questions tailored to your resume skills. Top match: <strong style={{ color: 'white' }}>{atsResult.extracted.suggestedRoles[0]?.split(' (')[0]}</strong>.
                        </p>
                        <button className="btn-primary" onClick={() => router.push('/interview/ai')} style={{ padding: '8px 20px', fontSize: '0.82rem' }}>
                          Start AI Interview →
                        </button>
                      </div>
                    )}

                    {/* ── Resume Based Quiz CTA ─────────────────────────────────── */}
                    {atsResult.extracted.skills.length > 0 && (
                      <div style={{ padding: '18px 20px', borderRadius: 12, background: 'rgba(124,58,237,0.08)', border: '2px solid rgba(124,58,237,0.35)' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '1.2rem' }}>🎯</span>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'white', fontSize: '0.92rem', marginBottom: 3 }}>Resume-Based Technical Quiz</div>
                            <p style={{ fontSize: '0.79rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                              10 AI-generated questions targeting <strong style={{ color: '#a78bfa' }}>{atsResult.extracted.skills.slice(0, 3).join(', ')}</strong>{atsResult.extracted.skills.length > 3 ? ` +${atsResult.extracted.skills.length - 3} more skills` : ''} from your resume. Timed 15 minutes.
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                          {atsResult.extracted.skills.slice(0, 6).map(s => (
                            <span key={s} style={{ padding: '2px 9px', borderRadius: 10, background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.35)', color: '#a78bfa', fontSize: '0.73rem', fontWeight: 600 }}>{s}</span>
                          ))}
                          {atsResult.extracted.skills.length > 6 && <span style={{ color: 'var(--text-muted)', fontSize: '0.73rem', alignSelf: 'center' }}>+{atsResult.extracted.skills.length - 6} more</span>}
                        </div>
                        <button
                          className="btn-primary"
                          onClick={() => {
                            // Store skills in localStorage for the quiz page to consume
                            localStorage.setItem('placeai_resume_quiz_skills', JSON.stringify(atsResult.extracted.skills));
                            localStorage.setItem('placeai_resume_quiz_roles', JSON.stringify(atsResult.extracted.suggestedRoles));
                            router.push('/aptitude/resume');
                          }}
                          style={{ width: '100%', padding: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                          🚀 Take Resume Based Quiz
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Error */}
                {uploadError && (
                  <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.83rem', color: '#f87171' }}>
                    <AlertTriangle size={16} />
                    {uploadError}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
