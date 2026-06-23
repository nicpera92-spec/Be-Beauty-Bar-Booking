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

  return (
    <footer className="border-t border-slate-200 bg-white/90 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] text-center">
      <p className="text-slate-500 text-sm">
        © {new Date().getFullYear()} {businessName}
      </p>
    </footer>
  );
}
