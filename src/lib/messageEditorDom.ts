import {
  MESSAGE_TOKEN_CLOSE,
  MESSAGE_TOKEN_OPEN,
  getMessageTokenRegex,
  migrateTokensToStorageFormat,
} from "@/lib/messageEditorTokens";

const TOKEN_SPAN_CLASS =
  "underline decoration-navy/55 decoration-2 underline-offset-[3px]";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapePlainTextForEditor(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function escapeAttr(text: string): string {
  return escapeHtml(text);
}

function labelFromTokenMatch(match: RegExpExecArray): string {
  if (match[1] ?? match[2] ?? match[3]) {
    return (match[1] ?? match[2] ?? match[3]) as string;
  }
  return "";
}

/** Build editor HTML from stored message text (underlined, non-editable token spans). */
export function storageToEditorHtml(text: string): string {
  if (!text) return "";

  const parts: string[] = [];
  let lastIndex = 0;
  const re = getMessageTokenRegex();
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(escapePlainTextForEditor(text.slice(lastIndex, match.index)));
    }

    const label = labelFromTokenMatch(match);
    parts.push(
      `<span data-msg-token="${escapeAttr(label)}" contenteditable="false" class="${TOKEN_SPAN_CLASS}">${escapeHtml(label)}</span>`
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(escapePlainTextForEditor(text.slice(lastIndex)));
  }

  return parts.join("");
}

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/** Read stored message text from a live contenteditable root. */
export function editorDomToStorage(root: HTMLElement): string {
  let result = "";

  const walk = (node: Node, blockContext = false) => {
    if (node.nodeType === TEXT_NODE) {
      result += node.textContent ?? "";
      return;
    }

    if (node.nodeType !== ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tokenLabel = el.getAttribute("data-msg-token");
    if (tokenLabel !== null) {
      result += `${MESSAGE_TOKEN_OPEN}${tokenLabel}${MESSAGE_TOKEN_CLOSE}`;
      return;
    }

    const tag = el.tagName;
    if (tag === "BR") {
      result += "\n";
      return;
    }

    if (tag === "DIV" || tag === "P") {
      if (blockContext && result.length > 0 && !result.endsWith("\n")) {
        result += "\n";
      }
      el.childNodes.forEach((child) => walk(child, true));
      return;
    }

    el.childNodes.forEach((child) => walk(child, blockContext));
  };

  root.childNodes.forEach((child) => walk(child, false));
  return migrateTokensToStorageFormat(result);
}

export function createTokenSpan(label: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.setAttribute("data-msg-token", label);
  span.contentEditable = "false";
  span.className = TOKEN_SPAN_CLASS;
  span.textContent = label;
  return span;
}

export function labelFromStorageToken(token: string): string | null {
  if (
    token.startsWith(MESSAGE_TOKEN_OPEN) &&
    token.endsWith(MESSAGE_TOKEN_CLOSE) &&
    token.length > MESSAGE_TOKEN_OPEN.length + MESSAGE_TOKEN_CLOSE.length
  ) {
    return token.slice(MESSAGE_TOKEN_OPEN.length, -MESSAGE_TOKEN_CLOSE.length);
  }
  return null;
}

/** Insert a storage-format token at the current selection inside the editor. */
export function insertStorageTokenAtSelection(editor: HTMLElement, token: string): void {
  const label = labelFromStorageToken(token);
  if (!label) return;

  editor.focus();
  const selection = window.getSelection();
  if (!selection) return;

  let range: Range;
  if (selection.rangeCount === 0) {
    range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
  } else {
    range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }
  }

  range.deleteContents();
  const span = createTokenSpan(label);
  range.insertNode(span);

  const after = document.createRange();
  after.setStartAfter(span);
  after.collapse(true);
  selection.removeAllRanges();
  selection.addRange(after);
}

/** Remove a whole token span when backspace/delete is pressed beside it. */
export function removeAdjacentTokenFromEditor(
  editor: HTMLElement,
  direction: "backspace" | "delete"
): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;

  const token = findAdjacentToken(range, direction);
  if (!token) return false;

  const after = document.createRange();
  if (direction === "backspace") {
    after.setStartBefore(token);
  } else {
    after.setStartAfter(token);
  }
  after.collapse(true);

  token.remove();
  selection.removeAllRanges();
  selection.addRange(after);
  return true;
}

function findAdjacentToken(range: Range, direction: "backspace" | "delete"): HTMLElement | null {
  const { startContainer, startOffset } = range;

  if (startContainer.nodeType === TEXT_NODE) {
    const text = startContainer.textContent ?? "";
    if (direction === "backspace" && startOffset === 0) {
      const prev = startContainer.previousSibling;
      if (prev instanceof HTMLElement && prev.hasAttribute("data-msg-token")) return prev;
    }
    if (direction === "delete" && startOffset === text.length) {
      const next = startContainer.nextSibling;
      if (next instanceof HTMLElement && next.hasAttribute("data-msg-token")) return next;
    }
    return null;
  }

  if (startContainer.nodeType === ELEMENT_NODE) {
    const el = startContainer as HTMLElement;
    if (direction === "backspace" && startOffset > 0) {
      const prev = el.childNodes[startOffset - 1];
      if (prev instanceof HTMLElement && prev.hasAttribute("data-msg-token")) return prev;
    }
    if (direction === "delete" && startOffset < el.childNodes.length) {
      const next = el.childNodes[startOffset];
      if (next instanceof HTMLElement && next.hasAttribute("data-msg-token")) return next;
    }
  }

  return null;
}

/** Parse editor HTML produced by storageToEditorHtml (used in tests). */
export function editorHtmlToStorage(html: string): string {
  if (typeof document === "undefined") {
    throw new Error("editorHtmlToStorage requires a DOM");
  }
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  return editorDomToStorage(wrapper);
}
