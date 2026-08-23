/**
 * Apply top-quality cinema / 3D visual pack to live OpenClaude profile.
 * Keeps skills ≤20, agents ≤12.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const user = process.env.USERPROFILE
const skillsDir = path.join(user, '.openclaude', 'skills')
const parkSkills = path.join(user, '.openclaude', '_parked-army', 'skills')
const agentsDir = path.join(user, '.openclaude', 'agents')
const parkAgents = path.join(user, '.openclaude', '_parked-army', 'agents')
const lib = path.join(root, 'agents-library')
const repoSkills = path.join(root, 'Skills')

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function moveSafe(from, to) {
  ensureDir(path.dirname(to))
  if (fs.existsSync(to)) return 'skipped'
  try {
    fs.renameSync(from, to)
    return 'moved'
  } catch (err) {
    if (err && ['EPERM', 'EACCES', 'EBUSY'].includes(err.code)) {
      fs.cpSync(from, to, { recursive: true, force: true })
      fs.rmSync(from, { recursive: true, force: true })
      return 'moved'
    }
    throw err
  }
}

function copyDir(from, to) {
  ensureDir(path.dirname(to))
  if (fs.existsSync(to)) fs.rmSync(to, { recursive: true, force: true })
  fs.cpSync(from, to, { recursive: true, force: true })
  return 'copied'
}

const log = []

const parkSkillNames = [
  'software-building',
  'software-design',
  'systematic-debugging',
  'find-animation-opportunities',
]
for (const name of parkSkillNames) {
  const live = path.join(skillsDir, name)
  const parked = path.join(parkSkills, name)
  if (fs.existsSync(live)) log.push(`park skill ${moveSafe(live, parked)} ${name}`)
}

const restoreSkills = [
  'design-taste-frontend',
  'stitch-design-taste',
  'ui-ux-pro-max',
  'frontend-design',
]
for (const name of restoreSkills) {
  const live = path.join(skillsDir, name)
  const parked = path.join(parkSkills, name)
  const fromRepo = path.join(repoSkills, name)
  if (fs.existsSync(live)) {
    log.push(`skill skip ${name}`)
    continue
  }
  if (fs.existsSync(parked)) log.push(`skill ${moveSafe(parked, live)} ${name}`)
  else if (fs.existsSync(fromRepo)) log.push(`skill ${copyDir(fromRepo, live)} ${name}`)
  else log.push(`skill MISSING ${name}`)
}

// Refresh ultra-enhancers from repo
{
  const live = path.join(skillsDir, 'ultra-enhancers')
  const from = path.join(repoSkills, 'ultra-enhancers')
  log.push(`skill ${copyDir(from, live)} ultra-enhancers`)
}

const parkAgentFiles = [
  'full-stack-builder.md',
  'project-completionist.md',
  'motion-craft-engineer.md',
  'capability-dispatcher.md',
]
for (const file of parkAgentFiles) {
  const live = path.join(agentsDir, file)
  const parked = path.join(parkAgents, file)
  if (!fs.existsSync(live)) continue
  if (fs.existsSync(parked)) fs.rmSync(parked, { force: true, recursive: true })
  log.push(`park agent ${moveSafe(live, parked)} ${file}`)
}

const restoreAgents = [
  'camera-and-lighting-director.md',
  'pbr-materials-specialist.md',
  'r3f-scene-architect.md',
  'threejs-specialist.md',
  'webgl-performance-guardian.md',
  'ultra-enhancer.md',
]
for (const file of restoreAgents) {
  const live = path.join(agentsDir, file)
  const from = path.join(lib, file)
  if (!fs.existsSync(from)) {
    log.push(`agent MISSING ${file}`)
    continue
  }
  fs.copyFileSync(from, live)
  log.push(`agent installed ${file}`)
}

const liveSkills = fs
  .readdirSync(skillsDir)
  .filter((n) => fs.statSync(path.join(skillsDir, n)).isDirectory())
  .sort()
const liveAgents = fs
  .readdirSync(agentsDir)
  .filter((n) => n.endsWith('.md'))
  .sort()

console.log(log.join('\n'))
console.log('---')
console.log('skills', liveSkills.length, liveSkills.join(', '))
console.log('agents', liveAgents.length, liveAgents.join(', '))
if (liveSkills.length > 20) console.log('WARN skills over 20')
if (liveAgents.length > 12) console.log('WARN agents over 12')
else console.log('OK cinema visual pack applied')
