import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const PAYMENTS_KEY = 'fintrack_payments_v2';
const WITHDRAWALS_KEY = 'fintrack_withdrawals_v2';
const EXPENSES_KEY = 'fintrack_expenses_v2';

export default function MigrateData({ onComplete }) {
  const [status, setStatus] = useState('idle'); // idle | migrating | done | error
  const [counts, setCounts] = useState({ p: 0, w: 0, e: 0 });

  const localPayments = JSON.parse(localStorage.getItem(PAYMENTS_KEY) || '[]');
  const localWithdrawals = JSON.parse(localStorage.getItem(WITHDRAWALS_KEY) || '[]');
  const localExpenses = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');

  const total = localPayments.length + localWithdrawals.length + localExpenses.length;
  if (total === 0) return null;

  const handleMigrate = async () => {
    setStatus('migrating');
    try {
      // Migrate payments
      if (localPayments.length > 0) {
        const rows = localPayments.map(p => ({
          amount: Number(p.amount),
          owner: p.owner || 'Me',
          date: p.date,
          created_at: p.createdAt || p.date,
        }));
        const { error } = await supabase.from('payments').insert(rows);
        if (error) throw error;
        setCounts(c => ({ ...c, p: localPayments.length }));
      }

      // Migrate withdrawals
      if (localWithdrawals.length > 0) {
        const rows = localWithdrawals.map(w => ({
          amount: Number(w.amount),
          net_amount: Number(w.netAmount ?? +(w.amount * 0.9).toFixed(2)),
          owner: w.owner || 'Me',
          initiated_at: w.initiatedAt,
          arrival_date: w.arrivalDate,
        }));
        const { error } = await supabase.from('withdrawals').insert(rows);
        if (error) throw error;
        setCounts(c => ({ ...c, w: localWithdrawals.length }));
      }

      // Migrate expenses
      if (localExpenses.length > 0) {
        const rows = localExpenses.map(e => ({
          amount: Number(e.amount),
          description: e.description || 'Gasto General',
          date: e.date,
          created_at: e.createdAt || e.date,
        }));
        const { error } = await supabase.from('expenses').insert(rows);
        if (error) throw error;
        setCounts(c => ({ ...c, e: localExpenses.length }));
      }

      // Clear localStorage
      localStorage.removeItem(PAYMENTS_KEY);
      localStorage.removeItem(WITHDRAWALS_KEY);
      localStorage.removeItem(EXPENSES_KEY);

      setStatus('done');
      setTimeout(() => onComplete?.(), 2000);
    } catch (err) {
      console.error('Migration error:', err);
      setStatus('error');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-card, #1e1e2e)', borderRadius: '1.25rem',
        padding: '2.5rem', maxWidth: 420, width: '90%',
        border: '1px solid var(--border-color, #333)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🚀</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary, #fff)' }}>
          Migrar datos a la nube
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #888)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Se encontraron <strong style={{ color: 'var(--accent-primary, #4f6ef7)' }}>{total} registros</strong> guardados
          localmente ({localPayments.length} pagos, {localWithdrawals.length} retiros, {localExpenses.length} gastos).
          ¿Deseas migrarlos a Supabase?
        </p>

        {status === 'idle' && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleMigrate} style={{
              flex: 1, padding: '0.75rem', borderRadius: '0.75rem', fontWeight: 700,
              background: 'linear-gradient(135deg, #4f6ef7, #a78bfa)', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: '0.9rem',
            }}>
              Migrar Ahora
            </button>
            <button onClick={() => {
              localStorage.removeItem(PAYMENTS_KEY);
              localStorage.removeItem(WITHDRAWALS_KEY);
              localStorage.removeItem(EXPENSES_KEY);
              onComplete?.();
            }} style={{
              flex: 1, padding: '0.75rem', borderRadius: '0.75rem', fontWeight: 600,
              background: 'var(--bg-tertiary, #2a2a3e)', color: 'var(--text-secondary, #aaa)',
              border: '1px solid var(--border-color, #333)', cursor: 'pointer', fontSize: '0.85rem',
            }}>
              Descartar
            </button>
          </div>
        )}

        {status === 'migrating' && (
          <p style={{ color: 'var(--accent-primary, #4f6ef7)', fontWeight: 600 }}>
            ⏳ Migrando datos...
          </p>
        )}

        {status === 'done' && (
          <p style={{ color: 'var(--accent-success, #10b981)', fontWeight: 600 }}>
            ✅ ¡Migración completada! {counts.p} pagos, {counts.w} retiros, {counts.e} gastos migrados.
          </p>
        )}

        {status === 'error' && (
          <div>
            <p style={{ color: 'var(--accent-danger, #f74f4f)', fontWeight: 600, marginBottom: '0.75rem' }}>
              ❌ Hubo un error al migrar. Revisa la consola.
            </p>
            <button onClick={handleMigrate} style={{
              padding: '0.5rem 1.5rem', borderRadius: '0.75rem', fontWeight: 600,
              background: 'var(--accent-primary, #4f6ef7)', color: '#fff',
              border: 'none', cursor: 'pointer',
            }}>
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
