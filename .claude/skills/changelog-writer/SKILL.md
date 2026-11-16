---
name: changelog-writer
description: "Determines the version bump for a feature branch and writes it directly into mix.exs and a new CHANGELOG.md heading — every PR is its own release candidate, there is no [Unreleased] staging section. Use before opening a PR, whenever a user requests \"bump the version\", \"create changelog\", \"document version changes\", or \"prepare release\"."
license: MIT
compatibility: opencode
metadata:
  audience: contributors
  workflow: git
---

# Changelog Writer

Run this **before opening a PR**, not at release time — every PR that reaches `main` is a
release candidate that goes live in `d00` immediately and reaches prod once approved, so there
is no separate "release" moment to defer version/changelog decisions to. This skill determines
the version bump for the current feature branch and writes it directly into both `mix.exs` and a
new `CHANGELOG.md` heading, filing everything this branch has done under that new version.

Commit format is owned by the `conventional-commits` skill — this skill turns those commits into
the version bump and changelog entries. If a commit does not match `type[scope][!]: description`,
add it to a manual-review list rather than guessing its category.

## When a version bump is required

Only when the branch's diff touches a path that would trigger a build: `lib/**`, `priv/**`,
`config/**`, `assets/**`, `rel/**`, `mix.exs`, `mix.lock`, `Dockerfile`, `.dockerignore` (the
same path list that `main-cicd-dispatch.yml` and `version-bump.yml`'s `check-version-bump` use to
decide whether a change is a release). A branch that only touches
docs, tests, or CI config doesn't need one — skip this skill for those.

## Repository rules (see AGENTS.md)

- `CHANGELOG.md` lives at the project root, in Keep a Changelog 1.1.0's section-naming style,
  with one deliberate deviation: **no `[Unreleased]` section.** Every PR that needs a version
  bump writes its changes directly under a brand-new `## [X.Y.Z] - YYYY-MM-DD` heading, because
  every merge to `main` is itself a release candidate, not a staging step toward one.
- `mix.exs`'s `version:` field and `CHANGELOG.md`'s newest heading must always show the same
  version — this skill updates both in the same change.
- The version this skill writes has **no build-metadata suffix** (no `+<n>`) — that's appended
  later by CI at merge-build time, on top of whatever semver core this skill declares.
