---
name: docs-maintainer
description: Audit and update Diataxis docs in docs/ so they stay factually correct against code and config in the current repository. Verifies claims with repo evidence, maintains doc structure/frontmatter/link conventions, and keeps docs index navigation current. Use on demand for "audit docs", "update docs", or after behavior changes.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: docs
---

# Docs Maintainer

Keep `docs/` correct and current against this repository's code and config.
Runs on demand (not automatically on commit).

## Scope

- Operate only within this repository.
- Edit only `docs/` files outside `/docs/reference/api`.
- Do not touch anything under `/docs/reference/api` under any circumstances.
- Read source from `lib/`, `config/`, schemas/specs, and relevant repo-root files.
- Never edit or depend on other repositories.

## Documentation structure

Use Diataxis placement and do not mix purposes in one file:

- `docs/tutorials/` — learning-oriented, start-to-finish walkthroughs
- `docs/guides/` — task-oriented how-tos ("how do I …")
- `docs/reference/` — dry, factual lookup (config, data model, error codes, serial formats)
- `docs/explanation/` — background and design rationale
- `docs/internal/` — non-user-facing operational/contributor material
- `docs/index.md` — landing page and primary navigation entry point

## Doc conventions

- Every file starts with frontmatter containing at least `title` and `description`.
- Prefer root-relative links ending in `/` for internal docs links.
- Do not rewrite links that are intentionally virtual routes defined by repo conventions.
- If a route has no backing file and no clear repo convention, flag for human review.

## Correctness rule (evidence-based)

For each factual claim in docs, verify against this repository's source of truth.
Do not infer behavior from docs alone and do not guess when code is ambiguous.

Primary evidence sources typically include:

- router/controllers for endpoint behavior
- validation modules/schemas for constraints and enums
- error helpers/fallbacks for error shape and codes
- domain modules/schemas for data model fields and states
- `config/*.exs`, env examples, and root docs for runtime/config claims

Verify concrete values in examples: paths, methods, payload keys, limits, enum values,
error codes, and status semantics.

## Audit workflow (on demand)

1. Determine target scope: one file, a section, or all of `docs/`.
2. If asked "did my change break docs?", diff changed source and map to affected docs.
3. For each doc in scope:
   - Check placement (Diataxis section) and required frontmatter.
   - Check internal link validity according to repo link conventions.
   - Cross-check factual claims against evidence sources.
4. Produce findings with: file, issue, contradicting source, and proposed fix.
5. Split findings into must-fix (factual) and should-fix (structure/style).

## Docs indexing

- Keep `docs/index.md` and nearby hub pages aligned with current docs structure.
- When docs are added, moved, renamed, or removed, update navigation links and key cross-links.
- Maintain discoverability: new user-facing docs should be reachable from index or nearest hub.

## Update workflow

- Apply fixes directly in affected docs, preserving existing repo tone.
- For new or changed behavior, update/add docs in correct section and cross-link related pages.
- Preserve historical/archived planning docs as history; add pointers to current reference/explanation pages.
- Never invent behavior. Flag ambiguous code for human review.
- Re-check links, frontmatter, and index/hub navigation after edits.

## Output checklist

- [ ] Findings list with evidence references, grouped by must-fix and should-fix
- [ ] Fixes applied in `docs/` or explicit deferral reason
- [ ] Frontmatter (`title`, `description`) present on touched files
- [ ] Links valid per repo conventions (including allowed virtual routes)
- [ ] Index/hub and cross-links updated when structure or user-facing docs changed
- [ ] Ambiguities and human-review items clearly called out