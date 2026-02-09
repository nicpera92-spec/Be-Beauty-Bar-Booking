"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ADMIN_TOKEN_KEY = "admin-token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function AdminChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    setHasToken(!!sessionStorage.getItem(ADMIN_TOKEN_KEY));
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    fetch("/api/admin/change-password", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      })
      .catch((err) => setError(err?.message ?? "Failed to change password"))
      .finally(() => setLoading(false));
  };

  if (hasToken === null) return null;
  if (!hasToken) {
    router.replace("/admin");
    return null;
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link href="/admin" className="text-sm text-sky-600 hover:underline mb-6 inline-block">
        ← Back to admin
      </Link>
      <h1 className="font-serif text-2xl font-semibold text-charcoal mb-6">
        Change password
      </h1>

      {success ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-800">
          <p className="font-medium">Password updated.</p>
          <p className="text-sm mt-1">Use your new password next time you log in.</p>
          <Link href="/admin" className="mt-4 inline-block text-sm text-sky-600 hover:underline">
            Back to admin
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="current" className="block text-sm font-medium text-charcoal mb-1">
              Current password
            </label>
            <input
              id="current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
              required
            />
          </div>
          <div>
            <label htmlFor="new" className="block text-sm font-medium text-charcoal mb-1">
              New password
            </label>
            <input
              id="new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
              minLength={6}
              required
            />
            <p className="text-xs text-charcoal/50 mt-1">At least 6 characters.</p>
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-charcoal mb-1">
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
              minLength={6}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-black disabled:opacity-50 transition"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}
