"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell, Menu, Loader2, Plus, X, ChevronLeft, ChevronRight,
  Calendar, Clock, User, Phone, Stethoscope, CheckCircle2,
  XCircle, AlertCircle, RefreshCw, Edit, Trash2, List,
  LayoutGrid, Check,
  Mic,
} from "lucide-react";
import supabase from "@/lib/supabase";
import { useHospital } from "@/lib/useHospital";
import ConsultationRecorder from "@/app/components/ConsultationRecorder";
import Sidebar from "@/app/components/patients/Sidebar";

/* ── constants ──────────────────────────────────────────────────── */
const DEPARTMENTS = [
  "General Medicine","Maternity","Paediatrics","Surgery","Laboratory",
  "Pharmacy","Physiotherapy","Emergency","Dental","Eye Clinic",
  "Cardiology","Dermatology",
];
const APT_TYPES  = ["Consultation","Follow-up","Procedure","Check-up","Vaccination","Lab Visit"];
const STATUSES   = ["Scheduled","Confirmed","Completed","Cancelled","No-show"];
const HOURS      = Array.from({ length: 13 }, (_, i) => i + 7); // 7 → 19

const STATUS_STYLE = {
  Scheduled: "bg-blue-100  text-blue-700  border-blue-200",
  Confirmed: "bg-teal-100  text-teal-700  border-teal-200",
  Completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  "No-show": "bg-red-100   text-red-600   border-red-200",
};
const STATUS_DOT = {
  Scheduled: "bg-blue-500",
  Confirmed: "bg-teal-500",
  Completed: "bg-emerald-500",
  Cancelled: "bg-slate-400",
  "No-show": "bg-red-500",
};

