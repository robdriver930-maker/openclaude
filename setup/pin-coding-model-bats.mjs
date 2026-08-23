/**
 * One-shot: pin every OpenClaude .bat under Desktop\openclaude to qwen3.6-oc-code:27b.
 * Skip venv + historical backups.
 */
import fs from 'fs'
import path from 'path'

const ROOT = 'C:\\Users\\GoldenBoy\\Desktop\\openclaude'
const NEW = 'qwen3.6-oc-code:27b'
const OLD = [
  'qwen3-coder:480b-cloud',
  'qwen3-coder:30b',
  'qwen3.6-oc:latest',
  'qwen3.6-oc:27b',
  'qwen2.5-coder:7b',
  'qwen3.5:latest',
]

function shouldSkip(p) {
  const n = p.toLowerCase()
  return (
    n.includes('\\node_modules\\') ||
    n.includes('\\headroom-venv\\') ||
    n.includes('\\files\\backups\\') ||
    n.includes('\\.git\\')
  )
}

function walk(dir, out = []) {
  let ents
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const ent of ents) {
    const p = path.join(dir, ent.name)
    if (shouldSkip(p)) continue
    if (ent.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'headroom-venv'].includes(ent.name)) continue
      walk(p, out)
    } else if (ent.name.toLowerCase().endsWith('.bat')) {
      out.push(p)
    }
  }
  return out
}

const bats = walk(ROOT)
const changed = []
for (const file of bats) {
  let t = fs.readFileSync(file, 'utf8')
  const before = t
  for (const m of OLD) {
    if (t.includes(m)) t = t.split(m).join(NEW)
  }
  if (t !== before) {
    fs.writeFileSync(file, t, 'utf8')
    changed.push(path.relative(ROOT, file))
  }
}

console.log('scanned', bats.length)
console.log('changed', changed.length)
for (const c of changed) console.log(' ', c)
if (changed.length === 0) {
  console.log('No bat model pins found to replace (already updated or no matches).')
}
