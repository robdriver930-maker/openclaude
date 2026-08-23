/**
 * SAFE local profile after GPU green-screen.
 * Keeps qwen3.6-oc:27b + effort/thinking max, but lowers VRAM stress.
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
  OPENCLAUDE_PERFORMANCE_MODE: 'safe5090',
  OLLAMA_MAX_VRAM: '28672',
  OLLAMA_NUM_GPU: '1',
  // Flash-attn + huge KV was a likely green-screen trigger on this driver stack
  OLLAMA_FLASH_ATTENTION: '0',
  OLLAMA_KEEP_ALIVE: '60m',
  OLLAMA_NUM_THREAD: '16',
  OLLAMA_NUM_PARALLEL: '1',
  OLLAMA_MAX_LOADED_MODELS: '1',
  OLLAMA_CONTEXT_LENGTH: '24576',
  CLAUDE_CODE_OPENAI_FALLBACK_CONTEXT_WINDOW: '22000',
  CLAUDE_CODE_AUTO_COMPACT_WINDOW: '22000',
  CLAUDE_CODE_MAX_OUTPUT_TOKENS: '8192',
  CLAUDE_STREAM_IDLE_TIMEOUT_MS: '300000',
  API_TIMEOUT_MS: '900000',
  OPENCLAUDE_MAX_RETRIES: '12',
  CLAUDE_ENABLE_STREAM_WATCHDOG: '1',
})
delete settings.env.OLLAMA_KV_CACHE_TYPE

let map = {}
try {
  map = JSON.parse(settings.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS || '{}')
} catch {
  map = {}
}
map[LOCAL] = 24576
map[LOCAL_BASE] = 24576
map['qwen3.6:35b'] = 24576
map['qwen3-coder:30b'] = 24576
map[CLOUD_KEEP] = map[CLOUD_KEEP] || 120000
settings.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS = JSON.stringify(map)

writeJson(settingsPath, settings)

const ocj = readJson(ocjPath)
const local = ocj.providerProfiles?.find(p => p.id === 'provider_local_power')
if (local) {
  local.model = LOCAL
  local.name = 'Local Power (qwen3.6-oc 27b SAFE 24k)'
}
ocj.activeProviderProfileId = 'provider_local_power'
if (!ocj.agentModels) ocj.agentModels = {}
ocj.agentModels[LOCAL] = { base_url: 'http://127.0.0.1:11434/v1', api_key: 'ollama' }
if (ocj.agentRouting) {
  for (const k of ['Plan', 'general-purpose', 'frontend-dev', 'default']) {
    if (ocj.agentRouting[k]) ocj.agentRouting[k] = LOCAL
  }
}
writeJson(ocjPath, ocj)

writeJson(perfPath, {
  mode: 'safe',
  hardware: 'Intel i9-14900KS | 64 GB RAM | RTX 5090 | MSI MS-7D85 | Win 11 Pro',
  tier: '5090-safe',
  applied: new Date().toISOString().slice(0, 16).replace('T', ' '),
  localModel: LOCAL,
  ollama: {
    OLLAMA_NUM_PARALLEL: '1',
    OLLAMA_MAX_VRAM: '28672',
    OLLAMA_FLASH_ATTENTION: '0',
    OLLAMA_KEEP_ALIVE: '60m',
    OLLAMA_NUM_THREAD: '16',
    OLLAMA_MAX_LOADED_MODELS: '1',
    OLLAMA_CONTEXT_LENGTH: '24576',
    OLLAMA_NUM_GPU: '1',
  },
  notes:
    'SAFE after green-screen: 24k ctx, flash-attn off, no q8 KV, no launch warm. Cloud unchanged. Update GPU drivers if crashes continue.',
})

function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    http
      .get({ hostname: '127.0.0.1', port: 11434, path: urlPath, timeout: 10000 }, res => {
        let d = ''
        res.on('data', c => (d += c))
        res.on('end', () => resolve({ status: res.statusCode, body: d }))
      })
      .on('error', reject)
  })
}

const tags = JSON.parse((await httpGet('/api/tags')).body)
const names = (tags.models || []).map(m => m.name)

console.log('OK harden-local-SAFE')
console.log('settings.model', settings.model)
console.log('effort', settings.effortLevel, 'thinking', settings.alwaysThinkingEnabled)
console.log('ctx', settings.env.OLLAMA_CONTEXT_LENGTH, 'flash', settings.env.OLLAMA_FLASH_ATTENTION)
console.log('mode', settings.env.OPENCLAUDE_PERFORMANCE_MODE)
console.log('cloud_untouched', CLOUD_KEEP)
console.log('ollama_has_local', names.includes(LOCAL))
