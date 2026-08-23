# Agent Ecosystem (Accurate Overview)

OpenClaude's premium agent army is a set of specialised system prompts loaded from Markdown files.

## What exists

- **77+** custom agents (premium roster)
- Built-in agents (Explore, Plan, general-purpose, verification, etc.)
- **Skills** (~100+) — playbooks loaded via the Skill tool
- **Tools** — Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch, Agent, Skill, NotebookEdit

## Capability layers

```text
You (Robert)
  -> Main OpenClaude session (model from settings.json)
       -> capability-dispatcher (auto-routes to specialists)
            -> agent-orchestra-conductor (runs autonomous pipelines)
                 -> Phase 1: specialist agent → GATE check
                 -> Phase 2: specialist agent → GATE check
                 -> ...
                 -> Final: quality-gatekeeper (ship check)
```

## Autonomous pipelines

The agent army can run complete workflows without manual intervention:

### Bug fix pipeline
`debugging-detective` → `code-surgeon` → `code-reviewer-elite` → `quality-gatekeeper`

### Feature pipeline
`software-architect` → `full-stack-builder` → `test-architect` → `code-reviewer-elite` → `quality-gatekeeper`

### Refactor pipeline
`test-architect` → `refactor-master` → `performance-engineer` → `code-reviewer-elite` → `quality-gatekeeper`

### Performance pipeline
`debugging-detective` → `performance-engineer` → `code-reviewer-elite` → `quality-gatekeeper`

## Design goals

1. Right specialist for the job (not one generic answer for everything)
2. Smallest useful skill set (avoid dumping all skills into context)
3. Fail loud: verify facts (model, agent count, paths) from disk
4. Finish gate: build/tests/critical path before claiming done
5. **Autonomous pipelines**: goal statement → complete verified result
6. **Self-healing**: gates that auto-fix or escalate on failure

## How to trigger autonomous mode

Tell capability-dispatcher your goal:
- "Fix this bug: [description]"
- "Build me a feature that [description]"
- "Refactor [code area] to [goal]"
- "Optimize the performance of [area]"

The dispatcher will select the right pipeline and delegate to agent-orchestra-conductor.

## What this is not

- Not 100+ agents (that was an incorrect earlier claim)
- Not Title Case CLI names (`"React Specialist"`)
- Not a substitute for reading live `settings.json` for the active model

## Maintenance

```powershell
powershell -ExecutionPolicy Bypass -File setup\install-premium-agents.ps1
```

See `AGENT_ORGANIZATION.md`, `AGENT_USAGE_GUIDE.md`, `SKILL-TOOL-ROUTING.md`, `AGENTS-ARMY.txt`.
