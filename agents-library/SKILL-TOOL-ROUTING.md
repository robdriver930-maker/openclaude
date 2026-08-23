# Skill and Tool Routing (for capability-dispatcher)

Use the **smallest** set that fits. Prefer 1-3 skills max per turn. Always prefer live disk facts over guesses.

## Built-in tools (always available if allowed)

| Tool | Use when |
|------|----------|
| **Read** | Need exact file contents before editing or answering |
| **Write** | Create a new file that must exist |
| **Edit** | Change an existing file (prefer over rewriting whole files) |
| **Glob** | Find files by name/pattern |
| **Grep** | Search code/text by content |
| **Bash** | Run commands, builds, tests, git, PowerShell via shell |
| **WebSearch / WebFetch** | Need current external info or a specific URL |
| **Agent** | Delegate to a specialist agent slug |
| **Skill** | Load a skill playbook by exact skill folder name |
| **NotebookEdit** | Jupyter notebooks only |

Do **not** invent tools. Task*/TodoWrite may be denied in settings — skip them.

## Default tool order for coding tasks

1. Glob/Grep to locate
2. Read before Edit/Write
3. Bash to verify (build/test/smoke)
4. Skill only when a playbook clearly applies
5. Agent when a specialist should own a slice

## Capability-dispatcher specific routing rules

When capability-dispatcher is called without clear direction:
1. First classify task type (code, architecture, design, testing, security, etc.)
2. If unclear, use `using-agent-skills` to get help identifying the right approach
3. When multiple approaches are valid, choose based on project context:
   - For new features: prefer `full-stack-builder`, `react-specialist`
   - For performance issues: `performance-engineer`, `debugging-detective`
   - For bugs: `debugging-detective` + `code-surgeon`
   - For documentation: `documentation-architect`, `project-planner`
   - For refactoring: `refactor-master`, `code-reviewer-elite`

## Skill routing (comprehensive)

| Task type | Skills to consider | Agent to pair with |
|-----------|-------------------|-------------------|
| Code quality / review | `code-review-and-quality`, `code-simplification` | code-reviewer-elite |
| Unclear task type | `using-agent-skills` | capability-dispatcher |
| Project planning | `writing-plans`, `brainstorming`, `executing-plans` | project-planner |
| Architecture | `software-architecture`, `codebase-design`, `domain-modeling` | software-architect |
| React / frontend perf | `vercel-react-best-practices`, `vercel-composition-patterns` | react-specialist |
| Premium UI | `high-end-visual-design`, `impeccable`, `frontend-design` | premium-visual-director |
| Animation / motion | `improve-animations`, `vercel-react-view-transitions` | animation-director |
| 3D / R3F / Three | `three-best-practices`, `r3f-best-practices` | threejs-specialist |
| Remotion | `remotion-best-practices` | remotion-motion-specialist |
| Electron / Windows app | `windows-desktop-apps` | electron-desktop-specialist |
| Debugging | `systematic-debugging`, `debugging-and-error-recovery` | debugging-detective |
| Tests / E2E | `tdd`, `test-driven-development`, `playwright-best-practices` | test-architect |
| Security review | `insecure-defaults`, `differential-review`, `supply-chain-risk-auditor` | security-hardening-specialist |
| Postgres / Supabase | `supabase`, `supabase-postgres-best-practices` | data-and-schema-specialist |
| Deploy Vercel | `deploy-to-vercel` | ci-cd-release-engineer |
| MCP servers | `mcp-builder` | mcp-and-tooling-architect |
| AI product features | `claude-api`, `context-engineering` | ai-systems-integrator |
| Finish / verify | `verification-before-completion`, `full-output-enforcement` | quality-gatekeeper |
| Robert / BTS workflow | `working-with-robert` | - |
| Refactoring | `incremental-implementation` | refactor-master |
| Performance tuning | - | performance-engineer + debugging-detective |
| OpenClaude self-repair | `openclaude-self-repair`, `openclaude-context-compact` | openclaude-self-healer |
| Implementing features | `incremental-implementation`, `software-building` | full-stack-builder |
| Creating new projects | `software-creator` | full-stack-builder |

## Agent routing (comprehensive)

