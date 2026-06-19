"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  NOTIFICATION_MESSAGE_GROUPS,
  type NotificationMessageField,
  type NotificationMessageGroup,
  type NotificationMessages,
} from "@/lib/notificationDefaults";
import {
  expandRangeToTokenBounds,
  fixSingleCharTokenDelete,
  getTokenDeleteRange,
  migrateTokensToStorageFormat,
  snapCursorPastToken,
} from "@/lib/messageEditorTokens";
import {
  MESSAGE_INSERT_TAGS,
  previewEmailHtml,
  previewMessage,
  renderMessageEditorHighlightHtml,
} from "@/lib/notificationTemplates";

type NotificationMessagesEditorProps = {
  messages: NotificationMessages;
  onChange: (messages: NotificationMessages) => void;
  onPreviewWaitlist?: () => void;
  onPreviewRebook?: () => void;
  previewSending?: boolean;
  previewResult?: { ok: boolean; message: string } | null;
  rebookPreviewSending?: boolean;
  rebookPreviewResult?: { ok: boolean; message: string } | null;
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

  let start = el.selectionStart ?? current.length;
  let end = el.selectionEnd ?? current.length;
  start = snapCursorPastToken(current, start);
  end = snapCursorPastToken(current, end);

  const next = current.slice(0, start) + token + current.slice(end);
  onUpdate(next);
  const pos = start + token.length;
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(pos, pos);
  });
}

function applyTokenAwareEdit(
  el: HTMLTextAreaElement | HTMLInputElement,
  next: string,
  selectionStart: number,
  selectionEnd: number,
  onChange: (value: string) => void,
  prevValueRef: React.MutableRefObject<string>
) {
  prevValueRef.current = next;
  onChange(next);
  const pos = Math.min(selectionStart, next.length);
  const end = Math.min(selectionEnd, next.length);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(pos, end);
  });
}

