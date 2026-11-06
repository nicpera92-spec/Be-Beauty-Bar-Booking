"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { categoryLabel } from "@/lib/categoryCapacity";
import { compactCategoryLabel } from "@/lib/categoryDisplay";
import PageTopLinks from "@/components/PageTopLinks";

type Technician = {
  id: string;
  name: string;
  bio: string | null;
  skillLevel: string | null;
  categories?: string[];
  instagramUrl?: string | null;
  instagramLabel?: string | null;
};

export default function BookPage() {
  const router = useRouter();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    // With one technician we go straight to her services; keep "Loading…" up until we get there.
    let redirecting = false;

    fetch(`/api/technicians?_=${Date.now()}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load technicians");
        return r.json();
      })
      .then((data) => {
        if (!active) return;
        const techs = Array.isArray(data) ? data : [];
        setLoadError(false);
        if (techs.length === 1) {
          redirecting = true;
          router.replace(`/book/tech/${techs[0].id}`);
          return;
        }
        setTechnicians(techs);
      })
      .catch(() => {
        if (!active) return;
        setLoadError(true);
        setTechnicians([]);
      })
      .finally(() => {
        if (active && !redirecting) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <PageTopLinks className="mb-6">
          <Link href="/" className="text-sm text-navy hover:underline">
            Home
          </Link>
        </PageTopLinks>
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <PageTopLinks className="mb-6">
          <Link href="/" className="text-sm text-navy hover:underline">
            Home
          </Link>
        </PageTopLinks>
        <p className="text-slate-600 mb-4">
          Booking is temporarily unavailable. Please try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center min-h-[44px] px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  if (technicians.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <PageTopLinks className="mb-6">
          <Link href="/" className="text-sm text-navy hover:underline">
            Home
          </Link>
        </PageTopLinks>
        <p className="text-slate-600">No technicians are available to book right now.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto w-full px-6 pt-14 pb-20">
      <PageTopLinks className="mb-12">
        <Link href="/" className="text-sm text-navy hover:underline">
          Home
        </Link>
      </PageTopLinks>
      <p className="lux-eyebrow mb-3">Welcome</p>
      <h1 className="font-serif text-[2.6rem] sm:text-[2.875rem] font-normal text-white leading-tight mb-3">
        Choose your Technician
      </h1>
      <p className="lux-muted leading-[1.7] mb-9 max-w-xl">
        Select who you&apos;d like for your appointment, then choose from their services and pick a
        time.
      </p>

      <div className="space-y-3.5">
        {technicians.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => router.push(`/book/tech/${t.id}`)}
            className="lux-card block w-full text-left hover:border-[rgba(120,160,230,0.55)] touch-manipulation"
          >
            <div className="flex items-center gap-5">
              <div
                className="w-16 h-16 rounded-full shrink-0 flex items-center justify-center font-serif text-[26px] text-[#c9d0da] border border-white/15 bg-gradient-to-br from-[#1b3a74] to-[#0d1016]"
                aria-hidden
              >
                {t.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-[1.65rem] leading-tight text-white">{t.name}</h3>
                <p className="text-[13px] lux-muted mt-1">
                  {t.skillLevel && t.skillLevel.trim() ? t.skillLevel : null}
                  {t.skillLevel && t.skillLevel.trim() && t.instagramUrl && t.instagramLabel ? " · " : null}
                  {t.instagramUrl && t.instagramLabel && (
                    <a
                      href={t.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#dfe4ea] hover:underline"
                    >
                      {t.instagramLabel}
                    </a>
                  )}
                </p>
                {t.categories && t.categories.length > 0 && (
                  <div
                    className="flex flex-wrap gap-2 mt-2.5"
                    title={t.categories.map((category) => categoryLabel(category)).join(" · ")}
                  >
                    {t.categories.map((category) => (
                      <span
                        key={category}
                        className="text-[11px] tracking-[0.15em] uppercase lux-muted border border-white/10 px-2.5 py-1 rounded-full"
                      >
                        {compactCategoryLabel(category)}
                      </span>
                    ))}
                  </div>
                )}
                {t.bio && t.bio.trim() && (
                  <p className="text-sm lux-muted mt-2.5 whitespace-pre-line">{t.bio}</p>
                )}
              </div>
              <span className="ml-auto text-[22px] text-[#c9d0da] shrink-0" aria-hidden>
                →
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
