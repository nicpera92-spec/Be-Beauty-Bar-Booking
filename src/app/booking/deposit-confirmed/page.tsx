"use client";

import Link from "next/link";

export default function DepositConfirmedPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600" aria-hidden>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-light text-slate-800">
          Deposit payment confirmed
        </h1>
        <p className="text-slate-600">
          Your booking is secured. We&apos;ll send you a confirmation by email and, if you chose it, by text.
        </p>
        <div className="pt-4">
          <Link
            href="/book"
            className="inline-block w-full sm:w-auto px-6 py-3 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors"
          >
            Book another appointment
          </Link>
        </div>
      </div>
    </div>
  );
}
