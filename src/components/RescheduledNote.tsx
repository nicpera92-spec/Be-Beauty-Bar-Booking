import { formatMadeAt } from "@/lib/format";

export function RescheduledNote({
  booking,
}: {
  booking: { rescheduleCount?: number; rescheduledAt?: string | null };
}) {
  const count = booking.rescheduleCount ?? 0;
  if (count <= 0) return null;
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
      <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-medium">
        ↻ Rescheduled by customer {count === 1 ? "once" : count === 2 ? "twice" : `${count} times`}
      </span>
      {booking.rescheduledAt && (
        <span className="text-charcoal/50">last moved {formatMadeAt(booking.rescheduledAt)}</span>
      )}
    </p>
  );
}
