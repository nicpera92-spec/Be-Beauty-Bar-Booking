import assert from "node:assert/strict";
import {
  getPrismaClientDatabaseUrl,
  getPrismaMigrateDatabaseUrl,
  isRetryableDbError,
  withDbRetry,
} from "./databaseUrl";

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`fail - ${name}`);
    throw e;
  }
}

async function run() {
  await test("rewrites Prisma direct host to pooled for the client", () => {
    const out = getPrismaClientDatabaseUrl(
      "postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require"
    );
    const url = new URL(out);
    assert.equal(url.hostname, "pooled.db.prisma.io");
    assert.equal(url.searchParams.get("sslmode"), "require");
    assert.equal(url.searchParams.get("connect_timeout"), "30");
    assert.equal(url.searchParams.get("pool_timeout"), "30");
    assert.equal(url.searchParams.get("connection_limit"), "1");
    assert.equal(url.username, "user");
    assert.equal(url.password, "pass");
  });

  await test("leaves pooled Prisma host as pooled", () => {
    const out = getPrismaClientDatabaseUrl(
      "postgres://user:pass@pooled.db.prisma.io:5432/postgres?sslmode=require"
    );
    assert.equal(new URL(out).hostname, "pooled.db.prisma.io");
  });

  await test("does not rewrite SQLite file URLs", () => {
    assert.equal(getPrismaClientDatabaseUrl("file:./dev.db"), "file:./dev.db");
  });

  await test("does not rewrite Accelerate URLs", () => {
    const raw = "prisma+postgres://accelerate.prisma-data.net/?api_key=abc";
    assert.equal(getPrismaClientDatabaseUrl(raw), raw);
  });

  await test("migrate URL uses direct Prisma host", () => {
    const out = getPrismaMigrateDatabaseUrl(
      "postgres://user:pass@pooled.db.prisma.io:5432/postgres?sslmode=require"
    );
    assert.equal(new URL(out).hostname, "db.prisma.io");
  });

  await test("migrate URL keeps direct host", () => {
    const out = getPrismaMigrateDatabaseUrl(
      "postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require"
    );
    assert.equal(new URL(out).hostname, "db.prisma.io");
  });

  await test("adds timeouts on other postgres hosts without changing hostname", () => {
    const out = getPrismaClientDatabaseUrl(
      "postgresql://u:p@ep-example.neon.tech:5432/neondb"
    );
    const url = new URL(out);
    assert.equal(url.hostname, "ep-example.neon.tech");
    assert.equal(url.searchParams.get("connect_timeout"), "30");
  });

  await test("isRetryableDbError detects Prisma unreachable host", () => {
    const err = new Error("Can't reach database server at `db.prisma.io:5432`");
    err.name = "PrismaClientInitializationError";
    assert.equal(isRetryableDbError(err), true);
    assert.equal(isRetryableDbError(new Error("Technician name cannot be empty")), false);
  });

  await test("withDbRetry succeeds after transient failures", async () => {
    let calls = 0;
    const result = await withDbRetry(async () => {
      calls += 1;
      if (calls < 3) {
        const err = new Error("Can't reach database server at `db.prisma.io:5432`");
        err.name = "PrismaClientInitializationError";
        throw err;
      }
      return "ok";
    });
    assert.equal(result, "ok");
    assert.equal(calls, 3);
  });

  await test("withDbRetry does not retry non-transient errors", async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        withDbRetry(async () => {
          calls += 1;
          throw new Error("Technician name cannot be empty");
        }),
      /Technician name cannot be empty/
    );
    assert.equal(calls, 1);
  });

  console.log("All databaseUrl tests passed.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

