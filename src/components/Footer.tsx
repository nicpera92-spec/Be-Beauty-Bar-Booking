"use client";

import { useEffect, useState } from "react";

export default function Footer() {
  const [businessName, setBusinessName] = useState("Be Beauty Bar");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.businessName) {
          setBusinessName(data.businessName);
        }
      })
      .catch(() => {});
  }, []);

  const deployId = typeof process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA === "string"
    ? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)
    : null;

  return (
    <footer className="border-t border-slate-200 bg-white py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] text-center">
      <p className="text-slate-400 text-sm">
        © {new Date().getFullYear()} {businessName}
      </p>
      {deployId && (
        <p className="text-slate-300 text-xs mt-1" title="Deploy commit">
          Build {deployId}
        </p>
      )}
    </footer>
  );
}
