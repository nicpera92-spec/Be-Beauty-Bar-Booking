"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** My Bookings · Gift Vouchers, styled like the page's own Home/back links. */
export function CustomerShortcuts() {
  const pathname = usePathname();
  const linkClass = (href: string) =>
    `text-sm text-navy hover:underline ${pathname === href ? "font-semibold" : ""}`;
  return (
    <nav aria-label="Customer links" className="flex gap-x-5 shrink-0">
      <Link href="/my-bookings" className={linkClass("/my-bookings")}>
        My Bookings
      </Link>
      <Link href="/gift-vouchers" className={linkClass("/gift-vouchers")}>
        Gift Vouchers
      </Link>
    </nav>
  );
}

/** Top row of a page: Home/back links on the left, customer shortcuts on the right, same line. */
export default function PageTopLinks({
  children,
  className = "mb-8",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-x-4 text-left ${className}`}>
      <div className="flex flex-wrap gap-x-6 gap-y-1 min-w-0">{children}</div>
      <CustomerShortcuts />
    </div>
  );
}
