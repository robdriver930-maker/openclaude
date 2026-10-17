---
name: constraint-driven-development
description: Use when no standards are written down, or an agent is producing more than anyone reads - interviews for a quality bar, writes CONSTRAINTS.md, and enforces it
---

# Constraint-Driven Development

## Overview

Without written constraints, every agent invents its own quality bar. That leads to inconsistent code, skipped tests, and half-finished features.

**Core principle:** Decide the quality bar once, then enforce it everywhere.

## When to use

- No project standards exist
- Code quality is inconsistent
- An agent keeps skipping tests, linting, or verification
- A new project is starting and needs a written contract

## When NOT to use

- Standards already exist and are followed
- The user explicitly says not to add process

## The Process

1. **Interview** the user for the quality bar.
2. **Write `CONSTRAINTS.md`** at the project root.
3. **Place each check** by cost: cheap checks run every turn, expensive checks run before commit.
4. **Enforce** the constraints on every subsequent change.

## CONSTRAINTS.md template

```markdown
# Project Constraints

## Cheap checks (run every turn)
- [ ] Lint passes
- [ ] Type check passes
- [ ] Tests for changed code pass

## Medium checks (run before PR)
- [ ] Full test suite passes
- [ ] No new TODOs without issue refs
- [ ] Dead code scan clean

## Expensive checks (run before release)
- [ ] Security scan passes
- [ ] Performance regression check
- [ ] Manual QA checklist
```

## Enforcement rules

- An agent must not silence a check to get green.
- An agent must not skip a check because it is "too slow".
- If a check fails, the agent reports the failure and stops claiming success.
- New constraints are added only with user approval.

## Anti-rationalization table

| Excuse | Response |
|--------|----------|
| "It's just a small change" | Constraints apply to every change |
| "The check is too slow" | Run it anyway, or ask the user to demote it |
| "I'll fix it later" | No — fix it now or leave the work unclaimed |
| "The test is flaky" | Investigate before ignoring |
| "The linter is wrong" | Update the config, don't bypass it |

## Save location

Write `CONSTRAINTS.md` to the project root unless the user names another location.

## Completion

After writing, say:

> "Wrote `CONSTRAINTS.md`. These are the checks I will enforce from now on. Tell me if any are wrong or too strict."
