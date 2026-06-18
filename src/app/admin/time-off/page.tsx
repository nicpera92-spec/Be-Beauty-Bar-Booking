"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Time off is managed from the calendar — tap a day to block time. */
export default function AdminTimeOffRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/calendar");
  }, [router]);
  return null;
}
