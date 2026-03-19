import React, { useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, format, addMonths, subMonths, isToday, isBefore, startOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function CalendarView({ withdrawals = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  // Map withdrawal arrival dates
  const withdrawalsByDate = {};
  withdrawals.forEach(w => {
    const key = format(new Date(w.arrivalDate), 'yyyy-MM-dd');
    if (!withdrawalsByDate[key]) withdrawalsByDate[key] = [];
    withdrawalsByDate[key].push(w);
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let d = gridStart;
  while (d <= gridEnd) { days.push(d); d = addDays(d, 1); }

  const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const selectedKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedWithdrawals = selectedKey ? (withdrawalsByDate[selectedKey] || []) : [];

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Calendario de Cobros</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Muestra cuándo llegará a tu banco el dinero de cada retiro (5 días hábiles).
        </p>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 290px' }}>

        {/* Calendar grid */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 150ms' }}>
              <ChevronLeft size={18} />
            </button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, textTransform: 'capitalize' }}>
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h3>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 150ms' }}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {weekdays.map(wd => (
              <div key={wd} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0.25rem 0' }}>{wd}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {days.map((day, idx) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayWithdrawals = withdrawalsByDate[key] || [];
              const hasWithdrawals = dayWithdrawals.length > 0;
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const today = isToday(day);
              const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
              const total = dayWithdrawals.reduce((s, w) => s + w.amount, 0);
              // Green = already arrived, blue = upcoming
              const dotColor = isPast || today ? 'var(--accent-success)' : 'var(--accent-primary)';

              return (
                <div key={idx}
                  onClick={() => hasWithdrawals ? setSelectedDay(isSelected ? null : day) : null}
                  style={{
                    minHeight: 58, borderRadius: '0.75rem', padding: '0.35rem 0.25rem',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    cursor: hasWithdrawals ? 'pointer' : 'default',
                    background: isSelected ? 'rgba(79,110,247,0.15)' : today ? 'rgba(79,110,247,0.08)' : 'transparent',
                    border: isSelected ? '1px solid rgba(79,110,247,0.4)' : today ? '1px solid rgba(79,110,247,0.2)' : '1px solid transparent',
                    opacity: isCurrentMonth ? 1 : 0.3,
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={e => { if (hasWithdrawals && !isSelected) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(79,110,247,0.15)' : today ? 'rgba(79,110,247,0.08)' : 'transparent'; }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: today ? 700 : 400, color: today ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    {format(day, 'd')}
                  </span>
                  {hasWithdrawals && (
                    <>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
                      <span style={{ fontSize: '0.6rem', fontWeight: 600, color: dotColor, background: isPast || today ? 'var(--accent-success-bg)' : 'rgba(79,110,247,0.12)', padding: '1px 4px', borderRadius: 4, lineHeight: 1.6 }}>
                        {fmt(total)}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-6 mt-5 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-success)', boxShadow: '0 0 6px var(--accent-success)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ya llegó al banco</span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 6px var(--accent-primary)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Próximo cobro</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>Próximos cobros al banco</h4>
            {(() => {
              const upcoming = Object.entries(withdrawalsByDate)
                .filter(([key]) => !isBefore(new Date(key + 'T23:59:59'), new Date()))
                .sort(([a], [b]) => new Date(a) - new Date(b))
                .slice(0, 5);

              if (upcoming.length === 0) {
                return <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No hay retiros próximos</p>;
              }

              return upcoming.map(([key, ws]) => {
                const total = ws.reduce((s, w) => s + w.amount, 0);
                const date = new Date(key);
                const msLeft = date.setHours(23, 59) - Date.now();
                const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
                return (
                  <div key={key} onClick={() => { setSelectedDay(new Date(key)); setCurrentMonth(new Date(key)); }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', marginBottom: '0.5rem', cursor: 'pointer', transition: 'border-color 150ms' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{format(new Date(key), "d 'de' MMM", { locale: es })}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{daysLeft === 0 ? 'Hoy' : `En ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>{fmt(total)}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ws.length} retiro{ws.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {selectedDay && (
            <div className="card">
              <h4 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
                {format(selectedDay, "d 'de' MMMM", { locale: es })}
              </h4>
              {selectedWithdrawals.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Sin cobros este día</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {selectedWithdrawals.map(w => (
                    <div key={w.id} style={{ padding: '0.875rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                      <div className="flex justify-between items-center">
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{w.owner === 'Me' ? '👤 Carlos' : '👥 Diego'}</span>
                        <span style={{ fontWeight: 700, color: w.arrived ? 'var(--accent-success)' : 'var(--accent-primary)' }}>{fmt(w.amount)}</span>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Neto: {fmt(w.amount * 0.9)} (−10% comisión)
                      </p>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontWeight: 700 }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--accent-success)' }}>{fmt(selectedWithdrawals.reduce((s, w) => s + w.amount, 0))}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
