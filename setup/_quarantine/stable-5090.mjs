/**
 * stable5090 — one locked local profile for smooth RTX 5090 use.
 * Caps context, kills VRAM thrash, keeps flash-attn off.
 * Cloud tags unchanged.
 */
import fs from 'fs'
import path from 'path'
import http from 'http'

const user = process.env.USERPROFILE
const settingsPath = path.join(user, '.openclaude', 'settings.json')
const ocjPath = path.join(user, '.openclaude.json')
const perfPath = path.join(user, '.openclaude', 'performance-mode.json')

const LOCAL = 'qwen3.6-oc:27b'
const CTX = 24576
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
  OPENAI_MODEL: LOCAL,
  OPENCLAUDE_PERFORMANCE_MODE: 'stable5090',
  OLLAMA_NUM_GPU: '1',
  OLLAMA_FLASH_ATTENTION: '0',
  OLLAMA_MAX_VRAM: '24576',
  OLLAMA_KEEP_ALIVE: '10m',
  OLLAMA_NUM_THREAD: '16',
  OLLAMA_NUM_PARALLEL: '1',
  OLLAMA_MAX_LOADED_MODELS: '1',
  OLLAMA_CONTEXT_LENGTH: String(CTX),
  CLAUDE_CODE_OPENAI_FALLBACK_CONTEXT_WINDOW: '22000',
  CLAUDE_CODE_AUTO_COMPACT_WINDOW: '20000',
  CLAUDE_CODE_MAX_OUTPUT_TOKENS: '6144',
  CLAUDE_STREAM_IDLE_TIMEOUT_MS: '240000',
  API_TIMEOUT_MS: '600000',
  OPENCLAUDE_MAX_RETRIES: '8',
  CLAUDE_ENABLE_STREAM_WATCHDOG: '1',
  CLAUDE_CODE_NO_FLICKER: '1',
  OPENCLAUDE_DISABLE_TOOL_REMINDERS: '1',
})
delete settings.env.OLLAMA_KV_CACHE_TYPE

// Cap declared windows so OpenClaude never asks Ollama for 57k/262k locally
const map = {
  [LOCAL]: CTX,
  'qwen3.6:27b': CTX,
  'qwen3.6:35b': CTX,
  'qwen3.6:latest': CTX,
  'qwen3.6-oc:latest': CTX,
  'qwen3-coder:30b': CTX,
  'qwen2.5-coder:7b': 16384,
  'devstral-small-2:latest': CTX,
  [CLOUD_KEEP]: 120000,
  'glm-5.2:cloud': 120000,
  'glm-5.1:cloud': 120000,
}
settings.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS = JSON.stringify(map)
writeJson(settingsPath, settings)

const ocj = readJson(ocjPath)
ocj.activeProviderProfileId = 'provider_local_power'
ocj.providerProfiles = (ocj.providerProfiles || []).map(p => {
  if (p.id === 'provider_local_power') {
    return {
      ...p,
      name: 'Local Power (qwen3.6-oc 27b stable5090)',
      provider: 'ollama',
      baseUrl: 'http://127.0.0.1:11434/v1',
      model: LOCAL,
    }
  }
  return p
})
if (!ocj.agentModels) ocj.agentModels = {}
ocj.agentModels[LOCAL] = { base_url: 'http://127.0.0.1:11434/v1', api_key: 'ollama' }
// Prevent agent routing from pulling base 27b / huge windows
if (!ocj.agentRouting) ocj.agentRouting = {}
for (const k of ['Plan', 'general-purpose', 'frontend-dev', 'default']) {
  ocj.agentRouting[k] = LOCAL
}
ocj.agentRouting.Explore = 'qwen2.5-coder:7b'
ocj.agentRouting['code-fixer'] = 'qwen3-coder:30b'
writeJson(ocjPath, ocj)

writeJson(perfPath, {
  mode: 'stable',
  hardware: 'Intel i9-14900KS | 64 GB RAM | RTX 5090 | MSI MS-7D85 | Win 11 Pro',
  tier: '5090-stable',
  applied: new Date().toISOString().slice(0, 16).replace('T', ' '),
  localModel: LOCAL,
  ollama: {
    OLLAMA_NUM_GPU: '1',
    OLLAMA_FLASH_ATTENTION: '0',
    OLLAMA_MAX_VRAM: '24576',
    OLLAMA_CONTEXT_LENGTH: String(CTX),
    OLLAMA_KEEP_ALIVE: '10m',
    OLLAMA_NUM_PARALLEL: '1',
    OLLAMA_MAX_LOADED_MODELS: '1',
    OLLAMA_NUM_THREAD: '16',
  },
  notes:
    'stable5090: 24k hard-cap, flash off, VRAM headroom, flicker off. Never use bare qwen3.6:27b (262k). Cloud unchanged.',
})

function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    http
      .get({ hostname: '127.0.0.1', port: 11434, path: urlPath, timeout: 10000 }, res => {
        let d = ''
        res.on('data', c => (d += c))
        res.on('end', () => resolve(d))
      })
      .on('error', reject)
  })
}

const tags = JSON.parse(await httpGet('/api/tags'))
const names = (tags.models || []).map(m => m.name)
console.log('OK stable5090')
console.log('model', LOCAL)
console.log('ctx', CTX, 'flash 0', 'vramCap 24576')
console.log('effort max thinking true flicker 1')
console.log('cloud_untouched', CLOUD_KEEP)
console.log('has_model', names.includes(LOCAL))
