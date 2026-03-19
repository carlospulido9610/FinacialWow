import React, { useState, useMemo } from 'react';
import { Plus, Trash2, ReceiptText, Filter, Edit2, X } from 'lucide-react';
import { format, isSameDay, isSameWeek, isSameMonth, isSameYear } from 'date-fns';

const PRESETS = [
  { label: 'Hoy', key: 'today' },
  { label: 'Esta Semana', key: 'week' },
  { label: 'Este Mes', key: 'month' },
  { label: 'Este Año', key: 'year' },
  { label: 'Todo Histórico', key: 'all' },
];

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default function ExpensesView({ expenses, addExpense, deleteExpense, editExpense }) {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [editingId, setEditingId] = useState(null);
  const [preset, setPreset] = useState('month');

  const filtered = useMemo(() => {
    const now = new Date();
    return expenses.filter(e => {
      if (preset === 'all') return true;
      const d = new Date(e.date || e.createdAt);
      if (preset === 'today') return isSameDay(d, now);
      if (preset === 'week') return isSameWeek(d, now, { weekStartsOn: 1 });
      if (preset === 'month') return isSameMonth(d, now);
      if (preset === 'year') return isSameYear(d, now);
      return true;
    });
  }, [expenses, preset]);

  const sumTotal = useMemo(() => filtered.reduce((acc, e) => acc + e.amount, 0), [filtered]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || isNaN(formData.amount)) return;
    
    if (editingId) {
      editExpense(editingId, {
        amount: Number(formData.amount),
        description: formData.description,
        date: new Date(formData.date).toISOString()
      });
      setEditingId(null);
    } else {
      addExpense({ 
        amount: Number(formData.amount), 
        description: formData.description || 'Gasto General', 
        date: new Date(formData.date).toISOString() 
      });
    }
    
    setFormData({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  };

  const startEdit = (e) => {
    setEditingId(e.id);
    setFormData({
      amount: String(e.amount),
      description: e.description || '',
      date: e.date.split('T')[0]
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="grid gap-6 pb-6" style={{ gridTemplateColumns: '320px 1fr' }}>

      {/* Form Card */}
      <div className="card" style={{ alignSelf: 'start', position: 'sticky', top: '1.5rem' }}>
        <div className="flex items-center gap-3 mb-6">
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: editingId ? 'var(--accent-warning)' : 'linear-gradient(135deg,#e83d81,#f74f4f)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: editingId ? 'none' : '0 4px 12px rgba(247,79,79,0.35)' }}>
            {editingId ? <Edit2 size={16} color="var(--bg-primary)" /> : <Plus size={18} color="white" />}
          </div>
          <div>
            <h3 className="font-semibold" style={{ fontSize: '1rem' }}>{editingId ? 'Editar Gasto' : 'Registrar Gasto Común'}</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{editingId ? 'Modifica los valores' : 'Se restará del fondo disponible'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="input-label">Monto (USD)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-danger)', fontWeight: 700, fontSize: '1.1rem' }}>$</span>
              <input type="number" step="0.01" min="0.01" required className="input-control" style={{ paddingLeft: '2rem', fontSize: '1.1rem', fontWeight: 600, borderColor: 'rgba(247,79,79,0.2)' }} placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="input-label">Concepto / Descripción</label>
            <input type="text" className="input-control" placeholder="Ej. Hosting, Suscripción..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>

          <div>
            <label className="input-label">Fecha del Gasto</label>
            <input type="date" required className="input-control" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
          </div>

          {editingId ? (
            <div className="flex gap-2" style={{ marginTop: '0.25rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.75rem', borderRadius: '0.875rem', background: 'var(--accent-warning)', color: 'var(--bg-primary)' }}>Guardar</button>
              <button type="button" onClick={cancelEdit} className="btn btn-secondary" style={{ flex: 1, padding: '0.75rem', borderRadius: '0.875rem' }}>Cancelar</button>
            </div>
          ) : (
            <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '0.25rem', padding: '0.75rem 1rem', borderRadius: '0.875rem', background: 'var(--accent-danger)' }}>
              Registrar Gasto
            </button>
          )}
        </form>
      </div>

      {/* List Card */}
      <div className="flex flex-col gap-6">

        {/* Filters & Summary */}
        <div className="card flex flex-col gap-4" style={{ padding: '1.25rem 1.5rem', zIndex: 10 }}>
          <div className="flex justify-between items-center" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <div className="flex items-center gap-2">
              <ReceiptText size={20} style={{ color: 'var(--accent-danger)' }} />
              <h3 className="font-semibold" style={{ fontSize: '1.05rem' }}>Historial de Gastos</h3>
            </div>
            
            <select className="input-control" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', width: 140, minHeight: 'auto' }} value={preset} onChange={(e) => setPreset(e.target.value)}>
              {PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>

          <div className="divider" />

          {/* Summary Stats */}
          <div className="flex gap-8 items-center justify-center py-2">
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Total Gastos (Filtrado)</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-danger)' }}>{fmt(sumTotal)}</p>
            </div>
            <div style={{ width: 1, height: 32, background: 'var(--border-color)' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Registros</p>
              <p style={{ fontSize: '1rem', fontWeight: 700 }}>{filtered.length}</p>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="card flex flex-col" style={{ flex: 1, overflow: 'hidden' }}>
          <div className="flex justify-between items-center mb-5 p-6 pb-0">
            <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Lista de Gastos Comunes</h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem 1.5rem', maxHeight: 600 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <ReceiptText size={42} opacity={0.25} />
                <p style={{ fontSize: '0.875rem' }}>No hay gastos para este filtro</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((e) => (
                  <div key={e.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.875rem', padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 150ms' }}
                    onMouseEnter={ev => ev.currentTarget.style.borderColor = 'rgba(247,79,79,0.3)'}
                    onMouseLeave={ev => ev.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <div className="flex items-center gap-3">
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(247,79,79,0.1)', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ReceiptText size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--accent-danger)' }}>{fmt(e.amount)}</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', fontWeight: 500, marginTop: 4 }}>{e.description || 'Gasto General'}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Fecha: {format(new Date(e.date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(e)} title="Editar"
                        style={{ width: 32, height: 32, borderRadius: '0.5rem', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', transition: 'all 150ms' }}
                        onMouseEnter={ev => { ev.currentTarget.style.background = 'var(--accent-warning-bg)'; ev.currentTarget.style.color = 'var(--accent-warning)'; }}
                        onMouseLeave={ev => { ev.currentTarget.style.background = 'var(--bg-tertiary)'; ev.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => deleteExpense(e.id)} title="Eliminar"
                        style={{ width: 32, height: 32, borderRadius: '0.5rem', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', transition: 'all 150ms' }}
                        onMouseEnter={ev => { ev.currentTarget.style.background = 'var(--accent-danger-bg)'; ev.currentTarget.style.color = 'var(--accent-danger)'; }}
                        onMouseLeave={ev => { ev.currentTarget.style.background = 'var(--bg-tertiary)'; ev.currentTarget.style.color = 'var(--text-secondary)'; }}
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
