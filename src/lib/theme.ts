/**
 * Tema: mörkt eller ljust. Ordningen är kakan `kraft_theme` (enhetens eget val, funkar även
 * utloggat och ger rätt färg redan i första svaret), därefter kontots sparade val, därefter
 * mörkt. Äldre värdet `system` i databasen behandlas som mörkt.
 */
export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = "kraft_theme";
export const DEFAULT_THEME: Theme = "dark";

/** Färgen på webbläsarens/iOS statusfält. Måste följa sidans bakgrund. */
export const THEME_COLOR: Record<Theme, string> = { dark: "#0b0d0c", light: "#f4f6f2" };

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export function resolveTheme(cookieValue: string | undefined, saved: string | null | undefined): Theme {
  if (isTheme(cookieValue)) return cookieValue;
  if (isTheme(saved)) return saved;
  return DEFAULT_THEME;
}
