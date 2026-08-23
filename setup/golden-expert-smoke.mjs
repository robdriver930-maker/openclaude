/**
 * Golden smoke for Project Expert pack + tool-first local model.
 * Mechanical checks only — does not replace Robert's run.bat chat tests.
 *
 *   node setup/golden-expert-smoke.mjs
 */
import fs from 'fs'
import path from 'path'
import http from 'http'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const user = process.env.USERPROFILE
const skillsDir = path.join(user, '.openclaude', 'skills')
const agentsDir = path.join(user, '.openclaude', 'agents')
const liveClaude = path.join(user, '.openclaude', 'CLAUDE.md')
const template = path.join(root, 'setup', 'templates', 'project-CLAUDE.md')
const MODEL = 'qwen3.6-oc:27b'

const MUST_SKILLS = [
  'writing-plans',
  'windows-desktop-apps',
  'software-design',
  'three-best-practices',
  'full-output-enforcement',
  'verification-before-completion',
]
const MUST_AGENTS = [
  'electron-desktop-specialist',
  'premium-visual-director',
  '3d-product-visualizer',
  'windows-shell-master',
]

let failed = 0
function ok(msg) {
  console.log('[OK]', msg)
}
function bad(msg) {
  console.error('[BAD]', msg)
  failed++
}

console.log('=== Project Expert golden smoke ===\n')

if (fs.existsSync(template)) ok('project CLAUDE.md template present')
else bad('missing setup/templates/project-CLAUDE.md')

if (fs.existsSync(liveClaude)) {
  const t = fs.readFileSync(liveClaude, 'utf8')
  if (/Project Expert router/i.test(t)) ok('live CLAUDE.md has Project Expert router')
  else bad('live CLAUDE.md missing Project Expert router')
  if (/project-CLAUDE|per-project|templates/i.test(t)) ok('live CLAUDE.md points at project template')
  else bad('live CLAUDE.md missing project template pointer')
} else bad('missing ~/.openclaude/CLAUDE.md')

for (const s of MUST_SKILLS) {
  if (fs.existsSync(path.join(skillsDir, s, 'SKILL.md'))) ok(`skill live: ${s}`)
  else bad(`skill missing: ${s}`)
}
for (const a of MUST_AGENTS) {
  if (fs.existsSync(path.join(agentsDir, `${a}.md`))) ok(`agent live: ${a}`)
  else bad(`agent missing: ${a}`)
}

const skillCount = fs.existsSync(skillsDir)
  ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('_')).length
  : 0
const agentCount = fs.existsSync(agentsDir)
  ? fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md')).length
  : 0
if (skillCount >= 6 && skillCount <= 20) ok(`skills slim: ${skillCount}`)
else bad(`skills out of range: ${skillCount}`)
if (agentCount >= 4 && agentCount <= 12) ok(`agents slim: ${agentCount}`)
else bad(`agents out of range: ${agentCount}`)

const probe = spawnSync(process.execPath, [path.join(root, 'setup', 'probe-tool-call.mjs')], {
  encoding: 'utf8',
  cwd: root,
  timeout: 120000,
})
const probeOut = `${probe.stdout || ''}${probe.stderr || ''}`
if (probe.status === 0 && /TOOL_CALL_PASS/.test(probeOut)) ok('TOOL_CALL_PASS')
else bad(`tool probe failed (exit ${probe.status})`)

function postNative(body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body)
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 11434,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 120000,
      },
      (res) => {
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(d) })
          } catch {
            resolve({ status: res.statusCode, json: null })
          }
        })
      },
    )
    req.on('error', (e) => resolve({ status: 0, error: String(e.message || e) }))
    req.write(data)
    req.end()
  })
}

// think:false so Qwen puts the plan in content (not empty content + thinking-only)
const plan = await postNative({
  model: MODEL,
  stream: false,
  think: false,
  options: { temperature: 0.3, num_predict: 400 },
  messages: [
    {
      role: 'user',
      content:
        'Reply with exactly four labelled lines only:\nJOB:\nOUT:\nNOT:\nDONE WHEN:\nfor adding a Windows tray icon to an Electron app. No tools. No preamble.',
    },
  ],
})
const msg = plan.json?.message || {}
const planText = [msg.content, msg.thinking, msg.reasoning].filter(Boolean).join('\n')
const hasJob = /\bJOB\b/i.test(planText)
const hasOut = /\bOUT\b/i.test(planText)
const hasNot = /\bNOT\b/i.test(planText)
const hasDone = /DONE\s*WHEN/i.test(planText)
if (plan.status === 200 && hasJob && hasOut && hasNot && hasDone) {
  ok('planning shape JOB/OUT/NOT/DONE WHEN')
} else {
  bad(`planning shape weak (status ${plan.status})`)
  console.error('  preview:', planText.slice(0, 240).replace(/\n/g, ' '))
}

console.log('')
if (failed === 0) {
  console.log('=== GOLDEN_EXPERT_SMOKE_PASS ===')
  process.exit(0)
}
console.log(`=== GOLDEN_EXPERT_SMOKE_FAIL (${failed}) ===`)
process.exit(1)
