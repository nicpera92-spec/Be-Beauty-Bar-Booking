"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy route — themes now live under Settings → Branding. */
export default function AdminThemeRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/settings?tab=branding");
  }, [router]);
  return null;
}
