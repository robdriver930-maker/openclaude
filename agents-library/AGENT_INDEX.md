# Agent Index (Quick Reference)

77+ premium agents. Use **kebab-case slugs**. Live path: `%USERPROFILE%\.openclaude\agents`.

## Always start here when unsure

1. `capability-dispatcher` — pick skills, tools, and specialist agents (auto-routes)
2. `agent-orchestra-conductor` — run autonomous pipelines with phase gates
3. `quality-gatekeeper` — final check before "done" (evidence before claims)
4. `openclaude-self-healer` — fix OpenClaude's own files

## Autonomous pipelines

Give capability-dispatcher a goal and it will chain agents automatically:

| Goal type | Pipeline |
|-----------|----------|
| Bug fix | debugging-detective → code-surgeon → code-reviewer-elite → quality-gatekeeper |
| New feature | software-architect → full-stack-builder → test-architect → code-reviewer-elite → quality-gatekeeper |
| Refactor | test-architect → refactor-master → code-reviewer-elite → quality-gatekeeper |
| Performance | debugging-detective → performance-engineer → code-reviewer-elite → quality-gatekeeper |
| Security audit | security-hardening-specialist → differential-review → quality-gatekeeper |

## Full slug list

### Core orchestration (new)
`capability-dispatcher` · `agent-orchestra-conductor` · `quality-gatekeeper`

### Planning
`project-strategist` · `product-visionary` · `project-planner` · `roadmap-architect` · `scope-guardian` · `requirements-analyst` · `stakeholder-translator` · `delivery-orchestrator` · `risk-assessor` · `milestone-conductor` · `project-completionist` · `brief-to-build`

### Architecture / design
`software-architect` · `systems-designer` · `domain-modeler` · `api-architect` · `database-architect` · `frontend-architect` · `backend-architect` · `interface-designer` · `design-system-architect` · `ux-flow-architect` · `premium-visual-director` · `architecture-reviewer`

### Coding
`typescript-specialist` · `react-specialist` · `node-specialist` · `python-specialist` · `electron-desktop-specialist` · `full-stack-builder` · `code-surgeon` · `refactor-master` · `type-system-guardian` · `performance-engineer` · `test-architect` · `debugging-detective` · `code-reviewer-elite` · `pragmatic-coder`

### Shell / Windows
`windows-shell-master` · `powershell-specialist` · `bash-automation-engineer` · `devops-scripting-lead` · `environment-hardening-agent` · `filesystem-surgeon` · `process-and-pipeline-agent` · `install-and-bootstrap-agent`

### 3D / motion
`threejs-specialist` · `r3f-scene-architect` · `pbr-materials-specialist` · `3d-apparel-configurator` · `animation-director` · `remotion-motion-specialist` · `camera-and-lighting-director` · `webgl-performance-guardian` · `3d-product-visualizer` · `motion-craft-engineer` · `spatial-ui-composer` · `cinematic-intro-designer`

### Specialist product
`security-hardening-specialist` · `ci-cd-release-engineer` · `observability-engineer` · `data-and-schema-specialist` · `ai-systems-integrator` · `mcp-and-tooling-architect` · `windows-desktop-product-lead` · `saas-product-engineer` · `quality-gatekeeper` · `documentation-architect`

### OpenClaude meta
`openclaude-ops-specialist` · `openclaude-self-healer` · `openclaude-skill-router` · `capability-dispatcher` · `context-and-memory-guardian` · `agent-orchestra-conductor` · `prompt-precision-engineer` · `knowledge-synthesizer` · `continuous-improvement-coach`

## Model on this PC

Read `%USERPROFILE%\.openclaude\settings.json` → `model`. Do not claim Claude/GPT are active unless settings say so.
