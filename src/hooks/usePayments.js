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
    const dateObj = data.date ? new Date(data.date) : new Date();
    const row = {
      amount: Number(data.amount),
      owner: data.owner,
      date: dateObj.toISOString(),
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
    const initiatedAt = new Date();
    const gross = Number(data.amount);
    const net = +(gross * 0.9).toFixed(2);
    const row = {
      amount: gross,
      net_amount: net,
      owner: data.owner || 'Me',
      initiated_at: initiatedAt.toISOString(),
      arrival_date: addBusinessDays(initiatedAt, 5).toISOString(),
    };
    const { data: inserted, error } = await supabase.from('withdrawals').insert(row).select().single();
    if (!error && inserted) {
      setWithdrawals(prev => [{
        ...inserted,
        amount: Number(inserted.amount),
        netAmount: Number(inserted.net_amount),
        initiatedAt: inserted.initiated_at,
        arrivalDate: inserted.arrival_date,
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
      updates.amount = Number(data.amount);
      updates.net_amount = +(Number(data.amount) * 0.9).toFixed(2);
    }
    if (data.owner !== undefined) updates.owner = data.owner;

    const { data: updated, error } = await supabase.from('withdrawals').update(updates).eq('id', id).select().single();
    if (!error && updated) {
      setWithdrawals(prev => prev.map(w => {
        if (w.id === id) {
          return {
            ...w, ...updated,
            amount: Number(updated.amount),
            netAmount: Number(updated.net_amount),
            initiatedAt: updated.initiated_at,
            arrivalDate: updated.arrival_date,
          };
        }
        return w;
      }));
    }
  }, []);

  // ─── EXPENSES ───
  const addExpense = useCallback(async (data) => {
    const dateObj = data.date ? new Date(data.date) : new Date();
    const row = {
      amount: Number(data.amount),
      description: data.description || 'Gasto General',
      date: dateObj.toISOString(),
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

  // ─── STATS (same logic as before) ───
  const stats = useMemo(() => {
    const now = new Date();

    const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
    const thisWeek = payments.filter(p => isSameWeek(new Date(p.date), now, { weekStartsOn: 1 }))
      .reduce((s, p) => s + p.amount, 0);
    const thisMonth = payments.filter(p => isSameMonth(new Date(p.date), now))
      .reduce((s, p) => s + p.amount, 0);

    // ── Ledger: Per-person balance tracking ──
    const events = [
      ...payments.map(p => ({ type: 'payment', date: new Date(p.created_at || p.createdAt || p.date).getTime(), amount: p.amount, owner: p.owner })),
      ...withdrawals.map(w => ({ type: 'withdrawal', date: new Date(w.initiated_at || w.initiatedAt).getTime(), amount: w.amount, id: w.id })),
      ...expenses.map(e => ({ type: 'expense', date: new Date(e.created_at || e.createdAt || e.date).getTime(), amount: e.amount }))
    ].sort((a, b) => a.date - b.date);

    let balMe = 0;
    let balBro = 0;
    const splitMap = {};

    for (const ev of events) {
      if (ev.type === 'payment') {
        if (ev.owner === 'Me') balMe += ev.amount;
        else if (ev.owner === 'Brother') balBro += ev.amount;
      } else if (ev.type === 'withdrawal' || ev.type === 'expense') {
        const total = balMe + balBro;
        let meShare = 0.5, broShare = 0.5;
        if (total > 0) {
          meShare = balMe / total;
          broShare = balBro / total;
        }

        const deductMe = ev.amount * meShare;
        const deductBro = ev.amount * broShare;

        balMe = Math.max(0, balMe - deductMe);
        balBro = Math.max(0, balBro - deductBro);

        if (ev.type === 'withdrawal') {
          splitMap[ev.id] = {
            meGross: deductMe,
            broGross: deductBro,
            meNet: +(deductMe * 0.9).toFixed(2),
            broNet: +(deductBro * 0.9).toFixed(2),
          };
        }
      }
    }

    const availableBalances = { Me: balMe, Brother: balBro };

    const enrichedWithdrawals = withdrawals.map(w => ({
      ...w,
      netAmount: w.netAmount ?? +(w.amount * 0.9).toFixed(2),
      arrived: isArrived(w.arrivalDate || w.arrival_date),
      split: splitMap[w.id] || { meGross: w.amount / 2, broGross: w.amount / 2, meNet: +(w.amount * 0.45).toFixed(2), broNet: +(w.amount * 0.45).toFixed(2) }
    }));

    const totalWithdrawn = withdrawals.reduce((s, w) => s + w.amount, 0);
    const inTransit = enrichedWithdrawals.filter(w => !w.arrived)
      .reduce((s, w) => s + w.netAmount, 0);
    const totalCommissions = enrichedWithdrawals.reduce((s, w) => s + (w.amount - w.netAmount), 0);
    const totalNetEarnings = totalReceived - totalCommissions;
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const availableBalance = Math.max(0, totalReceived - totalWithdrawn - totalExpenses);

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
  };
}
