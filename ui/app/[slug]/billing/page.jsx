"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Menu, Loader2, Plus, X, Search, Receipt, Check, Printer,
  DollarSign, Clock, AlertCircle, CheckCircle2, XCircle,
  Edit, Trash2, Zap, Package,
  TrendingUp, CreditCard, Banknote,
  CloudUpload, Cloud, ShieldCheck, ShieldX,
  ChevronRight, ArrowRight, Building2,
} from "lucide-react";
import supabase from "@/lib/supabase";
import { useHospital } from "@/lib/useHospital";
import Sidebar from "@/app/components/patients/Sidebar";
import QuickCharge from "../QuickCharge/page";
import InsuranceBadge, { getProviderPalette } from "@/app/components/insurance/InsuranceBadge";

/* ── constants ── */
const STATUS_STYLE = {
  pending:   { bg:"bg-amber-50 text-amber-700 border-amber-200",      dot:"bg-amber-500",   label:"Pending"   },
  paid:      { bg:"bg-emerald-50 text-emerald-700 border-emerald-200", dot:"bg-emerald-500", label:"Paid"      },
  cancelled: { bg:"bg-slate-100 text-slate-500 border-slate-200",     dot:"bg-slate-400",   label:"Cancelled" },
  overdue:   { bg:"bg-red-50 text-red-600 border-red-200",            dot:"bg-red-500",     label:"Overdue"   },
};

