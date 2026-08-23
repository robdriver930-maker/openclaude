# OpenClaude Agent Organization (Accurate)

Updated: 2026-07-17

## Live facts (do not invent)

| Item | Value |
|------|--------|
| Active model (this PC) | `qwen3-coder:30b` via Ollama — see `%USERPROFILE%\.openclaude\settings.json` |
| Live agents | **77** Markdown agents in `%USERPROFILE%\.openclaude\agents` |
| Project mirror | `.openclaude\agents` inside openclaude-main |
| Source library | `agents-library\` (agent `.md` files + these guides) |
| Skills | ~100+ under `%USERPROFILE%\.openclaude\skills` |
| Agent tool | Enabled (`Agent`, `Skill` allowed in settings) |

Agent **names are kebab-case slugs** (e.g. `react-specialist`), not Title Case display names.

## How OpenClaude loads agents

1. Built-in agents (Explore, Plan, general-purpose, etc.)
2. User agents: `%USERPROFILE%\.openclaude\agents\*.md`
3. Project agents: `<project>\.openclaude\agents\*.md` (same name overrides user)

Reinstall army:

```powershell
powershell -ExecutionPolicy Bypass -File setup\install-premium-agents.ps1
```

## Categories (77 agents)

### Project direction and planning (12)

| Slug | Use for |
|------|---------|
| `project-strategist` | Direction, ROI, what to build next |
| `product-visionary` | Product vision and premium positioning |
| `project-planner` | Phases, milestones, delivery order |
| `roadmap-architect` | Multi-week roadmaps and backlog priority |
| `scope-guardian` | Cut scope / protect MVP |
| `requirements-analyst` | Precise requirements and acceptance criteria |
| `stakeholder-translator` | Plain English <-> engineering |
| `delivery-orchestrator` | Sequence workstreams and unblock |
| `risk-assessor` | Technical/business risk before build |
| `milestone-conductor` | Demo-ready checkpoints |
| `project-completionist` | Ship checklist and finish gate |
| `brief-to-build` | Short brief -> first vertical slice |

### Software architecture and design (12)

| Slug | Use for |
|------|---------|
| `software-architect` | Module boundaries and durable design |
| `systems-designer` | End-to-end system sketch |
| `domain-modeler` | Domain language and invariants |
| `api-architect` | API contracts and versioning |
| `database-architect` | Schemas, indexes, migrations |
| `frontend-architect` | React/Vite frontend structure |
| `backend-architect` | Server/services boundaries |
| `interface-designer` | Screens, flows, primary actions |
| `design-system-architect` | Tokens, type, spacing systems |
| `ux-flow-architect` | Journeys and loading/empty/error/success |
| `premium-visual-director` | Agency-tier visual quality |
| `architecture-reviewer` | Architecture review before merge |

### Coding specialists (14)

| Slug | Use for |
|------|---------|
| `typescript-specialist` | Strict TypeScript |
| `react-specialist` | React components and hooks |
| `node-specialist` | Node CLIs/servers |
| `python-specialist` | Python services/scripts |
| `electron-desktop-specialist` | Electron + Windows desktop |
| `full-stack-builder` | End-to-end feature slices |
| `code-surgeon` | Minimal root-cause fixes |
| `refactor-master` | Safe large refactors |
| `type-system-guardian` | Kill `any`, tighten types |
| `performance-engineer` | Perf profiling and fixes |
| `test-architect` | Test strategy and gates |
| `debugging-detective` | Systematic debugging |
| `code-reviewer-elite` | Elite code review |
| `pragmatic-coder` | Fast production-minded build |

### Bash / PowerShell / Windows (8)

| Slug | Use for |
|------|---------|
| `windows-shell-master` | Windows shell mastery |
| `powershell-specialist` | Advanced PowerShell |
| `bash-automation-engineer` | Bash/POSIX automation |
| `devops-scripting-lead` | CI/CD scripts |
| `environment-hardening-agent` | Toolchain/PATH health |
| `filesystem-surgeon` | Precise file ops |
| `process-and-pipeline-agent` | Multi-step pipelines |
| `install-and-bootstrap-agent` | Installers and first-run |

### 3D / animation / visual (12)

| Slug | Use for |
|------|---------|
| `threejs-specialist` | Three.js / WebGL |
| `r3f-scene-architect` | React Three Fiber |
| `pbr-materials-specialist` | PBR materials |
| `3d-apparel-configurator` | Apparel/configurators |
| `animation-director` | Motion direction |
| `remotion-motion-specialist` | Remotion video |
| `camera-and-lighting-director` | Camera and lighting |
| `webgl-performance-guardian` | WebGL performance |
| `3d-product-visualizer` | Product 3D heroes |
| `motion-craft-engineer` | UI micro-motion |
| `spatial-ui-composer` | 2D UI + 3D canvas |
| `cinematic-intro-designer` | Cinematic intros |

### Software specialists (10)

| Slug | Use for |
|------|---------|
| `security-hardening-specialist` | Security hardening |
| `ci-cd-release-engineer` | CI/CD and releases |
| `observability-engineer` | Logging/metrics/tracing |
| `data-and-schema-specialist` | Data and schema |
| `ai-systems-integrator` | LLM/tools/agents product features |
| `mcp-and-tooling-architect` | MCP tool design |
| `windows-desktop-product-lead` | Windows product ownership |
| `saas-product-engineer` | SaaS features |
| `quality-gatekeeper` | Final ship gate |
| `documentation-architect` | ADRs and runbooks |

### OpenClaude knowledge and meta (9)

| Slug | Use for |
|------|---------|
| `openclaude-ops-specialist` | Install, run.bat, Ollama, launcher |
| `openclaude-self-healer` | Fix OpenClaude's own files in place (no extra options) |
| `openclaude-skill-router` | Choose skills/agents (lightweight) |
| `capability-dispatcher` | **Primary** skill + tool + agent picker |
| `context-and-memory-guardian` | Context window discipline |
| `agent-orchestra-conductor` | Multi-agent coordination |
| `prompt-precision-engineer` | Better prompts/descriptions |
| `knowledge-synthesizer` | Research -> decisions |
| `continuous-improvement-coach` | Post-project upgrades |

## Correct ways to use an agent

In chat (best for beginners):

- "Use **capability-dispatcher** to pick the right skills and tools for this task."
- "Use **software-architect** to design module boundaries."
- "Delegate to **debugging-detective**."

CLI (slug required):

```text
openclaude --agent capability-dispatcher
openclaude --agent software-architect
```

Wrong (do not use):

```text
openclaude --agent "React Specialist"
openclaude skills --list | grep ...
```

See also: `AGENT_USAGE_GUIDE.md`, `SKILL-TOOL-ROUTING.md`, `AGENTS-ARMY.txt`.
