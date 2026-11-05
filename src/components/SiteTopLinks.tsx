"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Customer shortcuts shown top-right on every public page (not in admin). */
export default function SiteTopLinks() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  const linkClass = (href: string) =>
    `transition hover:underline ${pathname === href ? "text-navy font-semibold" : "text-navy"}`;

  return (
    <nav
      aria-label="Customer links"
      className="absolute top-0 inset-x-0 z-20 flex justify-end gap-5 px-5 sm:px-8 pt-4 sm:pt-5 text-sm"
    >
      <Link href="/my-bookings" className={linkClass("/my-bookings")}>
        My Bookings
      </Link>
      <Link href="/gift-vouchers" className={linkClass("/gift-vouchers")}>
        Gift Vouchers
      </Link>
    </nav>
  );
}
