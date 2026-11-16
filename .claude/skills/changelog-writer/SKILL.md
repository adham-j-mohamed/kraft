---
name: changelog-writer
description: "Bestämmer version-bump för en feature-branch och skriver den i package.json samt lägger till en ny rubrik i CHANGELOG.md. Kör innan PR öppnas — varje PR är en releasekandidat och det finns ingen [Unreleased]-sektion."
license: MIT
compatibility: opencode
metadata:
  audience: contributors
  workflow: git
---

# Changelog Writer (för detta repo)

Kör denna innan du öppnar en PR. Varje PR som mergas till `main` behandlas som en
releasekandidat; därför skrivs version och changelog direkt i repot när det behövs.

Denna skill bestämmer vilken semver-bump som krävs utifrån commit‑historiken (conventional
commits) och uppdaterar:
- `package.json` fältet `version`
- `CHANGELOG.md` med en ny rubrik `## [X.Y.Z] - YYYY-MM-DD` där branchens ändringar grupperas
  enligt typ (`Added`, `Changed`, `Fixed`, `Deprecated`, `Removed`, `Security`).

Regler
- Ingen `[Unreleased]`-sektion: varje PR som behöver bump skriver sin egen version under en
  ny rubrik med dagens datum.
- Versionen som skrivs saknar build-metadata (`+...`). CI lägger eventuellt på build‑suffix senare.
- Endast ändringar som påverkar körbar kod eller distribution kräver version‑bump. Ändringsvägar
  som triggar bump: `src/**`, `public/**`, `pages/**`, `app/**`, `package.json`, `package-lock.json`,
  `Dockerfile`, `next.config.ts`, `scripts/**`, `.github/workflows/**`, samt andra bygg‑ och
  distributionsrelaterade filer.
- Dokumentation, tester eller CI-only-förändringar behöver normalt ingen bump.

Typ → sektion
- `feat` → `Added`
- `fix` → `Fixed`
- `perf` → `Changed` eller `Fixed` beroende på användar‑synlig effekt
- `refactor`, `style` → vanligtvis ignoreras, annars `Changed`
- `docs`, `test`, `build`, `ci`, `chore` → ignoreras om de inte är användar‑synliga
- `BREAKING CHANGE:` eller `!` → `Changed` med "Breaking:"-prefix och migrationsnotis
- `security` scope eller commits som adresserar sårbarheter → `Security`

Version‑bump‑logik
```
Om BREAKING CHANGE eller `!` → MAJOR++, MINOR=0, PATCH=0
Annars om några `feat` → MINOR++, PATCH=0
Annars om `fix|perf|revert` → PATCH++
Annars → ingen bump (ingen release behövs)
```
För `0.x.y` behandla breaking changes som MINOR-bump om inte annan policy gäller.

Bas för bump
- Basen är branchens upstream (tracking branch) om den är satt; annars `main`, eller en
  `hotfix/<name>` branch om detta är en hotfix. Läs basens nuvarande version från
  `git show origin/<base>:package.json` i realtid när du räknar.

Git‑kommandon (exempel)
```bash
BASE=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null | sed 's#^origin/##')
# fallback till main om inget upstream
git show "origin/${BASE}:package.json" | grep '"version"'                # basens nuvarande version
git log "$(git merge-base HEAD "origin/${BASE}")"..HEAD --oneline      # commits på denna branch
git log HEAD --oneline --grep='BREAKING CHANGE:'                         # breaking footers
git log HEAD --oneline --grep='!:'                                       # breaking subjects
```

Vad denna skill ändrar
1. Bestäm base‑branch och läs dess version från `package.json`.
2. Kategorisera commits sedan merge‑base och beräkna bump enligt tabellen ovan.
3. Uppdatera `package.json` → `version` till nya versionen (ingen build‑suffix).
4. Infoga en ny rubrik i `CHANGELOG.md` direkt efter filens inledning:
   `## [X.Y.Z] - YYYY-MM-DD`, och lista commits under lämpliga sektioner.
5. Uppdatera compare‑link i botten: `[X.Y.Z]: https://github.com/<org>/<repo>/compare/vPREV...vX.Y.Z`.

Format (exempel)
```markdown
# Changelog

## [1.3.0] - 2026-11-16

### Added
- PWA offline‑queue och service worker (#123)

### Fixed
- UI: TopBar visar inget sync‑läge (#120)

[1.3.0]: https://github.com/<org>/<repo>/compare/v1.2.1...v1.3.0
```

Commit‑hygien
- Om changelog‑ändringen kan ammas med en lokal, ej pushad commit, amendera.
- Om commit redan delats, gör en separat commit med changelog+package.json.

Output‑checklista
- [ ] `package.json` version uppdaterad
- [ ] Ny `## [X.Y.Z] - YYYY-MM-DD` rubrik i `CHANGELOG.md`
- [ ] Manual‑reviewlista för commits som inte parsas
- [ ] Breaking changes dokumenterade med migrationsanteckning
- [ ] Compare‑link uppdaterad
