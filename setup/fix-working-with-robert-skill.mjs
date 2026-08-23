import fs from 'fs'
import path from 'path'

const oc = path.join(process.env.USERPROFILE, '.openclaude')
const live = path.join(oc, 'skills', 'working-with-robert')
const parked = path.join(oc, '_parked-army', 'skills', 'working-with-robert')
const sources = [
  parked,
  path.join(process.env.USERPROFILE, '.agents', 'skills', 'working-with-robert'),
  path.join(process.env.USERPROFILE, '.cursor', 'skills', 'working-with-robert'),
]

console.log('live_skills', fs.readdirSync(path.join(oc, 'skills')).filter(n => {
  try { return fs.statSync(path.join(oc, 'skills', n)).isDirectory() } catch { return false }
}))

if (fs.existsSync(path.join(live, 'SKILL.md'))) {
  console.log('OK already present')
  process.exit(0)
}

for (const src of sources) {
  if (!fs.existsSync(path.join(src, 'SKILL.md'))) continue
  fs.mkdirSync(path.dirname(live), { recursive: true })
  if (fs.existsSync(live)) fs.rmSync(live, { recursive: true, force: true })
  fs.cpSync(src, live, { recursive: true })
  console.log('restored_from', src)
  process.exit(0)
}

// Minimal fallback so verify + Skill tool work
fs.mkdirSync(live, { recursive: true })
fs.writeFileSync(
  path.join(live, 'SKILL.md'),
  `---
name: working-with-robert
description: How to work with Robert (Bobby's Tech Services). Tone, UK English, beginner-friendly.
---

# Working with Robert

Robert runs Bobby's Tech Services. Beginner with software. Short, plain UK English. Outcome first. No emojis unless asked. Commit only when he asks. Do not invent prices or API keys.
`,
  'utf8',
)
console.log('wrote_minimal_fallback', live)
