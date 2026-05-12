"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  X, Activity, Pill, FlaskConical, Stethoscope,
  Clock, TrendingUp, FileText, AlertCircle, Search,
  Filter, ChevronDown, ChevronUp, Heart, Thermometer,
  Wind, Weight, Calendar, User, Zap, Shield,
  BarChart2, Download, Printer, RefreshCw, ArrowUpRight,
  Loader2, CheckCircle2, XCircle, SlidersHorizontal
} from "lucide-react";
import supabase from "@/lib/supabase";

/* ── Tiny sparkline (pure SVG, no deps) ───────────────────────────── */
function Sparkline({ values = [], color = "#0d9488", height = 32, width = 120 }) {
  const clean = values.filter((v) => v != null && !isNaN(v));
  if (clean.length < 2) return <span className="text-xs text-slate-300">—</span>;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;
  const pts = clean
    .map((v, i) => {
      const x = (i / (clean.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* last dot */}
      {(() => {
        const last = pts.split(" ").at(-1).split(",");
        return <circle cx={last[0]} cy={last[1]} r="3" fill={color} />;
      })()}
    </svg>
  );
}

/* ── Stat tile ─────────────────────────────────────────────────────── */
function Tile({ icon, label, value, sub, accent = "bg-teal-50 text-teal-600 border-teal-100" }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">{label}</p>
        <p className="text-2xl font-black text-slate-900 leading-none mt-1">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Print ─────────────────────────────────────────────────────────── */
function printHistory(patient, visits, hospital) {
  const html = `<!DOCTYPE html><html><head><title>Full History — ${patient?.full_name}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Georgia,serif;font-size:11px;color:#111;padding:32px 40px;max-width:700px;margin:auto}
    .hdr{border-bottom:2px solid #0d9488;padding-bottom:14px;margin-bottom:18px;display:flex;justify-content:space-between}
    .cn{font-size:18px;font-weight:bold;color:#0d9488}.cs{font-size:9px;color:#888;margin-top:2px}
    h2{font-size:12px;font-weight:bold;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:16px 0 8px;color:#0d9488}
    .vc{border:1px solid #e5e7eb;border-radius:6px;padding:10px 12px;margin-bottom:9px;break-inside:avoid}
    .badge{font-size:8px;font-weight:bold;text-transform:uppercase;background:#f0fdfa;border:1px solid #99f6e4;color:#0f766e;padding:2px 6px;border-radius:3px;margin-right:3px}
    .em{background:#fff1f2;border-color:#fecdd3;color:#be123c}
    .vitrow{display:flex;gap:12px;flex-wrap:wrap;margin:6px 0;background:#f0fdfa;border-radius:4px;padding:6px 8px}
    .vit label{font-size:7px;font-weight:bold;text-transform:uppercase;color:#888}
    .vit p{font-size:11px;font-weight:bold;color:#0f766e;margin-top:1px}
    .footer{margin-top:28px;border-top:1px solid #e5e7eb;padding-top:9px;font-size:8px;color:#bbb;text-align:center}
    @media print{body{padding:12px}}
  </style></head><body>
  <div class="hdr">
    <div><div class="cn">${hospital?.name || "Hospital"}</div><div class="cs">Full Patient History · Confidential</div></div>
    <div style="font-size:9px;color:#888">Printed: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
  </div>
  <h2>Patient: ${patient?.full_name} · ID: ${patient?.patient_id || "N/A"} · Total: ${visits.length} visits</h2>
  ${visits.map((v) => `<div class="vc">
    <div style="display:flex;justify-content:space-between;margin-bottom:5px">
      <div>
        <span class="badge ${v.is_emergency ? "em" : ""}">${v.is_emergency ? "🔴 EMERGENCY" : v.visit_type || "OPD"}</span>
        ${v.visit_status ? `<span class="badge">${v.visit_status}</span>` : ""}
        ${v.icd10_code ? `<span class="badge">${v.icd10_code}</span>` : ""}
      </div>
      <span style="font-size:9px;color:#888">${v.visit_date ? new Date(v.visit_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
    </div>
    ${v.departments?.length ? `<p style="font-size:9px;color:#0d9488;font-weight:bold;margin-bottom:5px">${v.departments.join(" · ")}</p>` : ""}
    ${v.doctor ? `<p style="font-size:9px;color:#888;margin-bottom:5px">Dr. ${v.doctor}</p>` : ""}
    ${v.bp_systolic || v.temperature || v.pulse || v.spo2 ? `<div class="vitrow">
      ${v.bp_systolic ? `<div class="vit"><label>BP</label><p>${v.bp_systolic}/${v.bp_diastolic}</p></div>` : ""}
      ${v.temperature ? `<div class="vit"><label>Temp</label><p>${v.temperature}°C</p></div>` : ""}
      ${v.pulse ? `<div class="vit"><label>Pulse</label><p>${v.pulse}bpm</p></div>` : ""}
      ${v.spo2 ? `<div class="vit"><label>SpO₂</label><p>${v.spo2}%</p></div>` : ""}
    </div>` : ""}
    ${v.complaint ? `<p style="margin:3px 0"><b>CC:</b> ${v.complaint}</p>` : ""}
    ${v.diagnosis ? `<p style="margin:3px 0;font-weight:bold">${v.diagnosis}</p>` : ""}
    ${v.medications?.length ? `<p style="margin:3px 0"><b>Rx:</b> ${v.medications.join(", ")}</p>` : ""}
    ${v.lab_requests?.length ? `<p style="margin:3px 0"><b>Labs:</b> ${v.lab_requests.join(", ")}</p>` : ""}
    ${v.notes ? `<p style="font-size:10px;color:#666;font-style:italic;margin-top:4px">${v.notes}</p>` : ""}
  </div>`).join("")}
  <div class="footer">${hospital?.name || "Hospital"} HMS · Confidential · Not for public distribution</div>
  </body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

/* ── Main ─────────────────────────────────────────────────────────── */
export default function FullHistoryModal({ patient, hospital, isOpen, onClose }) {
  const [visits, setVisits]   = useState([]);
  const [loading, setLoading] = useState(false);

  /* filters */
  const [search,    setSearch]    = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [sortDesc,   setSortDesc]   = useState(true);
  const [expanded,   setExpanded]   = useState({});   // { [visitId]: bool }
  const [tab,        setTab]        = useState("timeline"); // "timeline" | "analytics"

  /* fetch visits whenever modal opens */
  useEffect(() => {
    if (!isOpen || !patient?.id || !hospital?.id) return;
    setLoading(true);
    supabase
      .from("visits")
      .select("*")
      .eq("patient_id", patient.id)
      .eq("hospital_id", hospital.id)
      .order("visit_date", { ascending: false })
      .then(({ data }) => {
        setVisits(data || []);
        setLoading(false);
      });
  }, [isOpen, patient?.id, hospital?.id]);

  /* derived analytics */
  const analytics = useMemo(() => {
    if (!visits.length) return null;
    const emergencies  = visits.filter((v) => v.is_emergency).length;
    const opdCount     = visits.filter((v) => v.visit_type === "OPD").length;
    const ipdCount     = visits.filter((v) => v.visit_type === "IPD").length;
    const openVisits   = visits.filter((v) => v.visit_status === "Open").length;

    /* most-used medications */
    const medFreq = {};
    visits.forEach((v) => (v.medications || []).forEach((m) => { medFreq[m] = (medFreq[m] || 0) + 1; }));
    const topMeds = Object.entries(medFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

    /* most-visited departments */
    const deptFreq = {};
    visits.forEach((v) => (v.departments || []).forEach((d) => { deptFreq[d] = (deptFreq[d] || 0) + 1; }));
    const topDepts = Object.entries(deptFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

    /* vitals series (chronological order for sparklines) */
    const chron = [...visits].reverse();
    const temps   = chron.map((v) => parseFloat(v.temperature)  || null);
    const spo2s   = chron.map((v) => parseFloat(v.spo2)         || null);
    const pulses  = chron.map((v) => parseFloat(v.pulse)        || null);
    const systols = chron.map((v) => parseFloat(v.bp_systolic)  || null);
    const weights = chron.map((v) => parseFloat(v.weight)       || null);

    /* last vitals */
    const lastWithVitals = visits.find((v) => v.temperature || v.spo2 || v.pulse || v.bp_systolic);

    /* avg visits per month */
    const dates = visits.map((v) => new Date(v.visit_date)).filter(Boolean);
    let avgPerMonth = "—";
    if (dates.length > 1) {
      const span = (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24 * 30);
      avgPerMonth = span > 0 ? (visits.length / span).toFixed(1) : visits.length;
    }

    return { emergencies, opdCount, ipdCount, openVisits, topMeds, topDepts, temps, spo2s, pulses, systols, weights, lastWithVitals, avgPerMonth };
  }, [visits]);

  /* filter + sort */
  const allDepts = useMemo(() => {
    const s = new Set();
    visits.forEach((v) => (v.departments || []).forEach((d) => s.add(d)));
    return ["All", ...s];
  }, [visits]);

  const filtered = useMemo(() => {
    let arr = [...visits];
    if (typeFilter !== "All") {
      if (typeFilter === "Emergency") arr = arr.filter((v) => v.is_emergency);
      else arr = arr.filter((v) => !v.is_emergency && v.visit_type === typeFilter);
    }
    if (deptFilter !== "All") arr = arr.filter((v) => (v.departments || []).includes(deptFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((v) =>
        v.complaint?.toLowerCase().includes(q) ||
        v.diagnosis?.toLowerCase().includes(q) ||
        v.doctor?.toLowerCase().includes(q) ||
        (v.medications || []).some((m) => m.toLowerCase().includes(q)) ||
        (v.departments || []).some((d) => d.toLowerCase().includes(q))
      );
    }
    return sortDesc ? arr : [...arr].reverse();
  }, [visits, typeFilter, deptFilter, search, sortDesc]);

  if (!isOpen) return null;

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  /* ── Render ── */
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/70 backdrop-blur-sm p-0 sm:p-4"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>

      <div className="bg-[#F8FAFC] w-full max-w-5xl h-[96vh] sm:h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">

        {/* ── HEADER ── */}
        <div className="shrink-0 bg-white border-b border-slate-100 px-5 sm:px-8 py-4 sm:py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-teal-200 shrink-0">
            {patient?.full_name?.charAt(0) || "P"}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 truncate leading-tight">{patient?.full_name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {patient?.patient_id && (
                <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-mono uppercase">
                  {patient.patient_id}
                </span>
              )}
              <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-50 text-teal-600 rounded-md flex items-center gap-1">
                <TrendingUp size={10} /> {visits.length} visits total
              </span>
              {analytics?.emergencies > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-600 rounded-md flex items-center gap-1">
                  <AlertCircle size={10} /> {analytics.emergencies} emergenc{analytics.emergencies !== 1 ? "ies" : "y"}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => printHistory(patient, filtered, hospital)}
              title="Print history"
              className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-400 hover:text-teal-600 hover:border-teal-200 transition">
              <Printer size={14} />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-500 transition">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="shrink-0 bg-white border-b border-slate-100 px-5 sm:px-8 flex gap-1">
          {[
            { key: "timeline",  label: "Timeline",  icon: <Clock size={12} /> },
            { key: "analytics", label: "Analytics", icon: <BarChart2 size={12} /> },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 text-xs font-black px-4 py-3 border-b-2 transition ${tab === t.key ? "border-teal-500 text-teal-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── LOADING ── */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center gap-3">
            <Loader2 size={18} className="animate-spin text-teal-500" />
            <p className="text-sm font-bold text-slate-400">Loading history…</p>
          </div>
        ) : tab === "analytics" ? (

          /* ════════════════════ ANALYTICS TAB ════════════════════ */
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
            {!analytics ? (
              <p className="text-center text-slate-400 mt-20 text-sm font-bold">No visits to analyse yet.</p>
            ) : (
              <>
                {/* Summary tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Tile icon={<TrendingUp size={15} />}  label="Total Visits"   value={visits.length}          sub="lifetime"                         accent="bg-teal-50 text-teal-600 border-teal-100" />
                  <Tile icon={<AlertCircle size={15} />} label="Emergencies"    value={analytics.emergencies}  sub="critical incidents"                accent="bg-red-50 text-red-500 border-red-100" />
                  <Tile icon={<ArrowUpRight size={15}/>} label="Avg / Month"    value={analytics.avgPerMonth}  sub="visit frequency"                   accent="bg-violet-50 text-violet-600 border-violet-100" />
                  <Tile icon={<CheckCircle2 size={15}/>} label="Open Visits"    value={analytics.openVisits}   sub="still active"                      accent="bg-amber-50 text-amber-600 border-amber-100" />
                </div>

                {/* OPD vs IPD */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Visit Type Breakdown</p>
                  <div className="flex items-center gap-4">
                    {[
                      { label: "OPD", count: analytics.opdCount, color: "bg-teal-500" },
                      { label: "IPD", count: analytics.ipdCount, color: "bg-blue-500" },
                      { label: "Emergency", count: analytics.emergencies, color: "bg-red-500" },
                    ].map(({ label, count, color }) => {
                      const pct = visits.length ? Math.round((count / visits.length) * 100) : 0;
                      return (
                        <div key={label} className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-bold text-slate-600">{label}</span>
                            <span className="text-xs font-black text-slate-900">{count}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">{pct}%</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Vitals trends */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Vitals Trends (chronological)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    {[
                      { label: "Temperature (°C)",  values: analytics.temps,   color: "#f59e0b", unit: analytics.lastWithVitals?.temperature ? `${analytics.lastWithVitals.temperature}°C` : "—" },
                      { label: "SpO₂ (%)",          values: analytics.spo2s,   color: "#3b82f6", unit: analytics.lastWithVitals?.spo2 ? `${analytics.lastWithVitals.spo2}%` : "—" },
                      { label: "Pulse (bpm)",       values: analytics.pulses,  color: "#ef4444", unit: analytics.lastWithVitals?.pulse ? `${analytics.lastWithVitals.pulse}bpm` : "—" },
                      { label: "Systolic BP",       values: analytics.systols, color: "#8b5cf6", unit: analytics.lastWithVitals?.bp_systolic ? `${analytics.lastWithVitals.bp_systolic}mmHg` : "—" },
                      { label: "Weight (kg)",       values: analytics.weights, color: "#0d9488", unit: analytics.lastWithVitals?.weight ? `${analytics.lastWithVitals.weight}kg` : "—" },
                    ].map(({ label, values, color, unit }) => (
                      <div key={label} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                        <Sparkline values={values.filter(Boolean)} color={color} width={110} height={30} />
                        <p className="text-sm font-black mt-1" style={{ color }}>{unit}</p>
                        <p className="text-[9px] text-slate-400">last recorded</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top meds + depts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Pill size={11} className="text-blue-500" /> Most Prescribed
                    </p>
                    {analytics.topMeds.length === 0 ? (
                      <p className="text-xs text-slate-300 italic">No medications recorded</p>
                    ) : (
                      <div className="space-y-2">
                        {analytics.topMeds.map(([med, count]) => (
                          <div key={med} className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 truncate max-w-[70%]">{med}</span>
                            <span className="text-[10px] font-black px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{count}x</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Stethoscope size={11} className="text-teal-500" /> Top Departments
                    </p>
                    {analytics.topDepts.length === 0 ? (
                      <p className="text-xs text-slate-300 italic">No department data</p>
                    ) : (
                      <div className="space-y-2">
                        {analytics.topDepts.map(([dept, count]) => {
                          const pct = visits.length ? Math.round((count / visits.length) * 100) : 0;
                          return (
                            <div key={dept}>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-bold text-slate-700 truncate">{dept}</span>
                                <span className="text-[10px] font-black text-teal-600">{count}x</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

        ) : (

          /* ════════════════════ TIMELINE TAB ════════════════════ */
          <>
            {/* Filter bar */}
            <div className="shrink-0 bg-white border-b border-slate-100 px-4 sm:px-8 py-3 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[140px]">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search complaints, diagnoses, meds…"
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition placeholder:text-slate-300"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-teal-500 transition appearance-none">
                {["All", "OPD", "IPD", "Emergency"].map((t) => <option key={t}>{t}</option>)}
              </select>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-teal-500 transition appearance-none max-w-[130px]">
                {allDepts.map((d) => <option key={d}>{d}</option>)}
              </select>

              <button
                onClick={() => setSortDesc((p) => !p)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 transition whitespace-nowrap">
                {sortDesc ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                {sortDesc ? "Newest first" : "Oldest first"}
              </button>

              <span className="text-[10px] font-bold text-slate-400 ml-auto whitespace-nowrap">
                {filtered.length} / {visits.length}
              </span>
            </div>

            {/* Timeline list */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
              {filtered.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <FileText size={28} strokeWidth={1.5} />
                  </div>
                  <p className="text-base font-black text-slate-400">No visits found</p>
                  <p className="text-xs text-slate-300 mt-1">
                    {visits.length === 0 ? "No visit records exist for this patient." : "Try clearing your filters."}
                  </p>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical spine */}
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200 z-0" />

                  <div className="space-y-5">
                    {filtered.map((v, idx) => {
                      const isOpen   = expanded[v.id];
                      const isEmerg  = v.is_emergency;
                      const dotColor = isEmerg ? "bg-red-500 shadow-red-200" : v.visit_status === "Closed" ? "bg-slate-400" : "bg-teal-500 shadow-teal-200";

                      return (
                        <div key={v.id || idx} className="relative pl-10">
                          {/* Timeline dot */}
                          <div className={`absolute left-0 top-4 w-6 h-6 rounded-full border-2 border-white shadow-md z-10 flex items-center justify-center ${dotColor}`}>
                            {isEmerg
                              ? <AlertCircle size={10} className="text-white" />
                              : <Stethoscope size={9} className="text-white" />}
                          </div>

                          {/* Card */}
                          <div className={`bg-white border rounded-2xl shadow-sm transition-all duration-200 overflow-hidden ${isEmerg ? "border-red-200" : "border-slate-200 hover:border-teal-100 hover:shadow-md"}`}>

                            {/* Card header — always visible, click to expand */}
                            <button
                              onClick={() => toggle(v.id)}
                              className="w-full text-left px-4 sm:px-5 py-4 flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                {/* Row 1: badges + date */}
                                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                  {isEmerg && (
                                    <span className="text-[9px] font-black px-2 py-0.5 bg-red-500 text-white rounded-full">
                                      🔴 EMERGENCY
                                    </span>
                                  )}
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${v.visit_type === "IPD" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-teal-50 text-teal-600 border-teal-100"}`}>
                                    {v.visit_type || "OPD"}
                                  </span>
                                  {v.visit_status && (
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${v.visit_status === "Closed" ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
                                      {v.visit_status}
                                    </span>
                                  )}
                                  {v.icd10_code && (
                                    <span className="text-[9px] font-black px-2 py-0.5 bg-purple-50 text-purple-600 border border-purple-100 rounded-full">
                                      {v.icd10_code}
                                    </span>
                                  )}
                                  <span className="ml-auto text-[10px] text-slate-400 font-bold shrink-0">
                                    {v.visit_date ? new Date(v.visit_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                  </span>
                                </div>

                                {/* Row 2: department + doctor */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  {v.departments?.length > 0 && (
                                    <span className="text-xs font-bold text-teal-700">{v.departments.join(" · ")}</span>
                                  )}
                                  {v.doctor && (
                                    <span className="text-[11px] text-slate-400">Dr. {v.doctor}</span>
                                  )}
                                </div>

                                {/* Row 3: chief complaint preview */}
                                {v.complaint && (
                                  <p className="text-xs text-slate-500 mt-1 italic truncate">
                                    "{v.complaint}"
                                  </p>
                                )}
                                {v.diagnosis && (
                                  <p className="text-xs font-black text-slate-800 mt-0.5 truncate">{v.diagnosis}</p>
                                )}
                              </div>

                              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border transition ${isOpen ? "bg-teal-50 border-teal-100 text-teal-600" : "bg-slate-50 border-slate-100 text-slate-400"}`}>
                                {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </div>
                            </button>

                            {/* Expanded details */}
                            {isOpen && (
                              <div className="px-4 sm:px-5 pb-5 pt-0 space-y-4 border-t border-slate-50">

                                {/* Vitals */}
                                {(v.bp_systolic || v.temperature || v.pulse || v.spo2 || v.weight || v.height) && (
                                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 grid grid-cols-3 sm:grid-cols-6 gap-3">
                                    {[
                                      { label: "BP", val: v.bp_systolic ? `${v.bp_systolic}/${v.bp_diastolic}` : null, icon: <Heart size={10} className="text-red-400" />, warn: false },
                                      { label: "Temp", val: v.temperature ? `${v.temperature}°C` : null, icon: <Thermometer size={10} className="text-amber-400" />, warn: parseFloat(v.temperature) > 37.5 },
                                      { label: "SpO₂", val: v.spo2 ? `${v.spo2}%` : null, icon: <Wind size={10} className="text-blue-500" />, warn: parseFloat(v.spo2) < 95 },
                                      { label: "Pulse", val: v.pulse ? `${v.pulse}bpm` : null, icon: <Activity size={10} className="text-pink-500" />, warn: false },
                                      { label: "Weight", val: v.weight ? `${v.weight}kg` : null, icon: <Weight size={10} className="text-teal-500" />, warn: false },
                                      { label: "Height", val: v.height ? `${v.height}cm` : null, icon: <User size={10} className="text-slate-400" />, warn: false },
                                    ].filter((r) => r.val).map((row) => (
                                      <div key={row.label} className="text-center">
                                        <div className="flex items-center justify-center gap-0.5 mb-0.5">{row.icon}<span className="text-[8px] font-black text-slate-400 uppercase">{row.label}</span></div>
                                        <p className={`text-sm font-black ${row.warn ? "text-orange-600" : "text-slate-800"}`}>{row.val}</p>
                                        {row.warn && <p className="text-[8px] text-orange-500 font-bold">⚠ flagged</p>}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Diagnosis card */}
                                {v.diagnosis && (
                                  <div className="bg-teal-50/40 border border-teal-100 rounded-xl p-3">
                                    <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-1">Final Diagnosis</p>
                                    <p className="text-base font-black text-slate-900 leading-tight">{v.diagnosis}</p>
                                  </div>
                                )}

                                {/* Full complaint */}
                                {v.complaint && (
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Chief Complaint</p>
                                    <p className="text-sm text-slate-600 leading-relaxed">{v.complaint}</p>
                                  </div>
                                )}

                                {/* Medications + Labs side by side */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {v.medications?.length > 0 && (
                                    <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3">
                                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <Pill size={10} /> Medications
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {v.medications.map((m, i) => (
                                          <span key={i} className="text-[11px] font-black px-2.5 py-1 bg-white border border-blue-200 text-blue-700 rounded-lg shadow-sm">
                                            {m}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {v.lab_requests?.length > 0 && (
                                    <div className="bg-violet-50/40 border border-violet-100 rounded-xl p-3">
                                      <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <FlaskConical size={10} /> Investigations
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {v.lab_requests.map((l, i) => (
                                          <span key={i} className="text-[11px] font-black px-2.5 py-1 bg-white border border-violet-200 text-violet-700 rounded-lg shadow-sm">
                                            {l}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Prescription notes */}
                                {v.prescription && (
                                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Prescription Notes</p>
                                    <p className="text-xs text-slate-600 leading-relaxed">{v.prescription}</p>
                                  </div>
                                )}

                                {/* Clinical notes */}
                                {v.notes && (
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Clinical Notes</p>
                                    <p className="text-xs text-slate-500 italic leading-relaxed">{v.notes}</p>
                                  </div>
                                )}

                                {/* Follow-up / fees */}
                                <div className="flex flex-wrap gap-2">
                                  {v.follow_up_date && (
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg">
                                      <Calendar size={10} /> Follow-up: {new Date(v.follow_up_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                    </div>
                                  )}
                                  {v.consultation_fee && (
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
                                      Fee: ₦{Number(v.consultation_fee).toLocaleString("en-NG")}
                                      {v.other_fees ? ` + ₦${Number(v.other_fees).toLocaleString("en-NG")}` : ""}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}