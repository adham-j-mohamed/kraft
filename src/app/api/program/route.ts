import { authed, jsonError, readJson } from "@/lib/api";
import { getActiveProgram, saveProgram } from "@/lib/training/queries";
import { programInput } from "@/lib/training/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  return Response.json({ program: await getActiveProgram(a.user.id) });
}

/** Skapar ett nytt program och gör det till det aktiva. */
export async function POST(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const body = await readJson(request, programInput);
  if ("error" in body) return body.error;
  const result = await saveProgram(a.user.id, body.data);
  if (!result.ok) return jsonError(result.error, 400);
  return Response.json({ id: result.id }, { status: 201 });
}
