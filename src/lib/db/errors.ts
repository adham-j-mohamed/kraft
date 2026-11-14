/** Postgres-felkod 23505 (unik begränsning). Drizzle lägger pg-felet i `cause`. */
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}
