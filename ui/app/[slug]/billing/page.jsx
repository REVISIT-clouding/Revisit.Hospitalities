"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Menu, Loader2, Plus, X, Search, Receipt, Check, Printer,
  DollarSign, Clock, AlertCircle, CheckCircle2, XCircle,
  ChevronDown, Edit, Trash2, MoreVertical, Zap, Package,
  TrendingUp, Filter, CreditCard, Banknote, Building2,
  ArrowUpRight, Eye, Settings,
} from "lucide-react";
import supabase from "@/lib/supabase";
import { useHospital } from "@/lib/useHospital";
import Sidebar from "@/app/components/patients/Sidebar";
import QuickCharge from "../QuickCharge/page";

/* ── constants ── */
const STATUS_STYLE = {
  pending:   { bg:"bg-amber-50 text-amber-700 border-amber-200",   dot:"bg-amber-500",   label:"Pending"   },
  paid:      { bg:"bg-emerald-50 text-emerald-700 border-emerald-200", dot:"bg-emerald-500", label:"Paid"   },
  cancelled: { bg:"bg-slate-100 text-slate-500 border-slate-200",  dot:"bg-slate-400",   label:"Cancelled" },
  overdue:   { bg:"bg-red-50 text-red-600 border-red-200",          dot:"bg-red-500",     label:"Overdue"   },
};

const PAYMENT_METHODS = ["Cash","Card","Bank Transfer","Insurance","Mobile Money"];
const SVC_CATEGORIES  = ["Consultation","Laboratory","Radiology","Procedure","Pharmacy","Other"];

const CATEGORY_COLOR = {
  Consultation: "bg-teal-50 text-teal-700 border-teal-200",
  Laboratory:   "bg-blue-50 text-blue-700 border-blue-200",
  Radiology:    "bg-violet-50 text-violet-700 border-violet-200",
  Procedure:    "bg-amber-50 text-amber-700 border-amber-200",
  Pharmacy:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  Other:        "bg-slate-50 text-slate-600 border-slate-200",
};

function fmt(n) { return Number(n || 0).toLocaleString("en-NG"); }
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
}
function fmtTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });
}

const EMPTY_SVC = { name:"", base_price:"", category:"Consultation", description:"" };

