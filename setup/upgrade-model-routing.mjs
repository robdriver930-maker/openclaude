/**
 * Upgrade 2: clean model routing + strongest local defaults.
 * - Retire 480b / glm-4.7 / glm-5 cloud tags
 * - Local power: qwen3.6-oc:27b (dense coding, num_ctx 65536 Modelfile)
 * - Local base: qwen3.6:27b (upstream tag)
 * - Local MoE alt: qwen3.6:35b (kept installed)
 * - Local coder specialist: qwen3-coder:30b
 * - Cloud (Ollama Pro): left as-is — kimi-k2.7-code:cloud / glm-5.2:cloud
 */
import fs from 'fs'
import path from 'path'

const user = process.env.USERPROFILE
const ocjPath = path.join(user, '.openclaude.json')
const settingsPath = path.join(user, '.openclaude', 'settings.json')

function readJson(p) {
  let r = fs.readFileSync(p, 'utf8')
  if (r.charCodeAt(0) === 0xfeff) r = r.slice(1)
  return JSON.parse(r)
}
function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 4) + '\n', 'utf8')
}

const LOCAL_POWER = 'qwen3.6-oc:27b'
const LOCAL_BASE = 'qwen3.6:27b'
const LOCAL_MOE = 'qwen3.6:35b'
const LOCAL_CODER = 'qwen3-coder:30b'
const CLOUD = 'kimi-k2.7-code:cloud'
const CLOUD_ALT = 'glm-5.2:cloud'
const FAST = 'qwen2.5-coder:7b'
const HARD_BUGS = 'devstral-small-2:latest'

const ocj = readJson(ocjPath)

ocj.providerProfiles = [
  {
    id: 'provider_local_power',
    name: 'Local Power (qwen3.6-oc 27b dense 64k) — best everyday local',
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: LOCAL_POWER,
  },
  {
    id: 'provider_local_moe',
    name: 'Local MoE (qwen3.6 35b) — fast alternate',
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: LOCAL_MOE,
  },
  {
    id: 'provider_coder_agent',
    name: 'Coder Specialist (qwen3-coder 30b)',
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: LOCAL_CODER,
  },
  {
    id: 'provider_swe_agent',
    name: 'Hard Bugs (devstral-small-2)',
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: HARD_BUGS,
  },
  {
    id: 'provider_fast_coder',
    name: 'Quick Edits (qwen2.5-coder 7b)',
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: FAST,
  },
  {
    id: 'provider_cloud_builder',
    name: 'Cloud Coding (kimi-k2.7-code / Ollama Pro)',
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: CLOUD,
  },
  {
    id: 'provider_cloud_reasoner',
    name: 'Cloud Long-horizon (glm-5.2 / Ollama Pro)',
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: CLOUD_ALT,
  },
]

ocj.activeProviderProfileId = 'provider_local_power'

ocj.agentModels = {
  [LOCAL_POWER]: { base_url: 'http://127.0.0.1:11434/v1', api_key: 'ollama' },
  [LOCAL_BASE]: { base_url: 'http://127.0.0.1:11434/v1', api_key: 'ollama' },
  [LOCAL_MOE]: { base_url: 'http://127.0.0.1:11434/v1', api_key: 'ollama' },
  [LOCAL_CODER]: { base_url: 'http://127.0.0.1:11434/v1', api_key: 'ollama' },
  [HARD_BUGS]: { base_url: 'http://127.0.0.1:11434/v1', api_key: 'ollama' },
  [FAST]: { base_url: 'http://127.0.0.1:11434/v1', api_key: 'ollama' },
  [CLOUD]: { base_url: 'http://127.0.0.1:11434/v1', api_key: 'ollama' },
  [CLOUD_ALT]: { base_url: 'http://127.0.0.1:11434/v1', api_key: 'ollama' },
  'glm-5.1:cloud': { base_url: 'http://127.0.0.1:11434/v1', api_key: 'ollama' },
  'qwen3.6:latest': { base_url: 'http://127.0.0.1:11434/v1', api_key: 'ollama' },
  'qwen3.6-oc:latest': { base_url: 'http://127.0.0.1:11434/v1', api_key: 'ollama' },
}

ocj.agentRouting = {
  Explore: FAST,
  Plan: LOCAL_POWER,
  'general-purpose': LOCAL_POWER,
  'frontend-dev': LOCAL_POWER,
  'code-fixer': LOCAL_CODER,
  'hard-code-fixer': HARD_BUGS,
  default: LOCAL_POWER,
}

writeJson(ocjPath, ocj)

const settings = readJson(settingsPath)
settings.model = LOCAL_POWER
settings.effortLevel = 'max'
settings.alwaysThinkingEnabled = true
if (!settings.env) settings.env = {}
settings.env.OPENCLAUDE_PERFORMANCE_MODE = 'max5090'
settings.env.OLLAMA_MAX_VRAM = '32768'
settings.env.OLLAMA_NUM_GPU = '1'

// Context windows map — keep useful tags, drop retired
let map = {}
try {
  map = JSON.parse(settings.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS || '{}')
} catch {
  map = {}
}
delete map['qwen3-coder:480b-cloud']
delete map['glm-4.7:cloud']
delete map['glm-5:cloud']
map[LOCAL_POWER] = 57344
map[LOCAL_BASE] = 57344
map[LOCAL_MOE] = 57344
map[LOCAL_CODER] = 57344
map[CLOUD] = 120000
map[CLOUD_ALT] = 120000
map['glm-5.1:cloud'] = 120000
map[FAST] = 57344
map[HARD_BUGS] = 57344
map['qwen3.6:latest'] = 57344
map['qwen3.6-oc:latest'] = 57344
settings.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS = JSON.stringify(map)

writeJson(settingsPath, settings)

console.log('OK routing')
console.log('activeProfile', ocj.activeProviderProfileId)
console.log('settings.model', settings.model)
console.log('effort', settings.effortLevel, 'thinking', settings.alwaysThinkingEnabled)
console.log('profiles', ocj.providerProfiles.map(p => p.model).join(', '))
