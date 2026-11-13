#!/usr/bin/env node
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL saknas");
  process.exit(1);
}

const pool = new Pool({ connectionString, max: 1 });

for (let attempt = 1; attempt <= 20; attempt++) {
  try {
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    console.log("migrationer klara");
    await pool.end();
    process.exit(0);
  } catch (error) {
    if (attempt === 20) {
      console.error("migrationen misslyckades:", error.message);
      await pool.end();
      process.exit(1);
    }
    console.log(`databasen svarar inte än (försök ${attempt}), väntar 2 s`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}
