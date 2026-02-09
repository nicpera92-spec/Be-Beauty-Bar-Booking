"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { format, parse } from "date-fns";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  depositAmount: number;
};

type Slot = { start: string; end: string };

export default function BookTimePage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.serviceId as string;
  const date = params.date as string;
  const [service, setService] = useState<Service | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/services", { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/slots?date=${date}&serviceId=${serviceId}`).then((r) =>
        r.json()
      ),
    ])
      .then(([servicesRes, slotsRes]) => {
        const list = Array.isArray(servicesRes) ? servicesRes : [];
        const s = list.find((x: { id: string }) => x.id === serviceId);
        setService(s ?? null);
        setSlots(slotsRes.slots ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date, serviceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dayLabel = (() => {
    try {
      const d = parse(date, "yyyy-MM-dd", new Date());
      return format(d, "EEEE, d MMMM yyyy");
    } catch {
      return date;
    }
  })();

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <Link href="/" className="text-sm text-navy hover:underline mb-6 inline-block">
          Home
        </Link>
        <p className="text-slate-500">Loading time slots…</p>
      </div>
    );
  }
  if (!service) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <Link href="/" className="text-sm text-navy hover:underline mb-6 inline-block">
          Home
        </Link>
        <p className="text-slate-600 mb-6">Service not found.</p>
        <Link href="/book" className="text-navy hover:underline">
          ← Back to services
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-16 sm:py-20 md:py-28">
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-8">
        <Link href="/" className="text-sm text-navy hover:underline">
          Home
        </Link>
        <Link href={`/book/${serviceId}`} className="text-sm text-navy hover:underline">
          ← Back to date
        </Link>
      </div>
      <h1 className="font-serif text-2xl md:text-3xl font-light text-slate-800 mb-3">
        {service.name}
      </h1>
      <p className="text-slate-600 text-sm mb-12">
        {dayLabel} · {service.durationMin} min · {formatCurrency(service.depositAmount)} deposit
      </p>

      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-navy mb-8">Choose a time</h2>
      {slots.length === 0 ? (
        <p className="text-slate-600">
          No available slots for this date.{" "}
          <Link href={`/book/${serviceId}`} className="text-navy hover:underline">
            Pick another date
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {slots.map((slot) => (
            <button
              key={slot.start}
              type="button"
              onClick={() =>
                router.push(
                  `/book/${serviceId}/${date}/${encodeURIComponent(slot.start)}`
                )
              }
              className="py-3 rounded-lg border border-slate-200 bg-white hover:border-navy/40 hover:bg-slate-50 text-slate-800 font-medium text-sm transition touch-manipulation min-h-[48px]"
            >
              {slot.start} – {slot.end}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
