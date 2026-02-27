'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'student' | 'expert';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  college?: string;
  company?: string;
  skills?: string[];
  targetRole?: string;
  cgpa?: string;
  graduationYear?: string;
  phone?: string;
  bio?: string;
  linkedin?: string;
  github?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role?: UserRole) => Promise<boolean>;
  register: (data: RegisterData) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  isLoading: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  college?: string;
  company?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Demo user bypass ─────────────────────────────────────────────────────────
// These accounts are resolved instantly (no DB round-trip) when password = 'demo123'
const DEMO_USERS: Record<string, User> = {
  'student@demo.com': { id: 'student-demo', email: 'student@demo.com', name: 'Demo Student', role: 'student', college: 'IIT Bombay', skills: ['React', 'Python', 'SQL'] },
  // Full Stack
  'priya.mehta@expert.com':   { id: 'expert-priya.mehta',   email: 'priya.mehta@expert.com',   name: 'Priya Mehta',   role: 'expert', company: 'Google',     bio: '8+ years at Google. Ex-interviewer. Full Stack expert.' },
  'rohit.jain@expert.com':    { id: 'expert-rohit.jain',    email: 'rohit.jain@expert.com',    name: 'Rohit Jain',    role: 'expert', company: 'Flipkart',   bio: 'Staff Engineer at Flipkart. Full stack, 6+ years.' },
  'ananya.das@expert.com':    { id: 'expert-ananya.das',    email: 'ananya.das@expert.com',    name: 'Ananya Das',    role: 'expert', company: 'Atlassian',  bio: 'Tech Lead at Atlassian. MERN, GraphQL, AWS.' },
  // Backend
  'arjun.kapoor@expert.com':  { id: 'expert-arjun.kapoor',  email: 'arjun.kapoor@expert.com',  name: 'Arjun Kapoor',  role: 'expert', company: 'Amazon',     bio: 'Amazon L7. Distributed systems, bar-raiser.' },
  'karthik.rao@expert.com':   { id: 'expert-karthik.rao',   email: 'karthik.rao@expert.com',   name: 'Karthik Rao',   role: 'expert', company: 'Uber',       bio: '5+ years at Uber. Go, Kafka, System Design.' },
  'neha.gupta@expert.com':    { id: 'expert-neha.gupta',    email: 'neha.gupta@expert.com',    name: 'Neha Gupta',    role: 'expert', company: 'Razorpay',   bio: 'EM at Razorpay. Python, PostgreSQL, Docker.' },
  // Data Science
  'sneha.reddy@expert.com':   { id: 'expert-sneha.reddy',   email: 'sneha.reddy@expert.com',   name: 'Sneha Reddy',   role: 'expert', company: 'Microsoft',  bio: 'Azure AI. DS Lead. ML & Statistics.' },
  'aditya.sharma@expert.com': { id: 'expert-aditya.sharma', email: 'aditya.sharma@expert.com', name: 'Aditya Sharma', role: 'expert', company: 'Meta',       bio: 'Staff DS at Meta. Deep Learning, NLP.' },
  'ritu.patel@expert.com':    { id: 'expert-ritu.patel',    email: 'ritu.patel@expert.com',    name: 'Ritu Patel',    role: 'expert', company: 'Swiggy',     bio: 'Senior DS at Swiggy. Demand forecasting, SQL.' },
  // ML
  'vikram.iyer@expert.com':   { id: 'expert-vikram.iyer',   email: 'vikram.iyer@expert.com',   name: 'Vikram Iyer',   role: 'expert', company: 'NVIDIA',     bio: 'ML Infra Lead at NVIDIA. PyTorch, CUDA, MLOps.' },
  'deepa.nair@expert.com':    { id: 'expert-deepa.nair',    email: 'deepa.nair@expert.com',    name: 'Deepa Nair',    role: 'expert', company: 'DeepMind',   bio: 'Research Engineer at DeepMind. 15+ ML papers.' },
  'saurabh.verma@expert.com': { id: 'expert-saurabh.verma', email: 'saurabh.verma@expert.com', name: 'Saurabh Verma', role: 'expert', company: 'Amazon',     bio: 'Applied Scientist at Amazon. NLP, SageMaker.' },
  // Frontend
  'kavya.krishnan@expert.com':{ id: 'expert-kavya.krishnan',email: 'kavya.krishnan@expert.com',name: 'Kavya Krishnan',role: 'expert', company: 'Airbnb',     bio: 'Senior FE at Airbnb. React, CSS, Performance.' },
  'manish.tiwari@expert.com': { id: 'expert-manish.tiwari', email: 'manish.tiwari@expert.com', name: 'Manish Tiwari', role: 'expert', company: 'Razorpay',   bio: 'Frontend Lead at Razorpay. Next.js, TypeScript.' },
  'shruti.bose@expert.com':   { id: 'expert-shruti.bose',   email: 'shruti.bose@expert.com',   name: 'Shruti Bose',   role: 'expert', company: 'Figma',      bio: 'Staff Engineer at Figma. WebGL, Canvas.' },
  // DevOps
  'rajesh.kumar@expert.com':  { id: 'expert-rajesh.kumar',  email: 'rajesh.kumar@expert.com',  name: 'Rajesh Kumar',  role: 'expert', company: 'Netflix',    bio: 'Senior SRE at Netflix. Kubernetes, Terraform.' },
  'pooja.singh@expert.com':   { id: 'expert-pooja.singh',   email: 'pooja.singh@expert.com',   name: 'Pooja Singh',   role: 'expert', company: 'AWS',        bio: 'Solutions Architect at AWS. CloudFormation, Security.' },
  'amit.desai@expert.com':    { id: 'expert-amit.desai',    email: 'amit.desai@expert.com',    name: 'Amit Desai',    role: 'expert', company: 'Zomato',     bio: 'Platform Engineer at Zomato. Docker, Prometheus.' },
  // Product
  'vikram.singh@expert.com':  { id: 'expert-vikram.singh',  email: 'vikram.singh@expert.com',  name: 'Vikram Singh',  role: 'expert', company: 'Flipkart',   bio: 'Director of Product at Flipkart. IIM-A.' },
  'megha.arora@expert.com':   { id: 'expert-megha.arora',   email: 'megha.arora@expert.com',   name: 'Megha Arora',   role: 'expert', company: 'Google',     bio: 'Group PM at Google. 500M+ user products.' },
  'nitin.bhatt@expert.com':   { id: 'expert-nitin.bhatt',   email: 'nitin.bhatt@expert.com',   name: 'Nitin Bhatt',   role: 'expert', company: 'Cred',       bio: 'Senior PM at CRED. Fintech, 0-to-1 products.' },
};

