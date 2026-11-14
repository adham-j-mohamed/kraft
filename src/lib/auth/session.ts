import { SignJWT, jwtVerify } from "jose";
import { SESSION_DAYS } from "./config";

export interface SessionToken {
  userId: string;
  /** Sekunder sedan epoch, från JWT:ns `iat`. */
  issuedAt: number;
}

function secret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 32) throw new Error("AUTH_SECRET saknas eller är för kort");
  return new TextEncoder().encode(raw);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionToken | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.iat !== "number") return null;
    return { userId: payload.sub, issuedAt: payload.iat };
  } catch {
    return null;
  }
}
