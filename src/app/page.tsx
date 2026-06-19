"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { homeCategoryLabel } from "@/lib/categoryDisplay";

type Settings = {
  businessName: string;
};

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

      <div className="relative max-w-3xl mx-auto px-4 sm:px-8 py-20 sm:py-28 md:py-40 text-center">
        <h1 className="font-serif text-4xl md:text-5xl font-light tracking-tight text-slate-800 mb-8">
          {businessName}
        </h1>
        {categories.length > 0 && (
          <p className="text-navy text-xs md:text-sm uppercase tracking-[0.25em] mb-6 font-medium">
            {categories.map((category) => homeCategoryLabel(category)).join(" · ")}
          </p>
        )}
        <p className="text-slate-600 mb-16 max-w-md mx-auto text-base md:text-lg leading-relaxed">
          Choose your technician, pick a service and time, and secure your slot with a deposit.
        </p>
        <Link
          href="/book"
          className="inline-flex items-center justify-center bg-navy text-white px-12 py-4 font-medium rounded-sm hover:bg-navy-light transition-all duration-200 touch-manipulation min-h-[48px] min-w-[160px] mx-auto shadow-sm"
        >
          Choose technician
        </Link>
      </div>
    </div>
  );
}
