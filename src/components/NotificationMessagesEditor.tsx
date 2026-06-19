"use client";

import { useState } from "react";
import {
  NOTIFICATION_MESSAGE_GROUPS,
  NOTIFICATION_PLACEHOLDERS,
  type NotificationMessages,
} from "@/lib/notificationDefaults";

type NotificationMessagesEditorProps = {
  messages: NotificationMessages;
  onChange: (messages: NotificationMessages) => void;
  onPreviewWaitlist?: () => void;
  previewSending?: boolean;
  previewResult?: { ok: boolean; message: string } | null;
};

export default function NotificationMessagesEditor({
  messages,
  onChange,
  onPreviewWaitlist,
  previewSending,
  previewResult,
}: NotificationMessagesEditorProps) {
  const [openGroup, setOpenGroup] = useState<string>("waitlist");

  const update = (key: keyof NotificationMessages, value: string) => {
    onChange({ ...messages, [key]: value });
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-navy/40 focus:ring-2 focus:ring-navy/10 outline-none";
  const textareaClass = `${inputClass} min-h-[120px] font-mono text-xs leading-relaxed`;

  return (
    <div className="space-y-3">
      <p className="text-sm text-charcoal/60">
        Customise the emails and texts your customers receive. Use placeholders:{" "}
        <span className="text-xs text-charcoal/50">{NOTIFICATION_PLACEHOLDERS}</span>
      </p>

      {NOTIFICATION_MESSAGE_GROUPS.map((group) => {
        const expanded = openGroup === group.id;
        return (
          <div key={group.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenGroup(expanded ? "" : group.id)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50/80 transition"
            >
              <div>
                <p className="text-sm font-medium text-charcoal">{group.title}</p>
                <p className="text-xs text-charcoal/55 mt-0.5">{group.description}</p>
              </div>
              <span className="text-charcoal/40 text-lg leading-none">{expanded ? "−" : "+"}</span>
            </button>

            {expanded && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100">
                {group.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-charcoal/70 mb-1">
                      {field.label}
                    </label>
                    {field.multiline || field.sms ? (
                      <textarea
                        value={messages[field.key]}
                        onChange={(e) => update(field.key, e.target.value)}
                        className={field.sms ? `${inputClass} min-h-[72px]` : textareaClass}
                        rows={field.sms ? 3 : 6}
                      />
                    ) : (
                      <input
                        type="text"
                        value={messages[field.key]}
                        onChange={(e) => update(field.key, e.target.value)}
                        className={inputClass}
                      />
                    )}
                  </div>
                ))}

                {group.id === "waitlist" && onPreviewWaitlist && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={onPreviewWaitlist}
                      disabled={previewSending}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-navy hover:bg-slate-50 disabled:opacity-50"
                    >
                      {previewSending ? "Sending preview…" : "Send preview to business email"}
                    </button>
                    {previewResult && (
                      <p
                        className={`mt-2 text-sm ${previewResult.ok ? "text-green-700" : "text-red-600"}`}
                      >
                        {previewResult.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
