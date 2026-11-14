import { authed, jsonError, readJson } from "@/lib/api";
import { createExercise, listExercises } from "@/lib/training/queries";
import { exerciseInput } from "@/lib/training/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const q = new URL(request.url).searchParams.get("q") ?? undefined;
  return Response.json({ exercises: await listExercises(a.user.id, { q }) });
}

export async function POST(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const body = await readJson(request, exerciseInput);
  if ("error" in body) return body.error;
  const result = await createExercise(a.user.id, body.data);
  if (!result.ok) return jsonError(result.error, 409);
  return Response.json({ exercise: result.exercise }, { status: 201 });
}
