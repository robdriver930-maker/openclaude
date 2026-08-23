# Finding and Using OpenClaude Agents (Correct Guide)

## Live locations

| What | Where |
|------|--------|
| Agents (live) | `%USERPROFILE%\.openclaude\agents\*.md` |
| Agents (project) | `.openclaude\agents\*.md` |
| Docs / library | `agents-library\` |
| Skills | `%USERPROFILE%\.openclaude\skills\` |
| Model | `%USERPROFILE%\.openclaude\settings.json` → `model` |

## Best path when you are unsure

Ask in chat:

> Use **capability-dispatcher**. Pick the right skills, tools, and agents for this task. Do not skip verification.

That agent is built to choose capabilities so you are not left with a generic weak answer.

## Autonomous mode (new)

Give capability-dispatcher a goal and it will run the full pipeline:

```
"Fix the bug where login fails with 500 error"
→ debugging-detective → code-surgeon → code-reviewer-elite → quality-gatekeeper

"Build a user settings page with profile photo upload"
→ software-architect → full-stack-builder → test-architect → code-reviewer-elite → quality-gatekeeper

"Refactor the auth module to use JWT instead of sessions"
→ test-architect → refactor-master → code-reviewer-elite → quality-gatekeeper
```

The pipeline runs phases sequentially with gates between each step. Quality-gatekeeper is always the final gate.

## Invoke by slug

### In chat

- "Use `software-architect` to design this."
- "Hand off to `debugging-detective`."
- "Run `quality-gatekeeper` before we call it done."

### CLI

```text
openclaude --agent capability-dispatcher
openclaude --agent debugging-detective
```

Slugs match the `name:` field in each agent file (kebab-case).

## Wrong patterns (avoid)

```text
openclaude --agent "React Specialist"
openclaude skills --list | grep category
```

There is no reliable "web UI agent picker" unless you install/configure one. Default daily path is `run.bat` terminal chat.

## Multi-agent work (pipelines)

1. `capability-dispatcher` classifies the goal and picks the pipeline
2. `agent-orchestra-conductor` runs phases with gates between them
3. Specialist agents handle their phase
4. `quality-gatekeeper` verifies the final result before "done"

## After reinstall / cleanup

```powershell
powershell -ExecutionPolicy Bypass -File setup\install-premium-agents.ps1
```

Then restart OpenClaude (`run.bat`).

Full roster: `AGENTS-ARMY.txt` and `AGENT_INDEX.md`.
Skill/tool decision table: `SKILL-TOOL-ROUTING.md`.
