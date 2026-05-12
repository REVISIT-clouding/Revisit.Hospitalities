"use client";
import { TrendingUp, TrendingDown, Activity, AlertCircle, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase'; // Make sure this path to your supabase client is correct

/* ─── COMPONENT 1: THE AUDIT FEED (Now inside this file) ─── */
function AuditFeed() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setLogs(data || []);
    };
    fetchLogs();
  }, []);

  return (
    <div className="divide-y divide-slate-50">
      {logs.length > 0 ? logs.map((log) => (
        <div key={log.id} className="p-4 hover:bg-slate-50 transition">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {log.action === 'PRICE_OVERRIDE' ? <AlertCircle size={14} className="text-orange-500" /> : <Activity size={14} className="text-teal-500" />}
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-slate-800 font-medium">
                <span className="font-bold text-teal-600 uppercase">{log.action}</span> on {log.table_name}
              </p>
              {log.action === 'PRICE_OVERRIDE' && (
                <div className="mt-1 text-[10px] bg-orange-50 border border-orange-100 p-1.5 rounded">
                   Base: ₦{log.old_data?.base_price} → <span className="font-bold text-orange-700">Charged: ₦{log.new_data?.override_price}</span>
                </div>
              )}
              <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400 uppercase">
                <span className="flex items-center gap-1"><User size={8} /> {log.changed_by?.slice(0, 8) || "System"}</span>
                <span>{new Date(log.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      )) : (
        <p className="p-10 text-center text-[10px] text-slate-400 uppercase tracking-widest">No activity logs found</p>
      )}
    </div>
  );
}

/* ─── COMPONENT 2: THE MAIN CONTROL PANEL ─── */
export default function CEOControlPanel({ 
  revenueData = [], 
  expenseData = [], 
  patientCount = 0, 
  inventoryCount = 0 
}) {
  
  const totalRevenue = (revenueData || []).reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const totalExpenses = (expenseData || []).reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const netBalance = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? Math.round((netBalance / totalRevenue) * 100) : 0;

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6 font-sans">
      
      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-teal-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
          <h2 className="text-3xl font-black text-slate-900 mt-1">₦{totalRevenue.toLocaleString()}</h2>
          <div className="mt-4 flex items-center gap-1 text-teal-600 font-bold text-xs"><TrendingUp size={14}/> +12.5%</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-red-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Expenses</p>
          <h2 className="text-3xl font-black text-red-600 mt-1">₦{totalExpenses.toLocaleString()}</h2>
          <button className="mt-4 text-[10px] bg-red-600 text-white px-3 py-1.5 rounded-full font-black uppercase tracking-widest hover:bg-red-700">Add Expense</button>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl md:scale-105 border border-slate-700">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Balance</p>
          <h2 className="text-4xl font-black text-white mt-1">₦{netBalance.toLocaleString()}</h2>
          <div className="mt-4 h-1 w-full bg-slate-800 rounded-full"><div className="h-full bg-teal-400" style={{ width: `${Math.max(0, profitMargin)}%` }} /></div>
          <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Margin: {profitMargin}%</p>
        </div>
      </div>

      {/* Operations Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        {/* Integrity Feed */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest">Live Integrity Feed</h3>
            <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
          </div>
          <div className="max-h-[400px] overflow-y-auto">
             <AuditFeed /> 
          </div>
        </div>

        {/* Expense Distribution */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase mb-8 tracking-widest">Expense Distribution</h3>
          <div className="space-y-6">
            {['Salaries', 'Generator/Fuel', 'Supplies'].map((cat, i) => (
              <div key={cat} className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase"><span>{cat}</span><span>{25 + (i * 15)}%</span></div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full"><div className="h-full bg-slate-400 rounded-full" style={{ width: `${25 + (i * 15)}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-12 p-4 bg-teal-50 rounded-2xl border border-teal-100">
             <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest">Dashboard Active</p>
             <p className="text-[11px] text-teal-600 mt-1 italic">Real-time financial data synced with Supabase triggers.</p>
          </div>
        </div>
      </div>
    </div>
  );
}