/**
 * Harden local qwen3.6:27b for max thinking + max GPU work.
 * Does NOT change cloud model tags.
 */
import fs from 'fs'
import path from 'path'
import http from 'http'

const user = process.env.USERPROFILE
const settingsPath = path.join(user, '.openclaude', 'settings.json')
const ocjPath = path.join(user, '.openclaude.json')
const perfPath = path.join(user, '.openclaude', 'performance-mode.json')

const LOCAL = 'qwen3.6-oc:27b'
const LOCAL_BASE = 'qwen3.6:27b'
const CLOUD_KEEP = 'kimi-k2.7-code:cloud'

function readJson(p) {
  let r = fs.readFileSync(p, 'utf8')
  if (r.charCodeAt(0) === 0xfeff) r = r.slice(1)
  return JSON.parse(r)
}
function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 4) + '\n', 'utf8')
}

const settings = readJson(settingsPath)
settings.model = LOCAL
settings.effortLevel = 'max'
settings.alwaysThinkingEnabled = true
if (!settings.env) settings.env = {}

Object.assign(settings.env, {
  CLAUDE_CODE_USE_OPENAI: '1',
  OPENAI_BASE_URL: 'http://127.0.0.1:11434/v1',
  OPENAI_API_KEY: 'ollama',
  OPENCLAUDE_PERFORMANCE_MODE: 'max5090',
  OLLAMA_MAX_VRAM: '32768',
  OLLAMA_NUM_GPU: '1',
  OLLAMA_FLASH_ATTENTION: '1',
  OLLAMA_KV_CACHE_TYPE: 'q8_0',
  OLLAMA_KEEP_ALIVE: '240m',
  OLLAMA_NUM_THREAD: '24',
  // Prefer one heavy local session using full GPU/context
  OLLAMA_NUM_PARALLEL: '1',
  OLLAMA_MAX_LOADED_MODELS: '2',
  OLLAMA_CONTEXT_LENGTH: '65536',
  CLAUDE_CODE_OPENAI_FALLBACK_CONTEXT_WINDOW: '57344',
  CLAUDE_CODE_AUTO_COMPACT_WINDOW: '57344',
  CLAUDE_CODE_MAX_OUTPUT_TOKENS: '16384',
  CLAUDE_STREAM_IDLE_TIMEOUT_MS: '300000',
  API_TIMEOUT_MS: '900000',
  OPENCLAUDE_MAX_RETRIES: '15',
  CLAUDE_ENABLE_STREAM_WATCHDOG: '1',
})

let map = {}
try {
  map = JSON.parse(settings.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS || '{}')
} catch {
  map = {}
}
map[LOCAL] = 57344
map[LOCAL_BASE] = 57344
map['qwen3.6:35b'] = 57344
map['qwen3-coder:30b'] = 57344
map[CLOUD_KEEP] = map[CLOUD_KEEP] || 120000
settings.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS = JSON.stringify(map)

writeJson(settingsPath, settings)

const ocj = readJson(ocjPath)
const local = ocj.providerProfiles?.find(p => p.id === 'provider_local_power')
if (local) {
  local.model = LOCAL
  local.name = 'Local Power (qwen3.6-oc 27b dense, 64k) — max GPU'
}
ocj.activeProviderProfileId = 'provider_local_power'
if (!ocj.agentModels) ocj.agentModels = {}
ocj.agentModels[LOCAL] = { base_url: 'http://127.0.0.1:11434/v1', api_key: 'ollama' }
if (ocj.agentRouting) {
  for (const k of ['Plan', 'general-purpose', 'frontend-dev', 'default']) {
    if (ocj.agentRouting[k]) ocj.agentRouting[k] = LOCAL
  }
}
// Cloud left untouched
const cloud = ocj.providerProfiles?.find(p => p.id === 'provider_cloud_builder')
writeJson(ocjPath, ocj)

const perf = {
  mode: 'max',
  hardware: 'Intel i9-14900KS | 64 GB RAM | RTX 5090 | MSI MS-7D85 | Win 11 Pro',
  tier: '5090-max',
  applied: new Date().toISOString().slice(0, 16).replace('T', ' '),
  localModel: LOCAL,
  ollama: {
    OLLAMA_NUM_PARALLEL: '1',
    OLLAMA_KV_CACHE_TYPE: 'q8_0',
    OLLAMA_MAX_VRAM: '32768',
    OLLAMA_FLASH_ATTENTION: '1',
    OLLAMA_KEEP_ALIVE: '240m',
    OLLAMA_NUM_THREAD: '24',
    OLLAMA_MAX_LOADED_MODELS: '2',
    OLLAMA_CONTEXT_LENGTH: '65536',
    OLLAMA_NUM_GPU: '1',
  },
  notes: 'Local 27b dense: parallel=1 for max VRAM/context. Cloud tags unchanged. Restart OpenClaude after apply.',
}
writeJson(perfPath, perf)

function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port: 11434, path: urlPath, timeout: 10000 }, res => {
      let d = ''
      res.on('data', c => (d += c))
      res.on('end', () => resolve({ status: res.statusCode, body: d }))
    }).on('error', reject)
  })
}

const tags = JSON.parse((await httpGet('/api/tags')).body)
const names = (tags.models || []).map(m => m.name)
const hasLocal = names.includes(LOCAL)
const hasBase = names.includes(LOCAL_BASE)

console.log('OK harden-local-27b')
console.log('settings.model', settings.model)
console.log('effort', settings.effortLevel, 'thinking', settings.alwaysThinkingEnabled)
console.log('ctx', settings.env.OLLAMA_CONTEXT_LENGTH, 'parallel', settings.env.OLLAMA_NUM_PARALLEL)
console.log('cloud_untouched', cloud?.model)
console.log('ollama_has', LOCAL, hasLocal, 'base', hasBase)
console.log('mcpServers', Object.keys(settings.mcpServers || {}).length)
