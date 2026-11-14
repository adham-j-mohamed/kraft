import { authed } from "@/lib/api";
import { getActiveProgram, getActiveSession, nextWorkoutOf } from "@/lib/training/queries";

export const dynamic = "force-dynamic";

/** Nästa pass i rotationen, och ett eventuellt pågående pass. */
export async function GET(request: Request) {
  const a = await authed(request);
  if ("error" in a) return a.error;
  const [program, active] = await Promise.all([getActiveProgram(a.user.id), getActiveSession(a.user.id)]);
  return Response.json({
    active,
    programId: program?.id ?? null,
    next: program ? nextWorkoutOf(program) : null,
  });
}
