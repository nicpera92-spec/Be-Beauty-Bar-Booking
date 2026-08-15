import { PrismaClient } from "@prisma/client";
import { getPrismaClientDatabaseUrl, withDbRetry } from "@/lib/databaseUrl";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  const url = getPrismaClientDatabaseUrl();
  const client = url
    ? new PrismaClient({
        datasources: { db: { url } },
        log: ["error"],
      })
    : new PrismaClient({ log: ["error"] });

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

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
