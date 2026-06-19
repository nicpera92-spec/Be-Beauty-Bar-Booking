"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DEFAULT_HOME_CATEGORIES,
  homeCategoryLabel,
  homeCategoryMobileLabel,
  partitionHomeCategoriesForMobile,
  sortHomeCategories,
} from "@/lib/categoryDisplay";

type Settings = {
  businessName: string;
};

const categoryLineClass =
  "text-navy text-[10px] uppercase tracking-[0.14em] font-medium text-center";

function CategoryLine({
  categories,
  label,
}: {
  categories: string[];
  label: (category: string) => string;
}) {
  if (categories.length === 0) return null;

  return (
    <p className="flex flex-wrap justify-center items-center">
      {categories.map((category, index) => (
        <span key={category} className="inline-flex items-center">
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
  const { firstRow, secondRow } = partitionHomeCategoriesForMobile(displayCategories);

  return (
    <div className="relative min-h-[70vh] overflow-hidden">
      <div
        className="absolute inset-0 -z-10 animate-home-bg-gradient home-theme-gradient"
        aria-hidden
      />
      <div
        className="absolute -top-[20%] -right-[10%] h-[50vmax] w-[50vmax] rounded-full home-theme-orb blur-[80px] animate-home-bg-drift"
        aria-hidden
      />
      <div
        className="absolute -bottom-[15%] -left-[5%] h-[40vmax] w-[40vmax] rounded-full home-theme-orb blur-[90px] animate-home-bg-drift opacity-80"
        style={{ animationDelay: "-10s" }}
        aria-hidden
      />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-8 py-16 sm:py-28 md:py-40 text-center">
        <h1 className="font-serif text-4xl md:text-5xl font-light tracking-tight text-slate-800 mb-6 sm:mb-8">
          {businessName}
        </h1>

        <div className="sm:hidden mb-5 space-y-1.5" aria-label="Services">
          <CategoryLine categories={firstRow} label={homeCategoryMobileLabel} />
          <CategoryLine categories={secondRow} label={homeCategoryMobileLabel} />
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

        <p className="text-slate-600 mb-10 sm:mb-16 max-w-md mx-auto text-base md:text-lg leading-relaxed px-1">
          Book your appointment online. Choose your technician, choose your service, pick a date
          and time, and secure your slot with a deposit.
        </p>
        <Link
          href="/book"
          className="inline-flex items-center justify-center bg-navy text-white px-12 py-4 font-medium rounded-sm hover:bg-navy-light transition-all duration-200 touch-manipulation min-h-[48px] min-w-[160px] mx-auto shadow-sm"
        >
          Book now
        </Link>
      </div>
    </div>
  );
}
