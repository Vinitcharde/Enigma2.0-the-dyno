'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  User, Upload, Plus, X, Save, Briefcase, GraduationCap, Github, Linkedin,
  CheckCircle, FileText, Loader2, Sparkles, Brain, TrendingUp, AlertCircle
} from 'lucide-react';

const SKILL_SUGGESTIONS = ['Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Java', 'C++', 'Go', 'SQL', 'MongoDB', 'Redis', 'AWS', 'Docker', 'Machine Learning', 'Data Science', 'System Design', 'DSA', 'REST APIs', 'GraphQL', 'Kubernetes'];

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeSuccess, setResumeSuccess] = useState<string | null>(null);
  const [parsedResumePreview, setParsedResumePreview] = useState<any>(null);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    college: user?.college || '',
    cgpa: user?.cgpa || '',
    graduationYear: user?.graduationYear || '',
    targetRole: user?.targetRole || '',
    bio: user?.bio || '',
    linkedin: user?.linkedin || '',
    github: user?.github || '',
    skills: user?.skills || [],
  });

  const set = (k: string, v: string | string[]) => setForm(f => ({ ...f, [k]: v }));

  const addSkill = (skill: string) => {
    if (skill && !form.skills.includes(skill)) {
      set('skills', [...form.skills, skill]);
    }
    setNewSkill('');
  };

  const removeSkill = (skill: string) => set('skills', form.skills.filter(s => s !== skill));

  const handleSave = () => {
    updateProfile({
      ...form,
      resumeData: parsedResumePreview || user?.resumeData,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setResumeError('Please upload a PDF file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setResumeError('File size must be under 5MB');
      return;
    }

    setUploadingResume(true);
    setResumeError(null);
    setResumeSuccess(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse resume');
      }

      const resumeData = data.data;
      setParsedResumePreview(resumeData);

      // Auto-fill skills from resume
      const newSkills = [...form.skills];
      for (const skill of resumeData.skills) {
        if (!newSkills.includes(skill)) {
          newSkills.push(skill);
        }
      }
      set('skills', newSkills);

      // Auto-fill name if empty
      if (!form.name && resumeData.name) {
        set('name', resumeData.name);
      }

      // Auto-fill phone if empty
      if (!form.phone && resumeData.phone) {
        setForm(f => ({ ...f, phone: resumeData.phone }));
      }

      // Suggest target role
      if (!form.targetRole && resumeData.suggestedRoles?.length > 0) {
        setForm(f => ({ ...f, targetRole: resumeData.suggestedRoles[0] }));
      }

      // Save resume data to profile
      updateProfile({
        resumeData,
        resumeFileName: file.name,
        skills: newSkills,
      });

      setResumeSuccess(data.message || `Found ${resumeData.skills.length} skills`);
    } catch (err: any) {
      setResumeError(err.message || 'Failed to parse resume');
    } finally {
      setUploadingResume(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!user) return null;

  const resumeData = parsedResumePreview || user?.resumeData;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '32px 36px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: 6 }}>My Profile</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Your data powers personalized AI interviews and job recommendations</p>
            </div>
            <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {saved ? <CheckCircle size={16} /> : <Save size={16} />}
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>

          {/* Avatar & Basic */}
          <div className="card-no-hover" style={{ padding: 32, marginBottom: 24 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} color="var(--accent-purple)" /> Basic Information
            </h2>
            <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                {form.name.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
              </div>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Full Name</label>
                  <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your full name" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Phone</label>
                  <input className="input-field" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 XXXXXXXXXX" />
                </div>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Bio</label>
              <textarea className="input-field" value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Brief professional bio..." rows={3} style={{ resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
            </div>
          </div>

          {/* Education */}
          <div className="card-no-hover" style={{ padding: 32, marginBottom: 24 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
              <GraduationCap size={18} color="var(--accent-cyan)" /> Education & Career
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>College / University</label>
                <input className="input-field" value={form.college} onChange={e => set('college', e.target.value)} placeholder="e.g. IIT Bombay" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>CGPA</label>
                <input className="input-field" value={form.cgpa} onChange={e => set('cgpa', e.target.value)} placeholder="e.g. 8.7" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Graduation Year</label>
                <input className="input-field" value={form.graduationYear} onChange={e => set('graduationYear', e.target.value)} placeholder="e.g. 2025" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Target Role</label>
                <select className="input-field" value={form.targetRole} onChange={e => set('targetRole', e.target.value)} style={{ cursor: 'pointer' }}>
                  <option value="">Select target role</option>
                  {['Full Stack Developer', 'Backend Engineer', 'Frontend Developer', 'Data Scientist', 'ML Engineer', 'Product Manager', 'DevOps Engineer', 'Mobile Developer'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Resume Upload — Full Featured */}
          <div className="card-no-hover" style={{ padding: 32, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
            {/* Decorative gradient line at top */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--gradient-secondary)' }} />

            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color="var(--accent-cyan)" /> Resume Upload & AI Analysis
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              Upload your resume PDF to automatically extract skills, experience, and personalize your AI interview questions
            </p>

            {/* Upload area */}
            <div
              onClick={() => !uploadingResume && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${uploadingResume ? 'var(--accent-cyan)' : resumeData ? 'var(--accent-green)' : 'var(--border)'}`,
                borderRadius: 16,
                padding: '32px 28px',
                textAlign: 'center',
                cursor: uploadingResume ? 'wait' : 'pointer',
                transition: 'all 0.3s ease',
                background: uploadingResume ? 'rgba(6,182,212,0.06)' : resumeData ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseOver={e => { if (!uploadingResume) e.currentTarget.style.borderColor = 'var(--accent-purple)'; e.currentTarget.style.background = 'rgba(124,58,237,0.06)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = resumeData ? 'var(--accent-green)' : 'var(--border)'; e.currentTarget.style.background = resumeData ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)'; }}
            >
              {uploadingResume ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={26} color="#22d3ee" style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                  <div style={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>Analyzing Resume with AI...</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Extracting skills, experience, and building your profile</div>
                  <div style={{ width: 200, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden', marginTop: 4 }}>
                    <div style={{ height: '100%', background: 'var(--gradient-secondary)', borderRadius: 2, animation: 'progressPulse 1.5s ease-in-out infinite' }} />
                  </div>
                </div>
              ) : resumeData ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={26} color="#34d399" />
                  </div>
                  <div style={{ fontWeight: 700, color: '#34d399', fontSize: '1rem' }}>Resume Parsed Successfully!</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {user?.resumeFileName || 'resume.pdf'} • Click to upload a new resume
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={26} color="var(--accent-purple)" />
                  </div>
                  <div style={{ fontWeight: 700, color: 'white', fontSize: '1.05rem' }}>Upload Resume (PDF)</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 400, lineHeight: 1.6 }}>
                    AI will extract your skills, experience, projects, and personalize interview questions.
                    <br />Max 5MB • PDF format only
                  </div>
                  <button className="btn-secondary" style={{ padding: '10px 24px', fontSize: '0.85rem', marginTop: 4 }}>
                    Choose PDF File
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleResumeUpload}
                style={{ display: 'none' }}
              />
            </div>

            {/* Error message */}
            {resumeError && (
              <div style={{
                marginTop: 12, padding: '10px 16px', borderRadius: 10,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <AlertCircle size={16} />
                {resumeError}
                <button onClick={() => setResumeError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}>×</button>
              </div>
            )}

            {/* Success message */}
            {resumeSuccess && (
              <div style={{
                marginTop: 12, padding: '10px 16px', borderRadius: 10,
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                color: '#34d399', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Sparkles size={16} />
                {resumeSuccess}
              </div>
            )}

            {/* Parsed Resume Analysis Dashboard */}
            {resumeData && (
              <div style={{ marginTop: 24 }}>
                {/* AI Analysis Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Brain size={18} color="var(--accent-purple)" />
                  <span style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>AI Resume Analysis</span>
                  <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                    {resumeData.seniorityLevel}
                  </span>
                  {resumeData.yearsOfExperience > 0 && (
                    <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                      {resumeData.yearsOfExperience}+ yrs exp
                    </span>
                  )}
                </div>

                {/* Stats cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Skills Found', value: resumeData.skills?.length || 0, color: '#a78bfa', icon: '🎯' },
                    { label: 'Categories', value: Object.keys(resumeData.skillCategories || {}).length, color: '#22d3ee', icon: '📂' },
                    { label: 'Experience Entries', value: resumeData.experience?.length || 0, color: '#34d399', icon: '💼' },
                    { label: 'Projects', value: resumeData.projects?.length || 0, color: '#f59e0b', icon: '🚀' },
                  ].map(({ label, value, color, icon }) => (
                    <div key={label} style={{
                      padding: '14px', borderRadius: 12, border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{icon}</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{value}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Skill categories breakdown */}
                {resumeData.skillCategories && Object.keys(resumeData.skillCategories).length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
                      Skills by Category
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {Object.entries(resumeData.skillCategories).map(([category, skills]) => (
                        <div key={category} style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', marginBottom: 8 }}>{category}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {(skills as string[]).map((skill: string) => (
                              <span key={skill} className="badge badge-purple" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested roles */}
                {resumeData.suggestedRoles?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TrendingUp size={14} /> Suggested Roles (from your resume)
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {resumeData.suggestedRoles.map((role: string, i: number) => (
                        <button
                          key={role}
                          onClick={() => setForm(f => ({ ...f, targetRole: role }))}
                          style={{
                            padding: '8px 16px', borderRadius: 10,
                            border: `1px solid ${form.targetRole === role ? 'var(--accent-purple)' : 'var(--border)'}`,
                            background: form.targetRole === role ? 'rgba(124,58,237,0.15)' : 'var(--bg-secondary)',
                            color: form.targetRole === role ? '#a78bfa' : 'var(--text-secondary)',
                            cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                            transition: 'all 0.2s',
                          }}
                        >
                          {i === 0 && '🏆 '}{role}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience preview */}
                {resumeData.experience?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
                      Experience Extracted
                    </div>
                    {resumeData.experience.slice(0, 2).map((exp: string, i: number) => (
                      <div key={i} style={{
                        padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--bg-secondary)', marginBottom: 8,
                        fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5,
                      }}>
                        {exp.substring(0, 200)}{exp.length > 200 ? '...' : ''}
                      </div>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <div style={{
                  padding: '14px 20px', borderRadius: 12,
                  background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'white', fontSize: '0.88rem' }}>
                      ✨ Resume-powered interview ready!
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Your AI interview will use these insights for personalized questions
                    </div>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => router.push('/interview/ai')}
                    style={{ padding: '10px 20px', fontSize: '0.85rem', flexShrink: 0 }}
                  >
                    <Brain size={14} style={{ display: 'inline', marginRight: 6 }} />
                    Start AI Interview
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="card-no-hover" style={{ padding: 32, marginBottom: 24 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Briefcase size={18} color="var(--accent-orange)" /> Technical Skills
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              These skills personalize your AI interview questions
              {resumeData && <span style={{ color: '#34d399' }}> • Auto-populated from resume</span>}
            </p>

            {/* Current skills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {form.skills.map(skill => (
                <span key={skill} className="badge badge-purple" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
                  {skill}
                  <button onClick={() => removeSkill(skill)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', marginLeft: 4, padding: 0, display: 'inline-flex' }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
              {form.skills.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No skills added yet — upload your resume to auto-detect!</span>}
            </div>

            {/* Add skill */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input className="input-field" value={newSkill} onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSkill(newSkill)}
                placeholder="Add a skill and press Enter" style={{ flex: 1 }} />
              <button className="btn-primary" onClick={() => addSkill(newSkill)} style={{ padding: '12px 20px', flexShrink: 0 }}>
                <Plus size={18} />
              </button>
            </div>

            {/* Suggestions */}
            <div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>Suggested skills:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SKILL_SUGGESTIONS.filter(s => !form.skills.includes(s)).slice(0, 12).map(s => (
                  <button key={s} onClick={() => addSkill(s)} className="btn-ghost" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Social links */}
          <div className="card-no-hover" style={{ padding: 32, marginBottom: 24 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Github size={18} color="var(--text-secondary)" /> Links
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>LinkedIn URL</label>
                <input className="input-field" value={form.linkedin} onChange={e => set('linkedin', e.target.value)} placeholder="linkedin.com/in/yourname" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>GitHub URL</label>
                <input className="input-field" value={form.github} onChange={e => set('github', e.target.value)} placeholder="github.com/yourname" />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={handleSave} style={{ padding: '14px 40px', fontSize: '1rem' }}>
              {saved ? '✓ Profile Saved!' : 'Save All Changes'}
            </button>
          </div>
        </div>
      </main>

      {/* CSS for spinner animation */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes progressPulse {
          0% { width: 0%; opacity: 0.8; }
          50% { width: 70%; opacity: 1; }
          100% { width: 100%; opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
