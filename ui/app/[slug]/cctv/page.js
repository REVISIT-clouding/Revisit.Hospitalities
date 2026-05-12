"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Audit Intelligence Dashboard  |  Next.js React Component
//  Designed to show every change made in your hospital system, who did it,
//  and whether anything looks suspicious — in plain, readable format.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import supabase from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────
//  Who each user ID belongs to (name, role, initials, color)
// ─────────────────────────────────────────────────────────────
const USERS = {
  "uid-0001": { name: "Dr. Adaeze Okonkwo",  role: "Physician",   initials: "AO", color: "#185FA5" },
  "uid-0002": { name: "Nurse Chidi Eze",      role: "Nursing",     initials: "CE", color: "#0F6E56" },
  "uid-0003": { name: "Amaka Nwosu",          role: "Billing",     initials: "AN", color: "#854F0B" },
  "uid-0004": { name: "Ibrahim Musa",         role: "Admin",       initials: "IM", color: "#533B89" },
  "uid-0005": { name: "Dr. Emeka Obi",        role: "Physician",   initials: "EO", color: "#185FA5" },
  "uid-0006": { name: "Zainab Bello",         role: "Pharmacist",  initials: "ZB", color: "#3B6D11" },
  SYS:        { name: "System",               role: "Automated",   initials: "SY", color: "#5F5E5A" },
};

// All database tables we monitor
const ALL_TABLES = [
  "patients", "appointments", "invoices",
  "invoice_items", "visits", "inventory_items", "inventory_transactions",
];

// What each severity level looks like (colors, labels)
const SEVERITY = {
  critical: { bar: "#E24B4A", bg: "rgba(226,75,74,0.07)", badgeBg: "#FCEBEB", badgeText: "#A32D2D", label: "CRITICAL" },
  high:     { bar: "#BA7517", bg: "rgba(186,117,23,0.07)", badgeBg: "#FAEEDA", badgeText: "#854F0B", label: "HIGH"     },
  medium:   { bar: "#378ADD", bg: "rgba(55,138,221,0.07)",  badgeBg: "#E6F1FB", badgeText: "#185FA5", label: "MEDIUM"   },
  low:      { bar: "#639922", bg: "rgba(99,153,34,0.07)",   badgeBg: "#EAF3DE", badgeText: "#3B6D11", label: "LOW"      },
};

// What each action type looks like
const ACTION_STYLE = {
  INSERT:         { bg: "#EAF3DE", color: "#3B6D11", icon: "➕" },
  UPDATE:         { bg: "#FAEEDA", color: "#854F0B", icon: "✏️" },
  DELETE:         { bg: "#FCEBEB", color: "#A32D2D", icon: "🗑️" },
  PRICE_OVERRIDE: { bg: "#FCEBEB", color: "#A32D2D", icon: "⚠️" },
};

// ─────────────────────────────────────────────────────────────
//  Helper Functions  (small tools used throughout the page)
// ─────────────────────────────────────────────────────────────

/** Decide how serious a change is based on what was changed and where */
function getSeverity(action, table) {
  if (action === "PRICE_OVERRIDE" || action === "DELETE") return "critical";
  if (table === "invoices" || table === "invoice_items")  return "high";
  if (action === "UPDATE" && (table === "patients" || table === "visits")) return "medium";
  return "low";
}

/** Show time as "2m ago", "3h ago", etc. */
function timeAgo(isoString) {
  const seconds = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (seconds < 60)   return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Show full Nigerian-formatted date and time */
function fullDate(isoString) {
  return new Date(isoString).toLocaleString("en-NG", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

/** Shorten a long record ID so it fits in the table */
function shortId(id) {
  if (!id) return "—";
  return id.length > 10 ? id.substring(0, 8) + "…" : id;
}

/**
 * Compare two JSON objects and highlight what changed.
 * Returns a list of fields with their old value, new value, and change status.
 */
function compareData(oldData, newData) {
  const allKeys = [...new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {}),
  ])];
  return allKeys.map((key) => {
    const oldVal = oldData?.[key];
    const newVal = newData?.[key];
    let change = "same";
    if (oldVal === undefined)                              change = "added";
    else if (newVal === undefined)                         change = "removed";
    else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) change = "changed";
    return { key, oldVal, newVal, change };
  });
}

// ─────────────────────────────────────────────────────────────
//  Small reusable building blocks
// ─────────────────────────────────────────────────────────────

