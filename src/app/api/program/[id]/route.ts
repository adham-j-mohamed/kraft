import { authed, jsonError, readJson } from "@/lib/api";
import { deleteProgram, getProgram, saveProgram } from "@/lib/training/queries";
import { programInput } from "@/lib/training/validate";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const program = await getProgram(a.user.id, (await params).id);
  if (!program) return jsonError("not_found", 404);
  return Response.json({ program });
}

/** Ersätter programmets namn, pass och övningar. */
export async function PUT(request: Request, { params }: Ctx) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const body = await readJson(request, programInput);
  if ("error" in body) return body.error;
  const result = await saveProgram(a.user.id, body.data, (await params).id);
  if (!result.ok) return jsonError(result.error, result.error === "not_found" ? 404 : 400);
  return Response.json({ id: result.id });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  if (!(await deleteProgram(a.user.id, (await params).id))) return jsonError("not_found", 404);
  return Response.json({ ok: true });
}
