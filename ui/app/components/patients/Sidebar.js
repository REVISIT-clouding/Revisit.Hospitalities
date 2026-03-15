"use client";
import { useRouter } from "next/navigation";
import {
  Activity,
  LayoutGrid,
  Users,
  Calendar,
  ClipboardList,
  FlaskConical,
  Pill,
  CreditCard,
  Settings,
  LogOut,
  User,
  X,
} from "lucide-react";

export default function Sidebar({ hospital, user, onClose, activePage = "patients" }) {
  const router = useRouter();

  function handleLogout() {
    document.cookie = "token=; path=/; max-age=0";
    localStorage.removeItem("hospital");
    localStorage.removeItem("user");
    router.push("/login");
  }

  const clinicalNav = [
    { icon: <LayoutGrid size={14} />, label: "Dashboard",     page: "dashboard" },
    { icon: <Users size={14} />,      label: "Patients",      page: "patients" },
    { icon: <Calendar size={14} />,   label: "Appointments",  page: "appointments" },
    { icon: <ClipboardList size={14} />, label: "Visit Records", page: "visits" },
    { icon: <FlaskConical size={14} />, label: "Laboratory",  page: "laboratory" },
    { icon: <Pill size={14} />,       label: "Pharmacy",      page: "pharmacy" },
  ];

  const adminNav = [
    { icon: <CreditCard size={14} />, label: "Billing",  page: "billing" },
    { icon: <Settings size={14} />,   label: "Settings", page: "settings" },
  ];

  function NavItem({ icon, label, page, danger = false }) {
    const isActive = activePage === page;
    return (
      <div
        onClick={() => {
          if (danger) { handleLogout(); return; }
          router.push(`/${hospital?.slug}/${page}`);
          onClose?.();
        }}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-[13px] font-semibold transition-all
          ${isActive
            ? "bg-teal-50 text-teal-700 border border-teal-100"
            : danger
            ? "text-slate-400 hover:text-red-500 hover:bg-red-50"
            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
      >
        <span className={isActive ? "text-teal-600" : ""}>{icon}</span>
        {label}
      </div>
    );
  }

  return (
    <>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shrink-0 shadow-sm">
            <Activity size={17} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 leading-tight">
              {hospital?.name || "Loading…"}
            </p>
            <p className="text-[9px] font-bold text-teal-500 uppercase tracking-widest mt-0.5">
              Medical Center
            </p>
          </div>
          {/* Close button — mobile only */}
          {onClose && (
            <button
              onClick={onClose}
              className="ml-auto md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-0.5 overflow-y-auto">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-3 mb-1">
          Clinical
        </p>
        {clinicalNav.map((item) => (
          <NavItem key={item.page} {...item} />
        ))}

        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-3 mt-4 mb-1">
          Admin
        </p>
        {adminNav.map((item) => (
          <NavItem key={item.page} {...item} />
        ))}
        <NavItem
          icon={<LogOut size={14} />}
          label="Logout"
          page="logout"
          danger
        />
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
            <User size={13} className="text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">
              {user?.name || "Staff"}
            </p>
            <p className="text-[10px] text-slate-400 capitalize">
              {user?.role || "Admin Desk"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}