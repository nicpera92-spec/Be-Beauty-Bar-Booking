export const MESSAGE_TOKEN_OPEN = "\uE010";
export const MESSAGE_TOKEN_CLOSE = "\uE011";

export type TokenRange = { start: number; end: number; raw: string };

const TOKEN_RE = new RegExp(
  `${MESSAGE_TOKEN_OPEN}([^${MESSAGE_TOKEN_CLOSE}]+)${MESSAGE_TOKEN_CLOSE}|\\*\\*([^*]+)\\*\\*|\\{\\{(\\w+)\\}\\}`,
  "g"
);

export function getTokenRanges(text: string): TokenRange[] {
  const ranges: TokenRange[] = [];
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_RE.exec(text)) !== null) {
    ranges.push({
      start: match.index,
      end: match.index + match[0].length,
      raw: match[0],
    });
  }
  return ranges;
}

/** Expand a selection so partial token selections cover whole tokens. */
export function expandRangeToTokenBounds(
  text: string,
  start: number,
  end: number
): { start: number; end: number } {
  const ranges = getTokenRanges(text);
  let expandedStart = start;
  let expandedEnd = end;

  for (const range of ranges) {
    const overlaps = start < range.end && end > range.start;
    const startInside = start > range.start && start < range.end;
    const endInside = end > range.start && end < range.end;

    if (overlaps || startInside || endInside) {
      expandedStart = Math.min(expandedStart, range.start);
      expandedEnd = Math.max(expandedEnd, range.end);
    }
  }

  return { start: expandedStart, end: expandedEnd };
}

/** Range to remove when Backspace/Delete is pressed at a collapsed cursor. */
export function getTokenDeleteRange(
  text: string,
  cursor: number,
  direction: "backspace" | "delete"
): { start: number; end: number } | null {
  const ranges = getTokenRanges(text);

  for (const range of ranges) {
    if (cursor > range.start && cursor < range.end) {
      return { start: range.start, end: range.end };
    }
  }

  if (direction === "backspace") {
    const ending = ranges.find((range) => range.end === cursor);
    if (ending) return { start: ending.start, end: ending.end };
  } else {
    const starting = ranges.find((range) => range.start === cursor);
    if (starting) return { start: starting.start, end: starting.end };
  }

  return null;
}

/** Move cursor to end of token if it lands inside one (typing/insert). */
export function snapCursorPastToken(text: string, cursor: number): number {
  for (const range of getTokenRanges(text)) {
    if (cursor > range.start && cursor < range.end) {
      return range.end;
    }
  }
  return cursor;
}

/** When a single character was removed inside a token (mobile keyboards), remove the whole token. */
export function fixSingleCharTokenDelete(
  prev: string,
  next: string,
  cursor: number
): { value: string; cursor: number } | null {
  if (prev.length - next.length !== 1) return null;

  let deletedIndex = 0;
  while (deletedIndex < next.length && prev[deletedIndex] === next[deletedIndex]) {
    deletedIndex += 1;
  }

  for (const range of getTokenRanges(prev)) {
    if (deletedIndex > range.start && deletedIndex < range.end) {
      return {
        value: prev.slice(0, range.start) + prev.slice(range.end),
        cursor: range.start,
      };
    }
  }

  const snapped = snapCursorPastToken(next, cursor);
  if (snapped !== cursor) {
    for (const range of getTokenRanges(next)) {
      if (cursor > range.start && cursor < range.end) {
        return {
          value: next.slice(0, range.start) + next.slice(range.end),
          cursor: range.start,
        };
      }
    }
  }

  return null;
}

export function getMessageTokenRegex(): RegExp {
  return new RegExp(TOKEN_RE.source, "g");
}

export function tokenLabelFromMatch(match: RegExpExecArray): string {
  return match[1] ?? match[2] ?? match[3];
}
