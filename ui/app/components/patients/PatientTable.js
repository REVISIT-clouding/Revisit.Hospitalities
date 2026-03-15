"use client";
import { useState } from "react";
import {
  ChevronRight,
  Users,
  Loader2,
  ShieldCheck,
} from "lucide-react";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function calcAge(dob) {
  if (!dob) return null;
  return Math.floor(
    (Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25)
  );
}
function timeAgo(d) {
  if (!d) return "";
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

const PER_PAGE = 15;

export default function PatientTable({
  patients,
  loading,
  onSelectPatient,
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  /* ── Filter ── */
  const filtered = patients.filter((p) => {
    const t = search.toLowerCase().trim();
    if (!t) return true;
    return (
      p.full_name?.toLowerCase().includes(t) ||
      p.patient_id?.toLowerCase().includes(t) ||
      p.phone?.includes(t) ||
      p.nhia_number?.toLowerCase().includes(t)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE
  );

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name, ID, phone…"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-4 pr-4 text-sm text-slate-900 placeholder:text-slate-300 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-bold text-slate-400">
            {filtered.length} patient{filtered.length !== 1 ? "s" : ""}
            {search && (
              <span className="text-teal-600 ml-1.5">· "{search}"</span>
            )}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                  Patient
                </th>
                <th className="hidden sm:table-cell px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                  ID
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                  Age
                </th>
                <th className="hidden sm:table-cell px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                  Blood
                </th>
                <th className="hidden lg:table-cell px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                  Insurance
                </th>
                <th className="hidden md:table-cell px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                  Phone
                </th>
                <th className="hidden lg:table-cell px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                  Registered
                </th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Loader2
                      size={20}
                      className="text-teal-500 animate-spin mx-auto mb-2"
                    />
                    <p className="text-xs text-slate-400">Loading records…</p>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Users size={28} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-400">
                      No patients found
                    </p>
                    <p className="text-xs text-slate-300 mt-1">
                      {search
                        ? "Try a different search."
                        : "Use Quick Register above."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onSelectPatient(p)}
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-[11px] font-black text-teal-700 shrink-0">
                          {(p.full_name || "?")
                            .split(" ")
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 leading-tight">
                            {p.full_name}
                          </p>
                          <p className="text-[10px] font-black text-teal-500 font-mono sm:hidden mt-0.5">
                            {p.patient_id || "—"}
                          </p>
                          {p.nhia_number && (
                            <p className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5 mt-0.5">
                              <ShieldCheck size={9} /> NHIA
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      <span className="text-[11px] font-black text-teal-600 font-mono">
                        {p.patient_id || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-sm text-slate-500">
                          {p.date_of_birth
                            ? `${calcAge(p.date_of_birth)}y`
                            : "—"}
                        </span>
                        <p className="text-[10px] text-slate-400 md:hidden mt-0.5">
                          {p.phone || ""}
                        </p>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      {p.blood_group ? (
                        <span className="text-xs font-black px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-600">
                          {p.blood_group}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3">
                      <span className="text-xs text-slate-500">
                        {p.insurance_provider || (
                          <span className="text-slate-300">—</span>
                        )}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3">
                      <span className="text-sm text-slate-500">
                        {p.phone || <span className="text-slate-300">—</span>}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3">
                      <span className="text-xs text-slate-400">
                        {timeAgo(p.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight
                        size={13}
                        className="text-slate-300 group-hover:text-teal-500 transition inline-block"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 flex-wrap gap-2">
            <p className="text-xs text-slate-500">
              <strong>
                {(safePage - 1) * PER_PAGE + 1}–
                {Math.min(safePage * PER_PAGE, filtered.length)}
              </strong>{" "}
              of <strong>{filtered.length}</strong>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 font-bold"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                    safePage === p
                      ? "bg-teal-600 text-white"
                      : "text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 font-bold"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}