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
    id: 'admin-1',
    email: 'admin@demo.com',
    name: 'Platform Admin',
    role: 'admin',
  },
  // ── Full Stack Developer Experts ────────────────────────────────────
  {
    id: 'expert-fs1',
    email: 'priya.mehta@expert.com',
    name: 'Priya Mehta',
    role: 'expert',
    company: 'Google',
    skills: ['React', 'Node.js', 'System Design'],
    bio: '8+ years at Google. Ex-interviewer for 3 years. Built multiple full-stack products used by millions.',
  },
  {
    id: 'expert-fs2',
    email: 'rohit.jain@expert.com',
    name: 'Rohit Jain',
    role: 'expert',
    company: 'Flipkart',
    skills: ['Next.js', 'TypeScript', 'Microservices'],
    bio: 'Staff Engineer at Flipkart. Full stack expert with 6+ years. Mentored 200+ students.',
  },
  {
    id: 'expert-fs3',
    email: 'ananya.das@expert.com',
    name: 'Ananya Das',
    role: 'expert',
    company: 'Atlassian',
    skills: ['MERN Stack', 'GraphQL', 'AWS'],
    bio: 'Tech Lead at Atlassian. Specializes in scalable full-stack architectures and cloud deployments.',
  },
  // ── Backend Engineer Experts ────────────────────────────────────────
  {
    id: 'expert-be1',
    email: 'arjun.kapoor@expert.com',
    name: 'Arjun Kapoor',
    role: 'expert',
    company: 'Amazon',
    skills: ['Distributed Systems', 'Java', 'AWS'],
    bio: 'Amazon L7. Expert in distributed systems and leadership principles. Bar-raiser interviewer.',
  },
  {
    id: 'expert-be2',
    email: 'karthik.rao@expert.com',
    name: 'Karthik Rao',
    role: 'expert',
    company: 'Uber',
    skills: ['Go', 'Kafka', 'System Design'],
    bio: '5+ years at Uber. Specializes in high-throughput backend systems and real-time data pipelines.',
  },
  {
    id: 'expert-be3',
    email: 'neha.gupta@expert.com',
    name: 'Neha Gupta',
    role: 'expert',
    company: 'Razorpay',
    skills: ['Python', 'PostgreSQL', 'Docker'],
    bio: 'EM at Razorpay. Built payment infrastructure handling millions of transactions daily.',
  },
  // ── Data Scientist Experts ──────────────────────────────────────────
  {
    id: 'expert-ds1',
    email: 'sneha.reddy@expert.com',
    name: 'Sneha Reddy',
    role: 'expert',
    company: 'Microsoft',
    skills: ['Python', 'ML', 'Statistics'],
    bio: 'Azure AI team. Hired 50+ data scientists. Strong background in applied ML and statistics.',
  },
  {
    id: 'expert-ds2',
    email: 'aditya.sharma@expert.com',
    name: 'Aditya Sharma',
    role: 'expert',
    company: 'Meta',
    skills: ['Deep Learning', 'NLP', 'A/B Testing'],
    bio: 'Staff DS at Meta. Led recommendation systems impacting 2B+ users. PhD in ML from Stanford.',
  },
  {
    id: 'expert-ds3',
    email: 'ritu.patel@expert.com',
    name: 'Ritu Patel',
    role: 'expert',
    company: 'Swiggy',
    skills: ['Demand Forecasting', 'SQL', 'Tableau'],
    bio: 'Senior DS at Swiggy. Expert in supply-demand optimization and business analytics.',
  },
  // ── ML Engineer Experts ─────────────────────────────────────────────
  {
    id: 'expert-ml1',
    email: 'vikram.iyer@expert.com',
    name: 'Vikram Iyer',
    role: 'expert',
    company: 'NVIDIA',
    skills: ['PyTorch', 'CUDA', 'MLOps'],
    bio: 'ML Infra Lead at NVIDIA. Expert in training large-scale models and GPU optimization.',
  },
  {
    id: 'expert-ml2',
    email: 'deepa.nair@expert.com',
    name: 'Deepa Nair',
    role: 'expert',
    company: 'Google DeepMind',
    skills: ['TensorFlow', 'Reinforcement Learning', 'Computer Vision'],
    bio: 'Research Engineer at DeepMind. Published 15+ papers in top-tier ML conferences.',
  },
  {
    id: 'expert-ml3',
    email: 'saurabh.verma@expert.com',
    name: 'Saurabh Verma',
    role: 'expert',
    company: 'Amazon Science',
    skills: ['Feature Engineering', 'SageMaker', 'NLP'],
    bio: 'Applied Scientist at Amazon. Built production ML systems for Alexa and recommendation engines.',
  },
  // ── Frontend Developer Experts ──────────────────────────────────────
  {
    id: 'expert-fe1',
    email: 'kavya.krishnan@expert.com',
    name: 'Kavya Krishnan',
    role: 'expert',
    company: 'Airbnb',
    skills: ['React', 'CSS Architecture', 'Performance'],
    bio: 'Senior FE at Airbnb. Expert in design systems, accessibility, and web performance optimization.',
  },
  {
    id: 'expert-fe2',
    email: 'manish.tiwari@expert.com',
    name: 'Manish Tiwari',
    role: 'expert',
    company: 'Razorpay',
    skills: ['Next.js', 'TypeScript', 'Testing'],
    bio: 'Frontend Lead at Razorpay. Built checkout SDK used by 8M+ merchants. TDD advocate.',
  },
  {
    id: 'expert-fe3',
    email: 'shruti.bose@expert.com',
    name: 'Shruti Bose',
    role: 'expert',
    company: 'Figma',
    skills: ['WebGL', 'Canvas', 'State Management'],
    bio: 'Staff Engineer at Figma. Expert in rendering engines and complex interactive web applications.',
  },
  // ── DevOps Engineer Experts ─────────────────────────────────────────
  {
    id: 'expert-do1',
    email: 'rajesh.kumar@expert.com',
    name: 'Rajesh Kumar',
    role: 'expert',
    company: 'Netflix',
    skills: ['Kubernetes', 'Terraform', 'CI/CD'],
    bio: 'Senior SRE at Netflix. Manages infrastructure serving 200M+ subscribers globally.',
  },
  {
    id: 'expert-do2',
    email: 'pooja.singh@expert.com',
    name: 'Pooja Singh',
    role: 'expert',
    company: 'AWS',
    skills: ['AWS', 'CloudFormation', 'Security'],
    bio: 'Solutions Architect at AWS. Helped 100+ enterprises migrate to cloud. AWS certified x5.',
  },
  {
    id: 'expert-do3',
    email: 'amit.desai@expert.com',
    name: 'Amit Desai',
    role: 'expert',
    company: 'Zomato',
    skills: ['Docker', 'Prometheus', 'Linux'],
    bio: 'Platform Engineer at Zomato. Built monitoring and deployment pipelines for 500+ microservices.',
  },
  // ── Product Manager Experts ─────────────────────────────────────────
  {
    id: 'expert-pm1',
    email: 'vikram.singh@expert.com',
    name: 'Vikram Singh',
    role: 'expert',
    company: 'Flipkart',
    skills: ['Product Strategy', 'Analytics', 'UX'],
    bio: 'Director of Product at Flipkart. Led grocery vertical from 0 to $1B GMV. IIM-A graduate.',
  },
  {
    id: 'expert-pm2',
    email: 'megha.arora@expert.com',
    name: 'Megha Arora',
    role: 'expert',
    company: 'Google',
    skills: ['Data Products', 'Growth', 'Roadmapping'],
    bio: 'Group PM at Google. Led products used by 500M+ users. Expert in data-driven product decisions.',
  },
  {
    id: 'expert-pm3',
    email: 'nitin.bhatt@expert.com',
    name: 'Nitin Bhatt',
    role: 'expert',
    company: 'Cred',
    skills: ['Fintech', 'User Research', 'GTM Strategy'],
    bio: 'Senior PM at CRED. Built credit card rewards platform. Strong in 0-to-1 product building.',
  },
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
