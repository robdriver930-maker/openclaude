/**
 * Step C — max local on RTX 5090 after Studio drivers.
 * 64k context, flash-attn ON, effort max. Still qwen3.6-oc:27b only (never bare 262k).
 * Cloud unchanged.
 */
import fs from 'fs'
import path from 'path'
import http from 'http'

const user = process.env.USERPROFILE
const settingsPath = path.join(user, '.openclaude', 'settings.json')
const ocjPath = path.join(user, '.openclaude.json')
const perfPath = path.join(user, '.openclaude', 'performance-mode.json')

const LOCAL = 'qwen3.6-oc:27b'
const CTX = 65536
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
  OPENCLAUDE_PERFORMANCE_MODE: 'max5090',
  OLLAMA_NUM_GPU: '1',
  OLLAMA_FLASH_ATTENTION: '1',
  OLLAMA_MAX_VRAM: '30720',
  OLLAMA_KEEP_ALIVE: '30m',
  OLLAMA_NUM_THREAD: '24',
  OLLAMA_NUM_PARALLEL: '1',
  OLLAMA_MAX_LOADED_MODELS: '1',
  OLLAMA_CONTEXT_LENGTH: String(CTX),
  CLAUDE_CODE_OPENAI_FALLBACK_CONTEXT_WINDOW: '57344',
  CLAUDE_CODE_AUTO_COMPACT_WINDOW: '53248',
  CLAUDE_CODE_MAX_OUTPUT_TOKENS: '8192',
  CLAUDE_STREAM_IDLE_TIMEOUT_MS: '300000',
  API_TIMEOUT_MS: '900000',
  OPENCLAUDE_MAX_RETRIES: '10',
  CLAUDE_ENABLE_STREAM_WATCHDOG: '1',
  CLAUDE_CODE_NO_FLICKER: '1',
  OPENCLAUDE_DISABLE_TOOL_REMINDERS: '1',
})
delete settings.env.OLLAMA_KV_CACHE_TYPE

const map = {
  [LOCAL]: CTX,
  'qwen3.6:27b': CTX,
  'qwen3.6:35b': 32768,
  'qwen3.6:latest': CTX,
  'qwen3.6-oc:latest': CTX,
  'qwen3-coder:30b': 32768,
  'qwen2.5-coder:7b': 16384,
  'devstral-small-2:latest': 32768,
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
      name: 'Local Power (qwen3.6-oc 27b Step C 64k max)',
      provider: 'ollama',
      baseUrl: 'http://127.0.0.1:11434/v1',
      model: LOCAL,
    }
  }
  return p
})
if (!ocj.agentModels) ocj.agentModels = {}
ocj.agentModels[LOCAL] = { base_url: 'http://127.0.0.1:11434/v1', api_key: 'ollama' }
if (!ocj.agentRouting) ocj.agentRouting = {}
for (const k of ['Plan', 'general-purpose', 'frontend-dev', 'default']) {
  ocj.agentRouting[k] = LOCAL
}
writeJson(ocjPath, ocj)

writeJson(perfPath, {
  mode: 'max',
  hardware: 'Intel i9-14900KS | 64 GB RAM | RTX 5090 | MSI MS-7D85 | Win 11 Pro',
  tier: '5090-stepC',
  applied: new Date().toISOString().slice(0, 16).replace('T', ' '),
  localModel: LOCAL,
  ollama: {
    OLLAMA_NUM_GPU: '1',
    OLLAMA_FLASH_ATTENTION: '1',
    OLLAMA_MAX_VRAM: '30720',
    OLLAMA_CONTEXT_LENGTH: String(CTX),
    OLLAMA_KEEP_ALIVE: '30m',
    OLLAMA_NUM_PARALLEL: '1',
    OLLAMA_MAX_LOADED_MODELS: '1',
    OLLAMA_NUM_THREAD: '24',
  },
  notes:
    'Step C: 64k + flash-attn ON after Studio drivers. Still oc:27b hard-cap (never bare 262k). Quit Ollama tray once after apply. If green-screen returns, run setup/stable-5090.mjs.',
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
console.log('OK step-C max5090')
console.log('model', LOCAL)
console.log('ctx', CTX, 'flash 1', 'effort max')
console.log('cloud_untouched', CLOUD_KEEP)
console.log('has_model', names.includes(LOCAL))
