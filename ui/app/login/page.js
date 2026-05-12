"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Loader2 } from "lucide-react";
import supabase from "@/lib/supabase";

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

    // 1. Sign in via Supabase Auth
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 2. Fetch user row + hospital from public.users
    //    (RLS allows this because auth.uid() === data.user.id after sign-in)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, hospital_id, hospitals(slug, name)")
      .eq("id", data.user.id)
      .single();

    if (userError || !userData?.hospitals) {
      setError("Account setup incomplete. Contact support.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // 3. Redirect to their hospital dashboard
    const { slug } = userData.hospitals;
    router.push(`/${slug}/patients_dashboard`);
  }

  return (
    <div
      className="min-h-screen bg-slate-50 flex items-center justify-center p-4"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Activity size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Revisit</h1>
          <p className="text-sm text-slate-400 mt-1">Hospital Management System</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-1">Welcome back</h2>
          <p className="text-xs text-slate-400 mb-6">Sign in to your hospital account</p>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
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
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
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
                <><Loader2 size={14} className="animate-spin" /> Signing in…</>
              ) : (
                "Sign In"
              )}
            </button>
          </div>
        </div>

        <button
          onClick={() => router.push("/register")}
          className="w-full text-center text-gray-700 text-xs mt-5 hover:underline cursor-pointer"
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