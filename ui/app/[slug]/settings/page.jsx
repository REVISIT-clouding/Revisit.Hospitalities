"use client";


import { useEffect, useState, useCallback } from "react";
import supabase from "@/lib/supabase";

// ─── Available staff roles ───────────────────────────────────
const ROLES = [
  { value: "admin",       label: "Admin",              desc: "Full access to all settings" },
  { value: "doctor",      label: "Doctor / Physician", desc: "Patients, visits, prescriptions" },
  { value: "nurse",       label: "Nurse",              desc: "Patient care & vitals" },
  { value: "billing",     label: "Billing Officer",    desc: "Invoices, payments, overrides" },
  { value: "pharmacist",  label: "Pharmacist",         desc: "Inventory & dispensing" },
  { value: "staff",       label: "General Staff",      desc: "Basic access only" },
];

// ─── Role badge colours ──────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
//  Shared input style (used across all forms)
// ─────────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", padding: "9px 12px", fontSize: 13,
  border: "0.5px solid #e2e8f0", borderRadius: 8,
  background: "#fff", color: "#1e293b", outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

// ─────────────────────────────────────────────────────────────
//  "Add Staff" modal — collects name, email, role, sends invite
// ─────────────────────────────────────────────────────────────

function AddStaffModal({ onClose, onSuccess }) {
  const [form, setForm]     = useState({ name: "", email: "", role: "staff" });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit() {
    // Basic validation
    if (!form.name.trim())  return setError("Please enter the staff member's full name.");
    if (!form.email.trim()) return setError("Please enter an email address.");
    if (!/\S+@\S+\.\S+/.test(form.email)) return setError("That email address doesn't look right.");

    setSaving(true);
    setError("");

    try {
      // ── Call our API route which uses the Supabase admin key ─
      // The admin key must NEVER be used client-side.
      // See /api/staff/create.js for the server-side code.
      const res = await fetch("/api/staff/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Something went wrong. Please try again.");
        setSaving(false);
        return;
      }

      onSuccess(json.user);   // Pass new user back to the list
      onClose();
    } catch {
      setError("Could not connect to the server. Please try again.");
      setSaving(false);
    }
  }

  // Close modal when clicking the dark overlay behind it
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>

        {/* Modal header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "0.5px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>Add new staff member</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                They will receive an email to set their own password.
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#94a3b8", lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* Form fields */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Full name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#475569", display: "block", marginBottom: 6 }}>
              Full name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text" placeholder="e.g. Dr. Amaka Okonkwo"
              value={form.name} onChange={e => set("name", e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = "#6366f1"}
              onBlur={e => e.target.style.borderColor = "#e2e8f0"}
            />
          </div>

          {/* Email address */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#475569", display: "block", marginBottom: 6 }}>
              Work email address <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="email" placeholder="e.g. amaka@yourhospital.ng"
              value={form.email} onChange={e => set("email", e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = "#6366f1"}
              onBlur={e => e.target.style.borderColor = "#e2e8f0"}
            />
          </div>

          {/* Role selector */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#475569", display: "block", marginBottom: 6 }}>
              Role / Department <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {ROLES.map(r => {
                const selected = form.role === r.value;
                const colour   = ROLE_COLOURS[r.value] || ROLE_COLOURS.staff;
                return (
                  <button
                    key={r.value}
                    onClick={() => set("role", r.value)}
                    style={{
                      padding: "10px 12px", borderRadius: 8, textAlign: "left", cursor: "pointer",
                      border: selected ? `1.5px solid ${colour.color}` : "0.5px solid #e2e8f0",
                      background: selected ? colour.bg : "#fff",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: selected ? colour.color : "#1e293b" }}>{r.label}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{r.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div style={{ background: "#fff5f5", border: "0.5px solid #fca5a5", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#b91c1c" }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div style={{ padding: "0 24px 20px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", fontSize: 13, borderRadius: 8, border: "0.5px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit} disabled={saving}
            style={{ padding: "9px 22px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "none", background: saving ? "#a5b4fc" : "#4f46e5", color: "#fff", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            {saving ? "Sending invite…" : "✉️ Send invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Edit Role modal — change a staff member's role
// ─────────────────────────────────────────────────────────────

function EditRoleModal({ staff, onClose, onSave }) {
  const [role,   setRole]   = useState(staff.role);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", staff.id);
    setSaving(false);
    if (!error) onSave({ ...staff, role });
    onClose();
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "0.5px solid #f1f5f9" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>Change role for {staff.name}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>This will update what they can see and do in the system.</div>
        </div>
        <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ROLES.map(r => {
            const selected = role === r.value;
            const colour   = ROLE_COLOURS[r.value] || ROLE_COLOURS.staff;
            return (
              <button key={r.value} onClick={() => setRole(r.value)} style={{ padding: "10px 12px", borderRadius: 8, textAlign: "left", cursor: "pointer", border: selected ? `1.5px solid ${colour.color}` : "0.5px solid #e2e8f0", background: selected ? colour.bg : "#fff" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: selected ? colour.color : "#1e293b" }}>{r.label}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{r.desc}</div>
              </button>
            );
          })}
        </div>
        <div style={{ padding: "0 24px 20px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", fontSize: 13, borderRadius: 8, border: "0.5px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || role === staff.role} style={{ padding: "9px 22px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "none", background: (saving || role === staff.role) ? "#a5b4fc" : "#4f46e5", color: "#fff", cursor: (saving || role === staff.role) ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Confirm Delete modal
// ─────────────────────────────────────────────────────────────

function ConfirmRemoveModal({ staff, onClose, onConfirm }) {
  const [removing, setRemoving] = useState(false);

  async function handleConfirm() {
    setRemoving(true);
    // Delete from public.users — Supabase cascade will remove auth.users too
    // (because of the FK constraint with ON DELETE CASCADE you defined)
    await onConfirm(staff.id);
    setRemoving(false);
    onClose();
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", textAlign: "center" }}>Remove {staff.name}?</div>
          <div style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 6, lineHeight: 1.6 }}>
            This will permanently delete their account and log them out immediately. This cannot be undone.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
            <button onClick={onClose} style={{ padding: "9px 20px", fontSize: 13, borderRadius: 8, border: "0.5px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer" }}>
              Keep them
            </button>
            <button onClick={handleConfirm} disabled={removing} style={{ padding: "9px 20px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "none", background: removing ? "#fca5a5" : "#ef4444", color: "#fff", cursor: removing ? "not-allowed" : "pointer" }}>
              {removing ? "Removing…" : "Yes, remove"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Staff tab — the main staff management section
// ─────────────────────────────────────────────────────────────

function StaffTab() {
  const [staff,    setStaff]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [showAdd,  setShowAdd]  = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  // Fetch all staff from public.users
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("users")
      .select("id, name, email, role, created_at")
      .order("created_at", { ascending: false });
    if (data) setStaff(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // Filter by search term
  const visible = staff.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [s.name, s.email, s.role].join(" ").toLowerCase().includes(q);
  });

  // Called when new staff is added via the modal
  const handleAdded = (newUser) => {
    setStaff(prev => [newUser, ...prev]);
  };

  // Called when a role is updated
  const handleRoleUpdated = (updated) => {
    setStaff(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  // Remove a staff member
  const handleRemove = async (id) => {
    await supabase.from("users").delete().eq("id", id);
    setStaff(prev => prev.filter(s => s.id !== id));
  };

  const editingStaff  = staff.find(s => s.id === editingId);
  const removingStaff = staff.find(s => s.id === removingId);

  const inputS = { ...inputStyle, fontSize: 12, padding: "7px 12px 7px 34px" };

  return (
    <div>
      {/* Add modal */}
      {showAdd && <AddStaffModal onClose={() => setShowAdd(false)} onSuccess={handleAdded} />}

      {/* Edit role modal */}
      {editingStaff && (
        <EditRoleModal staff={editingStaff} onClose={() => setEditingId(null)} onSave={handleRoleUpdated} />
      )}

      {/* Confirm remove modal */}
      {removingStaff && (
        <ConfirmRemoveModal staff={removingStaff} onClose={() => setRemovingId(null)} onConfirm={handleRemove} />
      )}

      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>Staff members</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
            {staff.length} account{staff.length !== 1 ? "s" : ""} · New staff receive an email invitation to set their password
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ padding: "9px 18px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "none", background: "teal", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          + Add staff member
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 14, maxWidth: 340 }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#94a3b8" }}>🔍</span>
        <input type="text" placeholder="Search by name, email, or role…" value={search} onChange={e => setSearch(e.target.value)} style={inputS} />
      </div>

      {/* Staff table */}
      <div style={{ border: "0.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "0.5px solid #e2e8f0" }}>
              {["Staff member", "Email address", "Role", "Joined", "Actions"].map((h, i) => (
                <th key={i} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 500, color: "#94a3b8", textAlign: "left", letterSpacing: 0.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: "0.5px solid #f1f5f9" }}>
                  {[0,1,2,3,4].map(j => (
                    <td key={j} style={{ padding: 16 }}>
                      <div style={{ height: 14, background: "#f1f5f9", borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
                  {search ? "No staff match your search." : "No staff added yet."}
                  {!search && (
                    <div>
                      <button onClick={() => setShowAdd(true)} style={{ marginTop: 8, fontSize: 12, color: "#4f46e5", background: "none", border: "none", cursor: "pointer" }}>
                        Add your first staff member
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              visible.map(person => {
                const color    = avatarColor(person.name);
                const initials = person.name.split(" ").map(p => p[0]).join("").substring(0, 2).toUpperCase();
                const roleCfg  = ROLE_COLOURS[person.role] || ROLE_COLOURS.staff;
                const roleLabel = ROLES.find(r => r.value === person.role)?.label || person.role;
                const joined   = new Date(person.created_at).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

                return (
                  <tr key={person.id} style={{ borderBottom: "0.5px solid #f1f5f9" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Name + avatar */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: color + "22", border: `0.5px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color, flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#1e293b" }}>{person.name}</div>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#64748b" }}>{person.email}</td>

                    {/* Role badge */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, background: roleCfg.bg, color: roleCfg.color, fontSize: 11, fontWeight: 500 }}>
                        {roleLabel}
                      </span>
                    </td>

                    {/* Date joined */}
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#94a3b8" }}>{joined}</td>

                    {/* Action buttons */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => setEditingId(person.id)}
                          style={{ padding: "5px 12px", fontSize: 11, borderRadius: 6, border: "0.5px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer" }}
                        >
                          ✏️ Edit role
                        </button>
                        <button
                          onClick={() => setRemovingId(person.id)}
                          style={{ padding: "5px 12px", fontSize: 11, borderRadius: 6, border: "0.5px solid #fca5a5", background: "#fff5f5", color: "#b91c1c", cursor: "pointer" }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Hospital Info tab — basic hospital settings
// ─────────────────────────────────────────────────────────────

function HospitalTab() {
  const [form,   setForm]   = useState({ name: "", address: "", phone: "", email: "", rc_number: "" });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  // Load hospital info from the hospitals table
  useEffect(() => {
    supabase.from("hospitals").select("*").limit(1).single().then(({ data }) => {
      if (data) setForm({ name: data.name || "", address: data.address || "", phone: data.phone || "", email: data.email || "", rc_number: data.rc_number || "" });
    });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    setSaving(true);
    await supabase.from("hospitals").update(form).eq("id", form.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const fields = [
    { key: "name",      label: "Hospital name",          placeholder: "e.g. Lagos General Hospital" },
    { key: "address",   label: "Full address",            placeholder: "e.g. 12 Broad St, Lagos Island" },
    { key: "phone",     label: "Main phone number",       placeholder: "e.g. +234 801 234 5678" },
    { key: "email",     label: "Main contact email",      placeholder: "e.g. info@hospital.ng" },
    { key: "rc_number", label: "CAC / RC Number",         placeholder: "e.g. RC 123456" },
  ];

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>Hospital information</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 24 }}>This information appears on invoices and reports.</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {fields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#475569", display: "block", marginBottom: 6 }}>{label}</label>
            <input
              type="text" placeholder={placeholder} value={form[key]}
              onChange={e => set(key, e.target.value)}
              style={{ ...inputStyle, padding: "9px 12px" }}
              onFocus={e => e.target.style.borderColor = "#6366f1"}
              onBlur={e => e.target.style.borderColor = "#e2e8f0"}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={handleSave} disabled={saving} style={{ padding: "9px 22px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "none", background: saving ? "#a5b4fc" : "#4f46e5", color: "#fff", cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span style={{ fontSize: 12, color: "#16a34a" }}>✓ Saved successfully!</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  My Account tab — change your own name / password
// ─────────────────────────────────────────────────────────────

function AccountTab() {
  const [profile,  setProfile]  = useState({ name: "", email: "" });
  const [password, setPassword] = useState({ current: "", newPwd: "", confirm: "" });
  const [saving,   setSaving]   = useState(false);
  const [message,  setMessage]  = useState("");

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

  async function saveName() {
    setSaving(true); setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("users").update({ name: profile.name }).eq("id", user.id);
    setSaving(false); setMessage("Name updated successfully.");
    setTimeout(() => setMessage(""), 2500);
  }

  async function changePassword() {
    if (!password.newPwd) return setMessage("Please enter a new password.");
    if (password.newPwd !== password.confirm) return setMessage("Passwords do not match.");
    if (password.newPwd.length < 8) return setMessage("Password must be at least 8 characters.");
    setSaving(true); setMessage("");
    const { error } = await supabase.auth.updateUser({ password: password.newPwd });
    setSaving(false);
    if (error) return setMessage("Could not update password: " + error.message);
    setPassword({ current: "", newPwd: "", confirm: "" });
    setMessage("Password changed successfully.");
    setTimeout(() => setMessage(""), 2500);
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>My account</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 24 }}>Update your display name or change your password.</div>

      {/* Display name */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#1e293b", marginBottom: 12 }}>Display name</div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: "#475569", display: "block", marginBottom: 6 }}>Full name</label>
          <input type="text" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} style={{ ...inputStyle, padding: "9px 12px" }} onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
        </div>
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "#475569", display: "block", marginBottom: 6 }}>Email address (read only)</label>
          <input type="email" value={profile.email} readOnly style={{ ...inputStyle, padding: "9px 12px", background: "#f8fafc", color: "#94a3b8" }} />
        </div>
        <button onClick={saveName} disabled={saving} style={{ marginTop: 12, padding: "9px 22px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", cursor: "pointer" }}>
          Save name
        </button>
      </div>

      {/* Password */}
      <div style={{ paddingTop: 20, borderTop: "0.5px solid #e2e8f0" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#1e293b", marginBottom: 12 }}>Change password</div>
        {[
          { key: "newPwd",  label: "New password",      placeholder: "Min. 8 characters" },
          { key: "confirm", label: "Confirm new password", placeholder: "Type it again" },
        ].map(({ key, label, placeholder }) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#475569", display: "block", marginBottom: 6 }}>{label}</label>
            <input type="password" placeholder={placeholder} value={password[key]} onChange={e => setPassword(p => ({ ...p, [key]: e.target.value }))} style={{ ...inputStyle, padding: "9px 12px" }} onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
          </div>
        ))}
        <button onClick={changePassword} disabled={saving} style={{ marginTop: 4, padding: "9px 22px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", cursor: "pointer" }}>
          Change password
        </button>
      </div>

      {/* Message */}
      {message && (
        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: message.includes("not") || message.includes("least") ? "#fff5f5" : "#f0fdf4", border: `0.5px solid ${message.includes("not") || message.includes("least") ? "#fca5a5" : "#bbf7d0"}`, fontSize: 12, color: message.includes("not") || message.includes("least") ? "#b91c1c" : "#16a34a" }}>
          {message}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Main Settings Page
// ─────────────────────────────────────────────────────────────

const TABS = [
  { id: "staff",    label: "👥 Staff",            component: StaffTab    },
  { id: "hospital", label: "🏥 Hospital info",    component: HospitalTab },
  { id: "account",  label: "👤 My account",       component: AccountTab  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("staff");
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || StaffTab;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 16px" }}>

        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#1e293b" }}>Settings</div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>Manage your hospital, staff accounts, and personal preferences.</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24, alignItems: "start" }}>

          {/* Sidebar tab navigation */}
          <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e2e8f0", overflow: "hidden", padding: "6px" }}>
            {TABS.map(tab => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    width: "100%", padding: "10px 14px", textAlign: "left", cursor: "pointer",
                    fontSize: 13, fontWeight: isActive ? 500 : 400,
                    borderRadius: 8, border: "none",
                    background: isActive ? "#f0f0ff" : "transparent",
                    color: isActive ? "#4f46e5" : "#475569",
                    display: "block",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!isActive) e.target.style.background = "#f8fafc"; }}
                  onMouseLeave={e => { if (!isActive) e.target.style.background = "transparent"; }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Main content panel */}
          <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e2e8f0", padding: "24px 28px" }}>
            <ActiveComponent />
          </div>

        </div>
      </div>
    </div>
  );
}