/* ════════════════════════════════════════════════════════════════ */
export default function BillingPage() {
  const { hospital, user } = useHospital();

  /* data */
  const [invoices,    setInvoices]    = useState([]);
  const [items,       setItems]       = useState({});   // { invoiceId: [items] }
  const [services,    setServices]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ui */
  const [tab,          setTab]          = useState("invoices"); // invoices | services
  const [statusFilter, setStatusFilter] = useState("all");
  const [search,       setSearch]       = useState("");
  const [drawer,       setDrawer]       = useState(null);  // invoice obj
  const [drawerItems,  setDrawerItems]  = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  /* modals */
  const [quickCharge,  setQuickCharge]  = useState(false);
  const [payModal,     setPayModal]     = useState(null); // invoice
  const [payMethod,    setPayMethod]    = useState("Cash");
  const [paying,       setPaying]       = useState(false);
  const [svcModal,     setSvcModal]     = useState(null); // null | "new" | svc
  const [svcForm,      setSvcForm]      = useState(EMPTY_SVC);
  const [savingSvc,    setSavingSvc]    = useState(false);

  /* ── fetch invoices ── */
  const loadInvoices = useCallback(async () => {
    if (!hospital?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("hospital_id", hospital.id)
      .order("created_at", { ascending: false });
    if (data) setInvoices(data);
    setLoading(false);
  }, [hospital?.id]);

  /* ── fetch services ── */
  const loadServices = useCallback(async () => {
    if (!hospital?.id) return;
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("hospital_id", hospital.id)
      .order("category").order("name");
    if (data) setServices(data);
  }, [hospital?.id]);

  useEffect(() => { loadInvoices(); loadServices(); }, [loadInvoices, loadServices]);

  /* ── open drawer → load items ── */
  async function openDrawer(inv) {
    setDrawer(inv);
    setDrawerItems([]);
    setLoadingItems(true);
    const { data } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", inv.id);
    if (data) setDrawerItems(data);
    setLoadingItems(false);
  }

  /* ── stats ── */
  const todayStr = new Date().toISOString().slice(0, 10);
  const stats = useMemo(() => {
    const todayPaid    = invoices.filter((i) => i.status === "paid" && i.created_at?.slice(0,10) === todayStr);
    const pending      = invoices.filter((i) => i.status === "pending");
    const overdue      = invoices.filter((i) => i.status === "overdue");
    return {
      revenueToday:  todayPaid.reduce((s, i) => s + Number(i.total_amount), 0),
      paidToday:     todayPaid.length,
      pendingCount:  pending.length,
      pendingAmount: pending.reduce((s, i) => s + Number(i.total_amount), 0),
      overdueCount:  overdue.length,
      totalRevenue:  invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total_amount), 0),
    };
  }, [invoices, todayStr]);

  /* ── filtered invoices ── */
  const displayed = useMemo(() => {
    let arr = [...invoices];
    if (statusFilter !== "all") arr = arr.filter((i) => i.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((i) =>
        i.patient_name?.toLowerCase().includes(q) ||
        i.invoice_number?.toLowerCase().includes(q)
      );
    }
    return arr;
  }, [invoices, statusFilter, search]);

  /* ── confirm payment ── */
  async function confirmPayment() {
    if (!payModal) return;
    setPaying(true);
    await supabase.from("invoices").update({
      status:         "paid",
      payment_method: payMethod,
      paid_at:        new Date().toISOString(),
    }).eq("id", payModal.id);
    setPaying(false);
    setPayModal(null);
    if (drawer?.id === payModal.id) setDrawer((d) => ({ ...d, status:"paid", payment_method: payMethod }));
    loadInvoices();
  }

  /* ── cancel invoice ── */
  async function cancelInvoice(id) {
    if (!confirm("Cancel this invoice?")) return;
    await supabase.from("invoices").update({ status:"cancelled" }).eq("id", id);
    if (drawer?.id === id) setDrawer((d) => ({ ...d, status:"cancelled" }));
    loadInvoices();
  }

  /* ── save service ── */
  async function handleSaveSvc() {
    if (!svcForm.name.trim() || !svcForm.base_price) return;
    setSavingSvc(true);
    const payload = {
      hospital_id:  hospital.id,
      name:         svcForm.name.trim(),
      base_price:   Number(svcForm.base_price),
      category:     svcForm.category,
      description:  svcForm.description || null,
      is_active:    true,
    };
    if (svcModal?.id) {
      await supabase.from("services").update(payload).eq("id", svcModal.id);
    } else {
      await supabase.from("services").insert([payload]);
    }
    setSvcModal(null);
    setSvcForm(EMPTY_SVC);
    setSavingSvc(false);
    loadServices();
  }

  async function toggleSvcActive(svc) {
    await supabase.from("services").update({ is_active: !svc.is_active }).eq("id", svc.id);
    loadServices();
  }

  async function deleteSvc(id) {
    if (!confirm("Delete this service? This won't affect existing invoices.")) return;
    await supabase.from("services").delete().eq("id", id);
    loadServices();
  }

