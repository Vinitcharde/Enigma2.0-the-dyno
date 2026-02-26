'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Brain, Zap, Users, BarChart3, Code2, Mic, Shield, Star,
  ChevronRight, Play, CheckCircle, ArrowRight, Globe, Target,
  BookOpen, Award, TrendingUp, MessageSquare, Cpu, Lock
} from 'lucide-react';

const FEATURES = [
  {
    icon: Brain,
    title: 'AI Interview Simulation',
    desc: 'GPT-powered personalized DSA, system design & behavioral questions based on your resume.',
    color: 'var(--accent-purple)',
    bg: 'rgba(124,58,237,0.1)',
  },
  {
    icon: Code2,
    title: 'Live Coding Environment',
    desc: 'Monaco Editor with 10+ languages, real-time execution via Judge0, and complexity analysis.',
    color: 'var(--accent-blue)',
    bg: 'rgba(37,99,235,0.1)',
  },
  {
    icon: Mic,
    title: 'Voice AI Evaluation',
    desc: 'Speak your answers. AI scores clarity, logical structure, confidence, and depth in real-time.',
    color: 'var(--accent-cyan)',
    bg: 'rgba(6,182,212,0.1)',
  },
  {
    icon: Users,
    title: 'Human Expert Interviews',
    desc: 'Book mock interviews with verified industry professionals from top tech companies.',
    color: 'var(--accent-green)',
    bg: 'rgba(16,185,129,0.1)',
  },
  {
    icon: BarChart3,
    title: 'Aptitude Analytics',
    desc: 'Timed quizzes with section-wise accuracy, weak area detection & job role recommendations.',
    color: 'var(--accent-orange)',
    bg: 'rgba(245,158,11,0.1)',
  },
  {
    icon: Shield,
    title: 'Anti-Cheat System',
    desc: 'Tab switch detection, fullscreen enforcement, and session monitoring for fair assessment.',
    color: 'var(--accent-red)',
    bg: 'rgba(239,68,68,0.1)',
  },
];

const STATS = [
  { value: '50K+', label: 'Students Placed', icon: Users },
  { value: '98%', label: 'Success Rate', icon: Star },
  { value: '500+', label: 'Expert Mentors', icon: Award },
  { value: '2M+', label: 'Questions Solved', icon: Code2 },
];

