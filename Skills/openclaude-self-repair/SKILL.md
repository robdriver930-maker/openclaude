---
name: openclaude-self-repair
description: Use when OpenClaude itself is broken, misconfigured, or needs its own files fixed - launchers, settings, agents, skills, docs, or build. Use for self-heal work inside openclaude-main or ~/.openclaude only.
---

# OpenClaude Self-Repair

You repair **OpenClaude's own** install. No new menus or launcher options - edit existing files.

## Allowed roots only

1. `C:\Users\GoldenBoy\Desktop\openclaude\openclaude-main\`
2. `%USERPROFILE%\.openclaude\`

Do not create new Desktop folders. Prefer fix-in-place.

## Common map

| Problem | Where to look |
|---------|----------------|
| Won't start | `run.bat`, `dist\cli.mjs`, Ollama on `:11434` |
| Wrong model | `run.bat` MODE/MODEL, `--model`, `settings.json` → `model` |
| Cloud 410 retired | Switch cloud MODEL in `run.bat` to a working Ollama cloud tag |
| Agents missing / wrong count | `%USERPROFILE%\.openclaude\agents\*.md` + `setup\install-premium-agents.ps1` |
| Skills missing | `%USERPROFILE%\.openclaude\skills` + `setup\sync-from-cursor.ps1` then `setup\apply-stack.ps1` |
| Stack folders | Edit `Skills\`, `MCPs\`, `Tools\` in the repo, then `setup\apply-stack.ps1` |
| Skills "disabled" by docs | `%USERPROFILE%\.openclaude\CLAUDE.md` must allow skills |
| Agent vs Skill confusion | Agents ≠ Skills. Use Agent tool for agent slugs; Skill tool for skill folders |
| PowerShell in Bash fails | Wrap: `powershell -NoProfile -Command "..."` or use Bash/`ls` |
| Permissions | `Tools\permissions.json` + apply-stack, or `settings.json` → `permissions.allow` |
| Autocompact / context limit | Skill **`openclaude-context-compact`** — do that playbook first |

## Method

1. Reproduce the failure (version, short `--print`, or file check)
2. Read the smallest set of files
3. Edit root cause only
4. Reinstall agents if agent files are the issue: `setup\install-premium-agents.ps1`
5. Verify: `node dist\cli.mjs --version` and a tiny smoke if relevant
6. Report what changed in plain UK English

## Do not

- Invent skills named after agents (`capability-dispatcher` is an agent)
- Add new `run-*.bat` files unless Robert explicitly asks
- Commit unless asked
- Touch unrelated Desktop projects unless he names them

## Known bug: cloud model hijacked to local (diagnosed+fitted 2026-09-13)

**Symptom:** you pick `glm-5.3-flash:cloud` (or any `:cloud` model) in the picker, but every reply takes 5+ minutes while a local model runs at 66 tok/s on the GPU.

**Root cause (triple):**
1. `src/utils/managedEnv.ts:139` re-applies `settings.env` AFTER launch, so run.bat's `set "OPENAI_MODEL=..."` always loses to `settings.json` env.
2. `setup/apply-local-model-settings.mjs` used to hard-reset `settings.model = LOCAL_MODEL` and write `env.OPENAI_MODEL = LOCAL_MODEL` — silently overriding the user's picker choice.
3. `src/utils/model/model.ts` and `src/components/StartupScreen.ts` read `process.env.OPENAI_MODEL` first.

**Fix applied:** `settings.model` uses `if (!settings.model)`; `OPENAI_MODEL` deleted from settings.env; `model.ts` OpenAI branch now prefers `settings.model` over env; `StartupScreen.ts` same. ContextWindowsMap: all 8 cloud models corrected from 120k-131k to their true `65536`; `qwen3.8-oc-code:27b` added; `deepseek-v4-pro:cloud` added.

**Proof it worked:** `run.bat` no longer hardcodes local; headless `-p "hi"` against live GLM went from 5+ min → **8.8s end-to-end**.

**If it regresses:** check `settings.json` for an `OPENAI_MODEL` env key and `setting.model` being reset to `qwen3.8-oc-code:27b` — one of those two was reverted.
