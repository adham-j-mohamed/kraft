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
- Publik adress: `tracker.jmohamed.se` via Cloudflare-tunneln `aj-lab`. Ingen
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
| `src/lib/auth` | lösenordshash (scrypt), sessioner, inloggning, behörighetsregler |
| `src/lib/nutrition.ts` | BMR, TDEE, makrofördelning, 1RM |
| `scripts/migrate.mjs` | migrationer vid start/engångskörning |
| `scripts/seed.mjs` | globala övningar och livsmedel, idempotent |
| `drizzle/` | genererade SQL-migrationer, committas |
| `docker-compose.yml` | `db`, `app`, `tools` |

## Arbetssätt

- Skriv på svenska i kod-kommentarer och UI; README på engelska eftersom repot är
  öppen källkod.
- Ett steg i taget, med en commit per steg.
- När ett steg är klart: verifiera med kommando och siffror, inte med påståenden.
- Planen för projektet ligger i `Labb`-repot:
  `.hermes/plans/2026-11-13_2010-traning-och-matlogg-pwa.md`.