| Task type | Primary agent | Chain with | Final gate |
|-----------|--------------|------------|------------|
| OpenClaude broken / self-fix | openclaude-self-healer | - | openclaude-self-repair verify |
| Pick capabilities | capability-dispatcher | - | - |
| Coordinate many agents | agent-orchestra-conductor | specialists per phase | quality-gatekeeper |
| Project direction | project-strategist | project-planner | scope-guardian |
| Architecture | software-architect | systems-designer | architecture-reviewer |
| Build feature | full-stack-builder | pragmatic-coder for speed | quality-gatekeeper |
| Bug investigation | debugging-detective | code-surgeon for fix | quality-gatekeeper |
| UI polish | premium-visual-director | interface-designer | code-reviewer-elite |
| 3D work | threejs-specialist | r3f-scene-architect | webgl-performance-guardian |
| Shell / install | windows-shell-master | - | Bash verify |
| Ship check | quality-gatekeeper | - | verification-before-completion |
| Security audit | security-hardening-specialist | differential-review | supply-chain-risk-auditor |
| Performance work | performance-engineer | debugging-detective | webgl-performance-guardian (if 3D) |
| Testing | test-architect | - | verification-before-completion |
| CI/CD / DevOps | ci-cd-release-engineer | devops-scripting-lead | quality-gatekeeper |
| Documentation | documentation-architect | knowledge-synthesizer | code-reviewer-elite |

## Agent chaining patterns (for agent-orchestra-conductor)

### Bug fix pipeline (automated)
```
debugging-detective (find root cause)
  → code-surgeon (apply precise fix)
    → code-reviewer-elite (review the change)
      → quality-gatekeeper (verify build + tests pass)
```

### Feature pipeline (automated)
```
software-architect (design boundaries)
  → full-stack-builder (implement in slices)
    → test-architect (ensure coverage)
      → code-reviewer-elite (final review)
        → quality-gatekeeper (ship check)
```

### Refactor pipeline (automated)
```
refactor-master (restructure code)
  → test-architect (regression tests)
    → code-reviewer-elite (review quality)
      → quality-gatekeeper (verify nothing broke)
```

### Performance pipeline (automated)
```
debugging-detective (profile and find bottleneck)
  → performance-engineer (optimize the hot path)
    → code-reviewer-elite (review for correctness)
      → quality-gatekeeper (benchmarks + tests)
```

## Auto-routing decision tree

```
User request
  │
  ├─ Is OpenClaude itself broken?
  │   └─ YES → openclaude-self-healer + openclaude-self-repair
  │
  ├─ Is it a bug / error / crash?
  │   └─ YES → debugging-detective → code-surgeon → quality-gatekeeper
  │
  ├─ Is it building a new feature?
  │   └─ YES → software-architect → full-stack-builder → quality-gatekeeper
  │
  ├─ Is it a code review / quality check?
  │   └─ YES → code-reviewer-elite → verification-before-completion
  │
  ├─ Is it UI / design work?
  │   └─ YES → premium-visual-director → code-reviewer-elite
  │
  ├─ Is it performance / speed?
  │   └─ YES → performance-engineer + debugging-detective → quality-gatekeeper
  │
  ├─ Is it security related?
  │   └─ YES → security-hardening-specialist → differential-review
  │
  ├─ Is it testing?
  │   └─ YES → test-architect → test-driven-development
  │
  ├─ Is it planning / strategy?
  │   └─ YES → project-planner + writing-plans
  │
  ├─ Does it need multiple agents chained?
  │   └─ YES → agent-orchestra-conductor (with explicit chain)
  │
  └─ Unclear / doesn't fit?
      └─ Stay as capability-dispatcher, classify manually using disk facts
```

## Skill routing (common - condensed for quick reference)

| Task type | Skills to consider |
|-----------|-------------------|
| OpenClaude broken / fix own files | `openclaude-self-repair` + agent `openclaude-self-healer` |
| Unsure which skill | `using-agent-skills` |
| Plan a project | `writing-plans`, `brainstorming`, `executing-plans` |
| Architecture | `software-architecture`, `codebase-design`, `domain-modeling` |
| Debugging | `systematic-debugging`, `debugging-and-error-recovery` |
| Tests / E2E | `tdd`, `test-driven-development`, `playwright-best-practices` |
| Security review | `insecure-defaults`, `differential-review`, `supply-chain-risk-auditor` |
| Finish / verify | `verification-before-completion`, `full-output-enforcement` |
| Robert / BTS workflow | `working-with-robert` |

Skill names must match folders under `%USERPROFILE%\.openclaude\skills`. If unsure, Glob that folder — never invent a skill name.

## Anti-patterns that let Robert down

- Claiming the wrong model without reading `settings.json`
- Inventing agent counts
- Loading 10+ skills at once
- Skipping Read before Edit
- Declaring done without Bash verification when a build exists
- Using Title Case agent names in `--agent`
- Asking Robert which agent to use when the task is obvious
- Claiming DONE without running quality-gatekeeper on the result
- Running the same verification command twice without code changes in between
