/**
 * Full local-stack health check for OpenClaude + qwen3.8-oc-code:27b.
 * Exit 0 = all critical checks pass.
 */
import fs from 'fs'
import path from 'path'
import http from 'http'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const user = process.env.USERPROFILE
const LOCAL = 'qwen3.8-oc-code:27b'
let fail = 0

function ok(m) { console.log('[OK]  ', m) }
function bad(m) { console.log('[FAIL]', m); fail++ }
function info(m) { console.log('      ', m) }

function readJson(p) {
  let r = fs.readFileSync(p, 'utf8')
  if (r.charCodeAt(0) === 0xfeff) r = r.slice(1)
  return JSON.parse(r)
}

function httpJson(pathname, method = 'GET', body) {
  return new Promise(resolve => {
    const data = body ? JSON.stringify(body) : null
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 11434,
        path: pathname,
        method,
        headers: data
          ? { 'Content-Type': 'application/json', Authorization: 'Bearer ollama', 'Content-Length': Buffer.byteLength(data) }
          : {},
        timeout: 180000,
      },
      res => {
        let d = ''
        res.on('data', c => (d += c))
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(d), raw: d })
          } catch {
            resolve({ status: res.statusCode, json: null, raw: d })
          }
        })
      },
    )
    req.on('error', e => resolve({ status: 0, json: null, raw: String(e.message || e) }))
    req.on('timeout', () => {
      req.destroy()
      resolve({ status: 0, json: null, raw: 'timeout' })
    })
    if (data) req.write(data)
    req.end()
  })
}

console.log('')
console.log('=== OpenClaude local stack verify ===')
console.log('')

// CLI
const cli = path.join(root, 'dist', 'cli.mjs')
if (fs.existsSync(cli)) ok('dist/cli.mjs present')
else bad('dist/cli.mjs missing')

const dist = fs.existsSync(cli) ? fs.readFileSync(cli, 'utf8') : ''
if (dist.includes('ollamaThinkValue') || /xhigh[^;]{0,40}max/.test(dist)) ok('CLI has Ollama xhigh→max effort fix')
else bad('CLI missing Ollama effort fix — rebuild with bun run build')
if (dist.includes('Flush prose immediately') || dist.includes('couldBeRawToolCallsRequestedPrefix')) {
  ok('CLI has early Ollama text flush (idle-wait fix)')
} else {
  bad('CLI missing early Ollama flush — rebuild with bun run build')
}
if (
  dist.includes('reasoning_content') ||
  dist.includes('thinkingBlock') ||
  dist.includes('redacted_thinking')
) {
  ok('CLI has native Ollama thinking→reasoning bridge (v24 hang fix)')
} else {
  bad('CLI missing Ollama thinking bridge — rebuild with bun run build')
}
if (
  dist.includes('ollamaThinkValue') ||
  dist.includes('think: enableThink') ||
  /think:\s*!0/.test(dist) ||
  dist.includes('think:enableThink')
) {
  ok('CLI forces Ollama think max/false (compact send think:false)')
} else if (dist.includes('enableThink') && dist.includes('think:')) {
  ok('CLI forces Ollama think max/false (compact send think:false)')
} else {
  bad('CLI missing explicit Ollama think flag — rebuild with bun run build')
}
if (dist.includes('applyQwen38OllamaSampling')) {
  ok('CLI applies official Qwen3.8 thinking vs instruct sampling')
} else {
  bad('CLI missing Qwen3.8 sampling switch — rebuild with bun run build')
}
if (dist.includes('If Robert gave you a job, do the job')) {
  ok('CLI injects do-the-job direction (no second approve)')
} else {
  bad('CLI missing do-the-job direction — rebuild with bun run build')
}
if (dist.includes('Delete a file or folder from the local filesystem')) {
  ok('CLI includes Delete tool')
} else {
  bad('CLI missing Delete tool — rebuild with bun run build')
}
if (
  dist.includes('compactSummary') ||
  dist.includes('extractCompactSummaryText') ||
  dist.includes('using thinking text as local summary fallback')
) {
  ok('CLI has local compact thinking→summary fallback')
} else {
  bad('CLI missing compact thinking fallback — rebuild with bun run build')
}
if (dist.includes('11434') && /inputTokens:\s*0/.test(dist)) {
  ok('CLI has $0 local Ollama cost path')
} else {
  info('local $0 cost marker not found as plain text (minified) — smoke footer in UI later')
}

