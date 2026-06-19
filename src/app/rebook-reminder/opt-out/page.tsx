import { Suspense } from "react";
import RebookReminderOptOutClient from "./RebookReminderOptOutClient";

export default function RebookReminderOptOutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-sm text-charcoal/60">
          Loading…
        </div>
      }
    >
      <RebookReminderOptOutClient />
    </Suspense>
  );
}
