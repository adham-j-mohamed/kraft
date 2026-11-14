export const SESSION_COOKIE = "kraft_session";
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

/** Bara relativa sökvägar som mål efter inloggning — aldrig en främmande adress. */
export function safeNext(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