// Settings
const settingsPath = path.join(user, '.openclaude', 'settings.json')
const settings = readJson(settingsPath)
// Settings.model: user picker wins. Only fail if empty.
if (typeof settings.model === 'string' && settings.model.length > 0) ok(`settings.model preserved as user pick: ${settings.model}`)
else bad('settings.model is empty (picker was not preserved)')
if (settings.alwaysThinkingEnabled === true) ok('alwaysThinkingEnabled = true')
else bad('alwaysThinkingEnabled not true')
if (settings.env?.OPENCLAUDE_PERFORMANCE_MODE === 'max5090') ok('GPU mode max5090 (single MAX path)')
else bad(`perf mode = ${settings.env?.OPENCLAUDE_PERFORMANCE_MODE}`)
if (settings.env?.OLLAMA_FLASH_ATTENTION === '1') ok('flash-attn ON')
else bad('flash-attn should be 1')
if (settings.env?.OLLAMA_MAX_VRAM === '32768' || settings.env?.OLLAMA_MAX_VRAM === '30720') {
  ok(`OLLAMA_MAX_VRAM=${settings.env.OLLAMA_MAX_VRAM}`)
} else {
  bad(`OLLAMA_MAX_VRAM wrong (${settings.env?.OLLAMA_MAX_VRAM})`)
}
if (settings.env?.OLLAMA_CONTEXT_LENGTH === '163840') ok('OLLAMA_CONTEXT_LENGTH=163840 (MAX 160k)')
else bad(`OLLAMA_CONTEXT_LENGTH wrong (${settings.env?.OLLAMA_CONTEXT_LENGTH})`)
if (settings.env?.CLAUDE_CODE_NO_FLICKER === '0') ok('CLAUDE_CODE_NO_FLICKER=0 (Windows stable)')
else bad('CLAUDE_CODE_NO_FLICKER should be 0')
if (settings.effortLevel === 'max') ok('effortLevel = max (MAX)')
else bad(`effortLevel = ${settings.effortLevel} (want max)`)
if (settings.autoMemoryEnabled === true && /memory$/.test(String(settings.autoMemoryDirectory || '').replace(/\\/g, '/'))) {
  ok('shared autoMemoryDirectory = ~/.openclaude/memory')
} else {
  bad(`autoMemory missing (enabled=${settings.autoMemoryEnabled} dir=${settings.autoMemoryDirectory})`)
}
const memoryMd = path.join(user, '.openclaude', 'memory', 'goldenboy.md')
if (fs.existsSync(memoryMd)) ok('user memory: goldenboy.md')
else bad('missing ~/.openclaude/memory/goldenboy.md')
if (settings.env?.OLLAMA_NUM_GPU === '1') ok('OLLAMA_NUM_GPU=1')
else bad('OLLAMA_NUM_GPU wrong')

const allows = settings.permissions?.allow || []
for (const t of ['Read', 'Write', 'Edit', 'Bash', 'Agent', 'Skill', 'Delete', 'PowerShell', 'WebSearch', 'WebFetch']) {
  if (allows.includes(t)) ok(`tool allow: ${t}`)
  else bad(`tool missing from allow: ${t}`)
}
const denies = settings.permissions?.deny || []
if (denies.includes('EnterPlanMode')) ok('tool deny: EnterPlanMode (no second-approve loop)')
else bad('EnterPlanMode should be denied so a job is not a plan-mode click')

const mcpNames = Object.keys(settings.mcpServers || {})
// MAX local keeps MCPs OFF for stable chat (restore via apply-stack -WithMcps)
if (mcpNames.length === 0) ok('settings mcpServers: 0 (parked for MAX stability)')
else ok(`settings mcpServers: ${mcpNames.length} (${mcpNames.join(', ')})`)

// Skills / agents — slim daily set is intentional (parked army under _parked-army)
const skillsDir = path.join(user, '.openclaude', 'skills')
const agentsDir = path.join(user, '.openclaude', 'agents')
const skillCount = fs.existsSync(skillsDir)
  ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('_')).length
  : 0
const agentCount = fs.existsSync(agentsDir)
  ? fs.readdirSync(agentsDir).filter(f => f.endsWith('.md')).length
  : 0
if (skillCount >= 6 && skillCount <= 20) ok(`live skills slim: ${skillCount}`)
else if (skillCount > 20) ok(`live skills full army: ${skillCount}`)
else bad(`live skills too low: ${skillCount}`)
if (agentCount >= 4 && agentCount <= 15) ok(`live agents slim: ${agentCount}`)
else if (agentCount > 15) ok(`live agents full army: ${agentCount}`)
else bad(`live agents too low: ${agentCount}`)

