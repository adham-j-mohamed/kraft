import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type Db = NodePgDatabase<typeof schema>;

let pool: Pool | undefined;
let db: Db | undefined;

/**
 * Lazy så att `next build` kan importera modulen utan databas. Kastar först när
 * något faktiskt frågar databasen utan att DATABASE_URL finns.
 */
export function getDb(): Db {
  if (db) return db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL saknas");
  pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 30_000 });
  db = drizzle(pool, { schema });
  return db;
}

export { schema };
