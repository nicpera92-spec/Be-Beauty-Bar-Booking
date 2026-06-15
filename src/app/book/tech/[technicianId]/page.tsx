"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatPriceShort, formatDurationHours } from "@/lib/format";
import { orderCategories } from "@/lib/categoryOrder";

type Service = {
  id: string;
  name: string;
  category: string;
  durationMin: number;
  price: number;
  depositAmount: number;
  requiresDeposit: boolean;
  description: string | null;
};

type Technician = {
  id: string;
  name: string;
  skillLevel: string | null;
  categoryOrder?: string | null;
};

const categoryLabels: Record<string, string> = {
  nails: "Nails",
  lash: "Lash Extensions",
  "permanent-makeup": "Permanent Makeup",
};

function formatCategoryName(category: string): string {
  if (categoryLabels[category]) return categoryLabels[category];
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function TechnicianServicesPage() {
  const params = useParams();
  const technicianId = params.technicianId as string;
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [technicianCount, setTechnicianCount] = useState(0);
  const [expandedDescriptionId, setExpandedDescriptionId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/technicians?_=${Date.now()}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/services?technicianId=${encodeURIComponent(technicianId)}&_=${Date.now()}`, {
        cache: "no-store",
      }).then((r) => r.json()),
    ])
      .then(([techData, servicesData]) => {
        const techs = Array.isArray(techData) ? techData : [];
        setTechnicianCount(techs.length);
        setTechnician(techs.find((t: Technician) => t.id === technicianId) ?? null);
        setServices(Array.isArray(servicesData) ? servicesData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [technicianId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="text-slate-500">Loading services…</p>
      </div>
    );
  }

  if (!technician) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="text-slate-600 mb-6">Technician not found.</p>
        <Link href="/book" className="text-navy hover:underline">
          ← Back to technicians
        </Link>
      </div>
    );
  }

  const byCategory = services.reduce<Record<string, Service[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] ?? []).push(s);
    return acc;
  }, {});
  // Use the technician's chosen category order (falls back to a sensible
  // default: nails → lash → permanent-makeup, then anything else A–Z).
  const allCategories = orderCategories(Object.keys(byCategory), technician.categoryOrder);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-16 sm:py-20 md:py-28">
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-8">
        <Link href="/" className="text-sm text-navy hover:underline">
          Home
        </Link>
        {technicianCount > 1 && (
          <Link href="/book" className="text-sm text-navy hover:underline">
            ← Back to technicians
          </Link>
        )}
      </div>

      <p className="text-xs font-medium uppercase tracking-[0.2em] text-navy mb-2">
        {technician.name}
        {technician.skillLevel && ` · ${technician.skillLevel}`}
      </p>
      <h1 className="font-serif text-3xl md:text-4xl font-light text-slate-800 mb-4">
        Choose a service
      </h1>
      <p className="text-slate-600 mb-16 max-w-xl">
        Pick a service with {technician.name}, then choose a date and time. A deposit is required to
        confirm your booking.
      </p>

      {services.length === 0 ? (
        <p className="text-slate-600">No services listed for this technician yet.</p>
      ) : (
        <div className="space-y-8">
          {allCategories.map((cat) => {
            const list = byCategory[cat] ?? [];
            return (
              <section key={cat}>
                <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-navy mb-8">
                  {formatCategoryName(cat)}
                </h2>
                <div className="space-y-4">
                  {list.map((s) => (
                    <Link
                      key={s.id}
                      href={`/book/tech/${technicianId}/${s.id}`}
                      className="block p-4 sm:p-6 rounded-lg border border-slate-200 bg-white hover:border-navy/30 hover:shadow-md transition-all duration-200 touch-manipulation active:bg-slate-50"
                    >
                      <h3 className="font-medium text-slate-800">{s.name}</h3>
                      <p className="text-sm text-slate-900 mt-0.5">
                        Duration {formatDurationHours(s.durationMin)} · Price{" "}
                        {formatPriceShort(s.price)}
                        {s.requiresDeposit && (
                          <> · {formatPriceShort(s.depositAmount)} deposit</>
                        )}
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
                            <p className="text-sm text-slate-500 mt-1.5 w-full">{s.description}</p>
                          )}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
                {cat === "nails" && (
                  <p className="text-sm font-semibold text-slate-700 mt-4 text-center">
                    Enhancements such as French, ombré or custom nail art are available at £1 per nail,
                    added to the final price.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
