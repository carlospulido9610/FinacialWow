import React, { useState } from 'react';
import { Calculator, Percent, ArrowRight, Trash2, Clock, CheckCircle, AlertCircle, Edit2, X, User, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

export default function WithdrawalCalculator({ stats = {}, payments = [], expenses = [], withdrawals = [], addWithdrawal, deleteWithdrawal, editWithdrawal, simulateSplit }) {
  const [amount, setAmount] = useState('');
  const [withdrawalDate, setWithdrawalDate] = useState(new Date().toISOString().split('T')[0]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [withdrawalOwner, setWithdrawalOwner] = useState('Both');

  const sortedWithdrawals = React.useMemo(() => {
    return [...withdrawals].sort((a, b) => {
      const db = new Date(b.initiatedAt).getTime();
      const da = new Date(a.initiatedAt).getTime();
      if (db !== da) return db - da;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [withdrawals]);

  const numAmount = Number(amount) || 0;
  const commission = +(numAmount * 0.1).toFixed(2);
  const net = +(numAmount * 0.9).toFixed(2);

  // MAX amount depends on who is withdrawing
  const maxAmount = withdrawalOwner === 'Me'
    ? (stats.availableBalances?.Me ?? 0)
    : withdrawalOwner === 'Brother'
    ? (stats.availableBalances?.Brother ?? 0)
    : (stats.availableBalance ?? 0);

  // Compute exact per-person gross amounts (no percentages!)
  const { meGross, broGross } = React.useMemo(() => {
    if (!simulateSplit) return { meGross: numAmount / 2, broGross: numAmount / 2 };
    return simulateSplit(withdrawalOwner, numAmount, editingId);
  }, [withdrawalOwner, numAmount, editingId, simulateSplit, payments, withdrawals, expenses]);

  const meNetArriving  = +(meGross * 0.9).toFixed(2);
  const broNetArriving = +(broGross * 0.9).toFixed(2);

  const handleWithdraw = () => {
    if (!numAmount || numAmount <= 0) return;
    const localDate = new Date(withdrawalDate + 'T12:00:00').toISOString();
    const splitData = { meGross, broGross };
    if (editingId) {
      editWithdrawal(editingId, {
        amount: numAmount,
        initiatedAt: localDate,
        owner: withdrawalOwner,
        splitData,
      });
      setEditingId(null);
    } else {
      addWithdrawal({
        amount: numAmount,
        initiatedAt: localDate,
        owner: withdrawalOwner,
        splitData,
      });
    }
    setAmount('');
    setWithdrawalDate(new Date().toISOString().split('T')[0]);
    setWithdrawalOwner('Both');
    setShowConfirm(false);
  };

  const startEdit = (w) => {
    setEditingId(w.id);
    setAmount(String(w.amount));
    setWithdrawalOwner(w.owner || 'Both');
    const localDate = new Date(w.initiatedAt);
    const yyyy = localDate.getFullYear();
    const mm = String(localDate.getMonth() + 1).padStart(2, '0');
    const dd = String(localDate.getDate()).padStart(2, '0');
    setWithdrawalDate(`${yyyy}-${mm}-${dd}`);
    setShowConfirm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAmount('');
    setWithdrawalDate(new Date().toISOString().split('T')[0]);
    setWithdrawalOwner('Both');
    setShowConfirm(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', paddingBottom: '1.5rem' }}>

      {/* ── Left: Simulator ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{editingId ? 'Editar Retiro' : 'Simulador de Retiro'}</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 6 }}>
              {editingId ? 'Modifica el monto bruto del retiro seleccionado.' : (
                <>Al confirmar, el dinero llega a tu banco en{' '}
                <strong style={{ color: 'var(--accent-primary)' }}>5 días hábiles</strong>{' '}
                con el 10% de comisión descontado.</>
              )}
            </p>
          </div>
          {editingId && (
            <button onClick={cancelEdit} className="btn" style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* Balance */}
        <div className="card" style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <AlertCircle size={22} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-primary)' }}>Fondo Disponible</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 4 }}>{fmt(stats.availableBalance ?? 0)}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid rgba(79,110,247,0.15)', paddingTop: '0.875rem' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>De Carlos</p>
              <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: 2 }}>{fmt(stats.availableBalances?.Me ?? 0)}</p>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', flex: 1 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>De Diego</p>
              <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#a78bfa', marginTop: 2 }}>{fmt(stats.availableBalances?.Brother ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* Amount + breakdown */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.625rem' }}>¿De quién es este retiro?</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { key: 'Me',      label: 'Carlos',  icon: User,  color: 'var(--accent-primary)' },
                { key: 'Brother',  label: 'Diego',   icon: User,  color: '#a78bfa' },
                { key: 'Both',     label: 'Ambos',   icon: Users, color: 'var(--accent-success)' },
              ].map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => setWithdrawalOwner(key)}
                  style={{
                    flex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '0.65rem 0.75rem',
                    borderRadius: '0.75rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    border: withdrawalOwner === key ? `2px solid ${color}` : '1px solid var(--border-color)',
                    background: withdrawalOwner === key ? `${color}18` : 'var(--bg-secondary)',
                    color: withdrawalOwner === key ? color : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.625rem' }}>Monto a Retirar (bruto)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-secondary)' }}>$</span>
              <input
                type="number" min="0" className="input-control"
                style={{ paddingLeft: '2.5rem', fontSize: '1.75rem', fontWeight: 700, paddingTop: '1rem', paddingBottom: '1rem' }}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              <button
                onClick={() => setAmount(String(+maxAmount.toFixed(2)))}
                className="btn btn-primary"
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', padding: '0.4rem 1rem', fontSize: '0.75rem', borderRadius: '0.5rem' }}
              >
                MAX
              </button>
            </div>
            {withdrawalOwner !== 'Both' && (
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                Máx. disponible de {withdrawalOwner === 'Me' ? 'Carlos' : 'Diego'}: {fmt(maxAmount)}
              </p>
            )}
          </div>

          {/* Date picker */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.625rem' }}>Fecha del Retiro</label>
            <input
              type="date"
              className="input-control"
              value={withdrawalDate}
              onChange={(e) => setWithdrawalDate(e.target.value)}
            />
          </div>


          {/* Breakdown */}
          <div style={{ height: 1, background: 'var(--border-color)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Monto bruto</span>
              <span style={{ fontWeight: 600 }}>{fmt(numAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Percent size={14} color="var(--accent-danger)" /> Comisión (10%)
              </span>
              <span style={{ fontWeight: 600, color: 'var(--accent-danger)' }}>− {fmt(commission)}</span>
            </div>

            <div style={{ height: 1, background: 'var(--border-color)' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.875rem', padding: '1.125rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowRight size={18} color="var(--accent-success)" />
                <span style={{ fontWeight: 600, fontSize: '1rem' }}>Recibes neto en banco</span>
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-success)' }}>{fmt(net)}</span>
            </div>
          </div>

          {!showConfirm ? (
            <button
              className="btn btn-primary w-full"
              style={{ padding: '0.9rem', borderRadius: '0.875rem' }}
              onClick={() => numAmount > 0 && setShowConfirm(true)}
              disabled={!numAmount || numAmount <= 0}
            >
              Confirmar Retiro
            </button>
          ) : (
            <div style={{ background: 'var(--accent-warning-bg)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '0.875rem', padding: '1.125rem 1.25rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--accent-warning)', fontWeight: 600, marginBottom: '0.875rem' }}>
                ¿Confirmas retirar {fmt(numAmount)}?<br />
                <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>
                  Llegarán <strong style={{ color: 'var(--accent-success)' }}>{fmt(net)}</strong> al banco en 5 días hábiles.
                </span><br />
                <span style={{ fontWeight: 500, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {withdrawalOwner === 'Me' && (<>Sale de Carlos: <strong style={{ color: 'var(--accent-primary)' }}>{fmt(meNetArriving)}</strong></>)}
                  {withdrawalOwner === 'Brother' && (<>Sale de Diego: <strong style={{ color: '#a78bfa' }}>{fmt(broNetArriving)}</strong></>)}
                  {withdrawalOwner === 'Both' && (<>(Carlos: <strong style={{ color: 'var(--accent-primary)' }}>{fmt(meNetArriving)}</strong> · Diego: <strong style={{ color: '#a78bfa' }}>{fmt(broNetArriving)}</strong>)</>)}
                </span>
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary" style={{ flex: 1, borderRadius: '0.75rem', padding: '0.65rem' }} onClick={handleWithdraw}>{editingId ? 'Guardar Cambios' : 'Sí, retirar'}</button>
                <button className="btn btn-secondary" style={{ flex: 1, borderRadius: '0.75rem', padding: '0.65rem' }} onClick={() => setShowConfirm(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Withdrawal history ── */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontWeight: 600, fontSize: '1.05rem' }}>Retiros en Tránsito</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Dinero neto en camino a tu cuenta bancaria</p>
          </div>
          <span style={{ background: 'var(--accent-warning-bg)', color: 'var(--accent-warning)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
            {sortedWithdrawals.filter(w => !w.arrived).length} pendientes
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 480 }}>
          {sortedWithdrawals.length === 0 ? (
            <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Calculator size={42} opacity={0.25} />
              <p style={{ fontSize: '0.875rem' }}>No hay retiros registrados</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {sortedWithdrawals.map(w => {
                const wNet = w.netAmount ?? +(w.amount * 0.9).toFixed(2);
                return (
                  <div key={w.id} style={{ background: 'var(--bg-secondary)', border: `1px solid ${w.arrived ? 'rgba(34,211,165,0.2)' : 'var(--border-color)'}`, borderRadius: '0.875rem', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 150ms' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-success)' }}>{fmt(wNet)}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(bruto: {fmt(w.amount)})</span>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <span style={{ color: 'var(--accent-primary)' }}>👤 Carlos: {fmt(w.split?.meNet ?? 0)}</span> ·{' '}
                        <span style={{ color: '#a78bfa' }}>👥 Diego: {fmt(w.split?.broNet ?? 0)}</span>
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Iniciado: {format(new Date(w.initiatedAt), 'dd/MM/yyyy')} ·{' '}
                        Llega: <strong style={{ color: w.arrived ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                          {format(new Date(w.arrivalDate), "d 'de' MMM", { locale: es })}
                        </strong>
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {w.arrived
                        ? <span style={{ background: 'var(--accent-success-bg)', color: 'var(--accent-success)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12} /> Llegó</span>
                        : <span style={{ background: 'var(--accent-warning-bg)', color: 'var(--accent-warning)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> En tránsito</span>
                      }
                      <button onClick={() => startEdit(w)} title="Editar"
                        style={{ width: 32, height: 32, borderRadius: '0.5rem', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 150ms' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-warning-bg)'; e.currentTarget.style.color = 'var(--accent-warning)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => deleteWithdrawal(w.id)} title="Eliminar"
                        style={{ width: 32, height: 32, borderRadius: '0.5rem', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 150ms' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-danger-bg)'; e.currentTarget.style.color = 'var(--accent-danger)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
