"use client";
import { useState, useEffect } from "react";
import {
  X, FileText, Loader2, CheckCircle, AlertCircle,
  HeartPulse, Scale, AlertTriangle, CreditCard,
  ChevronRight,
} from "lucide-react";
import { FInput, FSelect, FTextarea } from "@/app/components/ui/Fields";
import supabase from "@/lib/supabase";

/* ─── Constants ───────────────────────────────────────────────────────────── */
const DEPARTMENTS = [
  "General Medicine", "Maternity", "Paediatrics", "Surgery", "Laboratory",
  "Pharmacy", "Physiotherapy", "Emergency", "Dental", "Eye Clinic",
  "Cardiology", "Dermatology",
];
const VISIT_TYPES = ["OPD", "IPD", "Emergency", "Referred", "Follow-up"];
const VISIT_STATUSES = ["Open", "Completed", "Referred Out", "Admitted"];
const LAB_TESTS = [
  "Full Blood Count (FBC)", "Malaria RDT", "Malaria Thick Film",
  "Blood Glucose (FBS/RBS)", "HbA1c", "Urinalysis", "Widal Test",
  "Hepatitis B (HBsAg)", "HIV Screening", "Liver Function Test (LFT)",
  "Kidney Function Test (KFT)", "Lipid Profile", "Pregnancy Test (UPT)",
  "Stool MCS", "Blood Culture", "Sputum AFB (TB Screen)",
  "Genotype Confirmation", "Blood Group & Cross-match", "PT/INR",
  "Electrolytes & Urea", "Thyroid Function (TSH/T3/T4)",
  "ECG", "Chest X-Ray", "Abdominal USS",
];
const ICD10_LIST = [
  { code: "J06.9", label: "Acute upper respiratory infection" },
  { code: "A09",   label: "Diarrhoea and gastroenteritis" },
  { code: "B50",   label: "Malaria (Plasmodium falciparum)" },
  { code: "B54",   label: "Malaria, unspecified" },
  { code: "J18.9", label: "Pneumonia, unspecified" },
  { code: "I10",   label: "Essential hypertension" },
  { code: "E11",   label: "Type 2 diabetes mellitus" },
  { code: "E10",   label: "Type 1 diabetes mellitus" },
  { code: "K29.7", label: "Gastritis, unspecified" },
  { code: "N39.0", label: "Urinary tract infection" },
  { code: "A01.0", label: "Typhoid fever" },
  { code: "B19.9", label: "Viral hepatitis, unspecified" },
  { code: "B24",   label: "HIV disease (AIDS)" },
  { code: "A15",   label: "Respiratory tuberculosis" },
  { code: "D57.1", label: "Sickle-cell disease (HbSS)" },
  { code: "J45.9", label: "Asthma, unspecified" },
  { code: "K35",   label: "Acute appendicitis" },
  { code: "O80",   label: "Normal delivery" },
  { code: "O20.0", label: "Threatened abortion" },
  { code: "L03.9", label: "Cellulitis, unspecified" },
  { code: "S09.9", label: "Head injury, unspecified" },
  { code: "M54.5", label: "Low back pain" },
  { code: "R50.9", label: "Fever, unspecified" },
  { code: "R51",   label: "Headache" },
  { code: "Z23",   label: "Immunisation (vaccination)" },
  { code: "Z00.0", label: "General adult medical examination" },
  { code: "Z00.1", label: "Routine child health examination" },
];

