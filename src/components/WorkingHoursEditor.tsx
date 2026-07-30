"use client";

import { WEEK_DISPLAY_ORDER, type WeeklyWorkingHours } from "@/lib/workingHours";

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
}

const compactInputClass =
  "w-full px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none disabled:bg-slate-50 disabled:text-slate-400";
const compactLabelClass = "block text-[11px] font-medium text-slate-500 mb-0.5";

function DayToggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors touch-manipulation disabled:opacity-50 ${
        checked ? "bg-navy" : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

type WorkingHoursEditorProps = {
  value: WeeklyWorkingHours;
  onChange: (next: WeeklyWorkingHours) => void;
  disabled?: boolean;
};

export default function WorkingHoursEditor({
  value,
  onChange,
  disabled,
}: WorkingHoursEditorProps) {
  const updateDay = (dayIndex: number, patch: Partial<WeeklyWorkingHours[number]>) => {
    onChange(
      value.map((day, i) => (i === dayIndex ? { ...day, ...patch } : day))
    );
  };

  return (
    <div className="space-y-1.5">
      {WEEK_DISPLAY_ORDER.map(({ dayIndex, label }) => {
        const day = value[dayIndex]!;
        const working = !day.isOff;
        return (
          <div
            key={dayIndex}
            className={`grid grid-cols-[2.5rem_minmax(0,1fr)] sm:grid-cols-[2.75rem_auto_1fr_1fr] items-center gap-x-2 gap-y-1 rounded-lg border px-2 py-1.5 ${
              working ? "border-slate-200/90 bg-white" : "border-slate-100 bg-slate-50/70"
            }`}
          >
            <span className="text-xs font-semibold text-charcoal tabular-nums">{label}</span>

            <div className="flex items-center gap-1.5 justify-self-end sm:justify-self-start">
              <DayToggle
                checked={working}
                disabled={disabled}
                label={`${label} working`}
                onChange={(on) => updateDay(dayIndex, { isOff: !on })}
              />
              <span className="text-[11px] text-slate-500 w-7">{working ? "On" : "Off"}</span>
            </div>

            <div className={`col-span-2 sm:col-span-1 ${working ? "" : "opacity-40"}`}>
              <label className={compactLabelClass} htmlFor={`open-${dayIndex}`}>
                Open
              </label>
              <select
                id={`open-${dayIndex}`}
                value={day.openTime}
                disabled={disabled || !working}
                onChange={(e) => updateDay(dayIndex, { openTime: e.target.value })}
                className={compactInputClass}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className={`col-span-2 sm:col-span-1 ${working ? "" : "opacity-40"}`}>
              <label className={compactLabelClass} htmlFor={`close-${dayIndex}`}>
                Close
              </label>
              <select
                id={`close-${dayIndex}`}
                value={day.closeTime}
                disabled={disabled || !working}
                onChange={(e) => updateDay(dayIndex, { closeTime: e.target.value })}
                className={compactInputClass}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );
}
