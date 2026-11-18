import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { apiTokens, userSettings, users } from "@/lib/db/schema";

/**
 * Nyckel för hälsosynken. 256 slumpade bitar, så SHA-256 räcker som hash (ingen
 * långsam hash behövs när nyckeln inte går att gissa). Klartexten finns bara i svaret
 * när den skapas; databasen har bara hashen.
 */
export const TOKEN_PREFIX = "kft_";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Skapar en ny nyckel och ersätter kontots gamla, om den finns. Returnerar klartexten. */
export async function createOrReplaceToken(userId: string): Promise<string> {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  await getDb()
    .insert(apiTokens)
    .values({ userId, tokenHash })
    .onConflictDoUpdate({
      target: apiTokens.userId,
      set: { tokenHash, createdAt: new Date(), lastUsedAt: null, lastSummary: null },
    });
  return token;
}

export async function revokeToken(userId: string): Promise<boolean> {
  const gone = await getDb().delete(apiTokens).where(eq(apiTokens.userId, userId)).returning({ id: apiTokens.id });
  return gone.length > 0;
}

export interface TokenStatus {
  createdAt: Date;
  lastUsedAt: Date | null;
  lastSummary: string | null;
}

export async function tokenStatus(userId: string): Promise<TokenStatus | null> {
  const [row] = await getDb()
    .select({ createdAt: apiTokens.createdAt, lastUsedAt: apiTokens.lastUsedAt, lastSummary: apiTokens.lastSummary })
    .from(apiTokens)
    .where(eq(apiTokens.userId, userId))
    .limit(1);
  return row ?? null;
}

export interface TokenOwner {
  userId: string;
  timezone: string;
}

/** Kontot som äger nyckeln, om nyckeln finns och kontot är godkänt. */
export async function ownerOfToken(raw: string): Promise<TokenOwner | null> {
  if (!raw.startsWith(TOKEN_PREFIX) || raw.length > 128) return null;
  const [row] = await getDb()
    .select({ userId: users.id, status: users.status, timezone: userSettings.timezone })
    .from(apiTokens)
    .innerJoin(users, eq(users.id, apiTokens.userId))
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(eq(apiTokens.tokenHash, hashToken(raw)))
    .limit(1);
  if (!row || row.status !== "approved") return null;
  return { userId: row.userId, timezone: row.timezone ?? "Europe/Stockholm" };
}

export async function markTokenUsed(userId: string, summary: string): Promise<void> {
  await getDb()
    .update(apiTokens)
    .set({ lastUsedAt: new Date(), lastSummary: summary })
    .where(eq(apiTokens.userId, userId));
}
