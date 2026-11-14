import { cookies, headers } from "next/headers";
import { makeFormatters } from "@/lib/training/format";
import { makeT } from "./dictionaries";
import { equipmentLabel, exerciseLabel } from "./exercises";
import { LANG_COOKIE, isLocale, resolveLocale, type Locale } from "./locales";

/** Språket för den här förfrågan: eget val (kaka), annars enhetens språk. */
export async function getLocale(): Promise<Locale> {
  const [store, hdrs] = await Promise.all([cookies(), headers()]);
  return resolveLocale(store.get(LANG_COOKIE)?.value, hdrs.get("accept-language"));
}

/** Användarens uttryckliga val, eller null när språket följer enheten. */
export async function getExplicitLocale(): Promise<Locale | null> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLocale(value) ? value : null;
}

export async function getI18n() {
  const locale = await getLocale();
  const { t, tn } = makeT(locale);
  return {
    locale,
    t,
    tn,
    fmt: makeFormatters(locale, t, tn),
    exName: (name: string) => exerciseLabel(name, locale),
    equipment: (name: string | null) => equipmentLabel(name, locale),
  };
}
