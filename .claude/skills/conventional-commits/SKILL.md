---
name: conventional-commits
description: "Verifikation och vägledning för Conventional Commits-formatet i detta repo. Output kan användas av changelog-writer."
license: MIT
compatibility: opencode
metadata:
  audience: contributors
  workflow: git
---

# Conventional Commits (för Kraft)

Syfte: se till att commit‑meddelanden följer konventionen så de kan mappas till changelog‑sektioner
och version‑bump‑regler.

Regler
- Format: `<type>[optional scope][!]: <description>`
- Tillåtna typer: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Scope är valfritt och ska vara ett kort, gemenerat ord (inga mellanslag)
- Beskrivning: kort, låg bokstav, ingen avslutande punkt
- Använd `!` endast för verkliga breaking changes
- För breaking changes med detaljer, lägg till en `BREAKING CHANGE:`-sektion i meddelandets body

Exempel
- `feat(sessions): add pending placeholder for queued sets`
- `fix(api): return 202 for queued writes`
- `docs: update offline behaviour in help`
- `perf: reduce re-renders in TopBar`
- `feat(session)!: change session id format (breaking)`

När du ska fråga
- Om commitens typ eller scope är osäker, fråga innan du kategoriserar.
- Om commit innehåller mycket olika ändringar, dela upp i flera commits med tydliga typer.

Användning i pipelines
- Denna skill kan parsas programatiskt i CI för att generera changelog‑utkast och
  bestämma version‑bump. Commits som inte matchar formatet ska flaggas för manuell review.
