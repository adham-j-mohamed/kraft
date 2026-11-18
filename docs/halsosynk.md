# Hälsosynk (iPhone → Kraft)

Kraft är en webbapp och kan inte läsa Hälsa direkt. Det går bara från en app eller en genväg på
telefonen. Lösningen är en signerad genväg i Genvägar-appen som läser Hälsa och skickar värdet till
Kraft med ett vanligt HTTPS-anrop. Ingen App Store, ingen MDM, ingen sideload.

## Flödet för användaren

1. `/settings/health` → **Skapa nyckel** → **Kopiera nyckeln** (klartexten visas en gång).
2. **Lägg till genvägen** (`/shortcuts/kraft-halsosynk.shortcut`). Genvägar frågar efter nyckeln.
3. En personlig automation i Genvägar (Tid på dagen → Kör genväg → Kör direkt). Den går inte att
   leverera i genvägsfilen; användaren skapar den en gång.
4. Sidan visar **Senaste synk** med tid och vad som kom fram, så det syns om något inte fungerar.

## Servern

- `POST /api/health/ingest`, `Authorization: Bearer kft_…`. Nyckeln lagras som SHA-256 i
  `api_tokens`, en per konto; ny nyckel ersätter den gamla. Routen kontrollerar inte Origin eftersom
  anropet inte kommer från en webbläsare, och nyckeln gäller bara den här routen.
- Fält (alla valfria, tomma strängar räknas som "ingen data"):
  `weight`, `weightUnit`, `water`, `waterUnit`, `date` (YYYY-MM-DD).
  Tal tas emot som tal eller text, med komma eller punkt som decimaltecken, och enheten får stå i
  texten ("82,3 kg"). Känd enhet: kg, g, lb, st; ml, dl, cl, l, fl oz, cup. Utan enhet antas kg och ml.
- Datum utan `date` är dagens datum i användarens tidszon. Intervall: 30 dagar bakåt, 1 dag framåt.
- **Idempotent:** vikt ersätter dagens vägning. Vatten är dagssumma och blir det **största** av
  Kraft och Hälsa för dagen, så en omkörning dubbelräknar inte och en manuell loggning försvinner inte.
- Svar: `{ ok, date, weightKg?, waterMl? }`. Fel: 401 (nyckel saknas/ogiltig), 400 med `field` och
  `message`.

## Genvägsfilen

`KRAFT_URL=https://… node scripts/build-shortcut.mjs` på en Mac bygger plisten och signerar den med
`shortcuts sign -m anyone`. iOS importerar inte osignerade filer, och signeringen finns bara på
macOS. Filen innehåller instansens adress och checkas därför inte in; `scripts/deploy.sh` bygger den
om den saknas.

Genvägen har fyra åtgärder: nyckeln (import-fråga), Hitta hälsoprover (Vikt, senaste), värdet, POST.

## Vad som är verifierat och inte

- **Verifierat:** signeringen fungerar, servern (nyckel, tolkning, idempotens, 401/400) och
  inställningssidan.
- **Inte verifierat:** att genvägen kör på en iPhone. Health-åtgärdernas plist-format är odokumenterat
  och finns inte i macOS egna ramverk, så åtgärd 1–2 är byggda efter det som är känt om formatet.
  Provkör på en riktig iPhone innan fler bjuds in (regel 10 i AGENTS.md gäller även här).
- **Vatten** skickas inte av genvägen än. Servern tar emot det. Att hitta "dagens" prover kräver ett
  datumfilter vars exakta kodning behöver hämtas ur en genväg byggd för hand i Genvägar-appen
  (Dela → Exportera fil, eller en iCloud-länk).
- Går åtgärd 1–2 inte att köra: bygg en genväg för hand i Genvägar-appen med samma fyra steg och
  dela den, så kan plisten läsas och byggskriptet rättas.
