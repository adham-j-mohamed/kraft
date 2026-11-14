/**
 * Språkval. Språket kommer i tur och ordning från: kakan `kraft_lang` (användarens
 * eget val), enhetens `Accept-Language`, och till sist svenska om inget huvud finns.
 * Enhet med ett språk vi saknar får engelska — hellre ett neutralt språk än svenska.
 */
export const LOCALES = ["sv", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const LANG_COOKIE = "kraft_lang";
export const LOCALE_NAMES: Record<Locale, string> = { sv: "Svenska", en: "English" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Första språket i `Accept-Language` (sorterat på q) vars huvuddel vi har. */
export function fromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return "sv";
  const prefs = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), weight: Number.isFinite(weight) ? weight : 1 };
    })
    .filter((p) => p.tag && p.tag !== "*" && p.weight > 0)
    .sort((a, b) => b.weight - a.weight);
  for (const { tag } of prefs) {
    const primary = tag.split("-")[0];
    if (isLocale(primary)) return primary;
  }
  return "en";
}

export function resolveLocale(cookieValue: string | undefined, acceptLanguage: string | null | undefined): Locale {
  return isLocale(cookieValue) ? cookieValue : fromAcceptLanguage(acceptLanguage);
}

/** BCP 47-tagg för Intl. */
export function intlTag(locale: Locale): string {
  return locale === "sv" ? "sv-SE" : "en-GB";
}
