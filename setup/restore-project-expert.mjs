/**
 * Selective restore for the Project Expert pack.
 * Moves named skills/agents from ~/.openclaude/_parked-army/ → live.
 * Does NOT run full restore-army.mjs.
 *
 * Usage:
 *   node setup/restore-project-expert.mjs [planning|windows|design|3d|shell|quality|remotion|ultra|cinema|all]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const user = process.env.USERPROFILE
const skillsDir = path.join(user, '.openclaude', 'skills')
const agentsDir = path.join(user, '.openclaude', 'agents')
const parkRoot = path.join(user, '.openclaude', '_parked-army')
const parkSkills = path.join(parkRoot, 'skills')
const parkAgents = path.join(parkRoot, 'agents')
const repoSkills = path.join(root, 'Skills')
const agentsLibrary = path.join(root, 'agents-library')

const PHASES = {
  planning: {
    skills: ['writing-plans', 'executing-plans', 'incremental-implementation'],
    agents: [],
  },
  windows: {
    skills: ['windows-desktop-apps'],
    agents: ['electron-desktop-specialist'],
  },
  design: {
    skills: [
      'software-design',
      'software-creator',
      'premium-architecture-visual-3d',
      'high-end-visual-design',
    ],
    agents: ['software-architect', 'premium-visual-director'],
  },
  '3d': {
    skills: ['three-best-practices', 'r3f-best-practices'],
    agents: ['3d-product-visualizer', 'remotion-motion-specialist'],
  },
  shell: {
    skills: [],
    agents: ['windows-shell-master'],
  },
  quality: {
    skills: ['full-output-enforcement'],
    agents: [],
  },
  /** Crystal-clear MP4 / Remotion / 3D motion pack */
  remotion: {
    skills: [
      'remotion-best-practices',
      'improve-animations',
      'find-animation-opportunities',
      'animation-vocabulary',
      'review-animations',
      'three-best-practices',
      'r3f-best-practices',
      'premium-architecture-visual-3d',
      'high-end-visual-design',
    ],
    agents: [
      'remotion-motion-specialist',
      '3d-product-visualizer',
      'premium-visual-director',
      'animation-director',
      'cinematic-intro-designer',
    ],
  },
  /** Ultra Enhancers — polish super abilities */
  ultra: {
    skills: [
      'ultra-enhancers',
      'impeccable',
      'emil-design-eng',
      'improve-animations',
      'animation-vocabulary',
      'review-animations',
      'high-end-visual-design',
      'premium-architecture-visual-3d',
      'remotion-best-practices',
      'full-output-enforcement',
      'verification-before-completion',
    ],
    agents: [
      'ultra-enhancer',
      'premium-visual-director',
      'animation-director',
      'cinematic-intro-designer',
      'remotion-motion-specialist',
      'project-completionist',
      'motion-craft-engineer',
    ],
  },
  /** Top-quality 3D / cinema / product film pack */
  cinema: {
    skills: [
      'ultra-enhancers',
      'impeccable',
      'emil-design-eng',
      'design-taste-frontend',
      'stitch-design-taste',
      'ui-ux-pro-max',
      'frontend-design',
      'high-end-visual-design',
      'premium-architecture-visual-3d',
      'three-best-practices',
      'r3f-best-practices',
      'remotion-best-practices',
      'improve-animations',
      'animation-vocabulary',
      'review-animations',
      'web-3d-apparel-shop',
      'full-output-enforcement',
      'verification-before-completion',
    ],
    agents: [
      'ultra-enhancer',
      'camera-and-lighting-director',
      'pbr-materials-specialist',
      'r3f-scene-architect',
      'threejs-specialist',
      'webgl-performance-guardian',
      '3d-product-visualizer',
      'cinematic-intro-designer',
      'animation-director',
      'remotion-motion-specialist',
      'premium-visual-director',
    ],
  },
}

