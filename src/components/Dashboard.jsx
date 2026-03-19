import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import {
  Wallet, DollarSign, TrendingUp, Clock, Filter,
  ChevronLeft, ChevronRight, CalendarDays, X, ReceiptText
} from 'lucide-react';
import {
  format, subDays, isSameDay, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays, isSameMonth, isToday,
  isBefore, startOfDay, addMonths, subMonths,
  isWithinInterval, parseISO, eachDayOfInterval
} from 'date-fns';
import { es } from 'date-fns/locale';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
const fmtShort = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

/* ─── Preset ranges ─── */
const PRESETS = [
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: 'month', label: 'Este mes' },
  { key: 'custom', label: 'Personalizado' },
];

function getRangeForPreset(preset, customFrom, customTo) {
  const today = startOfDay(new Date());
  switch (preset) {
    case '7d':  return { from: subDays(today, 6), to: today };
    case '30d': return { from: subDays(today, 29), to: today };
    case 'month': return { from: startOfMonth(today), to: endOfMonth(today) };
    case 'custom':
      return {
        from: customFrom ? startOfDay(new Date(customFrom)) : subDays(today, 29),
        to:   customTo   ? startOfDay(new Date(customTo))   : today,
      };
    default: return { from: subDays(today, 29), to: today };
  }
}

/* ─── Build chart data from a date range ─── */
function buildRangeChartData(payments, from, to) {
  const days = eachDayOfInterval({ start: from, end: to });
  if (days.length > 45) {
    const byMonth = {};
    payments.forEach(p => {
      const pd = new Date(p.date);
      if (pd >= from && pd <= to) {
        const key = format(pd, 'MMM yy', { locale: es });
        byMonth[key] = (byMonth[key] || 0) + p.amount;
      }
    });
    return Object.entries(byMonth).map(([k, v]) => ({
      name: k,
      Bruto: +v.toFixed(2),
      Neto: +(v * 0.9).toFixed(2),
    }));
  }
  return days.map(day => {
    const total = payments
      .filter(p => isSameDay(new Date(p.date), day))
      .reduce((s, p) => s + p.amount, 0);
    return {
      name: format(day, 'd MMM', { locale: es }),
      Bruto: +total.toFixed(2),
      Neto: +(total * 0.9).toFixed(2),
    };
  });
}

