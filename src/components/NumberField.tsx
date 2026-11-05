"use client";

import { useEffect, useState, type InputHTMLAttributes } from "react";

type NumberFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "min" | "max"
> & {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  integer?: boolean;
};

function parse(text: string, integer: boolean): number | null {
  if (text.trim() === "") return null;
  const n = integer ? parseInt(text, 10) : parseFloat(text);
  return Number.isFinite(n) ? n : null;
}

/**
 * Number input that can be cleared while typing. Limits are applied and an empty box
 * reverts to the last value only when the field loses focus.
 */
export default function NumberField({
  value,
  onValueChange,
  min,
  max,
  integer = false,
  onBlur,
  ...inputProps
}: NumberFieldProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    if (parse(text, integer) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));

  return (
    <input
      {...inputProps}
      type="number"
      inputMode={integer ? "numeric" : "decimal"}
      min={min}
      max={max}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = parse(e.target.value, integer);
        if (n !== null && n === clamp(n)) onValueChange(n);
      }}
      onBlur={(e) => {
        const n = parse(text, integer);
        const next = n === null ? value : clamp(n);
        setText(String(next));
        if (next !== value) onValueChange(next);
        onBlur?.(e);
      }}
    />
  );
}
