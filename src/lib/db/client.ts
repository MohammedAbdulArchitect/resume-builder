import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

// One pooled connection for the life of the process (HLD.md §5.4) — Hostinger
// runs a single long-lived Node process, so we never open a connection per
// request or use a serverless-style connect-per-invocation driver.
const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
});

export const db = drizzle(pool, { schema });
