'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Brain, LayoutDashboard, BookOpen, Code2, Users, BarChart3,
  User, LogOut, ChevronRight, Zap, Settings, Bell
} from 'lucide-react';

const STUDENT_LINKS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/profile', icon: User, label: 'My Profile' },
  { href: '/aptitude', icon: BookOpen, label: 'Aptitude Quiz' },
  { href: '/interview/ai', icon: Code2, label: 'AI Interview' },
  { href: '/interview/book', icon: Users, label: 'Book Expert' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
];

const EXPERT_LINKS = [
  { href: '/expert/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/expert/availability', icon: Settings, label: 'Availability' },
  { href: '/expert/bookings', icon: Users, label: 'My Bookings' },
];

const ADMIN_LINKS = [
  { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/users', icon: Users, label: 'Users' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return null;

  const links = user.role === 'student' ? STUDENT_LINKS : user.role === 'expert' ? EXPERT_LINKS : ADMIN_LINKS;
  const roleColor = { student: '#a78bfa', expert: '#22d3ee', admin: '#f87171' }[user.role];
  const roleLabel = { student: 'Student', expert: 'Expert', admin: 'Admin' }[user.role];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Brain size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white' }}>Place<span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span></div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Placement Platform</div>
          </div>
        </div>
      </div>

      {/* User profile card */}
      <div style={{ padding: '16px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', color: 'white', flexShrink: 0 }}>
            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, color: 'white', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: roleColor }}>{roleLabel}</div>
          </div>
          <div className="pulse-dot" />
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {links.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && href !== '/expert/dashboard' && href !== '/admin' && pathname.startsWith(href));
          return (
            <button key={href} className={`sidebar-link ${isActive ? 'active' : ''}`} onClick={() => router.push(href)}>
              <Icon size={18} />
              <span>{label}</span>
              {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        <button className="sidebar-link" style={{ color: 'var(--accent-red)', width: '100%' }} onClick={() => { logout(); router.push('/'); }}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
