// components/patients/InsuranceBadge.jsx
// Drop this file alongside your other patient components.

/**
 * Deterministic color palette — each provider always gets the same color,
 * no matter the order they were created. Enterprise pattern (think Stripe,
 * Zendesk) uses 8-10 hues cycling by hash so the UI stays consistent.
 */
const PROVIDER_PALETTES = [
  { bg: "bg-violet-100",  text: "text-violet-700",  dot: "bg-violet-500",  border: "border-violet-200" },
  { bg: "bg-sky-100",     text: "text-sky-700",     dot: "bg-sky-500",     border: "border-sky-200"    },
  { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-emerald-200"},
  { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500",   border: "border-amber-200"  },
  { bg: "bg-rose-100",    text: "text-rose-700",    dot: "bg-rose-500",    border: "border-rose-200"   },
  { bg: "bg-indigo-100",  text: "text-indigo-700",  dot: "bg-indigo-500",  border: "border-indigo-200" },
  { bg: "bg-teal-100",    text: "text-teal-700",    dot: "bg-teal-500",    border: "border-teal-200"   },
  { bg: "bg-orange-100",  text: "text-orange-700",  dot: "bg-orange-500",  border: "border-orange-200" },
];

/** Turn a UUID or name string into a stable palette index */
function hashToPaletteIndex(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h % PROVIDER_PALETTES.length;
}

/**
 * Exported helper so PatientTable / PatientDetail can use the same colors
 * without rendering a badge (e.g. for row highlight backgrounds).
 */
export function getProviderPalette(providerId = "") {
  return PROVIDER_PALETTES[hashToPaletteIndex(providerId)];
}

/**
 * InsuranceBadge
 * Props:
 *   provider  — { id, name } object from insurance_providers table
 *   size      — "sm" | "md" (default "sm")
 *   showDot   — whether to show the colored dot (default true)
 */
export default function InsuranceBadge({ provider, size = "sm", showDot = true }) {
  if (!provider?.name) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-400 border border-slate-200">
        Self-Pay
      </span>
    );
  }

  const p = getProviderPalette(provider.id);
  const textSize = size === "md" ? "text-xs" : "text-[10px]";
  const padding  = size === "md" ? "px-2.5 py-1" : "px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${padding} rounded-full ${textSize} font-bold ${p.bg} ${p.text} border ${p.border} whitespace-nowrap`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.dot}`} />}
      {provider.name}
    </span>
  );
}