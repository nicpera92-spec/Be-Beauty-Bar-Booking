/**
 * Prisma Postgres on Vercel needs the pooled host for serverless queries.
 * Direct host `db.prisma.io` is for migrations; using it at runtime causes
 * "Can't reach database server at db.prisma.io:5432" and takes the site down.
 */

const PRISMA_DIRECT_HOST = "db.prisma.io";
const PRISMA_POOLED_HOST = "pooled.db.prisma.io";

function isFileUrl(raw: string): boolean {
  return raw.startsWith("file:");
}

function isAccelerateUrl(raw: string): boolean {
  return raw.startsWith("prisma://") || raw.startsWith("prisma+postgres://");
}

function parseDatabaseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function withParam(url: URL, key: string, value: string): void {
  if (!url.searchParams.has(key)) {
    url.searchParams.set(key, value);
  }
}

/** Connection string Prisma Client should use in the running app. */
export function getPrismaClientDatabaseUrl(
  raw = process.env.DATABASE_URL ?? ""
): string {
  if (!raw || isFileUrl(raw) || isAccelerateUrl(raw)) return raw;

  const url = parseDatabaseUrl(raw);
  if (!url) return raw;

  if (url.hostname === PRISMA_DIRECT_HOST) {
    url.hostname = PRISMA_POOLED_HOST;
  }

  if (url.hostname.endsWith("prisma.io")) {
    withParam(url, "sslmode", "require");
  }
  withParam(url, "connect_timeout", "30");
  withParam(url, "pool_timeout", "30");
  withParam(url, "connection_limit", "1");

  return url.toString();
}

/** Connection string for `prisma migrate deploy`. */
export function getPrismaMigrateDatabaseUrl(
  raw = process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  opts: { vercel?: boolean } = {}
): string {
  const onVercel = opts.vercel ?? Boolean(process.env.VERCEL);
  // Vercel build machines cannot reach Prisma's direct host (P1001).
  // Use the pooled host there — same database, reachable over serverless.
  if (onVercel) {
    return getPrismaClientDatabaseUrl(raw);
  }

  if (!raw || isFileUrl(raw) || isAccelerateUrl(raw)) return raw;

  const url = parseDatabaseUrl(raw);
  if (!url) return raw;

  if (url.hostname === PRISMA_POOLED_HOST) {
    url.hostname = PRISMA_DIRECT_HOST;
  }
  if (url.hostname.endsWith("prisma.io")) {
    withParam(url, "sslmode", "require");
  }
  withParam(url, "connect_timeout", "30");
  return url.toString();
}

export function isUnreachableDatabaseOutput(output: string): boolean {
  return (
    /P1001/i.test(output) ||
    /P1002/i.test(output) ||
    /Can't reach database server/i.test(output) ||
    /timed out/i.test(output) ||
    /advisory lock/i.test(output)
  );
}

export function isPrismaPostgresUrl(raw: string): boolean {
  if (!raw || isFileUrl(raw)) return false;
  if (isAccelerateUrl(raw)) return true;
  const url = parseDatabaseUrl(raw);
  return Boolean(url?.hostname.endsWith("prisma.io"));
}

/** Env vars Vercel / Prisma Postgres may set. Direct TCP strings first. */
const ADAPTER_URL_ENV_KEYS = [
  "PRISMA_DIRECT_TCP_URL",
  "DIRECT_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
  "PRISMA_DATABASE_URL",
] as const;

function isTcpPostgresUrl(raw: string): boolean {
  if (!raw || isFileUrl(raw) || isAccelerateUrl(raw)) return false;
  const url = parseDatabaseUrl(raw);
  if (!url) return false;
  return url.protocol === "postgres:" || url.protocol === "postgresql:";
}

function toPrismaPostgresDirectUrl(raw: string): string {
  if (!raw || isFileUrl(raw) || isAccelerateUrl(raw)) return raw;

  const url = parseDatabaseUrl(raw);
  if (!url) return raw;

  if (url.hostname === PRISMA_POOLED_HOST) {
    url.hostname = PRISMA_DIRECT_HOST;
  }
  if (url.hostname.endsWith("prisma.io")) {
    withParam(url, "sslmode", "require");
  }
  return url.toString();
}

/**
 * Direct Prisma Postgres URL for the HTTPS serverless driver.
 * Hostname is routing only — the driver does not open TCP port 5432.
 * Skips prisma:// Accelerate URLs and prefers a postgres:// db.prisma.io string.
 */
export function getPrismaPostgresDirectUrl(
  raw?: string,
  env: { [key: string]: string | undefined } = process.env
): string {
  const candidates: string[] = [];
  if (raw) candidates.push(raw);
  for (const key of ADAPTER_URL_ENV_KEYS) {
    const value = env[key];
    if (value) candidates.push(value);
  }

  const tcp = candidates.filter(isTcpPostgresUrl);
  if (tcp.length === 0) {
    return raw || env.DATABASE_URL || "";
  }

  const preferred =
    tcp.find((value) => parseDatabaseUrl(value)?.hostname === PRISMA_DIRECT_HOST) ||
    tcp.find((value) => parseDatabaseUrl(value)?.hostname === PRISMA_POOLED_HOST) ||
    tcp[0];

  return toPrismaPostgresDirectUrl(preferred);
}

export function isRetryableDbError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";

  return (
    code === "P1001" ||
    code === "P1002" ||
    code === "P1017" ||
    code === "P2024" ||
    name === "PrismaClientInitializationError" ||
    name === "HttpResponseError" ||
    name === "WebSocketError" ||
    /Can't reach database server/i.test(msg) ||
    /Timed out fetching a new connection/i.test(msg) ||
    /Server has closed the connection/i.test(msg) ||
    /Connection terminated/i.test(msg) ||
    /Connection reset/i.test(msg) ||
    /the database system is starting up/i.test(msg) ||
    /fetch failed/i.test(msg) ||
    /ECONNRESET/i.test(msg) ||
    /ETIMEDOUT/i.test(msg) ||
    /socket hang up/i.test(msg) ||
    /database is paused/i.test(msg)
  );
}

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  attempts = 4,
  onRetry?: () => Promise<void>
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableDbError(error) || i === attempts - 1) throw error;
      if (onRetry) await onRetry().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** i));
    }
  }
  throw lastError;
}
