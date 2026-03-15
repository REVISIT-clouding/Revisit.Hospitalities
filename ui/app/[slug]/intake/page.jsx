"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ChevronRight, ChevronLeft, CheckCircle,
  Loader2, AlertTriangle, Activity, User,
  Heart, Stethoscope, FileText, Shield, AlertCircle,
} from "lucide-react";
import supabase from "@/lib/supabase";

/* ─── Constants ───────────────────────────────────────────────────────────── */
const SERVICES = [
  { id: "General Medicine", icon: "🩺", desc: "General checkup or consultation" },
  { id: "Maternity",        icon: "🤱", desc: "Antenatal, delivery, postnatal" },
  { id: "Paediatrics",      icon: "👶", desc: "Children's health & care" },
  { id: "Surgery",          icon: "🔬", desc: "Surgical procedures & review" },
  { id: "Laboratory",       icon: "🧪", desc: "Blood tests, diagnostics" },
  { id: "Pharmacy",         icon: "💊", desc: "Prescription & drug pickup" },
  { id: "Eye Clinic",       icon: "👁️", desc: "Vision & eye health" },
  { id: "Dental",           icon: "🦷", desc: "Teeth & oral care" },
  { id: "Physiotherapy",    icon: "🦴", desc: "Rehabilitation & therapy" },
  { id: "Emergency",        icon: "🚨", desc: "Urgent care needed now" },
];
const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-","Not Sure"];
const GENOTYPES    = ["AA","AS","SS","AC","SC","Not Sure"];
const STEPS = [
  { n: 1, label: "Personal", icon: <User size={14} /> },
  { n: 2, label: "Service",  icon: <Stethoscope size={14} /> },
  { n: 3, label: "Medical",  icon: <Heart size={14} /> },
  { n: 4, label: "Review",   icon: <FileText size={14} /> },
];
const EMPTY = {
  full_name: "", date_of_birth: "", gender: "", phone: "",
  email: "", address: "", blood_group: "", genotype: "",
  allergies: "", emergency_contact_name: "",
  emergency_contact_phone: "", departments: [], complaint: "",
};

/* ─── Field Helpers ───────────────────────────────────────────────────────── */
const inputStyle = {
  width: "100%", background: "#fff", border: "1px solid #e2e8f0",
  borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#0f172a",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  transition: "border-color 0.15s",
};
const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#64748b",
  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
};

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: "#0d9488", marginLeft: 2 }}>*</span>}
        {hint && (
          <span style={{ marginLeft: 6, textTransform: "none", fontWeight: 400, color: "#94a3b8", fontSize: 10 }}>
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = "", required = false, hint }) {
  return (
    <Field label={label} required={required} hint={hint}>
      <input
        type={type} value={value || ""} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} style={inputStyle}
        onFocus={(e) => (e.target.style.borderColor = "#0d9488")}
        onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
      />
    </Field>
  );
}

function Select({ label, value, onChange, options, required = false }) {
  return (
    <Field label={label} required={required}>
      <select
        value={value || ""} onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, appearance: "none" }}
        onFocus={(e) => (e.target.style.borderColor = "#0d9488")}
        onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
      >
        <option value="">— Select —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}

function Textarea({ label, value, onChange, placeholder = "", required = false }) {
  return (
    <Field label={label} required={required}>
      <textarea
        value={value || ""} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} rows={3}
        style={{ ...inputStyle, resize: "none" }}
        onFocus={(e) => (e.target.style.borderColor = "#0d9488")}
        onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
      />
    </Field>
  );
}

