"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  
  async function handleLogin() {
    if (!form.email || !form.password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Login failed");
      setLoading(false);
      return;
    }

    // Save token as cookie
    document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 8}`;

    // Save hospital info to localStorage for UI use
    localStorage.setItem("hospital", JSON.stringify(data.hospital));
    localStorage.setItem("user", JSON.stringify(data.user));

    // Redirect to their hospital dashboard
window.location.href = `/${data.hospital.slug}/patients`;  }

  return (
    <div
      className="min-h-screen bg-slate-50 flex items-center justify-center p-4"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Activity size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Revisit</h1>
          <p className="text-sm text-slate-400 mt-1">
            Hospital Management System
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-1">
            Welcome back
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Sign in to your hospital account
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLogin();
                }}
                placeholder="admin@hospital.com"
                className="w-full text-gray-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLogin();
                }}
                placeholder="••••••••"
                className="w-full bg-white text-gray-700 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition"
              />
            </div>

            {error && (
              <p className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-black text-sm py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </div>
          
        </div>
        <button
            onClick={() => router.push("/register")}
            className="btn-primary border-b text-gray-700 text-xs m-5 "
            style={{ cursor: "pointer" }}
          >
            Don't have an account? Register
          </button>

        <p className="text-center text-xs text-slate-400 mt-6">
          Revisit HMS · Secure Hospital Management
        </p>
      </div>
    </div>
  );
}
