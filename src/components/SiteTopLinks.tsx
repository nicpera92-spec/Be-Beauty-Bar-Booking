"use client";

import { usePathname } from "next/navigation";
import { CustomerShortcuts } from "@/components/PageTopLinks";

/** Pages that show the shortcuts in their own top row, next to the Home link. */
function hasOwnTopRow(pathname: string): boolean {
  return (
    /^\/book(\/|$)/.test(pathname) ||
    (/^\/booking\//.test(pathname) && !pathname.startsWith("/booking/deposit-confirmed")) ||
    pathname === "/my-bookings" ||
    pathname === "/gift-vouchers"
  );
}

/** Customer shortcuts top-right on public pages without their own Home row (not in admin). */
export default function SiteTopLinks() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/admin") || hasOwnTopRow(pathname)) return null;

  return (
    <div className="absolute top-0 inset-x-0 z-20 flex justify-end px-5 sm:px-8 pt-4 sm:pt-5">
      <CustomerShortcuts />
    </div>
  );
}
