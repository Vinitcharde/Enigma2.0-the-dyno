'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'student' | 'expert' | 'admin';

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
  register: (data: RegisterData) => Promise<boolean>;
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

// Mock users database
const MOCK_USERS: User[] = [
  {
    id: 'student-1',
    email: 'student@demo.com',
    name: 'Arjun Sharma',
    role: 'student',
    college: 'IIT Bombay',
    skills: ['Python', 'JavaScript', 'React', 'Node.js', 'SQL', 'Machine Learning'],
    targetRole: 'Full Stack Developer',
    cgpa: '8.7',
    graduationYear: '2025',
    phone: '+91 9876543210',
    bio: 'Passionate about building scalable web applications and exploring ML.',
    linkedin: 'https://linkedin.com/in/arjun-sharma',
    github: 'https://github.com/arjun-sharma',
  },
  {
    id: 'expert-1',
    email: 'expert@demo.com',
    name: 'Priya Mehta',
    role: 'expert',
    company: 'Google',
    skills: ['System Design', 'DSA', 'Machine Learning', 'Leadership'],
    bio: 'Senior SWE at Google with 8+ years experience. Passionate about mentoring.',
  },
  {
    id: 'admin-1',
    email: 'admin@demo.com',
    name: 'Platform Admin',
    role: 'admin',
  }
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('placeai_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1000)); // simulate API call
    const found = MOCK_USERS.find(u => u.email === email);
    if (found && password.length >= 6) {
      setUser(found);
      localStorage.setItem('placeai_user', JSON.stringify(found));
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    const newUser: User = {
      id: `${data.role}-${Date.now()}`,
      email: data.email,
      name: data.name,
      role: data.role,
      college: data.college,
      company: data.company,
      skills: [],
    };
    setUser(newUser);
    localStorage.setItem('placeai_user', JSON.stringify(newUser));
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('placeai_user');
  };

  const updateProfile = (data: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem('placeai_user', JSON.stringify(updated));
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
