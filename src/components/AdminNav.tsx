"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const iconProps = {
  className: "w-[18px] h-[18px]",
  fill: "none",
  viewBox: "0 0 24 24",
  strokeWidth: 1.7,
  stroke: "currentColor",
} as const;

export const ADMIN_NAV_ICONS: Record<string, React.ReactNode> = {
  calendar: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M4.5 6h15a.75.75 0 01.75.75v12.75a.75.75 0 01-.75.75h-15a.75.75 0 01-.75-.75V6.75A.75.75 0 014.5 6z" />
    </svg>
  ),
  settings: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  technicians: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  services: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
  waitlist: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm0 5.25h.007v.008H3.75v-.008zm0 5.25h.007v.008H3.75v-.008z" />
    </svg>
  ),
  bookings: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15.75h3.75M9 18.75h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  ),
};

export function navShortLabel(label: string): string {
  if (label === "Technicians") return "Staff";
  if (label === "My services") return "Services";
  if (label === "My calendar") return "Calendar";
  if (label === "Waiting list") return "Waitlist";
  return label;
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getAdminNavItems(role: "master" | "technician") {
  return role === "master"
    ? [
        { href: "/admin", label: "Bookings", icon: ADMIN_NAV_ICONS.bookings },
        { href: "/admin/calendar", label: "Calendar", icon: ADMIN_NAV_ICONS.calendar },
        { href: "/admin/waitlist", label: "Waiting list", icon: ADMIN_NAV_ICONS.waitlist },
        { href: "/admin/technicians", label: "Technicians", icon: ADMIN_NAV_ICONS.technicians },
        { href: "/admin/services", label: "Services", icon: ADMIN_NAV_ICONS.services },
      ]
    : [
        { href: "/admin/services", label: "My services", icon: ADMIN_NAV_ICONS.services },
        { href: "/admin/calendar", label: "My calendar", icon: ADMIN_NAV_ICONS.calendar },
      ];
}

type AdminNavProps = {
  staffRole: "master" | "technician";
  staffName: string | null;
  onLogout?: () => void;
};

export default function AdminNav({ staffRole, staffName, onLogout }: AdminNavProps) {
  const pathname = usePathname();
  const navItems = getAdminNavItems(staffRole);

  return (
    <header className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-100">
        <div className="min-w-0 flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-lg sm:text-xl font-semibold text-charcoal leading-tight truncate">
            Hello{staffName ? `, ${staffName}` : ""}
          </h1>
          <span
            className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${
              staffRole === "master" ? "bg-amber-50 text-amber-700" : "bg-navy/10 text-navy"
            }`}
          >
            {staffRole === "master" ? "Owner" : "Technician"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/"
            className="inline-flex items-center min-h-[38px] px-3 py-1.5 rounded-lg text-sm text-charcoal/70 hover:text-charcoal hover:bg-slate-50 transition"
          >
            ← Back to site
          </Link>
          {staffRole === "master" ? (
            <Link
              href="/admin/settings"
              title="Business settings"
              aria-label="Business settings"
              className="inline-flex items-center justify-center min-h-[38px] min-w-[38px] rounded-lg border border-slate-200 text-charcoal/70 hover:text-navy hover:bg-slate-50 hover:border-slate-300 transition"
            >
              {ADMIN_NAV_ICONS.settings}
            </Link>
          ) : (
            <>
              <Link
                href="/admin/change-password"
                className="inline-flex items-center min-h-[38px] px-3 py-1.5 rounded-lg text-sm text-charcoal/70 hover:text-charcoal hover:bg-slate-50 transition"
              >
                Change password
              </Link>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center min-h-[38px] px-3.5 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-charcoal hover:bg-slate-50 hover:border-slate-300 transition"
                >
                  Log out
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <nav className="px-2 pb-2 sm:px-5 sm:pb-0">
        <div className="flex gap-0.5 p-0.5 sm:hidden overflow-x-auto">
          {navItems.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={`flex-1 min-w-[4.5rem] flex items-center justify-center gap-1 py-1.5 px-1 rounded-md transition touch-manipulation ${
                  active ? "bg-navy text-white" : "text-charcoal hover:bg-slate-50"
                }`}
              >
                <span
                  className={`shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 ${
                    active ? "text-white" : "text-slate-400"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="text-[10px] font-medium leading-none truncate">
                  {navShortLabel(item.label)}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="hidden sm:flex flex-wrap items-center gap-x-6 gap-y-1">
          {navItems.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={`group inline-flex items-center gap-2 min-h-[44px] py-2.5 -mb-px border-b-2 text-sm font-medium transition-colors touch-manipulation ${
                  active
                    ? "border-navy text-navy"
                    : "border-transparent text-charcoal/70 hover:text-navy hover:border-navy"
                }`}
              >
                <span
                  className={`transition-colors ${
                    active ? "text-navy" : "text-slate-400 group-hover:text-navy"
                  }`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
