"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminWaitlistRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin?tab=waitlist");
  }, [router]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <p className="text-charcoal/60 text-sm">Loading…</p>
    </div>
  );
}