const TESTIMONIALS = [
  {
    name: 'Rahul Verma',
    role: 'SDE @ Amazon',
    text: "PlaceAI's AI interview simulation felt exactly like the real thing. Got placed in 3 weeks of prep!",
    avatar: 'RV',
    rating: 5,
  },
  {
    name: 'Sneha Patel',
    role: 'Data Scientist @ Google',
    text: 'The aptitude analytics identified my weak areas precisely. The recommendation engine suggested the perfect role for me.',
    avatar: 'SP',
    rating: 5,
  },
  {
    name: 'Karthik Nair',
    role: 'Product Manager @ Microsoft',
    text: 'Expert mock interviews were game-changing. Real feedback from real professionals made all the difference.',
    avatar: 'KN',
    rating: 5,
  },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Build Your Profile', desc: 'Upload your resume, add your skills, and set your target role. Our AI parses and personalizes everything.' },
  { step: '02', title: 'Assess Your Strengths', desc: 'Take timed aptitude quizzes across Quantitative, Logical & Verbal sections. Get instant analytics.' },
  { step: '03', title: 'Practice with AI', desc: 'Start AI interview sessions with personalized questions. Code, speak, and get real-time feedback.' },
  { step: '04', title: 'Book Expert Review', desc: 'Schedule mock interviews with industry experts who see your full profile and performance history.' },
];

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      if (user.role === 'student') router.push('/dashboard');
      else if (user.role === 'expert') router.push('/expert/dashboard');
      else router.push('/admin');
    }
  }, [user, router]);

  if (user) return null;

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Animated background */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {/* Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '16px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrollY > 50 ? 'rgba(10,10,15,0.95)' : 'transparent',
        backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
        borderBottom: scrollY > 50 ? '1px solid var(--border)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Brain size={20} color="white" />
          </div>
          <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'white' }}>
            Place<span className="gradient-text">AI</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => router.push('/auth/login')}
            style={{ padding: '10px 22px', fontSize: '0.9rem' }}>
            Sign In
          </button>
          <button className="btn-primary" onClick={() => router.push('/auth/register')}
            style={{ padding: '10px 22px', fontSize: '0.9rem' }}>
            Get Started <ArrowRight size={16} style={{ display: 'inline', marginLeft: 4 }} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ position: 'relative', zIndex: 1, paddingTop: 160, paddingBottom: 100, textAlign: 'center', padding: '160px 40px 100px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="badge badge-purple" style={{ marginBottom: 24, fontSize: '0.85rem', padding: '6px 16px' }}>
            <Zap size={14} /> AI-Powered Placement Platform
          </div>
          <h1 style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 24, color: 'white' }}>
            Master Interviews with <br />
            <span className="gradient-text">Real AI Intelligence</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: 680, margin: '0 auto 40px', lineHeight: 1.7 }}>
            The only platform that combines AI-driven technical simulations, voice evaluation, live coding, 
            and human expert mock interviews—all personalized to your resume and career goals.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => router.push('/auth/register')}
              style={{ padding: '16px 36px', fontSize: '1.05rem', gap: 8, display: 'flex', alignItems: 'center' }}>
              <Play size={18} /> Start Free Today
            </button>
            <button className="btn-secondary" onClick={() => router.push('/auth/login')}
              style={{ padding: '16px 36px', fontSize: '1.05rem' }}>
              View Demo →
            </button>
          </div>

          {/* Demo credentials hint */}
          <div style={{
            marginTop: 32, padding: '12px 24px', borderRadius: 10,
            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
            display: 'inline-block', fontSize: '0.85rem', color: 'var(--text-secondary)',
          }}>
            <span style={{ color: '#a78bfa', fontWeight: 600 }}>Demo Credentials: </span>
            student@demo.com / expert@demo.com / admin@demo.com (any 6+ char password)
          </div>
        </div>

        {/* Hero visual */}
        <div style={{ marginTop: 80, maxWidth: 1000, margin: '80px auto 0', position: 'relative' }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 24, boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}>
            {/* Mock interface preview */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* Sidebar preview */}
              <div style={{ width: 160, background: 'var(--bg-secondary)', borderRadius: 12, padding: 12, flexShrink: 0 }}>
                {['Dashboard', 'Aptitude', 'AI Interview', 'Book Expert', 'Analytics'].map((item, i) => (
                  <div key={item} style={{
                    padding: '8px 12px', borderRadius: 8, marginBottom: 4, fontSize: '0.8rem',
                    background: i === 2 ? 'rgba(124,58,237,0.2)' : 'transparent',
                    color: i === 2 ? '#a78bfa' : 'var(--text-secondary)',
                    fontWeight: i === 2 ? 600 : 400,
                  }}>{item}</div>
                ))}
              </div>
              {/* Main content preview */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white', marginBottom: 12 }}>
                  🤖 AI Interview Session — Full Stack Developer
                </div>
                <div className="chat-bubble-ai" style={{ marginBottom: 12, fontSize: '0.85rem' }}>
                  <span style={{ color: '#a78bfa', fontWeight: 600 }}>AI Interviewer: </span>
                  Design a URL shortener like bit.ly. Walk me through your system architecture and database schema.
                </div>
                <div style={{
                  background: '#0d1117', borderRadius: 10, padding: 16, fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.8rem', color: '#e6edf3', border: '1px solid var(--border)',
                }}>
                  <div style={{ color: '#79c0ff' }}>class <span style={{ color: '#ffa657' }}>URLShortener</span>:</div>
                  <div style={{ color: '#a5d6ff', paddingLeft: 16 }}>def <span style={{ color: '#d2a8ff' }}>shorten</span>(self, url: str) → str:</div>
                  <div style={{ color: '#e6edf3', paddingLeft: 32 }}>hash_id = self.generate_hash(url)</div>
                  <div style={{ color: '#e6edf3', paddingLeft: 32 }}>self.db.store(hash_id, url)</div>
                  <div style={{ color: '#e6edf3', paddingLeft: 32 }}>return f&quot;bit.ly/{'{hash_id}'}&quot;</div>
                </div>
                {/* Score preview */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {[['Technical', '87%', '#a78bfa'], ['Communication', '92%', '#22d3ee'], ['Optimization', '78%', '#34d399']].map(([label, val, color]) => (
                    <div key={label} style={{
                      flex: 1, background: 'var(--bg-secondary)', borderRadius: 8,
                      padding: '8px 12px', border: '1px solid var(--border)', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{val}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {STATS.map(({ value, label, icon: Icon }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <Icon size={28} style={{ color: 'var(--accent-purple)', marginBottom: 8 }} />
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', marginBottom: 12 }}>
              Everything you need to get <span className="gradient-text">placed</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
              One platform. Six superpowers. Infinite possibilities.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="card" style={{ padding: 28 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, background: bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
                  border: `1px solid ${color}30`,
                }}>
                  <Icon size={26} color={color} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 40px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', marginBottom: 12 }}>
              How it <span className="gradient-text">works</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
              <div key={step} style={{ position: 'relative' }}>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div style={{
                    position: 'absolute', top: 24, right: -12, zIndex: 1,
                    width: 24, height: 1, background: 'var(--border-light)',
                  }} />
                )}
                <div style={{
                  width: 48, height: 48, borderRadius: 12, marginBottom: 16,
                  background: 'var(--gradient-primary)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '1rem', color: 'white',
                  boxShadow: 'var(--glow-purple)',
                }}>{step}</div>
                <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 8, fontSize: '1rem' }}>{title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 40px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'white', marginBottom: 12 }}>
              Success <span className="gradient-text">stories</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {TESTIMONIALS.map(({ name, role, text, avatar, rating }) => (
              <div key={name} className="card" style={{ padding: 28 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} size={16} style={{ fill: '#fbbf24', color: '#fbbf24' }} />
                  ))}
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
                  &ldquo;{text}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', background: 'var(--gradient-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.85rem', color: 'white',
                  }}>{avatar}</div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>{name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 40px 100px', textAlign: 'center' }}>
        <div style={{
          maxWidth: 700, margin: '0 auto',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 24, padding: '60px 40px',
        }}>
          <div className="badge badge-purple" style={{ marginBottom: 20, fontSize: '0.85rem' }}>
            <Zap size={14} /> Limited Beta Access
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'white', marginBottom: 16 }}>
            Ready to ace your <br /><span className="gradient-text">next interview?</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 36, fontSize: '1rem', lineHeight: 1.7 }}>
            Join 50,000+ students who are transforming their placement journey with PlaceAI.
          </p>
          <button className="btn-primary" onClick={() => router.push('/auth/register')}
            style={{ padding: '16px 48px', fontSize: '1.05rem' }}>
            Start Free — No Credit Card Required
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid var(--border)', padding: '32px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Brain size={20} color="var(--accent-purple)" />
          <span style={{ fontWeight: 700, color: 'white' }}>PlaceAI</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          © 2026 PlaceAI. Built for placement excellence.
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <span style={{ cursor: 'pointer' }}>Privacy</span>
          <span style={{ cursor: 'pointer' }}>Terms</span>
          <span style={{ cursor: 'pointer' }}>Contact</span>
        </div>
      </footer>
    </div>
  );
}
