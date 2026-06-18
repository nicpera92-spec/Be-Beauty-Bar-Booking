"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeEditor from "@/components/ThemeEditor";
import { DEFAULT_PRIMARY, DEFAULT_SECONDARY } from "@/lib/themePalettes";
import { publishThemeUpdate } from "@/lib/themeClient";

const ADMIN_TOKEN_KEY = "admin-token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  if (!t) return {};
  return { Authorization: `Bearer ${t}`, "X-Admin-Token": t };
}

export default function AdminThemePage() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      setHasToken(false);
      return;
    }
    setHasToken(true);

    fetch("/api/admin/verify-session", { headers: getAuthHeaders() })
      .then((r) => {
        if (!r.ok) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          router.replace("/admin");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.role !== "master") {
          router.replace("/admin");
        }
      })
      .catch(() => router.replace("/admin"));
  }, [router]);

  useEffect(() => {
    if (!hasToken) return;
    fetch("/api/admin/settings", { headers: getAuthHeaders() })
      .then((r) => {
        if (r.status === 401) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          router.replace("/admin");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        const primary = data.primaryColor ?? DEFAULT_PRIMARY;
        const secondary = data.secondaryColor ?? DEFAULT_SECONDARY;
        setPrimaryColor(primary);
        setSecondaryColor(secondary);
        publishThemeUpdate(primary, secondary);
      })
      .catch(() => {});
  }, [hasToken, router]);

  const saveTheme = async (primary: string, secondary: string): Promise<boolean> => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const r = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ primaryColor: primary, secondaryColor: secondary }),
      });
      if (r.status === 401) {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        router.replace("/admin");
        return false;
      }
      const data = await r.json();
      if (!r.ok) {
        setSaveMessage({ ok: false, message: data.error ?? "Could not save theme" });
        return false;
      }
      setPrimaryColor(data.primaryColor ?? primary);
      setSecondaryColor(data.secondaryColor ?? secondary);
      publishThemeUpdate(data.primaryColor ?? primary, data.secondaryColor ?? secondary);
      setSaveMessage({ ok: true, message: "Theme saved — applied across booking and admin." });
      router.refresh();
      return true;
    } catch {
      setSaveMessage({ ok: false, message: "Save request failed" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (hasToken === null) return null;
  if (!hasToken) {
    router.replace("/admin");
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link href="/admin" className="text-sm text-sky-600 hover:underline mb-6 inline-block">
        ← Back to admin
      </Link>
      <h1 className="font-serif text-2xl font-semibold text-charcoal mb-2">Theme</h1>
      <p className="text-sm text-slate-500 mb-8">
        Pick a ready-made colour theme for your booking site and admin area.
      </p>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <ThemeEditor
          initialPrimary={primaryColor}
          initialSecondary={secondaryColor}
          onSave={saveTheme}
          saving={saving}
          saveMessage={saveMessage}
        />
      </section>
    </div>
  );
}
