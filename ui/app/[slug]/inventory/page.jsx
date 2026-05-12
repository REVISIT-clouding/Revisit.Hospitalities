"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Menu, Loader2, Plus, X, Search, AlertTriangle,
  Package, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal,
  Edit, Trash2, ChevronDown, ChevronUp, Clock, BarChart2,
  Check, RefreshCw, FileText, Filter, Hash,
} from "lucide-react";
import supabase from "@/lib/supabase";
import { useHospital } from "@/lib/useHospital";
import Sidebar from "@/app/components/patients/Sidebar";

/* ── constants ──────────────────────────────────────────────────── */
const CATEGORIES = ["Medication","Equipment","Consumable","Reagent","Vaccine","Surgical","Other"];
const LOCATIONS  = ["Pharmacy","Store","Ward","Laboratory","Theatre","Emergency","ICU"];
const UNITS      = ["tablets","capsules","vials","ampoules","bottles","boxes","packs","pieces","litres","mL","kg","g","strips","rolls","pairs"];
const TX_TYPES   = ["restock","dispense","adjustment","expired"];

const TX_STYLE = {
  restock:    { bg:"bg-emerald-50 text-emerald-700 border-emerald-200", icon:<ArrowDownCircle size={11}/>, label:"Restock" },
  dispense:   { bg:"bg-blue-50 text-blue-700 border-blue-200",         icon:<ArrowUpCircle size={11}/>,  label:"Dispense" },
  adjustment: { bg:"bg-amber-50 text-amber-700 border-amber-200",      icon:<RefreshCw size={11}/>,      label:"Adjust" },
  expired:    { bg:"bg-red-50 text-red-600 border-red-200",            icon:<X size={11}/>,              label:"Expired" },
};

/* ── helpers ────────────────────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
}
function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / (1000*60*60*24));
}
function stockStatus(item) {
  if (item.quantity <= 0)                  return { label:"Out of Stock",  color:"text-red-600",   bg:"bg-red-50 border-red-200" };
  if (item.quantity <= item.reorder_level) return { label:"Low Stock",     color:"text-amber-600", bg:"bg-amber-50 border-amber-200" };
  return                                          { label:"In Stock",      color:"text-emerald-600",bg:"bg-emerald-50 border-emerald-200" };
}

/* ── empty forms ────────────────────────────────────────────────── */
const EMPTY_ITEM = {
  name:"", category:"Medication", unit:"tablets", quantity:0,
  reorder_level:10, unit_cost:"", supplier:"",
  expiry_date:"", batch_number:"", location:"Pharmacy",
};
const EMPTY_TX = { transaction_type:"restock", quantity:"", notes:"", performed_by:"" };