- Use only these changelog sections: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`,
  `Security`.

## Type → section mapping

- `feat` → `Added`
- `fix` → `Fixed`
- `perf` → `Changed` or `Fixed` (by user-visible impact)
- `revert` → `Changed` or `Fixed` (by what was restored)
- `refactor`, `style` → omit unless behaviour/operator workflow changed → `Changed`
- `docs`, `test`, `build`, `ci`, `chore` → omit unless user-facing or operationally significant
- Body/subject deprecates a feature (any type) → `Deprecated`
- `BREAKING CHANGE:` footer or body states something was removed → `Removed`
- `fix` addressing a vulnerability, or scope contains `security` → `Security`
- `!` suffix or `BREAKING CHANGE:` footer → `Changed`, prefixed `Breaking:`, with a migration note if implied

## Breaking-change detection

Check, in order: (1) `!` after type/scope (`feat!:`, `feat(auth)!:`), then
(2) a `BREAKING CHANGE:` footer in the body. Document each with a short
description and a migration note.

## Version bump

```
Any `!` or BREAKING CHANGE:  -> MAJOR++, MINOR=0, PATCH=0
Else any feat                -> MINOR++, PATCH=0
Else any fix|perf|revert     -> PATCH++
Else                         -> no bump needed (branch doesn't touch a build-triggering path)
```

For `0.x.y`, treat breaking changes as a MINOR bump unless repo policy is stricter.

**The base to bump *from* is this branch's own base branch — not always `main`, and this skill
has no PR to ask, since it runs before one exists.** Determine the base branch from this
branch's git ancestry, not a hardcoded name: use its upstream/tracking branch
(`git rev-parse --abbrev-ref --symbolic-full-name @{u}`) if set; otherwise fall back to `main`
unless the current branch itself is named `hotfix/<name>` or was clearly branched from one — a
fix branch cut from `hotfix/<name>` bumps from `hotfix/<name>`'s version (the prod release it
was cut from), not from `main`'s, which may have moved on with unrelated work. If the base branch
can't be determined automatically, ask the developer rather than guessing. Always re-read that
base branch's *current* version at the time this skill runs (`git show origin/<base>:mix.exs`),
not a cached value from when this branch was created, since the base may have moved since.

**Collision with a version already claimed by another PR:** if, by the time this branch is ready
to merge, its base branch's version is no longer lower than this branch's already-declared
version (another PR merged into that same base in the meantime with an equal or higher version),
re-run this skill to bump again from the base's new current version before merging — the PR
check (see below) enforces this and will fail the build otherwise. This applies identically
whether the base is `main` or a `hotfix/<name>` branch.

## Git commands

```bash
BASE=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null | sed 's#^origin/##')
# BASE falls back to `main`, or to the hotfix/<name> branch this one was cut from, if untracked.
git show "origin/${BASE}:mix.exs" | grep 'version:'                  # base branch's current version — the bump base
git log "$(git merge-base HEAD "origin/${BASE}")"..HEAD --oneline    # this branch's commits since it diverged from BASE
git log HEAD --oneline --grep='BREAKING CHANGE:'               # breaking footers on this branch
git log HEAD --oneline --grep='!:'                             # breaking subjects on this branch
```

## What this skill actually changes

1. Determine this branch's base branch (its upstream/tracking ref, or `main`/`hotfix/<name>` by
   convention) and read that base's current version from `mix.exs`
   (`git show origin/<base>:mix.exs`).
2. Walk this branch's commits since it diverged from that base and apply the version-bump table
   above.
3. Update this branch's `mix.exs` `version:` field to the new version (no build suffix), then run
   `mix openapi.gen` — the OpenAPI `info.version` is read from `mix.exs`, and the `openapi.yml`
   CI check fails if `openapi/brokkr-serie-openapi.yaml` still carries the old version.
4. Insert a new heading directly below the file's top-level intro in `CHANGELOG.md`:
   `## [X.Y.Z] - YYYY-MM-DD` (today's date), with this branch's changes filed under it using the
   type → section mapping above. Do **not** create or touch an `[Unreleased]` heading — there
   isn't one.
5. Update the compare-link footer: add `[X.Y.Z]: https://github.com/<org>/<repo>/compare/vPREV...vX.Y.Z`
   for the new version, using whatever the previous top heading's version was as `vPREV`.

## Format

```markdown
# Changelog

## [2.2.0] - 2026-08-24

### Added
- Export data in CSV format with custom column selection (#501)

### Fixed
- Resolved session timeout on mobile (#489)

## [2.1.0] - 2024-01-15
...

[2.2.0]: https://github.com/<org>/<repo>/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/<org>/<repo>/compare/v2.0.0...v2.1.0
```

Be specific ("Fixed session timeout on mobile", not "fixed bug"), link issues,
group by section not chronologically.

## Execution hints

- Lower bound for "what this branch changed" = the merge-base with its base branch (`main`, or
  `hotfix/<name>` for a hotfix fix branch), not the latest tag — each branch's own commits are
  what get categorized, not the whole project history.
- Preserve existing headings/order; never rewrite unrelated (already-released) sections.

## Commit hygiene for changelog updates

When the changelog update is a direct follow-up to the latest commit in the
same working session, prefer a single logical commit:

- If the latest commit is local/unshared, amend it to include `CHANGELOG.md` and `mix.exs`.
- If the latest commit is already pushed/shared, create a new commit instead of
  rewriting shared history.
- Keep commit scope focused: changelog text should travel with the change it
  documents whenever practical.

## Output checklist

- [ ] `mix.exs`'s `version:` field bumped to the new version (no build suffix)
- [ ] `openapi/brokkr-serie-openapi.yaml` regenerated with `mix openapi.gen` so `info.version` matches
- [ ] New `## [X.Y.Z] - YYYY-MM-DD` heading in root `CHANGELOG.md` — no `[Unreleased]` heading
      created or left behind
- [ ] Manual-review list of commits that didn't parse
- [ ] Breaking changes marked, with migration notes
- [ ] Compare link added for the new version
