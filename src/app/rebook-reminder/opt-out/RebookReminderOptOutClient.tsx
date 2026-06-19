"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function RebookReminderOptOutClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [businessName, setBusinessName] = useState("Be Beauty Bar");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }

    fetch(`/api/rebook-reminder/opt-out?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setState("error");
          return;
        }
        if (data.businessName) setBusinessName(data.businessName);
        setState("success");
      })
      .catch(() => setState("error"));
  }, [token]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-4">
        {state === "loading" && (
          <>
            <h1 className="font-serif text-2xl text-charcoal">One moment…</h1>
            <p className="text-sm text-charcoal/60">Updating your preferences.</p>
          </>
        )}

        {state === "success" && (
          <>
            <h1 className="font-serif text-2xl text-charcoal">You&apos;re all set</h1>
            <p className="text-sm text-charcoal/70 leading-relaxed">
              You won&apos;t receive any more rebook reminders from {businessName}. You can still
              book with us any time.
            </p>
            <Link
              href="/book"
              className="inline-flex items-center justify-center mt-4 px-8 py-3 bg-navy text-white text-sm font-medium rounded-sm hover:bg-navy-light transition"
            >
              Book an appointment
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="font-serif text-2xl text-charcoal">Link not valid</h1>
            <p className="text-sm text-charcoal/70 leading-relaxed">
              This opt-out link may have expired or already been used. If you still need help,
              please contact the salon directly.
            </p>
            <Link href="/" className="inline-block mt-4 text-sm text-navy hover:underline">
              Back to home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
