"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { useRouter } from "next/navigation";

const ADMIN_TOKEN_KEY = "admin-token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

type Service = {
  id: string;
  name: string;
  category: string;
  durationMin: number;
  price: number;
  depositAmount: number;
  description: string | null;
  active: boolean;
};

const categoryLabels: Record<string, string> = {
  nails: "Nails",
  lash: "Lash Extensions",
  "permanent-makeup": "Permanent Makeup",
};

// Helper to format category name for display
function formatCategoryName(category: string): string {
  if (categoryLabels[category]) {
    return categoryLabels[category];
  }
  // Format custom categories: "facial-treatments" -> "Facial Treatments"
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function AdminServicesPage() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [defaultDeposit, setDefaultDeposit] = useState<number | null>(null);
  const [defaultPrice, setDefaultPrice] = useState<number | null>(null);

  const fetchServices = () => {
    fetch("/api/admin/services", { headers: getAuthHeaders(), cache: "no-store" })
      .then((r) => {
        if (r.status === 401) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          router.replace("/admin");
          return [];
        }
        return r.json();
      })
      .then((data) => setServices(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => {
    setHasToken(!!sessionStorage.getItem(ADMIN_TOKEN_KEY));
  }, []);

  useEffect(() => {
    if (!hasToken) return;
    fetchServices();
    fetch("/api/admin/settings", { headers: getAuthHeaders() })
      .then((r) => (r.status === 401 ? null : r.json()))
      .then((data) => {
        if (data?.defaultDepositAmount != null) setDefaultDeposit(data.defaultDepositAmount);
        else setDefaultDeposit(null);
        if (data?.defaultPrice != null) setDefaultPrice(data.defaultPrice);
        else setDefaultPrice(null);
      })
      .catch(() => {});
  }, [hasToken]);

  if (hasToken === null) return null;
  if (!hasToken) {
    router.replace("/admin");
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link href="/admin" className="text-sm text-sky-600 hover:underline mb-6 inline-block">
        ← Back to admin
      </Link>
      <h1 className="font-serif text-2xl font-semibold text-charcoal mb-2">
        Services & time slots
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        Each service has a <strong>full price</strong> and <strong>deposit</strong> (deposit ≤ price).
        Set defaults in{" "}
        <Link href="/admin/settings" className="text-sky-600 hover:underline">
          Business settings
        </Link>
        ; time slots use working hours and interval from there.
      </p>

      <div className="space-y-4">
        {services.map((s) => (
          <AdminServiceRow
            key={s.id}
            service={s}
            getAuthHeaders={getAuthHeaders}
            onUpdate={fetchServices}
            allServices={services}
          />
        ))}
      </div>

      <AddServiceForm
        getAuthHeaders={getAuthHeaders}
        defaultDeposit={defaultDeposit ?? 20}
        defaultPrice={defaultPrice ?? 50}
        onAdded={fetchServices}
      />
    </div>
  );
}

function AdminServiceRow({
  service,
  getAuthHeaders,
  onUpdate,
  allServices,
}: {
  service: Service;
  getAuthHeaders: () => Record<string, string>;
  onUpdate: () => void;
  allServices: Service[];
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: service.name,
    category: service.category,
    durationMin: service.durationMin,
    price: service.price,
    depositAmount: service.depositAmount,
    description: service.description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // When not editing, keep form in sync with service (e.g. when revisiting the page or after refetch)
  useEffect(() => {
    if (!editing) {
      setForm({
        name: service.name,
        category: service.category,
        durationMin: service.durationMin,
        price: service.price,
        depositAmount: service.depositAmount,
        description: service.description ?? "",
      });
    }
  }, [editing, service.id, service.name, service.category, service.durationMin, service.price, service.depositAmount, service.description]);

  useEffect(() => {
    if (savedAt == null) return;
    const t = setTimeout(() => setSavedAt(null), 3000);
    return () => clearTimeout(t);
  }, [savedAt]);
  
  // Get all unique categories from all services
  const allCategories = Array.from(new Set(allServices.map((s) => s.category)))
    .sort()
    .filter((cat) => cat);

  const save = (closeAfterSave = true) => {
    if (form.depositAmount > form.price) {
      setSaveError("Deposit cannot exceed full price.");
      return;
    }
    setSaveError(null);
    setSaving(true);
    const payload = {
      name: String(form.name).trim(),
      category: String(form.category).trim(),
      durationMin: Number(form.durationMin) || 30,
      price: Number(form.price) || 0,
      depositAmount: Number(form.depositAmount) || 0,
      description: form.description == null ? "" : String(form.description),
    };
    fetch(`/api/admin/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, status: r.status, data: d })))
      .then(({ ok, status, data }) => {
        if (ok) {
          setSaveError(null);
          setSavedAt(Date.now());
          onUpdate();
          if (closeAfterSave) setEditing(false);
        } else {
          setSaveError(data?.error ?? (status === 401 ? "Session expired" : "Save failed"));
        }
      })
      .catch(() => setSaveError("Save failed"))
      .finally(() => setSaving(false));
  };

  // Auto-save when form changes (debounced) so edits are always persisted
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const formChanged =
    form.name !== service.name ||
    form.category !== service.category ||
    form.durationMin !== service.durationMin ||
    form.price !== service.price ||
    form.depositAmount !== service.depositAmount ||
    (form.description ?? "") !== (service.description ?? "");
  const canSave = editing && formChanged && form.depositAmount <= form.price;

  useEffect(() => {
    if (!canSave) return;
    saveTimeoutRef.current = setTimeout(() => saveRef.current(false), 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editing, form, formChanged]);

  // Save when user clicks away (e.g. another tab, or before navigating) so edits are less likely to be lost
  useEffect(() => {
    if (!canSave) return;
    const onBlur = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      saveRef.current(false);
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [canSave]);

  const toggleActive = () => {
    setSaving(true);
    fetch(`/api/admin/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ active: !service.active }),
    })
      .then(() => onUpdate())
      .finally(() => setSaving(false));
  };

  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const remove = () => {
    if (!confirm("Remove this service permanently? This cannot be undone.")) return;
    setRemoveError(null);
    setRemoving(true);
    fetch(`/api/admin/services/${service.id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (ok) onUpdate();
        else setRemoveError(data?.error ?? "Could not remove service.");
      })
      .catch(() => setRemoveError("Could not remove service."))
      .finally(() => setRemoving(false));
  };

  return (
    <div
      className={`p-4 rounded-xl border bg-white ${
        service.active ? "border-slate-200" : "border-slate-200 opacity-60"
      }`}
    >
      {editing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 outline-none bg-white"
            placeholder="Service name"
          />
          <div>
            <label className="block text-xs text-charcoal/60 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 outline-none bg-white"
            >
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {formatCategoryName(cat)}
                </option>
              ))}
            </select>
            <p className="text-xs text-charcoal/40 mt-1">
              To create a new category, use the "Add service" form below.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-charcoal/60 mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                min={5}
                value={form.durationMin}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    durationMin: parseInt(e.target.value, 10) || 30,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-charcoal/60 mb-1">
                Full price (£)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    price: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-charcoal/60 mb-1">
                Deposit (£)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.depositAmount}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    depositAmount: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 outline-none bg-white"
              />
            </div>
          </div>
          {saveError && (
            <p className="text-sm text-red-600">{saveError}</p>
          )}
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 outline-none bg-white resize-none"
            placeholder="Description (optional)"
          />
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => save(true)}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-black disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {savedAt && Date.now() - savedAt < 3000 && (
              <span className="text-sm text-emerald-600 font-medium">Saved</span>
            )}
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setSaveError(null);
                setForm({
                  name: service.name,
                  category: service.category,
                  durationMin: service.durationMin,
                  price: service.price,
                  depositAmount: service.depositAmount,
                  description: service.description ?? "",
                });
              }}
              className="px-4 py-2 rounded-lg border border-slate-200 text-charcoal text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-charcoal">
                {service.name}
                <span className="ml-2 text-xs text-charcoal/50">
                  {formatCategoryName(service.category)}
                </span>
              </h3>
              {service.description && (
                <p className="text-sm text-charcoal/60 mt-0.5">{service.description}</p>
              )}
              <p className="text-sm text-charcoal/50 mt-1">
                {service.durationMin} min · {formatCurrency(service.price)} · {formatCurrency(service.depositAmount)} deposit
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0 items-center">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sky-600 text-sm hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={toggleActive}
                disabled={saving || removing}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-charcoal/70 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {service.active ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={saving || removing}
                className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 disabled:opacity-50"
              >
                {removing ? "Removing…" : "Remove"}
              </button>
              {removeError && (
                <span className="text-sm text-red-600">{removeError}</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AddServiceForm({
  getAuthHeaders,
  defaultDeposit,
  defaultPrice,
  onAdded,
}: {
  getAuthHeaders: () => Record<string, string>;
  defaultDeposit: number;
  defaultPrice: number;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "nails" as string,
    durationMin: 60,
    price: defaultPrice,
    depositAmount: defaultDeposit,
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [creatingNewCategory, setCreatingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const openForm = () => {
    setForm((f) => ({ ...f, price: defaultPrice, depositAmount: defaultDeposit }));
    setSubmitError(null);
    setCreatingNewCategory(false);
    setNewCategoryName("");
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.depositAmount > form.price) {
      setSubmitError("Deposit cannot exceed full price.");
      return;
    }
    if (creatingNewCategory && !newCategoryName.trim()) {
      setSubmitError("Please enter a category name.");
      return;
    }
    setSubmitError(null);
    setSaving(true);
    
    // If creating a new category, use the new category name (convert to slug)
    const categoryToUse = creatingNewCategory 
      ? newCategoryName.trim().toLowerCase().replace(/\s+/g, "-")
      : form.category;
    
    fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        ...form,
        category: categoryToUse,
      }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (ok) {
          onAdded();
          setOpen(false);
          setForm({ name: "", category: "nails", durationMin: 60, price: defaultPrice, depositAmount: defaultDeposit, description: "" });
          setCreatingNewCategory(false);
          setNewCategoryName("");
        } else {
          setSubmitError(data?.error ?? "Add failed");
        }
      })
      .catch(() => setSubmitError("Add failed"))
      .finally(() => setSaving(false));
  };

  return (
    <div className="mt-8 pt-8 border-t border-slate-200">
      {!open ? (
        <button
          type="button"
          onClick={openForm}
          className="px-4 py-2 rounded-lg border border-dashed border-slate-300 text-sky-600 text-sm font-medium hover:bg-slate-50"
        >
          + Add service
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <h3 className="font-medium text-charcoal">New service</h3>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 outline-none bg-white"
            placeholder="Service name"
          />
          <div>
            <label className="block text-xs text-charcoal/60 mb-1">Category</label>
            {!creatingNewCategory ? (
              <select
                value={form.category}
                onChange={(e) => {
                  if (e.target.value === "__new__") {
                    setCreatingNewCategory(true);
                    setForm((f) => ({ ...f, category: "" }));
                  } else {
                    setForm((f) => ({ ...f, category: e.target.value }));
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 outline-none bg-white"
              >
                <option value="nails">Nails</option>
                <option value="lash">Lash Extensions</option>
                <option value="permanent-makeup">Permanent Makeup</option>
                <option value="__new__">+ Create new category</option>
              </select>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 outline-none bg-white"
                  placeholder="Enter new category name (e.g., Facials, Massage)"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setCreatingNewCategory(false);
                    setNewCategoryName("");
                    setForm((f) => ({ ...f, category: "nails" }));
                  }}
                  className="text-xs text-charcoal/60 hover:text-charcoal"
                >
                  ← Use existing category
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-charcoal/60 mb-1">Duration (min)</label>
              <input
                type="number"
                min={5}
                value={form.durationMin}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    durationMin: parseInt(e.target.value, 10) || 30,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-charcoal/60 mb-1">Full price (£)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    price: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-charcoal/60 mb-1">Deposit (£)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.depositAmount}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    depositAmount: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 outline-none bg-white"
              />
            </div>
          </div>
          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 outline-none resize-none bg-white"
            placeholder="Description (optional)"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-black disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-charcoal text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
