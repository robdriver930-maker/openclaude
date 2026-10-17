---
name: spec-driven-development
description: Use when starting a new project, feature, or significant change - write a PRD covering objectives, commands, structure, code style, testing, and boundaries before any code
---

# Spec-Driven Development

## Overview

Writing code before you know what to build is the fastest way to waste time. A clear spec is the contract between the idea and the implementation.

**Core principle:** Spec before code. Always.

## When to use

- Starting a new project
- Adding a major feature
- Changing an existing subsystem in a way that affects other parts
- The user says "make a spec", "write a PRD", or "spec-driven"

## When NOT to use

- Tiny fixes, typo corrections, one-line changes
- The user explicitly says "just do it" or "skip the spec"

## The Spec Gate

```
BEFORE writing any code:
  1. Interview the user until the goal is clear
  2. Write the PRD
  3. Save it to the project
  4. Wait for user approval (or explicit "proceed")
  5. THEN plan and build
```

## PRD structure

Every spec must include:

1. **Goal** — one sentence describing what this builds
2. **Non-goals** — what is out of scope
3. **User stories / commands** — how the user will interact with it
4. **Structure** — files, modules, data model
5. **Code style** — conventions to follow
6. **Testing** — how to prove it works
7. **Boundaries** — limits, safety, error handling
8. **Dependencies** — what this relies on

## Save location

Save specs under:

```
docs/specs/YYYY-MM-DD-<feature-name>.md
```

Use the project’s existing docs convention if there is one.

## Rules

- No code in the spec except example snippets.
- No placeholders like "TBD" or "fill in later".
- Non-goals are as important as goals.
- Keep the spec small enough to read in one sitting.

## Approval

After saving, say:

> "Spec saved to `docs/specs/<filename>.md`. Read it and tell me to proceed, or tell me what to change."

Do not start implementation until the user confirms.
