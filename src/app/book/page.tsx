"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPriceShort, formatDurationHours } from "@/lib/format";

type Service = {
  id: string;
  name: string;
  category: string;
  durationMin: number;
  price: number;
  depositAmount: number;
  description: string | null;
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
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDescriptionId, setExpandedDescriptionId] = useState<string | null>(null);

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
                  <Link
                    key={s.id}
                    href={`/book/${s.id}`}
                    className="block p-4 sm:p-6 rounded-lg border border-slate-200 bg-white hover:border-navy/30 hover:shadow-md transition-all duration-200 touch-manipulation active:bg-slate-50"
                  >
                    <h3 className="font-medium text-slate-800">{s.name}</h3>
                    <p className="text-sm text-slate-900 mt-0.5">
                      Duration {formatDurationHours(s.durationMin)} · Price {formatPriceShort(s.price)} · {formatPriceShort(s.depositAmount)} deposit
                    </p>
                    {s.description && (
                      <div className="mt-2 w-full" onClick={(e) => e.stopPropagation()}>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setExpandedDescriptionId((id) => (id === s.id ? null : s.id));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
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
                  </Link>
                ))}
              </div>
              {cat === "nails" && (
                <p className="text-xs font-semibold text-slate-700 mt-4">
                  Enhancements such as French, ombré or custom nail art are available at £1 per nail, added to the final price.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
