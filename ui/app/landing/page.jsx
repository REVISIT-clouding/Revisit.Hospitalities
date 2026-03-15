"use client";
import { useRouter } from "next/navigation";
import { Activity, Users, RefreshCw, Printer, Shield, ArrowRight, CheckCircle } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  const features = [
    { icon: <Users size={20} />,     title: "Patient Records",      desc: "Register patients once. Every visit, every history, every detail — in one place." },
    { icon: <RefreshCw size={20} />, title: "Recurring Visits",     desc: "System recognizes returning patients instantly. See full visit history before they sit down." },
    { icon: <Printer size={20} />,   title: "Print Summaries",      desc: "Generate clean patient summaries with one click. Ready for referrals or records." },
    { icon: <Shield size={20} />,    title: "Secure & Private",     desc: "Each hospital's data is completely isolated. Your patients are yours alone." },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-1 { animation: fadeUp 0.5s ease-out 0.1s both; }
        .fade-2 { animation: fadeUp 0.5s ease-out 0.25s both; }
        .fade-3 { animation: fadeUp 0.5s ease-out 0.4s both; }
        .fade-4 { animation: fadeUp 0.5s ease-out 0.55s both; }
        .btn-primary:hover { background: #0f766e !important; transform: translateY(-1px); }
        .btn-ghost:hover { background: #f1f5f9 !important; }
        .feature-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(13,148,136,0.08) !important; }
        .feature-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
      `}</style>

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(248,250,252,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, background: "#0d9488", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Activity size={18} color="#fff" />
            </div>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Revisit</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#0d9488", background: "#f0fdfa", border: "1px solid #99f6e4", padding: "2px 8px", borderRadius: 20, letterSpacing: "0.05em", textTransform: "uppercase" }}>HMS</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => router.push("/login")}
              className="btn-ghost"
              style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer", transition: "all 0.15s" }}>
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px 60px", textAlign: "center" }}>
        <div className="fade-1" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 20, padding: "6px 14px", marginBottom: 28 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0d9488" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#0f766e", textTransform: "uppercase", letterSpacing: "0.08em" }}>Now Live in Benin City</span>
        </div>

        <h1 className="fade-2" style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 900, color: "#0f172a", lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 20 }}>
          Patient management<br />
          <span style={{ color: "#0d9488" }}>built for your hospital.</span>
        </h1>

        <p className="fade-3" style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#64748b", maxWidth: 520, margin: "0 auto 36px", lineHeight: 1.7 }}>
          Register patients, track every visit, and know when they return —
          without paperwork. Built for clinics and hospitals across Nigeria.
        </p>

        <div className="fade-4" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => router.push("/login")}
            className="btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", background: "#0d9488", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 20px rgba(13,148,136,0.3)" }}>
            Get Started Free <ArrowRight size={16} />
          </button>
          <button
            onClick={() => router.push("/enoma/intake")}
            className="btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", background: "white", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
            See Demo
          </button>
        </div>
      </section>

      {/* Dashboard preview */}
      <section style={{ maxWidth: 900, margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 60px rgba(15,23,42,0.08)" }}>
          {/* Fake browser bar */}
          <div style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", gap: 5 }}>
              {["#fca5a5","#fde68a","#86efac"].map((c, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              ))}
            </div>
            <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 6, height: 24, maxWidth: 260, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>revisit.ng/enoma/patients</span>
            </div>
          </div>

          {/* Dashboard mockup */}
          <div style={{ display: "flex", minHeight: 300 }}>
            {/* Sidebar */}
            <div style={{ width: 180, background: "white", borderRight: "1px solid #f1f5f9", padding: "16px 8px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, background: "#0d9488", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Activity size={14} color="#fff" />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: "#0f172a" }}>Enoma</p>
                  <p style={{ fontSize: 9, color: "#0d9488", fontWeight: 700, textTransform: "uppercase" }}>Medical Center</p>
                </div>
              </div>
              {["Dashboard","Patients","Appointments","Visit Records","Laboratory","Pharmacy"].map((item, i) => (
                <div key={item} style={{ padding: "7px 10px", borderRadius: 7, marginBottom: 2, background: i === 1 ? "#f0fdfa" : "transparent", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: i === 1 ? "#0d9488" : "#cbd5e1" }} />
                  <span style={{ fontSize: 12, fontWeight: i === 1 ? 700 : 500, color: i === 1 ? "#0f766e" : "#64748b" }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Main */}
            <div style={{ flex: 1, padding: "16px 20px", background: "#f8fafc" }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>Patient Registry</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "Total Patients", value: "247", color: "#0d9488" },
                  { label: "Today",          value: "12",  color: "#3b82f6" },
                  { label: "OPD Visits",     value: "89",  color: "#8b5cf6" },
                  { label: "IPD",            value: "4",   color: "#f59e0b" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "white", border: "1px solid #e2e8f0", borderLeft: `3px solid ${s.color}`, borderRadius: 8, padding: "8px 10px" }}>
                    <p style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{s.label}</p>
                    <p style={{ fontSize: 20, fontWeight: 900, color: "#0f172a" }}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>247 patients</span>
                </div>
                {[
                  { name: "Chioma Okafor",  id: "EMC-001", age: "34y", blood: "O+", dept: "Maternity" },
                  { name: "Emeka Adeyemi",  id: "EMC-002", age: "52y", blood: "A+", dept: "Cardiology" },
                  { name: "Funke Balogun",  id: "EMC-003", age: "28y", blood: "B+", dept: "General" },
                ].map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #f8fafc", gap: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, background: "#f0fdfa", border: "1px solid #99f6e4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#0f766e", flexShrink: 0 }}>
                      {p.name.split(" ").map(w => w[0]).join("")}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", flex: 1 }}>{p.name}</span>
                    <span style={{ fontSize: 10, color: "#0d9488", fontFamily: "monospace", fontWeight: 700 }}>{p.id}</span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{p.age}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "2px 6px", borderRadius: 4 }}>{p.blood}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, background: "#f0fdfa", border: "1px solid #99f6e4", color: "#0f766e", padding: "2px 6px", borderRadius: 4 }}>{p.dept}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1100, margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.8px", marginBottom: 12 }}>
            Everything your clinic needs
          </h2>
          <p style={{ fontSize: 16, color: "#64748b", maxWidth: 440, margin: "0 auto" }}>
            From patient intake to visit records — one system handles it all.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {features.map((f) => (
            <div key={f.title} className="feature-card" style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px" }}>
              <div style={{ width: 44, height: 44, background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#0d9488", marginBottom: 16 }}>
                {f.icon}
              </div>
              <p style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{f.title}</p>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: "white", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", padding: "60px 24px", marginBottom: 80 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 900, color: "#0f172a", textAlign: "center", marginBottom: 48, letterSpacing: "-0.5px" }}>
            Up and running in 2 days
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 0 }}>
            {[
              { step: "01", title: "We set it up",      desc: "We configure the system with your hospital's name, departments, and staff." },
              { step: "02", title: "Staff gets trained", desc: "One session with your reception team. Most are confident within an hour." },
              { step: "03", title: "Go live",            desc: "Start registering patients the same day. Free for the first month." },
            ].map((s, i) => (
              <div key={s.step} style={{ padding: "24px", borderRight: i < 2 ? "1px solid #e2e8f0" : "none", position: "relative" }}>
                <p style={{ fontSize: 36, fontWeight: 900, color: "#e2e8f0", letterSpacing: "-1px", marginBottom: 12 }}>{s.step}</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{s.title}</p>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proof */}
      <section style={{ maxWidth: 700, margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 20, padding: "32px 36px" }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ width: 16, height: 16, background: "#0d9488", borderRadius: 2, clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" }} />
            ))}
          </div>
          <p style={{ fontSize: 17, color: "#0f172a", lineHeight: 1.7, fontWeight: 500, marginBottom: 20, fontStyle: "italic" }}>
            "I've been building a software system that helps hospitals manage their patients —
            registration, records, tracking who comes back for visits. I already built it and
            set it up specifically for Enoma Medical Center with their name on it."
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: "#0d9488", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white" }}>U</div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Unique</p>
              <p style={{ fontSize: 12, color: "#0f766e", fontWeight: 600 }}>Founder, Revisit HMS · Benin City</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 600, margin: "0 auto 100px", padding: "0 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 900, color: "#0f172a", letterSpacing: "-1px", marginBottom: 16 }}>
          Ready to get started?
        </h2>
        <p style={{ fontSize: 16, color: "#64748b", marginBottom: 32, lineHeight: 1.7 }}>
          First month is completely free. No setup fee. We come to you.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
          {["Free first month", "Personal setup support", "Your data stays yours"].map((item) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle size={14} color="#0d9488" />
              <span style={{ fontSize: 14, color: "#475569", fontWeight: 500 }}>{item}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => router.push("/login")}
          className="btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 36px", background: "#0d9488", color: "white", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 24px rgba(13,148,136,0.35)" }}>
          Get Started Free <ArrowRight size={16} />
        </button>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #e2e8f0", padding: "24px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, background: "#0d9488", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={13} color="#fff" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Revisit HMS</span>
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8" }}>© 2026 Revisit · Built in Benin City, Nigeria</p>
      </footer>
    </div>
  );
}