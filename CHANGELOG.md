# Changelog

## [0.1.0] - 2026-11-16

### Added

### Fixed

### Changed
- docs: generate CHANGELOG.md (v0.1.0)
- ci: build & publish image workflow; add docker-compose.prod.yml and docs for image-based auto-deploy
- chore: uppdatera .claude skills för detta repo (Node/Next.js, package.json, Diataxis docs)
- ci(cd): add GitHub Actions CI build and deploy workflows (rsync -> aj-lab, migrate/seed, healthcheck)
- chore: ignore .hermes; add .claude skills and .github workflows to repo
- chore: uppdaterad .gitignore (lägg till .hermes, editor- och loggignorer)
- plan(ci/cd): förslag för CI/CD, build/checks och rsync-deploy till aj-lab
- ui: visa global sync/queued-indikator i TopBar via SW-meddelanden
- session: visa queued/synk-status, lyssna på SW-meddelanden och hantera 202 (queued) med placeholder-set
- sw: hårda service workern — whitelist för köade endpoints, cache-version, bättre felhantering och backoff
- Session UI: compact previous with expand, theme and PWA polish, canonical exercise creation
- PWA: manifest, service worker, client-side theme and language persistence; i18n canonical names; status visibility; agent admin
- Steg 8: streckkodsscanning med Open Food Facts
- Steg 7: matdelen — dagbok, sök, portion, mål, vatten, vikt och vecka
- Logga, hjälpsida, sammanhängande setnumrering och smalare toppfält
- Tema (mörkt/ljust) som fungerar, status bara för admin, återställ övningsnamnsändring
- i18n: canonicalize created exercises; theme selector; status visibility; rename claude->agent in DB
- Språkval, öppen registrering med godkännande och ringklocka
- Adressen är kraft.jmohamed.se (tidigare tracker.jmohamed.se)
- Steg 6: träningsdelen — program, rotation, passlogger och förra passet
- Byt Google-inloggning mot användarnamn och lösenord

[0.1.0]: https://github.com/adham-j-mohamed/kraft/compare/vPREV...v0.1.0
