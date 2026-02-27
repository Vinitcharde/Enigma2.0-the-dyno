'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Brain, Eye, EyeOff, ArrowLeft, Zap, ChevronDown, Users } from 'lucide-react';

const EXPERT_LOGINS = [
  // Full Stack
  { name: 'Priya Mehta', company: 'Google', domain: 'Full Stack', email: 'priya.mehta@expert.com', color: '#a78bfa' },
  { name: 'Rohit Jain', company: 'Flipkart', domain: 'Full Stack', email: 'rohit.jain@expert.com', color: '#22d3ee' },
  { name: 'Ananya Das', company: 'Atlassian', domain: 'Full Stack', email: 'ananya.das@expert.com', color: '#34d399' },
  // Backend
  { name: 'Arjun Kapoor', company: 'Amazon', domain: 'Backend', email: 'arjun.kapoor@expert.com', color: '#22d3ee' },
  { name: 'Karthik Rao', company: 'Uber', domain: 'Backend', email: 'karthik.rao@expert.com', color: '#f59e0b' },
  { name: 'Neha Gupta', company: 'Razorpay', domain: 'Backend', email: 'neha.gupta@expert.com', color: '#a78bfa' },
  // Data Science
  { name: 'Sneha Reddy', company: 'Microsoft', domain: 'Data Science', email: 'sneha.reddy@expert.com', color: '#34d399' },
  { name: 'Aditya Sharma', company: 'Meta', domain: 'Data Science', email: 'aditya.sharma@expert.com', color: '#a78bfa' },
  { name: 'Ritu Patel', company: 'Swiggy', domain: 'Data Science', email: 'ritu.patel@expert.com', color: '#f59e0b' },
  // ML
  { name: 'Vikram Iyer', company: 'NVIDIA', domain: 'ML', email: 'vikram.iyer@expert.com', color: '#22d3ee' },
  { name: 'Deepa Nair', company: 'DeepMind', domain: 'ML', email: 'deepa.nair@expert.com', color: '#34d399' },
  { name: 'Saurabh Verma', company: 'Amazon', domain: 'ML', email: 'saurabh.verma@expert.com', color: '#f59e0b' },
  // Frontend
  { name: 'Kavya Krishnan', company: 'Airbnb', domain: 'Frontend', email: 'kavya.krishnan@expert.com', color: '#a78bfa' },
  { name: 'Manish Tiwari', company: 'Razorpay', domain: 'Frontend', email: 'manish.tiwari@expert.com', color: '#22d3ee' },
  { name: 'Shruti Bose', company: 'Figma', domain: 'Frontend', email: 'shruti.bose@expert.com', color: '#34d399' },
  // DevOps
  { name: 'Rajesh Kumar', company: 'Netflix', domain: 'DevOps', email: 'rajesh.kumar@expert.com', color: '#f59e0b' },
  { name: 'Pooja Singh', company: 'AWS', domain: 'DevOps', email: 'pooja.singh@expert.com', color: '#a78bfa' },
  { name: 'Amit Desai', company: 'Zomato', domain: 'DevOps', email: 'amit.desai@expert.com', color: '#22d3ee' },
  // PM
  { name: 'Vikram Singh', company: 'Flipkart', domain: 'Product', email: 'vikram.singh@expert.com', color: '#f59e0b' },
  { name: 'Megha Arora', company: 'Google', domain: 'Product', email: 'megha.arora@expert.com', color: '#a78bfa' },
  { name: 'Nitin Bhatt', company: 'Cred', domain: 'Product', email: 'nitin.bhatt@expert.com', color: '#34d399' },
];

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [showExpertList, setShowExpertList] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = await login(email, password);
    if (!ok) {
      setError('Invalid credentials. Try demo accounts listed below.');
    } else {
      // Redirect based on role stored in context
      const stored = localStorage.getItem('placeai_user');
      const u = stored ? JSON.parse(stored) : null;
      router.push(u?.role === 'expert' ? '/expert/dashboard' : '/dashboard');
    }
  };

  // One-click student demo login
  const quickLogin = async () => {
    const ok = await login('student@demo.com', 'demo123');
    if (ok) router.push('/dashboard');
    else { setEmail('student@demo.com'); setPassword('demo123'); }
  };

  // One-click expert sign-in: no form fill, no button press, instantly redirect
  const quickExpertLogin = async (expertEmail: string) => {
    setShowExpertList(false);
    setError('');
    const ok = await login(expertEmail, 'demo123');
    if (ok) {
      router.push('/expert/dashboard');
    } else {
      setEmail(expertEmail);
      setPassword('demo123');
      setError('Auto-login failed. Click Sign In to try again.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div className="blob blob-1" style={{ opacity: 0.08 }} />
      <div className="blob blob-2" style={{ opacity: 0.06 }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 520, padding: '0 20px' }}>
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
              <button onClick={() => quickLogin()} className="btn-ghost" style={{ flex: 1, padding: '8px', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                <Zap size={12} style={{ marginRight: 4 }} /> Student
              </button>
            </div>
          </div>

          {/* Expert login dropdown */}
          <div style={{ marginBottom: 28, position: 'relative' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 500 }}>EXPERT LOGIN</p>
            <button
              onClick={() => setShowExpertList(!showExpertList)}
              className="btn-ghost"
              style={{ width: '100%', padding: '10px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={16} color="#a78bfa" />
                Select an Industry Expert ({EXPERT_LOGINS.length} available)
              </span>
              <ChevronDown size={16} style={{ transform: showExpertList ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {showExpertList && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                borderRadius: 12, marginTop: 4, maxHeight: 320, overflowY: 'auto',
                boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
              }}>
                {['Full Stack', 'Backend', 'Data Science', 'ML', 'Frontend', 'DevOps', 'Product'].map(domain => (
                  <div key={domain}>
                    <div style={{ padding: '8px 14px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                      {domain}
                    </div>
                    {EXPERT_LOGINS.filter(e => e.domain === domain).map(expert => (
                      <button
                        key={expert.email}
                        onClick={() => quickExpertLogin(expert.email)}
                        style={{
                          width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                          padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(167,139,250,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: `linear-gradient(135deg, ${expert.color}, ${expert.color}88)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.75rem', color: 'white', flexShrink: 0,
                        }}>
                          {expert.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600 }}>{expert.name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{expert.company} &middot; {expert.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
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
            <button onClick={() => router.push('/auth/register')} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontWeight: 600 }}>Register free</button>
          </p>
        </div>
      </div>
    </div>
  );
}
