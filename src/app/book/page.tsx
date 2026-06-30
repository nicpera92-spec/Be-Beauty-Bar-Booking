"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { categoryLabel } from "@/lib/categoryCapacity";
import { compactCategoryLabel } from "@/lib/categoryDisplay";

type Technician = {
  id: string;
  name: string;
  bio: string | null;
  skillLevel: string | null;
  categories?: string[];
};

export default function BookPage() {
  const router = useRouter();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch(`/api/technicians?_=${Date.now()}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load technicians");
        return r.json();
      })
      .then((data) => {
        if (!active) return;
        const techs = Array.isArray(data) ? data : [];
        if (techs.length === 1) {
          router.replace(`/book/tech/${techs[0].id}`);
          return;
        }
        setTechnicians(techs);
      })
      .catch(() => {
        if (active) setTechnicians([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <Link href="/" className="text-sm text-navy hover:underline mb-6 inline-block">
          Home
        </Link>
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  if (technicians.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <Link href="/" className="text-sm text-navy hover:underline mb-6 inline-block">
          Home
        </Link>
        <p className="text-slate-600">No technicians are available to book right now.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-16 sm:py-20 md:py-28">
      <Link href="/" className="text-sm text-navy hover:underline mb-8 inline-block">
        Home
      </Link>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-navy mb-2">
        Welcome
      </p>
      <h1 className="font-serif text-3xl md:text-4xl font-light text-slate-800 mb-4">
        Choose your Technician
      </h1>
      <p className="text-slate-600 mb-12 max-w-xl">
        Select who you&apos;d like for your appointment, then choose from their services and pick a
        time.
      </p>

      <div className="space-y-4">
        {technicians.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => router.push(`/book/tech/${t.id}`)}
            className="block w-full text-left p-5 sm:p-6 rounded-lg border border-slate-200 bg-white hover:border-navy/30 hover:shadow-md transition-all duration-200 touch-manipulation active:bg-slate-50"
          >
            <div className="flex items-center gap-x-1.5 sm:gap-x-2 flex-nowrap w-full min-w-0 overflow-hidden">
              <h3 className="font-medium text-slate-800 text-base sm:text-lg shrink-0">{t.name}</h3>
              {t.skillLevel && t.skillLevel.trim() && (
                <span className="text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 shrink-0">
                  {t.skillLevel}
                </span>
              )}
              {t.categories && t.categories.length > 0 && (
                <span
                  className="min-w-0 flex-1 truncate text-[10px] sm:text-xs font-medium leading-none text-navy bg-navy/[0.07] rounded-full px-1.5 sm:px-2.5 py-1"
                  title={t.categories.map((category) => categoryLabel(category)).join(" · ")}
                >
                  {t.categories.map((category) => compactCategoryLabel(category)).join(" · ")}
                </span>
              )}
            </div>
            {t.bio && t.bio.trim() && (
              <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{t.bio}</p>
            )}
            <span className="inline-block mt-3 text-sm font-medium text-navy">
              View services →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
