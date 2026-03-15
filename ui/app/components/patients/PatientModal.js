"use client";
import { CheckCircle, Loader2, X, ShieldCheck } from "lucide-react";
import { FInput, FSelect } from "@/app/components/ui/Fields";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENOTYPES = ["AA", "AS", "SS", "AC", "SC"];
const INSURANCE_PROVIDERS = [
  "NHIA (Self)", "NHIA (Employer)", "Hygeia HMO", "Reliance HMO",
  "AXA Mansard", "Leadway Health", "Total Health Trust", "Clearline HMO",
  "Avon HMO", "Princeton Health", "None / Self-pay",
];

const EMPTY_PATIENT = {
  full_name: "", date_of_birth: "", gender: "", phone: "", email: "",
  address: "", blood_group: "", genotype: "", allergies: "",
  emergency_contact_name: "", emergency_contact_phone: "",
  nhia_number: "", insurance_provider: "", insurance_id: "",
};

export { EMPTY_PATIENT };

export default function PatientModal({
  editTarget,
  pForm,
  setPForm,
  saving,
  onSave,
  onClose,
  hospital,
}) {
  return (
    <div
      className="fixed inset-0 bg-slate-900/30 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">

        {/* Header */}
        <div className="flex items-start justify-between px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-slate-100 relative">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 rounded-full sm:hidden" />
          <div>
            <h2 className="text-base font-black text-slate-900">
              {editTarget ? "Edit Patient Record" : "Register New Patient"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {hospital?.name} · Patient Database
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 transition"
          >
            <X size={13} />
          </button>
        </div>

        {/* Form body */}
        <div className="px-5 sm:px-6 py-5 space-y-5">

          {/* Personal */}
          <div>
            <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-3">
              Personal
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <FInput
                  label="Full Name *"
                  placeholder="e.g. Chioma Okafor"
                  value={pForm.full_name}
                  onChange={(v) => setPForm({ ...pForm, full_name: v })}
                />
              </div>
              <FInput
                label="Date of Birth"
                type="date"
                value={pForm.date_of_birth}
                onChange={(v) => setPForm({ ...pForm, date_of_birth: v })}
              />
              <FSelect
                label="Gender"
                options={["Male", "Female", "Other"]}
                value={pForm.gender}
                onChange={(v) => setPForm({ ...pForm, gender: v })}
              />
              <FInput
                label="Phone"
                placeholder="08012345678"
                value={pForm.phone}
                onChange={(v) => setPForm({ ...pForm, phone: v })}
              />
              <FInput
                label="Email (optional)"
                type="email"
                value={pForm.email}
                onChange={(v) => setPForm({ ...pForm, email: v })}
              />
              <div className="col-span-2">
                <FInput
                  label="Address"
                  placeholder="15 Sapele Rd, Benin City"
                  value={pForm.address}
                  onChange={(v) => setPForm({ ...pForm, address: v })}
                />
              </div>
            </div>
          </div>

          {/* Medical */}
          <div>
            <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-3">
              Medical
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FSelect
                label="Blood Group"
                options={BLOOD_GROUPS}
                value={pForm.blood_group}
                onChange={(v) => setPForm({ ...pForm, blood_group: v })}
              />
              <FSelect
                label="Genotype"
                options={GENOTYPES}
                value={pForm.genotype}
                onChange={(v) => setPForm({ ...pForm, genotype: v })}
              />
              <div className="col-span-2">
                <FInput
                  label="Known Allergies"
                  placeholder="e.g. Penicillin — or None"
                  value={pForm.allergies}
                  onChange={(v) => setPForm({ ...pForm, allergies: v })}
                />
              </div>
            </div>
          </div>

          {/* Insurance */}
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <ShieldCheck size={11} /> Insurance & NHIA
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <FSelect
                  label="Insurance Provider"
                  options={INSURANCE_PROVIDERS}
                  value={pForm.insurance_provider}
                  onChange={(v) => setPForm({ ...pForm, insurance_provider: v })}
                />
              </div>
              <FInput
                label="NHIA Number"
                placeholder="NHIA/0012345"
                value={pForm.nhia_number}
                onChange={(v) => setPForm({ ...pForm, nhia_number: v })}
              />
              <FInput
                label="Insurance ID"
                placeholder="HMO-987654"
                value={pForm.insurance_id}
                onChange={(v) => setPForm({ ...pForm, insurance_id: v })}
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-3">
              Emergency Contact
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FInput
                label="Name"
                placeholder="e.g. Emeka Okafor"
                value={pForm.emergency_contact_name}
                onChange={(v) => setPForm({ ...pForm, emergency_contact_name: v })}
              />
              <FInput
                label="Phone"
                placeholder="08098765432"
                value={pForm.emergency_contact_phone}
                onChange={(v) => setPForm({ ...pForm, emergency_contact_phone: v })}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 sm:px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-50 border border-slate-200 text-slate-500 font-semibold text-sm rounded-xl hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !pForm.full_name.trim()}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-black text-sm rounded-xl transition flex items-center justify-center gap-2"
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : <><CheckCircle size={14} /> {editTarget ? "Save Changes" : "Register Patient"}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}