// ─────────────────────────────────────────────────────────────────────────────
// INSURANCE SECTION — drop inside PatientModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. Add `providers` to PatientModal's props:
//      export default function PatientModal({ ..., providers = [], ... })
//
// 2. Ensure EMPTY_PATIENT has these fields (add if missing):
//      export const EMPTY_PATIENT = {
//        ...existingFields,
//        insurance_provider_id: "",
//        policy_number:         "",
//        coverage_type:         "",
//        nhia_number:           "",
//      };
//
// 3. Paste the JSX below as a new section inside your modal form,
//    after the "Emergency Contact" fields (or wherever makes sense):
// ─────────────────────────────────────────────────────────────────────────────

/*  JSX to paste:

{/* ── Insurance / HMO ── *\/}
<div className="border-t border-slate-100 pt-5 mt-1">
  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
    Insurance / HMO
  </p>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

    {/* Provider dropdown — populated from insurance_providers table *\/}
    <div className="sm:col-span-2">
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        Insurance Provider
      </label>
      <select
        value={pForm.insurance_provider_id || ""}
        onChange={(e) =>
          setPForm({ ...pForm, insurance_provider_id: e.target.value || null })
        }
        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition appearance-none bg-white"
      >
        <option value="">— Self-Pay / No Insurance —</option>
        {providers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>

    {/* Only show these fields when a provider is selected *\/}
    {pForm.insurance_provider_id && (
      <>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Policy / Member Number
          </label>
          <input
            value={pForm.policy_number || ""}
            placeholder="e.g. HMO-00123456"
            onChange={(e) => setPForm({ ...pForm, policy_number: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Coverage Type
          </label>
          <select
            value={pForm.coverage_type || ""}
            onChange={(e) => setPForm({ ...pForm, coverage_type: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition appearance-none bg-white"
          >
            <option value="">— Select —</option>
            <option value="Individual">Individual</option>
            <option value="Family">Family</option>
            <option value="Group / Corporate">Group / Corporate</option>
            <option value="Government / NHIA">Government / NHIA</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            NHIA / Card Number
          </label>
          <input
            value={pForm.nhia_number || ""}
            placeholder="National Health Insurance number"
            onChange={(e) => setPForm({ ...pForm, nhia_number: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Insurance ID (internal)
          </label>
          <input
            value={pForm.insurance_id || ""}
            placeholder="Insurer's patient reference"
            onChange={(e) => setPForm({ ...pForm, insurance_id: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition"
          />
        </div>
      </>
    )}
  </div>
</div>
*/