"use client";

import { createContext, useContext, useMemo } from "react";
import { makeFormatters } from "@/lib/training/format";
import { makeT } from "./dictionaries";
import { equipmentLabel, exerciseLabel } from "./exercises";
import type { Locale } from "./locales";

const LocaleContext = createContext<Locale>("sv");

/** Lägger språket i ett kontext; ordlistan byggs i klienten ur samma modul som servern. */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const locale = useContext(LocaleContext);
  return useMemo(() => {
    const { t, tn } = makeT(locale);
    return {
      locale,
      t,
      tn,
      fmt: makeFormatters(locale, t, tn),
      exName: (name: string) => exerciseLabel(name, locale),
      equipment: (name: string | null) => equipmentLabel(name, locale),
    };
  }, [locale]);
}