PHASES.all = {
  skills: [
    ...PHASES.planning.skills,
    ...PHASES.windows.skills,
    ...PHASES.design.skills,
    ...PHASES['3d'].skills,
    ...PHASES.shell.skills,
    ...PHASES.quality.skills,
  ],
  agents: [
    ...PHASES.planning.agents,
    ...PHASES.windows.agents,
    ...PHASES.design.agents,
    ...PHASES['3d'].agents,
    ...PHASES.shell.agents,
    ...PHASES.quality.agents,
  ],
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function moveSafe(from, to) {
  ensureDir(path.dirname(to))
  if (fs.existsSync(to)) return 'skipped'
  try {
    fs.renameSync(from, to)
    return 'restored'
  } catch (err) {
    if (err && (err.code === 'EPERM' || err.code === 'EACCES' || err.code === 'EBUSY')) {
      fs.cpSync(from, to, { recursive: true, force: true })
      fs.rmSync(from, { recursive: true, force: true })
      return 'restored'
    }
    throw err
  }
}

function copyDirSafe(from, to) {
  ensureDir(path.dirname(to))
  if (fs.existsSync(to)) return 'skipped'
  fs.cpSync(from, to, { recursive: true, force: true })
  return 'restored'
}

function copyFileSafe(from, to) {
  ensureDir(path.dirname(to))
  if (fs.existsSync(to)) return 'skipped'
  fs.copyFileSync(from, to)
  return 'restored'
}

function restoreSkill(name) {
  const live = path.join(skillsDir, name)
  if (fs.existsSync(live)) return { name, status: 'skipped', detail: 'already live' }

  const parked = path.join(parkSkills, name)
  if (fs.existsSync(parked)) {
    const status = moveSafe(parked, live)
    return { name, status, detail: status === 'restored' ? 'from parked' : 'already live' }
  }

  const fromRepo = path.join(repoSkills, name)
  if (fs.existsSync(fromRepo) && fs.existsSync(path.join(fromRepo, 'SKILL.md'))) {
    const status = copyDirSafe(fromRepo, live)
    return { name, status, detail: status === 'restored' ? 'copied from repo Skills/' : 'already live' }
  }

  return { name, status: 'missing', detail: 'not in parked or repo Skills/' }
}

function restoreAgent(name) {
  const file = `${name}.md`
  const live = path.join(agentsDir, file)
  if (fs.existsSync(live)) return { name, status: 'skipped', detail: 'already live' }

  const parked = path.join(parkAgents, file)
  if (fs.existsSync(parked)) {
    const status = moveSafe(parked, live)
    return { name, status, detail: status === 'restored' ? 'from parked' : 'already live' }
  }

  const fromLib = path.join(agentsLibrary, file)
  if (fs.existsSync(fromLib)) {
    const status = copyFileSafe(fromLib, live)
    return {
      name,
      status,
      detail: status === 'restored' ? 'copied from agents-library/' : 'already live',
    }
  }

  return {
    name,
    status: 'missing',
    detail: 'not in parked or agents-library/ (install-premium-agents.ps1 may recreate full set)',
  }
}

const phaseArg = (process.argv[2] || 'all').toLowerCase()
if (!PHASES[phaseArg]) {
  console.error(
    `Unknown phase "${phaseArg}". Use: planning | windows | design | 3d | shell | quality | remotion | ultra | cinema | all`,
  )
  process.exit(1)
}

const pack = PHASES[phaseArg]
ensureDir(skillsDir)
ensureDir(agentsDir)

const restored = []
const missing = []
const skipped = []

console.log(`Project Expert selective restore — phase: ${phaseArg}`)
console.log('')

for (const name of pack.skills) {
  const r = restoreSkill(name)
  if (r.status === 'restored') restored.push(`skill:${r.name} (${r.detail})`)
  else if (r.status === 'missing') missing.push(`skill:${r.name} (${r.detail})`)
  else skipped.push(`skill:${r.name} (${r.detail})`)
}

for (const name of pack.agents) {
  const r = restoreAgent(name)
  if (r.status === 'restored') restored.push(`agent:${r.name} (${r.detail})`)
  else if (r.status === 'missing') missing.push(`agent:${r.name} (${r.detail})`)
  else skipped.push(`agent:${r.name} (${r.detail})`)
}

console.log('restored', restored.length)
for (const line of restored) console.log('  +', line)
console.log('skipped', skipped.length)
for (const line of skipped) console.log('  ~', line)
console.log('missing', missing.length)
for (const line of missing) console.log('  !', line)
console.log('')
console.log(
  missing.length === 0
    ? 'OK project-expert restore complete'
    : 'WARN project-expert restore finished with missing items',
)
process.exit(missing.length === 0 ? 0 : 2)
