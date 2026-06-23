"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DEFAULT_HOME_CATEGORIES,
  homeCategoryLabel,
  homeCategoryMobileLabel,
  sortHomeCategories,
} from "@/lib/categoryDisplay";

type Settings = {
  businessName: string;
};

const categoryLineClass =
  "text-navy/90 text-[9px] uppercase tracking-[0.12em] font-medium text-center";

function CategoryLine({
  categories,
  label,
}: {
  categories: string[];
  label: (category: string) => string;
}) {
  if (categories.length === 0) return null;

  return (
    <p className="flex flex-nowrap justify-center items-center overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {categories.map((category, index) => (
        <span key={category} className="inline-flex shrink-0 items-center whitespace-nowrap">
          {index > 0 && (
            <span className="text-navy/35 px-2 select-none" aria-hidden>
              ·
            </span>
          )}
          <span className={categoryLineClass}>{label(category)}</span>
        </span>
      ))}
    </p>
  );
}

export default function HomePage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.businessName) {
          setSettings(data);
        }
      })
      .catch(() => {});

    fetch(`/api/categories?_=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.categories)) {
          setCategories(data.categories);
        }
      })
      .catch(() => {});
  }, []);

  const businessName = settings?.businessName ?? "Be Beauty Bar";
  const displayCategories = sortHomeCategories(
    categories.length > 0 ? categories : DEFAULT_HOME_CATEGORIES
  );

  return (
    <div className="relative flex flex-1 flex-col justify-start overflow-hidden pt-[33dvh] sm:min-h-[70vh] sm:flex-none sm:block sm:pt-0">
      <div
        className="absolute inset-0 -z-10 animate-home-bg-gradient home-theme-gradient"
        aria-hidden
      />
      <div
        className="absolute -top-[12%] -right-[15%] h-[55vmax] w-[55vmax] rounded-full home-theme-orb blur-[72px] animate-home-bg-drift sm:-top-[20%] sm:-right-[10%] sm:h-[50vmax] sm:w-[50vmax] sm:blur-[80px]"
        aria-hidden
      />
      <div
        className="absolute -bottom-[8%] -left-[12%] h-[45vmax] w-[45vmax] rounded-full home-theme-orb blur-[80px] animate-home-bg-drift opacity-90 sm:-bottom-[15%] sm:-left-[5%] sm:h-[40vmax] sm:w-[40vmax] sm:blur-[90px] sm:opacity-80"
        style={{ animationDelay: "-10s" }}
        aria-hidden
      />

      <div className="relative max-w-3xl mx-auto w-full px-5 sm:px-8 py-6 sm:py-28 md:py-40 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center gap-6 sm:gap-0">
          <div className="space-y-4 sm:space-y-0">
            <h1 className="font-serif text-[2.35rem] leading-[1.12] sm:text-4xl md:text-5xl font-light tracking-tight text-slate-900 sm:text-slate-800 sm:mb-8">
              {businessName}
            </h1>
            <div
              className="mx-auto h-px w-10 bg-gradient-to-r from-transparent via-navy/25 to-transparent sm:hidden"
              aria-hidden
            />
          </div>

          <div className="sm:hidden w-full" aria-label="Services">
            <CategoryLine
              categories={displayCategories}
              label={homeCategoryMobileLabel}
            />
          </div>

          <ul
            className="hidden sm:flex sm:flex-wrap sm:justify-center sm:items-center sm:gap-y-2 mb-5 sm:mb-6 list-none p-0 m-0"
            aria-label="Services"
          >
            {displayCategories.map((category, index) => (
              <li key={category} className="flex items-center justify-center">
                {index > 0 && (
                  <span className="text-navy/35 px-2.5 md:px-3 select-none" aria-hidden>
                    ·
                  </span>
                )}
                <span className="text-navy text-xs uppercase tracking-[0.22em] md:tracking-[0.25em] font-medium whitespace-nowrap">
                  {homeCategoryLabel(category)}
                </span>
              </li>
            ))}
          </ul>

          <p className="text-slate-600/90 max-w-[19rem] sm:max-w-md mx-auto text-[0.9375rem] sm:text-base md:text-lg leading-relaxed px-1 sm:mb-16 mb-0">
            Book your appointment online. Choose your technician, choose your service, pick a date
            and time, and secure your slot with a deposit.
          </p>

          <Link
            href="/book"
            className="inline-flex items-center justify-center bg-navy text-white text-sm px-12 py-3 sm:text-base sm:px-12 sm:py-4 font-medium rounded-md sm:rounded-sm hover:bg-navy-light transition-all duration-200 touch-manipulation min-h-[44px] min-w-[152px] sm:min-h-[48px] sm:min-w-[160px] mx-auto shadow-md shadow-navy/15 sm:shadow-sm"
          >
            Book now
          </Link>
        </div>
      </div>
    </div>
  );
}
