/**
 * Populate Skills/ with software-focused skills from the live OpenClaude profile,
 * plus write five umbrella skills Robert asked for by name.
 */
import fs from 'fs'
import path from 'path'

const root = 'C:\\Users\\GoldenBoy\\Desktop\\openclaude\\openclaude-main'
const skillsRoot = path.join(root, 'Skills')
const live = path.join(process.env.USERPROFILE, '.openclaude', 'skills')

const toCopy = [
  // Building
  'incremental-implementation',
  'executing-plans',
  'full-output-enforcement',
  'verification-before-completion',
  'ci-cd-and-automation',
  'windows-desktop-apps',
  'web-artifacts-builder',
  'subagent-driven-development',
  'git-workflow-and-versioning',
  'deploy-to-vercel',
  // Architecture
  'improve-codebase-architecture',
  'codebase-design',
  'domain-modeling',
  'api-and-interface-design',
  'documentation-and-adrs',
  'premium-architecture-visual-3d',
  'observability-and-instrumentation',
  // Editing / quality
  'code-simplification',
  'code-review-and-quality',
  'debugging-and-error-recovery',
  'systematic-debugging',
  'requesting-code-review',
  'doubt-driven-development',
  'performance-optimization',
  'tdd',
  'test-driven-development',
  'playwright-best-practices',
  'webapp-testing',
  // Creator / product
  'brainstorming',
  'writing-plans',
  'idea-refine',
  'skill-creator',
  'mcp-builder',
  'ai-systems-engineer',
  'public-apis',
  'context-engineering',
  // Design
  'design-an-interface',
  'frontend-design',
  'frontend-ui-engineering',
  'high-end-visual-design',
  'impeccable',
  'design-taste-frontend',
  'extract-design-system',
  'web-design-guidelines',
  'ui-ux-pro-max',
  'vercel-react-best-practices',
  'vercel-composition-patterns',
  'theme-factory',
  'redesign-existing-projects',
  'stitch-design-taste',
  'emil-design-eng',
  // keep self-repair
  'openclaude-self-repair',
  'using-agent-skills',
  'working-with-robert',
]

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

let copied = 0
let missing = []
for (const name of toCopy) {
  const src = path.join(live, name)
  if (!fs.existsSync(src)) {
    missing.push(name)
    continue
  }
  const dest = path.join(skillsRoot, name)
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true })
  copyDir(src, dest)
  copied++
}

const umbrellas = {
  'software-building': {
    description:
      'Use when building software end-to-end: features, apps, installers, vertical slices, CI, and shipping working products.',
    body: `# Software Building

You build working software for Robert (Bobby's Tech Services).

## Mission
Ship the smallest vertical slice that runs. Prefer working software over theory.

## Method
1. Restate JOB / OUT / NOT / DONE WHEN
2. Implement the thinnest path that proves value
3. Verify with build/run/smoke
4. No TODOs or placeholders in shipped paths

## Load these skills when needed
- incremental-implementation
- executing-plans
- full-output-enforcement
- verification-before-completion
- windows-desktop-apps (desktop)
- web-artifacts-builder / vercel-react-best-practices (web)
- ci-cd-and-automation (pipelines)
- git-workflow-and-versioning (only if asked to commit)

## Done when
Build passes, critical path works, plain-English run steps for Robert.
`,
  },
  'software-architecture': {
    description:
      'Use for system architecture, module boundaries, dependency direction, APIs, domain models, and durable software structure.',
    body: `# Software Architecture

Principal architecture for production systems.

## Non-negotiables
- UI -> application -> domain <- infrastructure
- Explicit public APIs before internals
- Typed boundaries; fail loud; least privilege
- Smallest vertical slice that proves the architecture

## Load these skills when needed
- improve-codebase-architecture
- codebase-design
- domain-modeling
- api-and-interface-design
- documentation-and-adrs
- premium-architecture-visual-3d (when UI/3D is part of the system)

Reject god files, circular deps, and business logic in UI.
`,
  },
  'software-editing': {
    description:
      'Use when editing, refactoring, fixing, reviewing, or improving existing software with precise root-cause changes.',
    body: `# Software Editing

Surgical editing of existing codebases.

## Rules
1. Read before edit
2. Smallest correct root-cause fix
3. No drive-by refactors unless asked
4. Verify after change

## Load these skills when needed
- code-simplification
- code-review-and-quality
- debugging-and-error-recovery
- systematic-debugging
- requesting-code-review
- doubt-driven-development
- performance-optimization
- tdd / test-driven-development when tests are part of the edit

Never invent files that already exist — search first.
`,
  },
  'software-creator': {
    description:
      'Use when creating new software products from an idea: invent, scope, plan, bootstrap, and produce the first working version.',
    body: `# Software Creator

Turn ideas into new software products.

## Method
1. Clarify the product promise in one sentence
2. Scope MVP ruthlessly
3. Plan phases with DONE WHEN
4. Bootstrap and build the first vertical slice
5. Hand off clear next steps

## Load these skills when needed
- brainstorming
- idea-refine
- writing-plans
- executing-plans
- skill-creator (when creating OpenClaude skills)
- mcp-builder (when creating MCP tools)
- ai-systems-engineer (AI product features)
- incremental-implementation

UK English. No fluff. Prefer shippable MVP over feature dumps.
`,
  },
  'software-design': {
    description:
      'Use for software UI/UX and product design: interfaces, design systems, premium visuals, frontend composition, and redesigns.',
    body: `# Software Design

Agency-tier software design for web and desktop.

## Standards
- Named aesthetic; expressive typography
- One primary action per screen (especially desktop)
- Real visual anchors; clear hierarchy
- Loading / empty / error / success for every flow
- Ban purple-on-white cliches, emoji-as-icons, empty coloured boxes

## Load these skills when needed
- design-an-interface
- frontend-design
- frontend-ui-engineering
- high-end-visual-design
- impeccable
- design-taste-frontend
- extract-design-system
- web-design-guidelines
- ui-ux-pro-max
- vercel-react-best-practices
- vercel-composition-patterns
- redesign-existing-projects
- theme-factory

Phone + desktop both considered.
`,
  },
}

