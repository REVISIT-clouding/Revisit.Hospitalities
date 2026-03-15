"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Loader2,
  CheckCircle,
  ArrowRight,
  Building2,
  User,
  Lock,
} from "lucide-react";

const inputCls = {
  width: "100%",
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "11px 14px",
  fontSize: 14,
  color: "#0f172a",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};
const labelCls = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
};

function Field({ label, children }) {
  return (
    <div>
      <label style={labelCls}>{label}</label>
      {children}
    </div>
  );
}

const STEPS = [
  { n: 1, label: "Hospital", icon: <Building2 size={14} /> },
  { n: 2, label: "Admin", icon: <User size={14} /> },
  { n: 3, label: "Done", icon: <CheckCircle size={14} /> },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [slug, setSlug] = useState("");

  const [form, setForm] = useState({
    hospitalName: "",
    hospitalEmail: "",
    address: "",
    phone: "",
    slug: "",
    adminName: "",
    email: "",
    password: "",
    confirm: "",
  });

  const set = (key) => (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
    if (key === "hospitalName") {
      setForm((f) => ({
        ...f,
        hospitalName: val,
        slug: val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-"),
      }));
    }
    setError("");
  };

  function validate() {
    if (step === 1) {
      if (!form.hospitalName.trim()) return "Hospital name is required.";
      if (!form.slug.trim()) return "Slug is required.";
      if (!form.phone.trim()) return "Phone number is required.";
    }
    if (step === 2) {
      if (!form.adminName.trim()) return "Admin name is required.";
      if (!form.email.trim()) return "Email is required.";
      if (!form.password.trim()) return "Password is required.";
      if (form.password.length < 6)
        return "Password must be at least 6 characters.";
      if (form.password !== form.confirm) return "Passwords do not match.";
    }
    return null;
  }

  async function handleSubmit() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError("");
    console.log("SUBMITTING:", form); // ← add this

    const res = await fetch("/api/auth/register-hospital", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hospitalName: form.hospitalName,
        address: form.address,
        phone: form.phone,
        hospitalEmail: form.hospitalEmail,
        slug: form.slug,
        adminName: form.adminName,
        email: form.email,
        password: form.password,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Registration failed. Try a different slug.");
      setSaving(false);
      return;
    }

    setSlug(data.slug);
    setSaving(false);
    setStep(3);
  }

  function next() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .card { animation: fadeUp 0.3s ease-out both; }
        input:focus { border-color: #0d9488 !important; box-shadow: 0 0 0 3px rgba(13,148,136,0.1); }
      `}</style>

      {/* Nav */}
      <nav
        style={{
          padding: "0 24px",
          borderBottom: "1px solid #e2e8f0",
          background: "white",
        }}
      >
        <div
          style={{
            maxWidth: 500,
            margin: "0 auto",
            height: 60,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: "#0d9488",
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            onClick={() => router.push("/")}
          >
            <Activity size={16} color="#fff" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
            Revisit
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#0d9488",
              background: "#f0fdfa",
              border: "1px solid #99f6e4",
              padding: "2px 8px",
              borderRadius: 20,
              textTransform: "uppercase",
            }}
          >
            HMS
          </span>
        </div>
      </nav>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 480 }}>
          {/* Step indicator */}
          {step < 3 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 32,
                gap: 0,
              }}
            >
              {STEPS.slice(0, 2).map((s, idx) => (
                <div
                  key={s.n}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                        border: `2px solid ${step > s.n ? "#0d9488" : step === s.n ? "#0d9488" : "#e2e8f0"}`,
                        background:
                          step > s.n
                            ? "#0d9488"
                            : step === s.n
                              ? "#f0fdfa"
                              : "#fff",
                        color:
                          step > s.n
                            ? "#fff"
                            : step === s.n
                              ? "#0d9488"
                              : "#94a3b8",
                      }}
                    >
                      {step > s.n ? <CheckCircle size={14} /> : s.icon}
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color:
                          step === s.n
                            ? "#0d9488"
                            : step > s.n
                              ? "#0d9488"
                              : "#cbd5e1",
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < 1 && (
                    <div
                      style={{
                        width: 48,
                        height: 2,
                        background: step > s.n ? "#0d9488" : "#e2e8f0",
                        margin: "0 6px 18px",
                        borderRadius: 2,
                        transition: "background 0.3s",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Card */}
          <div
            className="card"
            style={{
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            }}
          >
            {/* ── STEP 1: Hospital Details ── */}
            {step === 1 && (
              <>
                <div
                  style={{
                    padding: "24px 28px 20px",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      background: "#f0fdfa",
                      border: "1px solid #99f6e4",
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                    }}
                  >
                    <Building2 size={18} color="#0d9488" />
                  </div>
                  <h1
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      color: "#0f172a",
                      letterSpacing: "-0.4px",
                    }}
                  >
                    Register your hospital
                  </h1>
                  <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>
                    Set up your Revisit account in under 2 minutes.
                  </p>
                </div>

                <div
                  style={{
                    padding: "24px 28px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  <Field label="Hospital Name *">
                    <input
                      value={form.hospitalName}
                      onChange={set("hospitalName")}
                      placeholder="e.g. Enoma Medical Center"
                      style={inputCls}
                    />
                  </Field>

                  <Field label="URL Slug *">
                    <div style={{ position: "relative" }}>
                      <div
                        style={{
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: 13,
                          color: "#94a3b8",
                          fontWeight: 600,
                          pointerEvents: "none",
                        }}
                      >
                        revisit.ng/
                      </div>
                      <input
                        value={form.slug}
                        onChange={(e) => {
                          const val = e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, "");
                          setForm((f) => ({ ...f, slug: val }));
                        }}
                        placeholder="enoma"
                        style={{ ...inputCls, paddingLeft: 82 }}
                      />
                    </div>
                    {form.slug && (
                      <p
                        style={{
                          fontSize: 11,
                          color: "#0d9488",
                          marginTop: 4,
                          fontWeight: 600,
                        }}
                      >
                        Your dashboard: revisit.ng/{form.slug}/patients
                      </p>
                    )}
                  </Field>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <Field label="Phone">
                      <input
                        value={form.phone}
                        onChange={set("phone")}
                        placeholder="08012345678"
                        style={inputCls}
                      />
                    </Field>
                    <Field label="Address">
                      <input
                        value={form.address}
                        onChange={set("address")}
                        placeholder="Ikpoba Hill, Benin City"
                        style={inputCls}
                      />
                    </Field>
                    <Field label="Hospital Email">
                      <input
                        type="email"
                        value={form.hospitalEmail}
                        onChange={set("hospitalEmail")}
                        placeholder="info@hospital.com"
                        style={inputCls}
                      />
                    </Field>
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 2: Admin Account ── */}
            {step === 2 && (
              <>
                <div
                  style={{
                    padding: "24px 28px 20px",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      background: "#f0fdfa",
                      border: "1px solid #99f6e4",
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                    }}
                  >
                    <Lock size={18} color="#0d9488" />
                  </div>
                  <h1
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      color: "#0f172a",
                      letterSpacing: "-0.4px",
                    }}
                  >
                    Create admin account
                  </h1>
                  <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>
                    This will be the main login for{" "}
                    <strong style={{ color: "#0f172a" }}>
                      {form.hospitalName}
                    </strong>
                    .
                  </p>
                </div>

                <div
                  style={{
                    padding: "24px 28px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  <Field label="Your Full Name *">
                    <input
                      value={form.adminName}
                      onChange={set("adminName")}
                      placeholder="e.g. Dr. Iyamu"
                      style={inputCls}
                    />
                  </Field>
                  <Field label="Email Address *">
                    <input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      placeholder="admin@hospital.com"
                      style={inputCls}
                    />
                  </Field>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <Field label="Password *">
                      <input
                        type="password"
                        value={form.password}
                        onChange={set("password")}
                        placeholder="Min 6 characters"
                        style={inputCls}
                      />
                    </Field>
                    <Field label="Confirm Password *">
                      <input
                        type="password"
                        value={form.confirm}
                        onChange={set("confirm")}
                        placeholder="Repeat password"
                        style={inputCls}
                      />
                    </Field>
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 3: Success ── */}
            {step === 3 && (
              <div style={{ padding: "40px 28px", textAlign: "center" }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    background: "#0d9488",
                    borderRadius: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                    boxShadow: "0 8px 24px rgba(13,148,136,0.3)",
                  }}
                >
                  <CheckCircle size={32} color="#fff" />
                </div>
                <h2
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    color: "#0f172a",
                    marginBottom: 10,
                    letterSpacing: "-0.4px",
                  }}
                >
                  You're all set!
                </h2>
                <p
                  style={{
                    fontSize: 14,
                    color: "#64748b",
                    lineHeight: 1.7,
                    marginBottom: 24,
                  }}
                >
                  <strong style={{ color: "#0f172a" }}>
                    {form.hospitalName}
                  </strong>{" "}
                  is registered. Your system is live and ready to use.
                </p>

                <div
                  style={{
                    background: "#f0fdfa",
                    border: "1px solid #99f6e4",
                    borderRadius: 12,
                    padding: "16px 20px",
                    marginBottom: 24,
                    textAlign: "left",
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#0f766e",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 10,
                    }}
                  >
                    Your links
                  </p>
                  {[
                    { label: "Staff Dashboard", path: `/${slug}/patients` },
                    { label: "Patient Intake", path: `/${slug}/intake` },
                  ].map((l) => (
                    <div
                      key={l.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 0",
                        borderBottom: "1px solid #d1fae5",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          color: "#0f766e",
                          fontWeight: 600,
                        }}
                      >
                        {l.label}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#0d9488",
                          fontFamily: "monospace",
                          fontWeight: 700,
                        }}
                      >
                        revisit.ng{l.path}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => router.push("/login")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "14px 28px",
                    background: "#0d9488",
                    color: "white",
                    border: "none",
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(13,148,136,0.3)",
                    width: "100%",
                    justifyContent: "center",
                  }}
                >
                  Go to Dashboard <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                style={{
                  margin: "0 28px 8px",
                  padding: "10px 14px",
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                  borderRadius: 10,
                }}
              >
                <p style={{ fontSize: 12, color: "#991b1b", fontWeight: 600 }}>
                  {error}
                </p>
              </div>
            )}

            {/* Footer buttons */}
            {step < 3 && (
              <div style={{ padding: "0 28px 24px", display: "flex", gap: 10 }}>
                {step > 1 && (
                  <button
                    onClick={() => {
                      setStep((s) => s - 1);
                      setError("");
                    }}
                    style={{
                      padding: "12px 20px",
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#64748b",
                      cursor: "pointer",
                    }}
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={step === 2 ? handleSubmit : next}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "#0d9488",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    opacity: saving ? 0.7 : 1,
                    boxShadow: "0 4px 14px rgba(13,148,136,0.3)",
                  }}
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={14}
                        style={{ animation: "spin 1s linear infinite" }}
                      />{" "}
                      Creating account…
                    </>
                  ) : step === 2 ? (
                    <>
                      <CheckCircle size={14} /> Create Account
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Sign in link */}
          {step < 3 && (
            <p
              style={{
                textAlign: "center",
                marginTop: 20,
                fontSize: 13,
                color: "#94a3b8",
              }}
            >
              Already have an account?{" "}
              <span
                onClick={() => router.push("/login")}
                style={{ color: "#0d9488", fontWeight: 700, cursor: "pointer" }}
              >
                Sign in
              </span>
            </p>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
