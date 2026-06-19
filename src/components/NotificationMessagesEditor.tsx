"use client";

import { useRef, useState } from "react";
import { NOTIFICATION_MESSAGE_GROUPS, type NotificationMessages } from "@/lib/notificationDefaults";
import {
  MESSAGE_INSERT_TAGS,
  previewEmailHtml,
  previewMessage,
} from "@/lib/notificationTemplates";

type NotificationMessagesEditorProps = {
  messages: NotificationMessages;
  onChange: (messages: NotificationMessages) => void;
  onPreviewWaitlist?: () => void;
  previewSending?: boolean;
  previewResult?: { ok: boolean; message: string } | null;
};

function insertAtCursor(
  el: HTMLTextAreaElement | HTMLInputElement | null,
  current: string,
  token: string,
  onUpdate: (next: string) => void
) {
  if (!el) {
    onUpdate(current + token);
    return;
  }
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const next = current.slice(0, start) + token + current.slice(end);
  onUpdate(next);
  const pos = start + token.length;
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(pos, pos);
  });
}

function InsertTags({
  onInsert,
  compact,
}: {
  onInsert: (token: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MESSAGE_INSERT_TAGS.map((tag) => (
        <button
          key={tag.token}
          type="button"
          title={tag.hint ?? `Insert ${tag.label.toLowerCase()}`}
          onClick={() => onInsert(tag.token)}
          className={`inline-flex items-center rounded-full border border-slate-200 bg-slate-50 text-charcoal hover:bg-navy/5 hover:border-navy/30 hover:text-navy transition ${
            compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs font-medium"
          }`}
        >
          + {tag.label}
        </button>
      ))}
    </div>
  );
}

function MessageField({
  label,
  value,
  kind,
  onChange,
}: {
  label: string;
  value: string;
  kind: "subject" | "email" | "sms";
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const inputClass =
    "w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-charcoal focus:border-navy/40 focus:ring-2 focus:ring-navy/10 outline-none";
  const isMultiline = kind !== "subject";

  const handleInsert = (token: string) => {
    if (kind === "subject") {
      insertAtCursor(inputRef.current, value, token, onChange);
    } else {
      insertAtCursor(textareaRef.current, value, token, onChange);
    }
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-charcoal">{label}</label>
        {isMultiline && (
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="text-xs text-navy hover:underline"
          >
            {showPreview ? "Hide preview" : "Preview"}
          </button>
        )}
      </div>

      <div>
        <p className="text-xs text-charcoal/50 mb-1.5">Tap to insert details:</p>
        <InsertTags onInsert={handleInsert} compact={kind === "sms"} />
      </div>

      {kind === "subject" ? (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder="e.g. Hi {{customerName}}, your booking is confirmed"
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={kind === "sms" ? 4 : 8}
          className={`${inputClass} resize-y leading-relaxed`}
          placeholder={
            kind === "sms"
              ? "Write your text message here. Keep it short."
              : "Write your email like a normal message. Press Enter twice between paragraphs. Add links by typing e.g. Book here: {{bookLink}}"
          }
        />
      )}

      {kind === "sms" && (
        <p className="text-xs text-charcoal/45">Text messages work best when kept short.</p>
      )}

      {kind === "email" && (
        <p className="text-xs text-charcoal/45">
          Write normally — no coding needed. Links like <span className="font-medium">Book here: {"{{bookLink}}"}</span> become clickable in the email.
        </p>
      )}

      {showPreview && isMultiline && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal/45">
            Example preview
          </p>
          {kind === "email" ? (
            <div
              className="text-sm text-charcoal prose-p:my-2 prose-a:text-navy prose-a:underline max-w-none"
              dangerouslySetInnerHTML={{ __html: previewEmailHtml(value) }}
            />
          ) : (
            <p className="text-sm text-charcoal whitespace-pre-wrap">{previewMessage(value)}</p>
          )}
        </div>
      )}
    </div>
  );
}

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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-navy/15 bg-navy/5 px-4 py-3 text-sm text-charcoal/80">
        <p className="font-medium text-charcoal mb-1">How this works</p>
        <p>
          Type your messages in plain English. Use the <strong>+ buttons</strong> to drop in customer
          name, date, service, booking links, and more — they fill in automatically when sent.
        </p>
      </div>

      {NOTIFICATION_MESSAGE_GROUPS.map((group) => {
        const expanded = openGroup === group.id;
        return (
          <div key={group.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setOpenGroup(expanded ? "" : group.id)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50/80 transition"
            >
              <div>
                <p className="text-sm font-semibold text-charcoal">{group.title}</p>
                <p className="text-xs text-charcoal/55 mt-0.5">{group.description}</p>
              </div>
              <span className="text-charcoal/40 text-lg leading-none shrink-0">
                {expanded ? "−" : "+"}
              </span>
            </button>

            {expanded && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100">
                {group.fields.map((field) => (
                  <MessageField
                    key={field.key}
                    label={field.label}
                    kind={field.kind}
                    value={messages[field.key]}
                    onChange={(v) => update(field.key, v)}
                  />
                ))}

                {group.id === "waitlist" && onPreviewWaitlist && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={onPreviewWaitlist}
                      disabled={previewSending}
                      className="px-4 py-2.5 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy-light disabled:opacity-50"
                    >
                      {previewSending ? "Sending preview…" : "Send test email to yourself"}
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
