"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WorkingHoursEditor from "@/components/WorkingHoursEditor";
import {
  defaultWeeklyHours,
  type WeeklyWorkingHours,
} from "@/lib/workingHours";

const ADMIN_TOKEN_KEY = "admin-token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function AdminMyHoursPage() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [hours, setHours] = useState<WeeklyWorkingHours>(defaultWeeklyHours);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
          sessionStorage.removeItem("admin-role");
          router.replace("/admin");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.role) sessionStorage.setItem("admin-role", data.role);
        if (data.role === "master") {
          // Owner edits hours from Staff; keep this page for technicians.
          router.replace("/admin/technicians");
          return;
        }
        return fetch("/api/admin/my-working-hours", {
          headers: getAuthHeaders(),
          cache: "no-store",
        });
      })
      .then((r) => {
        if (!r) return null;
        return r.json().then((data) => ({ ok: r.ok, data }));
      })
      .then((result) => {
        if (!result) return;
        if (!result.ok) {
          setError(result.data?.error ?? "Could not load hours");
          return;
        }
        setName(result.data.name ?? null);
        if (result.data.workingHours) setHours(result.data.workingHours);
      })
      .catch(() => setError("Could not load hours"))
      .finally(() => setLoading(false));
  }, [router]);

  const save = () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    fetch("/api/admin/my-working-hours", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ workingHours: hours }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.error ?? "Save failed");
        if (data.workingHours) setHours(data.workingHours);
        setSuccess(true);
      })
      .catch((err) => setError(err?.message ?? "Could not save hours"))
      .finally(() => setSaving(false));
  };

  if (hasToken === null) return null;
  if (!hasToken) {
    router.replace("/admin");
    return null;
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link href="/admin" className="text-sm text-sky-600 hover:underline mb-6 inline-block">
        ← Back to admin
      </Link>
      <h1 className="font-serif text-2xl font-semibold text-charcoal mb-1">
        My working hours
      </h1>
      <p className="text-slate-500 text-sm mb-6">
        {name ? `${name} — ` : ""}
        Set when you are available each day. Customers can only book within these hours.
      </p>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
          <WorkingHoursEditor value={hours} onChange={setHours} disabled={saving} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-700">Hours saved.</p>}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-navy text-white px-5 py-2.5 rounded-lg font-medium hover:bg-navy-light disabled:opacity-50 transition min-h-[44px]"
          >
            {saving ? "Saving…" : "Save hours"}
          </button>
        </div>
      )}
    </div>
  );
}
