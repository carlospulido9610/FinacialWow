import React, { useState, useMemo } from 'react';
import { Plus, Trash2, CalendarClock, Users, Filter, Edit2, X } from 'lucide-react';
import { format, isSameDay, isSameWeek, isSameMonth, isSameYear } from 'date-fns';
import { es } from 'date-fns/locale';

const PRESETS = [
  { label: 'Hoy', key: 'today' },
  { label: 'Esta Semana', key: 'week' },
  { label: 'Este Mes', key: 'month' },
  { label: 'Este Año', key: 'year' },
  { label: 'Todo Histórico', key: 'all' },
];

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default function PaymentsView({ payments, addPayment, deletePayment, editPayment }) {
  const [formData, setFormData] = useState({
    amount: '',
    owner: 'Me',
    date: new Date().toISOString().split('T')[0],
  });
  const [editingId, setEditingId] = useState(null);

  const [preset, setPreset] = useState('month');
  const [ownerFilter, setOwnerFilter] = useState('All');

  const filtered = useMemo(() => {
    const now = new Date();
    return payments.filter(p => {
      if (ownerFilter !== 'All' && p.owner !== ownerFilter) return false;
      if (preset === 'all') return true;
      const d = new Date(p.date || p.createdAt);
      if (preset === 'today') return isSameDay(d, now);
      if (preset === 'week') return isSameWeek(d, now, { weekStartsOn: 1 });
      if (preset === 'month') return isSameMonth(d, now);
      if (preset === 'year') return isSameYear(d, now);
      return true;
    });
  }, [payments, preset, ownerFilter]);

  const { sumTotal, sumMe, sumBro } = useMemo(() => {
    let t = 0, m = 0, b = 0;
    filtered.forEach(p => {
      t += p.amount;
      if (p.owner === 'Me') m += p.amount;
      else if (p.owner === 'Brother') b += p.amount;
    });
    return { sumTotal: t, sumMe: m, sumBro: b };
  }, [filtered]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || isNaN(formData.amount)) return;
    
    if (editingId) {
      editPayment(editingId, { 
        amount: Number(formData.amount), 
        owner: formData.owner, 
        date: new Date(formData.date).toISOString() 
      });
      setEditingId(null);
    } else {
      addPayment({ amount: Number(formData.amount), owner: formData.owner, date: new Date(formData.date).toISOString() });
    }
    setFormData({ amount: '', owner: 'Me', date: new Date().toISOString().split('T')[0] });
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setFormData({
      amount: String(p.amount),
      owner: p.owner,
      date: p.date.split('T')[0]
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ amount: '', owner: 'Me', date: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="grid gap-6 pb-6" style={{ gridTemplateColumns: '320px 1fr' }}>

      {/* Form */}
      <div className="card" style={{ alignSelf: 'start' }}>
        <div className="flex items-center gap-3 mb-6">
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: editingId ? 'var(--accent-warning)' : 'linear-gradient(135deg,#4f6ef7,#6a3de8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: editingId ? 'none' : '0 4px 12px rgba(79,110,247,0.35)' }}>
            {editingId ? <Edit2 size={16} color="var(--bg-primary)" /> : <Plus size={18} color="white" />}
          </div>
          <div>
            <h3 className="font-semibold" style={{ fontSize: '1rem' }}>{editingId ? 'Editar Pago' : 'Registrar Pago Recibido'}</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{editingId ? 'Modifica los valores del cobro' : 'El monto queda disponible inmediatamente'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="input-label">Monto (USD)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '1.1rem' }}>$</span>
              <input type="number" step="0.01" min="0.01" required className="input-control" style={{ paddingLeft: '2rem', fontSize: '1.1rem', fontWeight: 600 }} placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="input-label">Pertenece a</label>
            <select className="input-control" value={formData.owner} onChange={(e) => setFormData({ ...formData, owner: e.target.value })}>
              <option value="Me">👤  Carlos</option>
              <option value="Brother">👥  Diego</option>
            </select>
          </div>

          <div>
            <label className="input-label">Fecha de Recepción</label>
            <input type="date" required className="input-control" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
          </div>

          {editingId ? (
            <div className="flex gap-2" style={{ marginTop: '0.25rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.75rem', borderRadius: '0.875rem', background: 'var(--accent-warning)', color: 'var(--bg-primary)' }}>Guardar</button>
              <button type="button" onClick={cancelEdit} className="btn btn-secondary" style={{ flex: 1, padding: '0.75rem', borderRadius: '0.875rem' }}>Cancelar</button>
            </div>
          ) : (
            <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '0.25rem', padding: '0.75rem 1rem', borderRadius: '0.875rem' }}>
              Registrar Pago
            </button>
          )}
        </form>
      </div>

      {/* List */}
      <div className="flex flex-col gap-6">

        {/* Filters & Summary Card */}
        <div className="card flex flex-col gap-4" style={{ padding: '1.25rem 1.5rem', zIndex: 10 }}>
          <div className="flex justify-between items-center" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <div className="flex items-center gap-2">
              <CalendarClock size={20} style={{ color: 'var(--accent-primary)' }} />
              <h3 className="font-semibold" style={{ fontSize: '1.05rem' }}>Filtros y Resumen</h3>
            </div>

            <div className="flex gap-3 items-center">
              {/* Owner Toggle */}
              <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', padding: '0.25rem', border: '1px solid var(--border-color)' }}>
                {[{ l: 'Todos', v: 'All' }, { l: '👤 Carlos', v: 'Me' }, { l: '👥 Diego', v: 'Brother' }].map(opt => (
                  <button key={opt.v}
                    onClick={() => setOwnerFilter(opt.v)}
                    style={{ padding: '0.35rem 0.875rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: '0.5rem', background: ownerFilter === opt.v ? 'var(--bg-primary)' : 'transparent', color: ownerFilter === opt.v ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: ownerFilter === opt.v ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 150ms' }}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>

              {/* Date Preset Selector */}
              <select className="input-control" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', width: 140, minHeight: 'auto' }} value={preset} onChange={(e) => setPreset(e.target.value)}>
                {PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div className="divider" />

          {/* Summary Stats */}
          <div className="flex gap-8 items-center justify-center py-2">
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>{ownerFilter === 'All' ? 'Total (Ambos)' : 'Total Filtrado'}</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{fmt(sumTotal)}</p>
            </div>
            {ownerFilter === 'All' && (
              <>
                <div style={{ width: 1, height: 32, background: 'var(--border-color)' }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>👤 Carlos</p>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--accent-primary)', margin: 0 }}>{fmt(sumMe)}</h3>
                </div>
                <div style={{ width: 1, height: 32, background: 'var(--border-color)' }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>👥 Diego</p>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: '#a78bfa' }}>{fmt(sumBro)}</p>
                </div>
              </>
            )}
            <div style={{ width: 1, height: 32, background: 'var(--border-color)' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Registros</p>
              <p style={{ fontSize: '1rem', fontWeight: 700 }}>{filtered.length}</p>
            </div>
          </div>
        </div>

        <div className="card flex flex-col" style={{ flex: 1, overflow: 'hidden' }}>
          <div className="flex justify-between items-center mb-5 p-6 pb-0">
            <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Lista de Pagos</h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem 1.5rem', maxHeight: 600 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <Users size={42} opacity={0.25} />
                <p style={{ fontSize: '0.875rem' }}>No hay pagos para este filtro</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((p) => (
                  <div key={p.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.875rem', padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 150ms' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <div className="flex items-center gap-3">
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: p.owner === 'Me' ? 'rgba(79,110,247,0.15)' : 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                        {p.owner === 'Me' ? '👤' : '👥'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span style={{ fontWeight: 600, fontSize: '1rem' }}>{fmt(p.amount)}</span>
                          <span className={`badge ${p.owner === 'Me' ? 'badge-me' : 'badge-brother'}`} style={{ fontSize: '0.7rem' }}>
                            {p.owner === 'Me' ? 'Carlos' : 'Diego'}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          Fecha: {format(new Date(p.date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-available">✓ Disponible</span>
                      <button onClick={() => startEdit(p)} title="Editar"
                        style={{ width: 32, height: 32, borderRadius: '0.5rem', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px solid var(--border-color)', transition: 'all 150ms' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-warning-bg)'; e.currentTarget.style.color = 'var(--accent-warning)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => deletePayment(p.id)} title="Eliminar"
                        style={{ width: 32, height: 32, borderRadius: '0.5rem', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px solid var(--border-color)', transition: 'all 150ms' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-danger-bg)'; e.currentTarget.style.color = 'var(--accent-danger)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
