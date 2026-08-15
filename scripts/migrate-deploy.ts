/**
 * Apply pending Prisma migrations. Never resets or seeds —
 * existing bookings and logins are left untouched.
 *
 * On Vercel, Prisma's direct host is often unreachable (P1001), so we use
 * the pooled host and retry. A connectivity failure must not block deploy.
 */
import { spawnSync } from "node:child_process";
import {
  getPrismaMigrateDatabaseUrl,
  isUnreachableDatabaseOutput,
} from "../src/lib/databaseUrl";

const ATTEMPTS = 4;

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runMigrate(databaseUrl: string) {
  return spawnSync("npx", ["prisma", "migrate", "deploy"], {
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });
}

const migrateUrl = getPrismaMigrateDatabaseUrl();
if (!migrateUrl) {
  console.error("DATABASE_URL is not set; cannot run migrations.");
  process.exit(1);
}

let lastOutput = "";
for (let i = 1; i <= ATTEMPTS; i++) {
  console.log(`prisma migrate deploy (attempt ${i}/${ATTEMPTS})`);
  const result = runMigrate(migrateUrl);
  lastOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status === 0) {
    process.exit(0);
  }

  const unreachable = isUnreachableDatabaseOutput(lastOutput);
  if (!unreachable || i === ATTEMPTS) {
    if (unreachable) {
      console.warn(
        "Could not reach the database to apply migrations. Continuing the build so the site can deploy. Pending migrations will apply on a later successful connection. No data was changed."
      );
      process.exit(0);
    }
    console.error(lastOutput);
    process.exit(result.status ?? 1);
  }

  const waitMs = 2000 * 2 ** (i - 1);
  console.warn(`Database unreachable (P1001). Retrying in ${waitMs}ms…`);
  sleep(waitMs);
}

process.exit(0);
