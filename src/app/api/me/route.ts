import { getCurrentUser } from "@/lib/auth/user";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    settings: user.settings,
  });
}