/* ── week helpers ───────────────────────────────────────────────── */
function weekStart(date) {
  const d   = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function sameDay(a, b) {
  return a.toDateString() === new Date(b).toDateString();
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  return `${hh % 12 || 12}:${m} ${hh < 12 ? "AM" : "PM"}`;
}

/* ── empty form ─────────────────────────────────────────────────── */
const EMPTY = {
  patient_name: "", patient_phone: "", patient_id: "",
  doctor: "", department: "", type: "Consultation",
  appointment_date: new Date().toISOString().slice(0, 10),
  appointment_time: "09:00", duration_minutes: 30,
  status: "Scheduled", notes: "", is_walk_in: false,
};

/* ════════════════════════════════════════════════════════════════ */
export default function AppointmentsPage() {
  const { hospital, user } = useHospital();

  /* state */
  const [consultApt, setConsultApt] = useState(null);
  const [apts,        setApts]        = useState([]);
  const [patients,    setPatients]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view,        setView]        = useState("calendar"); // "calendar"|"list"
  const [weekOf,      setWeekOf]      = useState(() => weekStart(new Date()));
  const [modal,       setModal]       = useState(null);  // null | "new" | appointment obj
  const [prefill,     setPrefill]     = useState(null);  // { date, hour } from cell click
  const [form,        setForm]        = useState(EMPTY);
  const [patSearch,   setPatSearch]   = useState("");
  const [filterStatus,setFilterStatus]= useState("All");

  /* fetch */
  const load = useCallback(async () => {
    if (!hospital?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("hospital_id", hospital.id)
      .order("appointment_date")
      .order("appointment_time");
    if (data) setApts(data);
    setLoading(false);
  }, [hospital?.id]);

  const loadPatients = useCallback(async () => {
    if (!hospital?.id) return;
    const { data } = await supabase
      .from("patients")
      .select("id,full_name,patient_id,phone")
      .eq("hospital_id", hospital.id)
      .order("full_name");
    if (data) setPatients(data);
  }, [hospital?.id]);

  useEffect(() => { load(); loadPatients(); }, [load, loadPatients]);

  /* stats */
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayApts    = apts.filter((a) => a.appointment_date === todayStr);
  const todayCount   = todayApts.length;
  const confirmedToday = todayApts.filter((a) => a.status === "Confirmed").length;
  const completedToday = todayApts.filter((a) => a.status === "Completed").length;
  const upcomingCount  = apts.filter((a) => a.appointment_date > todayStr && a.status !== "Cancelled").length;

  /* week data */
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekOf, i)), [weekOf]);

  function aptsForSlot(day, hour) {
    return apts.filter((a) => {
      if (!sameDay(day, a.appointment_date)) return false;
      const h = parseInt(a.appointment_time?.split(":")[0], 10);
      return h === hour;
    });
  }

  /* save */
  async function handleSave() {
    if (!form.patient_name.trim()) return;
    setSaving(true);
    const payload = { ...form, hospital_id: hospital.id };
    if (modal?.id) {
      await supabase.from("appointments").update(payload).eq("id", modal.id);
    } else {
      await supabase.from("appointments").insert([payload]);
    }
    setModal(null);
    setForm(EMPTY);
    await load();
    setSaving(false);
  }

  async function setStatus(id, status) {
    await supabase.from("appointments").update({ status }).eq("id", id);
    load();
  }

  async function deleteApt(id) {
    if (!confirm("Delete this appointment?")) return;
    await supabase.from("appointments").delete().eq("id", id);
    load();
  }

  /* open modal */
  function openNew(prefillData = null) {
    const base = prefillData
      ? { ...EMPTY, appointment_date: prefillData.date, appointment_time: `${String(prefillData.hour).padStart(2,"0")}:00` }
      : EMPTY;
    setForm(base);
    setModal("new");
    setPatSearch("");
  }
  function openEdit(apt) {
    setForm({ ...apt });
    setModal(apt);
    setPatSearch(apt.patient_name);
  }

  /* filtered list */
  const listApts = useMemo(() => {
    let arr = [...apts];
    if (filterStatus !== "All") arr = arr.filter((a) => a.status === filterStatus);
    return arr;
  }, [apts, filterStatus]);

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
          <div className="fixed top-0 left-0 h-screen w-64 bg-white border-r border-slate-100 z-50 flex flex-col shadow-2xl md:hidden" style={{animation:"slideInL .22s"}}>
            <Sidebar hospital={hospital} user={user} activePage="appointments" onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-white border-r border-slate-100 flex-col shrink-0 sticky top-0 h-screen">
        <Sidebar hospital={hospital} user={user} activePage="appointments" />
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">

        {/* header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100 px-3 sm:px-6 py-3 flex items-center gap-2">
          <button onClick={() => setSidebarOpen(true)}
            className="md:hidden w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition">
            <Menu size={15} />
          </button>
          <div className="ml-auto flex items-center gap-2">
            {/* view toggle */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
              {[["calendar", <LayoutGrid size={13}/>],["list", <List size={13}/>]].map(([v, icon]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${view === v ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600"}`}>
                  {icon}<span className="hidden sm:inline capitalize">{v}</span>
                </button>
              ))}
            </div>
            <button onClick={() => openNew()}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm whitespace-nowrap">
              <Plus size={13} /><span className="hidden sm:inline">New Appointment</span>
            </button>
          </div>
        </header>

        <div className="flex-1 px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">

          {/* title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Appointments</h1>
            <p className="text-xs text-slate-400 mt-0.5">{hospital.name} · {new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
          </div>

          {/* stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label:"Today's Total",   value:todayCount,      sub:"appointments today",  accent:"border-l-teal-500" },
              { label:"Confirmed Today", value:confirmedToday,  sub:"ready to see",        accent:"border-l-blue-500" },
              { label:"Completed Today", value:completedToday,  sub:"seen today",          accent:"border-l-emerald-500" },
              { label:"Upcoming",        value:upcomingCount,   sub:"future scheduled",    accent:"border-l-violet-500" },
            ].map((c) => (
              <div key={c.label} className={`bg-white border border-slate-200 border-l-4 ${c.accent} rounded-xl px-3 sm:px-4 py-3`}>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{c.label}</p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 leading-none">{c.value}</p>
                <p className="text-[10px] text-slate-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* ── CALENDAR VIEW ── */}
          {view === "calendar" && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {/* week nav */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                <button onClick={() => setWeekOf(w => addDays(w, -7))}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-sm font-black text-slate-800 flex-1 text-center">
                  {fmtDate(weekOf)} — {fmtDate(addDays(weekOf, 6))}
                </span>
                <button onClick={() => setWeekOf(weekStart(new Date()))}
                  className="text-xs font-bold text-teal-600 hover:text-teal-500 px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-100 transition">
                  Today
                </button>
                <button onClick={() => setWeekOf(w => addDays(w, 7))}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition">
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* grid */}
              <div className="overflow-auto">
                <div className="min-w-[640px]">
                  {/* day headers */}
                  <div className="grid border-b border-slate-100" style={{gridTemplateColumns:"56px repeat(7, 1fr)"}}>
                    <div className="p-2" />
                    {weekDays.map((d) => {
                      const isToday = sameDay(d, new Date());
                      return (
                        <div key={d} className={`p-2 text-center border-l border-slate-100 ${isToday ? "bg-teal-50" : ""}`}>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {d.toLocaleDateString("en-GB",{weekday:"short"})}
                          </p>
                          <p className={`text-sm font-black mt-0.5 w-7 h-7 flex items-center justify-center mx-auto rounded-full ${isToday ? "bg-teal-600 text-white" : "text-slate-800"}`}>
                            {d.getDate()}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* hour rows */}
                  <div className="max-h-[520px] overflow-y-auto">
                    {HOURS.map((hour) => (
                      <div key={hour} className="grid border-b border-slate-50 last:border-0" style={{gridTemplateColumns:"56px repeat(7, 1fr)"}}>
                        {/* time label */}
                        <div className="px-2 py-2 text-right shrink-0">
                          <span className="text-[9px] font-bold text-slate-300 leading-none">
                            {hour % 12 || 12}{hour < 12 ? "a" : "p"}
                          </span>
                        </div>
                        {/* day cells */}
                        {weekDays.map((day) => {
                          const isToday = sameDay(day, new Date());
                          const slotApts = aptsForSlot(day, hour);
                          const dateStr = day.toISOString().slice(0,10);
                          return (
                            <div
                              key={day}
                              onClick={() => openNew({ date: dateStr, hour })}
                              className={`border-l border-slate-100 min-h-[52px] p-1 cursor-pointer transition group ${isToday ? "bg-teal-50/30" : "hover:bg-slate-50"}`}>
                              {slotApts.map((a) => (
                                <div
                                  key={a.id}
                                  onClick={(e) => { e.stopPropagation(); openEdit(a); }}
                                  className={`mb-1 px-1.5 py-1 rounded-lg border text-[10px] font-bold leading-tight cursor-pointer hover:shadow-sm transition ${STATUS_STYLE[a.status] || STATUS_STYLE.Scheduled}`}>
                                  <p className="font-black truncate">{a.patient_name}</p>
                                  <p className="opacity-70 text-[9px]">{fmtTime(a.appointment_time)} · {a.type}</p>
                                </div>
                              ))}
                              {slotApts.length === 0 && (
                                <div className="h-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                  <Plus size={12} className="text-slate-300" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* legend */}
              <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-3">
                {Object.entries(STATUS_STYLE).map(([s, cls]) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[s]}`} />
                    <span className="text-[10px] font-bold text-slate-500">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {view === "list" && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {/* filter bar */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-500">Status:</span>
                {["All", ...STATUSES].map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`text-[11px] font-black px-3 py-1 rounded-full border transition ${filterStatus === s ? "bg-teal-600 text-white border-teal-600" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-teal-300"}`}>
                    {s}
                  </button>
                ))}
                <span className="ml-auto text-[10px] text-slate-400 font-bold">{listApts.length} appointments</span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 gap-3">
                  <Loader2 size={18} className="animate-spin text-teal-500" />
                  <span className="text-sm text-slate-400 font-bold">Loading…</span>
                </div>
              ) : listApts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                  <Calendar size={36} strokeWidth={1.5} className="mb-3" />
                  <p className="text-sm font-black text-slate-400">No appointments found</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {listApts.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition group">
                      <div className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[a.status] || "bg-slate-300"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-slate-900">{a.patient_name}</p>
                          {a.patient_phone && <span className="text-[10px] text-slate-400">{a.patient_phone}</span>}
                          {a.is_walk_in && <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded">Walk-in</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar size={9} /> {fmtDate(a.appointment_date)}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock size={9} /> {fmtTime(a.appointment_time)} · {a.duration_minutes}min
                          </span>
                          {a.department && <span className="text-[10px] font-bold text-teal-600">{a.department}</span>}
                          {a.doctor && <span className="text-[10px] text-slate-400">Dr. {a.doctor}</span>}
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${STATUS_STYLE[a.status]}`}>{a.status}</span>
                        </div>
                        {a.notes && <p className="text-[11px] text-slate-400 italic mt-0.5 truncate">{a.notes}</p>}
                      </div>
                      {/* quick actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                        {a.status === "Scheduled" && (
                          <button onClick={() => setStatus(a.id,"Confirmed")} title="Confirm"
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-teal-50 text-slate-300 hover:text-teal-600 transition">
                            <Check size={12} />
                          </button>
                        )}
                        <button onClick={() => setConsultApt(a)} title="Record consultation"
  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-teal-50 text-slate-300 hover:text-teal-600 transition">
  <Mic size={12} />
</button>
                        {(a.status === "Scheduled"||a.status==="Confirmed") && (
                          <button onClick={() => setStatus(a.id,"Completed")} title="Mark completed"
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 transition">
                            <CheckCircle2 size={12} />
                          </button>
                        )}
                        <button onClick={() => openEdit(a)} title="Edit"
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition">
                          <Edit size={11} />
                        </button>
                        <button onClick={() => deleteApt(a.id)} title="Delete"
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
          {consultApt && (
  <ConsultationRecorder
    appointment={consultApt}
    onClose={() => setConsultApt(null)}
    onSaved={() => { setConsultApt(null); load(); }}
  />
)}
        </div>
      </main>

      {/* ── APPOINTMENT MODAL ── */}
      {modal && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm" style={{animation:"fadeIn .15s"}} onClick={() => setModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" style={{animation:"popIn .18s"}}>
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-100">

              {/* modal header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                  <Calendar size={15} className="text-teal-600" />
                </div>
                <h3 className="text-base font-black text-slate-900">{modal?.id ? "Edit Appointment" : "New Appointment"}</h3>
                <button onClick={() => setModal(null)}
                  className="ml-auto w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-500 transition">
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                {/* patient search / name */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Patient *</label>
                  <input
                    value={patSearch}
                    onChange={(e) => {
                      setPatSearch(e.target.value);
                      setForm((f) => ({ ...f, patient_name: e.target.value, patient_id: "" }));
                    }}
                    placeholder="Type name or search existing patients…"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition placeholder:text-slate-300"
                  />
                  {/* patient suggestions */}
                  {patSearch.length > 1 && (
                    <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-36 overflow-y-auto">
                      {patients
                        .filter((p) => p.full_name.toLowerCase().includes(patSearch.toLowerCase()))
                        .slice(0, 6)
                        .map((p) => (
                          <button key={p.id} onClick={() => {
                            setForm((f) => ({ ...f, patient_name: p.full_name, patient_phone: p.phone || f.patient_phone, patient_id: p.id }));
                            setPatSearch(p.full_name);
                          }}
                            className="w-full text-left px-3 py-2.5 hover:bg-teal-50 flex items-center gap-2.5 transition">
                            <div className="w-6 h-6 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 text-[10px] font-black shrink-0">
                              {p.full_name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{p.full_name}</p>
                              <p className="text-[10px] text-slate-400">{p.patient_id} {p.phone ? "· "+p.phone : ""}</p>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* phone */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Phone</label>
                  <input value={form.patient_phone} onChange={(e) => setForm((f) => ({ ...f, patient_phone: e.target.value }))}
                    placeholder="Patient phone number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition placeholder:text-slate-300" />
                </div>

                {/* date + time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Date *</label>
                    <input type="date" value={form.appointment_date} onChange={(e) => setForm((f) => ({ ...f, appointment_date: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Time *</label>
                    <input type="time" value={form.appointment_time} onChange={(e) => setForm((f) => ({ ...f, appointment_time: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition" />
                  </div>
                </div>

                {/* type + duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Type</label>
                    <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition appearance-none">
                      {APT_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Duration (min)</label>
                    <select value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition appearance-none">
                      {[15,20,30,45,60,90,120].map((d) => <option key={d} value={d}>{d} min</option>)}
                    </select>
                  </div>
                </div>

                {/* department + doctor */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Department</label>
                    <select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition appearance-none">
                      <option value="">Select…</option>
                      {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Doctor</label>
                    <input value={form.doctor} onChange={(e) => setForm((f) => ({ ...f, doctor: e.target.value }))}
                      placeholder="Dr. name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition placeholder:text-slate-300" />
                  </div>
                </div>

                {/* status + walk-in */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Status</label>
                    <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition appearance-none">
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <div onClick={() => setForm((f) => ({ ...f, is_walk_in: !f.is_walk_in }))}
                        className={`w-10 h-5 rounded-full transition relative ${form.is_walk_in ? "bg-teal-500" : "bg-slate-200"}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.is_walk_in ? "left-5" : "left-0.5"}`} />
                      </div>
                      <span className="text-xs font-bold text-slate-600">Walk-in</span>
                    </label>
                  </div>
                </div>

                {/* notes */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2} placeholder="Any additional notes…"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition resize-none placeholder:text-slate-300" />
                </div>
              </div>

              {/* footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-2 shrink-0">
                <button onClick={() => setModal(null)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 rounded-xl bg-slate-100 hover:bg-slate-200 transition">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving || !form.patient_name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-black py-2.5 rounded-xl transition">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {modal?.id ? "Save Changes" : "Book Appointment"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}