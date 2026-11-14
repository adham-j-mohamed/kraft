import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

/** Antal konton som väntar på godkännande. Visas som siffra på ringklockan. */
export async function countPending(): Promise<number> {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.status, "pending"));
  return row?.n ?? 0;
}

/** Tak för hur många förfrågningar som får ligga och vänta (skydd mot översvämning). */
export const MAX_PENDING = 50;
