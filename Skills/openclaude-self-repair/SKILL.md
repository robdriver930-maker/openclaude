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
