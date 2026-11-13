const TZ = "Europe/Stockholm";

/** Dagens datum som YYYY-MM-DD i användarens tidszon. */
export function todayInZone(timeZone: string = TZ, now: Date = new Date()): string {
  // en-CA ger ISO-liknande format: 2026-11-13
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Måndag = veckans första dag, som ISO-vecka. */
export function startOfWeek(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function weekDays(isoDate: string): string[] {
  const start = startOfWeek(isoDate);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** "Måndag 13 november" — för rubriker. */
export function formatDay(isoDate: string, locale = "sv-SE"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

export function isoNow(): string {
  return new Date().toISOString();
}
