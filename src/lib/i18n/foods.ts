/**
 * Visningsnamn för de delade livsmedlen (databasen har svenska namn). Egna livsmedel och okända
 * namn visas oförändrade. Samma idé som `exercises.ts`: översättning vid visning, och sökningen
 * matchar båda språken.
 */
import type { Locale } from "./locales";

const EN: Record<string, string> = {
  Ägg: "Egg",
  Äggvita: "Egg white",
  Havregryn: "Rolled oats",
  "Mjölk 3 %": "Milk 3 %",
  "Mjölk 0,5 %": "Milk 0.5 %",
  "Grekisk yoghurt 2 %": "Greek yoghurt 2 %",
  "Kvarg 0,2 %": "Quark 0.2 %",
  Kesella: "Cottage cheese",
  "Kycklingfilé, rå": "Chicken fillet, raw",
  "Kycklingbröst, tillagad": "Chicken breast, cooked",
  "Nötfärs 10 %": "Ground beef 10 %",
  "Lax, rå": "Salmon, raw",
  "Tonfisk i vatten": "Tuna in water",
  "Ris, kokt": "Rice, cooked",
  "Pasta, kokt": "Pasta, cooked",
  "Potatis, kokt": "Potato, boiled",
  Sötpotatis: "Sweet potato",
  Fullkornsbröd: "Wholegrain bread",
  Smör: "Butter",
  Olivolja: "Olive oil",
  Banan: "Banana",
  Äpple: "Apple",
  Apelsin: "Orange",
  Blåbär: "Blueberries",
  Jordgubbar: "Strawberries",
  Vassleprotein: "Whey protein",
  Mandel: "Almonds",
  Jordnötssmör: "Peanut butter",
  "Ost 28 %": "Cheese 28 %",
  Avokado: "Avocado",
  Broccoli: "Broccoli",
  Tomat: "Tomato",
  Gurka: "Cucumber",
  "Kaffe, svart": "Coffee, black",
};

const SERVING_EN: Record<string, string> = {
  "1 ägg": "1 egg",
  "1 portion": "1 portion",
  "1 glas": "1 glass",
  "1 klick": "1 knob",
  "1 msk": "1 tbsp",
  "1 banan": "1 banana",
  "1 äpple": "1 apple",
  "1 apelsin": "1 orange",
  "1 skopa": "1 scoop",
  "en handfull": "a handful",
  "1 skiva": "1 slice",
  "½ avokado": "½ avocado",
  "1 kopp": "1 cup",
};

export function foodLabel(name: string, locale: Locale): string {
  return locale === "en" ? (EN[name] ?? name) : name;
}

export function servingLabelText(label: string | null, locale: Locale): string | null {
  if (!label) return null;
  return locale === "en" ? (SERVING_EN[label] ?? label) : label;
}

/** Svenska namn på delade livsmedel vars svenska eller engelska namn innehåller `q`. */
export function swedishFoodNamesMatching(q: string): string[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return Object.entries(EN)
    .filter(([sv, en]) => sv.toLowerCase().includes(needle) || en.toLowerCase().includes(needle))
    .map(([sv]) => sv);
}
