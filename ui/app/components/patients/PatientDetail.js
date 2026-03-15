"use client";
import {
  X,
  Plus,
  Edit,
  Printer,
  Trash2,
  User,
  Calendar,
  Phone,
  MapPin,
  ClipboardList,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Pill,
  CreditCard,
} from "lucide-react";
import { TypeBadge, StatusBadge } from "@/app/components/ui/Badge";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function calcAge(dob) {
  if (!dob) return null;
  return Math.floor(
    (Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25)
  );
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtNaira(n) {
  if (!n) return "—";
  return "₦" + Number(n).toLocaleString("en-NG");
}

/* ─── Frequent Visitor Badge ──────────────────────────────────────────────── */
function FrequentVisitorBadge({ visits }) {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recent = visits.filter(
    (v) => new Date(v.visit_date || v.created_at) > cutoff
  ).length;
  if (recent < 3) return null;
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-2.5">
      <RefreshCw size={13} className="text-orange-500" />
      <div>
        <p className="text-[10px] font-black text-orange-700 uppercase tracking-wider">
          Frequent Visitor
        </p>
        <p className="text-[11px] text-orange-600 mt-0.5">
          {recent} visits in the last 30 days — consider chronic care review.
        </p>
      </div>
    </div>
  );
}

/* ─── Print ───────────────────────────────────────────────────────────────── */
function printSummary(patient, visits, hospital) {
  const html = `<!DOCTYPE html><html><head><title>Patient Summary — ${patient.full_name}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;font-size:12px;color:#111;padding:32px 40px;max-width:700px;margin:auto}
  .hdr{border-bottom:2px solid #0d9488;padding-bottom:14px;margin-bottom:18px;display:flex;justify-content:space-between}
  .cn{font-size:20px;font-weight:bold;color:#0d9488}.cs{font-size:10px;color:#888;margin-top:2px}
  h2{font-size:13px;font-weight:bold;border-bottom:1px solid #e5e7eb;padding-bottom:5px;margin:16px 0 9px;color:#0d9488}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:7px 22px}
  .f label{font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:.07em;color:#888}
  .f p{font-size:12px;font-weight:600;color:#111;margin-top:1px}
  .allergy{background:#fef3c7;border:1px solid #f59e0b;border-radius:5px;padding:7px 11px;margin:10px 0}
  .allergy p{color:#92400e;font-weight:bold;font-size:11px}
  .vc{border:1px solid #e5e7eb;border-radius:7px;padding:11px 13px;margin-bottom:10px}
  .badge{font-size:9px;font-weight:bold;text-transform:uppercase;background:#f0fdfa;border:1px solid #99f6e4;color:#0f766e;padding:2px 7px;border-radius:3px}
  .vitrow{display:flex;gap:14px;flex-wrap:wrap;margin:7px 0;background:#f0fdfa;border-radius:5px;padding:7px 9px}
  .vit label{font-size:8px;font-weight:bold;text-transform:uppercase;color:#888}
  .vit p{font-size:12px;font-weight:bold;color:#0f766e;margin-top:1px}
  .labs{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
  .lab{font-size:9px;font-weight:bold;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;padding:2px 6px;border-radius:3px}
  .footer{margin-top:28px;border-top:1px solid #e5e7eb;padding-top:10px;font-size:9px;color:#bbb;text-align:center}
  @media print{body{padding:14px}}</style></head><body>
  <div class="hdr">
    <div>
      <div class="cn">${hospital?.name || "Hospital"}</div>
      <div class="cs">${hospital?.address || ""} · Patient Clinical Summary</div>
    </div>
    <div style="font-size:10px;color:#888">Printed: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
  </div>
  <h2>Patient Information</h2>
  <div class="grid">
    <div class="f"><label>Full Name</label><p>${patient.full_name}</p></div>
    <div class="f"><label>Patient ID</label><p>${patient.patient_id || "—"}</p></div>
    <div class="f"><label>DOB</label><p>${patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}</p></div>
    <div class="f"><label>Age</label><p>${patient.date_of_birth ? calcAge(patient.date_of_birth) + " years" : "—"}</p></div>
    <div class="f"><label>Gender</label><p>${patient.gender || "—"}</p></div>
    <div class="f"><label>Phone</label><p>${patient.phone || "—"}</p></div>
    <div class="f"><label>Blood Group</label><p>${patient.blood_group || "—"}</p></div>
    <div class="f"><label>Genotype</label><p>${patient.genotype || "—"}</p></div>
    <div class="f"><label>Insurance</label><p>${patient.insurance_provider || "None"}</p></div>
    ${patient.nhia_number ? `<div class="f"><label>NHIA No.</label><p>${patient.nhia_number}</p></div>` : ""}
  </div>
  ${patient.allergies ? `<div class="allergy"><p>⚠ KNOWN ALLERGIES: ${patient.allergies}</p></div>` : ""}
  <div class="f" style="margin-top:8px">
    <label>Emergency Contact</label>
    <p>${patient.emergency_contact_name || "—"} ${patient.emergency_contact_phone ? "· " + patient.emergency_contact_phone : ""}</p>
  </div>
  <h2>Visit History (${visits.length} visit${visits.length !== 1 ? "s" : ""})</h2>
  ${visits.map((v) => `<div class="vc">
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:4px">
      <div>
        <span class="badge">${v.is_emergency ? "🔴 EMERGENCY" : v.visit_type || "OPD"}</span>
        ${v.visit_status ? `<span class="badge" style="margin-left:3px;background:#f0f9ff;border-color:#bae6fd;color:#0369a1">${v.visit_status}</span>` : ""}
        ${v.icd10_code ? `<span class="badge" style="margin-left:3px;background:#faf5ff;border-color:#e9d5ff;color:#7c3aed">${v.icd10_code}</span>` : ""}
      </div>
      <div style="font-size:10px;color:#888">${v.visit_date ? new Date(v.visit_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</div>
    </div>
    ${v.departments?.length ? `<div style="margin-bottom:7px"><span style="font-size:9px;color:#888;font-weight:bold;text-transform:uppercase">Dept:</span> <span style="font-size:11px;color:#0d9488;font-weight:bold">${v.departments.join(" · ")}</span></div>` : ""}
    ${v.doctor ? `<div style="font-size:10px;color:#888;margin-bottom:5px">Dr. ${v.doctor}</div>` : ""}
    ${v.bp_systolic || v.temperature || v.pulse || v.spo2 || v.weight ? `<div class="vitrow">
      ${v.bp_systolic && v.bp_diastolic ? `<div class="vit"><label>BP</label><p>${v.bp_systolic}/${v.bp_diastolic}</p></div>` : ""}
      ${v.temperature ? `<div class="vit"><label>Temp</label><p>${v.temperature}°C</p></div>` : ""}
      ${v.pulse ? `<div class="vit"><label>Pulse</label><p>${v.pulse} bpm</p></div>` : ""}
      ${v.spo2 ? `<div class="vit"><label>SpO₂</label><p>${v.spo2}%</p></div>` : ""}
      ${v.weight ? `<div class="vit"><label>Weight</label><p>${v.weight} kg</p></div>` : ""}
    </div>` : ""}
    ${v.complaint ? `<div style="margin-bottom:5px"><label style="font-size:9px;font-weight:bold;text-transform:uppercase;color:#888">Complaint</label><p style="font-size:11px;color:#333;margin-top:1px">${v.complaint}</p></div>` : ""}
    ${v.diagnosis ? `<div style="margin-bottom:5px"><label style="font-size:9px;font-weight:bold;text-transform:uppercase;color:#888">Diagnosis</label><p style="font-size:11px;color:#111;font-weight:bold;margin-top:1px">${v.diagnosis}</p></div>` : ""}
    ${v.medications?.length ? `<div style="margin-bottom:5px"><label style="font-size:9px;font-weight:bold;text-transform:uppercase;color:#888">Medications</label><div class="labs">${v.medications.map((m) => `<span class="lab">${m}</span>`).join("")}</div></div>` : ""}
    ${v.prescription ? `<div style="margin-bottom:5px"><label style="font-size:9px;font-weight:bold;text-transform:uppercase;color:#888">Prescription Notes</label><p style="font-size:11px;color:#333;margin-top:1px">${v.prescription}</p></div>` : ""}
    ${v.lab_requests?.length ? `<div><label style="font-size:9px;font-weight:bold;text-transform:uppercase;color:#888">Lab Requests</label><div class="labs">${v.lab_requests.map((l) => `<span class="lab">${l}</span>`).join("")}</div></div>` : ""}
    ${v.notes ? `<p style="font-size:11px;color:#666;font-style:italic;margin-top:5px">${v.notes}</p>` : ""}
  </div>`).join("")}
  <div class="footer">${hospital?.name || "Hospital"} HMS · Confidential · Not for public distribution</div>
  </body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

/* ─── MAIN ────────────────────────────────────────────────────────────────── */
export default function PatientDetail({
  patient,
  visits,
  hospital,
  onClose,
  onAddVisit,
  onEditPatient,
  onDeletePatient,
  onEditVisit,
  onDeleteVisit,
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/20 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-screen w-full md:max-w-sm bg-white border-l border-slate-100 z-50 flex flex-col shadow-2xl"
        style={{ animation: "slideIn 0.22s ease-out" }}>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-sm font-black text-teal-700 shrink-0">
              {(patient.full_name || "?")
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </div>
            <div>
              <p className="font-black text-slate-900">{patient.full_name}</p>
              <p className="text-[11px] font-black text-teal-600 font-mono mt-0.5">
                {patient.patient_id}
              </p>
              {patient.nhia_number && (
                <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                  <ShieldCheck size={9} /> NHIA: {patient.nhia_number}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 transition"
          >
            <X size={13} />
          </button>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 shrink-0">
          <button
            onClick={onAddVisit}
            className="flex-1 flex items-center justify-center gap-1.5 bg-teal-50 border border-teal-200 hover:bg-teal-600 text-teal-700 hover:text-white text-xs font-bold py-2 rounded-lg transition"
          >
            <Plus size={12} /> Visit
          </button>
          <button
            onClick={onEditPatient}
            className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold py-2 rounded-lg transition"
          >
            <Edit size={12} /> Edit
          </button>
          <button
            onClick={() => printSummary(patient, visits, hospital)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-bold py-2 rounded-lg transition"
          >
            <Printer size={12} /> Print
          </button>
          <button
            onClick={() => onDeletePatient(patient.id)}
            className="w-9 h-9 flex items-center justify-center bg-slate-50 border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-slate-400 rounded-lg transition"
          >
            <Trash2 size={12} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <FrequentVisitorBadge visits={visits} />

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Age", value: patient.date_of_birth ? `${calcAge(patient.date_of_birth)}y` : "—" },
              { label: "Blood", value: patient.blood_group || "—" },
              { label: "Genotype", value: patient.genotype || "—" },
            ].map((v) => (
              <div key={v.label} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-3 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{v.label}</p>
                <p className="text-sm font-black text-slate-900 mt-1">{v.value}</p>
              </div>
            ))}
          </div>

          {/* Insurance */}
          {(patient.insurance_provider || patient.nhia_number) && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-3 flex gap-2.5">
              <ShieldCheck size={13} className="text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Insurance / NHIA</p>
                <p className="text-sm font-semibold text-emerald-800">{patient.insurance_provider || "—"}</p>
                {patient.nhia_number && <p className="text-xs text-emerald-600 font-mono mt-0.5">NHIA: {patient.nhia_number}</p>}
                {patient.insurance_id && <p className="text-xs text-emerald-600 mt-0.5">ID: {patient.insurance_id}</p>}
              </div>
            </div>
          )}

          {/* Allergies */}
          {patient.allergies && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-3 flex gap-2.5">
              <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">⚠ Known Allergies</p>
                <p className="text-sm font-semibold text-amber-800">{patient.allergies}</p>
              </div>
            </div>
          )}

          {/* Patient details */}
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-100">
              Patient Details
            </p>
            <div className="space-y-2.5">
              {[
                { icon: <User size={11} />, label: "Gender", val: patient.gender },
                { icon: <Calendar size={11} />, label: "DOB", val: fmtDate(patient.date_of_birth) },
                { icon: <Phone size={11} />, label: "Phone", val: patient.phone || "Not provided" },
                { icon: <MapPin size={11} />, label: "Address", val: patient.address },
              ].map((row) => (
                <div key={row.label} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                    {row.icon}
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{row.label}</p>
                    <p className="text-sm text-slate-700 mt-0.5">{row.val || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency contact */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <Phone size={11} className="text-red-400" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Emergency Contact</p>
              <p className="text-sm font-bold text-slate-900">{patient.emergency_contact_name || "—"}</p>
              <p className="text-xs text-slate-500">{patient.emergency_contact_phone || "No number"}</p>
            </div>
          </div>

          {/* Visit history */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Visit History</p>
              <span className="text-[10px] text-slate-400">
                {visits.length} visit{visits.length !== 1 ? "s" : ""}
              </span>
            </div>

            {visits.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-xl px-4 py-6 text-center">
                <ClipboardList size={18} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400">No visits yet</p>
                <p className="text-[11px] text-slate-300 mt-1">Click "Visit" to log the first one.</p>
              </div>
            ) : (
              <div className="space-y-3 pl-3 border-l-2 border-slate-100">
                {visits.map((v) => (
                  <div key={v.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex flex-wrap gap-1">
                        <TypeBadge type={v.visit_type} emergency={v.is_emergency} />
                        <StatusBadge status={v.visit_status} />
                        {v.icd10_code && (
                          <span className="px-2 py-0.5 rounded border border-purple-200 text-[10px] font-black bg-purple-50 text-purple-700">
                            {v.icd10_code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400">{fmtDate(v.visit_date)}</span>
                        <button
                          onClick={() => onEditVisit(v)}
                          className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-teal-600 transition"
                        >
                          <Edit size={10} />
                        </button>
                        <button
                          onClick={() => onDeleteVisit(v.id)}
                          className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 transition"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>

                    {v.departments?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {v.departments.map((d) => (
                          <span key={d} className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                    {v.doctor && <p className="text-[11px] text-slate-400 mb-1">Dr. {v.doctor}</p>}
                    {(v.bp_systolic || v.temperature || v.pulse || v.spo2) && (
                      <div className="flex flex-wrap gap-2 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-2 mb-2">
                        {v.bp_systolic && <span className="text-[10px] font-bold text-blue-700">BP {v.bp_systolic}/{v.bp_diastolic}</span>}
                        {v.temperature && <span className="text-[10px] font-bold text-blue-700">T {v.temperature}°C</span>}
                        {v.pulse && <span className="text-[10px] font-bold text-blue-700">P {v.pulse}bpm</span>}
                        {v.spo2 && <span className="text-[10px] font-bold text-blue-700">SpO₂ {v.spo2}%</span>}
                      </div>
                    )}
                    {v.complaint && <p className="text-xs text-slate-600 mb-1"><strong className="text-slate-800">CC:</strong> {v.complaint}</p>}
                    {v.diagnosis && <p className="text-xs font-bold text-slate-900 mb-1">{v.diagnosis}</p>}
                    {v.medications?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {v.medications.map((m) => (
                          <span key={m} className="inline-flex items-center gap-1 text-[10px] font-bold bg-teal-50 border border-teal-100 text-teal-700 px-1.5 py-0.5 rounded">
                            <Pill size={8} />{m}
                          </span>
                        ))}
                      </div>
                    )}
                    {v.lab_requests?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {v.lab_requests.map((l) => (
                          <span key={l} className="text-[9px] font-bold bg-blue-50 border border-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                    {v.consultation_fee && (
                      <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 mt-1">
                        <CreditCard size={9} className="text-emerald-600" />
                        <span className="text-[11px] font-bold text-emerald-700">{fmtNaira(v.consultation_fee)}</span>
                        {v.other_fees && <span className="text-[10px] text-emerald-500">+ {fmtNaira(v.other_fees)}</span>}
                      </div>
                    )}
                    {v.notes && <p className="text-[11px] text-slate-400 italic mt-1.5">{v.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}