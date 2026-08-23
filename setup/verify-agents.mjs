import fs from 'fs'
import path from 'path'

const dir = path.join(process.env.USERPROFILE, '.openclaude', 'agents')
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))
let ok = 0
const bad = []
for (const f of files) {
  let raw = fs.readFileSync(path.join(dir, f), 'utf8')
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1)
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) {
    bad.push(f + ': no frontmatter')
    continue
  }
  const hasName = /^name:\s+\S+/m.test(m[1])
  const hasDesc = /^description:\s+\S+/m.test(m[1])
  if (!hasName || !hasDesc) {
    bad.push(f + ': missing name/description')
    continue
  }
  ok++
}
console.log(`Parsed ${ok}/${files.length}`)
if (bad.length) {
  console.log(bad.join('\n'))
  process.exit(1)
}
const bytes = fs.readFileSync(path.join(dir, 'software-architect.md'))
console.log(`First bytes: ${[...bytes.slice(0, 3)].join(',')}`)
console.log('VERIFY_OK')
