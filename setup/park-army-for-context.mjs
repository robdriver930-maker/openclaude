/**
 * Park most live skills/agents so a short chat does not burn the context window.
 * Nothing deleted — moved under ~/.openclaude/_parked-army/
 * Full restore (bloated): node setup/restore-army.mjs
 * Project Expert pack: node setup/restore-project-expert.mjs [phase]
 */
import fs from 'fs'
import path from 'path'

const user = process.env.USERPROFILE
const skillsDir = path.join(user, '.openclaude', 'skills')
const agentsDir = path.join(user, '.openclaude', 'agents')
const parkRoot = path.join(user, '.openclaude', '_parked-army')
const parkSkills = path.join(parkRoot, 'skills')
const parkAgents = path.join(parkRoot, 'agents')
const manifestPath = path.join(parkRoot, 'manifest.json')

/** Lean skills pack. Agents stay live unless --also-park-agents. Cursor-* always parked. */
const KEEP_SKILLS = new Set([
  'software-building',
  'software-architecture',
  'software-editing',
  'software-design',
  'software-creator',
  'openclaude-self-repair',
  'openclaude-context-compact',
  'working-with-robert',
  'systematic-debugging',
  'verification-before-completion',
  'code-review-and-quality',
  'writing-plans',
  'executing-plans',
  'incremental-implementation',
  'windows-desktop-apps',
  'full-output-enforcement',
  'high-end-visual-design',
  'vercel-react-best-practices',
  'vercel-composition-patterns',
  'using-agent-skills',
  'public-apis',
  'ultra-enhancers',
  'local-ai-assistant-builder',
  'find-best-web-tool',
])

/** Park skills only by default — live agents stay so Agent tool can dispatch. */
const PARK_AGENTS = process.argv.includes('--also-park-agents')

const KEEP_AGENTS = new Set([
  'capability-dispatcher',
  'openclaude-self-healer',
  'openclaude-ops-specialist',
  'openclaude-skill-router',
  'agent-orchestra-conductor',
  'delivery-orchestrator',
  'project-planner',
  'pragmatic-coder',
  'full-stack-builder',
  'debugging-detective',
  'software-architect',
  'code-reviewer-elite',
  'quality-gatekeeper',
  'code-surgeon',
  'refactor-master',
  'test-architect',
  'windows-shell-master',
  'windows-desktop-product-lead',
  'electron-desktop-specialist',
  'premium-visual-director',
  'ultra-enhancer',
  'react-specialist',
  'frontend-architect',
  'backend-architect',
  'typescript-specialist',
  'node-specialist',
  'python-specialist',
  'powershell-specialist',
  'security-hardening-specialist',
  'performance-engineer',
])

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function moveSafe(from, to) {
  ensureDir(path.dirname(to))
  if (fs.existsSync(to)) {
    const stamp = Date.now()
    const alt = `${to}.conflict-${stamp}`
    fs.renameSync(to, alt)
  }
  try {
    fs.renameSync(from, to)
  } catch (err) {
    // Windows: OpenClaude may lock skill folders — copy then remove
    if (err && (err.code === 'EPERM' || err.code === 'EACCES' || err.code === 'EBUSY')) {
      fs.cpSync(from, to, { recursive: true, force: true })
      fs.rmSync(from, { recursive: true, force: true })
      return
    }
    throw err
  }
}

ensureDir(parkSkills)
ensureDir(parkAgents)

const parkedSkills = []
const parkedAgents = []
const keptSkills = []
const keptAgents = []

if (fs.existsSync(skillsDir)) {
  for (const ent of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    const name = ent.name
    if (name.startsWith('_')) continue
    const from = path.join(skillsDir, name)
    if (!fs.existsSync(path.join(from, 'SKILL.md'))) continue
    if (KEEP_SKILLS.has(name)) {
      keptSkills.push(name)
      continue
    }
    moveSafe(from, path.join(parkSkills, name))
    parkedSkills.push(name)
  }
}

if (fs.existsSync(agentsDir)) {
  for (const ent of fs.readdirSync(agentsDir, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith('.md')) continue
    const name = ent.name.replace(/\.md$/i, '')
    const from = path.join(agentsDir, ent.name)
    if (!PARK_AGENTS || KEEP_AGENTS.has(name)) {
      keptAgents.push(name)
      continue
    }
    moveSafe(from, path.join(parkAgents, ent.name))
    parkedAgents.push(name)
  }
}

const manifest = {
  parkedAt: new Date().toISOString(),
  reason: 'Project Expert pack KEEP — reversible park; selective restore via restore-project-expert.mjs',
  keepSkills: [...KEEP_SKILLS].sort(),
  keepAgents: [...KEEP_AGENTS].sort(),
  parkedSkills: parkedSkills.sort(),
  parkedAgents: parkedAgents.sort(),
  keptSkills: keptSkills.sort(),
  keptAgents: keptAgents.sort(),
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')

console.log('OK army parked (not deleted)')
console.log('kept_skills', keptSkills.length, keptSkills.join(', '))
console.log('parked_skills', parkedSkills.length)
console.log('kept_agents', keptAgents.length, keptAgents.join(', '))
console.log('parked_agents', parkedAgents.length)
console.log('manifest', manifestPath)
console.log(
  'selective restore: node setup/restore-project-expert.mjs [planning|windows|design|3d|shell|quality|all]',
)
console.log('full restore (bloated): node setup/restore-army.mjs')
