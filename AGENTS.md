# AGENTS.md — Kraft

Kraft är en PWA för träning och mat, avsedd att installeras på iPhone. Den här
filen gäller allt arbete i repot.

## Roller och maskiner

- Koden redigeras i arbetskopian på Macen och synkas till servern med
  `scripts/deploy.sh` (rsync till `aj-lab:~/kraft`).
- Appen och databasen körs som Docker-containrar på `aj-lab` (Ubuntu 26.04,
  3,2 GB RAM). Bygget sker på servern, aldrig på Macen.
- Servern är alltid på; Macen sover. Därför är servern värd för allt som ska
  svara.
- Publik adress: `kraft.jmohamed.se` via Cloudflare-tunneln `aj-lab`. Ingen
  Cloudflare Access — appen har egen inloggning.

## Hårda regler

1. **Inga hemligheter i repot.** Nycklar ligger i `~/kraft/.env` på servern
   (600). `.env.example` visar bara namnen. Skriv aldrig ut ett värde i chatten.
2. **Repot är öppen källkod (MIT).** Ingen kod får förutsätta privata endpoints,
   interna IP-adresser eller personliga konton. Standardvärden ska vara rimliga
   för den som klonar repot.
3. **All användardata filtreras på `user_id`.** En fråga som inte filtrerar på
   inloggat konto är en bugg, även om den "bara" gäller läsning.
4. **Makron, namn och vikt kopieras in i loggraderna.** Historiken ska inte
   ändras när ett livsmedel eller en övning uppdateras.
5. **`logged_on` är ett datum i användarens tidszon**, inte UTC. Kvällsmat ska
   hamna på rätt dag.
6. **`client_id` är idempotensnyckeln** för offline-kön. Skrivningar ska tåla att
   skickas två gånger.
7. **Migrationer är additiva och genereras med `npm run db:generate`.** Radera
   aldrig en migrering som redan körts på servern.
8. **Bildexterna pinnas till exakt tagg och digest** i `docker-compose.yml`.
9. **Verifiera på servern, aldrig utifrån.** Skal på Macen når inte LAN:et;
   `ssh aj-lab` gör det.
10. **Mät på riktig iPhone** innan något kamerarelaterat kallas klart. Safari på
    iOS saknar `BarcodeDetector` och desktop-Safari beter sig annorlunda.

## Struktur

| Sökväg | Innehåll |
|---|---|
| `src/app` | sidor och API-routes (App Router) |
| `src/lib/db/schema.ts` | datamodellen, enda källan till sanning |
| `src/lib/auth` | lösenordshash (scrypt), sessioner, inloggning, behörighetsregler, väntande konton (`pending.ts`) |
| `src/lib/food` | matdelen: frågor (`queries.ts`), validering, målberäkning (`goals.ts`, live ur längd/vikt/ålder), typer och viktsnitt |
| `src/app/food` | dagbok, sök och portion, eget livsmedel, vecka |
| `src/lib/help/content.ts` | texten på hjälpsidan (`/help`), svenska och engelska. **Ändrar du hur appen beter sig, ändra hjälptexten i samma commit** |
| `src/lib/i18n` | språkval (kaka `kraft_lang`, annars enhetens `Accept-Language`), ordlistor, övningsnamn |
| `src/lib/nutrition.ts` | BMR, TDEE, makrofördelning, 1RM |
| `src/lib/training` | träningsdelen: frågor (`queries.ts`), validering (zod), typer och progressionslogik som även klienten använder |
| `src/lib/api.ts` | gemensam ingång för JSON-routes: origin-kontroll, session, zod-parsning |
| `src/app/train` | översikt, programredigerare, passlogger och historik per övning |
| `src/lib/health`, `src/app/api/health/ingest` | hälsosynk: tolkning av värden och enheter (`units.ts`), skrivning av vikt/vatten (`ingest.ts`), mottagare med Bearer-nyckel. Nyckeln (`src/lib/auth/api-token.ts`) hashas med SHA-256 och är en per konto |
| `scripts/build-shortcut.mjs` | bygger och signerar genvägen `public/shortcuts/kraft-halsosynk.shortcut` (kräver macOS, `KRAFT_URL`); filen checkas inte in. Se `docs/halsosynk.md` |
| `scripts/migrate.mjs` | migrationer vid start/engångskörning |
| `scripts/seed.mjs` | globala övningar och livsmedel, idempotent |
| `drizzle/` | genererade SQL-migrationer, committas |
| `docker-compose.yml` | `db`, `app`, `tools` |

## Arbetssätt

- Alla texter i gränssnittet ligger i `src/lib/i18n/dictionaries.ts` på svenska **och** engelska
  (typen tvingar samma nycklar). Skriv aldrig en användarvänd text direkt i en komponent. Plural
  skrivs `_one`/`_other` och slås upp med `tn`. Seedade övningar översätts vid visning i
  `src/lib/i18n/exercises.ts`; databasen behåller de svenska namnen.
- Skriv på svenska i kod-kommentarer; README på engelska eftersom repot är
  öppen källkod.
- Ett steg i taget, med en commit per steg.
- När ett steg är klart: verifiera med kommando och siffror, inte med påståenden.
- Planen för projektet ligger i `Labb`-repot:
  `.hermes/plans/2026-11-13_2010-traning-och-matlogg-pwa.md`.