/* ════════════════════════════════════════════════════════════════ */
export default function InventoryPage() {
  const { hospital, user } = useHospital();

  /* state */
  const [items,       setItems]       = useState([]);
  const [txLog,       setTxLog]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ui */
  const [search,      setSearch]      = useState("");
  const [catFilter,   setCatFilter]   = useState("All");
  const [locFilter,   setLocFilter]   = useState("All");
  const [sortField,   setSortField]   = useState("name");
  const [sortAsc,     setSortAsc]     = useState(true);
  const [showLow,     setShowLow]     = useState(false);
  const [txDrawer,    setTxDrawer]    = useState(false);

  /* modals */
  const [itemModal,   setItemModal]   = useState(null); // null | "new" | item
  const [txModal,     setTxModal]     = useState(null); // null | item
  const [iForm,       setIForm]       = useState(EMPTY_ITEM);
  const [tForm,       setTForm]       = useState(EMPTY_TX);

  /* fetch */
  const loadItems = useCallback(async () => {
    if (!hospital?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("hospital_id", hospital.id)
      .order("name");
    if (data) setItems(data);
    setLoading(false);
  }, [hospital?.id]);

  const loadTx = useCallback(async () => {
    if (!hospital?.id) return;
    const { data } = await supabase
      .from("inventory_transactions")
      .select("*")
      .eq("hospital_id", hospital.id)
      .order("created_at", { ascending: false })
      .limit(80);
    if (data) setTxLog(data);
  }, [hospital?.id]);

  useEffect(() => { loadItems(); loadTx(); }, [loadItems, loadTx]);

  /* stats */
  const totalItems   = items.length;
  const outOfStock   = items.filter((i) => i.quantity <= 0).length;
  const lowStock     = items.filter((i) => i.quantity > 0 && i.quantity <= i.reorder_level).length;
  const expiringIn30 = items.filter((i) => { const d = daysUntil(i.expiry_date); return d !== null && d >= 0 && d <= 30; }).length;

  /* filtered + sorted */
  const displayed = useMemo(() => {
    let arr = [...items];
    if (showLow)          arr = arr.filter((i) => i.quantity <= i.reorder_level);
    if (catFilter !== "All") arr = arr.filter((i) => i.category === catFilter);
    if (locFilter !== "All") arr = arr.filter((i) => i.location === locFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.supplier?.toLowerCase().includes(q) ||
        i.batch_number?.toLowerCase().includes(q)
      );
    }
    arr.sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (typeof va === "string") va = va?.toLowerCase() ?? "";
      if (typeof vb === "string") vb = vb?.toLowerCase() ?? "";
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ?  1 : -1;
      return 0;
    });
    return arr;
  }, [items, showLow, catFilter, locFilter, search, sortField, sortAsc]);

  /* sort toggle */
  function toggleSort(field) {
    if (sortField === field) setSortAsc((p) => !p);
    else { setSortField(field); setSortAsc(true); }
  }
  function SortIcon({ field }) {
    if (sortField !== field) return <ChevronDown size={10} className="text-slate-300" />;
    return sortAsc ? <ChevronUp size={10} className="text-teal-500" /> : <ChevronDown size={10} className="text-teal-500" />;
  }

  /* save item */
  async function handleSaveItem() {
  if (!iForm.name.trim()) return;
  setSaving(true);

  const payload = {
    ...iForm,
    hospital_id:   hospital.id,
    quantity:      Number(iForm.quantity),
    reorder_level: Number(iForm.reorder_level),
    // ── nullable fields: empty string → null ──────────────────
    unit_cost:    iForm.unit_cost    !== "" ? Number(iForm.unit_cost) : null,
    expiry_date:  iForm.expiry_date  || null,   // "" breaks date column
    supplier:     iForm.supplier     || null,
    batch_number: iForm.batch_number || null,
  };

  if (itemModal?.id) {
    await supabase.from("inventory_items").update(payload).eq("id", itemModal.id);
  } else {
    await supabase.from("inventory_items").insert([payload]);
  }

  setItemModal(null);
  setIForm(EMPTY_ITEM);
  await loadItems();
  setSaving(false);
}
  /* delete item */
  async function handleDeleteItem(id) {
    if (!confirm("Delete this item and all its transaction history?")) return;
    await supabase.from("inventory_transactions").delete().eq("item_id", id);
    await supabase.from("inventory_items").delete().eq("id", id);
    loadItems(); loadTx();
  }

  /* transaction */
  async function handleTransaction() {
    if (!tForm.quantity || Number(tForm.quantity) <= 0) return;
    setSaving(true);
    const qty = Number(tForm.quantity);
    const item = txModal;

    /* update quantity */
    let newQty = item.quantity;
    if (tForm.transaction_type === "restock")    newQty += qty;
    if (tForm.transaction_type === "dispense")   newQty = Math.max(0, newQty - qty);
    if (tForm.transaction_type === "expired")    newQty = Math.max(0, newQty - qty);
    if (tForm.transaction_type === "adjustment") newQty = qty; // set absolute

    await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", item.id);
    await supabase.from("inventory_transactions").insert([{
      hospital_id:      hospital.id,
      item_id:          item.id,
      item_name:        item.name,
      transaction_type: tForm.transaction_type,
      quantity:         qty,
      notes:            tForm.notes,
      performed_by:     tForm.performed_by,
    }]);

    setTxModal(null);
    setTForm(EMPTY_TX);
    await loadItems();
    await loadTx();
    setSaving(false);
  }

  if (!hospital) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 size={20} className="animate-spin text-teal-500" />
    </div>
  );

  /* ── render ── */
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes slideIn  { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes slideInL { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes popIn    { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}
      `}</style>

      {/* mobile sidebar */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 z-40 md:hidden" style={{animation:"fadeIn .18s"}} onClick={() => setSidebarOpen(false)} />
          <div className="fixed top-0 left-0 h-screen w-64 bg-white border-r z-50 flex flex-col shadow-2xl md:hidden" style={{animation:"slideInL .22s"}}>
            <Sidebar hospital={hospital} user={user} activePage="inventory" onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      <aside className="hidden md:flex w-56 bg-white border-r border-slate-100 flex-col shrink-0 sticky top-0 h-screen">
        <Sidebar hospital={hospital} user={user} activePage="inventory" />
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">

        {/* header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100 px-3 sm:px-6 py-3 flex items-center gap-2">
          <button onClick={() => setSidebarOpen(true)}
            className="md:hidden w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition">
            <Menu size={15} />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => { setTxDrawer(true); }}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl transition border border-slate-200 whitespace-nowrap">
              <FileText size={13} /><span className="hidden sm:inline">Transaction Log</span>
            </button>
            <button onClick={() => { setIForm(EMPTY_ITEM); setItemModal("new"); }}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm whitespace-nowrap">
              <Plus size={13} /><span className="hidden sm:inline">Add Item</span>
            </button>
          </div>
        </header>

        <div className="flex-1 px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">

          {/* title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Inventory</h1>
            <p className="text-xs text-slate-400 mt-0.5">{hospital.name} · Stock management & tracking</p>
          </div>

          {/* stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label:"Total Items",   value:totalItems,    sub:"in catalogue",      accent:"border-l-teal-500" },
              { label:"Out of Stock",  value:outOfStock,    sub:"need restocking",   accent:"border-l-red-500"  },
              { label:"Low Stock",     value:lowStock,      sub:"below reorder level",accent:"border-l-amber-500"},
              { label:"Expiring Soon", value:expiringIn30,  sub:"within 30 days",    accent:"border-l-orange-500"},
            ].map((c) => (
              <div key={c.label} className={`bg-white border border-slate-200 border-l-4 ${c.accent} rounded-xl px-3 sm:px-4 py-3`}>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{c.label}</p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 leading-none">{c.value}</p>
                <p className="text-[10px] text-slate-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* alerts */}
          {(outOfStock > 0 || lowStock > 0 || expiringIn30 > 0) && (
            <div className="space-y-2">
              {outOfStock > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  <p className="text-sm font-bold text-red-700">{outOfStock} item{outOfStock !== 1 ? "s" : ""} out of stock — immediate restock required</p>
                  <button onClick={() => { setShowLow(true); setCatFilter("All"); }}
                    className="ml-auto text-[10px] font-black text-red-500 hover:underline whitespace-nowrap">View →</button>
                </div>
              )}
              {expiringIn30 > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
                  <Clock size={14} className="text-orange-500 shrink-0" />
                  <p className="text-sm font-bold text-orange-700">{expiringIn30} item{expiringIn30 !== 1 ? "s" : ""} expiring within 30 days</p>
                </div>
              )}
            </div>
          )}

          {/* filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items, suppliers, batch…"
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition placeholder:text-slate-300" />
            </div>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2 outline-none focus:border-teal-500 transition appearance-none">
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select value={locFilter} onChange={(e) => setLocFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2 outline-none focus:border-teal-500 transition appearance-none">
              <option value="All">All Locations</option>
              {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
            <button onClick={() => setShowLow((p) => !p)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition ${showLow ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}>
              <Filter size={11} /> Low stock only
            </button>
            <span className="text-[10px] text-slate-400 font-bold ml-auto">{displayed.length} items</span>
          </div>

          {/* table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {/* table header */}
            <div className="grid text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100 px-4 py-2.5"
              style={{gridTemplateColumns:"2fr 100px 80px 90px 80px 110px 130px"}}>
              <button className="flex items-center gap-1 text-left hover:text-slate-600 transition" onClick={() => toggleSort("name")}>Name <SortIcon field="name"/></button>
              <button className="flex items-center gap-1 hover:text-slate-600 transition" onClick={() => toggleSort("category")}>Category <SortIcon field="category"/></button>
              <button className="flex items-center gap-1 hover:text-slate-600 transition justify-end" onClick={() => toggleSort("quantity")}>Stock <SortIcon field="quantity"/></button>
              <span>Reorder Lvl</span>
              <span className="text-right">Cost</span>
              <button className="flex items-center gap-1 hover:text-slate-600 transition" onClick={() => toggleSort("expiry_date")}>Expiry <SortIcon field="expiry_date"/></button>
              <span className="text-right">Actions</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <Loader2 size={18} className="animate-spin text-teal-500" />
                <span className="text-sm text-slate-400 font-bold">Loading inventory…</span>
              </div>
            ) : displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <Package size={36} strokeWidth={1.5} className="mb-3" />
                <p className="text-sm font-black text-slate-400">No items found</p>
                <p className="text-xs text-slate-300 mt-1">Add your first inventory item to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-[52vh] overflow-y-auto">
                {displayed.map((item) => {
                  const ss       = stockStatus(item);
                  const expDays  = daysUntil(item.expiry_date);
                  const expWarn  = expDays !== null && expDays <= 30;
                  return (
                    <div key={item.id}
                      className="grid items-center px-4 py-3 hover:bg-slate-50 transition group"
                      style={{gridTemplateColumns:"2fr 100px 80px 90px 80px 110px 130px"}}>

                      {/* name */}
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[9px] text-slate-400">{item.location}</span>
                          {item.supplier && <span className="text-[9px] text-slate-400">· {item.supplier}</span>}
                          {item.batch_number && <span className="text-[9px] font-bold text-slate-400 font-mono">#{item.batch_number}</span>}
                        </div>
                      </div>

                      {/* category */}
                      <span className="text-[10px] font-bold text-slate-500">{item.category}</span>

                      {/* stock */}
                      <div className="text-right">
                        <p className={`text-sm font-black ${ss.color}`}>{item.quantity}</p>
                        <p className="text-[9px] text-slate-400">{item.unit}</p>
                      </div>

                      {/* reorder */}
                      <div className="text-center">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${ss.bg}`}>
                          {ss.label}
                        </span>
                        <p className="text-[9px] text-slate-400 mt-0.5">min {item.reorder_level}</p>
                      </div>

                      {/* cost */}
                      <p className="text-xs font-bold text-slate-600 text-right">
                        {item.unit_cost ? `₦${Number(item.unit_cost).toLocaleString("en-NG")}` : "—"}
                      </p>

                      {/* expiry */}
                      <div>
                        {item.expiry_date ? (
                          <p className={`text-xs font-bold ${expWarn ? "text-orange-600" : "text-slate-500"}`}>
                            {fmtDate(item.expiry_date)}
                            {expWarn && <span className="ml-1 text-[9px] font-black text-orange-500">({expDays}d)</span>}
                          </p>
                        ) : <span className="text-[10px] text-slate-300">No expiry</span>}
                      </div>

                      {/* actions */}
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setTForm({ ...EMPTY_TX, transaction_type:"restock" }); setTxModal(item); }}
                          title="Restock" className="flex items-center gap-1 text-[10px] font-black px-2 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition">
                          <ArrowDownCircle size={10}/> In
                        </button>
                        <button onClick={() => { setTForm({ ...EMPTY_TX, transaction_type:"dispense" }); setTxModal(item); }}
                          title="Dispense" className="flex items-center gap-1 text-[10px] font-black px-2 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition">
                          <ArrowUpCircle size={10}/> Out
                        </button>
                        <button onClick={() => { setIForm({ ...item }); setItemModal(item); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition opacity-0 group-hover:opacity-100">
                          <Edit size={11}/>
                        </button>
                        <button onClick={() => handleDeleteItem(item.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                          <Trash2 size={11}/>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── TRANSACTION LOG DRAWER ── */}
      {txDrawer && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 z-40" style={{animation:"fadeIn .15s"}} onClick={() => setTxDrawer(false)} />
          <div className="fixed top-0 right-0 h-screen w-full md:max-w-sm bg-white border-l border-slate-100 z-50 flex flex-col shadow-2xl"
            style={{animation:"slideIn .22s ease-out"}}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
              <FileText size={14} className="text-teal-600" />
              <h3 className="font-black text-slate-900 text-sm">Transaction Log</h3>
              <span className="ml-auto text-[10px] text-slate-400 font-bold">{txLog.length} entries</span>
              <button onClick={() => setTxDrawer(false)}
                className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-500 transition ml-2">
                <X size={13}/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {txLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                  <FileText size={28} strokeWidth={1.5} className="mb-3"/>
                  <p className="text-sm font-black text-slate-400">No transactions yet</p>
                </div>
              ) : txLog.map((tx) => {
                const style = TX_STYLE[tx.transaction_type] || TX_STYLE.adjustment;
                return (
                  <div key={tx.id} className="px-5 py-3 hover:bg-slate-50 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">{tx.item_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border flex items-center gap-1 ${style.bg}`}>
                            {style.icon} {style.label}
                          </span>
                          <span className="text-[10px] font-black text-slate-700">×{tx.quantity}</span>
                          {tx.performed_by && <span className="text-[9px] text-slate-400">by {tx.performed_by}</span>}
                        </div>
                        {tx.notes && <p className="text-[10px] text-slate-400 italic mt-0.5 truncate">{tx.notes}</p>}
                      </div>
                      <p className="text-[9px] text-slate-400 shrink-0 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}
                        <br/>
                        <span className="text-[8px]">{new Date(tx.created_at).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── TRANSACTION MODAL (restock / dispense / etc.) ── */}
      {txModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm" style={{animation:"fadeIn .15s"}} onClick={() => setTxModal(null)}/>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{animation:"popIn .18s"}}>
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${tForm.transaction_type === "restock" ? "bg-emerald-50" : "bg-blue-50"}`}>
                  {tForm.transaction_type === "restock"
                    ? <ArrowDownCircle size={15} className="text-emerald-600"/>
                    : <ArrowUpCircle size={15} className="text-blue-600"/>}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 capitalize">{tForm.transaction_type}</h3>
                  <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{txModal.name}</p>
                </div>
                <button onClick={() => setTxModal(null)}
                  className="ml-auto w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-500 transition">
                  <X size={14}/>
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* current stock */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Current Stock</span>
                  <span className="text-sm font-black text-slate-900">{txModal.quantity} {txModal.unit}</span>
                </div>

                {/* type */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Transaction Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TX_TYPES.map((t) => (
                      <button key={t} onClick={() => setTForm((f) => ({ ...f, transaction_type: t }))}
                        className={`py-2 text-xs font-black rounded-xl border capitalize transition ${tForm.transaction_type === t ? (TX_STYLE[t]?.bg || "bg-teal-50 border-teal-200 text-teal-700") : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                        {TX_STYLE[t]?.label || t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* quantity */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                    {tForm.transaction_type === "adjustment" ? "Set New Quantity" : "Quantity"}
                  </label>
                  <input type="number" min="1" value={tForm.quantity}
                    onChange={(e) => setTForm((f) => ({ ...f, quantity: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition" />
                </div>

                {/* performed by */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Performed By</label>
                  <input value={tForm.performed_by} onChange={(e) => setTForm((f) => ({ ...f, performed_by: e.target.value }))}
                    placeholder="Staff name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition placeholder:text-slate-300" />
                </div>

                {/* notes */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Notes</label>
                  <input value={tForm.notes} onChange={(e) => setTForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional reason or note…"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition placeholder:text-slate-300" />
                </div>
              </div>

              <div className="px-6 pb-5 flex gap-2">
                <button onClick={() => setTxModal(null)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-500 rounded-xl bg-slate-100 hover:bg-slate-200 transition">
                  Cancel
                </button>
                <button onClick={handleTransaction} disabled={saving || !tForm.quantity}
                  className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-black py-2.5 rounded-xl transition">
                  {saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── ADD / EDIT ITEM MODAL ── */}
      {itemModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm" style={{animation:"fadeIn .15s"}} onClick={() => setItemModal(null)}/>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{animation:"popIn .18s"}}>
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-100">

              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                  <Package size={15} className="text-teal-600"/>
                </div>
                <h3 className="text-base font-black text-slate-900">{itemModal?.id ? "Edit Item" : "Add Inventory Item"}</h3>
                <button onClick={() => setItemModal(null)}
                  className="ml-auto w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-500 transition">
                  <X size={14}/>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* name */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Item Name *</label>
                  <input value={iForm.name} onChange={(e) => setIForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Paracetamol 500mg"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition placeholder:text-slate-300"/>
                </div>

                {/* category + location */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Category</label>
                    <select value={iForm.category} onChange={(e) => setIForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition appearance-none">
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Location</label>
                    <select value={iForm.location} onChange={(e) => setIForm((f) => ({ ...f, location: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition appearance-none">
                      {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                </div>

                {/* quantity + unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Quantity</label>
                    <input type="number" min="0" value={iForm.quantity} onChange={(e) => setIForm((f) => ({ ...f, quantity: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Unit</label>
                    <select value={iForm.unit} onChange={(e) => setIForm((f) => ({ ...f, unit: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition appearance-none">
                      {UNITS.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                {/* reorder + unit cost */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Reorder Level</label>
                    <input type="number" min="0" value={iForm.reorder_level} onChange={(e) => setIForm((f) => ({ ...f, reorder_level: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Unit Cost (₦)</label>
                    <input type="number" min="0" value={iForm.unit_cost} onChange={(e) => setIForm((f) => ({ ...f, unit_cost: e.target.value }))}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition placeholder:text-slate-300"/>
                  </div>
                </div>

                {/* supplier + batch */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Supplier</label>
                    <input value={iForm.supplier} onChange={(e) => setIForm((f) => ({ ...f, supplier: e.target.value }))}
                      placeholder="Supplier name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition placeholder:text-slate-300"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Batch Number</label>
                    <input value={iForm.batch_number} onChange={(e) => setIForm((f) => ({ ...f, batch_number: e.target.value }))}
                      placeholder="e.g. BT-2024-001"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition placeholder:text-slate-300"/>
                  </div>
                </div>

                {/* expiry */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Expiry Date</label>
                  <input type="date" value={iForm.expiry_date} onChange={(e) => setIForm((f) => ({ ...f, expiry_date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition"/>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex gap-2 shrink-0">
                <button onClick={() => setItemModal(null)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-500 rounded-xl bg-slate-100 hover:bg-slate-200 transition">
                  Cancel
                </button>
                <button onClick={handleSaveItem} disabled={saving || !iForm.name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-black py-2.5 rounded-xl transition">
                  {saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
                  {itemModal?.id ? "Save Changes" : "Add Item"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}