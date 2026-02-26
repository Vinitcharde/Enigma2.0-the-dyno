'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Brain, Eye, EyeOff, ArrowLeft, Zap } from 'lucide-react';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = await login(email, password);
    if (!ok) {
      setError('Invalid credentials. Try demo accounts listed below.');
    }
  };

  const quickLogin = (type: 'student' | 'expert' | 'admin') => {
    setEmail(`${type}@demo.com`);
    setPassword('demo123');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div className="blob blob-1" style={{ opacity: 0.08 }} />
      <div className="blob blob-2" style={{ opacity: 0.06 }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460, padding: '0 20px' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 32, fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> Back to home
        </button>

        <div className="card-no-hover" style={{ padding: 40 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={22} color="white" />
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>Place<span className="gradient-text">AI</span></span>
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: 6 }}>Welcome back</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: '0.95rem' }}>Sign in to continue your placement journey</p>

          {/* Quick login buttons */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 500 }}>QUICK ACCESS</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['student', 'expert', 'admin'] as const).map(role => (
                <button key={role} onClick={() => quickLogin(role)} className="btn-ghost" style={{ flex: 1, padding: '8px', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                  {role}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Email</label>
              <input className="input-field" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input className="input-field" type={showPass ? 'text' : 'password'} placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: 48 }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: '0.85rem', color: '#f87171' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={isLoading} style={{ width: '100%', padding: '14px', fontSize: '1rem', opacity: isLoading ? 0.7 : 1 }}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{ marginTop: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No account?{' '}
            <button onClick={() => router.push('/auth/register')} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontWeight: 600 }}>
              Register free
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