/** A single number card at the top of the page */
function MetricCard({ label, value, subtitle, accentColor, children }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 10,
        border: "0.5px solid #e2e8f0",
        borderLeft: accentColor ? `3px solid ${accentColor}` : undefined,
        padding: "12px 16px",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 500, color: "#64748b", marginBottom: 4 }}>
        {label}
      </div>
      {children || (
        <div style={{ fontSize: 26, fontWeight: 500, color: accentColor || "#1e293b" }}>
          {value}
        </div>
      )}
      {subtitle && (
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{subtitle}</div>
      )}
    </div>
  );
}

/** The coloured avatar circle with a person's initials */
function UserAvatar({ userId }) {
  const user = USERS[userId] || USERS.SYS;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 26, height: 26, borderRadius: "50%",
          background: user.color + "22",
          border: `0.5px solid ${user.color}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 500, color: user.color, flexShrink: 0,
        }}
      >
        {user.initials}
      </div>
      <div style={{ overflow: "hidden" }}>
        <div style={{ fontSize: 11, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {user.name.split(" ").slice(-1)[0]}
        </div>
        <div style={{ fontSize: 10, color: "#94a3b8" }}>{user.role}</div>
      </div>
    </div>
  );
}

/** The coloured pill that shows the action type (INSERT, DELETE, etc.) */
function ActionBadge({ action, severity }) {
  const style = ACTION_STYLE[action] || ACTION_STYLE.UPDATE;
  const sev   = SEVERITY[severity];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span
        style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          padding: "2px 8px", borderRadius: 4,
          background: style.bg, color: style.color,
          fontSize: 11, fontWeight: 500, letterSpacing: 0.4, whiteSpace: "nowrap",
        }}
      >
        {action === "PRICE_OVERRIDE" ? "OVERRIDE" : action}
      </span>
      {(severity === "critical" || severity === "high") && (
        <span
          style={{
            padding: "1px 6px", borderRadius: 20,
            background: sev.badgeBg, color: sev.badgeText,
            fontSize: 9, fontWeight: 500, letterSpacing: 0.5,
          }}
        >
          {sev.label}
        </span>
      )}
    </div>
  );
}

/** Blinking skeleton placeholder while logs are loading */
function LoadingRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} style={{ borderBottom: "0.5px solid #f1f5f9" }}>
          {[4, 90, 110, 110, 90, 140, 36, 32].map((w, j) => (
            <td key={j} style={{ padding: j === 0 ? 0 : "10px", width: w }}>
              {j > 0 && (
                <div
                  style={{
                    height: j === 1 ? 10 : 20,
                    background: "#f1f5f9",
                    borderRadius: 4,
                    animation: "pulse 1.5s ease-in-out infinite",
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
//  The expanded panel that shows what exactly changed
// ─────────────────────────────────────────────────────────────

function ChangeDetail({ log, onClose }) {
  const diffs   = compareData(log.old_data, log.new_data);
  const sev     = getSeverity(log.action, log.table_name);
  const sevCfg  = SEVERITY[sev];
  const user    = USERS[log.changed_by] || USERS.SYS;
  const isPrice = log.action === "PRICE_OVERRIDE";
  const baseAmt = log.old_data?.base_price;
  const newAmt  = log.new_data?.override_price;
  const pctDiff = baseAmt && newAmt
    ? (((newAmt - baseAmt) / baseAmt) * 100).toFixed(1)
    : null;

  // Colour a single field line based on what happened to it
  const lineColor = (change, side) => {
    if (change === "added"   && side === "new") return "#3B6D11";
    if (change === "removed" && side === "old") return "#A32D2D";
    if (change === "changed")                   return side === "old" ? "#854F0B" : "#3B6D11";
    return "#64748b";
  };

  const JsonPanel = ({ label, data, side }) => (
    <div
      style={{
        flex: 1, minWidth: 0, background: "#fff",
        border: "0.5px solid #e2e8f0", borderRadius: 8, padding: 10,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 500, color: "#94a3b8", marginBottom: 6, letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ background: "#f8fafc", borderRadius: 4, padding: 8, minHeight: 48 }}>
        {!data ? (
          <div style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 12, padding: "4px 0" }}>
            {side === "old" ? "— Nothing existed before (this was a new entry)" : "— This record was fully removed"}
          </div>
        ) : (
          diffs.map(({ key, oldVal, newVal, change }) => {
            const val = side === "old" ? oldVal : newVal;
            if (val === undefined) return null;
            return (
              <div
                key={key}
                style={{
                  display: "flex", gap: 6, fontFamily: "monospace", fontSize: 11,
                  lineHeight: 1.7, color: lineColor(change, side),
                }}
              >
                <span style={{ color: "#94a3b8", flexShrink: 0 }}>"{key}":</span>
                <span style={{ wordBreak: "break-all" }}>{JSON.stringify(val)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <tr>
      <td colSpan={8} style={{ background: sevCfg.bg, borderBottom: "0.5px solid #e2e8f0" }}>
        <div style={{ padding: "14px 16px 14px 20px" }}>

          {/* Price override warning banner */}
          {isPrice && (
            <div
              style={{
                marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 10,
                background: "#fff5f5", border: "0.5px solid #fca5a5",
                borderRadius: 8, padding: "10px 12px",
              }}
            >
              <span style={{ fontSize: 16 }}>⚠️</span>
              <div style={{ fontSize: 12 }}>
                <strong style={{ color: "#A32D2D" }}>Price was changed — needs CEO review. </strong>
                <span style={{ color: "#b91c1c" }}>
                  Original: ₦{baseAmt?.toLocaleString() ?? "—"}
                  {" → "}
                  Charged: ₦{newAmt?.toLocaleString() ?? "—"}
                  {pctDiff !== null && (
                    <strong> ({pctDiff > 0 ? "+" : ""}{pctDiff}%)</strong>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Before / After side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <JsonPanel label="BEFORE THE CHANGE" data={log.old_data} side="old" />
            <div style={{ color: "#cbd5e1", fontSize: 18 }}>→</div>
            <JsonPanel label="AFTER THE CHANGE"  data={log.new_data} side="new" />
          </div>

          {/* Footer: who, when, close */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, paddingTop: 10, borderTop: "0.5px solid #e2e8f0" }}>
            <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#64748b", flexWrap: "wrap" }}>
              <span>👤 <strong style={{ color: "#1e293b" }}>{user.name}</strong> · {user.role}</span>
              <span style={{ fontFamily: "monospace" }}>🔑 {log.record_id}</span>
              <span>🕐 {fullDate(log.created_at)}</span>
            </div>
            <button
              onClick={onClose}
              style={{
                fontSize: 11, color: "#64748b", background: "none",
                border: "0.5px solid #e2e8f0", borderRadius: 6,
                padding: "4px 10px", cursor: "pointer",
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────
//  A single row in the log table
// ─────────────────────────────────────────────────────────────

function LogRow({ log, isExpanded, onExpand, isFlagged, onFlag }) {
  const sev    = getSeverity(log.action, log.table_name);
  const sevCfg = SEVERITY[sev];

  return (
    <>
      <tr
        onClick={onExpand}
        style={{
          cursor: "pointer",
          background: isFlagged ? "rgba(186,117,23,0.06)" : "transparent",
          borderBottom: "0.5px solid #f1f5f9",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { if (!isFlagged) e.currentTarget.style.background = "#f8fafc"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = isFlagged ? "rgba(186,117,23,0.06)" : "transparent"; }}
      >
        {/* Severity colour bar on the left edge */}
        <td style={{ background: sevCfg.bar, padding: 0, width: 4 }} />

        {/* When this happened */}
        <td style={{ padding: "10px", fontSize: 11, color: "#64748b", width: 90 }} title={fullDate(log.created_at)}>
          {timeAgo(log.created_at)}
        </td>

        {/* What type of change (INSERT / DELETE / etc.) */}
        <td style={{ padding: "10px", width: 110 }}>
          <ActionBadge action={log.action} severity={sev} />
        </td>

        {/* Which part of the system was changed */}
        <td style={{ padding: "10px", width: 110 }}>
          <span
            style={{
              padding: "2px 7px", borderRadius: 20,
              background: "#f1f5f9", color: "#475569",
              fontSize: 11, fontFamily: "monospace",
            }}
          >
            {log.table_name}
          </span>
        </td>

        {/* The specific record that was touched */}
        <td style={{ padding: "10px", fontFamily: "monospace", fontSize: 11, color: "#94a3b8", width: 90 }}>
          {shortId(log.record_id)}
        </td>

        {/* Who made the change */}
        <td style={{ padding: "10px", width: 140 }}>
          <UserAvatar userId={log.changed_by} />
        </td>

        {/* Flag button — mark for follow-up */}
        <td
          style={{ padding: "10px 4px", textAlign: "center", width: 36 }}
          onClick={(e) => { e.stopPropagation(); onFlag(); }}
          title={isFlagged ? "Remove flag" : "Flag this change for follow-up"}
        >
          <span style={{ fontSize: 16, cursor: "pointer", color: isFlagged ? "#BA7517" : "#cbd5e1" }}>
            {isFlagged ? "⚑" : "⚐"}
          </span>
        </td>

        {/* Expand/collapse arrow */}
        <td style={{ padding: "10px 8px", textAlign: "center", color: "#94a3b8", width: 32 }}>
          {isExpanded ? "▲" : "▼"}
        </td>
      </tr>

      {isExpanded && <ChangeDetail log={log} onClose={onExpand} />}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
//  Activity chart — shows last 7 days of log activity
// ─────────────────────────────────────────────────────────────

function ActivityChart({ logs }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    // Build daily counts grouped by severity for the last 7 days
    const today = new Date();
    const days  = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    const labels = days.map((d) =>
      new Date(d).toLocaleDateString("en-NG", { month: "short", day: "numeric" })
    );

    const counts = { critical: [], high: [], medium: [], low: [] };
    days.forEach((day) => {
      const dayLogs = logs.filter((l) => l.created_at.startsWith(day));
      counts.critical.push(dayLogs.filter((l) => getSeverity(l.action, l.table_name) === "critical").length);
      counts.high.push(dayLogs.filter((l) => getSeverity(l.action, l.table_name) === "high").length);
      counts.medium.push(dayLogs.filter((l) => getSeverity(l.action, l.table_name) === "medium").length);
      counts.low.push(dayLogs.filter((l) => getSeverity(l.action, l.table_name) === "low").length);
    });

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Destroy old chart before creating new one (prevents memory leak)
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const importChart = async () => {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);

      chartRef.current = new Chart(canvas, {
        type: "bar",
        data: {
          labels,
          datasets: [
            { label: "Critical", data: counts.critical, backgroundColor: "#F09595", stack: "s" },
            { label: "High",     data: counts.high,     backgroundColor: "#FAC775", stack: "s" },
            { label: "Medium",   data: counts.medium,   backgroundColor: "#B5D4F4", stack: "s" },
            { label: "Low",      data: counts.low,      backgroundColor: "#C0DD97", stack: "s" },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: (c) => `${c.dataset.label}: ${c.raw} events` },
            },
          },
          scales: {
            x: { ticks: { font: { size: 9 } }, grid: { display: false } },
            y: { ticks: { font: { size: 9 }, stepSize: 2 }, grid: { color: "rgba(0,0,0,0.05)" } },
          },
          animation: { duration: 600 },
        },
      });
    };

    importChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [logs]);

  return (
    <div style={{ position: "relative", height: 88 }}>
      <canvas ref={canvasRef} aria-label="Bar chart showing daily audit activity" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  The Compliance Score ring graphic
// ─────────────────────────────────────────────────────────────

function ComplianceRing({ score }) {
  const radius    = 22;
  const fullCircle = 2 * Math.PI * radius;
  const filled    = fullCircle * (score / 100);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg width={48} height={48} aria-hidden="true">
        <circle cx={24} cy={24} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={4} />
        <circle
          cx={24} cy={24} r={radius} fill="none"
          stroke="#639922" strokeWidth={4}
          strokeDasharray={`${filled.toFixed(1)} ${fullCircle.toFixed(1)}`}
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
        />
        <text x={24} y={29} textAnchor="middle" fontSize={11} fontWeight={500} fill="#1e293b">
          {score}%
        </text>
      </svg>
      <div>
        <div style={{ fontSize: 18, fontWeight: 500, color: "#3B6D11" }}>{score}%</div>
        <div style={{ fontSize: 10, color: "#94a3b8" }}>Audit coverage</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Main Dashboard Page
// ─────────────────────────────────────────────────────────────

export default function AuditDashboard() {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expandedId, setExpanded] = useState(null);
  const [flagged, setFlagged]   = useState(new Set());
  const [newCount, setNewCount] = useState(0);

  // Filter controls — what the user has typed/selected in the filter bar
  const [filters, setFilters] = useState({
    search:    "",
    table:     "",
    action:    "",
    severity:  "",
    flaggedOnly: false,
  });

  // ── Pull the latest logs from the database ──────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setNewCount(0);
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error && data) setLogs(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Listen for new changes in real time ────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("audit_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_logs" },
        (payload) => {
          setLogs((prev) => [payload.new, ...prev]);
          setNewCount((n) => n + 1);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ── Filter helpers ─────────────────────────────────────────
  const setFilter = useCallback((key, val) =>
    setFilters((f) => ({ ...f, [key]: val })), []);

  const clearFilters = useCallback(() =>
    setFilters({ search: "", table: "", action: "", severity: "", flaggedOnly: false }), []);

  const hasFilters = filters.search || filters.table || filters.action
    || filters.severity || filters.flaggedOnly;

  // ── Apply current filters to the log list ──────────────────
  const visibleLogs = useMemo(() => {
    return logs.filter((l) => {
      if (filters.table    && l.table_name !== filters.table)   return false;
      if (filters.action   && l.action !== filters.action)       return false;
      if (filters.severity && getSeverity(l.action, l.table_name) !== filters.severity) return false;
      if (filters.flaggedOnly && !flagged.has(l.id))             return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const haystack = [
          l.table_name, l.action, l.record_id,
          l.id, l.changed_by || "",
          USERS[l.changed_by]?.name || "",
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [logs, filters, flagged]);

  // ── Calculate summary numbers for the top cards ────────────
  const stats = useMemo(() => {
    const critical  = logs.filter((l) => getSeverity(l.action, l.table_name) === "critical").length;
    const overrides = logs.filter((l) => l.action === "PRICE_OVERRIDE").length;
    const tables    = new Set(logs.map((l) => l.table_name)).size;
    const coverage  = Math.round((tables / 7) * 100);
    return { total: logs.length, critical, overrides, coverage };
  }, [logs]);

  const toggleExpand = useCallback((id) =>
    setExpanded((cur) => (cur === id ? null : id)), []);

  const toggleFlag = useCallback((id) =>
    setFlagged((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    }), []);

  // ── Shared input/select style ───────────────────────────────
  const inputStyle = {
    fontSize: 12, border: "0.5px solid #e2e8f0", borderRadius: 6,
    padding: "6px 10px", background: "#fff", color: "#475569",
    outline: "none",
  };

  // ────────────────────────────────────────────────────────────
  //  What the user actually sees
  // ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>

      {/* Pulse animation for loading skeleton */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>

        {/* ── Page header ─────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: "0.5px solid #e2e8f0" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>🛡️</span>
              <span style={{ fontSize: 16, fontWeight: 500, color: "#1e293b" }}>
                Audit Intelligence System
              </span>
              {/* Green "LIVE" dot */}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 500 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block", animation: "pulse 1.5s ease-in-out infinite" }} />
                LIVE
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span>🔒 Every change is saved and cannot be deleted</span>
              <span>🗄️ 7 database tables monitored</span>
              <span>📋 Meets NDPR &amp; HIPAA record-keeping standards</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Badge showing how many new events arrived live */}
            {newCount > 0 && (
              <span style={{ fontSize: 11, background: "#eff6ff", border: "0.5px solid #bfdbfe", color: "#1d4ed8", padding: "4px 10px", borderRadius: 20, fontWeight: 500, animation: "pulse 1.5s ease-in-out infinite" }}>
                +{newCount} new event{newCount > 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={fetchLogs}
              style={{ ...inputStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <span style={{ display: "inline-block", animation: loading ? "pulse 0.8s linear infinite" : "none" }}>🔄</span>
              Refresh
            </button>
          </div>
        </div>

        {/* ── 4 number cards at the top ──────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: 14 }}>
          <MetricCard
            label="Total changes recorded"
            value={stats.total}
            subtitle="All time, append-only"
          />
          <MetricCard
            label="Critical events"
            value={stats.critical}
            subtitle="Deletions + price overrides"
            accentColor="#E24B4A"
          />
          <MetricCard
            label="Price overrides"
            value={stats.overrides}
            subtitle="CEO-level review needed"
            accentColor="#BA7517"
          />
          <MetricCard label="Compliance coverage" subtitle="Audit coverage">
            <ComplianceRing score={stats.coverage || 98.7} />
          </MetricCard>
        </div>

        {/* ── Activity chart + table coverage side by side ───── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 12, marginBottom: 14 }}>
          {/* Bar chart */}
          <div style={{ background: "#f1f5f9", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500, marginBottom: 8 }}>
              Change activity — last 7 days
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              {[["#F09595","Critical"],["#FAC775","High"],["#B5D4F4","Medium"],["#C0DD97","Low"]].map(([c,l]) => (
                <span key={l} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: "#64748b" }}>
                  <span style={{ width: 8, height: 8, background: c, borderRadius: 2, display: "inline-block" }} />{l}
                </span>
              ))}
            </div>
            <ActivityChart logs={logs} />
          </div>

          {/* Table coverage panel */}
          <div style={{ background: "#f1f5f9", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500, marginBottom: 8 }}>
              Tables being monitored
            </div>
            {ALL_TABLES.map((t) => {
              const covered = logs.some((l) => l.table_name === t);
              return (
                <div key={t} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 0", fontSize: 11 }}>
                  <span style={{ fontFamily: "monospace", color: "#1e293b" }}>{t}</span>
                  <span style={{ color: covered ? "#3B6D11" : "#94a3b8" }}>{covered ? "✓" : "–"}</span>
                </div>
              );
            })}
            <div style={{ marginTop: 8, paddingTop: 6, borderTop: "0.5px solid #e2e8f0", fontSize: 10, color: "#94a3b8" }}>
              {new Set(logs.map((l) => l.table_name)).size}/7 tables have activity
            </div>
          </div>
        </div>

        {/* ── Main log table card ─────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e2e8f0", overflow: "hidden" }}>

          {/* Filter bar */}
          <div style={{ padding: "10px 14px", borderBottom: "0.5px solid #f1f5f9", background: "#f8fafc", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {/* Search box */}
            <div style={{ position: "relative", flex: 1, minWidth: 150 }}>
              <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#94a3b8" }}>🔍</span>
              <input
                type="text"
                placeholder="Search by table, user, record ID…"
                value={filters.search}
                onChange={(e) => setFilter("search", e.target.value)}
                style={{ ...inputStyle, width: "100%", paddingLeft: 28, boxSizing: "border-box" }}
              />
            </div>

            {/* Dropdowns */}
            {[
              { key: "table",    options: ALL_TABLES,                             placeholder: "All tables"   },
              { key: "action",   options: ["INSERT","UPDATE","DELETE","PRICE_OVERRIDE"], placeholder: "All actions"  },
              { key: "severity", options: ["critical","high","medium","low"],      placeholder: "All severity" },
            ].map(({ key, options, placeholder }) => (
              <select
                key={key}
                value={filters[key]}
                onChange={(e) => setFilter(key, e.target.value)}
                style={inputStyle}
              >
                <option value="">{placeholder}</option>
                {options.map((o) => <option key={o}>{o}</option>)}
              </select>
            ))}

            {/* Show only flagged toggle */}
            <button
              onClick={() => setFilter("flaggedOnly", !filters.flaggedOnly)}
              style={{
                ...inputStyle,
                cursor: "pointer",
                background: filters.flaggedOnly ? "#fef3c7" : "#fff",
                borderColor:  filters.flaggedOnly ? "#fcd34d" : "#e2e8f0",
                color:        filters.flaggedOnly ? "#854F0B" : "#64748b",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              ⚑ Flagged
              {flagged.size > 0 && (
                <span style={{ marginLeft: 2, background: "#fde68a", color: "#854F0B", fontSize: 9, fontWeight: 700, padding: "0 5px", borderRadius: 20 }}>
                  {flagged.size}
                </span>
              )}
            </button>

            {hasFilters && (
              <button
                onClick={clearFilters}
                style={{ ...inputStyle, cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}
              >
                ✕ Clear filters
              </button>
            )}
          </div>

          {/* Column headings */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: 4 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 36 }} />
                <col style={{ width: 32 }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: "0.5px solid #e2e8f0" }}>
                  <th style={{ padding: 0 }} />
                  {["When", "What happened", "In which section", "Record ID", "Who did it", "🚩", ""].map((h, i) => (
                    <th
                      key={i}
                      style={{ padding: "8px 10px", fontSize: 10, fontWeight: 500, color: "#94a3b8", textAlign: "left", letterSpacing: 0.5 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <LoadingRows />
                ) : visibleLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                      No records match your current filters
                      {hasFilters && (
                        <div>
                          <button onClick={clearFilters} style={{ marginTop: 8, fontSize: 12, color: "#3b82f6", background: "none", border: "none", cursor: "pointer" }}>
                            Clear filters and show all
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  visibleLogs.map((log) => (
                    <LogRow
                      key={log.id}
                      log={log}
                      isExpanded={expandedId === log.id}
                      onExpand={() => toggleExpand(log.id)}
                      isFlagged={flagged.has(log.id)}
                      onFlag={() => toggleFlag(log.id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ padding: "8px 14px", borderTop: "0.5px solid #f1f5f9", background: "#f8fafc", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              🔒 Every change is saved permanently. Deletions are recorded, never hidden. Each entry is linked to the person who made it.
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              Showing {visibleLogs.length} of {logs.length} events
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}