/* ─── MAIN ────────────────────────────────────────────────────────────────── */
export default function IntakePage() {
  const { slug } = useParams();

  /* ── Hospital state ── */
  const [hospital,        setHospital]        = useState(null);
  const [hospitalLoading, setHospitalLoading] = useState(true);
  const [hospitalError,   setHospitalError]   = useState(false);

  /* ── Form state ── */
  const [step,        setStep]        = useState(1);
  const [form,        setForm]        = useState(EMPTY);
  const [error,       setError]       = useState("");
  const [saving,      setSaving]      = useState(false);
  const [refCode,     setRefCode]     = useState("");
  const [isReturning, setIsReturning] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  /* ── Load hospital by slug ── */
  useEffect(() => {
async function fetchHospital() {
  if (!slug) return;
  console.log("FETCHING HOSPITAL WITH SLUG:", slug);
  const { data, error } = await supabase
    .from("hospitals")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  console.log("HOSPITAL DATA:", data, "ERROR:", error);      if (error || !data) {
        setHospitalError(true);
      } else {
        setHospital(data);
      }
      setHospitalLoading(false);
    }
    fetchHospital();
  }, [slug]);

  /* ── Toggle department ── */
  function toggleDept(dept) {
    setForm((f) => ({
      ...f,
      departments: f.departments.includes(dept)
        ? f.departments.filter((d) => d !== dept)
        : [...f.departments, dept],
    }));
    setError("");
  }

  /* ── Validate ── */
  function validate() {
    if (step === 1) {
      if (!form.full_name.trim()) return "Please enter your full name.";
      if (!form.gender)           return "Please select your gender.";
    }
    if (step === 2 && form.departments.length === 0)
      return "Please select at least one service.";
    if (step === 3 && !form.complaint.trim())
      return "Please describe why you are coming in.";
    return null;
  }

  function next() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => s + 1);
  }
  function back() {
    setError("");
    setStep((s) => s - 1);
  }

  /* ── Submit ── */
  async function handleSubmit() {
    const err = validate();
    if (err) { setError(err); return; }
    if (!hospital?.id) return;

    setSaving(true);
    setError("");

    let patient = null;
    let isExisting = true;

    /* Step 1 — check by phone within this hospital */
    if (form.phone.trim()) {
      const { data: existing } = await supabase
        .from("patients")
        .select("*")
        .eq("phone", form.phone.trim())
        .eq("hospital_id", hospital.id)
        .maybeSingle();
      if (existing) { patient = existing; isExisting = true; }
    }

    /* Step 2 — fallback: match by name within this hospital */
    if (!patient) {
      const { data: existing } = await supabase
        .from("patients")
        .select("*")
        .ilike("full_name", form.full_name.trim())
        .eq("hospital_id", hospital.id)
        .maybeSingle();
      if (existing) { patient = existing; isExisting = true; }
    }

    /* Step 3 — create new patient */
    if (!patient) {
      const { data: newPatient, error: pErr } = await supabase
        .from("patients")
        .insert([{
          hospital_id:             hospital.id,
          full_name:               form.full_name.trim(),
          date_of_birth:           form.date_of_birth || null,
          gender:                  form.gender || null,
          phone:                   form.phone.trim() || null,
          email:                   form.email.trim() || null,
          address:                 form.address.trim() || null,
          blood_group:             form.blood_group || null,
          genotype:                form.genotype || null,
          allergies:               form.allergies.trim() || null,
          emergency_contact_name:  form.emergency_contact_name.trim() || null,
          emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        }])
        .select()
        .single();

      if (pErr) {
        setError("Something went wrong. Please try again.");
        setSaving(false);
        return;
      }
      patient = newPatient;
      // Send welcome new patient email
     await fetch("/api/notify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    patient,
    isExisting:    false,
    complaint:     form.complaint,
    hospitalName:  hospital.name,
    hospitalPhone: hospital.phone,
    hospitalEmail: hospital.email,
  }),
});
    }

    /* Step 4 — patch missing fields on returning patient */
    if (isExisting) {
      const updates = {};
      if (!patient.date_of_birth && form.date_of_birth)
        updates.date_of_birth = form.date_of_birth;
      if (!patient.gender && form.gender)
        updates.gender = form.gender;
      if (!patient.email && form.email.trim())
        updates.email = form.email.trim();
      if (!patient.address && form.address.trim())
        updates.address = form.address.trim();
      if (!patient.blood_group && form.blood_group)
        updates.blood_group = form.blood_group;
      if (!patient.genotype && form.genotype)
        updates.genotype = form.genotype;
      if (!patient.allergies && form.allergies.trim())
        updates.allergies = form.allergies.trim();
      if (!patient.emergency_contact_name && form.emergency_contact_name.trim())
        updates.emergency_contact_name = form.emergency_contact_name.trim();
      if (!patient.emergency_contact_phone && form.emergency_contact_phone.trim())
        updates.emergency_contact_phone = form.emergency_contact_phone.trim();
      if (Object.keys(updates).length > 0)
        await supabase.from("patients").update(updates).eq("id", patient.id);
      // Send welcome back email
await fetch("/api/notify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    patient,
    isExisting:    false,
    complaint:     form.complaint,
    hospitalName:  hospital.name,
    hospitalPhone: hospital.phone,
    hospitalEmail: hospital.email,
  }),
});
    }

    /* Step 5 — log visit */
    const { error: vErr } = await supabase.from("visits").insert([{
      hospital_id:  hospital.id,
      patient_id:   patient.id,
      departments:  form.departments,
      complaint:    form.complaint.trim(),
      visit_type:   form.departments.includes("Emergency") ? "Emergency" : "OPD",
      visit_status: "Open",
      is_emergency: form.departments.includes("Emergency"),
      visit_date:   new Date().toISOString(),
      notes: isExisting
        ? "Returning patient — registered via online intake form."
        : "New patient — registered via online intake form.",
    }]);

    if (vErr) {
      setError("Patient saved but visit could not be logged. Please inform reception.");
      setSaving(false);
      return;
    }

    setRefCode(patient.patient_id);
    setIsReturning(isExisting);
    setSaving(false);
    setStep(5);
  }

  /* ─── Loading / Error states ─────────────────────────────────────────── */
  if (hospitalLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#0d9488" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (hospitalError || !hospital) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "system-ui", gap: 12 }}>
      <p style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Hospital not found</p>
      <p style={{ fontSize: 14, color: "#94a3b8" }}>The link you used may be incorrect.</p>
    </div>
  );

  /* ─── Success Screen ──────────────────────────────────────────────────── */
  if (step === 5) return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } } @keyframes spin { to { transform:rotate(360deg); } } * { box-sizing:border-box; }`}</style>
      <div style={{ width: "100%", maxWidth: 400, textAlign: "center", animation: "fadeUp 0.4s ease-out" }}>

        <div style={{ width: 72, height: 72, borderRadius: 20, background: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 32px rgba(13,148,136,0.3)" }}>
          <CheckCircle size={36} color="#fff" />
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a" }}>
          {isReturning ? "Welcome Back!" : "You're Registered"}
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", marginTop: 8, lineHeight: 1.6 }}>
          {isReturning
            ? "Your visit has been logged under your existing profile."
            : `Your intake has been submitted to ${hospital.name}.`}{" "}
          Keep your reference code safe.
        </p>

        {/* Ref code */}
        <div style={{ marginTop: 20, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Your Patient Reference
          </p>
          <p style={{ fontSize: 32, fontWeight: 800, color: "#0d9488", fontFamily: "monospace", letterSpacing: "0.1em" }}>
            {refCode}
          </p>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
            Show this at the reception desk when you arrive.
          </p>
        </div>

        {/* Summary */}
        <div style={{ marginTop: 12, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", textAlign: "left", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            Submission Summary
          </p>
          {[
            ["Name",     form.full_name],
            ["Services", form.departments.join(", ")],
            ["Phone",    form.phone || "Not provided"],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155", textAlign: "right", maxWidth: "60%" }}>{val || "—"}</span>
            </div>
          ))}
        </div>

        {/* Emergency warning */}
        {form.departments.includes("Emergency") && (
          <div style={{ marginTop: 12, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 10, textAlign: "left" }}>
            <AlertCircle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12, color: "#991b1b", lineHeight: 1.5 }}>
              You selected Emergency. Please head to the hospital immediately
              or call <strong>{hospital.phone}</strong>.
            </p>
          </div>
        )}

        <div style={{ marginTop: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 10, textAlign: "left" }}>
          <Shield size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
            Patients are attended to in order of arrival and medical urgency.
          </p>
        </div>

        <button
          onClick={() => { setStep(1); setForm(EMPTY); setRefCode(""); setError(""); }}
          style={{ marginTop: 20, fontSize: 13, fontWeight: 700, color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>
          Register another patient →
        </button>
      </div>
    </div>
  );

  /* ─── Form ────────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to { transform:rotate(360deg); } }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "28px 20px 0", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 42, height: 42, background: "#0d9488", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(13,148,136,0.25)" }}>
            <Activity size={20} color="#fff" />
          </div>
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
              {hospital.name}
            </p>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#0d9488", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 3 }}>
              Patient Intake Form
            </p>
          </div>
        </div>
        <p style={{ fontSize: 13, color: "#94a3b8", maxWidth: 320, margin: "0 auto" }}>
          Fill this before your visit. Our team will be ready when you arrive.
        </p>
      </div>

      {/* Step Indicator */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "20px", gap: 0 }}>
        {STEPS.map((s, idx) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, display: "flex",
                alignItems: "center", justifyContent: "center",
                border: `2px solid ${step > s.n ? "#0d9488" : step === s.n ? "#0d9488" : "#e2e8f0"}`,
                background: step > s.n ? "#0d9488" : step === s.n ? "#f0fdfa" : "#fff",
                color: step > s.n ? "#fff" : step === s.n ? "#0d9488" : "#94a3b8",
                transition: "all 0.2s",
              }}>
                {step > s.n ? <CheckCircle size={15} /> : s.icon}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: step === s.n ? "#0d9488" : step > s.n ? "#0d9488" : "#cbd5e1" }}>
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div style={{ width: 36, height: 2, background: step > s.n ? "#0d9488" : "#e2e8f0", margin: "0 4px 18px", transition: "background 0.3s", borderRadius: 2 }} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "0 16px 40px" }}>
        <div style={{ width: "100%", maxWidth: 440, animation: "fadeUp 0.3s ease-out" }}>
          <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>

            {/* Card header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#0d9488", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Step {step} of {STEPS.length}
              </p>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                {step === 1 && "Personal Information"}
                {step === 2 && "Service Needed"}
                {step === 3 && "Medical Background"}
                {step === 4 && "Review & Submit"}
              </h2>
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                {step === 1 && "Tell us about yourself."}
                {step === 2 && "Select all departments or services you need."}
                {step === 3 && "Help us prepare with your medical history."}
                {step === 4 && "Review your details before submitting."}
              </p>
            </div>

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                <Input label="Full Name" placeholder="e.g. Chioma Okafor" value={form.full_name} onChange={set("full_name")} required />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Select label="Gender" options={["Male","Female","Other"]} value={form.gender} onChange={set("gender")} required />
                  <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={set("date_of_birth")} />
                </div>
                <Input label="Phone Number" placeholder="08012345678" type="tel" value={form.phone} onChange={set("phone")} hint="optional" />
                <Input label="Email Address" placeholder="optional" type="email" value={form.email} onChange={set("email")} />
                <Input label="Home Address" placeholder="e.g. 15 Sapele Road, Benin City" value={form.address} onChange={set("address")} />
              </div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <div style={{ padding: "20px 24px" }}>
                <p style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
                  Select <strong style={{ color: "#0f172a" }}>all</strong> services you need today.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {SERVICES.map((s) => {
                    const sel = form.departments.includes(s.id);
                    const isEmergency = s.id === "Emergency";
                    return (
                      <button key={s.id} type="button" onClick={() => toggleDept(s.id)}
                        style={{ position: "relative", textAlign: "left", padding: "12px 12px", borderRadius: 12, cursor: "pointer", transition: "all 0.15s", border: `2px solid ${sel ? (isEmergency ? "#ef4444" : "#0d9488") : "#e2e8f0"}`, background: sel ? (isEmergency ? "#fef2f2" : "#f0fdfa") : "#fff" }}
                        onMouseEnter={(e) => { if (!sel) e.currentTarget.style.borderColor = "#94a3b8"; }}
                        onMouseLeave={(e) => { if (!sel) e.currentTarget.style.borderColor = "#e2e8f0"; }}>
                        {sel && (
                          <div style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: "50%", background: isEmergency ? "#ef4444" : "#0d9488", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <CheckCircle size={11} color="#fff" />
                          </div>
                        )}
                        <span style={{ fontSize: 22, display: "block", marginBottom: 6 }}>{s.icon}</span>
                        <p style={{ fontSize: 12, fontWeight: 700, color: sel ? (isEmergency ? "#dc2626" : "#0f766e") : "#334155", lineHeight: 1.2 }}>{s.id}</p>
                        <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>{s.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {form.departments.length > 0 && (
                  <div style={{ marginTop: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Selected</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {form.departments.map((d) => (
                        <span key={d} style={{ fontSize: 11, fontWeight: 700, color: "#0f766e", background: "#f0fdfa", border: "1px solid #99f6e4", padding: "3px 10px", borderRadius: 6 }}>{d}</span>
                      ))}
                    </div>
                  </div>
                )}

                {form.departments.includes("Emergency") && (
                  <div style={{ marginTop: 12, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10 }}>
                    <AlertCircle size={13} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: "#991b1b", lineHeight: 1.5 }}>
                      If this is life-threatening, call <strong>{hospital.phone}</strong> immediately or go to the hospital now.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                <Textarea label="Reason for Visit" required placeholder="Briefly describe your symptoms or reason for coming in…" value={form.complaint} onChange={set("complaint")} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Select label="Blood Group" options={BLOOD_GROUPS} value={form.blood_group} onChange={set("blood_group")} />
                  <Select label="Genotype"    options={GENOTYPES}    value={form.genotype}    onChange={set("genotype")} />
                </div>
                <Input label="Known Allergies" placeholder="e.g. Penicillin, Peanuts (or None)" value={form.allergies} onChange={set("allergies")} />
                <div style={{ background: "#f8fafc", border: "1px dashed #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Emergency Contact</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Input label="Contact Name"  placeholder="e.g. Emeka Okafor" value={form.emergency_contact_name}  onChange={set("emergency_contact_name")} />
                    <Input label="Contact Phone" placeholder="e.g. 08098765432"  type="tel" value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} />
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4 ── */}
            {step === 4 && (
              <div style={{ padding: "20px 24px" }}>
                {[
                  { title: "Personal",  icon: <User size={12} />,       rows: [["Name", form.full_name], ["Gender", form.gender], ["Phone", form.phone || "Not provided"], ["Email", form.email || "—"], ["Address", form.address || "—"]] },
                  { title: "Services",  icon: <Stethoscope size={12} />, rows: [["Departments", form.departments.join(", ") || "—"], ["Reason", form.complaint]] },
                  { title: "Medical",   icon: <Heart size={12} />,       rows: [["Blood Group", form.blood_group || "—"], ["Genotype", form.genotype || "—"], ["Allergies", form.allergies || "None stated"], ["Emergency", form.emergency_contact_name ? `${form.emergency_contact_name} · ${form.emergency_contact_phone}` : "—"]] },
                ].map((section) => (
                  <div key={section.title} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ color: "#0d9488" }}>{section.icon}</span>
                      <p style={{ fontSize: 10, fontWeight: 800, color: "#0d9488", textTransform: "uppercase", letterSpacing: "0.08em" }}>{section.title}</p>
                    </div>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                      {section.rows.map(([label, val]) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "10px 14px", borderBottom: "1px solid #f1f5f9" }}>
                          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600, flexShrink: 0 }}>{label}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", textAlign: "right", maxWidth: "60%", lineHeight: 1.4 }}>{val || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10 }}>
                  <Shield size={13} color="#0d9488" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12, color: "#0f766e", lineHeight: 1.5 }}>
                    Your information is stored securely and only used by {hospital.name} staff for your care.
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ margin: "0 24px 8px", padding: "11px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, display: "flex", gap: 10 }}>
                <AlertTriangle size={13} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: "#991b1b", fontWeight: 600 }}>{error}</p>
              </div>
            )}

            {/* Navigation */}
            <div style={{ padding: "12px 24px 24px", display: "flex", gap: 10 }}>
              {step > 1 && (
                <button onClick={back}
                  style={{ width: 44, height: 44, borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", flexShrink: 0 }}>
                  <ChevronLeft size={16} />
                </button>
              )}
              <button
                onClick={step < 4 ? next : handleSubmit}
                disabled={saving}
                style={{ flex: 1, height: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1, boxShadow: "0 4px 12px rgba(13,148,136,0.3)", transition: "opacity 0.15s" }}>
                {saving
                  ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Submitting…</>
                  : step < 4
                  ? <>{step === 3 ? "Review Details" : "Continue"}<ChevronRight size={14} /></>
                  : <><CheckCircle size={14} />Submit to Hospital</>
                }
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
              {hospital.name} · {hospital.address}
            </p>
            <p style={{ fontSize: 11, color: "#cbd5e1", marginTop: 3 }}>
              📞 {hospital.phone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}