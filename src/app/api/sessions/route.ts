import { authed, jsonError, readJson } from "@/lib/api";
import { startSession } from "@/lib/training/queries";
import { startSessionInput } from "@/lib/training/validate";

export const dynamic = "force-dynamic";

/** Startar ett pass. Samma `clientId` två gånger ger samma pass (200 i stället för 201). */
export async function POST(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const body = await readJson(request, startSessionInput);
  if ("error" in body) return body.error;

  const result = await startSession(a.user.id, body.data.workoutId, body.data.clientId);
  if (result.ok) return Response.json({ id: result.id }, { status: result.existing ? 200 : 201 });
  if (result.error === "active_session") return jsonError("active_session", 409, { sessionId: result.sessionId });
  return jsonError(result.error, result.error === "not_found" ? 404 : result.error === "conflict" ? 409 : 400);
}
