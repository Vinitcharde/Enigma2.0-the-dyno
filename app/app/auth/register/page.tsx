'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth-context';
import { Brain, ArrowLeft, GraduationCap, Briefcase } from 'lucide-react';

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<UserRole>('student');
  const [form, setForm] = useState({ name: '', email: '', password: '', college: '', company: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    const result = await register({ ...form, role });
    if (result.ok) {
      if (role === 'student') router.push('/dashboard');
      else router.push('/expert/dashboard');
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '20px' }}>
      <div className="blob blob-1" style={{ opacity: 0.08 }} />
      <div className="blob blob-2" style={{ opacity: 0.06 }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 500 }}>
        <button onClick={() => step === 2 ? setStep(1) : router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 32, fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> {step === 2 ? 'Back' : 'Back to home'}
        </button>

        <div className="card-no-hover" style={{ padding: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={22} color="white" />
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>Place<span className="gradient-text">AI</span></span>
          </div>

          {/* Progress */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
            {[1, 2].map(s => (
              <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= step ? 'var(--accent-purple)' : 'var(--border)', transition: 'background 0.3s' }} />
            ))}
          </div>

          {step === 1 ? (
            <>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: 6 }}>Join PlaceAI</h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: '0.95rem' }}>Choose your role to get started</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
                {([
                  { r: 'student', icon: GraduationCap, title: 'Student', desc: 'Practice interviews, take quizzes & book expert sessions' },
                  { r: 'expert', icon: Briefcase, title: 'Industry Expert', desc: 'Mentor students, conduct mock interviews & provide feedback' },
                ] as const).map(({ r, icon: Icon, title, desc }) => (
                  <button key={r} onClick={() => setRole(r)} style={{
                    padding: '20px', borderRadius: 14, border: `2px solid ${role === r ? 'var(--accent-purple)' : 'var(--border)'}`,
                    background: role === r ? 'rgba(124,58,237,0.1)' : 'var(--bg-card)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                  }}>
                    <Icon size={28} color={role === r ? '#a78bfa' : 'var(--text-secondary)'} style={{ marginBottom: 10 }} />
                    <div style={{ fontWeight: 700, color: 'white', marginBottom: 6, fontSize: '0.95rem' }}>{title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</div>
                  </button>
                ))}
              </div>

              <button className="btn-primary" onClick={() => setStep(2)} style={{ width: '100%', padding: '14px', fontSize: '1rem' }}>
                Continue as {role === 'student' ? 'Student' : 'Industry Expert'} →
              </button>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: 6 }}>Create Account</h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: '0.95rem' }}>
                Registering as <span style={{ color: '#a78bfa', fontWeight: 600 }}>{role === 'student' ? 'Student' : 'Industry Expert'}</span>
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Full Name</label>
                  <input className="input-field" type="text" placeholder="Your full name" value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Email</label>
                  <input className="input-field" type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
                </div>
                {role === 'student' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>College / University</label>
                    <input className="input-field" type="text" placeholder="e.g. IIT Bombay" value={form.college} onChange={e => set('college', e.target.value)} />
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Company</label>
                    <input className="input-field" type="text" placeholder="e.g. Google, Amazon" value={form.company} onChange={e => set('company', e.target.value)} />
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Password</label>
                  <input className="input-field" type="password" placeholder="Min. 6 characters" value={form.password} onChange={e => set('password', e.target.value)} required />
                </div>

                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', color: '#f87171' }}>
                    {error}
                  </div>
                )}

                <button type="submit" className="btn-primary" disabled={isLoading} style={{ padding: '14px', fontSize: '1rem', opacity: isLoading ? 0.7 : 1 }}>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            </>
          )}

          <p style={{ marginTop: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Already registered?{' '}
            <button onClick={() => router.push('/auth/login')} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontWeight: 600 }}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
