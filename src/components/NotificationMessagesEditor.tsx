"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  NOTIFICATION_MESSAGE_GROUPS,
  type NotificationMessageField,
  type NotificationMessages,
} from "@/lib/notificationDefaults";
import {
  MESSAGE_INSERT_TAGS,
  PLACEHOLDER_LABELS,
  previewEmailHtml,
} from "@/lib/notificationTemplates";

type NotificationMessagesEditorProps = {
  messages: NotificationMessages;
  onChange: (messages: NotificationMessages) => void;
  onPreviewWaitlist?: () => void;
  previewSending?: boolean;
  previewResult?: { ok: boolean; message: string } | null;
};

const PLACEHOLDER_RE = /\*\*([^*]+)\*\*|\{\{(\w+)\}\}/g;

function renderPlaceholderHighlight(text: string): ReactNode {
  if (!text) return null;

  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  PLACEHOLDER_RE.lastIndex = 0;
  while ((match = PLACEHOLDER_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const label = match[1] ?? PLACEHOLDER_LABELS[match[2]] ?? match[2];
    parts.push(
      <strong key={key++} className="font-semibold text-navy">
        {label}
      </strong>
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts;
}

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

function HighlightedInput({
  value,
  onChange,
  placeholder,
  rows = 1,
  inputRef,
  onFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onFocus?: () => void;
}) {
  const localRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const isMultiline = rows > 1;

  const setRef = (el: HTMLTextAreaElement | HTMLInputElement | null) => {
    (localRef as React.MutableRefObject<HTMLTextAreaElement | HTMLInputElement | null>).current =
      el;
    if (inputRef) {
      (inputRef as React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>).current =
        el;
    }
  };

  const syncScroll = () => {
    if (backdropRef.current && localRef.current && "scrollTop" in localRef.current) {
      backdropRef.current.scrollTop = localRef.current.scrollTop;
      backdropRef.current.scrollLeft = localRef.current.scrollLeft;
    }
  };

  const fieldClass =
    "w-full px-3 py-2.5 text-sm leading-relaxed text-charcoal focus:outline-none";

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-navy/40 focus-within:ring-2 focus-within:ring-navy/10 overflow-hidden">
      <div
        ref={backdropRef}
        aria-hidden
        className={`${fieldClass} absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden`}
      >
        {renderPlaceholderHighlight(value)}
      </div>

      {!value && (
        <div
          className={`${fieldClass} absolute inset-0 pointer-events-none text-charcoal/35 whitespace-pre-wrap`}
        >
          {placeholder}
        </div>
      )}

      {isMultiline ? (
        <textarea
          ref={setRef as React.RefCallback<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onScroll={syncScroll}
          rows={rows}
          className={`${fieldClass} relative z-10 resize-y bg-transparent text-transparent caret-charcoal`}
        />
      ) : (
        <input
          ref={setRef as React.RefCallback<HTMLInputElement>}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          className={`${fieldClass} relative z-10 bg-transparent text-transparent caret-charcoal`}
        />
      )}
    </div>
  );
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
          key={tag.label}
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

function SimpleField({
  field,
  value,
  onChange,
  onActivate,
}: {
  field: NotificationMessageField;
  value: string;
  onChange: (value: string) => void;
  onActivate: (el: HTMLInputElement | HTMLTextAreaElement | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const subjectPlaceholder = "e.g. Your booking is confirmed";
  const emailPlaceholder = "Write your message here…";
  const smsPlaceholder = "Write your text message here…";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-charcoal/70">{field.label}:</label>
        {field.kind === "email" && (
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="text-xs text-navy hover:underline"
          >
            {showPreview ? "Hide preview" : "Preview"}
          </button>
        )}
      </div>

      <HighlightedInput
        inputRef={inputRef}
        value={value}
        onChange={onChange}
        onFocus={() => onActivate(inputRef.current)}
        rows={field.kind === "subject" ? 1 : field.kind === "sms" ? 4 : 8}
        placeholder={
          field.kind === "subject"
            ? subjectPlaceholder
            : field.kind === "sms"
              ? smsPlaceholder
              : emailPlaceholder
        }
      />

      {showPreview && field.kind === "email" && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal/45">
            Example preview
          </p>
          <div
            className="text-sm text-charcoal prose-p:my-2 prose-a:text-navy prose-a:underline max-w-none"
            dangerouslySetInnerHTML={{ __html: previewEmailHtml(value) }}
          />
        </div>
      )}
    </div>
  );
}

function MessageSection({
  title,
  fields,
  messages,
  onUpdate,
}: {
  title: string;
  fields: NotificationMessageField[];
  messages: NotificationMessages;
  onUpdate: (key: keyof NotificationMessages, value: string) => void;
}) {
  const activeRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const activeKeyRef = useRef<keyof NotificationMessages>(fields[0]?.key);
  const isSmsOnly = fields.length === 1 && fields[0].kind === "sms";

  const handleActivate =
    (key: keyof NotificationMessages) => (el: HTMLInputElement | HTMLTextAreaElement | null) => {
      activeKeyRef.current = key;
      activeRef.current = el;
    };

  const handleInsert = (token: string) => {
    const key = activeKeyRef.current ?? fields[0].key;
    insertAtCursor(activeRef.current, messages[key], token, (v) => onUpdate(key, v));
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3 space-y-3">
      <p className="text-sm font-semibold text-charcoal">{title}</p>

      <div>
        <p className="text-xs text-charcoal/50 mb-1.5">Add details:</p>
        <InsertTags onInsert={handleInsert} compact={isSmsOnly} />
      </div>

      {fields.map((field) => (
        <SimpleField
          key={field.key}
          field={field}
          value={messages[field.key]}
          onChange={(v) => onUpdate(field.key, v)}
          onActivate={handleActivate(field.key)}
        />
      ))}

      {!isSmsOnly && fields.some((f) => f.kind === "email") && (
        <p className="text-xs text-charcoal/45">
          Tap a field first, then use Add details. Links like{" "}
          <span className="font-medium">Book here: **Booking link**</span> become clickable in the
          email.
        </p>
      )}

      {isSmsOnly && (
        <p className="text-xs text-charcoal/45">Keep text messages short.</p>
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
          Type your messages in plain English. Use <strong>Add details</strong> to drop in customer
          name, date, service, and links — they appear in <strong>bold</strong> and fill in
          automatically when sent.
        </p>
      </div>

      {NOTIFICATION_MESSAGE_GROUPS.map((group) => {
        const expanded = openGroup === group.id;
        return (
          <div
            key={group.id}
            className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm"
          >
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
                {group.sections.map((section) => (
                  <MessageSection
                    key={section.title}
                    title={section.title}
                    fields={section.fields}
                    messages={messages}
                    onUpdate={update}
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
