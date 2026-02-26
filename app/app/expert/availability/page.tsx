'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';

const NEXT_3_DAYS = [
  { date: '2026-02-27', label: 'Thursday, Feb 27' },
  { date: '2026-02-28', label: 'Friday, Feb 28' },
  { date: '2026-03-01', label: 'Saturday, Mar 1' },
];
const TIME_SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'];

export default function AvailabilityPage() {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<Record<string, Set<string>>>({
    '2026-02-27': new Set(['09:00 AM', '11:00 AM', '03:00 PM', '05:00 PM']),
    '2026-02-28': new Set(['10:00 AM', '02:00 PM', '07:00 PM']),
    '2026-03-01': new Set(['09:00 AM', '11:00 AM', '01:00 PM', '04:00 PM']),
  });
  const [saved, setSaved] = useState(false);

  const toggle = (date: string, time: string) => {
    setAvailability(prev => {
      const copy = { ...prev };
      const set = new Set(copy[date] || []);
      set.has(time) ? set.delete(time) : set.add(time);
      copy[date] = set;
      return copy;
    });
    setSaved(false);
  };

  if (!user || user.role !== 'expert') return null;

  const totalSlots = Object.values(availability).reduce((acc, s) => acc + s.size, 0);

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '32px 36px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: 6 }}>Manage Availability</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Toggle your available slots for the next 3 days. Students will see green slots for booking.</p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: 600 }}>{totalSlots} slots marked available</span>
              <button className="btn-primary" onClick={() => setSaved(true)} style={{ padding: '10px 24px' }}>
                {saved ? '✓ Saved' : 'Save Availability'}
              </button>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 24, fontSize: '0.82rem' }}>
            {[
              { color: 'rgba(16,185,129,0.4)', label: 'Available (click to toggle off)' },
              { color: 'rgba(255,255,255,0.08)', label: 'Unavailable (click to mark available)' },
              { color: 'rgba(239,68,68,0.3)', label: 'Already booked (cannot change)' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: color, border: '1px solid rgba(255,255,255,0.1)' }} />
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {NEXT_3_DAYS.map(({ date, label }) => (
              <div key={date} style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>{label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: 4 }}>
                    {availability[date]?.size || 0} slots available
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {TIME_SLOTS.map(time => {
                    const isAvail = availability[date]?.has(time);
                    const isBooked = (date === '2026-02-27' && time === '11:00 AM') || (date === '2026-02-28' && time === '02:00 PM');
                    return (
                      <button key={time} onClick={() => !isBooked && toggle(date, time)} disabled={isBooked} style={{
                        padding: '10px 14px', borderRadius: 8, cursor: isBooked ? 'not-allowed' : 'pointer',
                        border: `1px solid ${isBooked ? 'rgba(239,68,68,0.4)' : isAvail ? 'rgba(16,185,129,0.5)' : 'var(--border)'}`,
                        background: isBooked ? 'rgba(239,68,68,0.12)' : isAvail ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.02)',
                        color: isBooked ? '#f87171' : isAvail ? '#34d399' : 'var(--text-muted)',
                        fontSize: '0.82rem', fontWeight: isAvail ? 600 : 400, transition: 'all 0.15s',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span>{time}</span>
                        {isBooked && <span style={{ fontSize: '0.7rem' }}>BOOKED</span>}
                        {!isBooked && isAvail && <span style={{ fontSize: '0.7rem' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, padding: '16px 20px', borderRadius: 10, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <span style={{ color: '#a78bfa', fontWeight: 600 }}>Note: </span>
            Availability resets every day at midnight. Students can book 1-hour slots from your available times. Booked slots are locked even if you try to un-mark them. Changes take effect immediately after saving.
          </div>
        </div>
      </main>
    </div>
  );
}
