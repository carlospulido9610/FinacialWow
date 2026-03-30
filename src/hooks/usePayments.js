import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { addBusinessDays } from '../lib/dateUtils';
import { isSameWeek, isSameMonth, isBefore, startOfDay } from 'date-fns';

function isArrived(arrivalDate) {
  const today = startOfDay(new Date());
  const d = startOfDay(new Date(arrivalDate));
  return isBefore(d, today) || d.getTime() === today.getTime();
}

export function usePayments() {
  const [payments, setPayments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Fetch all data on mount ───
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const [pRes, wRes, eRes] = await Promise.all([
        supabase.from('payments').select('*').order('date', { ascending: false }),
        supabase.from('withdrawals').select('*').order('initiated_at', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
      ]);

      if (pRes.data) setPayments(pRes.data.map(r => ({
        ...r, amount: Number(r.amount), netAmount: r.net_amount ? Number(r.net_amount) : undefined,
      })));
      if (wRes.data) setWithdrawals(wRes.data.map(r => ({
        ...r,
        amount: Number(r.amount),
        netAmount: Number(r.net_amount),
        initiatedAt: r.initiated_at,
        arrivalDate: r.arrival_date,
        createdAt: r.created_at,
        // Persisted split — may be null for old records
        persistedSplit: (r.split_me_gross != null) ? {
          meGross:  Number(r.split_me_gross),
          broGross: Number(r.split_bro_gross),
          meNet:    Number(r.split_me_net),
          broNet:   Number(r.split_bro_net),
        } : null,
      })));
      if (eRes.data) setExpenses(eRes.data.map(r => ({
        ...r, amount: Number(r.amount), createdAt: r.created_at,
      })));

      setLoading(false);
    }
    fetchAll();
  }, []);

  // ─── PAYMENTS ───
  const addPayment = useCallback(async (data) => {
    // data.date is already a full ISO string from the view (created with T12:00:00)
    const row = {
      amount: Number(data.amount),
      owner: data.owner,
      date: data.date || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await supabase.from('payments').insert(row).select().single();
    if (!error && inserted) {
      setPayments(prev => [{ ...inserted, amount: Number(inserted.amount) }, ...prev]);
    }
  }, []);

  const deletePayment = useCallback(async (id) => {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (!error) setPayments(prev => prev.filter(p => p.id !== id));
  }, []);

  const editPayment = useCallback(async (id, data) => {
    const updates = {};
    if (data.amount !== undefined) updates.amount = Number(data.amount);
    if (data.owner !== undefined) updates.owner = data.owner;
    if (data.date !== undefined) updates.date = new Date(data.date).toISOString();

    const { data: updated, error } = await supabase.from('payments').update(updates).eq('id', id).select().single();
    if (!error && updated) {
      setPayments(prev => prev.map(p => p.id === id ? { ...p, ...updated, amount: Number(updated.amount) } : p));
    }
  }, []);

  // ─── WITHDRAWALS ───
  const addWithdrawal = useCallback(async (data) => {
    const initiatedAt = data.initiatedAt ? new Date(data.initiatedAt) : new Date();
    const gross = Number(data.amount);
    const net = +(gross * 0.9).toFixed(2);

    // ── Separate accounts: store exact per-person amounts ──
    const split = data.splitData || { meGross: gross / 2, broGross: gross / 2 };
    const meGross  = +split.meGross.toFixed(4);
    const broGross = +split.broGross.toFixed(4);
    const meNet    = +(meGross * 0.9).toFixed(2);
    const broNet   = +(broGross * 0.9).toFixed(2);

    const row = {
      amount: gross,
      net_amount: net,
      owner: data.owner || 'Both',
      initiated_at: initiatedAt.toISOString(),
      arrival_date: addBusinessDays(initiatedAt, 5).toISOString(),
      created_at: new Date().toISOString(),
      split_me_gross:  meGross,
      split_bro_gross: broGross,
      split_me_net:    meNet,
      split_bro_net:   broNet,
    };
    const { data: inserted, error } = await supabase.from('withdrawals').insert(row).select().single();
    if (!error && inserted) {
      setWithdrawals(prev => [{
        ...inserted,
        amount: Number(inserted.amount),
        netAmount: Number(inserted.net_amount),
        initiatedAt: inserted.initiated_at,
        arrivalDate: inserted.arrival_date,
        createdAt: inserted.created_at,
        persistedSplit: {
          meGross:  Number(inserted.split_me_gross),
          broGross: Number(inserted.split_bro_gross),
          meNet:    Number(inserted.split_me_net),
          broNet:   Number(inserted.split_bro_net),
        },
      }, ...prev]);
    }
  }, []);

  const deleteWithdrawal = useCallback(async (id) => {
    const { error } = await supabase.from('withdrawals').delete().eq('id', id);
    if (!error) setWithdrawals(prev => prev.filter(w => w.id !== id));
  }, []);

  const editWithdrawal = useCallback(async (id, data) => {
    const updates = {};
    if (data.amount !== undefined) {
      const gross = Number(data.amount);
      updates.amount = gross;
      updates.net_amount = +(gross * 0.9).toFixed(2);
    }
    if (data.owner !== undefined) updates.owner = data.owner;
    if (data.initiatedAt !== undefined) {
      const dt = new Date(data.initiatedAt);
      updates.initiated_at = dt.toISOString();
      updates.arrival_date = addBusinessDays(dt, 5).toISOString();
    }
    // ── Store exact per-person split amounts ──
    if (data.splitData) {
      updates.split_me_gross  = +data.splitData.meGross.toFixed(4);
      updates.split_bro_gross = +data.splitData.broGross.toFixed(4);
      updates.split_me_net    = +(data.splitData.meGross * 0.9).toFixed(2);
      updates.split_bro_net   = +(data.splitData.broGross * 0.9).toFixed(2);
    }

    const { data: updated, error } = await supabase.from('withdrawals').update(updates).eq('id', id).select().single();
    if (!error && updated) {
      setWithdrawals(prev => prev.map(w => {
        if (w.id === id) {
          const hasSplit = updated.split_me_gross != null;
          return {
            ...w, ...updated,
            amount: Number(updated.amount),
            netAmount: Number(updated.net_amount),
            initiatedAt: updated.initiated_at,
            arrivalDate: updated.arrival_date,
            persistedSplit: hasSplit ? {
              meGross:  Number(updated.split_me_gross),
              broGross: Number(updated.split_bro_gross),
              meNet:    Number(updated.split_me_net),
              broNet:   Number(updated.split_bro_net),
            } : w.persistedSplit,
          };
        }
        return w;
      }));
    }
  }, []);

  // ─── EXPENSES ───
  const addExpense = useCallback(async (data) => {
    // data.date is already a full ISO string from the view (created with T12:00:00)
    const row = {
      amount: Number(data.amount),
      description: data.description || 'Gasto General',
      date: data.date || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await supabase.from('expenses').insert(row).select().single();
    if (!error && inserted) {
      setExpenses(prev => [{ ...inserted, amount: Number(inserted.amount), createdAt: inserted.created_at }, ...prev]);
    }
  }, []);

  const deleteExpense = useCallback(async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  const editExpense = useCallback(async (id, data) => {
    const updates = {};
    if (data.amount !== undefined) updates.amount = Number(data.amount);
    if (data.description !== undefined) updates.description = data.description;
    if (data.date !== undefined) updates.date = new Date(data.date).toISOString();

    const { data: updated, error } = await supabase.from('expenses').update(updates).eq('id', id).select().single();
    if (!error && updated) {
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updated, amount: Number(updated.amount), createdAt: updated.created_at } : e));
    }
  }, []);

  // ─── STATS — Separate accounts (simple sums) ───
  const stats = useMemo(() => {
    const now = new Date();

    const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
    const thisWeek = payments.filter(p => isSameWeek(new Date(p.date), now, { weekStartsOn: 1 }))
      .reduce((s, p) => s + p.amount, 0);
    const thisMonth = payments.filter(p => isSameMonth(new Date(p.date), now))
      .reduce((s, p) => s + p.amount, 0);

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    // ── Per-person totals (simple sums — no order dependency!) ──
    const totalPaymentsMe  = payments.filter(p => p.owner === 'Me').reduce((s, p) => s + p.amount, 0);
    const totalPaymentsBro = payments.filter(p => p.owner === 'Brother').reduce((s, p) => s + p.amount, 0);

    // Per-person deductions from withdrawals — using persisted splits
    const meWithdrawn = withdrawals.reduce((s, w) => {
      if (w.persistedSplit) return s + w.persistedSplit.meGross;
      // Fallback for records without persisted split
      if (w.owner === 'Me') return s + w.amount;
      if (w.owner === 'Brother') return s;
      return s + w.amount / 2;
    }, 0);

    const broWithdrawn = withdrawals.reduce((s, w) => {
      if (w.persistedSplit) return s + w.persistedSplit.broGross;
      if (w.owner === 'Brother') return s + w.amount;
      if (w.owner === 'Me') return s;
      return s + w.amount / 2;
    }, 0);

    const balMe  = Math.max(0, totalPaymentsMe  - meWithdrawn  - totalExpenses / 2);
    const balBro = Math.max(0, totalPaymentsBro - broWithdrawn - totalExpenses / 2);

    const availableBalances = { Me: balMe, Brother: balBro };
    const availableBalance  = balMe + balBro;

    // Enriched withdrawals — use persisted split from DB
    const enrichedWithdrawals = withdrawals.map(w => ({
      ...w,
      netAmount: w.netAmount ?? +(w.amount * 0.9).toFixed(2),
      arrived: isArrived(w.arrivalDate || w.arrival_date),
      split: w.persistedSplit || {
        meGross:  w.owner === 'Me' ? w.amount : w.owner === 'Brother' ? 0 : w.amount / 2,
        broGross: w.owner === 'Brother' ? w.amount : w.owner === 'Me' ? 0 : w.amount / 2,
        meNet:  +(w.owner === 'Me' ? w.amount * 0.9 : w.owner === 'Brother' ? 0 : w.amount * 0.45).toFixed(2),
        broNet: +(w.owner === 'Brother' ? w.amount * 0.9 : w.owner === 'Me' ? 0 : w.amount * 0.45).toFixed(2),
      },
    }));

    const totalWithdrawn = withdrawals.reduce((s, w) => s + w.amount, 0);
    const inTransit = enrichedWithdrawals.filter(w => !w.arrived)
      .reduce((s, w) => s + w.netAmount, 0);
    const totalCommissions = enrichedWithdrawals.reduce((s, w) => s + (w.amount - w.netAmount), 0);
    const totalNetEarnings = totalReceived - totalCommissions;

    return {
      totalReceived,
      availableBalance,
      availableBalances,
      inTransit,
      thisWeek,
      thisMonth,
      totalCommissions,
      totalNetEarnings,
      totalExpenses,
      enrichedWithdrawals,
    };
  }, [payments, withdrawals, expenses]);

  // ─── Simulate split for withdrawal preview ───
  // New signature: (withdrawalOwner, amount, excludeId) => { meGross, broGross }
  const simulateSplit = useCallback((withdrawalOwner, amount, excludeId = null) => {
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalPaymentsMe  = payments.filter(p => p.owner === 'Me').reduce((s, p) => s + p.amount, 0);
    const totalPaymentsBro = payments.filter(p => p.owner === 'Brother').reduce((s, p) => s + p.amount, 0);

    const meWithdrawn = withdrawals.reduce((s, w) => {
      if (excludeId && w.id === excludeId) return s;
      if (w.persistedSplit) return s + w.persistedSplit.meGross;
      if (w.owner === 'Me') return s + w.amount;
      if (w.owner === 'Brother') return s;
      return s + w.amount / 2;
    }, 0);

    const broWithdrawn = withdrawals.reduce((s, w) => {
      if (excludeId && w.id === excludeId) return s;
      if (w.persistedSplit) return s + w.persistedSplit.broGross;
      if (w.owner === 'Brother') return s + w.amount;
      if (w.owner === 'Me') return s;
      return s + w.amount / 2;
    }, 0);

    const balMe  = Math.max(0, totalPaymentsMe  - meWithdrawn  - totalExpenses / 2);
    const balBro = Math.max(0, totalPaymentsBro - broWithdrawn - totalExpenses / 2);

    // ── Personal withdrawal: only from that person ──
    if (withdrawalOwner === 'Me') {
      return { meGross: Math.min(amount, balMe), broGross: 0 };
    }
    if (withdrawalOwner === 'Brother') {
      return { meGross: 0, broGross: Math.min(amount, balBro) };
    }

    // ── Both: each contributes proportionally, capped at their balance ──
    const total = balMe + balBro;
    if (total <= 0) return { meGross: 0, broGross: 0 };

    if (amount >= total) {
      return { meGross: balMe, broGross: balBro };
    }

    const meContrib  = +(amount * balMe / total).toFixed(2);
    const broContrib = +(amount - meContrib).toFixed(2);
    return { meGross: meContrib, broGross: broContrib };
  }, [payments, withdrawals, expenses]);

  return {
    payments,
    withdrawals: stats.enrichedWithdrawals,
    allWithdrawals: withdrawals,
    expenses,
    stats,
    loading,
    addPayment,
    deletePayment,
    editPayment,
    addWithdrawal,
    deleteWithdrawal,
    editWithdrawal,
    addExpense,
    deleteExpense,
    editExpense,
    simulateSplit,
  };
}
