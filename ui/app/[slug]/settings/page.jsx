"use client";

import { useEffect, useState, useCallback } from "react";
import supabase from "@/lib/supabase";
import {
  Users, Building2, User, ShieldCheck, Menu, X,
  Plus, Trash2, Edit2, Check, Loader2, Mail,
  Phone, ChevronRight,
} from "lucide-react";

// ─── Roles ───────────────────────────────────────────────────
const ROLES = [
  { value: "admin",      label: "Admin",              desc: "Full access to all settings" },
  { value: "doctor",     label: "Doctor / Physician", desc: "Patients, visits, prescriptions" },
  { value: "nurse",      label: "Nurse",              desc: "Patient care & vitals" },
  { value: "billing",    label: "Billing Officer",    desc: "Invoices, payments, overrides" },
  { value: "pharmacist", label: "Pharmacist",         desc: "Inventory & dispensing" },
  { value: "staff",      label: "General Staff",      desc: "Basic access only" },
];

const ROLE_COLOURS = {
  admin:      { bg: "#EDE9FE", color: "#5B21B6" },
  doctor:     { bg: "#DBEAFE", color: "#1D4ED8" },
  nurse:      { bg: "#D1FAE5", color: "#065F46" },
  billing:    { bg: "#FEF3C7", color: "#92400E" },
  pharmacist: { bg: "#ECFCCB", color: "#3F6212" },
  staff:      { bg: "#F1F5F9", color: "#475569" },
};

const AVATAR_PALETTE = ["#185FA5","#0F6E56","#854F0B","#533B89","#A32D2D","#2563eb","#0e7490"];
const avatarColor = (name = "") => AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];

// ─── Tabs config ─────────────────────────────────────────────
const TABS = [
  { id: "staff",     label: "Staff",             icon: Users },
  { id: "insurance", label: "Insurance / HMO",   icon: ShieldCheck },
  { id: "hospital",  label: "Hospital Info",      icon: Building2 },
  { id: "account",   label: "My Account",         icon: User },
];

