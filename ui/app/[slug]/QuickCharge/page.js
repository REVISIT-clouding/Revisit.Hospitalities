"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Search, Plus, Minus, Trash2, Send, Check,
  Loader2, User, Receipt, ChevronRight, Banknote, ShieldCheck,
  CloudUpload, AlertTriangle,
} from "lucide-react";
import supabase from "@/lib/supabase";
import { useHospital } from "@/lib/useHospital";

const SERVICE_CATEGORIES = ["All","Consultation","Laboratory","Radiology","Procedure","Pharmacy","Other"];

const CATEGORY_COLOR = {
  Consultation: "bg-teal-50 text-teal-700 border-teal-200",
  Laboratory:   "bg-blue-50 text-blue-700 border-blue-200",
  Radiology:    "bg-violet-50 text-violet-700 border-violet-200",
  Procedure:    "bg-amber-50 text-amber-700 border-amber-200",
  Pharmacy:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  Other:        "bg-slate-50 text-slate-600 border-slate-200",
};

function fmt(n) { return Number(n || 0).toLocaleString("en-NG"); }

export default function QuickCharge({ onClose, onSent, prefillPatient = null }) {
  const { hospital, user } = useHospital();

  const [step,         setStep]         = useState(prefillPatient ? "services" : "patient");
  const [patient,      setPatient]      = useState(prefillPatient);
  const [patSearch,    setPatSearch]    = useState(prefillPatient?.full_name || "");
  const [patients,     setPatients]     = useState([]);
  const [services,     setServices]     = useState([]);
  const [providers,    setProviders]    = useState([]);
  const [catFilter,    setCatFilter]    = useState("All");
  const [svcSearch,    setSvcSearch]    = useState("");
  const [cart,         setCart]         = useState([]);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [saving,       setSaving]       = useState(false);
  const [invoice,      setInvoice]      = useState(null);

  /* ── HMO billing state ── */
  const [billingType,        setBillingType]        = useState("cash"); // "cash" | "hmo"
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [copay,              setCopay]              = useState("");

  const searchRef = useRef(null);

  /* ── load services ── */
  useEffect(() => {
    if (!hospital?.id) return;
    supabase.from("services")
      .select("*")
      .eq("hospital_id", hospital.id)
      .eq("is_active", true)
      .order("category").order("name")
      .then(({ data }) => { if (data) setServices(data); });
  }, [hospital?.id]);

  /* ── load insurance providers ── */
  useEffect(() => {
    if (!hospital?.id) return;
    supabase.from("insurance_providers")
      .select("*")
      .eq("hospital_id", hospital.id)
      .order("name")
      .then(({ data }) => { if (data) setProviders(data); });
  }, [hospital?.id]);

  /* ── when patient selected, auto-detect HMO ── */
  useEffect(() => {
    if (patient?.insurance_provider_id) {
      setBillingType("hmo");
      setSelectedProviderId(patient.insurance_provider_id);
    } else {
      setBillingType("cash");
      setSelectedProviderId("");
      setCopay("");   
    }
  }, [patient]);

  /* ── patient search ── */
  const searchPatients = useCallback(async (q) => {
    if (!q.trim() || q.length < 2) { setPatients([]); return; }
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, patient_id, phone, insurance_provider_id, insurance:insurance_providers(id, name)")
      .eq("hospital_id", hospital.id)
      .ilike("full_name", `%${q}%`)
      .limit(8);
    if (data) setPatients(data);
  }, [hospital?.id]);

  useEffect(() => {
    const t = setTimeout(() => searchPatients(patSearch), 280);
    return () => clearTimeout(t);
  }, [patSearch, searchPatients]);

  /* ── cart helpers ── */
  function addToCart(svc) {
    setCart((c) => {
      const existing = c.find((i) => i.service.id === svc.id);
      if (existing) return c.map((i) => i.service.id === svc.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { service: svc, qty: 1, price: svc.base_price, notes: "" }];
    });
  }
  function updateQty(id, delta) {
    setCart((c) => c.map((i) => i.service.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  }
  function updatePrice(id, val) {
    setCart((c) => c.map((i) => i.service.id === id ? { ...i, price: val } : i));
  }
  function updateNote(id, val) {
    setCart((c) => c.map((i) => i.service.id === id ? { ...i, notes: val } : i));
  }
  function removeFromCart(id) {
    setCart((c) => c.filter((i) => i.service.id !== id));
  }

  const total    = cart.reduce((s, i) => s + (Number(i.price) * i.qty), 0);
  const copayAmt = billingType === "hmo" ? Math.min(Number(copay) || 0, total) : total;
  const hmoOwed  = billingType === "hmo" ? Math.max(0, total - copayAmt) : 0;

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  /* ── filtered services ── */
  const displayedServices = services.filter((s) => {
    const matchCat = catFilter === "All" || s.category === catFilter;
    const matchQ   = !svcSearch.trim() || s.name.toLowerCase().includes(svcSearch.toLowerCase());
    return matchCat && matchQ;
  });

  /* ── submit ── */
  async function handleSend() {
    if (!patient || cart.length === 0) return;
    setSaving(true);
    try {
      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .insert([{
          hospital_id:          hospital.id,
          patient_id:           patient.id,
          patient_name:         patient.full_name,
          doctor_id:            user?.id || null,
          total_amount:         total,
          status:               "pending",
          notes:                invoiceNotes || null,
          created_by:           user?.id || null,
          billing_type:         billingType,
          patient_contribution: billingType === "hmo" ? copayAmt : total,
          hmo_contribution:     billingType === "hmo" ? hmoOwed  : 0,
          hmo_status:           billingType === "hmo" ? "pending" : null,
        }])
        .select()
        .single();

      if (invErr) throw invErr;

      const items = cart.map((i) => ({
        invoice_id:    inv.id,
        service_id:    i.service.id,
        service_name:  i.service.name,
        price_charged: Number(i.price),
        quantity:      i.qty,
        notes:         i.notes || null,
      }));
      const { error: itemErr } = await supabase.from("invoice_items").insert(items);
      if (itemErr) throw itemErr;

      setInvoice(inv);
      setStep("done");
      onSent?.();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  /* ── render ── */
  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm"
        style={{ animation: "fadeIn .15s" }}
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
        style={{ animation: "popIn .2s" }}
      >
        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-100">

          {/* ── header ── */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center">
              <Receipt size={15} className="text-teal-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Quick Charge</h3>
              <p className="text-[10px] text-slate-400">
                {step === "patient"  && "Select patient"}
                {step === "services" && (patient ? patient.full_name : "Add services")}
                {step === "review"   && `Review · ₦${fmt(total)}`}
                {step === "done"     && "Sent to billing"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 mr-2">
              {["patient","services","review"].map((s, i) => (
                <div key={s} className={`w-2 h-2 rounded-full transition-all ${
                  step === s ? "bg-teal-600 w-4" :
                  ["patient","services","review","done"].indexOf(step) > i ? "bg-teal-300" : "bg-slate-200"
                }`} />
              ))}
            </div>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-500 transition">
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* ══════════════ STEP 1: PATIENT ══════════════ */}
            {step === "patient" && (
              <div className="px-5 py-4 space-y-3">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    ref={searchRef}
                    autoFocus
                    value={patSearch}
                    onChange={(e) => setPatSearch(e.target.value)}
                    placeholder="Type patient name…"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition placeholder:text-slate-300"
                  />
                </div>

                {patients.length > 0 && (
                  <div className="space-y-1">
                    {patients.map((p) => {
                      const hasHmo = !!p.insurance_provider_id;
                      return (
                        <button key={p.id}
                          onClick={() => {
                            setPatient(p);
                            setPatSearch(p.full_name);
                            setPatients([]);
                            setStep("services");
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-teal-50 border border-transparent hover:border-teal-100 transition text-left">
                          <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-black shrink-0">
                            {p.full_name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-slate-800 truncate">{p.full_name}</p>
                            <p className="text-[10px] text-slate-400">{p.patient_id}{p.phone ? " · " + p.phone : ""}</p>
                          </div>
                          {hasHmo && (
                            <span className="shrink-0 flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                              <ShieldCheck size={9} /> HMO
                            </span>
                          )}
                          <ChevronRight size={14} className="text-slate-300 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {patSearch.length >= 2 && patients.length === 0 && (
                  <div className="flex flex-col items-center py-8 text-slate-300">
                    <User size={28} strokeWidth={1.5} className="mb-2" />
                    <p className="text-xs font-bold text-slate-400">No patients found</p>
                  </div>
                )}
                {patSearch.length < 2 && (
                  <p className="text-center text-xs text-slate-300 py-6">Type at least 2 characters to search</p>
                )}
              </div>
            )}

            {/* ══════════════ STEP 2: SERVICES ══════════════ */}
            {step === "services" && (
              <div className="flex flex-col h-full text-gray-700">

                {/* ── billing type toggle ── */}
                {/* ── billing type ── */}
<div className="px-5 pt-4 pb-3 border-b border-slate-100">
  <div className="flex items-center justify-between mb-2">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Billing Type</p>
    {patient?.insurance_provider_id && billingType === "hmo" && (
      <span className="text-[9px] font-black text-violet-500 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
        Auto-detected from patient
      </span>
    )}
  </div>

  <div className="flex gap-2">
    <button
      onClick={() => { setBillingType("cash"); setSelectedProviderId(""); setCopay(""); }}
      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black border transition ${
        billingType === "cash"
          ? "bg-teal-600 text-white border-teal-600 shadow-sm"
          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
      }`}
    >
      <Banknote size={13} /> Cash / Self-Pay
    </button>
    <button
      onClick={() => {
        setBillingType("hmo");
        if (patient?.insurance_provider_id) {
          setSelectedProviderId(patient.insurance_provider_id);
        }
      }}
      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black border transition ${
        billingType === "hmo"
          ? "bg-violet-600 text-white border-violet-600 shadow-sm"
          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
      }`}
    >
      <ShieldCheck size={13} /> HMO / Insurance
    </button>
  </div>

  {billingType === "hmo" && (
    <div className="mt-2 space-y-1">
      <select
        value={selectedProviderId}
        onChange={(e) => setSelectedProviderId(e.target.value)}
        className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 text-xs font-bold text-violet-800 outline-none focus:border-violet-400 transition"
      >
        <option value="">— Select HMO Provider —</option>
        {providers.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {providers.length === 0 && (
        <p className="text-[10px] text-amber-600 font-bold px-1">
          ⚠ No providers found — add them in Settings first
        </p>
      )}
    </div>
  )}
</div>
             
                {/* service search + filter */}
                <div className="px-5 pt-3 pb-3 space-y-2 border-b border-slate-50">
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      value={svcSearch}
                      onChange={(e) => setSvcSearch(e.target.value)}
                      placeholder="Search services…"
                      className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500 transition placeholder:text-slate-300"
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                    {SERVICE_CATEGORIES.map((c) => (
                      <button key={c} onClick={() => setCatFilter(c)}
                        className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full border transition ${
                          catFilter === c ? "bg-teal-600 text-white border-teal-600" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-teal-300"
                        }`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* service list */}
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
                  {displayedServices.length === 0 ? (
                    <p className="text-center text-xs text-slate-300 py-8">No services found</p>
                  ) : displayedServices.map((svc) => {
                    const inCart = cart.find((i) => i.service.id === svc.id);
                    return (
                      <div key={svc.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition cursor-pointer ${
                          inCart ? "bg-teal-50 border-teal-200" : "bg-white border-slate-100 hover:border-teal-200 hover:bg-slate-50"
                        }`}
                        onClick={() => addToCart(svc)}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">{svc.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {svc.category && (
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${CATEGORY_COLOR[svc.category] || CATEGORY_COLOR.Other}`}>
                                {svc.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-slate-800">₦{fmt(svc.base_price)}</p>
                          {inCart
                            ? <p className="text-[9px] font-black text-teal-600">×{inCart.qty} added</p>
                            : <p className="text-[9px] text-slate-400">tap to add</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* cart summary bar */}
                {cart.length > 0 && (
                  <div className="px-5 py-3 border-t border-slate-100 bg-white space-y-2">
                    {/* HMO: copay input */}
                    {billingType === "hmo" && (
                      <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
                        <ShieldCheck size={12} className="text-violet-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black text-violet-700 uppercase tracking-widest">Patient Co-pay</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs text-violet-500 font-bold">₦</span>
                            <input
                              type="number"
                              min="0"
                              max={total}
                              value={copay}
                              onChange={(e) => setCopay(e.target.value)}
                              placeholder="0"
                              className="w-full text-sm font-black text-violet-800 bg-transparent outline-none"
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[9px] text-violet-500 font-bold">HMO owes</p>
                          <p className="text-sm font-black text-violet-700">₦{fmt(hmoOwed)}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-xs font-black text-slate-800">{cart.length} service{cart.length !== 1 ? "s" : ""}</p>
                        <p className="text-[10px] text-slate-400">₦{fmt(total)} total</p>
                      </div>
                      <button onClick={() => setStep("review")}
                        disabled={billingType === "hmo" && !selectedProviderId}
                        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-black px-4 py-2.5 rounded-xl transition">
                        Review <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════ STEP 3: REVIEW ══════════════ */}
            {step === "review" && (
              <div className="px-5 py-4 space-y-4">
                {/* patient */}
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-black">
                    {patient?.full_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">{patient?.full_name}</p>
                    <p className="text-[10px] text-slate-400">{patient?.patient_id}</p>
                  </div>
                  <button onClick={() => setStep("services")} className="ml-auto text-[10px] font-bold text-teal-600 hover:underline">Edit</button>
                </div>

                {/* billing type indicator */}
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-xs font-black ${
                  billingType === "hmo"
                    ? "bg-violet-50 border-violet-200 text-violet-700"
                    : "bg-teal-50 border-teal-200 text-teal-700"
                }`}>
                  {billingType === "hmo" ? <ShieldCheck size={13} /> : <Banknote size={13} />}
                  {billingType === "hmo"
                    ? `HMO Billing · ${selectedProvider?.name || "Provider selected"}`
                    : "Cash / Self-Pay"}
                </div>

                {/* line items */}
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.service.id} className="bg-white border border-slate-100 rounded-2xl p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800">{item.service.name}</p>
                          {item.service.category && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${CATEGORY_COLOR[item.service.category] || CATEGORY_COLOR.Other}`}>
                              {item.service.category}
                            </span>
                          )}
                        </div>
                        <button onClick={() => removeFromCart(item.service.id)}
                          className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition">
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-50 rounded-xl border border-slate-200 px-1">
                          <button onClick={() => updateQty(item.service.id, -1)}
                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 transition">
                            <Minus size={10} />
                          </button>
                          <span className="text-xs font-black text-slate-700 w-5 text-center">{item.qty}</span>
                          <button onClick={() => updateQty(item.service.id, 1)}
                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 transition">
                            <Plus size={10} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 flex-1">
                          <span className="text-[10px] text-slate-400 font-bold">₦</span>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updatePrice(item.service.id, e.target.value)}
                            className="w-full text-xs font-black text-slate-700 bg-transparent outline-none"
                          />
                        </div>
                        <p className="text-xs font-black text-slate-800 shrink-0">
                          = ₦{fmt(Number(item.price) * item.qty)}
                        </p>
                      </div>
                      <input
                        value={item.notes}
                        onChange={(e) => updateNote(item.service.id, e.target.value)}
                        placeholder="Note (optional)…"
                        className="w-full text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 outline-none focus:border-teal-400 transition placeholder:text-slate-300"
                      />
                    </div>
                  ))}
                </div>

                <button onClick={() => setStep("services")}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-400 hover:border-teal-300 hover:text-teal-600 transition">
                  <Plus size={13} /> Add another service
                </button>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Invoice Notes</label>
                  <textarea
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    rows={2}
                    placeholder="Any notes for billing…"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-teal-500 transition resize-none placeholder:text-slate-300"
                  />
                </div>

                {/* ── PAYMENT BREAKDOWN ── */}
                {billingType === "cash" ? (
                  /* Cash: simple total */
                  <div className="bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-black text-teal-800">Total Amount</span>
                    <span className="text-xl font-black text-teal-700">₦{fmt(total)}</span>
                  </div>
                ) : (
                  /* HMO: split breakdown — THIS IS THE MONEY SPLIT VIEW */
                  <div className="rounded-2xl overflow-hidden border border-violet-200">
                    {/* header */}
                    <div className="bg-violet-600 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs font-black text-white">Total Invoice</span>
                      <span className="text-lg font-black text-white">₦{fmt(total)}</span>
                    </div>

                    {/* co-pay row */}
                    <div className="bg-teal-50 border-b border-violet-100 px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-teal-800">Patient Co-pay</p>
                        <p className="text-[10px] text-teal-600">Collect now at desk</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-teal-700">₦{fmt(copayAmt)}</p>
                        <p className="text-[9px] font-bold text-teal-500 uppercase">Due now</p>
                      </div>
                    </div>

                    {/* HMO row */}
                    <div className="bg-slate-800 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CloudUpload size={14} className="text-slate-400" />
                        <div>
                          <p className="text-xs font-black text-white">
                            {selectedProvider?.name || "HMO"} Owes
                          </p>
                          <p className="text-[10px] text-slate-400">Pending claim · goes to cloud</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-200">₦{fmt(hmoOwed)}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">In the cloud</p>
                      </div>
                    </div>

                    {copayAmt === 0 && (
                      <div className="bg-amber-50 border-t border-amber-100 px-4 py-2 flex items-center gap-2">
                        <AlertTriangle size={11} className="text-amber-500 shrink-0" />
                        <p className="text-[10px] text-amber-700 font-bold">No co-pay set — full amount becomes an HMO claim</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════ STEP 4: DONE ══════════════ */}
            {step === "done" && (
              <div className="flex flex-col items-center justify-center py-12 px-5 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                  <Check size={28} className="text-white" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-800">Sent to Billing!</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Invoice {invoice?.invoice_number} created for {patient?.full_name}
                  </p>
                </div>

                {/* done summary */}
                {billingType === "hmo" ? (
                  <div className="w-full rounded-2xl overflow-hidden border border-violet-200">
                    <div className="bg-violet-600 px-4 py-2.5 text-center">
                      <p className="text-[9px] font-black text-violet-200 uppercase tracking-widest">Invoice Split</p>
                    </div>
                    <div className="bg-teal-50 border-b border-violet-100 px-4 py-3 flex justify-between">
                      <p className="text-xs font-bold text-teal-700">Collect from patient</p>
                      <p className="text-sm font-black text-teal-700">₦{fmt(copayAmt)}</p>
                    </div>
                    <div className="bg-slate-800 px-4 py-3 flex justify-between">
                      <div className="flex items-center gap-1.5">
                        <CloudUpload size={12} className="text-slate-400" />
                        <p className="text-xs font-bold text-slate-300">In the Cloud</p>
                      </div>
                      <p className="text-sm font-black text-slate-200">₦{fmt(hmoOwed)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-teal-50 border border-teal-100 rounded-2xl px-5 py-3 text-center w-full">
                    <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest">Total Billed</p>
                    <p className="text-2xl font-black text-teal-700 mt-1">₦{fmt(total)}</p>
                    <p className="text-[10px] text-teal-600 mt-1">Status: Pending · Awaiting payment</p>
                  </div>
                )}

                <button onClick={onClose}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-black rounded-xl transition">
                  Done
                </button>
              </div>
            )}
          </div>

          {/* ── footer ── */}
          {step === "review" && (
            <div className="px-5 py-4 border-t border-slate-100 flex gap-2 shrink-0">
              <button onClick={() => setStep("services")}
                className="flex-1 py-2.5 text-xs font-bold text-slate-500 rounded-xl bg-slate-100 hover:bg-slate-200 transition">
                Back
              </button>
              <button onClick={handleSend} disabled={saving || cart.length === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-black py-2.5 rounded-xl transition">
                {saving
                  ? <><Loader2 size={13} className="animate-spin" /> Sending…</>
                  : <><Send size={13} /> Send to Billing</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}