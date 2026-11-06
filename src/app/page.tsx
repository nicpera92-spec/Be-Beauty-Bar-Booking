"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DEFAULT_HOME_CATEGORIES,
  homeCategoryLabel,
  sortHomeCategories,
} from "@/lib/categoryDisplay";

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
  const displayCategories = sortHomeCategories(
    categories.length > 0 ? categories : DEFAULT_HOME_CATEGORIES
  );

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden min-h-[calc(100svh-5.5rem)] sm:min-h-[78vh]">
      <div
        className="absolute -top-[12%] -right-[15%] h-[55vmax] w-[55vmax] rounded-full home-theme-orb blur-[72px] animate-home-bg-drift sm:-top-[20%] sm:-right-[10%] sm:h-[50vmax] sm:w-[50vmax] sm:blur-[80px]"
        aria-hidden
      />
      <div
        className="absolute -bottom-[8%] -left-[12%] h-[45vmax] w-[45vmax] rounded-full home-theme-orb blur-[80px] animate-home-bg-drift opacity-90 sm:-bottom-[15%] sm:-left-[5%] sm:h-[40vmax] sm:w-[40vmax] sm:blur-[90px] sm:opacity-80"
        style={{ animationDelay: "-10s" }}
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col items-center justify-center text-center px-6 py-20">
        <h1 className="font-serif font-normal text-white leading-none text-[3.25rem] sm:text-[4.5rem] md:text-[5.25rem] tracking-[0.01em]">
          {businessName}
        </h1>

        <ul
          className="flex flex-wrap justify-center gap-x-6 gap-y-2.5 mt-6 list-none p-0 text-[11px] tracking-[0.34em] uppercase lux-muted"
          aria-label="Services"
        >
          {displayCategories.map((category) => (
            <li key={category} className="flex items-center whitespace-nowrap">
              <span className="text-[7px] mr-2.5 text-[#c9d0da]" aria-hidden>
                ◆
              </span>
              {homeCategoryLabel(category)}
            </li>
          ))}
        </ul>

        <div className="lux-line" aria-hidden />

        <p className="lux-muted max-w-[430px] mx-auto leading-[1.8] mb-10 text-[15px] sm:text-base">
          Book your appointment online. Choose your technician, choose your service, pick a date
          and time, and secure your slot with a deposit.
        </p>

        <Link href="/book" className="lux-btn">
          Book now
        </Link>
        <Link
          href="/gift-vouchers"
          className="mt-5 text-[13px] lux-muted border-b border-white/15 pb-0.5 hover:text-white transition"
        >
          Give a gift certificate
        </Link>
      </div>
    </div>
  );
}
