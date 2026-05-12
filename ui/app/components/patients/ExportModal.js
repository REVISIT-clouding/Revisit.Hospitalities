"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  X, Download, FileText, Users, Activity,
  CheckSquare, Square, Loader2, ChevronDown,
  ChevronUp, Calendar, Check, AlertCircle, Database
} from "lucide-react";
import supabase from "@/lib/supabase";

/* ── helpers ─────────────────────────────────────────────────────── */
function calcAge(dob) {
  if (!dob) return "";
  return Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25));
}

function escapeCSV(val) {
  if (val == null || val === "") return "";
  const str = String(val).replace(/"/g, '""');
  return /[",\n\r]/.test(str) ? `"${str}"` : str;
}

function buildCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCSV).join(","),
    ...rows.map((r) => headers.map((h) => escapeCSV(r[h])).join(",")),
  ];
  return lines.join("\r\n");
}

function downloadCSV(csvString, filename) {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── column definitions ──────────────────────────────────────────── */
const PATIENT_COLS = [
  { key: "patient_id",              label: "Patient ID"          },
  { key: "full_name",               label: "Full Name"           },
  { key: "age",                     label: "Age"                 },
  { key: "date_of_birth",           label: "Date of Birth"       },
  { key: "gender",                  label: "Gender"              },
  { key: "phone",                   label: "Phone"               },
  { key: "address",                 label: "Address"             },
  { key: "blood_group",             label: "Blood Group"         },
  { key: "genotype",                label: "Genotype"            },
  { key: "allergies",               label: "Allergies"           },
  { key: "insurance_provider",      label: "Insurance Provider"  },
  { key: "nhia_number",             label: "NHIA Number"         },
  { key: "insurance_id",            label: "Insurance ID"        },
  { key: "emergency_contact_name",  label: "Emergency Contact"   },
  { key: "emergency_contact_phone", label: "Emergency Phone"     },
  { key: "created_at",              label: "Registered Date"     },
];

const VISIT_COLS = [
  /* patient identifiers */
  { key: "patient_id",    label: "Patient ID",    group: "patient" },
  { key: "full_name",     label: "Patient Name",  group: "patient" },
  { key: "age",           label: "Age",           group: "patient" },
  { key: "phone",         label: "Phone",         group: "patient" },
  { key: "blood_group",   label: "Blood Group",   group: "patient" },
  { key: "genotype",      label: "Genotype",      group: "patient" },
  { key: "allergies",     label: "Allergies",     group: "patient" },
  /* visit fields */
  { key: "visit_date",    label: "Visit Date",    group: "visit"   },
  { key: "visit_type",    label: "Visit Type",    group: "visit"   },
  { key: "visit_status",  label: "Status",        group: "visit"   },
  { key: "is_emergency",  label: "Emergency",     group: "visit"   },
  { key: "departments",   label: "Departments",   group: "visit"   },
  { key: "doctor",        label: "Doctor",        group: "visit"   },
  /* vitals */
  { key: "bp_systolic",   label: "BP Systolic",   group: "vitals"  },
  { key: "bp_diastolic",  label: "BP Diastolic",  group: "vitals"  },
  { key: "temperature",   label: "Temperature °C",group: "vitals"  },
  { key: "pulse",         label: "Pulse bpm",     group: "vitals"  },
  { key: "spo2",          label: "SpO₂ %",        group: "vitals"  },
  { key: "weight",        label: "Weight kg",     group: "vitals"  },
  { key: "height",        label: "Height cm",     group: "vitals"  },
  /* clinical */
  { key: "complaint",     label: "Chief Complaint",group: "clinical"},
  { key: "diagnosis",     label: "Diagnosis",     group: "clinical"},
  { key: "icd10_code",    label: "ICD-10 Code",   group: "clinical"},
  { key: "medications",   label: "Medications",   group: "clinical"},
  { key: "lab_requests",  label: "Lab Requests",  group: "clinical"},
  { key: "prescription",  label: "Prescription",  group: "clinical"},
  { key: "notes",         label: "Notes",         group: "clinical"},
  /* finance */
  { key: "consultation_fee", label: "Consult Fee ₦", group: "finance"},
  { key: "other_fees",    label: "Other Fees ₦",  group: "finance" },
];

const GROUP_LABELS = {
  patient: "Patient Info",
  visit:   "Visit Details",
  vitals:  "Vital Signs",
  clinical:"Clinical",
  finance: "Finance",
};

/* ── toggle checkbox ─────────────────────────────────────────────── */
function ColToggle({ label, checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition select-none
        ${checked
          ? "bg-teal-50 border-teal-200 text-teal-700"
          : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"}`}>
      {checked ? <CheckSquare size={11} /> : <Square size={11} />}
      {label}
    </button>
  );
}

/* ── main ────────────────────────────────────────────────────────── */
export default function ExportModal({ hospital, isOpen, onClose }) {
  const [mode,        setMode]        = useState("patients"); // "patients" | "records"
  const [patients,    setPatients]    = useState([]);
  const [visits,      setVisits]      = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [exporting,   setExporting]   = useState(false);
  const [done,        setDone]        = useState(false);

  /* column selection */
  const defaultPCols = new Set(PATIENT_COLS.map((c) => c.key));
  const defaultVCols = new Set(["patient_id","full_name","age","phone","visit_date","visit_type","visit_status","is_emergency","departments","doctor","complaint","diagnosis","medications"]);
  const [selPCols, setSelPCols] = useState(defaultPCols);
  const [selVCols, setSelVCols] = useState(defaultVCols);

  /* date range (for records mode) */
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  /* fetch on open */
  useEffect(() => {
    if (!isOpen || !hospital?.id) return;
    setLoading(true);
    setDone(false);
    Promise.all([
      supabase.from("patients").select("*").eq("hospital_id", hospital.id).order("created_at", { ascending: false }),
      supabase.from("visits").select("*").eq("hospital_id", hospital.id).order("visit_date", { ascending: false }),
    ]).then(([{ data: p }, { data: v }]) => {
      setPatients(p || []);
      setVisits(v || []);
      setLoading(false);
    });
  }, [isOpen, hospital?.id]);

  /* build patient map for joins */
  const patientMap = useMemo(() => {
    const m = {};
    patients.forEach((p) => { m[p.id] = p; });
    return m;
  }, [patients]);

  /* filtered visits */
  const filteredVisits = useMemo(() => {
    let arr = visits;
    if (dateFrom) arr = arr.filter((v) => v.visit_date >= dateFrom);
    if (dateTo)   arr = arr.filter((v) => v.visit_date <= dateTo + "T23:59:59");
    return arr;
  }, [visits, dateFrom, dateTo]);

  /* preview count */
  const previewCount = mode === "patients" ? patients.length : filteredVisits.length;

  /* helpers */
  const togglePCol = (key) => setSelPCols((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleVCol = (key) => setSelVCols((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const selectAllP = () => setSelPCols(new Set(PATIENT_COLS.map((c) => c.key)));
  const selectAllV = () => setSelVCols(new Set(VISIT_COLS.map((c) => c.key)));
  const clearAllP  = () => setSelPCols(new Set());
  const clearAllV  = () => setSelVCols(new Set());

  /* ── export ── */
  async function handleExport() {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 300)); // let spinner render

    if (mode === "patients") {
      const rows = patients.map((p) => {
        const row = {};
        PATIENT_COLS.filter((c) => selPCols.has(c.key)).forEach((c) => {
          if (c.key === "age") row["Age"] = calcAge(p.date_of_birth);
          else if (c.key === "date_of_birth") row["Date of Birth"] = p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString("en-GB") : "";
          else if (c.key === "created_at") row["Registered Date"] = p.created_at ? new Date(p.created_at).toLocaleDateString("en-GB") : "";
          else row[c.label] = p[c.key] ?? "";
        });
        return row;
      });
      downloadCSV(buildCSV(rows), `patients_${hospital?.name?.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.csv`);
    } else {
      const rows = filteredVisits.map((v) => {
        const p   = patientMap[v.patient_id] || {};
        const row = {};
        VISIT_COLS.filter((c) => selVCols.has(c.key)).forEach((c) => {
          if (c.group === "patient") {
            if (c.key === "age")         row[c.label] = calcAge(p.date_of_birth);
            else if (c.key === "full_name") row[c.label] = p.full_name ?? "";
            else if (c.key === "patient_id") row[c.label] = p.patient_id ?? "";
            else row[c.label] = p[c.key] ?? "";
          } else {
            if (c.key === "visit_date")   row[c.label] = v.visit_date ? new Date(v.visit_date).toLocaleDateString("en-GB") : "";
            else if (c.key === "is_emergency") row[c.label] = v.is_emergency ? "Yes" : "No";
            else if (c.key === "departments")  row[c.label] = (v.departments || []).join("; ");
            else if (c.key === "medications")  row[c.label] = (v.medications  || []).join("; ");
            else if (c.key === "lab_requests") row[c.label] = (v.lab_requests || []).join("; ");
            else row[c.label] = v[c.key] ?? "";
          }
        });
        return row;
      });
      downloadCSV(buildCSV(rows), `medical_records_${hospital?.name?.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.csv`);
    }

    setExporting(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  }

  if (!isOpen) return null;

  /* ── group visit cols by group ── */
  const visitGroups = Object.entries(GROUP_LABELS).map(([g, label]) => ({
    group: g, label, cols: VISIT_COLS.filter((c) => c.group === g),
  }));

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>

      <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="shrink-0 px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
            <Download size={16} className="text-teal-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-black text-slate-900">Export Data</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">{hospital?.name}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-500 transition">
            <X size={14} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center gap-3 py-16">
            <Loader2 size={18} className="animate-spin text-teal-500" />
            <p className="text-sm font-bold text-slate-400">Loading data…</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* Mode selector */}
            <div className="px-6 pt-5 pb-3 grid grid-cols-2 gap-3">
              {[
                {
                  key: "patients",
                  icon: <Users size={18} />,
                  title: "Patient List",
                  sub: `${patients.length} patients · demographics & contacts`,
                },
                {
                  key: "records",
                  icon: <Activity size={18} />,
                  title: "Medical Records",
                  sub: `${visits.length} visits · vitals, diagnoses, medications`,
                },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`relative text-left p-4 rounded-2xl border-2 transition ${
                    mode === m.key
                      ? "border-teal-500 bg-teal-50/60"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300"
                  }`}>
                  {mode === m.key && (
                    <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center">
                      <Check size={9} className="text-white" />
                    </div>
                  )}
                  <div className={`mb-2 ${mode === m.key ? "text-teal-600" : "text-slate-400"}`}>{m.icon}</div>
                  <p className={`text-sm font-black ${mode === m.key ? "text-teal-700" : "text-slate-600"}`}>{m.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{m.sub}</p>
                </button>
              ))}
            </div>

            {/* Date range (records only) */}
            {mode === "records" && (
              <div className="px-6 pb-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Calendar size={11} /> Date Range Filter <span className="text-slate-300 normal-case font-normal">(optional)</span>
                </p>
                <div className="flex items-center gap-2">
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-teal-500 transition" />
                  <span className="text-xs text-slate-300 font-bold">→</span>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-teal-500 transition" />
                  {(dateFrom || dateTo) && (
                    <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                      className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition px-2">clear</button>
                  )}
                </div>
              </div>
            )}

            {/* Column selector */}
            <div className="px-6 pb-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Database size={11} /> Columns to Export
                </p>
                <div className="flex gap-2">
                  <button onClick={mode === "patients" ? selectAllP : selectAllV}
                    className="text-[10px] font-bold text-teal-600 hover:underline">all</button>
                  <span className="text-slate-200">|</span>
                  <button onClick={mode === "patients" ? clearAllP : clearAllV}
                    className="text-[10px] font-bold text-slate-400 hover:text-red-500 hover:underline">none</button>
                </div>
              </div>

              {mode === "patients" ? (
                <div className="flex flex-wrap gap-1.5">
                  {PATIENT_COLS.map((c) => (
                    <ColToggle key={c.key} label={c.label} checked={selPCols.has(c.key)} onChange={() => togglePCol(c.key)} />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {visitGroups.map(({ group, label, cols }) => (
                    <div key={group}>
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5">{label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cols.map((c) => (
                          <ColToggle key={c.key} label={c.label} checked={selVCols.has(c.key)} onChange={() => toggleVCol(c.key)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center gap-3">
          {/* Preview pill */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <FileText size={12} className="text-slate-400" />
            <span className="font-black text-slate-800">{previewCount}</span> row{previewCount !== 1 ? "s" : ""}
            <span className="text-slate-300">·</span>
            <span>{mode === "patients" ? (selPCols.size) : (selVCols.size)} col{(mode === "patients" ? selPCols.size : selVCols.size) !== 1 ? "s" : ""}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={onClose}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 px-4 py-2 rounded-xl transition">
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || loading || previewCount === 0 || (mode === "patients" ? selPCols.size === 0 : selVCols.size === 0)}
              className={`flex items-center gap-2 text-xs font-black px-5 py-2.5 rounded-xl transition shadow-sm disabled:opacity-40 ${
                done
                  ? "bg-emerald-500 text-white"
                  : "bg-teal-600 hover:bg-teal-500 text-white"
              }`}>
              {exporting
                ? <><Loader2 size={13} className="animate-spin" /> Exporting…</>
                : done
                ? <><Check size={13} /> Downloaded!</>
                : <><Download size={13} /> Export CSV</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}