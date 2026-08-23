/**
 * snappy5090 — fast local OpenClaude on RTX 5090.
 * Proof: raw Ollama answers in ~3–4s; hangs came from max effort + MCP tool bloat.
 * Parks MCPs (restorable), 32k ctx, effort high (not max), flash on.
 */
import fs from 'fs'
import path from 'path'
import http from 'http'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

const user = process.env.USERPROFILE
const settingsPath = path.join(user, '.openclaude', 'settings.json')
const ocjPath = path.join(user, '.openclaude.json')
const perfPath = path.join(user, '.openclaude', 'performance-mode.json')
const mcpBackupPath = path.join(user, '.openclaude', 'mcpServers.backup-speed.json')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const modelfile = path.join(root, 'setup', 'Modelfile.qwen36-27b-oc')

const LOCAL = 'qwen3.6-oc:27b'
const BASE = 'http://127.0.0.1:11434/v1'
const HOST = '127.0.0.1:11434'
const CTX = 32768

function readJson(p) {
  let r = fs.readFileSync(p, 'utf8')
  if (r.charCodeAt(0) === 0xfeff) r = r.slice(1)
  return JSON.parse(r)
}
function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 4) + '\n', 'utf8')
}

function setUserEnv(k, v) {
  execFileSync(
    'powershell',
    ['-NoProfile', '-Command', `[Environment]::SetEnvironmentVariable('${k}', '${v}', 'User')`],
    { stdio: 'ignore' },
  )
}
function clearUserEnv(k) {
  execFileSync(
    'powershell',
    ['-NoProfile', '-Command', `[Environment]::SetEnvironmentVariable('${k}', $null, 'User')`],
    { stdio: 'ignore' },
  )
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
          ? {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ollama',
              'Content-Length': Buffer.byteLength(data),
            }
          : { Authorization: 'Bearer ollama' },
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

const settings = readJson(settingsPath)
const keepTavily = settings.env?.TAVILY_API_KEY
const keepSearch = settings.env?.WEB_SEARCH_PROVIDER || 'auto'
const keepPerms = settings.permissions

// Park MCPs so they cannot stall / bloat the local chat (restore later)
const liveMcp = settings.mcpServers && Object.keys(settings.mcpServers).length ? settings.mcpServers : null
if (liveMcp) {
  writeJson(mcpBackupPath, {
    parkedAt: new Date().toISOString(),
    reason: 'snappy5090 local speed',
    mcpServers: liveMcp,
  })
  console.log('parked_mcps', Object.keys(liveMcp).length, '→', mcpBackupPath)
}
settings.mcpServers = {}

settings.model = LOCAL
settings.effortLevel = 'high'
settings.alwaysThinkingEnabled = true
settings.disableAllHooks = true
settings.enabledPlugins = {}
settings.extraKnownMarketplaces = {}
settings.skipDangerousModePermissionPrompt = true

settings.env = {
  CLAUDE_CODE_USE_OPENAI: '1',
  OPENAI_BASE_URL: BASE,
  OPENAI_API_KEY: 'ollama',
  OPENAI_MODEL: LOCAL,
  OLLAMA_HOST: HOST,
  OLLAMA_NUM_GPU: '1',
  OLLAMA_FLASH_ATTENTION: '1',
  OLLAMA_CONTEXT_LENGTH: String(CTX),
  OLLAMA_MAX_VRAM: '24576',
  OLLAMA_KEEP_ALIVE: '15m',
  OLLAMA_NUM_PARALLEL: '1',
  OLLAMA_MAX_LOADED_MODELS: '1',
  OLLAMA_NUM_THREAD: '24',
  OPENCLAUDE_PERFORMANCE_MODE: 'snappy5090',
  CLAUDE_CODE_NO_FLICKER: '0',
  CLAUDE_CODE_DISABLE_MOUSE: '1',
  CLAUDE_CODE_DISABLE_MOUSE_CLICKS: '1',
  CLAUDE_CODE_OPENAI_FALLBACK_CONTEXT_WINDOW: '28672',
  CLAUDE_CODE_AUTO_COMPACT_WINDOW: '24576',
  CLAUDE_CODE_MAX_OUTPUT_TOKENS: '4096',
  CLAUDE_STREAM_IDLE_TIMEOUT_MS: '90000',
  API_TIMEOUT_MS: '600000',
  OPENCLAUDE_MAX_RETRIES: '8',
  CLAUDE_ENABLE_STREAM_WATCHDOG: '1',
  USE_BUILTIN_RIPGREP: '0',
  CLAUDE_CODE_GLOB_TIMEOUT_SECONDS: '60',
  OPENCLAUDE_DISABLE_TOOL_REMINDERS: '1',
  WEB_SEARCH_PROVIDER: keepSearch,
  CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS: JSON.stringify({
    [LOCAL]: CTX,
    'qwen3.6:27b': CTX,
    'qwen3.6:latest': CTX,
    'qwen3-coder:30b': 32768,
    'qwen2.5-coder:7b': 16384,
    'devstral-small-2:latest': 32768,
    'kimi-k2.7-code:cloud': 120000,
    'glm-5.2:cloud': 120000,
  }),
}
if (keepTavily) settings.env.TAVILY_API_KEY = keepTavily
if (keepPerms) settings.permissions = keepPerms
writeJson(settingsPath, settings)

const ocj = readJson(ocjPath)
ocj.activeProviderProfileId = 'provider_local_power'
ocj.providerProfiles = (ocj.providerProfiles || []).map(p => {
  if (p.id === 'provider_local_power') {
    return {
      ...p,
      name: 'Ollama Local (qwen3.6-oc:27b snappy5090)',
      provider: 'ollama',
      baseUrl: BASE,
      model: LOCAL,
    }
  }
  return p
})
if (ocj.mcpServers && Object.keys(ocj.mcpServers).length) {
  if (!fs.existsSync(mcpBackupPath)) {
    writeJson(mcpBackupPath, {
      parkedAt: new Date().toISOString(),
      reason: 'snappy5090 from openclaude.json',
      mcpServers: ocj.mcpServers,
    })
  }
  ocj.mcpServers = {}
}
ocj.agentModels = {
  [LOCAL]: { base_url: BASE, api_key: 'ollama' },
  'qwen3-coder:30b': { base_url: BASE, api_key: 'ollama' },
  'qwen2.5-coder:7b': { base_url: BASE, api_key: 'ollama' },
  'devstral-small-2:latest': { base_url: BASE, api_key: 'ollama' },
  'kimi-k2.7-code:cloud': { base_url: BASE, api_key: 'ollama' },
  'glm-5.2:cloud': { base_url: BASE, api_key: 'ollama' },
}
ocj.agentRouting = {
  Explore: LOCAL,
  Plan: LOCAL,
  'general-purpose': LOCAL,
  'frontend-dev': LOCAL,
  'code-fixer': LOCAL,
  'hard-code-fixer': LOCAL,
  default: LOCAL,
}
writeJson(ocjPath, ocj)

writeJson(perfPath, {
  mode: 'snappy',
  tier: '5090-snappy',
  applied: new Date().toISOString().slice(0, 16).replace('T', ' '),
  localModel: LOCAL,
  openaiBaseUrl: BASE,
  ollamaHost: HOST,
  notes:
    'snappy5090: 32k ctx, effort high, MCPs parked, flash on. Raw Ollama ~3s; OpenClaude should feel close. Restore MCPs: node setup/restore-mcps-speed.mjs. Power mode: run.bat power',
})

// Rewrite Modelfile for 32k + snappy system prompt
fs.writeFileSync(
  modelfile,
  `FROM qwen3.6:27b

# snappy5090 — fast local on RTX 5090 (hard-capped, never 262k)
PARAMETER num_ctx ${CTX}
PARAMETER num_batch 512
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 20
PARAMETER repeat_penalty 1.05

SYSTEM You are OpenClaude on Robert's Windows PC (Bobby's Tech Services). Act quickly. Prefer short clear UK English and working software. Use tools when needed. Do not invent facts, paths, or API keys. Do not overthink simple questions.
`,
  'utf8',
)

setUserEnv('OLLAMA_HOST', HOST)
setUserEnv('OLLAMA_NUM_GPU', '1')
setUserEnv('OLLAMA_FLASH_ATTENTION', '1')
setUserEnv('OLLAMA_CONTEXT_LENGTH', String(CTX))
setUserEnv('OLLAMA_MAX_VRAM', '24576')
setUserEnv('OLLAMA_KEEP_ALIVE', '15m')
setUserEnv('OLLAMA_NUM_PARALLEL', '1')
setUserEnv('OLLAMA_MAX_LOADED_MODELS', '1')
clearUserEnv('OLLAMA_KV_CACHE_TYPE')
clearUserEnv('CUDA_VISIBLE_DEVICES')

console.log('OK snappy5090 settings written')
console.log('model', LOCAL, 'ctx', CTX, 'effort high', 'flash 1', 'mcps parked')

// Recreate oc model so num_ctx matches
try {
  console.log('recreating', LOCAL, '...')
  execFileSync('ollama', ['create', LOCAL, '-f', modelfile], { stdio: 'inherit' })
} catch (e) {
  console.log('WARN ollama create failed:', e.message || e)
}

// Reload with new ctx
try {
  execFileSync('ollama', ['stop', LOCAL], { stdio: 'ignore' })
} catch {
  /* ignore */
}

const tags = await httpJson('/api/tags')
const names = (tags.json?.models || []).map(m => m.name)
console.log('has_oc27b', names.includes(LOCAL))

const t0 = Date.now()
const chat = await httpJson('/v1/chat/completions', 'POST', {
  model: LOCAL,
  messages: [{ role: 'user', content: 'Reply with exactly: SNAPPY_OK' }],
  max_tokens: 256,
  temperature: 0,
})
const ms = Date.now() - t0
const msg = chat.json?.choices?.[0]?.message || {}
const content = typeof msg.content === 'string' ? msg.content : ''
const ok = chat.status === 200 && (/SNAPPY_OK/i.test(content) || content.trim().length > 0)
console.log('v1_chat', ok ? 'OK' : 'FAIL', `${ms}ms`, JSON.stringify(content).slice(0, 40))
if (!ok) process.exit(4)
console.log('SNAPPY_LOCAL_PASS')
