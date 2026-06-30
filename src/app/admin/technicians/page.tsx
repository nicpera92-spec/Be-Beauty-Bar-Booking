"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ADMIN_TOKEN_KEY = "admin-token";

const SKILL_LEVELS = ["Master", "Senior", "Junior"];

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

type Technician = {
  id: string;
  name: string;
  bio: string | null;
  skillLevel: string | null;
  instagramHandle: string | null;
  role: string;
  loginEmail: string | null;
  active: boolean;
};

export default function AdminTechniciansPage() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [name, setName] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [bio, setBio] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTechnicians = () => {
    fetch(`/api/admin/technicians?_=${Date.now()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    })
      .then((r) => {
        if (r.status === 401) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          router.replace("/admin");
          return [];
        }
        return r.json();
      })
      .then((data) => setTechnicians(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

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
        if (data.role) {
          sessionStorage.setItem("admin-role", data.role);
        }
        if (data.role !== "master") {
          router.replace("/admin");
        }
      })
      .catch(() => router.replace("/admin"));
  }, [router]);

  useEffect(() => {
    if (!hasToken) return;
    fetchTechnicians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken]);

  if (hasToken === null) return null;
  if (!hasToken) {
    router.replace("/admin");
    return null;
  }

  const addTechnician = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    fetch("/api/admin/technicians", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        name: name.trim(),
        skillLevel: skillLevel.trim(),
        bio: bio.trim(),
        instagramHandle: instagramHandle.trim() || undefined,
        loginEmail: loginEmail.trim() || undefined,
        password: password || undefined,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setName("");
        setSkillLevel("");
        setBio("");
        setInstagramHandle("");
        setLoginEmail("");
        setPassword("");
        fetchTechnicians();
      })
      .catch((err) => setError(err?.message ?? "Could not add technician"))
      .finally(() => setSaving(false));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link href="/admin" className="text-sm text-sky-600 hover:underline mb-6 inline-block">
        ← Back to admin
      </Link>
      <h1 className="font-serif text-2xl font-semibold text-charcoal mb-2">
        Technicians
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        Only <strong>Sveta&apos;s master login</strong> (business owner account) can add or remove
        technicians here. Technicians get their own login to manage their services and bookings.
        All customer deposits and card payments go to the <strong>same business Stripe account</strong>{" "}
        (set in Business settings).
      </p>

      <form
        onSubmit={addTechnician}
        className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 mb-10 space-y-4"
      >
        <h2 className="font-medium text-charcoal">Add a technician</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tech-name" className="block text-sm font-medium text-charcoal mb-1">
              Name *
            </label>
            <input
              id="tech-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white min-h-[44px]"
              placeholder="e.g. Svitlana"
            />
          </div>
          <div>
            <label htmlFor="tech-skill" className="block text-sm font-medium text-charcoal mb-1">
              Skill level
            </label>
            <select
              id="tech-skill"
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white min-h-[44px]"
            >
              <option value="">Select skill level…</option>
              {SKILL_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="tech-bio" className="block text-sm font-medium text-charcoal mb-1">
            Bio
          </label>
          <textarea
            id="tech-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
            placeholder="A short description shown to customers."
          />
        </div>
        <div>
          <label htmlFor="tech-instagram" className="block text-sm font-medium text-charcoal mb-1">
            Instagram
          </label>
          <input
            id="tech-instagram"
            type="text"
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white min-h-[44px]"
            placeholder="e.g. @username or instagram.com/username"
          />
          <p className="text-xs text-slate-500 mt-1">
            Optional. Shown to customers when they choose a technician.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tech-email" className="block text-sm font-medium text-charcoal mb-1">
              Login email
            </label>
            <input
              id="tech-email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white min-h-[44px]"
              placeholder="e.g. alyssa@bebeauty.bar"
            />
          </div>
          <div>
            <label htmlFor="tech-password" className="block text-sm font-medium text-charcoal mb-1">
              Password
            </label>
            <input
              id="tech-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white min-h-[44px]"
              placeholder="Set login password"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-navy text-white px-5 py-2.5 rounded-lg font-medium hover:bg-navy-light disabled:opacity-50 transition min-h-[44px]"
        >
          {saving ? "Adding…" : "Add technician"}
        </button>
      </form>

      <h2 className="font-medium text-charcoal mb-4">
        Technicians ({technicians.length})
      </h2>
      {technicians.length === 0 ? (
        <p className="text-slate-500 text-sm">No technicians yet. Add your first above.</p>
      ) : (
        <div className="space-y-4">
          {technicians.map((t) => (
            <AdminTechnicianRow
              key={t.id}
              technician={t}
              getAuthHeaders={getAuthHeaders}
              onUpdate={fetchTechnicians}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminTechnicianRow({
  technician,
  getAuthHeaders,
  onUpdate,
}: {
  technician: Technician;
  getAuthHeaders: () => Record<string, string>;
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(technician.name);
  const [skillLevel, setSkillLevel] = useState(technician.skillLevel ?? "");
  const [bio, setBio] = useState(technician.bio ?? "");
  const [instagramHandle, setInstagramHandle] = useState(technician.instagramHandle ?? "");
  const [loginEmail, setLoginEmail] = useState(technician.loginEmail ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMaster = technician.role === "master";

  const patch = (data: Record<string, unknown>, after?: () => void) => {
    setBusy(true);
    setError(null);
    fetch(`/api/admin/technicians/${technician.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(data),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.error) throw new Error(res.error);
        after?.();
        onUpdate();
      })
      .catch((err) => setError(err?.message ?? "Update failed"))
      .finally(() => setBusy(false));
  };

  const save = () => {
    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    patch(
      {
        name: name.trim(),
        skillLevel: skillLevel.trim(),
        bio: bio.trim(),
        instagramHandle: instagramHandle.trim() || null,
        loginEmail: loginEmail.trim() || null,
        password: password || undefined,
      },
      () => setEditing(false)
    );
  };

  const remove = () => {
    if (!confirm(`Remove ${technician.name}? Existing bookings will be kept but no longer linked to this technician.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    fetch(`/api/admin/technicians/${technician.id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
      .then((r) => (r.ok ? onUpdate() : Promise.reject()))
      .catch(() => setError("Could not remove technician"))
      .finally(() => setBusy(false));
  };

  if (editing) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Skill level</label>
            <select
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white min-h-[44px]"
            >
              <option value="">Select skill level…</option>
              {SKILL_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Instagram</label>
          <input
            type="text"
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white min-h-[44px]"
            placeholder="e.g. @username"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-light disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setName(technician.name);
              setSkillLevel(technician.skillLevel ?? "");
              setBio(technician.bio ?? "");
              setInstagramHandle(technician.instagramHandle ?? "");
              setError(null);
            }}
            disabled={busy}
            className="px-4 py-2 rounded-lg border border-slate-200 text-charcoal text-sm hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border bg-white p-5 ${
        technician.active ? "border-slate-200" : "border-slate-100 bg-slate-50/60"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-charcoal">
            {technician.name}
            {isMaster && (
              <span className="ml-2 inline-block align-middle text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                Owner
              </span>
            )}
            {technician.skillLevel && (
              <span className="ml-2 inline-block align-middle text-xs font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
                {technician.skillLevel}
              </span>
            )}
            {!technician.active && (
              <span className="ml-2 text-xs text-slate-400">(hidden)</span>
            )}
          </p>
          {isMaster ? (
            <p className="text-xs text-slate-500 mt-1">
              Owner login &amp; password are managed in Business settings.
            </p>
          ) : (
            technician.loginEmail && (
              <p className="text-xs text-slate-500 mt-1">Login: {technician.loginEmail}</p>
            )
          )}
          {technician.instagramHandle && (
            <p className="text-xs text-slate-500 mt-1">
              Instagram: @{technician.instagramHandle.replace(/^@/, "")}
            </p>
          )}
          {technician.bio && technician.bio.trim() && (
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{technician.bio}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center shrink-0">
          <button
            type="button"
            onClick={() => patch({ active: !technician.active })}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-charcoal text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {technician.active ? "Hide" : "Show"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-charcoal text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Edit
          </button>
          {!isMaster && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
