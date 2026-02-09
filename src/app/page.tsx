"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Settings = {
  businessName: string;
};

export default function HomePage() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.businessName) {
          setSettings(data);
        }
      })
      .catch(() => {});
  }, []);

  const businessName = settings?.businessName ?? "Be Beauty Bar";

  return (
    <div className="relative min-h-[70vh] overflow-hidden">
      {/* Discrete, slow background animation — gradient + soft orbs */}
      <div
        className="absolute inset-0 -z-10 animate-home-bg-gradient"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #ffffff 0%, #f8fafc 35%, #f1f5f9 60%, #e2e8f0 85%, rgba(30, 58, 95, 0.06) 100%)",
          backgroundSize: "200% 200%",
        }}
      />
      <div
        className="absolute -top-[20%] -right-[10%] h-[50vmax] w-[50vmax] rounded-full bg-[rgba(30,58,95,0.04)] blur-[80px] animate-home-bg-drift"
        aria-hidden
      />
      <div
        className="absolute -bottom-[15%] -left-[5%] h-[40vmax] w-[40vmax] rounded-full bg-[rgba(30,58,95,0.03)] blur-[90px] animate-home-bg-drift"
        style={{ animationDelay: "-10s" }}
        aria-hidden
      />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-8 py-20 sm:py-28 md:py-40 text-center">
        <h1 className="font-serif text-4xl md:text-5xl font-light tracking-tight text-slate-800 mb-8">
          {businessName}
        </h1>
        <p className="text-navy text-xs md:text-sm uppercase tracking-[0.25em] mb-6 font-medium">
          Nails · Lash Extensions · Permanent Makeup
        </p>
        <p className="text-slate-600 mb-16 max-w-md mx-auto text-base md:text-lg leading-relaxed">
          Book your appointment online. Choose a service, pick a date and time, and
          secure your slot with a deposit.
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
