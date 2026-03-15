"use client";

const inputCls =
  "w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition font-medium";
const labelCls =
  "block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5";

export function FInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  readOnly = false,
}) {
  return (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      <input
        type={type}
        value={value || ""}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className={`${inputCls} ${readOnly ? "bg-slate-50 text-slate-400 cursor-not-allowed" : ""}`}
      />
    </div>
  );
}

export function FSelect({ label, value, onChange, options }) {
  return (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls + " appearance-none"}
      >
        <option value="">— Select —</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FTextarea({
  label,
  value,
  onChange,
  placeholder = "",
  rows = 3,
}) {
  return (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={inputCls + " resize-none"}
      />
    </div>
  );
}