const HMO_STATUS_STYLE = {
  pending:   { bg:"bg-amber-50 text-amber-700 border-amber-200",      dot:"bg-amber-400",    label:"Pending Submission" },
  submitted: { bg:"bg-blue-50 text-blue-700 border-blue-200",         dot:"bg-blue-500",     label:"Submitted"          },
  received:  { bg:"bg-emerald-50 text-emerald-700 border-emerald-200",dot:"bg-emerald-500",  label:"Received"           },
  rejected:  { bg:"bg-red-50 text-red-600 border-red-200",            dot:"bg-red-500",      label:"Rejected"           },
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
  const [hmoClaims,   setHmoClaims]   = useState([]);   // ← HMO invoices with patient join
  const [providers,   setProviders]   = useState([]);
  const [services,    setServices]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ui */
  const [tab,          setTab]          = useState("invoices"); // invoices | hmo | services
  const [statusFilter, setStatusFilter] = useState("all");
  const [hmoFilter,    setHmoFilter]    = useState("all");      // all | pending | submitted | received
  const [provFilter,   setProvFilter]   = useState("");         // provider id filter for HMO tab
  const [search,       setSearch]       = useState("");
  const [drawer,       setDrawer]       = useState(null);
  const [drawerItems,  setDrawerItems]  = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  /* modals */
  const [quickCharge,  setQuickCharge]  = useState(false);
  const [payModal,     setPayModal]     = useState(null);
  const [payMethod,    setPayMethod]    = useState("Cash");
  const [paying,       setPaying]       = useState(false);
  const [svcModal,     setSvcModal]     = useState(null);
  const [svcForm,      setSvcForm]      = useState(EMPTY_SVC);
  const [savingSvc,    setSavingSvc]    = useState(false);
  const [advancing,    setAdvancing]    = useState(null); // claim id being updated

  /* ── loaders ── */
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

  const loadHmoClaims = useCallback(async () => {
    if (!hospital?.id) return;
    const { data } = await supabase
      .from("invoices")
      .select(`
        *,
        patient:patients(
          insurance_provider_id,
          provider:insurance_providers(id, name)
        )
      `)
      .eq("hospital_id", hospital.id)
      .eq("billing_type", "hmo")
      .order("created_at", { ascending: false });
    if (data) setHmoClaims(data);
  }, [hospital?.id]);

  const loadProviders = useCallback(async () => {
    if (!hospital?.id) return;
    const { data } = await supabase
      .from("insurance_providers")
      .select("*")
      .eq("hospital_id", hospital.id)
      .order("name");
    if (data) setProviders(data);
  }, [hospital?.id]);

  const loadServices = useCallback(async () => {
    if (!hospital?.id) return;
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("hospital_id", hospital.id)
      .order("category").order("name");
    if (data) setServices(data);
  }, [hospital?.id]);

  useEffect(() => {
    loadInvoices();
    loadHmoClaims();
    loadProviders();
    loadServices();
  }, [loadInvoices, loadHmoClaims, loadProviders, loadServices]);

  /* ── drawer ── */
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
    const todayPaid = invoices.filter((i) => i.status === "paid" && i.created_at?.slice(0,10) === todayStr);
    const pending   = invoices.filter((i) => i.status === "pending" && i.billing_type !== "hmo");
    // "Money in the cloud" = unpaid HMO contributions
    const cloudClaims = hmoClaims.filter((c) => c.hmo_status !== "received" && c.hmo_status !== "rejected");
    return {
      revenueToday:  todayPaid.reduce((s, i) => s + Number(i.total_amount), 0),
      paidToday:     todayPaid.length,
      pendingCount:  pending.length,
      pendingAmount: pending.reduce((s, i) => s + Number(i.total_amount), 0),
      cloudAmount:   cloudClaims.reduce((s, c) => s + Number(c.hmo_contribution || 0), 0),
      cloudCount:    cloudClaims.length,
      totalRevenue:  invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total_amount), 0),
    };
  }, [invoices, hmoClaims, todayStr]);

  /* ── provider breakdown for HMO tab ── */
  const providerBreakdown = useMemo(() => {
    return providers.map((prov) => {
      const claims = hmoClaims.filter(
        (c) => c.patient?.insurance_provider_id === prov.id
      );
      const unpaid = claims.filter(
        (c) => c.hmo_status !== "received" && c.hmo_status !== "rejected"
      );
      return {
        ...prov,
        totalClaims:  claims.length,
        unpaidCount:  unpaid.length,
        totalOwed:    unpaid.reduce((s, c) => s + Number(c.hmo_contribution || 0), 0),
      };
    }).filter((p) => p.totalClaims > 0);
  }, [providers, hmoClaims]);

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

  /* ── filtered HMO claims ── */
  const displayedClaims = useMemo(() => {
    let arr = [...hmoClaims];
    if (hmoFilter !== "all") arr = arr.filter((c) => c.hmo_status === hmoFilter);
    if (provFilter) arr = arr.filter((c) => c.patient?.insurance_provider_id === provFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((c) => c.patient_name?.toLowerCase().includes(q) || c.invoice_number?.toLowerCase().includes(q));
    }
    return arr;
  }, [hmoClaims, hmoFilter, provFilter, search]);

  /* ── confirm payment ── */
  async function confirmPayment() {
    if (!payModal) return;
    setPaying(true);
    await supabase.from("invoices").update({
      status: "paid", payment_method: payMethod, paid_at: new Date().toISOString(),
    }).eq("id", payModal.id);
    setPaying(false);
    setPayModal(null);
    if (drawer?.id === payModal.id) setDrawer((d) => ({ ...d, status:"paid", payment_method: payMethod }));
    loadInvoices();
  }

  /* ── advance HMO claim status ── */
  async function advanceHmoStatus(claim) {
    const next = { pending:"submitted", submitted:"received" }[claim.hmo_status];
    if (!next) return;
    setAdvancing(claim.id);
    await supabase.from("invoices").update({ hmo_status: next }).eq("id", claim.id);
    await loadHmoClaims();
    await loadInvoices();
    setAdvancing(null);
  }

  async function rejectHmoClaim(claim) {
    if (!confirm(`Mark this claim for ${claim.patient_name} as rejected?`)) return;
    setAdvancing(claim.id);
    await supabase.from("invoices").update({ hmo_status: "rejected" }).eq("id", claim.id);
    await loadHmoClaims();
    setAdvancing(null);
  }

  /* ── cancel invoice ── */
  async function cancelInvoice(id) {
    if (!confirm("Cancel this invoice?")) return;
    await supabase.from("invoices").update({ status:"cancelled" }).eq("id", id);
    if (drawer?.id === id) setDrawer((d) => ({ ...d, status:"cancelled" }));
    loadInvoices();
  }

  /* ── service CRUD ── */
  async function handleSaveSvc() {
    if (!svcForm.name.trim() || !svcForm.base_price) return;
    setSavingSvc(true);
    const payload = {
      hospital_id: hospital.id, name: svcForm.name.trim(),
      base_price: Number(svcForm.base_price), category: svcForm.category,
      description: svcForm.description || null, is_active: true,
    };
    if (svcModal?.id) await supabase.from("services").update(payload).eq("id", svcModal.id);
    else              await supabase.from("services").insert([payload]);
    setSvcModal(null); setSvcForm(EMPTY_SVC); setSavingSvc(false); loadServices();
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

  /* ── print ── */
  function handlePrint() {
    if (!drawer) return;
    const win = window.open("", "", "width=420,height=650");
    if (!win) { alert("Please allow popups for this site to print receipts."); return; }
    win.document.write(`
      <html><head><title>${drawer.invoice_number}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:monospace;font-size:13px;padding:24px;max-width:320px;margin:0 auto}
        .center{text-align:center}.bold{font-weight:bold}.large{font-size:16px}
        .small{font-size:11px}.dashed{border-top:1px dashed #000;margin:12px 0}
        .row{display:flex;justify-content:space-between;gap:8px;margin:4px 0}
        .muted{font-size:11px;color:#555}.hmo{background:#f5f3ff;border:1px solid #ddd6fe;padding:8px;border-radius:4px;margin:8px 0}
      </style></head><body>
      <div class="center"><p class="large bold">${hospital.name}</p>
        ${hospital.address ? `<p class="small">${hospital.address}</p>` : ""}
        ${hospital.phone   ? `<p class="small">${hospital.phone}</p>` : ""}
      </div>
      <div class="dashed"></div>
      <div class="center"><p class="bold">RECEIPT</p>
        <p class="small">${drawer.invoice_number}</p>
        <p class="small">${fmtDate(drawer.created_at)} ${fmtTime(drawer.created_at)}</p>
      </div>
      <div class="dashed"></div>
      <p class="small bold">PATIENT</p><p>${drawer.patient_name || "Unknown"}</p>
      <div class="dashed"></div>
      ${drawerItems.map((item) => `
        <div class="row">
          <span>${item.service_name}${item.quantity > 1 ? ` ×${item.quantity}` : ""}</span>
          <span>&#8358;${fmt(Number(item.price_charged) * (item.quantity || 1))}</span>
        </div>
      `).join("")}
      <div class="dashed"></div>
      <div class="row bold"><span>TOTAL</span><span>&#8358;${fmt(drawer.total_amount)}</span></div>
      ${drawer.billing_type === "hmo" ? `
        <div class="hmo">
          <div class="row small"><span>Patient Co-pay</span><span>&#8358;${fmt(drawer.patient_contribution)}</span></div>
          <div class="row small"><span>HMO Claim</span><span>&#8358;${fmt(drawer.hmo_contribution)}</span></div>
        </div>
      ` : ""}
      ${drawer.payment_method ? `<div class="row muted"><span>Payment</span><span>${drawer.payment_method}</span></div>` : ""}
      <div class="dashed"></div>
      <div class="center small">
        <p>Thank you for choosing ${hospital.name}</p>
        <p style="margin-top:4px;color:#999">Powered by Revisit HMS</p>
      </div>
      </body></html>
    `);
    win.document.close(); win.focus();
    setTimeout(() => win.print(), 300);
  }

  if (!hospital) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 size={20} className="animate-spin text-teal-500" />
    </div>
  );

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900"
      style={{ fontFamily:"'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes slideIn  { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes slideInL { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes popIn    { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.5} }
        .no-scrollbar::-webkit-scrollbar{display:none}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}
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

          {/* ── STATS GRID ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* Revenue Today */}
            <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 rounded-xl px-3 sm:px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue Today</p>
                <TrendingUp size={14} className="text-emerald-500" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none">₦{fmt(stats.revenueToday)}</p>
              <p className="text-[10px] text-slate-400 mt-1">{stats.paidToday} paid today</p>
            </div>

            {/* Pending */}
            <div className="bg-white border border-slate-200 border-l-4 border-l-amber-500 rounded-xl px-3 sm:px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pending</p>
                <Clock size={14} className="text-amber-500" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{stats.pendingCount}</p>
              <p className="text-[10px] text-slate-400 mt-1">₦{fmt(stats.pendingAmount)} owed</p>
            </div>

            {/* ─── MONEY IN THE CLOUD ─── */}
            <div className="lg:col-span-2 relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
              {/* subtle grid texture */}
              <div className="absolute inset-0 opacity-10"
                style={{backgroundImage:"radial-gradient(circle at 1px 1px, rgba(255,255,255,.3) 1px, transparent 0)", backgroundSize:"20px 20px"}} />
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Cloud size={13} className="text-violet-400" />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Money in the Cloud</p>
                  </div>
                  <button
                    onClick={() => setTab("hmo")}
                    className="text-[9px] font-black text-violet-400 hover:text-violet-300 flex items-center gap-0.5 transition">
                    View all <ChevronRight size={10} />
                  </button>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white leading-none">₦{fmt(stats.cloudAmount)}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {stats.cloudCount} uncollected HMO claim{stats.cloudCount !== 1 ? "s" : ""}
                  {providerBreakdown.length > 0 && ` · ${providerBreakdown.length} provider${providerBreakdown.length !== 1 ? "s" : ""}`}
                </p>
                {/* mini provider pills */}
                {providerBreakdown.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {providerBreakdown.slice(0, 3).map((prov) => {
                      const pal = getProviderPalette(prov.id);
                      return (
                        <span key={prov.id} className={`text-[9px] font-black px-2 py-0.5 rounded-full ${pal.bg} ${pal.text} border ${pal.border}`}>
                          {prov.name} · ₦{fmt(prov.totalOwed)}
                        </span>
                      );
                    })}
                    {providerBreakdown.length > 3 && (
                      <span className="text-[9px] text-slate-500">+{providerBreakdown.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* tabs */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            {[
              ["invoices", "Invoices"],
              ["hmo",      `HMO Claims${stats.cloudCount > 0 ? ` (${stats.cloudCount})` : ""}`],
              ["services", "Services"],
            ].map(([v, label]) => (
              <button key={v} onClick={() => setTab(v)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                  tab === v ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* ══════════════ INVOICES TAB ══════════════ */}
          {tab === "invoices" && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
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
                        statusFilter === v ? "bg-teal-600 text-white border-teal-600" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-teal-300"
                      }`}>{l}</button>
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
                    const isHmo = inv.billing_type === "hmo";
                    return (
                      <div key={inv.id}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition group cursor-pointer ${isHmo ? "border-l-4 border-l-violet-300" : ""}`}
                        onClick={() => openDrawer(inv)}>
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${ss.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-black text-slate-900">{inv.patient_name || "Unknown"}</p>
                            <span className="text-[10px] font-mono font-bold text-slate-400">{inv.invoice_number}</span>
                            {isHmo && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 flex items-center gap-0.5">
                                <ShieldCheck size={8} /> HMO
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-slate-400">{fmtDate(inv.created_at)}</span>
                            {inv.payment_method && <span className="text-[10px] font-bold text-slate-400">· {inv.payment_method}</span>}
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${ss.bg}`}>{ss.label}</span>
                            {isHmo && inv.hmo_status && (
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${(HMO_STATUS_STYLE[inv.hmo_status] || HMO_STATUS_STYLE.pending).bg}`}>
                                {(HMO_STATUS_STYLE[inv.hmo_status] || HMO_STATUS_STYLE.pending).label}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-slate-800">₦{fmt(inv.total_amount)}</p>
                          {isHmo && (
                            <p className="text-[9px] text-violet-500 font-bold">Co-pay ₦{fmt(inv.patient_contribution)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0"
                          onClick={(e) => e.stopPropagation()}>
                          {inv.status === "pending" && !isHmo && (
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════ HMO CLAIMS TAB — "MONEY IN THE CLOUD" ══════════════ */}
          {tab === "hmo" && (
            <div className="space-y-4">

              {/* ── Cloud hero banner ── */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
                {/* grid texture */}
                <div className="absolute inset-0 opacity-10"
                  style={{backgroundImage:"radial-gradient(circle at 1px 1px, rgba(255,255,255,.3) 1px, transparent 0)", backgroundSize:"20px 20px"}} />
                <div className="relative px-5 py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-violet-600/30 border border-violet-500/30 flex items-center justify-center">
                      <Cloud size={22} className="text-violet-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Money in the Cloud</p>
                      <p className="text-3xl font-black text-white mt-0.5">₦{fmt(stats.cloudAmount)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {stats.cloudCount} pending HMO claim{stats.cloudCount !== 1 ? "s" : ""} · earned but not yet received
                      </p>
                    </div>
                  </div>

                  {/* provider breakdown pills */}
                  {providerBreakdown.length > 0 && (
                    <div className="sm:ml-auto flex flex-col gap-1.5">
                      {providerBreakdown.map((prov) => {
                        const pal = getProviderPalette(prov.id);
                        return (
                          <button key={prov.id}
                            onClick={() => setProvFilter(provFilter === prov.id ? "" : prov.id)}
                            className={`flex items-center justify-between gap-4 px-3 py-2 rounded-xl border text-left transition ${
                              provFilter === prov.id
                                ? "bg-white border-white"
                                : `${pal.bg.replace("bg-","bg-opacity-20 bg-")} border-slate-700 hover:border-slate-600`
                            }`}>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${pal.dot}`} />
                              <span className={`text-xs font-black ${provFilter === prov.id ? pal.text : "text-slate-300"}`}>
                                {prov.name}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className={`text-xs font-black ${provFilter === prov.id ? pal.text : "text-white"}`}>
                                ₦{fmt(prov.totalOwed)}
                              </p>
                              <p className="text-[9px] text-slate-500">{prov.unpaidCount} claim{prov.unpaidCount !== 1 ? "s" : ""}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ── HMO status filter + search ── */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search patient or invoice…"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-violet-400 transition placeholder:text-slate-300" />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    ["all",       "All"],
                    ["pending",   "Pending"],
                    ["submitted", "Submitted"],
                    ["received",  "Received"],
                    ["rejected",  "Rejected"],
                  ].map(([v, l]) => (
                    <button key={v} onClick={() => setHmoFilter(v)}
                      className={`text-[10px] font-black px-3 py-1.5 rounded-full border transition ${
                        hmoFilter === v ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-500 border-slate-200 hover:border-violet-300"
                      }`}>{l}</button>
                  ))}
                </div>
                {provFilter && (
                  <button onClick={() => setProvFilter("")}
                    className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 bg-violet-100 text-violet-700 border border-violet-200 rounded-full">
                    <X size={9} /> Clear filter
                  </button>
                )}
              </div>

              {/* ── Claims list ── */}
              {displayedClaims.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center py-16">
                  <ShieldCheck size={32} strokeWidth={1.5} className="text-slate-200 mb-3" />
                  <p className="text-sm font-black text-slate-400">No HMO claims</p>
                  <p className="text-xs text-slate-300 mt-1">
                    {hmoFilter !== "all" ? "Try clearing the filter" : "HMO invoices will appear here"}
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-50">
                  {/* table header */}
                  <div className="px-4 py-2.5 bg-slate-50 grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient / Invoice</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right hidden sm:block">Co-pay</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">HMO Owes</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</p>
                  </div>

                  {displayedClaims.map((claim) => {
                    const hs   = HMO_STATUS_STYLE[claim.hmo_status] || HMO_STATUS_STYLE.pending;
                    const prov = claim.patient?.provider;
                    const pal  = prov ? getProviderPalette(prov.id) : null;
                    const isDone = claim.hmo_status === "received" || claim.hmo_status === "rejected";

                    return (
                      <div key={claim.id}
                        className={`px-4 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center transition ${
                          isDone ? "opacity-60" : "hover:bg-slate-50"
                        }`}>
                        {/* patient info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-black text-slate-800 truncate">{claim.patient_name}</p>
                            <span className="text-[10px] font-mono text-slate-400">{claim.invoice_number}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-slate-400">{fmtDate(claim.created_at)}</span>
                            {prov && pal && (
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${pal.bg} ${pal.text} ${pal.border}`}>
                                {prov.name}
                              </span>
                            )}
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${hs.bg}`}>{hs.label}</span>
                          </div>
                        </div>

                        {/* co-pay */}
                        <div className="text-right hidden sm:block shrink-0">
                          <p className="text-xs font-bold text-teal-600">₦{fmt(claim.patient_contribution)}</p>
                          <p className="text-[9px] text-slate-400">collected</p>
                        </div>

                        {/* HMO owes */}
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-black ${isDone ? "text-slate-400" : "text-slate-800"}`}>
                            ₦{fmt(claim.hmo_contribution)}
                          </p>
                          <p className="text-[9px] text-slate-400">HMO owes</p>
                        </div>

                        {/* action button */}
                        <div className="shrink-0">
                          {advancing === claim.id ? (
                            <Loader2 size={14} className="animate-spin text-slate-400" />
                          ) : claim.hmo_status === "pending" ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => advanceHmoStatus(claim)}
                                className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition whitespace-nowrap">
                                <CloudUpload size={10} /> Submit
                              </button>
                              <button onClick={() => rejectHmoClaim(claim)}
                                className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                                <XCircle size={11} />
                              </button>
                            </div>
                          ) : claim.hmo_status === "submitted" ? (
                            <button onClick={() => advanceHmoStatus(claim)}
                              className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition whitespace-nowrap">
                              <Check size={10} /> Received
                            </button>
                          ) : claim.hmo_status === "received" ? (
                            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600">
                              <CheckCircle2 size={12} /> Done
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-black text-red-400">
                              <XCircle size={12} /> Rejected
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* HMO workflow legend */}
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Claim Workflow</p>
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                  <span className="font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Pending</span>
                  <ArrowRight size={12} className="text-slate-300" />
                  <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Submitted</span>
                  <ArrowRight size={12} className="text-slate-300" />
                  <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Received</span>
                  <span className="text-slate-300 mx-1">·</span>
                  <span className="text-[10px] text-slate-400">Money leaves the cloud only when marked "Received"</span>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ SERVICES TAB ══════════════ */}
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
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Patient</p>
                <p className="text-sm font-black text-slate-800">{drawer.patient_name || "Unknown"}</p>
              </div>

              {/* HMO split display in drawer */}
              {drawer.billing_type === "hmo" && (
                <div className="rounded-2xl overflow-hidden border border-violet-200">
                  <div className="bg-violet-600 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={12} className="text-violet-200" />
                      <span className="text-xs font-black text-white">HMO Billing</span>
                    </div>
                    {drawer.hmo_status && (
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${(HMO_STATUS_STYLE[drawer.hmo_status] || HMO_STATUS_STYLE.pending).bg}`}>
                        {(HMO_STATUS_STYLE[drawer.hmo_status] || HMO_STATUS_STYLE.pending).label}
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-violet-100">
                    <div className="px-4 py-2.5 flex justify-between items-center bg-teal-50">
                      <p className="text-xs font-bold text-teal-700">Patient Co-pay</p>
                      <p className="text-sm font-black text-teal-700">₦{fmt(drawer.patient_contribution)}</p>
                    </div>
                    <div className="px-4 py-2.5 flex justify-between items-center bg-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Cloud size={11} className="text-slate-400" />
                        <p className="text-xs font-bold text-slate-300">HMO Owes</p>
                      </div>
                      <p className="text-sm font-black text-slate-200">₦{fmt(drawer.hmo_contribution)}</p>
                    </div>
                  </div>
                </div>
              )}

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

              {drawer.notes && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes</p>
                  <p className="text-xs text-slate-600 italic">{drawer.notes}</p>
                </div>
              )}

              <div className="bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-black text-teal-800">Total</span>
                <span className="text-xl font-black text-teal-700">₦{fmt(drawer.total_amount)}</span>
              </div>

              {drawer.status === "paid" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Payment</p>
                  <p className="text-xs font-bold text-emerald-700">{drawer.payment_method} · {fmtDate(drawer.paid_at)}</p>
                </div>
              )}
            </div>

            {drawer.status === "pending" && drawer.billing_type !== "hmo" && (
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
                      }`}>{m}</button>
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
          onSent={() => { setQuickCharge(false); loadInvoices(); loadHmoClaims(); }}
        />
      )}
    </div>
  );
}