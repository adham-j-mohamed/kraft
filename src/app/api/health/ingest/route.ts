import { jsonError, readJson } from "@/lib/api";
import { markTokenUsed, ownerOfToken } from "@/lib/auth/api-token";
import { IngestError, applyHealthSync, ingestInput } from "@/lib/health/ingest";

export const dynamic = "force-dynamic";

function bearer(request: Request): string | null {
  const m = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(\S+)$/i);
  return m ? m[1] : null;
}

/**
 * Mottagare för Genvägar-appen på iPhone: vikt och vatten från Hälsa. Anropet kommer
 * inte från en webbläsare, så det autentiseras med kontots hälsonyckel (Bearer) i stället
 * för sessionskakan, och Origin kontrolleras inte. Nyckeln gäller bara den här routen.
 */
export async function POST(request: Request) {
  const raw = bearer(request);
  const owner = raw ? await ownerOfToken(raw) : null;
  if (!owner) return jsonError("unauthorized", 401);

  const body = await readJson(request, ingestInput);
  if ("error" in body) return body.error;

  try {
    const result = await applyHealthSync(owner.userId, owner.timezone, body.data);
    await markTokenUsed(owner.userId, JSON.stringify(result));
    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof IngestError) return jsonError("invalid", 400, { field: error.field, message: error.message });
    throw error;
  }
}