/* ═══════════════════════════════════════════════════════════════
   ADD STAFF MODAL
═══════════════════════════════════════════════════════════════ */
function AddStaffModal({ hospitalId, onClose, onSuccess }) {
  const [form,   setForm]   = useState({ name: "", email: "", role: "staff" });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit() {
    if (!form.name.trim())  return setError("Please enter the staff member's full name.");
    if (!form.email.trim()) return setError("Please enter an email address.");
    if (!/\S+@\S+\.\S+/.test(form.email)) return setError("That email address doesn't look right.");
    setSaving(true); setError("");
    try {
      const res  = await fetch("/api/staff/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, hospital_id: hospitalId }) });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Something went wrong."); setSaving(false); return; }
      onSuccess(json.user); onClose();
    } catch { setError("Could not connect to the server."); setSaving(false); }
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100" style={{animation:"popIn .18s"}}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">Add staff member</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">They'll receive an email to set their password</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-400 transition"><X size={14}/></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Full Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Dr. Amaka Okonkwo"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition placeholder:text-slate-300"/>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Work Email *</label>
            <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="amaka@hospital.ng"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition placeholder:text-slate-300"/>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => {
                const sel = form.role === r.value;
                const c   = ROLE_COLOURS[r.value] || ROLE_COLOURS.staff;
                return (
                  <button key={r.value} onClick={() => set("role", r.value)}
                    className="p-2.5 rounded-xl text-left border transition"
                    style={{ background: sel ? c.bg : "#f8fafc", border: sel ? `1.5px solid ${c.color}` : "1px solid #e2e8f0" }}>
                    <p className="text-xs font-black" style={{ color: sel ? c.color : "#1e293b" }}>{r.label}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{r.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700">⚠ {error}</div>}
        </div>
        <div className="px-6 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-black rounded-xl transition">
            {saving ? <Loader2 size={13} className="animate-spin"/> : <Mail size={13}/>}
            {saving ? "Sending…" : "Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EDIT ROLE MODAL
═══════════════════════════════════════════════════════════════ */
function EditRoleModal({ staff, onClose, onSave }) {
  const [role, setRole]     = useState(staff.role);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from("users").update({ role }).eq("id", staff.id);
    setSaving(false);
    if (!error) onSave({ ...staff, role });
    onClose();
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-100" style={{animation:"popIn .18s"}}>
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900">Change role</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{staff.name}</p>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-2">
          {ROLES.map(r => {
            const sel = role === r.value;
            const c   = ROLE_COLOURS[r.value] || ROLE_COLOURS.staff;
            return (
              <button key={r.value} onClick={() => setRole(r.value)}
                className="p-2.5 rounded-xl text-left border transition"
                style={{ background: sel ? c.bg : "#f8fafc", border: sel ? `1.5px solid ${c.color}` : "1px solid #e2e8f0" }}>
                <p className="text-xs font-black" style={{ color: sel ? c.color : "#1e293b" }}>{r.label}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">{r.desc}</p>
              </button>
            );
          })}
        </div>
        <div className="px-6 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Cancel</button>
          <button onClick={handleSave} disabled={saving || role === staff.role}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2">
            {saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONFIRM REMOVE MODAL
═══════════════════════════════════════════════════════════════ */
function ConfirmRemoveModal({ staff, onClose, onConfirm }) {
  const [removing, setRemoving] = useState(false);
  async function handleConfirm() { setRemoving(true); await onConfirm(staff.id); setRemoving(false); onClose(); }
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl border border-slate-100 p-6 text-center" style={{animation:"popIn .18s"}}>
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="text-sm font-black text-slate-900">Remove {staff.name}?</h3>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">This will permanently delete their account. This cannot be undone.</p>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Keep them</button>
          <button onClick={handleConfirm} disabled={removing}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2">
            {removing ? <Loader2 size={13} className="animate-spin"/> : null}
            {removing ? "Removing…" : "Yes, remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STAFF TAB
═══════════════════════════════════════════════════════════════ */
function StaffTab({ currentUser }) {
  const [staff,      setStaff]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [showAdd,    setShowAdd]    = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("users").select("id, name, email, role, created_at")
      .eq("hospital_id", currentUser.hospital_id).order("created_at", { ascending: false });
    if (data) setStaff(data);
    setLoading(false);
  }, [currentUser.hospital_id]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const visible = staff.filter(s => !search || [s.name, s.email, s.role].join(" ").toLowerCase().includes(search.toLowerCase()));
  const handleAdded       = (u) => setStaff(p => [u, ...p]);
  const handleRoleUpdated = (u) => setStaff(p => p.map(s => s.id === u.id ? u : s));
  const handleRemove      = async (id) => { await supabase.from("users").delete().eq("id", id); setStaff(p => p.filter(s => s.id !== id)); };

  return (
    <div>
      {showAdd    && <AddStaffModal hospitalId={currentUser.hospital_id} onClose={() => setShowAdd(false)} onSuccess={handleAdded}/>}
      {editingId  && <EditRoleModal staff={staff.find(s => s.id === editingId)}  onClose={() => setEditingId(null)}  onSave={handleRoleUpdated}/>}
      {removingId && <ConfirmRemoveModal staff={staff.find(s => s.id === removingId)} onClose={() => setRemovingId(null)} onConfirm={handleRemove}/>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-sm font-black text-slate-900">Staff Members</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">{staff.length} account{staff.length !== 1 ? "s" : ""} · New staff receive an email invite</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-black px-4 py-2.5 rounded-xl transition shadow-sm w-fit">
          <Plus size={13}/> Add Staff Member
        </button>
      </div>

      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs">🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or role…"
          className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500 transition max-w-xs placeholder:text-slate-300"/>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {["Staff Member","Email","Role","Joined","Actions"].map(h => (
                <th key={h} className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({length:4}).map((_,i) => (
                <tr key={i} className="border-b border-slate-50">
                  {[0,1,2,3,4].map(j => <td key={j} className="px-4 py-3"><div className="h-3 bg-slate-100 rounded animate-pulse"/></td>)}
                </tr>
              ))
            ) : visible.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center">
                <Users size={28} strokeWidth={1.5} className="text-slate-200 mx-auto mb-2"/>
                <p className="text-sm font-black text-slate-400">{search ? "No staff match your search" : "No staff added yet"}</p>
                {!search && <button onClick={() => setShowAdd(true)} className="text-xs text-teal-600 hover:underline mt-1">Add your first staff member</button>}
              </td></tr>
            ) : visible.map(person => {
              const color    = avatarColor(person.name);
              const initials = person.name.split(" ").map(p => p[0]).join("").substring(0,2).toUpperCase();
              const roleCfg  = ROLE_COLOURS[person.role] || ROLE_COLOURS.staff;
              const roleLabel= ROLES.find(r => r.value === person.role)?.label || person.role;
              const joined   = new Date(person.created_at).toLocaleDateString("en-NG",{day:"2-digit",month:"short",year:"numeric"});
              const isSelf   = person.id === currentUser.id;
              return (
                <tr key={person.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0" style={{background:color+"22",color,border:`1px solid ${color}44`}}>{initials}</div>
                      <div>
                        <p className="text-xs font-black text-slate-800">{person.name}</p>
                        {isSelf && <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-full font-black">You</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{person.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{background:roleCfg.bg,color:roleCfg.color}}>{roleLabel}</span>
                  </td>
                  <td className="px-4 py-3 text-[10px] text-slate-400">{joined}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => !isSelf && setEditingId(person.id)} disabled={isSelf}
                        className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-teal-300 hover:text-teal-600 disabled:opacity-30 disabled:cursor-not-allowed transition">
                        Edit role
                      </button>
                      <button onClick={() => !isSelf && setRemovingId(person.id)} disabled={isSelf}
                        className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {loading ? Array.from({length:3}).map((_,i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-1/2 mb-2"/><div className="h-3 bg-slate-100 rounded w-3/4"/>
          </div>
        )) : visible.map(person => {
          const color    = avatarColor(person.name);
          const initials = person.name.split(" ").map(p => p[0]).join("").substring(0,2).toUpperCase();
          const roleCfg  = ROLE_COLOURS[person.role] || ROLE_COLOURS.staff;
          const roleLabel= ROLES.find(r => r.value === person.role)?.label || person.role;
          const isSelf   = person.id === currentUser.id;
          return (
            <div key={person.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0" style={{background:color+"22",color,border:`1px solid ${color}44`}}>{initials}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-black text-slate-800">{person.name}</p>
                  {isSelf && <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-full font-black">You</span>}
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{background:roleCfg.bg,color:roleCfg.color}}>{roleLabel}</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{person.email}</p>
              </div>
              {!isSelf && (
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => setEditingId(person.id)} className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-600 transition">Edit</button>
                  <button onClick={() => setRemovingId(person.id)} className="text-[10px] font-bold px-2 py-1 rounded-lg border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 transition">Remove</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INSURANCE PROVIDERS TAB  ← NEW
═══════════════════════════════════════════════════════════════ */
function InsuranceTab({ currentUser }) {
  const [providers, setProviders] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState(null); // provider obj or null
  const [form,      setForm]      = useState({ name: "", contact_person: "", email: "" });
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("insurance_providers")
      .select("*").eq("hospital_id", currentUser.hospital_id).order("name");
    if (data) setProviders(data);
    setLoading(false);
  }, [currentUser.hospital_id]);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  function openAdd() { setForm({ name:"", contact_person:"", email:"" }); setEditing(null); setShowForm(true); }
  function openEdit(p) { setForm({ name: p.name, contact_person: p.contact_person||"", email: p.email||"" }); setEditing(p); setShowForm(true); }
  function cancelForm() { setShowForm(false); setEditing(null); }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editing) {
      await supabase.from("insurance_providers").update({ name: form.name.trim(), contact_person: form.contact_person||null, email: form.email||null }).eq("id", editing.id);
    } else {
      await supabase.from("insurance_providers").insert([{ hospital_id: currentUser.hospital_id, name: form.name.trim(), contact_person: form.contact_person||null, email: form.email||null }]);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    fetchProviders();
  }

  async function handleDelete(id) {
    if (!confirm("Remove this insurance provider? This won't affect existing invoices.")) return;
    setDeleting(id);
    await supabase.from("insurance_providers").delete().eq("id", id);
    setDeleting(null);
    fetchProviders();
  }

  const PROVIDER_COLOURS = [
    "border-l-violet-500","border-l-blue-500","border-l-teal-500",
    "border-l-amber-500","border-l-emerald-500","border-l-rose-500",
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-sm font-black text-slate-900">Insurance / HMO Providers</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {providers.length} provider{providers.length !== 1 ? "s" : ""} · Used when creating HMO invoices and assigning to patients
          </p>
        </div>
        {!showForm && (
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-black px-4 py-2.5 rounded-xl transition shadow-sm w-fit">
            <Plus size={13}/> Add Provider
          </button>
        )}
      </div>

      {/* inline add/edit form */}
      {showForm && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 mb-5 space-y-3" style={{animation:"popIn .18s"}}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-violet-800">{editing ? "Edit Provider" : "New Provider"}</p>
            <button onClick={cancelForm} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-violet-100 text-violet-400 transition"><X size={13}/></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Provider Name *</label>
              <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. NHIS, Leadway, AXA"
                className="w-full bg-white border border-violet-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-500 transition placeholder:text-slate-300"/>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Contact Person</label>
              <input value={form.contact_person} onChange={e => setForm(f=>({...f,contact_person:e.target.value}))} placeholder="e.g. Mrs. Bola Adeyemi"
                className="w-full bg-white border border-violet-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-500 transition placeholder:text-slate-300"/>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="claims@provider.ng"
                className="w-full bg-white border border-violet-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-500 transition placeholder:text-slate-300"/>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={cancelForm} className="px-4 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-black rounded-xl transition">
              {saving ? <Loader2 size={12} className="animate-spin"/> : <Check size={12}/>}
              {editing ? "Save Changes" : "Add Provider"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse"/>)}
        </div>
      ) : providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
          <ShieldCheck size={32} strokeWidth={1.5} className="text-slate-200 mb-3"/>
          <p className="text-sm font-black text-slate-400">No providers yet</p>
          <p className="text-xs text-slate-300 mt-1">Add your first HMO or insurance provider</p>
          {!showForm && (
            <button onClick={openAdd} className="mt-4 text-xs font-black text-teal-600 hover:underline flex items-center gap-1">
              <Plus size={12}/> Add provider
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {providers.map((prov, idx) => (
            <div key={prov.id}
              className={`bg-white border border-slate-200 border-l-4 ${PROVIDER_COLOURS[idx % PROVIDER_COLOURS.length]} rounded-xl px-4 py-3 flex items-center gap-3 group hover:bg-slate-50 transition`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-800">{prov.name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {prov.contact_person && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <User size={9}/> {prov.contact_person}
                    </span>
                  )}
                  {prov.email && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Mail size={9}/> {prov.email}
                    </span>
                  )}
                  {!prov.contact_person && !prov.email && (
                    <span className="text-[10px] text-slate-300 italic">No contact info</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                <button onClick={() => openEdit(prov)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition">
                  <Edit2 size={13}/>
                </button>
                <button onClick={() => handleDelete(prov.id)} disabled={deleting === prov.id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition">
                  {deleting === prov.id ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
        <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-1">How this works</p>
        <p className="text-xs text-violet-700 leading-relaxed">
          Providers added here appear in patient profiles and Quick Charge. When a patient has a provider linked, HMO billing is auto-detected when creating invoices.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOSPITAL TAB
═══════════════════════════════════════════════════════════════ */
function HospitalTab() {
  const [form,   setForm]   = useState({ name:"", address:"", phone:"", email:"", rc_number:"" });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    supabase.from("hospitals").select("*").limit(1).single().then(({ data }) => {
      if (data) setForm({ id:data.id, name:data.name||"", address:data.address||"", phone:data.phone||"", email:data.email||"", rc_number:data.rc_number||"" });
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    await supabase.from("hospitals").update(form).eq("id", form.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const fields = [
    { key:"name",      label:"Hospital Name",       placeholder:"e.g. Lagos General Hospital" },
    { key:"address",   label:"Full Address",         placeholder:"e.g. 12 Broad St, Lagos Island" },
    { key:"phone",     label:"Main Phone Number",    placeholder:"e.g. +234 801 234 5678" },
    { key:"email",     label:"Main Contact Email",   placeholder:"e.g. info@hospital.ng" },
    { key:"rc_number", label:"CAC / RC Number",      placeholder:"e.g. RC 123456" },
  ];

  return (
    <div className="max-w-lg">
      <h2 className="text-sm font-black text-slate-900 mb-0.5">Hospital Information</h2>
      <p className="text-[10px] text-slate-400 mb-5">This information appears on invoices and reports.</p>
      <div className="space-y-4">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{label}</label>
            <input value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))} placeholder={placeholder}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition placeholder:text-slate-300"/>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-6">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-black px-5 py-2.5 rounded-xl transition">
          {saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {saved && <span className="text-xs font-bold text-emerald-600">✓ Saved!</span>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MY ACCOUNT TAB
═══════════════════════════════════════════════════════════════ */
function AccountTab() {
  const [profile,  setProfile]  = useState({ name:"", email:"" });
  const [password, setPassword] = useState({ newPwd:"", confirm:"" });
  const [saving,   setSaving]   = useState(false);
  const [message,  setMessage]  = useState({ text:"", ok:true });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setProfile({ email: user.email || "" });
        supabase.from("users").select("name").eq("id", user.id).single().then(({ data }) => {
          if (data) setProfile(p => ({ ...p, name: data.name }));
        });
      }
    });
  }, []);

  function msg(text, ok = true) { setMessage({ text, ok }); setTimeout(() => setMessage({ text:"", ok:true }), 2500); }

  async function saveName() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("users").update({ name: profile.name }).eq("id", user.id);
    setSaving(false); msg("Name updated successfully.");
  }

  async function changePassword() {
    if (!password.newPwd) return msg("Please enter a new password.", false);
    if (password.newPwd !== password.confirm) return msg("Passwords do not match.", false);
    if (password.newPwd.length < 8) return msg("Password must be at least 8 characters.", false);
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: password.newPwd });
    setSaving(false);
    if (error) return msg("Could not update: " + error.message, false);
    setPassword({ newPwd:"", confirm:"" });
    msg("Password changed successfully.");
  }

  return (
    <div className="max-w-md">
      <h2 className="text-sm font-black text-slate-900 mb-0.5">My Account</h2>
      <p className="text-[10px] text-slate-400 mb-5">Update your name or change your password.</p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Full Name</label>
<input value={profile.name || ""} onChange={e => setProfile(p=>({...p,name:e.target.value}))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition"/>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Email (read only)</label>
          <input value={profile.email || ""} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-400 outline-none"/>
        </div>
        <button onClick={saveName} disabled={saving}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-black px-4 py-2.5 rounded-xl transition">
          {saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>} Save Name
        </button>
      </div>

      <div className="pt-5 border-t border-slate-100 space-y-4">
        <p className="text-xs font-black text-slate-700">Change Password</p>
        {[{key:"newPwd",label:"New Password",ph:"Min. 8 characters"},{key:"confirm",label:"Confirm Password",ph:"Type it again"}].map(({key,label,ph}) => (
          <div key={key}>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{label}</label>
            <input type="password" value={password[key]} onChange={e => setPassword(p=>({...p,[key]:e.target.value}))} placeholder={ph}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition placeholder:text-slate-300"/>
          </div>
        ))}
        <button onClick={changePassword} disabled={saving}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-black px-4 py-2.5 rounded-xl transition">
          {saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>} Change Password
        </button>
      </div>

      {message.text && (
        <div className={`mt-4 px-3 py-2.5 rounded-xl text-xs font-bold border ${message.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN SETTINGS PAGE
═══════════════════════════════════════════════════════════════ */
export default function SettingsPage() {
  const [activeTab,   setActiveTab]   = useState("staff");
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [mobileNav,   setMobileNav]   = useState(false);

  useEffect(() => {
    async function checkRole() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { setCurrentUser({ _debug:"No auth session" }); setAuthChecked(true); return; }
      const { data: profile, error: profileError } = await supabase.from("users").select("id, name, role, hospital_id").eq("id", user.id).single();
      if (profileError || !profile) {
        setCurrentUser({ _debug:"Profile query failed", _authId:user.id, _authEmail:user.email, _profileError:profileError?.message });
      } else {
        setCurrentUser(profile);
      }
      setAuthChecked(true);
    }
    checkRole();
  }, []);

  if (!authChecked) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 size={20} className="animate-spin text-teal-500"/>
    </div>
  );

  if (currentUser?._debug) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" style={{fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-lg w-full">
        <p className="text-lg mb-3">🔍 Debug info</p>
        <p className="text-sm font-bold text-slate-800 mb-4">Settings couldn't read your profile:</p>
        <div className="space-y-2">
          {Object.entries(currentUser).filter(([k]) => k.startsWith("_")).map(([k,v]) => (
            <div key={k} className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-black text-slate-400 uppercase">{k.replace("_","")}</p>
              <p className="text-xs font-mono text-slate-800 break-all mt-0.5">{v||"—"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!currentUser || currentUser.role?.toLowerCase() !== "admin") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center" style={{fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <div className="text-center p-10">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-lg font-black text-slate-900 mb-2">Access restricted</h2>
        <p className="text-sm text-slate-400">Only administrators can access this page.</p>
        {currentUser?.role && <p className="text-xs text-slate-300 mt-2">Your role: <code className="bg-slate-100 px-1.5 py-0.5 rounded">{currentUser.role}</code></p>}
      </div>
    </div>
  );

  const activeTabConfig = TABS.find(t => t.id === activeTab);

  const renderContent = () => {
    if (activeTab === "staff")     return <StaffTab currentUser={currentUser}/>;
    if (activeTab === "insurance") return <InsuranceTab currentUser={currentUser}/>;
    if (activeTab === "hospital")  return <HospitalTab/>;
    if (activeTab === "account")   return <AccountTab/>;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" style={{fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes popIn  { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideInL { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}
      `}</style>

      {/* Mobile nav overlay */}
      {mobileNav && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 z-40 md:hidden" style={{animation:"fadeIn .18s"}} onClick={() => setMobileNav(false)}/>
          <div className="fixed top-0 left-0 h-screen w-64 bg-white border-r border-slate-100 z-50 flex flex-col shadow-2xl md:hidden" style={{animation:"slideInL .22s"}}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-black text-slate-900">Settings</p>
              <button onClick={() => setMobileNav(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400"><X size={14}/></button>
            </div>
            <div className="p-3 space-y-1">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const active = tab.id === activeTab;
                return (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileNav(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-black transition ${active ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:bg-slate-50"}`}>
                    <Icon size={14}/>{tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100 px-4 sm:px-8 py-3 flex items-center gap-3">
        <button onClick={() => setMobileNav(true)} className="md:hidden w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition">
          <Menu size={15}/>
        </button>
        <div>
          <h1 className="text-base font-black text-slate-900">Settings</h1>
          <p className="text-[10px] text-slate-400 hidden sm:block">Manage hospital, staff, insurance providers & your account</p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex gap-6 items-start">

        {/* Desktop sidebar */}
        <aside className="hidden md:block w-52 shrink-0">
          <div className="bg-white border border-slate-200 rounded-2xl p-2 sticky top-20">
            {TABS.map(tab => {
              const Icon   = tab.icon;
              const active = tab.id === activeTab;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-black transition mb-0.5 last:mb-0 ${
                    active ? "bg-teal-50 text-teal-700 border border-teal-100" : "text-slate-500 hover:bg-slate-50 border border-transparent"
                  }`}>
                  <Icon size={13}/>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Mobile: show active tab name + tap to switch */}
          <div className="md:hidden flex items-center gap-2 mb-4 bg-white border border-slate-200 rounded-xl px-3 py-2.5" onClick={() => setMobileNav(true)}>
            {activeTabConfig && <activeTabConfig.icon size={13} className="text-teal-600"/>}
            <p className="text-xs font-black text-slate-800 flex-1">{activeTabConfig?.label}</p>
            <ChevronRight size={13} className="text-slate-300"/>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            {renderContent()}
          </div>
        </div>

      </div>
    </div>
  );
}