function handlePrint() {
  if (!drawer) return;

  const win = window.open("", "", "width=420,height=650");
  if (!win) {
    alert("Please allow popups for this site to print receipts.");
    return;
  }

  win.document.write(`
    <html>
      <head>
        <title>${drawer.invoice_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: monospace; font-size: 13px; padding: 24px; max-width: 320px; margin: 0 auto; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .large { font-size: 16px; }
          .small { font-size: 11px; }
          .dashed { border-top: 1px dashed #000; margin: 12px 0; }
          .row { display: flex; justify-content: space-between; gap: 8px; margin: 4px 0; }
          .muted { font-size: 11px; color: #555; }
        </style>
      </head>
      <body>
        <div class="center">
          <p class="large bold">${hospital.name}</p>
          ${hospital.address ? `<p class="small">${hospital.address}</p>` : ""}
          ${hospital.phone ? `<p class="small">${hospital.phone}</p>` : ""}
        </div>
        <div class="dashed"></div>
        <div class="center">
          <p class="bold">RECEIPT</p>
          <p class="small">${drawer.invoice_number}</p>
          <p class="small">${fmtDate(drawer.created_at)} ${fmtTime(drawer.created_at)}</p>
        </div>
        <div class="dashed"></div>
        <p class="small bold">PATIENT</p>
        <p>${drawer.patient_name || "Unknown"}</p>
        <div class="dashed"></div>
        ${drawerItems.map((item) => `
          <div class="row">
            <span>${item.service_name}${item.quantity > 1 ? ` ×${item.quantity}` : ""}</span>
            <span>&#8358;${fmt(Number(item.price_charged) * (item.quantity || 1))}</span>
          </div>
        `).join("")}
        <div class="dashed"></div>
        <div class="row bold">
          <span>TOTAL</span>
          <span>&#8358;${fmt(drawer.total_amount)}</span>
        </div>
        ${drawer.payment_method ? `
          <div class="row muted">
            <span>Payment</span>
            <span>${drawer.payment_method}</span>
          </div>
        ` : ""}
        <div class="dashed"></div>
        <div class="center small">
          <p>Thank you for choosing ${hospital.name}</p>
          <p style="margin-top:4px;color:#999">Powered by Revisit HMS</p>
        </div>
      </body>
    </html>
  `);

  win.document.close();
  win.focus();

  // wait for content to render before printing
  setTimeout(() => win.print(), 300);
  // DON'T call win.close() — let the user close it after printing
}
 


  if (!hospital) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 size={20} className="animate-spin text-teal-500" />
    </div>
  );

  

  /* ── render ── */
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900"
      style={{ fontFamily:"'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes slideIn  { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes slideInL { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes popIn    { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        .no-scrollbar::-webkit-scrollbar{display:none}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}
        @media print { body > * { display: none !important; } #print-receipt { display: block !important; }}
      `}</style>

      {/* mobile sidebar */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 z-40 md:hidden" style={{animation:"fadeIn .18s"}} onClick={() => setSidebarOpen(false)} />
          <div className="fixed top-0 left-0 h-screen w-64 bg-white border-r z-50 flex flex-col shadow-2xl md:hidden" style={{animation:"slideInL .22s"}}>
            <Sidebar hospital={hospital} user={user} activePage="billing" onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      <aside className="hidden md:flex w-56 bg-white border-r border-slate-100 flex-col shrink-0 sticky top-0 h-screen">
        <Sidebar hospital={hospital} user={user} activePage="billing" />
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">

        {/* header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100 px-3 sm:px-6 py-3 flex items-center gap-2">
          <button onClick={() => setSidebarOpen(true)}
            className="md:hidden w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition">
            <Menu size={15} />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setQuickCharge(true)}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm whitespace-nowrap">
              <Zap size={13} /><span className="hidden sm:inline">Quick Charge</span>
            </button>
          </div>
        </header>

        <div className="flex-1 px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">

          {/* title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Billing</h1>
            <p className="text-xs text-slate-400 mt-0.5">{hospital.name} · Invoice & payment management</p>
          </div>

          {/* stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label:"Revenue Today",   value:`₦${fmt(stats.revenueToday)}`,   sub:`${stats.paidToday} paid today`,        accent:"border-l-emerald-500", icon:<TrendingUp size={14} className="text-emerald-500"/> },
              { label:"Pending",         value:stats.pendingCount,               sub:`₦${fmt(stats.pendingAmount)} owed`,    accent:"border-l-amber-500",   icon:<Clock size={14} className="text-amber-500"/> },
              { label:"Overdue",         value:stats.overdueCount,               sub:"need follow-up",                       accent:"border-l-red-500",     icon:<AlertCircle size={14} className="text-red-500"/> },
              { label:"Total Revenue",   value:`₦${fmt(stats.totalRevenue)}`,    sub:"all time paid",                        accent:"border-l-teal-500",    icon:<DollarSign size={14} className="text-teal-500"/> },
            ].map((c) => (
              <div key={c.label} className={`bg-white border border-slate-200 border-l-4 ${c.accent} rounded-xl px-3 sm:px-4 py-3`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{c.label}</p>
                  {c.icon}
                </div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{c.value}</p>
                <p className="text-[10px] text-slate-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* tabs */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            {[["invoices","Invoices"],["services","Services"]].map(([v,label]) => (
              <button key={v} onClick={() => setTab(v)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${tab===v?"bg-white shadow-sm text-slate-800":"text-slate-400 hover:text-slate-600"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* ── INVOICES TAB ── */}
          {tab === "invoices" && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {/* filter bar */}
              <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[160px]">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search patient or invoice #…"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500 transition placeholder:text-slate-300" />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[["all","All"],["pending","Pending"],["paid","Paid"],["overdue","Overdue"],["cancelled","Cancelled"]].map(([v,l]) => (
                    <button key={v} onClick={() => setStatusFilter(v)}
                      className={`text-[10px] font-black px-3 py-1.5 rounded-full border transition ${
                        statusFilter===v ? "bg-teal-600 text-white border-teal-600" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-teal-300"
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 font-bold ml-auto">{displayed.length} invoices</span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 gap-3">
                  <Loader2 size={18} className="animate-spin text-teal-500" />
                  <span className="text-sm text-slate-400 font-bold">Loading invoices…</span>
                </div>
              ) : displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                  <Receipt size={36} strokeWidth={1.5} className="mb-3" />
                  <p className="text-sm font-black text-slate-400">No invoices found</p>
                  <p className="text-xs text-slate-300 mt-1">Use Quick Charge to create your first invoice</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {displayed.map((inv) => {
                    const ss = STATUS_STYLE[inv.status] || STATUS_STYLE.pending;
                    return (
                      <div key={inv.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition group cursor-pointer"
                        onClick={() => openDrawer(inv)}>
                        {/* status dot */}
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${ss.dot}`} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-black text-slate-900">{inv.patient_name || "Unknown"}</p>
                            <span className="text-[10px] font-mono font-bold text-slate-400">{inv.invoice_number}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-slate-400">{fmtDate(inv.created_at)} {fmtTime(inv.created_at)}</span>
                            {inv.payment_method && (
                              <span className="text-[10px] font-bold text-slate-400">· {inv.payment_method}</span>
                            )}
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${ss.bg}`}>{ss.label}</span>
                          </div>
                        </div>

                        <p className="text-sm font-black text-slate-800 shrink-0">₦{fmt(inv.total_amount)}</p>

                        {/* actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0"
                          onClick={(e) => e.stopPropagation()}>
                          {inv.status === "pending" && (
                            <button onClick={() => { setPayModal(inv); setPayMethod("Cash"); }}
                              className="text-[10px] font-black px-2 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition flex items-center gap-1">
                              <Check size={10} /> Pay
                            </button>
                          )}
                          {inv.status === "pending" && (
                            <button onClick={() => cancelInvoice(inv.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition">
                              <XCircle size={12} />
                            </button>
                          )}
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition">
                            <Eye size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── SERVICES TAB ── */}
          {tab === "services" && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <p className="text-xs font-black text-slate-600">{services.length} services</p>
                <button onClick={() => { setSvcForm(EMPTY_SVC); setSvcModal("new"); }}
                  className="ml-auto flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition">
                  <Plus size={12} /> Add Service
                </button>
              </div>

              {services.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                  <Package size={36} strokeWidth={1.5} className="mb-3" />
                  <p className="text-sm font-black text-slate-400">No services yet</p>
                  <p className="text-xs text-slate-300 mt-1">Add services to start billing patients</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {services.map((svc) => (
                    <div key={svc.id} className={`flex items-center gap-3 px-4 py-3 transition group ${!svc.is_active ? "opacity-50" : "hover:bg-slate-50"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-800">{svc.name}</p>
                          {!svc.is_active && <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Inactive</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {svc.category && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${CATEGORY_COLOR[svc.category] || CATEGORY_COLOR.Other}`}>
                              {svc.category}
                            </span>
                          )}
                          {svc.description && <span className="text-[10px] text-slate-400 truncate">{svc.description}</span>}
                        </div>
                      </div>
                      <p className="text-sm font-black text-slate-800 shrink-0">₦{fmt(svc.base_price)}</p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                        <button onClick={() => { setSvcForm({ name:svc.name, base_price:svc.base_price, category:svc.category||"Consultation", description:svc.description||"" }); setSvcModal(svc); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition">
                          <Edit size={11} />
                        </button>
                        <button onClick={() => toggleSvcActive(svc)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition text-slate-300 ${svc.is_active ? "hover:bg-amber-50 hover:text-amber-500" : "hover:bg-emerald-50 hover:text-emerald-600"}`}>
                          {svc.is_active ? <XCircle size={11} /> : <CheckCircle2 size={11} />}
                        </button>
                        <button onClick={() => deleteSvc(svc.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── INVOICE DETAIL DRAWER ── */}
      {drawer && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 z-40" style={{animation:"fadeIn .15s"}} onClick={() => setDrawer(null)} />
          <div className="fixed top-0 right-0 h-screen w-full md:max-w-sm bg-white border-l border-slate-100 z-50 flex flex-col shadow-2xl"
            style={{animation:"slideIn .22s ease-out"}}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
              <Receipt size={14} className="text-teal-600" />
              <div>
                <h3 className="font-black text-slate-900 text-sm">{drawer.invoice_number}</h3>
                <p className="text-[10px] text-slate-400">{fmtDate(drawer.created_at)}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {(() => { const ss = STATUS_STYLE[drawer.status] || STATUS_STYLE.pending; return (
                  <span className={`text-[9px] font-black px-2 py-1 rounded-lg border ${ss.bg}`}>{ss.label}</span>
                );})()}
                <button onClick={handlePrint}
                className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 transition">
                    <Printer size={13} />
                    
                </button>
                <button onClick={() => setDrawer(null)}
                  className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-500 transition">
                  <X size={13} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* patient */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Patient</p>
                <p className="text-sm font-black text-slate-800">{drawer.patient_name || "Unknown"}</p>
                
              </div>
              

              {/* line items */}
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Services</p>
                {loadingItems ? (
                  <div className="flex items-center gap-2 py-4 justify-center">
                    <Loader2 size={14} className="animate-spin text-teal-500" />
                    <span className="text-xs text-slate-400">Loading…</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {drawerItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-xl">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{item.service_name}</p>
                          {item.notes && <p className="text-[10px] text-slate-400 italic truncate">{item.notes}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-slate-800">₦{fmt(item.price_charged)}</p>
                          {item.quantity > 1 && <p className="text-[9px] text-slate-400">×{item.quantity}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* notes */}
              {drawer.notes && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes</p>
                  <p className="text-xs text-slate-600 italic">{drawer.notes}</p>
                </div>
              )}

              {/* total */}
              <div className="bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-black text-teal-800">Total</span>
                <span className="text-xl font-black text-teal-700">₦{fmt(drawer.total_amount)}</span>
              </div>

              {/* payment info */}
              {drawer.status === "paid" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Payment</p>
                  <p className="text-xs font-bold text-emerald-700">{drawer.payment_method} · {fmtDate(drawer.paid_at)}</p>
                </div>
              )}
            </div>

            {/* drawer footer actions */}
            {drawer.status === "pending" && (
              <div className="px-5 py-4 border-t border-slate-100 flex gap-2 shrink-0">
                <button onClick={() => cancelInvoice(drawer.id)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-500 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 transition">
                  Cancel
                </button>
                <button onClick={() => { setPayModal(drawer); setPayMethod("Cash"); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-2.5 rounded-xl transition">
                  <Check size={13} /> Confirm Payment
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── PAYMENT MODAL ── */}
      {payModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 z-50 backdrop-blur-sm" style={{animation:"fadeIn .15s"}} onClick={() => setPayModal(null)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{animation:"popIn .18s"}}>
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <CreditCard size={16} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Confirm Payment</h3>
                  <p className="text-[10px] text-slate-400">{payModal.patient_name} · {payModal.invoice_number}</p>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-center">
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Amount</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">₦{fmt(payModal.total_amount)}</p>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button key={m} onClick={() => setPayMethod(m)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        payMethod === m ? "bg-teal-50 border-teal-300 text-teal-700" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setPayModal(null)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-500 rounded-xl bg-slate-100 hover:bg-slate-200 transition">
                  Cancel
                </button>
                <button onClick={confirmPayment} disabled={paying}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black py-2.5 rounded-xl transition">
                  {paying ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── ADD/EDIT SERVICE MODAL ── */}
      {svcModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm" style={{animation:"fadeIn .15s"}} onClick={() => setSvcModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{animation:"popIn .18s"}}>
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                  <Package size={14} className="text-teal-600" />
                </div>
                <h3 className="text-sm font-black text-slate-900">{svcModal?.id ? "Edit Service" : "New Service"}</h3>
                <button onClick={() => setSvcModal(null)}
                  className="ml-auto w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-500 transition">
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Service Name *</label>
                  <input value={svcForm.name} onChange={(e) => setSvcForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. General Consultation"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Price (₦) *</label>
                    <input type="number" min="0" value={svcForm.base_price} onChange={(e) => setSvcForm((f) => ({ ...f, base_price: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Category</label>
                    <select value={svcForm.category} onChange={(e) => setSvcForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition appearance-none">
                      {SVC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Description</label>
                  <input value={svcForm.description} onChange={(e) => setSvcForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Optional description…"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition placeholder:text-slate-300" />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setSvcModal(null)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-500 rounded-xl bg-slate-100 hover:bg-slate-200 transition">
                  Cancel
                </button>
                <button onClick={handleSaveSvc} disabled={savingSvc || !svcForm.name.trim() || !svcForm.base_price}
                  className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-black py-2.5 rounded-xl transition">
                  {savingSvc ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {svcModal?.id ? "Save" : "Add Service"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      
      {/* ── QUICK CHARGE ── */}
      {quickCharge && (
        <QuickCharge
          onClose={() => setQuickCharge(false)}
          onSent={() => { setQuickCharge(false); loadInvoices(); }}
        />
      )}

      
    </div>
  );
}
