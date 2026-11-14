import { authed, jsonError, readJson } from "@/lib/api";
import { addSet } from "@/lib/training/queries";
import { createSetInput } from "@/lib/training/validate";

export const dynamic = "force-dynamic";

/** Loggar ett set. Idempotent på `clientId` — samma set två gånger blir en rad. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const body = await readJson(request, createSetInput);
  if ("error" in body) return body.error;
  const result = await addSet(a.user.id, (await params).id, body.data);
  if (result.ok) return Response.json({ set: result.set }, { status: 201 });
  return jsonError(
    result.error,
    result.error === "not_found" ? 404 : result.error === "unknown_exercise" ? 400 : 409,
  );
}
