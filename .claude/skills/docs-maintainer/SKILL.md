---
name: docs-maintainer
description: "Granskar och uppdaterar docs/ enligt Diataxis så den stämmer mot kod och konfiguration i detta repository."
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: docs
---

# Docs Maintainer (för Kraft)

Håll `docs/` korrekt och aktuell i förhållande till denna kodbas.
Körs på begäran (inte automatiskt på varje commit).

Scope
- Operera endast inom detta repository.
- Redigera i första hand filer under `docs/` och `README.md` om det behövs.
- Rör inte `docs/reference/api` om det finns en sådan mapp som genereras automatiskt.

Struktur (Diataxis)
- `docs/tutorials/` — steg-för-steg guider för användare
- `docs/guides/` — hur‑gör‑man för specifika uppgifter
- `docs/reference/` — faktauppslag (konfiguration, API‑fält, felkoder)
- `docs/explanation/` — designval och bakgrund
- `docs/internal/` — drift och bidragsinstruktioner (icke‑slutanvändare)
- `docs/index.md` — landningssida och navigationsnav

Konventioner
- Varje docs‑fil bör ha frontmatter med minst `title` och `description`.
- Använd root‑relativa länkar för intern navigation och undvik hårdkodade URL‑domäner.
- Exempel och konfigurationsvärden måste verifieras mot repoets källor (kod, scripts, .env.example).

Korrekthetsregel
- Varje faktapåstående verifieras mot källkod eller konfiguration i repot. Gissa aldrig.
- Prioritera dessa källor: endpoint‑router, API‑handlers, validation/schema‑moduler, `package.json` scripts, `next.config.ts`, `docker-compose.yml`, och `.env.example`.

Granskningsflöde
1. Bestäm scope: en fil, en katalog eller alla docs.
2. För varje fil i scope:
   - Kontrollera frontmatter (title, description)
   - Kontrollera att exempelpayloads/skript stämmer (paths, fält, metoder)
   - Kontrollera länkar är korrekta mot befintliga filer/rutter
   - Kör stavningskontroll för tekniska ord (valfritt)
3. Skapa en rapport: must‑fix (factual) och should‑fix (stil/struktur)
4. Applicera direkta korrigeringar för must‑fix med korta commits och ange referens i commit‑meddelandet

Index och navigering
- Uppdatera `docs/index.md` när du lägger till eller flyttar användardokumentation.
- Håll navigeringen enkel och möjlig att skanna.

Output checklist
- [ ] Lista med faktagranskade ändringar och referenser
- [ ] Uppdaterade docs‑filer med korrekt frontmatter
- [ ] `docs/index.md` uppdaterad om struktur ändrats
- [ ] Ambiguösa påståenden flaggade för mänsklig granskning

Edit‑policy
- Gör små, tydliga commits för dokumentationsändringar.
- Länka commits till issue eller PR när det finns en koppling till kodändring.
- Undvik att ändra behavior‑beskrivningar utan att verifiera koden först.
