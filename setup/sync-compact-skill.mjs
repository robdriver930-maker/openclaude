import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const oc = path.join(process.env.USERPROFILE, '.openclaude')

const copies = [
  [
    path.join(root, 'Skills', 'openclaude-context-compact', 'SKILL.md'),
    path.join(oc, 'skills', 'openclaude-context-compact', 'SKILL.md'),
  ],
  [
    path.join(root, 'Skills', 'openclaude-self-repair', 'SKILL.md'),
    path.join(oc, 'skills', 'openclaude-self-repair', 'SKILL.md'),
  ],
  [
    path.join(root, 'agents-library', 'openclaude-self-healer.md'),
    path.join(oc, 'agents', 'openclaude-self-healer.md'),
  ],
]

for (const [from, to] of copies) {
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(from, to)
  console.log('copied', path.basename(path.dirname(to)) + '/' + path.basename(to))
}

const cli = fs.readFileSync(path.join(root, 'dist', 'cli.mjs'), 'utf8')
console.log(
  'cli_think_flag',
  cli.includes('ollamaThinkValue') || cli.includes('think: enableThink') || /think:\s*enableThink/.test(cli) ? 'yes' : 'no',
)
console.log(
  'live_skill',
  fs.existsSync(path.join(oc, 'skills', 'openclaude-context-compact', 'SKILL.md'))
    ? 'yes'
    : 'no',
)
