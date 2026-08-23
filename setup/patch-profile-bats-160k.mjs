import fs from 'fs'
import path from 'path'

const root = 'C:\\Users\\GoldenBoy\\Desktop\\openclaude'

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'headroom-venv', 'backups'].includes(e.name)) continue
      walk(p, out)
    } else if (/^run-(software-ai|coder|websites)\.bat$/i.test(e.name)) {
      out.push(p)
    }
  }
  return out
}

for (const f of walk(root)) {
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('qwen3.6-oc-code:27b')) {
    console.log('skip', path.relative(root, f))
    continue
  }
  if (t.includes('LocalContextLength')) {
    console.log('ok', path.relative(root, f))
    continue
  }
  t = t.replace(
    '-Model "qwen3.6-oc-code:27b"',
    '-Model "qwen3.6-oc-code:27b" -LocalContextLength 163840',
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('patched', path.relative(root, f))
}
