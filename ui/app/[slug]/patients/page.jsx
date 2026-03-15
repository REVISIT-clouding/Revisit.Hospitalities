"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Bell, Plus, Menu, Zap, Loader2,
  AlertCircle,
} from "lucide-react";
import supabase from "@/lib/supabase";
import { useHospital } from "@/lib/useHospital";
import Sidebar from "@/app/components/patients/Sidebar";
import PatientTable from "@/app/components/patients/PatientTable";
import PatientDetail from "@/app/components/patients/PatientDetail";
import PatientModal, { EMPTY_PATIENT } from "@/app/components/patients/PatientModal";
import VisitModal, { EMPTY_VISIT } from "@/app/components/patients/VisitModal";

const DEPARTMENTS = [
  "General Medicine", "Maternity", "Paediatrics", "Surgery", "Laboratory",
  "Pharmacy", "Physiotherapy", "Emergency", "Dental", "Eye Clinic",
  "Cardiology", "Dermatology",
];

export default function PatientsPage() {
  const { slug } = useParams();
  const { hospital, user } = useHospital();

  /* ── State ── */
  const [patients,    setPatients]    = useState([]);
  const [visits,      setVisits]      = useState([]);
  const [allVisits,   setAllVisits]   = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ── Modal / panel state ── */
  const [detail,      setDetail]      = useState(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [visitModal,  setVisitModal]  = useState(null);
  const [editVisit,   setEditVisit]   = useState(null);

  /* ── Forms ── */
  const [pForm, setPForm] = useState(EMPTY_PATIENT);
  const [vForm, setVForm] = useState(EMPTY_VISIT);
  const [qa,    setQa]    = useState({
    full_name: "", department: "", complaint: "",
  });

  /* ── Loaders ── */
  const loadPatients = useCallback(async () => {
    if (!hospital?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("patients")
      .select("*")
      .eq("hospital_id", hospital.id)
      .order("created_at", { ascending: false });
    if (data) setPatients(data);
    setLoading(false);
  }, [hospital?.id]);

  const loadAllVisits = useCallback(async () => {
    if (!hospital?.id) return;
    const { data } = await supabase
      .from("visits")
      .select("visit_type, is_emergency, created_at")
      .eq("hospital_id", hospital.id);
    if (data) setAllVisits(data);
  }, [hospital?.id]);

  const loadVisits = useCallback(async (pid) => {
    if (!hospital?.id) return;
    const { data } = await supabase
      .from("visits")
      .select("*")
      .eq("patient_id", pid)
      .eq("hospital_id", hospital.id)
      .order("visit_date", { ascending: false });
    if (data) setVisits(data);
  }, [hospital?.id]);

  useEffect(() => {
    loadPatients();
    loadAllVisits();
  }, [loadPatients, loadAllVisits]);

  useEffect(() => {
    if (detail) loadVisits(detail.id);
    else setVisits([]);
  }, [detail, loadVisits]);

  /* ── Stats ── */
  const today         = new Date().toDateString();
  const todayNew      = patients.filter((p) => new Date(p.created_at).toDateString() === today).length;
  const opdCount      = allVisits.filter((v) => v.visit_type === "OPD").length;
  const ipdCount      = allVisits.filter((v) => v.visit_type === "IPD").length;
  const emergencyToday = allVisits.filter((v) => v.is_emergency && new Date(v.created_at).toDateString() === today).length;

  /* ── Handlers ── */
  async function handleQuickAdd() {
    if (!qa.full_name.trim() || !hospital?.id) return;
    setSaving(true);
    const { data: patient } = await supabase
      .from("patients")
      .insert([{ full_name: qa.full_name.trim(), hospital_id: hospital.id }])
      .select()
      .single();
    if (patient && (qa.complaint.trim() || qa.department)) {
      await supabase.from("visits").insert([{
        patient_id:   patient.id,
        hospital_id:  hospital.id,
        departments:  qa.department ? [qa.department] : [],
        complaint:    qa.complaint.trim(),
        visit_type:   "OPD",
        visit_status: "Open",
        visit_date:   new Date().toISOString(),
      }]);
    }
    setQa({ full_name: "", department: "", complaint: "" });
    await loadPatients();
    await loadAllVisits();
    setSaving(false);
  }

  async function handleSavePatient() {
    if (!pForm.full_name.trim() || !hospital?.id) return;
    setSaving(true);
    if (editTarget) {
      await supabase.from("patients").update(pForm).eq("id", editTarget.id);
      const { data } = await supabase
        .from("patients").select("*").eq("id", editTarget.id).single();
      if (data) setDetail(data);
      setEditTarget(null);
    } else {
      await supabase
        .from("patients")
        .insert([{ ...pForm, hospital_id: hospital.id }]);
      setShowAdd(false);
    }
    setPForm(EMPTY_PATIENT);
    await loadPatients();
    setSaving(false);
  }

  async function handleSaveVisit() {
    if (!vForm.complaint.trim() && !vForm.departments?.length) return;
    setSaving(true);
    const payload = { ...vForm, medications: vForm.medications || [] };
    if (editVisit) {
      await supabase.from("visits").update(payload).eq("id", editVisit.id);
      setEditVisit(null);
    } else {
      await supabase.from("visits").insert([{
        ...payload,
        patient_id:  visitModal.id,
        hospital_id: hospital.id,
        visit_date:  new Date().toISOString(),
      }]);
      setVisitModal(null);
    }
    setVForm(EMPTY_VISIT);
    if (detail) await loadVisits(detail.id);
    await loadAllVisits();
    setSaving(false);
  }

  async function handleDeletePatient(id) {
    if (!confirm("Permanently remove this patient and ALL their visit records?")) return;
    await supabase.from("patients").delete().eq("id", id);
    setDetail(null);
    loadPatients();
  }

  async function handleDeleteVisit(id) {
    if (!confirm("Delete this visit record?")) return;
    await supabase.from("visits").delete().eq("id", id);
    if (detail) loadVisits(detail.id);
    loadAllVisits();
  }

  function closeModals() {
    setShowAdd(false);
    setEditTarget(null);
    setVisitModal(null);
    setEditVisit(null);
  }

  /* ── Guard ── */
  if (!hospital) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 size={20} className="animate-spin text-teal-500" />
    </div>
  );

  /* ── Render ── */
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes slideIn  { from { transform:translateX(100%);  } to { transform:translateX(0); } }
        @keyframes slideInL { from { transform:translateX(-100%); } to { transform:translateX(0); } }
        @keyframes fadeIn   { from { opacity:0; }                  to { opacity:1; } }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
      `}</style>

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 z-40 md:hidden"
            style={{ animation: "fadeIn 0.18s ease-out" }}
            onClick={() => setSidebarOpen(false)} />
          <div className="fixed top-0 left-0 h-screen w-64 bg-white border-r border-slate-100 z-50 flex flex-col shadow-2xl md:hidden"
            style={{ animation: "slideInL 0.22s ease-out" }}>
            <Sidebar
              hospital={hospital}
              user={user}
              activePage="patients"
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </>
      )}

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex w-56 bg-white border-r border-slate-100 flex-col shrink-0 sticky top-0 h-screen">
        <Sidebar hospital={hospital} user={user} activePage="patients" />
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 min-w-0 flex flex-col">

        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100 px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition shrink-0">
            <Menu size={15} />
          </button>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button className="relative w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-400 hover:text-teal-600 transition">
              <Bell size={14} />
              {emergencyToday > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => { setPForm(EMPTY_PATIENT); setShowAdd(true); }}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm whitespace-nowrap">
              <Plus size={13} />
              <span className="hidden sm:inline">New Patient</span>
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">

          {/* Title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Patient Registry
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {hospital.name} · {hospital.address}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: "Total Patients",   value: patients.length, sub: "registered",  accent: "border-l-teal-500" },
              { label: "Registered Today", value: todayNew,        sub: "new today",   accent: "border-l-blue-500" },
              { label: "OPD Visits",       value: opdCount,        sub: "outpatients", accent: "border-l-violet-500" },
              { label: "IPD / Admitted",   value: ipdCount,        sub: "inpatients",  accent: "border-l-amber-500" },
            ].map((c) => (
              <div key={c.label}
                className={`bg-white border border-slate-200 border-l-4 ${c.accent} rounded-xl px-3 sm:px-4 py-3 sm:py-4`}>
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                  {c.label}
                </p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 leading-none">
                  {c.value}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Emergency banner */}
          {emergencyToday > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <p className="text-sm font-bold text-red-700">
                {emergencyToday} emergency visit{emergencyToday !== 1 ? "s" : ""} recorded today
              </p>
              <span className="ml-auto text-[10px] text-red-400 font-black uppercase tracking-widest">
                Active
              </span>
            </div>
          )}

          {/* Quick Register */}
          <div className="bg-teal-50 border border-teal-100 rounded-xl px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={12} className="text-teal-600" />
              <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest">
                Quick Register
              </span>
              <span className="hidden sm:inline text-[10px] text-teal-400">
                — press Enter to save
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={qa.full_name}
                placeholder="Patient full name *"
                onChange={(e) => setQa({ ...qa, full_name: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }}
                className="flex-1 bg-white border border-teal-200 rounded-lg px-3 py-2.5 text-sm placeholder:text-slate-300 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition"
              />
              <select
                value={qa.department}
                onChange={(e) => setQa({ ...qa, department: e.target.value })}
                className="sm:w-44 bg-white border border-teal-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition appearance-none">
                <option value="">Department…</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <input
                value={qa.complaint}
                placeholder="Chief complaint…"
                onChange={(e) => setQa({ ...qa, complaint: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }}
                className="flex-1 bg-white border border-teal-200 rounded-lg px-3 py-2.5 text-sm placeholder:text-slate-300 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition"
              />
              <button
                onClick={handleQuickAdd}
                disabled={saving || !qa.full_name.trim()}
                className="flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition whitespace-nowrap">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Register
              </button>
            </div>
          </div>

          {/* Patient Table */}
          <PatientTable
            patients={patients}
            loading={loading}
            onSelectPatient={setDetail}
          />
        </div>
      </main>

      {/* ── PATIENT DETAIL DRAWER ── */}
      {detail && (
        <PatientDetail
          patient={detail}
          visits={visits}
          hospital={hospital}
          onClose={() => setDetail(null)}
          onAddVisit={() => {
            setVForm(EMPTY_VISIT);
            setVisitModal(detail);
          }}
          onEditPatient={() => {
            setPForm({ ...detail });
            setEditTarget(detail);
            setDetail(null);
          }}
          onDeletePatient={handleDeletePatient}
          onEditVisit={(v) => {
            setVForm({
              ...v,
              departments:  v.departments  || [],
              lab_requests: v.lab_requests || [],
              medications:  v.medications  || [],
            });
            setEditVisit(v);
          }}
          onDeleteVisit={handleDeleteVisit}
        />
      )}

      {/* ── ADD / EDIT PATIENT MODAL ── */}
      {(showAdd || editTarget) && (
        <PatientModal
          editTarget={editTarget}
          pForm={pForm}
          setPForm={setPForm}
          saving={saving}
          hospital={hospital}
          onSave={handleSavePatient}
          onClose={closeModals}
        />
      )}

      {/* ── LOG / EDIT VISIT MODAL ── */}
      {(visitModal || editVisit) && (
        <VisitModal
          editVisit={editVisit}
          visitPatient={visitModal}
          visits={visits}
          vForm={vForm}
          setVForm={setVForm}
          saving={saving}
          hospital={hospital}
          onSave={handleSaveVisit}
          onClose={closeModals}
        />
      )}
    </div>
  );
}