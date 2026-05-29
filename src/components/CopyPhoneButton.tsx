"use client";

import { useState } from "react";

type Props = {
  phone: string;
  className?: string;
};

async function copyText(text: string): Promise<boolean> {
  const value = text.replace(/\s/g, "");
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyPhoneButton({ phone, className = "" }: Props) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await copyText(phone);
    if (ok) {
      setFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      setFailed(true);
      window.setTimeout(() => setFailed(false), 2500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Tap to copy phone number"
      className={`inline text-left underline decoration-dotted underline-offset-2 hover:text-navy hover:decoration-solid cursor-pointer touch-manipulation ${className}`}
    >
      {phone}
      {copied && <span className="ml-1 text-green-700 no-underline font-medium">Copied</span>}
      {failed && !copied && (
        <span className="ml-1 text-red-600 no-underline">Could not copy</span>
      )}
    </button>
  );
}
