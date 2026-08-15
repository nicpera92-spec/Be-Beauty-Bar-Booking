/**
 * Apply pending Prisma migrations using the direct connection string.
 * Does not reset or seed — existing bookings and logins are left untouched.
 */
import { execSync } from "node:child_process";
import { getPrismaMigrateDatabaseUrl } from "../src/lib/databaseUrl";

const migrateUrl = getPrismaMigrateDatabaseUrl();
if (!migrateUrl) {
  console.error("DATABASE_URL is not set; cannot run migrations.");
  process.exit(1);
}

execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: migrateUrl,
  },
});
