/**
 * Restore skills/agents parked by park-army-for-context.mjs
 *
 *   node setup/restore-army.mjs
 *   node setup/restore-army.mjs --agents-only
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
const agentsOnly = process.argv.includes('--agents-only')

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function moveSafe(from, to) {
  ensureDir(path.dirname(to))
  if (fs.existsSync(to)) {
    console.log('skip exists', to)
    return false
  }
  fs.renameSync(from, to)
  return true
}

if (!fs.existsSync(parkRoot)) {
  console.log('Nothing to restore — no _parked-army folder')
  process.exit(0)
}

let restoredSkills = 0
let restoredAgents = 0

if (!agentsOnly && fs.existsSync(parkSkills)) {
  for (const ent of fs.readdirSync(parkSkills, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue
    if (moveSafe(path.join(parkSkills, ent.name), path.join(skillsDir, ent.name))) {
      restoredSkills++
    }
  }
}

if (fs.existsSync(parkAgents)) {
  for (const ent of fs.readdirSync(parkAgents, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith('.md')) continue
    if (moveSafe(path.join(parkAgents, ent.name), path.join(agentsDir, ent.name))) {
      restoredAgents++
    }
  }
}

if (fs.existsSync(manifestPath)) {
  const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  m.restoredAt = new Date().toISOString()
  m.restoredSkills = restoredSkills
  m.restoredAgents = restoredAgents
  fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2) + '\n', 'utf8')
}

console.log(agentsOnly ? 'OK army restore (agents only)' : 'OK army restore')
console.log('restored_skills', restoredSkills)
console.log('restored_agents', restoredAgents)
