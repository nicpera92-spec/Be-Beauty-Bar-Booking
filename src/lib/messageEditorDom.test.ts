import { resolveNotificationMessages } from "@/lib/notificationTemplates";
import { migrateTokensToStorageFormat } from "@/lib/messageEditorTokens";
import {
  editorDomToStorage,
  editorHtmlToStorage,
  storageToEditorHtml,
} from "@/lib/messageEditorDom";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
const { document } = dom.window;
(globalThis as { document?: Document }).document = document;

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function testRoundTrip(label: string, storage: string) {
  const html = storageToEditorHtml(storage);
  assert(!html.includes("\u200B"), `${label}: editor HTML must not expose zero-width open chars`);
  assert(!html.includes("\u200C"), `${label}: editor HTML must not expose zero-width close chars`);
  assert(!html.includes("**"), `${label}: editor HTML must not expose ** markers`);

  const roundTripped = editorHtmlToStorage(html);
  assert(
    roundTripped === storage,
    `${label}: round-trip failed\n  got: ${JSON.stringify(roundTripped)}\n  exp: ${JSON.stringify(storage)}`
  );
}

function testDomWalk(label: string, storage: string) {
  const root = document.createElement("div");
  root.innerHTML = storageToEditorHtml(storage);
  const walked = editorDomToStorage(root as unknown as HTMLElement);
  assert(walked === storage, `${label}: DOM walk failed`);
}

const messages = resolveNotificationMessages(null);
const keys = Object.keys(messages) as (keyof typeof messages)[];

for (const key of keys) {
  testRoundTrip(String(key), messages[key]);
  testDomWalk(String(key), messages[key]);
}

const legacy = migrateTokensToStorageFormat("Hi **Customer name**, welcome back to **Salon name**");
const legacyRoundTrip = editorHtmlToStorage(storageToEditorHtml(legacy));
assert(legacyRoundTrip === legacy, "legacy ** markers migrate and round-trip");

testRoundTrip("rebook body", messages.rebookReminderCustomerBody);
testDomWalk("rebook body", messages.rebookReminderCustomerBody);

console.log(`messageEditorDom: ${keys.length * 2 + 3} checks passed`);
