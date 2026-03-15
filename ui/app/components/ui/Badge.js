"use client";

export function TypeBadge({ type, emergency }) {
  if (emergency) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-50 border border-red-200 text-red-600">
        🔴 Emergency
      </span>
    );
  }

  const map = {
    OPD: "bg-teal-50 border-teal-200 text-teal-700",
    IPD: "bg-blue-50 border-blue-200 text-blue-700",
    Referred: "bg-amber-50 border-amber-200 text-amber-700",
    "Follow-up": "bg-purple-50 border-purple-200 text-purple-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-black uppercase ${map[type] || map.OPD}`}
    >
      {type || "OPD"}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    Open: "bg-emerald-50 border-emerald-200 text-emerald-700",
    Completed: "bg-slate-100 border-slate-200 text-slate-500",
    "Referred Out": "bg-amber-50 border-amber-200 text-amber-700",
    Admitted: "bg-blue-50 border-blue-200 text-blue-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-black uppercase ${map[status] || map.Open}`}
    >
      {status}
    </span>
  );
}