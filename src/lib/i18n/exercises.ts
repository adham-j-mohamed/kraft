/**
 * Visningsnamn för seedade övningar. Databasen har svenska namn; övningar som
 * användaren skapat själv och okända namn visas oförändrade. Historiken fryser
 * namnet som det stod vid passet, så översättningen görs vid visning.
 */
import type { Locale } from "./locales";

const EN: Record<string, string> = {
  Bänkpress: "Bench press",
  "Sned bänkpress": "Incline bench press",
  Hantelpress: "Dumbbell press",
  "Sned hantelpress": "Incline dumbbell press",
  "Bröstpress i maskin": "Machine chest press",
  "Kabel-flyes": "Cable flyes",
  Armhävningar: "Push-ups",
  Dips: "Dips",
  Marklyft: "Deadlift",
  Skivstångsrodd: "Barbell row",
  Hantelrodd: "Dumbbell row",
  Latsdrag: "Lat pulldown",
  "Sittande kabelrodd": "Seated cable row",
  Chins: "Chin-ups",
  "Raka marklyft": "Stiff-leg deadlift",
  "Face pull": "Face pull",
  Militärpress: "Overhead press",
  "Axelpress med hantlar": "Dumbbell shoulder press",
  Sidolyft: "Lateral raise",
  "Omvända flyes": "Reverse flyes",
  Shrugs: "Shrugs",
  Skivstångscurl: "Barbell curl",
  Hantelcurl: "Dumbbell curl",
  Hammercurl: "Hammer curl",
  "Preacher curl": "Preacher curl",
  "Triceps pushdown": "Triceps pushdown",
  "Skull crushers": "Skull crushers",
  "Triceps dips": "Triceps dips",
  "Över huvudet-extension": "Overhead triceps extension",
  Knäböj: "Squat",
  Frontböj: "Front squat",
  Benpress: "Leg press",
  "Rumänska marklyft": "Romanian deadlift",
  Benspark: "Leg extension",
  Lårcurl: "Leg curl",
  Utfall: "Lunges",
  Vadpress: "Calf raise",
  Höftabduktion: "Hip abduction",
  Plankan: "Plank",
  Situps: "Sit-ups",
  Benlyft: "Leg raises",
  Kabelcrunches: "Cable crunches",
  "Ab wheel": "Ab wheel",
  Löpband: "Treadmill",
  Roddmaskin: "Rowing machine",
  Cykel: "Bike",
  Promenad: "Walk",
  Burpees: "Burpees",
};

const EQUIPMENT_EN: Record<string, string> = {
  skivstång: "barbell",
  hantlar: "dumbbells",
  hantel: "dumbbell",
  maskin: "machine",
  kabel: "cable",
  kroppsvikt: "bodyweight",
  ute: "outdoors",
};

/**
 * Svenska namn på seedade övningar vars svenska eller engelska namn innehåller `q`.
 * Sökningen ska hitta "bench" lika väl som "bänk", oavsett vilket språk appen visas på.
 */
export function swedishNamesMatching(q: string): string[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return Object.entries(EN)
    .filter(([sv, en]) => sv.toLowerCase().includes(needle) || en.toLowerCase().includes(needle))
    .map(([sv]) => sv);
}

export function exerciseLabel(name: string, locale: Locale): string {
  return locale === "en" ? (EN[name] ?? name) : name;
}

export function equipmentLabel(name: string | null, locale: Locale): string | null {
  if (!name) return null;
  return locale === "en" ? (EQUIPMENT_EN[name] ?? name) : name;
}

/**
 * From a user-provided input, return the canonical stored name (Swedish key) if
 * the input matches a known English or Swedish name. Otherwise return the input
 * unchanged. This makes creating exercises language-aware: users who type
 * "bench" get the stored Swedish key "Bänkpress" so seeds remain consistent.
 */
export function canonicalNameFromInput(input: string): string {
  const q = input.trim();
  if (!q) return input;
  // swedishNamesMatching already checks both Swedish and English entries.
  const matched = swedishNamesMatching(q);
  if (matched.length) return matched[0];
  // Fallback: exact English match to known translation map
  for (const [sv, en] of Object.entries(EN)) {
    if (en.toLowerCase() === q.toLowerCase()) return sv;
  }
  return input;
}
