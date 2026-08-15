import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";
import {
  getPrismaPostgresDirectUrl,
  isPrismaPostgresUrl,
  withDbRetry,
} from "@/lib/databaseUrl";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
let loggedAdapterHost = false;

function withRetry(client: PrismaClient): PrismaClient {
  return client.$extends({
    query: {
      $allOperations({ query, args }) {
        return withDbRetry(() => query(args), 4);
      },
    },
  }) as unknown as PrismaClient;
}

function createPrismaClient(): PrismaClient {
  const connectionString = getPrismaPostgresDirectUrl();

  if (!isPrismaPostgresUrl(connectionString)) {
    throw new Error(
      "DATABASE_URL must be a Prisma Postgres connection string (db.prisma.io)."
    );
  }

  if (!loggedAdapterHost) {
    loggedAdapterHost = true;
    try {
      const host = new URL(connectionString).hostname;
      console.log(`[prisma] using HTTPS Prisma Postgres adapter host=${host}`);
    } catch {
      console.log("[prisma] using HTTPS Prisma Postgres adapter");
    }
  }

  const adapter = new PrismaPostgresAdapter({ connectionString });
  const client = new PrismaClient({ adapter, log: ["error"] });
  return withRetry(client);
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/** Lazy so unit tests can import modules that reference prisma without a live database. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
