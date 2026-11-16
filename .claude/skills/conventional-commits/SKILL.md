---
name: conventional-commits
description: Enforce Conventional Commits for git messages. Output is designed to feed directly into the changelog-writer skill.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: git
---

## What I do

- Enforce Conventional Commits format for git commit messages
- Validate allowed types and subject style
- Call out breaking change notation when applicable

## When to use me

Use this when crafting or reviewing git commit messages.
Ask clarifying questions if the correct type or scope is unclear.

## Guidelines

- Format: `<type>[optional scope][!]: <description>`
- `type` must be one of: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- `scope` is optional and should be a short, lowercase noun (no spaces)
- `description` is required, lowercase, no trailing period
- Keep the subject concise and focused on the change intent
- Use `!` for breaking changes only when applicable
- For breaking changes with additional detail, add a `BREAKING CHANGE:` footer after a blank line

## Examples

- `feat(serials): add base-30 allocator`
- `fix(csv): clamp export count`
- `docs: document sgtin-198 format`
- `feat(auth)!: remove legacy token endpoint`