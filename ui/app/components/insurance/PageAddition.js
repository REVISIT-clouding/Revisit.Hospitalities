// ─────────────────────────────────────────────────────────────────────────────
// ADDITIONS TO page.jsx  (paste the relevant pieces into your existing file)
// ─────────────────────────────────────────────────────────────────────────────

// 1. NEW IMPORT — add to top with your other imports
import InsuranceBadge from "@/app/components/patients/InsuranceBadge";

// ─────────────────────────────────────────────────────────────────────────────
// 2. NEW STATE — add inside PatientsPage(), near your other useState calls
// ─────────────────────────────────────────────────────────────────────────────
const [providers,       setProviders]       = useState([]);   // insurance_providers rows
const [providerFilter,  setProviderFilter]  = useState("");   // "" = all, uuid = filter by provider

// ─────────────────────────────────────────────────────────────────────────────
// 3. NEW LOADER — add alongside loadPatients / loadAllVisits
// ─────────────────────────────────────────────────────────────────────────────
const loadProviders = useCallback(async () => {
  if (!hospital?.id) return;
  const { data } = await supabase
    .from("insurance_providers")
    .select("*")
    .eq("hospital_id", hospital.id)
    .order("name");
  if (data) setProviders(data);
}, [hospital?.id]);

// 4. ADD loadProviders to the existing useEffect that runs on mount:
//    Replace your existing:
//      useEffect(() => { loadPatients(); loadAllVisits(); }, [...]);
//    With:
useEffect(() => {
  loadPatients();
  loadAllVisits();
  loadProviders();
}, [loadPatients, loadAllVisits, loadProviders]);

// ─────────────────────────────────────────────────────────────────────────────
// 5. DERIVED STATS — add near your other stats (todayNew, opdCount, etc.)
// ─────────────────────────────────────────────────────────────────────────────
const hmoCount     = patients.filter((p) => !!p.insurance_provider_id).length;
const selfPayCount = patients.length - hmoCount;

// ─────────────────────────────────────────────────────────────────────────────
// 6. FILTERED PATIENTS LIST — add below your stats derivations
// ─────────────────────────────────────────────────────────────────────────────
const visiblePatients = providerFilter
  ? patients.filter((p) =>
      providerFilter === "__self_pay__"
        ? !p.insurance_provider_id
        : p.insurance_provider_id === providerFilter
    )
  : patients;

// ─────────────────────────────────────────────────────────────────────────────
// 7. UPDATED STATS GRID — replace your existing 4-card stats grid with this
//    (adds an HMO card and wires the existing ones to use visiblePatients)
// ─────────────────────────────────────────────────────────────────────────────

/*  JSX — drop this in place of your current stats <div className="grid ..."> block:

<div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
  {[
    { label: "Total Patients",   value: patients.length, sub: "registered",  accent: "border-l-teal-500"   },
    { label: "HMO / Insured",    value: hmoCount,        sub: "with coverage",accent: "border-l-violet-500" },
    { label: "Self-Pay",         value: selfPayCount,    sub: "no insurance", accent: "border-l-slate-400"  },
    { label: "OPD Visits",       value: opdCount,        sub: "outpatients",  accent: "border-l-blue-500"   },
    { label: "IPD / Admitted",   value: ipdCount,        sub: "inpatients",   accent: "border-l-amber-500"  },
  ].map((c) => (
    <div key={c.label}
      className={`bg-white border border-slate-200 border-l-4 ${c.accent} rounded-xl px-3 sm:px-4 py-3 sm:py-4`}>
      <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
        {c.label}
      </p>
      <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 leading-none">
        {c.value}
      </p>
      <p className="text-[10px] text-slate-400 mt-1">{c.sub}</p>
    </div>
  ))}
</div>
*/

// ─────────────────────────────────────────────────────────────────────────────
// 8. PROVIDER FILTER BAR — add this JSX block just ABOVE <PatientTable ...>
// ─────────────────────────────────────────────────────────────────────────────

/*  JSX:

{providers.length > 0 && (
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
      Filter by payer:
    </span>
    <button
      onClick={() => setProviderFilter("")}
      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
        providerFilter === ""
          ? "bg-slate-800 text-white border-slate-800"
          : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
      }`}
    >
      All
    </button>
    {providers.map((prov) => {
      const active = providerFilter === prov.id;
      return (
        <button
          key={prov.id}
          onClick={() => setProviderFilter(active ? "" : prov.id)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
            active ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
          }`}
        >
          {prov.name}
        </button>
      );
    })}
    <button
      onClick={() => setProviderFilter("__self_pay__")}
      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
        providerFilter === "__self_pay__"
          ? "bg-slate-800 text-white border-slate-800"
          : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
      }`}
    >
      Self-Pay
    </button>
  </div>
)}
*/

// ─────────────────────────────────────────────────────────────────────────────
// 9. PASS providers + visiblePatients to child components
//
//    Update <PatientTable ...> — change patients={patients} → patients={visiblePatients}
//    and add providers prop:
//
//      <PatientTable
//        patients={visiblePatients}        // ← was patients={patients}
//        providers={providers}             // ← new
//        loading={loading}
//        onSelectPatient={setDetail}
//      />
//
//    Update <PatientModal ...> — add providers prop:
//
//      <PatientModal
//        ...existing props...
//        providers={providers}             // ← new
//      />
// ─────────────────────────────────────────────────────────────────────────────