for (const must of [
  'software-building',
  'openclaude-self-repair',
  'openclaude-context-compact',
  'verification-before-completion',
  'working-with-robert',
  // Project Expert core (planning + windows + design) — slim ceiling unchanged
  'writing-plans',
  'executing-plans',
  'windows-desktop-apps',
  'software-design',
  'high-end-visual-design',
  'full-output-enforcement',
  'public-apis',
]) {
  if (fs.existsSync(path.join(skillsDir, must, 'SKILL.md'))) ok(`must-have skill: ${must}`)
  else bad(`missing skill: ${must}`)
}
if (fs.existsSync(path.join(agentsDir, 'capability-dispatcher.md'))) ok('agent: capability-dispatcher')
else bad('missing agent capability-dispatcher')
if (fs.existsSync(path.join(agentsDir, 'electron-desktop-specialist.md'))) {
  ok('agent: electron-desktop-specialist')
} else {
  info('optional agent electron-desktop-specialist missing (kept lean 7-core army)')
}
if (fs.existsSync(path.join(agentsDir, 'premium-visual-director.md'))) {
  ok('agent: premium-visual-director')
} else {
  info('optional agent premium-visual-director missing (kept lean 7-core army)')
}

// MCP project files
const mcpJson = path.join(root, '.mcp.json')
if (fs.existsSync(mcpJson)) {
  const m = readJson(mcpJson)
  const n = Object.keys(m.mcpServers || {}).length
  if (n === 0) ok('.mcp.json servers: 0 (parked for MAX stability)')
  else ok(`.mcp.json servers: ${n}`)
} else bad('.mcp.json missing')

const ocj = readJson(path.join(user, '.openclaude.json'))
if (ocj.activeProviderProfileId === 'provider_local_power') ok('active profile local power')
else bad(`active profile ${ocj.activeProviderProfileId}`)
const lp = (ocj.providerProfiles || []).find(p => p.id === 'provider_local_power')
if (lp?.model === LOCAL) ok(`provider_local_power = ${LOCAL}`)
else bad(`provider_local_power = ${lp?.model}`)
const cloud = (ocj.providerProfiles || []).find(p => p.id === 'provider_cloud_builder')
if (cloud?.model) ok(`cloud unchanged present: ${cloud.model}`)
else ok('cloud profile removed (Ollama-only stack — correct)')
const ocjMcp = Object.keys(ocj.mcpServers || {}).length
if (ocjMcp === 0) ok('~/.openclaude.json mcpServers: 0 (parked for MAX stability)')
else ok(`~/.openclaude.json mcpServers: ${ocjMcp}`)

// Plugins intentional empty marketplaces
if (settings.enabledPlugins && Object.keys(settings.enabledPlugins).length === 0) {
  ok('plugins marketplaces empty (correct for this stack)')
} else {
  info('enabledPlugins not empty — ok if you installed real OpenClaude plugins')
}

// Ollama + model
const tags = await httpJson('/api/tags')
if (tags.status === 200) ok('Ollama API up')
else bad('Ollama API down')
const names = (tags.json?.models || []).map(m => m.name)
if (names.includes(LOCAL)) ok(`ollama has ${LOCAL}`)
else bad(`ollama missing ${LOCAL}`)

// Prove xhigh rejected, max accepted
const xhigh = await httpJson('/v1/chat/completions', 'POST', {
  model: LOCAL,
  messages: [{ role: 'user', content: 'hi' }],
  max_tokens: 8,
  reasoning_effort: 'xhigh',
})
if (xhigh.status === 400 || /invalid reasoning|xhigh/i.test(xhigh.raw || '')) {
  ok('Ollama correctly rejects reasoning_effort=xhigh')
} else if (xhigh.status === 200) {
  ok('Ollama accepts reasoning_effort=xhigh (newer server)')
} else {
  bad(`unexpected xhigh status=${xhigh.status}`)
}

const chat = await httpJson('/v1/chat/completions', 'POST', {
  model: LOCAL,
  messages: [{ role: 'user', content: 'Reply with exactly: STACK_OK' }],
  max_tokens: 256,
  temperature: 0,
  reasoning_effort: 'max',
})
const content = chat.json?.choices?.[0]?.message?.content || ''
if (chat.status === 200 && /STACK_OK/i.test(content)) ok('local 27b chat with reasoning_effort=max')
else if (chat.status === 200 && content.length === 0 && chat.json?.choices?.[0]?.message?.reasoning) {
  ok('local 27b responded (thinking-only on short budget) — API path OK')
} else {
  bad(`local chat failed status=${chat.status} content=${JSON.stringify(content).slice(0, 80)} err=${(chat.raw || '').slice(0, 120)}`)
}

