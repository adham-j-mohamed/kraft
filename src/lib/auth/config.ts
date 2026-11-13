export const SESSION_COOKIE = "kraft_session";
export const STATE_COOKIE = "kraft_oauth_state";
export const VERIFIER_COOKIE = "kraft_oauth_verifier";
export const SESSION_DAYS = 60;

export function appUrl(): string {
  const raw = process.env.APP_URL ?? "http://localhost:3310";
  return raw.replace(/\/+$/, "");
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Secure-cookie bara när appen faktiskt serveras över https. */
export function cookieSecure(): boolean {
  return appUrl().startsWith("https://");
}

export function googleCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET saknas");
  }
  return { clientId, clientSecret };
}
