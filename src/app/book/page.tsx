"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPriceShort, formatDurationHours } from "@/lib/format";

type AddOn = { id: string; name: string; price: number };

type Service = {
  id: string;
  name: string;
  category: string;
  durationMin: number;
  price: number;
  depositAmount: number;
  description: string | null;
  addOns?: AddOn[];
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

export default function BookPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDescriptionId, setExpandedDescriptionId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedAddOnId, setSelectedAddOnId] = useState<Record<string, string>>({}); // serviceId -> addOnId (single)
  const continueRef = useRef<HTMLDivElement>(null);

  const fetchServices = (showLoading = true) => {
    if (showLoading) setLoading(true);
    fetch(`/api/services?_=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setServices(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => showLoading && setLoading(false));
  };

  useEffect(() => {
    fetchServices(true);
  }, []);

  useEffect(() => {
    const onFocus = () => fetchServices(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchServices(false);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <Link href="/" className="text-sm text-navy hover:underline mb-6 inline-block">
          Home
        </Link>
        <p className="text-slate-500">Loading services…</p>
      </div>
    );
  }

  const byCategory = services.reduce<Record<string, Service[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] ?? []).push(s);
    return acc;
  }, {});

  // Get all categories that have services, sorted alphabetically
  const allCategories = Object.keys(byCategory)
    .filter((cat) => byCategory[cat] && byCategory[cat].length > 0)
    .sort();

  const handleContinue = () => {
    if (!selectedServiceId) return;
    const addOnId = selectedAddOnId[selectedServiceId];
    const query = addOnId ? `?addOns=${addOnId}` : "";
    router.push(`/book/${selectedServiceId}${query}`);
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    continueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-16 sm:py-20 md:py-28">
      <Link
        href="/"
        className="text-sm text-navy hover:underline mb-8 inline-block"
      >
        Home
      </Link>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-navy mb-2">
        Welcome
      </p>
      <h1 className="font-serif text-3xl md:text-4xl font-light text-slate-800 mb-4">
        Choose a service
      </h1>
      <p className="text-slate-600 mb-16 max-w-xl">
        Select a service, then pick a date and time. A deposit is required to
        confirm your booking.
      </p>

      <div className="space-y-8">
        {allCategories.map((cat) => {
          const list = byCategory[cat] ?? [];
          if (list.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-navy mb-8">
                {formatCategoryName(cat)}
              </h2>
              <div className="space-y-4">
                {list.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleServiceSelect(s.id)}
                    className={`block p-4 sm:p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 touch-manipulation ${
                      selectedServiceId === s.id
                        ? "border-navy bg-navy/5 shadow-md"
                        : "border-slate-200 bg-white hover:border-navy/30 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                      <h3 className="font-medium text-slate-800">{s.name}</h3>
                      {s.addOns && s.addOns.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-slate-700" onClick={(e) => e.stopPropagation()}>
                          <span>Add-ons</span>
                          <select
                            value={selectedAddOnId[s.id] ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setSelectedAddOnId((prev) => ({ ...prev, [s.id]: value }));
                              if (selectedServiceId === s.id) {
                                continueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }
                            }}
                            className="text-sm text-slate-700 bg-transparent border-none outline-none focus:ring-0 cursor-pointer py-1"
                          >
                            <option value="">None</option>
                            {s.addOns.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} +{formatCurrency(a.price)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    {(() => {
                      const addOn = s.addOns?.find((a) => a.id === selectedAddOnId[s.id]);
                      const totalPrice = addOn ? s.price + addOn.price : s.price;
                      return (
                        <p className="text-sm text-slate-900 mt-0.5">
                          Duration {formatDurationHours(s.durationMin)} · Price {formatPriceShort(totalPrice)} · {formatPriceShort(s.depositAmount)} deposit
                        </p>
                      );
                    })()}
                    {s.description && (
                      <div className="mt-2 w-full" onClick={(e) => e.stopPropagation()}>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            setExpandedDescriptionId((id) => (id === s.id ? null : s.id));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setExpandedDescriptionId((id) => (id === s.id ? null : s.id));
                            }
                          }}
                          className="text-sm text-slate-600 hover:underline cursor-pointer"
                        >
                          {expandedDescriptionId === s.id ? "Hide description" : "View description"}
                        </span>
                        {expandedDescriptionId === s.id && (
                          <p className="text-sm text-slate-500 mt-1.5 w-full">
                            {s.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div ref={continueRef} className="mt-12 pt-8 border-t border-slate-200">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedServiceId}
          className="w-full bg-navy text-white py-4 rounded-lg font-medium hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition touch-manipulation min-h-[48px] sm:min-h-[52px] shadow-sm"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
