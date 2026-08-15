import { PrismaClient } from "@prisma/client";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";
import {
  getPrismaPostgresDirectUrl,
  isPrismaPostgresUrl,
  withDbRetry,
} from "@/lib/databaseUrl";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function withRetry(client: PrismaClient): PrismaClient {
  return client.$extends({
    query: {
      $allOperations({ query, args }) {
        return withDbRetry(
          () => query(args),
          4,
          async () => {
            await client.$disconnect().catch(() => {});
          }
        );
      },
    },
  }) as unknown as PrismaClient;
}

function createPrismaClient(): PrismaClient {
  const raw =
    process.env.DATABASE_URL ||
    process.env.PRISMA_DIRECT_TCP_URL ||
    process.env.DIRECT_URL ||
    "";

  if (!isPrismaPostgresUrl(raw)) {
    throw new Error(
      "DATABASE_URL must be a Prisma Postgres connection string (db.prisma.io)."
    );
  }

  // HTTPS/WebSocket driver — does not use TCP port 5432, which Vercel cannot reach.
  const adapter = new PrismaPostgresAdapter({
    connectionString: getPrismaPostgresDirectUrl(raw),
  });
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
