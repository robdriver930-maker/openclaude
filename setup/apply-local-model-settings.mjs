/**
 * Canonical OpenClaude local MAX settings (qwen3.8-oc-code:27b @ 160k).
 *
 *   node setup/apply-local-model-settings.mjs
 *   node setup/apply-local-model-settings.mjs --permissions-only
 *
 * Used by run.bat and max-local-connected.mjs — single source of truth.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { applyTtsHooks } from './install-tts-hooks.mjs'

export const LOCAL_MODEL = 'qwen3.8-oc-code:27b'
export const OLLAMA_BASE = 'http://127.0.0.1:11434/v1'
export const OLLAMA_HOST = '127.0.0.1:11434'
export const CTX = 163840
export const FALLBACK_CTX = 153600
export const AUTO_COMPACT = 143360

const user = process.env.USERPROFILE
const settingsPath = path.join(user, '.openclaude', 'settings.json')
const ocjPath = path.join(user, '.openclaude.json')

function readJson(p) {
  let r = fs.readFileSync(p, 'utf8')
  if (r.charCodeAt(0) === 0xfeff) r = r.slice(1)
  return JSON.parse(r)
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 4) + '\n', 'utf8')
}

export function contextWindowsMap() {
  return {
    [LOCAL_MODEL]: CTX,
    'qwen3.8:27b': CTX,
    'qwen3.8:latest': CTX,
    'qwen3.8:27b-mtp-q8_0': CTX,
    'qwen3.8:27b-q8_0': CTX,
    'qwen3.6-oc-code:27b': CTX,
    'qwen3.6:27b': CTX,
    'qwen3.6:latest': CTX,
    'qwen3-coder:30b': 32768,
    'qwen2.5-coder:7b': 16384,
    'devstral-small-2:latest': 32768,
    'kimi-k2.7-code:cloud': 120000,
    'kimi-k3:cloud': 131072,
    'glm-5.2:cloud': 120000,
  }
}

export function applyLocalPermissions(settings) {
  settings.permissions = settings.permissions || {}
  const allow = new Set(settings.permissions.allow || [])
  allow.add('Agent')
  allow.add('Skill')
  allow.add('Delete')
  allow.add('PowerShell')
  allow.add('WebSearch')
  allow.add('WebFetch')
  settings.permissions.allow = [...allow]

  const freeze = [
    'TaskCreate',
    'TaskUpdate',
    'TaskList',
    'TaskGet',
    'TaskStop',
    'TaskOutput',
    'TodoWrite',
    // Daily MAX: a job is already authorisation. Do not ask Robert to enter plan mode.
    'EnterPlanMode',
  ]
  const deny = new Set((settings.permissions.deny || []).filter(x => x !== 'Task'))
  for (const x of freeze) deny.add(x)
  settings.permissions.deny = [...deny]

  const extra = new Set(settings.permissions.additionalDirectories || [])
  extra.add(path.join(user, 'Desktop'))
  settings.permissions.additionalDirectories = [...extra]

  return settings
}

export function applyThinkingMax(settings) {
  settings.effortLevel = 'max'
  settings.alwaysThinkingEnabled = true
  settings.env = settings.env || {}
  settings.env.CLAUDE_CODE_EFFORT_LEVEL = 'max'
  delete settings.env.CLAUDE_CODE_DISABLE_THINKING
  return settings
}

export function applyLocalModelSettings({ parkMcps = false, permissions = true } = {}) {
  const settings = readJson(settingsPath)
  const keepTavily = settings.env?.TAVILY_API_KEY
  const keepSearch = settings.env?.WEB_SEARCH_PROVIDER || 'auto'
  const keepPerms = settings.permissions

  if (parkMcps && settings.mcpServers && Object.keys(settings.mcpServers).length) {
    const backup = path.join(user, '.openclaude', 'mcpServers.backup-speed.json')
    writeJson(backup, {
      parkedAt: new Date().toISOString(),
      reason: 'apply-local-model-settings parked MCPs for MAX stability',
      mcpServers: settings.mcpServers,
    })
    settings.mcpServers = {}
  }

  settings.model = LOCAL_MODEL
  applyThinkingMax(settings)
  settings.enabledPlugins = {}
  delete settings.statusLine
  applyTtsHooks(settings)

  settings.env = {
    ...(settings.env || {}),
    CLAUDE_CODE_USE_OPENAI: '1',
    OPENAI_BASE_URL: OLLAMA_BASE,
    OPENAI_API_KEY: 'ollama',
    OPENAI_MODEL: LOCAL_MODEL,
    OLLAMA_HOST: OLLAMA_HOST,
    OLLAMA_NUM_GPU: '1',
    OLLAMA_FLASH_ATTENTION: '1',
    OLLAMA_CONTEXT_LENGTH: String(CTX),
    OLLAMA_MAX_VRAM: '32768',
    OLLAMA_KEEP_ALIVE: '120m',
    OLLAMA_NUM_PARALLEL: '1',
    OLLAMA_MAX_LOADED_MODELS: '1',
    OLLAMA_NUM_THREAD: '24',
    OPENCLAUDE_PERFORMANCE_MODE: 'max5090',
    CLAUDE_CODE_NO_FLICKER: '0',
    CLAUDE_CODE_DISABLE_MOUSE: '1',
    CLAUDE_CODE_DISABLE_MOUSE_CLICKS: '1',
    CLAUDE_STREAM_IDLE_TIMEOUT_MS: '300000',
    CLAUDE_CODE_OPENAI_FALLBACK_CONTEXT_WINDOW: String(FALLBACK_CTX),
    CLAUDE_CODE_AUTO_COMPACT_WINDOW: String(AUTO_COMPACT),
    CLAUDE_CODE_MAX_OUTPUT_TOKENS: '65536',
    API_TIMEOUT_MS: '900000',
    OPENCLAUDE_MAX_RETRIES: '10',
    OPENCLAUDE_AUTOCOMPACT_FAILURE_COOLDOWN_MS: '30000',
    CLAUDE_ENABLE_STREAM_WATCHDOG: '1',
    USE_BUILTIN_RIPGREP: '0',
    CLAUDE_CODE_USE_POWERSHELL_TOOL: '1',
    OPENCLAUDE_DISABLE_TOOL_REMINDERS: '1',
    WEB_SEARCH_PROVIDER: keepSearch,
    CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS: JSON.stringify(contextWindowsMap()),
  }
  delete settings.env.OPENCLAUDE_TTS
  if (keepTavily) settings.env.TAVILY_API_KEY = keepTavily

  if (permissions) applyLocalPermissions(settings)
  else if (keepPerms) settings.permissions = keepPerms

  // One memory folder for every chat on this PC (not per-folder).
  settings.autoMemoryEnabled = true
  settings.autoMemoryDirectory = path.join(user, '.openclaude', 'memory')

  writeJson(settingsPath, settings)
  return settings
}

export function applyLocalProviderProfile() {
  if (!fs.existsSync(ocjPath)) return null
  const ocj = readJson(ocjPath)
  ocj.activeProviderProfileId = 'provider_local_power'
  ocj.providerProfiles = (ocj.providerProfiles || []).map(p => {
    if (p.id === 'provider_local_power') {
      return {
        ...p,
        name: 'Ollama Local (qwen3.8-oc-code:27b MAX)',
        provider: 'ollama',
        baseUrl: OLLAMA_BASE,
        model: LOCAL_MODEL,
      }
    }
    return p
  })
  ocj.agentModels = {
    ...(ocj.agentModels || {}),
    [LOCAL_MODEL]: { base_url: OLLAMA_BASE, api_key: 'ollama' },
  }
  ocj.agentRouting = {
    Explore: LOCAL_MODEL,
    Plan: LOCAL_MODEL,
    'general-purpose': LOCAL_MODEL,
    'frontend-dev': LOCAL_MODEL,
    'code-fixer': LOCAL_MODEL,
    'hard-code-fixer': LOCAL_MODEL,
    default: LOCAL_MODEL,
  }
  writeJson(ocjPath, ocj)
  return ocj
}

export function applyThinkingMaxAllProfiles() {
  const paths = [
    settingsPath,
    path.join(user, '.openclaude-profiles', 'coder', 'settings.json'),
    path.join(user, '.openclaude-profiles', 'software-ai', 'settings.json'),
    path.join(user, '.openclaude-profiles', 'websites', 'settings.json'),
    path.join(user, '.openclaude-profiles', 'goldenboy', 'settings.json'),
  ]
  const updated = []
  for (const p of paths) {
    if (!fs.existsSync(p)) continue
    const s = readJson(p)
    applyThinkingMax(s)
    writeJson(p, s)
    updated.push(p)
    console.log('[OK]', p, 'effort=max alwaysThinkingEnabled=true')
  }
  return updated
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const permissionsOnly = process.argv.includes('--permissions-only')
  const allProfiles = process.argv.includes('--all-profiles')
  if (permissionsOnly) {
    const s = readJson(settingsPath)
    applyLocalPermissions(s)
    writeJson(settingsPath, s)
    console.log('[OK] permissions: Agent army on, TodoWrite/Task*/EnterPlanMode denied, Desktop allowed')
  } else if (allProfiles) {
    applyThinkingMaxAllProfiles()
    applyLocalModelSettings({ parkMcps: false, permissions: false })
    console.log('[OK] thinking=max on all profile settings + main local MAX refreshed')
  } else {
    applyLocalModelSettings({ parkMcps: process.argv.includes('--park-mcps'), permissions: true })
    applyLocalProviderProfile()
    console.log(`[OK] settings: ${LOCAL_MODEL} effort=max think=max official-qwen38-sampling ${CTX} tts-hooks=on flash-attn=1`)
  }
}
