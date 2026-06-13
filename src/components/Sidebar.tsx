"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { SEASON_MONTHS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { YearSelector } from "./YearSelector";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/staff", label: "Staff Setup", icon: UsersIcon },
  { href: "/ship-requests", label: "Ship Requests", icon: ClipboardIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
  { href: "/change-log", label: "Change Log", icon: HistoryIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [rostersOpen, setRostersOpen] = useState(
    pathname.startsWith("/rosters"),
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between bg-vb-navy text-white px-4 h-14">
        <span className="font-heading font-bold text-lg">Rota Manager</span>
        <button
          aria-label="Toggle menu"
          onClick={() => setMobileOpen((o) => !o)}
          className="p-2"
        >
          <BarsIcon />
        </button>
      </div>

      <aside
        className={`${
          mobileOpen ? "block" : "hidden"
        } md:block bg-vb-navy text-white w-full md:w-60 md:min-w-60 md:h-screen md:sticky md:top-0 flex-shrink-0 overflow-y-auto`}
      >
        <div className="hidden md:block px-5 py-5 border-b border-white/10">
          <span className="font-heading font-bold text-xl tracking-tight">
            Rota Manager
          </span>
          <p className="text-[11px] text-white/60 mt-0.5">
            Visit Belfast · CWA Operations
          </p>
        </div>

        <div className="px-4 py-4 border-b border-white/10">
          <label className="block text-[11px] uppercase tracking-wide text-white/50 mb-1.5">
            Season Year
          </label>
          <YearSelector />
        </div>

        <nav className="py-3">
          <NavLink
            href="/dashboard"
            label="Dashboard"
            icon={HomeIcon}
            active={isActive("/dashboard")}
            onClick={() => setMobileOpen(false)}
          />

          {/* Rosters (expandable) */}
          <button
            onClick={() => setRostersOpen((o) => !o)}
            className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-white/10 transition ${
              pathname.startsWith("/rosters") ? "bg-white/10" : ""
            }`}
          >
            <CalendarIcon />
            <span className="flex-1 text-left">Rosters</span>
            <ChevronIcon open={rostersOpen} />
          </button>
          {rostersOpen && (
            <div className="bg-black/15">
              {SEASON_MONTHS.map((m) => (
                <Link
                  key={m.value}
                  href={`/rosters/${m.name.toLowerCase()}`}
                  onClick={() => setMobileOpen(false)}
                  className={`block pl-14 pr-5 py-2 text-[13px] hover:bg-white/10 transition ${
                    pathname.startsWith(`/rosters/${m.name.toLowerCase()}`)
                      ? "text-vb-teal font-semibold"
                      : "text-white/85"
                  }`}
                >
                  {m.name}
                </Link>
              ))}
            </div>
          )}

          {navItems.slice(1).map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10 mt-auto">
          <button
            onClick={signOut}
            className="w-full text-left text-[13px] text-white/70 hover:text-white flex items-center gap-2"
          >
            <LogoutIcon /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: () => React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-white/10 transition ${
        active ? "bg-white/10 border-l-2 border-vb-teal" : ""
      }`}
    >
      <Icon />
      <span>{label}</span>
    </Link>
  );
}

/* --- inline icons (no extra deps) --- */
function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M16 7a3 3 0 010 6" /><path d="M21 20c0-2-1.5-3.5-3.5-4.2" />
    </svg>
  );
}
function ClipboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4h6v3H9z" /><path d="M9 11h6M9 15h6" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </svg>
  );
}
function HistoryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.3" /><path d="M3 4v4h4" /><path d="M12 8v4l3 2" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      className={`transition-transform ${open ? "rotate-90" : ""}`}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
function BarsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
