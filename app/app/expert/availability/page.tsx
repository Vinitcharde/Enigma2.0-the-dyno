'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';

// Always dynamic — never hardcode dates
const NEXT_3_DAYS = (() => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      date: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    });
  }
  return days;
})();
const TIME_SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'];

function isSlotExpired(date: string, time: string): boolean {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  if (date < today) return true;
  if (date > today) return false;
  const [timePart, meridiem] = time.split(' ');
  const [h, m] = timePart.split(':').map(Number);
  let hour24 = h;
  if (meridiem === 'PM' && h !== 12) hour24 = h + 12;
  if (meridiem === 'AM' && h === 12) hour24 = 0;
  const slotTime = new Date();
  slotTime.setHours(hour24, m, 0, 0);
  return now >= slotTime;
}

export default function AvailabilityPage() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [availability, setAvailability] = useState<Record<string, Set<string>>>(
    NEXT_3_DAYS.reduce((acc, { date }) => ({ ...acc, [date]: new Set<string>() }), {})
  );
  const [saved, setSaved] = useState(false);

  const toggle = (date: string, time: string) => {
    if (isSlotExpired(date, time)) return; // block expired
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
          <div style={{ display: 'flex', gap: 20, marginBottom: 24, fontSize: '0.82rem', flexWrap: 'wrap' }}>
            {[
              { color: 'rgba(16,185,129,0.4)', border: 'rgba(16,185,129,0.5)', label: 'Available (click to toggle off)' },
              { color: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)', label: 'Unavailable (click to mark available)' },
              { color: 'rgba(239,68,68,0.3)', border: 'rgba(239,68,68,0.4)', label: 'Already booked (cannot change)' },
              { color: 'rgba(107,114,128,0.15)', border: 'rgba(239,68,68,0.25)', label: 'Expired — time has passed' },
            ].map(({ color, border, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: color, border: `1px solid ${border}` }} />
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
                    const expired = isSlotExpired(date, time);
                    const isBooked = !expired && false; // connect to real bookings from DB if needed
                    const isAvail = !expired && availability[date]?.has(time);
                    return (
                      <button key={time} onClick={() => !expired && !isBooked && toggle(date, time)} disabled={expired || isBooked} style={{
                        padding: '10px 14px', borderRadius: 8,
                        cursor: expired || isBooked ? 'not-allowed' : 'pointer',
                        border: `1px solid ${
                          isBooked ? 'rgba(239,68,68,0.4)'
                          : expired ? 'rgba(239,68,68,0.2)'
                          : isAvail ? 'rgba(16,185,129,0.5)'
                          : 'var(--border)'
                        }`,
                        background: isBooked ? 'rgba(239,68,68,0.12)'
                          : expired ? 'rgba(107,114,128,0.08)'
                          : isAvail ? 'rgba(16,185,129,0.12)'
                          : 'rgba(255,255,255,0.02)',
                        color: isBooked ? '#f87171'
                          : expired ? '#4b5563'
                          : isAvail ? '#34d399'
                          : 'var(--text-muted)',
                        fontSize: '0.82rem', fontWeight: isAvail ? 600 : 400, transition: 'all 0.15s',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        opacity: expired ? 0.5 : 1,
                        textDecoration: expired ? 'line-through' : 'none',
                      }}>
                        <span>{time}</span>
                        {expired && <span style={{ fontSize: '0.65rem', color: '#ef4444', textDecoration: 'none', background: 'rgba(239,68,68,0.1)', padding: '1px 5px', borderRadius: 3 }}>EXPIRED</span>}
                        {isBooked && !expired && <span style={{ fontSize: '0.7rem' }}>BOOKED</span>}
                        {!isBooked && !expired && isAvail && <span style={{ fontSize: '0.7rem' }}>✓</span>}
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
