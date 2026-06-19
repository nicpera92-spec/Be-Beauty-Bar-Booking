/** Manual smoke tests for message editor token helpers. Run: node scripts/test-message-tokens.mjs */

const OPEN = "\u200B";
const CLOSE = "\u200C";
const TOKEN_RE = new RegExp(
  `${OPEN}([^${CLOSE}]+)${CLOSE}|\\uE010([^\\uE011]+)\\uE011|\\*\\*([^*]+)\\*\\*|\\{\\{(\\w+)\\}\\}`,
  "g"
);

function friendlyToken(label) {
  return `${OPEN}${label}${CLOSE}`;
}

function getTokenRanges(text) {
  const ranges = [];
  TOKEN_RE.lastIndex = 0;
  let match;
  while ((match = TOKEN_RE.exec(text)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length, raw: match[0] });
  }
  return ranges;
}

function getTokenDeleteRange(text, cursor, direction) {
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

function fixSingleCharTokenDelete(prev, next, cursor) {
  if (prev.length - next.length !== 1) return null;
  let deletedIndex = 0;
  while (deletedIndex < next.length && prev[deletedIndex] === next[deletedIndex]) deletedIndex += 1;
  for (const range of getTokenRanges(prev)) {
    if (deletedIndex > range.start && deletedIndex < range.end) {
      return { value: prev.slice(0, range.start) + prev.slice(range.end), cursor: range.start };
    }
  }
  return null;
}

const text = `Book here: ${friendlyToken("Booking link")} thanks`;
const token = getTokenRanges(text)[0];
assert(token.raw === friendlyToken("Booking link"), "token parsed");

assert(
  getTokenDeleteRange(text, token.start, "delete")?.start === token.start,
  "Delete at token start removes whole token"
);
assert(
  getTokenDeleteRange(text, token.end, "backspace")?.start === token.start,
  "Backspace at token end removes whole token"
);
assert(
  getTokenDeleteRange(text, token.start + 5, "backspace")?.start === token.start,
  "Backspace inside token removes whole token"
);

const broken = fixSingleCharTokenDelete(
  text,
  text.slice(0, token.start + 8) + text.slice(token.start + 9),
  token.start + 8
);
assert(broken?.value === "Book here:  thanks", "single char delete inside token strips whole token");

console.log("All message token tests passed.");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
