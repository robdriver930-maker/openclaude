---
name: openclaude-context-compact
description: Use when OpenClaude shows "Automatic compaction failed", "Context limit reached", compaction stuck at low %, or /compact fails on local Ollama (qwen3.8-oc-code:27b). Diagnose and repair context/compaction on this PC.
---

# OpenClaude context + compaction repair

You fix **context / autocompact** problems on Robert's OpenClaude install. Own files only.

## Allowed roots

1. `C:\Users\GoldenBoy\Desktop\openclaude\openclaude-main\`
2. `%USERPROFILE%\.openclaude\`

## What the user sees

| Symptom | Meaning |
|---------|---------|
| `Automatic compaction failed (N/3)` | Summariser call failed; retries left |
| Compacting stuck at ~0–10% for minutes | Often thinking-only or hung stream |
| `Context limit reached · /compact or /clear` | Hard stop after breaker / overflow |
| Status: `ctx XX%` + `until auto-compact` | Normal meters — not an error by themselves |

## Immediate user relief (do first)

1. Tell Robert to press **Esc** if compact is stuck.
2. Run **`/compact`** once. If it fails: **`/clear`** (or `/new`) and continue the job.
3. Do **not** tell him to delete skills/MCPs/plugins as the first fix.

## Root causes on this PC (check in order)

1. **Qwen thinking during compact** — compact must send `think: false` on native Ollama. Code: `src/services/api/openaiShim.ts` → `buildOllamaChatBody` must set `think: enableThink` (true **or** false). If thinking-only summary: `extractCompactSummaryText` in `src/services/compact/compact.ts`.
2. **Session too fat** — long tool dumps. User: `/clear`. You: keep replies short; avoid re-reading huge files.
3. **Army bloat** — if live skills ≫ 40 or agents ≫ 30: `node setup\park-army-for-context.mjs` (restore: `node setup\restore-army.mjs`).
4. **Wrong context windows** — live `settings.json` should match MAX: `OLLAMA_CONTEXT_LENGTH=163840` (160k), `CLAUDE_CODE_AUTO_COMPACT_WINDOW=143360`, model `qwen3.8-oc-code:27b`. Re-apply: `node setup\max-local-connected.mjs`.
5. **Stale build** — after code fixes: `bun run build` then restart via **`run.bat`** only (one MAX launcher).

## Diagnose commands (run yourself)

```text
node dist\cli.mjs --version
node setup\verify-local-stack.mjs
node setup\context-bloat-report.ps1
```

PowerShell wrap if inside Bash:

```text
powershell -NoProfile -ExecutionPolicy Bypass -File setup\context-bloat-report.ps1
```

Read facts from disk:

- `%USERPROFILE%\.openclaude\settings.json` → model, effort, env ctx keys, `mcpServers`
- Skill count under `%USERPROFILE%\.openclaude\skills`
- Agent count under `%USERPROFILE%\.openclaude\agents`

## Repair playbook

| Finding | Fix |
|---------|-----|
| think not forced false for compact | Edit `openaiShim.ts` buildOllamaChatBody; rebuild |
| no_summary / thinking-only compact | Ensure `extractCompactSummaryText` exists; rebuild |
| skills/agents bloated | `node setup\park-army-for-context.mjs` |
| settings not MAX | `node setup\max-local-connected.mjs` |
| build old | `bun run build` then Robert restarts `run.bat` |
| user stuck mid-chat | Advise `/compact` then `/clear` |

## Verify

1. `node setup\verify-local-stack.mjs` → LOCAL STACK PASS
2. `node dist\cli.mjs --version`
3. Tell Robert: close old window, double-click **`run.bat`**, continue work

## Do not

- Delete the army permanently (park only)
- Add new `run-*.bat` launchers
- Invent API keys or claim compact fixed without rebuild + restart when code changed
- Commit unless Robert asks

## Related

- Skill: `openclaude-self-repair` (general install repair)
- Agent: `openclaude-self-healer`