function MessageTokenInput({
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
  onFocus?: (el: HTMLInputElement | HTMLTextAreaElement) => void;
}) {
  const localRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const prevValueRef = useRef(value);
  const isMultiline = rows > 1;

  const emitChange = (next: string) => {
    onChange(migrateTokensToStorageFormat(next));
  };

  useEffect(() => {
    prevValueRef.current = value;
  }, [value]);

  const setRef = (el: HTMLTextAreaElement | HTMLInputElement | null) => {
    (localRef as React.MutableRefObject<HTMLTextAreaElement | HTMLInputElement | null>).current =
      el;
    if (inputRef) {
      (inputRef as React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>).current =
        el;
    }
  };

  const syncHighlightScroll = useCallback(() => {
    const field = localRef.current;
    const highlight = highlightRef.current;
    if (!field || !highlight || !isMultiline) return;
    highlight.scrollTop = (field as HTMLTextAreaElement).scrollTop;
    highlight.scrollLeft = (field as HTMLTextAreaElement).scrollLeft;
  }, [isMultiline]);

  useEffect(() => {
    syncHighlightScroll();
  }, [value, syncHighlightScroll]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;

    if (e.key === "Backspace" || e.key === "Delete") {
      const direction = e.key === "Backspace" ? "backspace" : "delete";

      if (start !== end) {
        const expanded = expandRangeToTokenBounds(value, start, end);
        if (expanded.start !== start || expanded.end !== end) {
          e.preventDefault();
          const next = value.slice(0, expanded.start) + value.slice(expanded.end);
          applyTokenAwareEdit(el, next, expanded.start, expanded.start, emitChange, prevValueRef);
        }
        return;
      }

      const deleteRange = getTokenDeleteRange(value, start, direction);
      if (deleteRange) {
        e.preventDefault();
        const next = value.slice(0, deleteRange.start) + value.slice(deleteRange.end);
        applyTokenAwareEdit(el, next, deleteRange.start, deleteRange.start, emitChange, prevValueRef);
      }
      return;
    }
  };

  const fieldClass =
    "col-start-1 row-start-1 w-full px-3 py-2.5 text-base sm:text-sm leading-relaxed bg-transparent focus:outline-none text-transparent caret-charcoal relative z-10";

  const highlightClass =
    "col-start-1 row-start-1 px-3 py-2.5 text-base sm:text-sm leading-relaxed text-charcoal whitespace-pre-wrap break-words pointer-events-none overflow-hidden";

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const el = e.currentTarget;
    const next = el.value;
    const prev = prevValueRef.current;
    const cursor = el.selectionStart ?? next.length;

    const repaired = fixSingleCharTokenDelete(prev, next, cursor);
    if (repaired) {
      prevValueRef.current = repaired.value;
      emitChange(repaired.value);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(repaired.cursor, repaired.cursor);
        syncHighlightScroll();
      });
      return;
    }

    prevValueRef.current = next;
    emitChange(next);
    requestAnimationFrame(syncHighlightScroll);
  };

  const sharedProps = {
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onScroll: syncHighlightScroll,
    onFocus: (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) =>
      onFocus?.(e.currentTarget),
    spellCheck: true,
    autoComplete: "off",
    autoCorrect: "off",
  };

  const wrapperClass =
    "grid rounded-xl border border-slate-200 bg-white focus-within:border-navy/40 focus-within:ring-2 focus-within:ring-navy/10";

  if (isMultiline) {
    return (
      <div className={wrapperClass}>
        <div
          ref={highlightRef}
          className={highlightClass}
          aria-hidden
          dangerouslySetInnerHTML={{ __html: renderMessageEditorHighlightHtml(value) }}
        />
        <textarea
          ref={setRef as React.RefCallback<HTMLTextAreaElement>}
          rows={rows}
          {...sharedProps}
          placeholder={value ? undefined : placeholder}
          className={`${fieldClass} resize-y min-h-[6.5rem] border-0 focus:ring-0`}
        />
        {!value && (
          <div className={`${highlightClass} text-charcoal/35`} aria-hidden>
            {placeholder}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div
        ref={highlightRef}
        className={`${highlightClass} truncate`}
        aria-hidden
        dangerouslySetInnerHTML={{ __html: renderMessageEditorHighlightHtml(value) }}
      />
      <input
        ref={setRef as React.RefCallback<HTMLInputElement>}
        type="text"
        {...sharedProps}
        placeholder={value ? undefined : placeholder}
        className={`${fieldClass} border-0 focus:ring-0`}
      />
      {!value && (
        <div className={`${highlightClass} truncate text-charcoal/35`} aria-hidden>
          {placeholder}
        </div>
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
          className={`inline-flex items-center rounded-full border border-slate-200 bg-slate-50 text-charcoal hover:bg-navy/5 hover:border-navy/30 hover:text-navy transition touch-manipulation ${
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
  onActivate: (el: HTMLInputElement | HTMLTextAreaElement) => void;
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
        {(field.kind === "email" || field.kind === "sms") && (
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="text-xs text-navy hover:underline touch-manipulation"
          >
            {showPreview ? "Hide preview" : "Preview"}
          </button>
        )}
      </div>

      <MessageTokenInput
        inputRef={inputRef}
        value={value}
        onChange={onChange}
        onFocus={onActivate}
        rows={field.kind === "subject" ? 1 : field.kind === "sms" ? 5 : 10}
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
            className="text-sm text-charcoal prose-p:my-2 prose-a:text-navy prose-a:underline max-w-none break-words"
            dangerouslySetInnerHTML={{ __html: previewEmailHtml(value) }}
          />
        </div>
      )}

      {showPreview && field.kind === "sms" && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal/45">
            Example preview
          </p>
          <div className="rounded-2xl bg-slate-100 px-3 py-2.5 max-w-sm">
            <p className="text-sm text-charcoal whitespace-pre-wrap break-words">
              {previewMessage(value)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageGroupFields({
  group,
  messages,
  onUpdate,
}: {
  group: NotificationMessageGroup;
  messages: NotificationMessages;
  onUpdate: (key: keyof NotificationMessages, value: string) => void;
}) {
  const activeRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const activeKeyRef = useRef<keyof NotificationMessages>(group.sections[0]?.fields[0]?.key);
  const hasSmsOnlySection = group.sections.every((section) =>
    section.fields.every((field) => field.kind === "sms")
  );

  const handleActivate = (key: keyof NotificationMessages) => {
    return (el: HTMLInputElement | HTMLTextAreaElement) => {
      activeKeyRef.current = key;
      activeRef.current = el;
    };
  };

  const handleInsert = (token: string) => {
    const key = activeKeyRef.current ?? group.sections[0]?.fields[0]?.key;
    if (!key) return;
    insertAtCursor(activeRef.current, messages[key] ?? "", token, (v) => onUpdate(key, v));
  };

  return (
    <>
      <div className="rounded-xl border border-slate-100 bg-slate-50/40 px-3 py-3 space-y-2">
        <p className="text-xs text-charcoal/50">Add details:</p>
        <InsertTags onInsert={handleInsert} compact={hasSmsOnlySection} />
        <p className="text-xs text-charcoal/45">
          Tap a field first, then use Add details. Press delete on a detail to remove the whole
          thing. Added details show <span className="underline decoration-navy/55">underlined</span>{" "}
          here only — customers see the real name, date, or link in the sent message.
        </p>
      </div>

      {group.sections.map((section) => {
        const isSmsOnly = section.fields.length === 1 && section.fields[0].kind === "sms";
        return (
          <div
            key={section.title}
            className="rounded-xl border border-slate-100 bg-slate-50/40 p-3 space-y-3"
          >
            <p className="text-sm font-semibold text-charcoal">{section.title}</p>

            {section.fields.map((field) => (
              <SimpleField
                key={field.key}
                field={field}
                value={messages[field.key] ?? ""}
                onChange={(v) => onUpdate(field.key, v)}
                onActivate={handleActivate(field.key)}
              />
            ))}

            {isSmsOnly && <p className="text-xs text-charcoal/45">Keep text messages short.</p>}
          </div>
        );
      })}
    </>
  );
}

export default function NotificationMessagesEditor({
  messages,
  onChange,
  onPreviewWaitlist,
  previewSending,
  previewResult,
  onPreviewRebook,
  rebookPreviewSending,
  rebookPreviewResult,
}: NotificationMessagesEditorProps) {
  const [openGroup, setOpenGroup] = useState<string>("");

  const update = (key: keyof NotificationMessages, value: string) => {
    onChange({ ...messages, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-navy/15 bg-navy/5 px-4 py-3 text-sm text-charcoal/80">
        <p className="font-medium text-charcoal mb-1">How this works</p>
        <p>
          Type your messages in plain English. Use <strong>Add details</strong> to drop in customer
          name, date, service, and links — they appear{" "}
          <span className="underline decoration-navy/55">underlined</span> in the editor and fill in
          automatically when sent. Delete removes the whole detail at once.
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
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50/80 transition touch-manipulation"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-charcoal">{group.title}</p>
                <p className="text-xs text-charcoal/55 mt-0.5">{group.description}</p>
              </div>
              <span className="text-charcoal/40 text-lg leading-none shrink-0">
                {expanded ? "−" : "+"}
              </span>
            </button>

            {expanded && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100">
                <MessageGroupFields group={group} messages={messages} onUpdate={update} />

                {group.id === "waitlist" && onPreviewWaitlist && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={onPreviewWaitlist}
                      disabled={previewSending}
                      className="px-4 py-2.5 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy-light disabled:opacity-50 touch-manipulation"
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

                {group.id === "rebook-reminder" && onPreviewRebook && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={onPreviewRebook}
                      disabled={rebookPreviewSending}
                      className="px-4 py-2.5 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy-light disabled:opacity-50 touch-manipulation"
                    >
                      {rebookPreviewSending ? "Sending preview…" : "Send test email to yourself"}
                    </button>
                    {rebookPreviewResult && (
                      <p
                        className={`mt-2 text-sm ${rebookPreviewResult.ok ? "text-green-700" : "text-red-600"}`}
                      >
                        {rebookPreviewResult.message}
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