async function dbFetch(action: string, body?: Record<string, any>) {
  if (body) {
    const res = await fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) });
    return res;
  }
  return fetch(`/api/db?action=${action}`);
}

// Read cached user synchronously so there is zero loading flash
function readCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('placeai_user');
    return stored ? (JSON.parse(stored) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize synchronously from localStorage — no spinner on mount
  const [user, setUser] = useState<User | null>(readCachedUser);
  const [isLoading, setIsLoading] = useState(false); // never block on start

  // No background DB re-fetch — localStorage is the source of truth.
  // Profile updates already write back to DB via updateProfile().
  useEffect(() => {}, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // ── Demo fast-path: instant login, no Supabase call ──────────────────
    const demoUser = DEMO_USERS[email.toLowerCase().trim()];
    if (demoUser && password === 'demo123') {
      localStorage.setItem('placeai_user', JSON.stringify(demoUser));
      setUser(demoUser);
      return true;
    }
    // ── Real DB login ─────────────────────────────────────────────────────
    setIsLoading(true);
    try {
      const res = await dbFetch('login', { email, password });
      if (!res.ok) { setIsLoading(false); return false; }
      const data = await res.json();
      if (!data || !data.id) { setIsLoading(false); return false; }
      const mapped: User = {
        id: data.id, email: data.email, name: data.name, role: data.role,
        avatar: data.avatar, college: data.college, company: data.company,
        skills: data.skills || [], targetRole: data.targetRole, cgpa: data.cgpa,
        graduationYear: data.graduationYear, phone: data.phone, bio: data.bio,
        linkedin: data.linkedin, github: data.github,
      };
      // Write to localStorage BEFORE setUser so any redirect sees it instantly
      localStorage.setItem('placeai_user', JSON.stringify(mapped));
      setUser(mapped);
      setIsLoading(false);
      return true;
    } catch {
      setIsLoading(false);
      return false;
    }
  };

  const register = async (data: RegisterData): Promise<{ ok: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await dbFetch('register', {
        id: `${data.role}-${Date.now()}`,
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role,
        college: data.college,
        company: data.company,
      });
      const body = await res.json();
      if (!res.ok) {
        setIsLoading(false);
        return { ok: false, error: body?.error || 'Registration failed. Please try again.' };
      }
      if (!body || !body.id) {
        setIsLoading(false);
        return { ok: false, error: 'Registration failed. Please try again.' };
      }
      const mapped: User = {
        id: body.id, email: body.email, name: body.name, role: body.role,
        college: body.college, company: body.company, skills: [],
      };
      setUser(mapped);
      localStorage.setItem('placeai_user', JSON.stringify(mapped));
      setIsLoading(false);
      return { ok: true };
    } catch (err: any) {
      setIsLoading(false);
      return { ok: false, error: err?.message || 'Network error. Please check your connection.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('placeai_user');
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem('placeai_user', JSON.stringify(updated));
    // Persist to DB
    try {
      await dbFetch('updateProfile', { email: user.email, data });
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
