import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ ok: true, db: "up" });
  } catch (error) {
    return Response.json(
      { ok: false, db: "down", error: error instanceof Error ? error.message : "okänt fel" },
      { status: 503 },
    );
  }
}
