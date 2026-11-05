"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Footer() {
  const [businessName, setBusinessName] = useState("Be Beauty Bar");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.businessName) {
          setBusinessName(data.businessName);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="border-t border-slate-200 bg-white/90 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] text-center">
      <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-3 text-sm">
        <Link href="/my-bookings" className="text-navy hover:underline">
          My bookings
        </Link>
        <Link href="/gift-vouchers" className="text-navy hover:underline">
          Gift vouchers
        </Link>
      </nav>
      <p className="text-slate-500 text-sm">
        © {new Date().getFullYear()} {businessName}
      </p>
    </footer>
  );
}
