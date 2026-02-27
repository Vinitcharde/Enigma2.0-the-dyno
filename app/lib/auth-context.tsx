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
