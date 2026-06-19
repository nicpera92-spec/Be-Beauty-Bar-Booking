"use client";

import { useEffect, useRef, useState } from "react";
import {
  NOTIFICATION_MESSAGE_GROUPS,
  type NotificationMessageField,
  type NotificationMessageGroup,
  type NotificationMessages,
} from "@/lib/notificationDefaults";
import { migrateTokensToStorageFormat } from "@/lib/messageEditorTokens";
import {
  editorDomToStorage,
  insertStorageTokenAtSelection,
  removeAdjacentTokenFromEditor,
  storageToEditorHtml,
} from "@/lib/messageEditorDom";
import {
  MESSAGE_INSERT_TAGS,
  previewEmailHtml,
  previewMessage,
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
  el: HTMLDivElement | null,
  current: string,
  token: string,
  onUpdate: (next: string) => void
) {
  if (!el) {
    onUpdate(migrateTokensToStorageFormat(current + token));
    return;
  }

  insertStorageTokenAtSelection(el, token);
  onUpdate(editorDomToStorage(el));
}

function MessageTokenInput({
  value,
  onChange,
  placeholder,
  rows = 1,
  inputRef,
  onFocus,
  multiline = true,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
  inputRef?: React.RefObject<HTMLDivElement | null>;
  onFocus?: (el: HTMLDivElement) => void;
  multiline?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const composingRef = useRef(false);
  const lastEmittedRef = useRef(value);

  const setRef = (el: HTMLDivElement | null) => {
    (editorRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (inputRef) {
      (inputRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    }
  };

  useEffect(() => {
    const el = editorRef.current;
    if (!el || composingRef.current) return;

    const stored = migrateTokensToStorageFormat(value);
    const current = el.innerHTML.length > 0 ? editorDomToStorage(el) : "";

    if (current !== stored) {
      el.innerHTML = storageToEditorHtml(stored);
      lastEmittedRef.current = stored;
    }
  }, [value]);

  const emitFromEditor = () => {
    const el = editorRef.current;
    if (!el) return;
    const next = editorDomToStorage(el);
    lastEmittedRef.current = next;
    onChange(next);
  };

  const handleInput = () => {
    if (composingRef.current) return;
    emitFromEditor();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = editorRef.current;
    if (!el) return;

    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      return;
    }

    if (e.key === "Backspace" || e.key === "Delete") {
      const direction = e.key === "Backspace" ? "backspace" : "delete";
      if (removeAdjacentTokenFromEditor(el, direction)) {
        e.preventDefault();
        emitFromEditor();
      }
    }
  };

  const fieldClass =
    "w-full px-3 py-2.5 text-base sm:text-sm leading-relaxed text-charcoal bg-white focus:outline-none rounded-xl border border-slate-200 focus:border-navy/40 focus:ring-2 focus:ring-navy/10 whitespace-pre-wrap break-words";

  const minHeight = multiline ? `${Math.max(rows * 1.6, 6.5)}rem` : undefined;

  return (
    <div className="relative">
      <div
        ref={setRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline={multiline}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={(e) => onFocus?.(e.currentTarget)}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
          emitFromEditor();
        }}
        spellCheck
        className={`${fieldClass} ${multiline ? "resize-y overflow-auto" : "overflow-x-auto overflow-y-hidden"}`}
        style={{ minHeight }}
      />
      {!value && (
        <div
          className="pointer-events-none absolute inset-0 px-3 py-2.5 text-base sm:text-sm leading-relaxed text-charcoal/35 whitespace-pre-wrap"
          aria-hidden
        >
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
  onActivate: (el: HTMLDivElement) => void;
}) {
  const inputRef = useRef<HTMLDivElement>(null);
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
        multiline={field.kind !== "subject"}
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
  const activeRef = useRef<HTMLDivElement | null>(null);
  const activeKeyRef = useRef<keyof NotificationMessages>(group.sections[0]?.fields[0]?.key);
  const hasSmsOnlySection = group.sections.every((section) =>
    section.fields.every((field) => field.kind === "sms")
  );

  const handleActivate = (key: keyof NotificationMessages) => {
    return (el: HTMLDivElement) => {
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
    onChange({ ...messages, [key]: migrateTokensToStorageFormat(value) });
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
