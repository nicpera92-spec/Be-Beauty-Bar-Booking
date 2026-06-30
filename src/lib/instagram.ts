/** Normalize @handle, username, or instagram.com URL to a bare handle. */
export function normalizeInstagramHandle(input: string): string {
  let value = input.trim();
  if (!value) return "";

  value = value.replace(/^@/, "");
  const fromUrl = value.match(/(?:instagram\.com\/)([A-Za-z0-9._]+)/i);
  if (fromUrl) return fromUrl[1];

  return value.replace(/\/$/, "");
}

export function instagramProfileUrl(handle?: string | null): string | null {
  const normalized = normalizeInstagramHandle(handle ?? "");
  if (!normalized) return null;
  return `https://instagram.com/${normalized}`;
}

export function instagramDisplayLabel(handle?: string | null): string | null {
  const normalized = normalizeInstagramHandle(handle ?? "");
  if (!normalized) return null;
  return `@${normalized}`;
}