for (const [name, meta] of Object.entries(umbrellas)) {
  const dir = path.join(skillsRoot, name)
  fs.mkdirSync(dir, { recursive: true })
  const md = `---
name: ${name}
description: ${meta.description}
---

${meta.body.trim()}
`
  fs.writeFileSync(path.join(dir, 'SKILL.md'), md, 'utf8')
}

const index = `# Software skills index (edit here)

These skills live in \`Skills\\\` so you can see and edit them.  
After changes run: \`setup\\\\apply-stack.ps1\` then restart OpenClaude (Local).

## Your five named entry skills

| Skill | Use for |
|-------|---------|
| \`software-building\` | Build features/apps end-to-end and ship |
| \`software-architecture\` | Structure, modules, APIs, domain design |
| \`software-editing\` | Fix, refactor, review, improve existing code |
| \`software-creator\` | Create new products from an idea |
| \`software-design\` | UI/UX, design systems, premium frontend |

In chat say: **Use skill software-building** (or architecture / editing / creator / design).

## Packaged specialist skills in this folder

### Building
${toCopy.filter(n => ['incremental-implementation','executing-plans','full-output-enforcement','verification-before-completion','ci-cd-and-automation','windows-desktop-apps','web-artifacts-builder','subagent-driven-development','git-workflow-and-versioning','deploy-to-vercel'].includes(n)).map(n => `- \`${n}\``).join('\n')}

### Architecture
${toCopy.filter(n => ['improve-codebase-architecture','codebase-design','domain-modeling','api-and-interface-design','documentation-and-adrs','premium-architecture-visual-3d','observability-and-instrumentation'].includes(n)).map(n => `- \`${n}\``).join('\n')}

### Editing / quality
${toCopy.filter(n => ['code-simplification','code-review-and-quality','debugging-and-error-recovery','systematic-debugging','requesting-code-review','doubt-driven-development','performance-optimization','tdd','test-driven-development','playwright-best-practices','webapp-testing'].includes(n)).map(n => `- \`${n}\``).join('\n')}

### Creator
${toCopy.filter(n => ['brainstorming','writing-plans','idea-refine','skill-creator','mcp-builder','ai-systems-engineer','context-engineering'].includes(n)).map(n => `- \`${n}\``).join('\\n')}

### Design
${toCopy.filter(n => ['design-an-interface','frontend-design','frontend-ui-engineering','high-end-visual-design','impeccable','design-taste-frontend','extract-design-system','web-design-guidelines','ui-ux-pro-max','vercel-react-best-practices','vercel-composition-patterns','theme-factory','redesign-existing-projects','stitch-design-taste','emil-design-eng'].includes(n)).map(n => `- \`${n}\``).join('\n')}

## Note
Many more skills also exist in the live profile (\`~/.openclaude/skills\`, ~100+). This folder is the **visible software pack** you edit.
`

fs.writeFileSync(path.join(skillsRoot, 'SOFTWARE-INDEX.md'), index, 'utf8')

const mustHave = [
  'software-building',
  'software-architecture',
  'software-editing',
  'software-creator',
  'software-design',
  ...toCopy,
].filter((v, i, a) => a.indexOf(v) === i)

fs.writeFileSync(
  path.join(skillsRoot, 'manifest.json'),
  JSON.stringify(
    {
      description:
        'Must-have skills for software building, architecture, editing, creation, and design. apply-stack warns if missing.',
      mustHave,
    },
    null,
    2,
  ) + '\n',
  'utf8',
)

console.log(JSON.stringify({ copied, missing, umbrellas: Object.keys(umbrellas), mustHave: mustHave.length }, null, 2))
