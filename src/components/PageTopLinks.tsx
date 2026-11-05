"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

/** "← Back" to the previous page on this site; opened from an email/text link it goes Home instead. */
export function BackButton({ fallbackHref = "/" }: { fallbackHref?: string }) {
  const router = useRouter();
  const goBack = () => {
    const cameFromSite =
      typeof document !== "undefined" &&
      document.referrer.startsWith(window.location.origin) &&
      window.history.length > 1;
    if (cameFromSite) router.back();
    else router.push(fallbackHref);
  };
  return (
    <button type="button" onClick={goBack} className="text-sm text-navy hover:underline">
      ← Back
    </button>
  );
}

/** Home + Back on the left, customer shortcuts on the right. */
export function HomeBackLinks({ className }: { className?: string }) {
  return (
    <PageTopLinks className={className}>
      <Link href="/" className="text-sm text-navy hover:underline">
        Home
      </Link>
      <BackButton />
    </PageTopLinks>
  );
}

/** My Bookings · Gift Certificates, styled like the page's own Home/back links. */
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
        Gift Certificates
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