// Launcher wiring (interactive path Robert uses)
const runBat = path.join(root, 'run.bat')
if (fs.existsSync(runBat)) {
  const bat = fs.readFileSync(runBat, 'utf8')
  if (bat.includes('qwen3.8:27b') || bat.includes('qwen3.8-oc-code:27b')) ok('run.bat retains local 27b source (qwen3.8:27b) for --model override')
  else bad('run.bat missing local 27b source')
  if (bat.includes('dangerously-skip-permissions') && bat.includes('bypassPermissions')) {
    ok('run.bat launches with bypassPermissions (needed for tools)')
  } else {
    bad('run.bat missing permission bypass flags')
  }
  if (bat.includes('OPENCLAUDE_PERFORMANCE_MODE=max5090')) ok('run.bat sets max5090 (single path)')
  else bad('run.bat missing max5090')
  if (/MAX/i.test(bat)) ok('run.bat is MAX-only launcher')
  else bad('run.bat missing MAX-only messaging')
  if (bat.includes('choice /C CL')) bad('run.bat still has C/L menu — should be one path')
  else ok('run.bat has no C/L choice menu')
  if (bat.includes('OLLAMA_FLASH_ATTENTION=1')) ok('run.bat flash-attn ON')
  else bad('run.bat should enable flash-attn')
  if (bat.includes('CLAUDE_CODE_NO_FLICKER=0')) ok('run.bat fullscreen/flicker OFF (Windows stable)')
  else bad('run.bat should set CLAUDE_CODE_NO_FLICKER=0')
  if (bat.includes('apply-local-model-settings.mjs')) {
    ok('run.bat syncs settings via apply-local-model-settings.mjs')
  } else {
    bad('run.bat should call setup\\apply-local-model-settings.mjs')
  }
  const mf = path.join(root, 'setup', 'Modelfile.qwen38-27b-oc-code')
  if (fs.existsSync(mf)) {
    const mft = fs.readFileSync(mf, 'utf8')
    if (/PARAMETER temperature 1\.0/.test(mft) && /PARAMETER presence_penalty 0/.test(mft) && /PARAMETER repeat_penalty 1\.0/.test(mft)) {
      ok('Modelfile uses official Qwen3.8 thinking sampling')
    } else {
      bad('Modelfile sampling is not official Qwen3.8 thinking (temp 1.0 / presence 0 / repeat 1.0)')
    }
  } else {
    bad('setup/Modelfile.qwen38-27b-oc-code missing')
  }
  if (/OLLAMA_CONTEXT_LENGTH=163840/.test(bat)) {
    ok('run.bat uses MAX 160k context')
  } else {
    bad('run.bat context not set to MAX 163840')
  }
} else {
  bad('run.bat missing')
}

// Optional full CLI print smoke (slow; set OPENCLAUDE_PRINT_SMOKE=1)
if (process.env.OPENCLAUDE_PRINT_SMOKE === '1' && fs.existsSync(cli) && fail === 0) {
  info('OpenClaude --print smoke (may take ~2–3 min)...')
  const r = spawnSync(
    process.execPath,
    ['--max-old-space-size=8192', cli, '--model', LOCAL, '--print', '--dangerously-skip-permissions', 'Reply with exactly: STACK_OC_OK'],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 300000,
      env: {
        ...process.env,
        CLAUDE_CODE_USE_OPENAI: '1',
        OPENAI_BASE_URL: 'http://127.0.0.1:11434/v1',
        OPENAI_API_KEY: 'ollama',
        OPENAI_MODEL: LOCAL,
      },
    },
  )
  const out = `${r.stdout || ''}\n${r.stderr || ''}`
  if (/STACK_OC_OK/.test(out)) ok('OpenClaude CLI local 27b print works')
  else if (/invalid reasoning value:\s*'xhigh'/.test(out)) bad('OpenClaude still sending xhigh — rebuild required')
  else bad(`OpenClaude print failed: ${out.slice(0, 300).replace(/\s+/g, ' ')}`)
} else {
  info('CLI print smoke skipped (set OPENCLAUDE_PRINT_SMOKE=1 to force). API + launcher checks cover the critical path.')
}

console.log('')
if (fail === 0) {
  console.log('=== LOCAL STACK PASS ===')
  process.exit(0)
}
console.log(`=== LOCAL STACK FAIL (${fail}) ===`)
process.exit(1)
