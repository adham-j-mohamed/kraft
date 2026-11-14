import { authed, jsonError } from "@/lib/api";
import { countPending } from "@/lib/auth/pending";

export const dynamic = "force-dynamic";

/** Räknaren bakom ringklockan. Bara admin. */
export async function GET(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  if (a.user.role !== "admin") return jsonError("forbidden", 403);
  return Response.json({ count: await countPending() });
}
