"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  app/auth/set-password/page.js
//
//  Staff land here after clicking the invite link in their email.
//
//  What happens automatically when they arrive:
//    1. Supabase reads the token from the URL (it's in the #hash fragment)
//    2. Exchanges it for a live session — the user is now "logged in"
//       but only temporarily until they set a real password
//    3. We read their name from the session's user_metadata to greet them
//    4. They type + confirm a password and hit "Set my password"
//    5. We call supabase.auth.updateUser({ password }) to save it
//    6. Redirect them to the main dashboard
//
//  If they visit this page without a valid invite token (e.g. directly),
//  we show a friendly "invalid link" message.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabase";

export default function SetPasswordPage() {
  const router = useRouter();

  const [name,        setName]        = useState("");   // from invite metadata
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [status,      setStatus]      = useState("loading"); // loading | ready | saving | done | invalid
  const [error,       setError]       = useState("");
  const [showPwd,     setShowPwd]     = useState(false);

  // ── On mount: let Supabase exchange the token from the URL ──
  useEffect(() => {
    async function init() {
      // onAuthStateChange fires with event "PASSWORD_RECOVERY" or "SIGNED_IN"
      // when Supabase processes the invite token in the URL hash.
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") {
            // Read the name we stored in user_metadata when sending the invite
            const displayName = session?.user?.user_metadata?.name || "";
            setName(displayName);
            setStatus("ready");
            subscription.unsubscribe(); // only need this once
          }
        }
      );

      // If the page was visited without a valid token, the event never fires.
      // Show "invalid link" after 4 seconds.
      const timeout = setTimeout(() => {
        setStatus(s => s === "loading" ? "invalid" : s);
        subscription.unsubscribe();
      }, 4000);

      return () => {
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    }
    init();
  }, []);

  // ── Save the password ────────────────────────────────────────
  async function handleSubmit() {
    setError("");

    if (!password)           return setError("Please enter a password.");
    if (password.length < 8) return setError("Password must be at least 8 characters long.");
    if (password !== confirm) return setError("The two passwords don't match. Please try again.");

    setStatus("saving");

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setStatus("ready");
      return;
    }

    setStatus("done");
    // Give them a moment to see the success message, then go to the app
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  // ─────────────────────────────────────────────────────────────
  //  Shared styles
  // ─────────────────────────────────────────────────────────────
  const inputStyle = {
    width: "100%", padding: "11px 14px", fontSize: 14,
    border: "1px solid #e2e8f0", borderRadius: 10,
    background: "#fff", color: "#1e293b", outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
    transition: "border-color 0.15s",
  };

  const btnStyle = {
    width: "100%", padding: "12px", fontSize: 14, fontWeight: 600,
    borderRadius: 10, border: "none", cursor: "pointer",
    background: "#4f46e5", color: "#fff", transition: "opacity 0.15s",
  };

  // ─────────────────────────────────────────────────────────────
  //  States
  // ─────────────────────────────────────────────────────────────

  // 1. Processing the invite token
  if (status === "loading") {
    return (
      <Screen>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#1e293b" }}>Verifying your invite link…</div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>This only takes a second.</div>
        </div>
      </Screen>
    );
  }

  // 2. Invalid / expired link
  if (status === "invalid") {
    return (
      <Screen>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>
            This invite link isn't valid
          </div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, marginBottom: 20 }}>
            The link may have expired or already been used.<br />
            Ask your administrator to send a new invite.
          </div>
          <button
            onClick={() => router.push("/login")}
            style={{ ...btnStyle, width: "auto", padding: "10px 24px" }}
          >
            Go to login
          </button>
        </div>
      </Screen>
    );
  }

  // 3. Password saved successfully
  if (status === "done") {
    return (
      <Screen>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>
            Password set! Welcome aboard.
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>Taking you to the dashboard…</div>
        </div>
      </Screen>
    );
  }

  // 4. The main form
  return (
    <Screen>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🏥</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b" }}>
          {name ? `Welcome, ${name.split(" ")[0]}!` : "Welcome!"}
        </div>
        <div style={{ fontSize: 14, color: "#64748b", marginTop: 6, lineHeight: 1.6 }}>
          You've been invited to join the system.<br />
          Choose a password to activate your account.
        </div>
      </div>

      {/* Password field */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
          New password
        </label>
        <div style={{ position: "relative" }}>
          <input
            type={showPwd ? "text" : "password"}
            placeholder="At least 8 characters"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = "#6366f1"}
            onBlur={e => e.target.style.borderColor = "#e2e8f0"}
            autoFocus
          />
          {/* Show / hide toggle */}
          <button
            onClick={() => setShowPwd(s => !s)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#94a3b8" }}
          >
            {showPwd ? "🙈" : "👁️"}
          </button>
        </div>

        {/* Strength hints */}
        {password.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {[
              { label: "8+ chars",     ok: password.length >= 8 },
              { label: "Uppercase",    ok: /[A-Z]/.test(password) },
              { label: "Number",       ok: /\d/.test(password) },
            ].map(({ label, ok }) => (
              <span key={label} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: ok ? "#dcfce7" : "#f1f5f9", color: ok ? "#15803d" : "#94a3b8", fontWeight: 500 }}>
                {ok ? "✓" : "·"} {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Confirm password field */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
          Confirm password
        </label>
        <input
          type={showPwd ? "text" : "password"}
          placeholder="Type it again"
          value={confirm}
          onChange={e => { setConfirm(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          style={{
            ...inputStyle,
            borderColor: confirm && confirm !== password ? "#fca5a5" : "#e2e8f0",
          }}
          onFocus={e => e.target.style.borderColor = confirm && confirm !== password ? "#fca5a5" : "#6366f1"}
          onBlur={e => e.target.style.borderColor = confirm && confirm !== password ? "#fca5a5" : "#e2e8f0"}
        />
        {confirm && confirm !== password && (
          <div style={{ fontSize: 12, color: "#ef4444", marginTop: 5 }}>Passwords don't match yet</div>
        )}
        {confirm && confirm === password && password.length >= 8 && (
          <div style={{ fontSize: 12, color: "#16a34a", marginTop: 5 }}>✓ Passwords match</div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 10, fontSize: 13, color: "#b91c1c" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={status === "saving"}
        style={{ ...btnStyle, opacity: status === "saving" ? 0.7 : 1, cursor: status === "saving" ? "not-allowed" : "pointer" }}
      >
        {status === "saving" ? "Setting your password…" : "Set my password & sign in →"}
      </button>

      <div style={{ marginTop: 16, fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
        Already have an account?{" "}
        <button onClick={() => router.push("/login")} style={{ background: "none", border: "none", color: "#4f46e5", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
          Log in instead
        </button>
      </div>
    </Screen>
  );
}

// ── Centred wrapper used by all states ───────────────────────
function Screen({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "36px 32px", width: "100%", maxWidth: 420, boxShadow: "0 8px 40px rgba(99,102,241,0.1), 0 1px 3px rgba(0,0,0,0.05)" }}>
        {children}
      </div>
    </div>
  );
}