/* ─── Tooltip ─── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-hover)', borderRadius: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.825rem', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color, fontWeight: 700, marginBottom: 2 }}>
          {entry.name}: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(entry.value)}
        </p>
      ))}
    </div>
  );
};

/* ─── Mini Calendar ─── */
function MiniCalendar({ withdrawals }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const byDate = {};
  (withdrawals || []).forEach(w => {
    const key = format(new Date(w.arrivalDate), 'yyyy-MM-dd');
    byDate[key] = (byDate[key] || 0) + w.amount;
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = [];
  let d = gridStart;
  while (d <= gridEnd) { days.push(d); d = addDays(d, 1); }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <ChevronLeft size={13} />
        </button>
        <span style={{ fontWeight: 600, fontSize: '0.82rem', textTransform: 'capitalize' }}>
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </span>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <ChevronRight size={13} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['L','M','X','J','V','S','D'].map(wd => (
          <div key={wd} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', paddingBottom: 4 }}>{wd}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {days.map((day, idx) => {
          const key = format(day, 'yyyy-MM-dd');
          const amount = byDate[key];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
          const dotColor = isPast || today ? 'var(--accent-success)' : 'var(--accent-primary)';
          return (
            <div key={idx} title={amount ? `${fmt(amount)}` : undefined}
              style={{ height: 30, borderRadius: '0.4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: today ? 'rgba(79,110,247,0.12)' : amount ? 'rgba(79,110,247,0.06)' : 'transparent', border: today ? '1px solid rgba(79,110,247,0.3)' : '1px solid transparent', opacity: inMonth ? 1 : 0.2 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: today ? 700 : 400, color: today ? 'var(--accent-primary)' : 'var(--text-primary)', lineHeight: 1 }}>{format(day, 'd')}</span>
              {amount && <div style={{ width: 4, height: 4, borderRadius: '50%', background: dotColor, boxShadow: `0 0 4px ${dotColor}` }} />}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-success)', boxShadow: '0 0 4px var(--accent-success)' }} />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Ya llegó</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 4px var(--accent-primary)' }} />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Próximo cobro</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ─── */
export default function Dashboard({ stats, payments, withdrawals }) {
  const allPayments = payments || [];
  const allWithdrawals = withdrawals || [];

  // ── Filter state ──
  const [preset, setPreset] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  // Chart view: 'both' | 'bruto' | 'neto'
  const [chartView, setChartView] = useState('both');

  const { from, to } = useMemo(() => getRangeForPreset(preset, customFrom, customTo), [preset, customFrom, customTo]);

  // Payments within the selected range
  const filteredPayments = useMemo(() =>
    allPayments.filter(p => {
      const d = new Date(p.date);
      return d >= from && d <= to;
    }),
    [allPayments, from, to]
  );

  const filteredTotal = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const filteredMe = filteredPayments.filter(p => p.owner === 'Me').reduce((s, p) => s + p.amount, 0);
  const filteredBro = filteredPayments.filter(p => p.owner === 'Brother').reduce((s, p) => s + p.amount, 0);

  const chartData = useMemo(() => buildRangeChartData(filteredPayments, from, to), [filteredPayments, from, to]);

  const ownerData = [
    { name: 'Carlos', value: filteredMe },
    { name: 'Diego', value: filteredBro },
  ];

  const recentWithdrawals = [...allWithdrawals]
    .sort((a, b) => new Date(b.initiatedAt) - new Date(a.initiatedAt))
    .slice(0, 5);

  const DONUT_COLORS = ['#4f6ef7', '#a78bfa'];

  const kpis = [
    { label: 'Balance Disponible', value: stats.availableBalance, icon: DollarSign, gradient: true, sub: 'Para retirar en tu plataforma' },
    { label: 'Retiros en Tránsito', value: stats.inTransit, icon: Clock, color: 'var(--accent-warning)', sub: 'En camino a tu banco' },
    { label: `Ingresos (${PRESETS.find(p => p.key === preset)?.label || '30 días'})`, value: filteredTotal, icon: TrendingUp, color: 'var(--accent-success)', sub: `${filteredPayments.length} pagos en el periodo` },
    { label: 'Gastos Comunes', value: stats.totalExpenses || 0, icon: ReceiptText, color: 'var(--accent-danger)', sub: 'Restados del balance' },
  ];

  return (
    <div className="flex flex-col gap-6" style={{ zoom: 0.82, paddingBottom: '0.5rem' }}>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
        {kpis.map((k, i) => {
          const Icon = k.icon;
          if (k.gradient) {
            return (
              <div key={i} className="card-gradient" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500, opacity: 0.85 }}>{k.label}</p>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} color="white" />
                  </div>
                </div>
                <p style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1 }}>{fmt(k.value ?? 0)}</p>
                <p style={{ fontSize: '0.78rem', opacity: 0.75, marginTop: '0.625rem' }}>{k.sub}</p>
              </div>
            );
          }
          return (
            <div key={i} className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{k.label}</p>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={k.color} />
                </div>
              </div>
              <p style={{ fontSize: '1.8rem', fontWeight: 700, color: k.color, lineHeight: 1 }}>{fmt(k.value ?? 0)}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.625rem' }}>{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Filter Bar ── */}
      <div className="card" style={{ padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>
            <Filter size={15} />
            <span>Período:</span>
          </div>

          {/* Preset buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => {
                  setPreset(p.key);
                  setShowCustom(p.key === 'custom');
                }}
                style={{
                  padding: '0.35rem 0.875rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  border: preset === p.key ? '1px solid rgba(79,110,247,0.5)' : '1px solid var(--border-color)',
                  background: preset === p.key ? 'rgba(79,110,247,0.15)' : 'var(--bg-secondary)',
                  color: preset === p.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom range inputs */}
          {showCustom && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.5rem', padding: '0.3rem 0.625rem', fontSize: '0.8rem', cursor: 'pointer' }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>→</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.5rem', padding: '0.3rem 0.625rem', fontSize: '0.8rem', cursor: 'pointer' }}
              />
            </div>
          )}

          {/* Summary */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {format(from, "d MMM", { locale: es })} – {format(to, "d MMM yyyy", { locale: es })}
            </span>
            <span style={{ fontWeight: 700, color: 'var(--accent-success)', fontSize: '0.9rem' }}>{fmt(filteredTotal)}</span>
          </div>
        </div>
      </div>

      {/* ── Chart + Donut ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: '1.25rem' }}>

        {/* Area chart */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>
                Ingresos — {PRESETS.find(p => p.key === preset)?.label}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {format(from, "d MMM", { locale: es })} al {format(to, "d MMM yyyy", { locale: es })}
              </p>
            </div>
            {/* Chart view toggle */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.625rem', padding: 3 }}>
              {[['both','Bruto + Neto'], ['bruto','Solo Bruto'], ['neto','Solo Neto']].map(([v, lbl]) => (
                <button
                  key={v}
                  onClick={() => setChartView(v)}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '0.4rem',
                    fontSize: '0.73rem',
                    fontWeight: 500,
                    border: 'none',
                    background: chartView === v ? 'var(--accent-primary)' : 'transparent',
                    color: chartView === v ? 'white' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 120ms',
                  }}
                >{lbl}</button>
              ))}
            </div>
          </div>
          <div style={{ height: 260 }}>
            {chartData.some(d => d.Bruto > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradBruto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f6ef7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradNeto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3a5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#22d3a5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '0' : `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  {(chartView === 'both' || chartView === 'bruto') && (
                    <Area type="monotone" dataKey="Bruto" name="Bruto" stroke="#4f6ef7" strokeWidth={2.5} fill="url(#gradBruto)" dot={false} activeDot={{ r: 5, fill: '#4f6ef7', stroke: 'var(--bg-primary)', strokeWidth: 2 }} />
                  )}
                  {(chartView === 'both' || chartView === 'neto') && (
                    <Area type="monotone" dataKey="Neto" name="Neto" stroke="#22d3a5" strokeWidth={2} fill="url(#gradNeto)" dot={false} strokeDasharray={chartView === 'both' ? '0' : '0'} activeDot={{ r: 5, fill: '#22d3a5', stroke: 'var(--bg-primary)', strokeWidth: 2 }} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 8 }}>
                <TrendingUp size={36} opacity={0.25} />
                <p style={{ fontSize: '0.825rem' }}>Sin ingresos en este período</p>
              </div>
            )}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
            {(chartView === 'both' || chartView === 'bruto') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 24, height: 3, background: '#4f6ef7', borderRadius: 2 }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bruto</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4f6ef7' }}>{fmt(filteredTotal)}</span>
              </div>
            )}
            {(chartView === 'both' || chartView === 'neto') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 24, height: 3, background: '#22d3a5', borderRadius: 2 }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Neto (−10%)</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#22d3a5' }}>{fmt(filteredTotal * 0.9)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Donut — filtered */}
        <div className="card flex flex-col" style={{ padding: '1.75rem' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Por Persona</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {chartView === 'neto' ? 'Neto (−10% comisión)' : chartView === 'bruto' ? 'Bruto' : 'Bruto + Neto'} · período
            </p>
          </div>
          {(() => {
            const mult = chartView === 'neto' ? 0.9 : 1;
            const donutData = [
              { name: 'Carlos', value: +(filteredMe * mult).toFixed(2) },
              { name: 'Diego', value: +(filteredBro * mult).toFixed(2) },
            ];
            const donutTotal = +(filteredTotal * mult).toFixed(2);
            return (
              <>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
                  {donutTotal > 0 ? (
                    <PieChart width={170} height={170}>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                        {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={v => fmt(v)} contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-hover)', borderRadius: '0.75rem', fontSize: '0.8rem' }} />
                    </PieChart>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Wallet size={32} opacity={0.25} style={{ margin: '0 auto 6px' }} />
                      <p style={{ fontSize: '0.8rem' }}>Sin datos</p>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {donutData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: DONUT_COLORS[i] }} />
                        <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{d.name}</span>
                      </div>
                      <span style={{ fontSize: '0.825rem', fontWeight: 600 }}>{fmt(d.value)}</span>
                    </div>
                  ))}
                  <div className="divider mt-2" />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                      Total {chartView === 'neto' ? 'neto' : 'bruto'}
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: chartView === 'neto' ? '#22d3a5' : 'var(--accent-primary)' }}>
                      {fmt(donutTotal)}
                    </span>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* ── Resumen Financiero: Bruto vs Neto ── */}
      {(() => {
        // Commission is always 10% of what you received in the period
        const periodGross = filteredTotal;
        const periodCommissions = +(periodGross * 0.1).toFixed(2);
        const periodNet = +(periodGross * 0.9).toFixed(2);

        // Historical: based on ALL payments ever received
        const histGross = stats.totalReceived ?? 0;
        const histCommissions = +(histGross * 0.1).toFixed(2);
        const histNet = +(histGross * 0.9).toFixed(2);

        const row = [
          { label: 'Ingresos Brutos', value: periodGross, color: 'var(--accent-primary)', sub: 'Pagos recibidos en el período', icon: '📥' },
          { label: 'Comisión estimada (10%)', value: periodCommissions, color: 'var(--accent-danger)', sub: 'Costo si retiras todo del período', icon: '💸', negative: true },
          { label: 'Neto del Período', value: periodNet, color: 'var(--accent-success)', sub: 'Lo que te queda después de comisión', icon: '✅' },
          { label: 'Total Bruto Histórico', value: histGross, color: '#a78bfa', sub: 'Todos los pagos desde el inicio', icon: '📊' },
          { label: 'Total Neto Histórico', value: histNet, color: '#22d3a5', sub: `Estimado − ${fmt(histCommissions)} comisión`, icon: '🏦' },
        ];

        return (
          <div className="card" style={{ padding: '1.25rem 1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Resumen Financiero — Bruto vs Neto</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  Primeras 3 columnas siguen el filtro · Últimas 2 son históricas
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '0.2rem 0.625rem', borderRadius: '9999px' }}>
                {PRESETS.find(p => p.key === preset)?.label}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
              {row.map((r, i) => (
                <div key={i} style={{ padding: '1rem', borderRadius: '0.875rem', background: 'var(--bg-secondary)', border: `1px solid ${r.color}28`, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: r.color, opacity: 0.7 }} />
                  <div style={{ fontSize: '1.1rem', marginBottom: 6 }}>{r.icon}</div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 5 }}>{r.label}</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 700, color: r.color, lineHeight: 1 }}>
                    {r.negative && r.value > 0 ? '−' : ''}{fmt(r.value)}
                  </p>
                  <p style={{ fontSize: '0.645rem', color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.4 }}>{r.sub}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Bottom Row: Calendar + Withdrawals + Payments ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1.3fr', gap: '1.25rem' }}>


        {/* Calendar */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ marginBottom: '0.875rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Calendario de Cobros</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Días que tu retiro llega al banco</p>
          </div>
          <MiniCalendar withdrawals={allWithdrawals} />
        </div>

        {/* Recent Withdrawals */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Retiros Recientes</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Últimos {Math.min(allWithdrawals.length, 5)}</span>
          </div>
          {recentWithdrawals.length === 0 ? (
            <div style={{ padding: '1.25rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Clock size={28} opacity={0.25} style={{ margin: '0 auto 6px' }} />
              <p style={{ fontSize: '0.78rem' }}>Sin retiros registrados</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentWithdrawals.map((w, i, arr) => (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: w.arrived ? 'var(--accent-success-bg)' : 'var(--accent-warning-bg)', color: w.arrived ? 'var(--accent-success)' : 'var(--accent-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={16} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{fmt(w.netAmount ?? +(w.amount * 0.9).toFixed(2))}</p>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1, marginBottom: 2 }}>
                        {format(new Date(w.initiatedAt), 'dd/MM/yy')} → {format(new Date(w.arrivalDate), 'dd/MM/yy')}
                      </p>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--accent-primary)' }}>👤 {fmt(w.split?.meNet ?? 0)}</span> ·{' '}
                        <span style={{ color: '#a78bfa' }}>👥 {fmt(w.split?.broNet ?? 0)}</span>
                      </p>
                    </div>
                  </div>
                  {w.arrived ? (
                    <span className="badge badge-available" style={{ fontSize: '0.68rem' }}>✓ Llegó</span>
                  ) : (
                    <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>En tránsito</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Pagos Recientes</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Últimos {Math.min(allPayments.length, 5)}</span>
          </div>
          {allPayments.length === 0 ? (
            <div style={{ padding: '1.25rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Wallet size={28} opacity={0.25} style={{ margin: '0 auto 6px' }} />
              <p style={{ fontSize: '0.78rem' }}>Sin pagos registrados</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {allPayments.slice(0, 5).map((p, i, arr) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: p.owner === 'Me' ? 'rgba(79,110,247,0.15)' : 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                      {p.owner === 'Me' ? '👤' : '👥'}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{fmt(p.amount)}</p>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>{format(new Date(p.date), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                  <span className="badge badge-available" style={{ fontSize: '0.68rem' }}>✓ Recibido</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
