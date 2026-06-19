"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBookingDateFriendly } from "@/lib/format";
import AdminNav from "@/components/AdminNav";
import { CopyPhoneButton } from "@/components/CopyPhoneButton";

const ADMIN_TOKEN_KEY = "admin-token";
const ADMIN_ROLE_KEY = "admin-role";
const ADMIN_NAME_KEY = "admin-name";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

type WaitlistEntry = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  notifyByEmail: boolean;
  notifyBySMS: boolean;
  preferredDate: string;
  notifyEarliest: boolean;
  status: string;
  lastNotifiedAt: string | null;
  service: { name: string };
  technician: { name: string };
};

export default function AdminWaitlistPage() {
  const router = useRouter();
  const [staffRole, setStaffRole] = useState<"master" | "technician">("master");
  const [staffName, setStaffName] = useState<string | null>(null);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(() => {
    fetch("/api/admin/waitlist", { headers: getAuthHeaders() })
      .then((r) => {
        if (r.status === 401) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          router.replace("/admin");
          return [];
        }
        if (r.status === 403) {
          router.replace("/admin");
          return [];
        }
        return r.json();
      })
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      router.replace("/admin");
      return;
    }
    const role = sessionStorage.getItem(ADMIN_ROLE_KEY);
    const name = sessionStorage.getItem(ADMIN_NAME_KEY);
    setStaffRole(role === "technician" ? "technician" : "master");
    setStaffName(name);

    fetch("/api/admin/verify-session", { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || data.role !== "master") {
          router.replace("/admin");
          return;
        }
        fetchEntries();
      })
      .catch(() => router.replace("/admin"));
  }, [router, fetchEntries]);

  const remove = (id: string) => {
    if (!confirm("Remove this person from the waiting list?")) return;
    fetch(`/api/admin/waitlist/${id}`, { method: "DELETE", headers: getAuthHeaders() })
      .then((r) => {
        if (r.ok) fetchEntries();
      })
      .catch(() => {});
  };

  const logout = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_ROLE_KEY);
    sessionStorage.removeItem(ADMIN_NAME_KEY);
    router.replace("/admin");
  };

  const active = entries.filter((e) => e.status === "active");
  const other = entries.filter((e) => e.status !== "active");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <AdminNav staffRole={staffRole} staffName={staffName} onLogout={logout} />

      <div className="mb-4">
        <h2 className="font-serif text-xl font-semibold text-charcoal">Waiting list</h2>
        <p className="text-sm text-charcoal/60 mt-1">
          Customers waiting for fully booked days. Entries expire automatically after the requested date passes.
        </p>
      </div>

      {loading ? (
        <p className="text-charcoal/60 text-sm">Loading…</p>
      ) : active.length === 0 && other.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-charcoal/60">
          No one on the waiting list right now.
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="space-y-3">
              {active.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-charcoal">{entry.customerName}</p>
                    <p className="text-sm text-charcoal/80 mt-0.5">
                      {entry.service.name} · {entry.technician.name}
                    </p>
                    <p className="text-sm text-charcoal/70 mt-1">
                      Wants: {formatBookingDateFriendly(entry.preferredDate)}
                      {entry.notifyEarliest && (
                        <span className="text-charcoal/50"> · earlier dates too</span>
                      )}
                    </p>
                    <p className="text-xs text-charcoal/55 mt-2">
                      {entry.customerPhone ? (
                        <CopyPhoneButton phone={entry.customerPhone} />
                      ) : (
                        entry.customerEmail || "No contact"
                      )}
                      {" · "}
                      {entry.notifyByEmail && entry.notifyBySMS
                        ? "Email + SMS"
                        : entry.notifyByEmail
                          ? "Email"
                          : "SMS"}
                      {entry.lastNotifiedAt && (
                        <> · Notified {new Date(entry.lastNotifiedAt).toLocaleDateString("en-GB")}</>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(entry.id)}
                    className="text-sm text-red-600 hover:underline shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {other.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-charcoal/45 mb-2">
                Expired / inactive
              </p>
              <div className="space-y-2 opacity-70">
                {other.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-charcoal/70 flex justify-between gap-2"
                  >
                    <span>
                      {entry.customerName} · {entry.service.name} ·{" "}
                      {formatBookingDateFriendly(entry.preferredDate)}
                    </span>
                    <span className="text-xs capitalize">{entry.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