export const EMPTY_VISIT = {
  departments: [], doctor: "", complaint: "", diagnosis: "",
  icd10_code: "", icd10_label: "", prescription: "", medications: [],
  notes: "", visit_type: "OPD", visit_status: "Open", is_emergency: false,
  bp_systolic: "", bp_diastolic: "", temperature: "", pulse: "",
  spo2: "", weight: "", height: "", lab_requests: [],
  consultation_fee: "", other_fees: "",
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function calcBMI(w, h) {
  const ww = parseFloat(w), hh = parseFloat(h) / 100;
  if (!ww || !hh) return null;
  return (ww / (hh * hh)).toFixed(1);
}
function bmiLabel(bmi) {
  if (!bmi) return null;
  const b = parseFloat(bmi);
  if (b < 18.5) return { label: "Underweight", cls: "text-blue-500" };
  if (b < 25)   return { label: "Normal",      cls: "text-emerald-500" };
  if (b < 30)   return { label: "Overweight",  cls: "text-amber-500" };
  return              { label: "Obese",        cls: "text-red-500" };
}
function fmtNaira(n) {
  if (!n) return "—";
  return "₦" + Number(n).toLocaleString("en-NG");
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/* ─── Drug Repeat Check ───────────────────────────────────────────────────── */
async function checkDrugRepeats(patientId, currentMeds, hospitalId) {
  if (!currentMeds?.length || !patientId) return [];
  const { data } = await supabase
    .from("visits")
    .select("medications, visit_date, visit_type")
    .eq("patient_id", patientId)
    .eq("hospital_id", hospitalId)
    .order("visit_date", { ascending: false })
    .limit(20);
  if (!data) return [];
  const alerts = [];
  for (const visit of data) {
    const past = visit.medications || [];
    const matches = currentMeds.filter((m) =>
      past.some((p) => p.toLowerCase().trim() === m.toLowerCase().trim())
    );
    if (matches.length > 0)
      alerts.push({ date: visit.visit_date, drugs: matches, type: visit.visit_type });
  }
  return alerts;
}

/* ─── Sub Components ──────────────────────────────────────────────────────── */

function LastVisitSummary({ visits }) {
  if (!visits.length) return null;
  const last = visits[0];
  return (
    <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5">
      <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-2.5">
        Last Visit — {fmtDate(last.visit_date || last.created_at)}
      </p>
      <div className="space-y-1.5">
        {last.complaint && <p className="text-xs text-sky-900"><span className="font-bold">Complained of:</span> {last.complaint}</p>}
        {last.diagnosis && <p className="text-xs text-sky-900"><span className="font-bold">Diagnosed with:</span> {last.diagnosis}</p>}
        {last.medications?.length > 0 && <p className="text-xs text-sky-900"><span className="font-bold">Was given:</span> {last.medications.join(", ")}</p>}
        {last.visit_status && <p className="text-[10px] font-semibold text-sky-400 mt-1">Status: {last.visit_status}</p>}
      </div>
    </div>
  );
}

function DrugAlertBanner({ alerts }) {
  if (!alerts.length) return null;
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex gap-2.5">
      <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-1.5">⚠ Drug Repeat Alert</p>
        {alerts.map((a, i) => (
          <p key={i} className="text-xs text-amber-800 mb-1">
            <strong>{a.drugs.join(", ")}</strong> was prescribed on {fmtDate(a.date)}
          </p>
        ))}
        <p className="text-[11px] text-amber-600 mt-1">Confirm intentional or update prescription.</p>
      </div>
    </div>
  );
}

function MedicationsInput({ value = [], onChange, drugAlerts = [] }) {
  const [input, setInput] = useState("");
  function add() {
    const t = input.trim();
    if (!t) return;
    if (!value.map((v) => v.toLowerCase()).includes(t.toLowerCase()))
      onChange([...value, t]);
    setInput("");
  }
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
        Medications Prescribed
      </label>
      <div className="border border-slate-200 rounded-lg bg-white p-2">
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {value.map((d) => {
              const isRepeat = drugAlerts.some((a) => a.drugs.includes(d));
              return (
                <span key={d} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border
                  ${isRepeat ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-teal-50 border-teal-200 text-teal-700"}`}>
                  {isRepeat && <AlertTriangle size={9} />}
                  {d}
                  <button
                    onClick={() => onChange(value.filter((v) => v !== d))}
                    className="ml-0.5 hover:text-red-500 transition text-base leading-none"
                  >×</button>
                </span>
              );
            })}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
            placeholder="Type drug name, press Enter…"
            className="flex-1 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-teal-500 transition"
          />
          <button
            onClick={add}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-md transition whitespace-nowrap"
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}

function DeptPills({ value = [], onChange }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
        Departments
      </label>
      <div className="flex flex-wrap gap-1.5">
        {DEPARTMENTS.map((d) => {
          const on = value.includes(d);
          return (
            <button key={d} type="button"
              onClick={() => onChange(on ? value.filter((v) => v !== d) : [...value, d])}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all
                ${on ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LabRequestSection({ value = [], onChange }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
        Lab / Investigation Requests
      </label>
      <div className="flex flex-wrap gap-1.5">
        {LAB_TESTS.map((t) => {
          const on = value.includes(t);
          return (
            <button key={t} type="button"
              onClick={() => onChange(on ? value.filter((v) => v !== t) : [...value, t])}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all
                ${on ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}>
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ICD10Search({ value, codeValue, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = ICD10_LIST.filter(
    (i) => i.label.toLowerCase().includes(q.toLowerCase()) || i.code.includes(q)
  );
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
        ICD-10 Diagnosis Code
      </label>
      <div className="relative">
        <button type="button" onClick={() => setOpen(!open)}
          className="w-full text-left bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm flex items-center justify-between gap-2 focus:border-teal-500 outline-none transition">
          {codeValue
            ? <span><strong className="text-teal-600 font-mono">{codeValue}</strong> · {value}</span>
            : <span className="text-slate-300">Search diagnosis code…</span>}
          <ChevronRight size={12} className="text-slate-300 rotate-90 shrink-0" />
        </button>
        {open && (
          <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-slate-100">
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name or code…"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500" />
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
              <button type="button" onClick={() => { onChange("", ""); setOpen(false); setQ(""); }}
                className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-50">— Clear —</button>
              {filtered.map((i) => (
                <button key={i.code} type="button"
                  onClick={() => { onChange(i.label, i.code); setOpen(false); setQ(""); }}
                  className="w-full text-left px-3 py-2.5 hover:bg-teal-50 transition flex items-center gap-3">
                  <span className="text-[10px] font-black text-teal-600 font-mono w-12 shrink-0">{i.code}</span>
                  <span className="text-xs text-slate-700">{i.label}</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="px-3 py-4 text-xs text-slate-400 text-center">No results</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VitalsSection({ vForm, setVForm }) {
  const bmi = calcBMI(vForm.weight, vForm.height);
  const bmiInfo = bmiLabel(bmi);
  const inputCls = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition font-medium";

  return (
    <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <HeartPulse size={13} className="text-teal-600" />
        <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest">Vitals</span>
      </div>

      {/* Blood Pressure */}
      <div className="mb-3">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
          Blood Pressure (mmHg)
        </label>
        <div className="flex gap-2 items-center">
          <input type="number" placeholder="Systolic" value={vForm.bp_systolic || ""}
            onChange={(e) => setVForm({ ...vForm, bp_systolic: e.target.value })}
            className={inputCls} />
          <span className="text-slate-300 font-bold">/</span>
          <input type="number" placeholder="Diastolic" value={vForm.bp_diastolic || ""}
            onChange={(e) => setVForm({ ...vForm, bp_diastolic: e.target.value })}
            className={inputCls} />
        </div>
        {vForm.bp_systolic && vForm.bp_diastolic && (
          <p className={`text-[11px] font-bold mt-1 ${parseInt(vForm.bp_systolic) >= 140 || parseInt(vForm.bp_diastolic) >= 90 ? "text-red-500" : "text-emerald-500"}`}>
            {parseInt(vForm.bp_systolic) >= 140 || parseInt(vForm.bp_diastolic) >= 90 ? "⚠ Elevated" : "✓ Normal range"}
          </p>
        )}
      </div>

      {/* Other vitals */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: "temperature", label: "Temp (°C)", placeholder: "37.5", step: "0.1",
            check: (v) => v ? parseFloat(v) >= 37.5
              ? { msg: "⚠ Febrile", cls: "text-red-500" }
              : { msg: "✓ Afebrile", cls: "text-emerald-500" } : null },
          { key: "pulse", label: "Pulse (bpm)", placeholder: "80", check: () => null },
          { key: "spo2", label: "SpO₂ (%)", placeholder: "98",
            check: (v) => v ? parseInt(v) < 95
              ? { msg: "⚠ Low O₂", cls: "text-red-500" }
              : { msg: "✓ Normal", cls: "text-emerald-500" } : null },
          { key: "weight", label: "Weight (kg)", placeholder: "70", step: "0.1", check: () => null },
          { key: "height", label: "Height (cm)", placeholder: "170", check: () => null },
        ].map((v) => {
          const status = v.check(vForm[v.key]);
          return (
            <div key={v.key}>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                {v.label}
              </label>
              <input type="number" step={v.step || "1"} placeholder={v.placeholder}
                value={vForm[v.key] || ""}
                onChange={(e) => setVForm({ ...vForm, [v.key]: e.target.value })}
                className={inputCls} />
              {status && <p className={`text-[11px] font-bold mt-1 ${status.cls}`}>{status.msg}</p>}
            </div>
          );
        })}
      </div>

      {/* BMI */}
      {bmi && bmiInfo && (
        <div className="mt-3 flex items-center gap-2.5 bg-white border border-teal-100 rounded-lg px-3 py-2">
          <Scale size={12} className="text-teal-500" />
          <span className="text-xs text-slate-600">BMI: <strong>{bmi}</strong></span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 ${bmiInfo.cls}`}>
            {bmiInfo.label}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN ────────────────────────────────────────────────────────────────── */
export default function VisitModal({
  editVisit,
  visitPatient,
  visits,
  vForm,
  setVForm,
  saving,
  hospital,
  onSave,
  onClose,
}) {
  const [drugAlerts, setDrugAlerts] = useState([]);

  /* ── Drug repeat check ── */
  useEffect(() => {
    const pid = visitPatient?.id || editVisit?.patient_id;
    if (!vForm.medications?.length || !pid) { setDrugAlerts([]); return; }
    checkDrugRepeats(pid, vForm.medications, hospital?.id).then(setDrugAlerts);
  }, [vForm.medications, visitPatient, editVisit, hospital]);

  return (
    <div
      className="fixed inset-0 bg-slate-900/30 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">

        {/* Header */}
        <div className="flex items-start justify-between px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-slate-100 relative">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 rounded-full sm:hidden" />
          <div>
            <h2 className="text-base font-black text-slate-900">
              {editVisit ? "Edit Visit Record" : "Log Patient Visit"}
            </h2>
            {visitPatient && (
              <p className="text-xs text-slate-400 mt-0.5">
                <strong className="text-teal-600">{visitPatient.full_name}</strong>
                {" · "}
                <span className="font-mono text-[11px]">{visitPatient.patient_id}</span>
              </p>
            )}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 transition">
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 py-5 space-y-4">

          {/* Last visit summary */}
          {!editVisit && visits?.length > 0 && (
            <LastVisitSummary visits={visits} />
          )}

          {/* Emergency toggle */}
          <button type="button"
            onClick={() => setVForm({ ...vForm, is_emergency: !vForm.is_emergency })}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
              ${vForm.is_emergency ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200 hover:border-slate-300"}`}>
            <AlertCircle size={14} className={vForm.is_emergency ? "text-red-500" : "text-slate-400"} />
            <div className="flex-1 text-left">
              <p className={`text-xs font-bold ${vForm.is_emergency ? "text-red-600" : "text-slate-500"}`}>
                Mark as Emergency
              </p>
              <p className="text-[10px] text-slate-400">Flag this as an urgent / critical visit</p>
            </div>
            <div className={`w-9 h-5 rounded-full transition-colors ${vForm.is_emergency ? "bg-red-500" : "bg-slate-200"} flex items-center px-0.5`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${vForm.is_emergency ? "translate-x-4" : ""}`} />
            </div>
          </button>

          {/* Visit type & status */}
          <div className="grid grid-cols-2 gap-3">
            <FSelect label="Visit Type" options={VISIT_TYPES} value={vForm.visit_type}
              onChange={(v) => setVForm({ ...vForm, visit_type: v })} />
            <FSelect label="Status" options={VISIT_STATUSES} value={vForm.visit_status}
              onChange={(v) => setVForm({ ...vForm, visit_status: v })} />
          </div>

          <DeptPills value={vForm.departments || []}
            onChange={(v) => setVForm({ ...vForm, departments: v })} />

          <FInput label="Doctor / Staff on Duty" placeholder="e.g. Dr. Okoro"
            value={vForm.doctor} onChange={(v) => setVForm({ ...vForm, doctor: v })} />

          <VitalsSection vForm={vForm} setVForm={setVForm} />

          <FTextarea label="Chief Complaint *"
            placeholder="What is the patient presenting with?"
            value={vForm.complaint}
            onChange={(v) => setVForm({ ...vForm, complaint: v })} />

          <ICD10Search value={vForm.icd10_label} codeValue={vForm.icd10_code}
            onChange={(label, code) => setVForm({ ...vForm, icd10_label: label, icd10_code: code })} />

          <FTextarea label="Diagnosis / Findings"
            placeholder="Clinical diagnosis and findings"
            value={vForm.diagnosis}
            onChange={(v) => setVForm({ ...vForm, diagnosis: v })} />

          <MedicationsInput
            value={vForm.medications || []}
            onChange={(v) => setVForm({ ...vForm, medications: v })}
            drugAlerts={drugAlerts} />

          <DrugAlertBanner alerts={drugAlerts} />

          <FTextarea label="Prescription Notes / Dosage"
            placeholder="Dosage instructions, treatment plan…"
            value={vForm.prescription}
            onChange={(v) => setVForm({ ...vForm, prescription: v })} />

          <LabRequestSection value={vForm.lab_requests || []}
            onChange={(v) => setVForm({ ...vForm, lab_requests: v })} />

          {/* Billing */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={12} className="text-emerald-600" />
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                Billing / Fees
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FInput label="Consultation Fee (₦)" placeholder="5000"
                value={vForm.consultation_fee}
                onChange={(v) => setVForm({ ...vForm, consultation_fee: v })} />
              <FInput label="Other Fees (₦)" placeholder="2500"
                value={vForm.other_fees}
                onChange={(v) => setVForm({ ...vForm, other_fees: v })} />
            </div>
            {(vForm.consultation_fee || vForm.other_fees) && (
              <p className="text-xs font-bold text-emerald-700 mt-2">
                Total: {fmtNaira((parseFloat(vForm.consultation_fee) || 0) + (parseFloat(vForm.other_fees) || 0))}
              </p>
            )}
          </div>

          <FInput label="Additional Notes" placeholder="Other clinical notes"
            value={vForm.notes}
            onChange={(v) => setVForm({ ...vForm, notes: v })} />
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 sm:px-6 pb-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-slate-50 border border-slate-200 text-slate-500 font-semibold text-sm rounded-xl hover:bg-slate-100 transition">
            Cancel
          </button>
          <button onClick={onSave}
            disabled={saving || (!vForm.complaint.trim() && !vForm.departments?.length)}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-black text-sm rounded-xl transition flex items-center justify-center gap-2">
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : <><FileText size={14} /> {editVisit ? "Update Record" : "Save Visit"}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}