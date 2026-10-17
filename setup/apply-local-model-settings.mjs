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
import { fetchAllModelFacts, honestMapFromRows } from './context-targets.mjs'

export const LOCAL_MODEL = 'qwen3.8-oc-code:27b'
export const OLLAMA_BASE = 'http://127.0.0.1:11434/v1'
export const OLLAMA_HOST = '127.0.0.1:11434'
export const CTX = 163840
export const FALLBACK_CTX = 153600
export const AUTO_COMPACT = 143360

// Headroom between a model's honest context window (map value) and its
// auto-compact cap. The compact summary itself needs room (p99.99 ≈ 17.4k);
// 10k keeps the compaction request comfortably under the hard window while
// never compacting more than ~6% early on a 163k model.
export const AUTO_COMPACT_GAP = 10000

// Build the per-model auto-compact cap table from the honest context map.
// Each model caps at (its own map value - AUTO_COMPACT_GAP); unlisted models
// fall back to '*' = the legacy global AUTO_COMPACT value.
export function buildAutoCompactCapTable(map, fallback) {
  const table = { '*': fallback }
  for (const [model, window] of Object.entries(map || {})) {
    if (typeof window === 'number' && Number.isFinite(window) && window > AUTO_COMPACT_GAP) {
      table[model] = window - AUTO_COMPACT_GAP
    }
  }
  return table
}

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
    // The daily-tagged local build — same weights as LOCAL_MODEL. Was missing,
    // so launching --model qwen3.8-oc-code:27b got the 32k fallback context.
    'qwen3.8-oc-code:27b': CTX,
    'qwen3.8:27b': CTX,
    'qwen3.8:latest': CTX,
    'qwen3.8:27b-mtp-q8_0': CTX,
    'qwen3.8:27b-q8_0': CTX,
    'qwen3.6-oc-code:27b': CTX,
    'qwen3.6:27b': CTX,
    'qwen3.6:latest': CTX,
    'bts-windows-repair:27b': CTX,
    'qwen3-coder:30b': 131072, // native 262144; 131k keeps KV cache comfortable on RTX 5090 32GB
    'devstral-small-2:latest': 32768,
    // Cloud proxy models — use honest min(native_context, ENV_DEFAULT_CTX)
    // ENV_DEFAULT_CTX = 163840 (OLLAMA_CONTEXT_LENGTH server default).
    // Never exceed what Ollama will actually serve.
    // Cloud proxy models — Pro tier (verified 2026-09-23): context is
    // upstream-controlled, and /api/chat accepts num_ctx = full native on the
    // Pro account (kimi-k3 + glm-5.3-flash replied OK at 1048576). Map the
    // FULL native window; no free-tier cap anymore.
    'kimi-k2.7-code:cloud': 262144,       // native 262144
    'kimi-k3:cloud': 1048576,             // native 1048576 (Pro verified)
    'glm-5.1:cloud': 202752,              // native 202752
    'glm-5.3-flash:cloud': 1048576,       // native 1048576 (Pro verified)
    'minimax-m3:cloud': 512000,           // native 512000
    'deepseek-v4.1-flash:cloud': 1048576, // native 1048576 (Pro verified)
    'deepseek-v4-pro:cloud': 1048576,     // native 1048576 (Pro verified)
    'gpt-oss:20b-cloud': 131072,          // native 131072 → exact
    'gemma4:31b-cloud': 262144,           // native 262144
    // Legacy :latest-cloud aliases (same upstream targets as their :cloud twins)
    'kimi-k2.7-code:latest-cloud': 262144,
    'minimax-m3:latest-cloud': 512000,
    'glm-5.1:latest-cloud': 202752,
    // Legacy cloud models (retired or low-context)
    'glm-5.2:cloud': 65536,
    'nemotron3:33b': 32768,
    'qwen3.5:35b': 32768,
    'qwen3.6:35b': 32768,
    'qwen3.8:latest': CTX,
    'qwen3-coder:latest': 32768,
    'qwen2.5-coder:7b': 32768,
    'deepseek-coder-v2-instruct:latest': 32768,
    'deepseek-r1:latest': 32768,
    'gemma4:26b': 65536,
    'dna5rm/qwen3.8:27b-128k': CTX,
    'n0404n0404/heretic-distill:27b-tuned': 32768,
    'glm-4.7-flash:latest': 65536,
    'n0404n0404/qwen3.6-finetune-qwen3.8-max-glm5.2-kimi-k3-distillation-a56-1168cb-heretic:q6_k': 32768,
    // Full coverage: every model in `ollama list` (generated 2026-09-05 from /api/tags)
    'BT-Ad-Art-Director:latest': 32768,
    'BT-Ad-Prompt-Writer:latest': 32768,
    'BT-Ad-Storyboard:latest': 32768,
    'BT-Admin-Clerk:latest': 32768,
    'BT-Agent-Tools:latest': 32768,
    'BT-Balanced-Chat:latest': 32768,
    'BT-Big-Brain:latest': 32768,
    'BT-Bug-Hunter:latest': 32768,
    'BT-Client-Quotes:latest': 32768,
    'BT-Cloud-Coder:latest': 131072,
    'BT-Cloud-GLM:latest': 131072,
    // BT-Cloud-GPT-OSS is an Ollama cloud proxy (gpt-oss:20b-cloud): 65536
    'BT-Cloud-GPT-OSS:latest': 65536,
    'BT-Cloud-General:latest': 131072,
    'BT-Cloud-Kimi-Code:latest': 131072,
    'BT-Cloud-MiniMax:latest': 131072,

    'BT-Code-Fast:latest': 32768,
    'BT-Code-Forge:latest': 32768,
    'BT-Code-OC:latest': 32768,
    'BT-Code-Spec:latest': 32768,
    'BT-Command-R7B:latest': 32768,
    'BT-Competitor-Scout:latest': 32768,
    'BT-Content-Calendar:latest': 32768,
    'BT-Daily-HQ:latest': 32768,
    'BT-Daily-Standup:latest': 32768,
    'BT-Deep-Think:latest': 32768,
    'BT-Deepseek-Coder-V2:latest': 32768,
    'BT-Doc-Writer:latest': 32768,
    'BT-Embed-BGE:latest': 8192,
    'BT-Embed-Docs:latest': 8192,
    'BT-Embed-Large:latest': 8192,
    'BT-Fast-Chat:latest': 32768,
    'BT-Gemma-26B:latest': 65536,
    'BT-Gemma3-12B:latest': 32768,
    'BT-General-27B:latest': 163840,
    'BT-General-Max:latest': 32768,
    'BT-General-OC:latest': 32768,
    'BT-Granite-8B:latest': 32768,
    'BT-Inbox-Replier:latest': 32768,
    'BT-Llama31-8B:latest': 32768,
    'BT-Local-AI-Coach:latest': 32768,
    'BT-Mistral-Nemo:latest': 32768,
    'BT-Moondream:latest': 8192,
    'BT-Offer-Builder:latest': 32768,
    'BT-Onboard-Client:latest': 32768,
    'BT-Ops-Commander:latest': 32768,
    'BT-Phi3-Light:latest': 32768,
    'BT-Phi4-Smart:latest': 32768,
    'BT-Plan-Builder:latest': 32768,
    'BT-PowerShell-Pro:latest': 32768,
    'BT-Quick-Rewrite:latest': 32768,
    'BT-QwQ-Reason:latest': 32768,
    'BT-Qwen25-14B:latest': 65536,
    'BT-Reputation:latest': 32768,
    'BT-Risk-Checker:latest': 32768,
    'BT-SEO-Local:latest': 32768,
    'BT-Sales-Closer:latest': 32768,
    'BT-Screenshot-Reader:latest': 32768,
    'BT-Social-Poster:latest': 32768,
    'BT-StarCoder2:latest': 32768,
    'BT-Support-Triage:latest': 32768,
    'BT-Think-Light:latest': 32768,
    'BT-Tiny-Utility:latest': 32768,
    'BT-Vision-Desk:latest': 32768,
    'BT-Vision-Llava:latest': 32768,
    'BT-Website-Copy:latest': 32768,
    'BT-Windows-IT:latest': 32768,
    'bge-m3:latest': 8192,
    'bts-ad-director:latest': 32768,
    'cieloforge/deepseek-coder-6.7b-spec:latest': 32768,
    'command-r7b:latest': 32768,
    'deepseek-coder-v2-instruct:latest': 32768,
    'deepseek-coder-v2:16b': 65536,
    'deepseek-coder-v2:16b-lite-instruct-q4_K_M': 65536,
    'deepseek-r1:70b': 131072,
    'deepseek-r1:latest': 32768,
    'gemma3:12b': 32768,
    'gemma4:26b': 65536,
    'granite3.3:8b': 32768,
    'llama3.1:8b': 32768,
    'llama3.2:latest': 32768,
    'llama3.3:70b': 131072,
    'llava:13b': 32768,
    'mistral-nemo:latest': 32768,
    'moondream:latest': 8192,
    'mxbai-embed-large:latest': 8192,
    'nomic-embed-text:latest': 8192,
    'phi3:latest': 32768,
    'phi4:latest': 32768,
    'qwen2.5-coder:32b': 32768,
    'qwen2.5-coder:3b': 32768,
    'qwen2.5:14b': 65536,
    'qwen2.5vl:7b': 32768,
    'qwen3-coder:latest': 32768,
    'qwen3.6-oc:27b': 163840,
    'qwq:32b': 163840,
    'robert-dev:27b': 163840,
    'starcoder2:15b': 65536,
    'tinyllama:latest': 32768,
    'uncensored:latest': 32768,
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
  // UI runtime state uses thinkingEnabled, not alwaysThinkingEnabled alone
  settings.thinkingEnabled = true
  settings.env = settings.env || {}
  settings.env.CLAUDE_CODE_EFFORT_LEVEL = 'max'
  settings.env.CLAUDE_CODE_THINKING = '1'
  delete settings.env.CLAUDE_CODE_DISABLE_THINKING
  return settings
}

export function applyLocalModelSettings({ parkMcps = false, permissions = true, honestMap = null } = {}) {
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

  // Strip any stale OPENAI_MODEL that was previously saved in settings.env
  // so model switches via /model aren't hijacked after launch.
  delete settings.env.OPENAI_MODEL

  // Preserve the model the user picked in the picker (or --model). The old
  // hard reset to LOCAL_MODEL silently hijacked cloud selections (e.g. the
  // user picked glm-5.3-flash:cloud, this line forced qwen3.8-oc-code:27b,
  // and requests executed on the local card at ~66 tok/s — the "5 minutes to
  // reply" complaint). Only default when no model is chosen yet.
  if (!settings.model) settings.model = LOCAL_MODEL
  applyThinkingMax(settings)
  settings.enabledPlugins = settings.enabledPlugins || {}
  // Preserve user-enabled plugins; default-activate the useful core set.
  const corePlugins = {
    'code-review@claude-plugins-official': true,
    'feature-dev@claude-plugins-official': true,
    'frontend-design@claude-plugins-official': true,
    'code-modernization@claude-plugins-official': true,
    'security-guidance@claude-plugins-official': true,
    'commit-commands@claude-plugins-official': true,
    'pr-review-toolkit@claude-plugins-official': true,
  }
  for (const [k, v] of Object.entries(corePlugins)) {
    if (settings.enabledPlugins[k] === undefined) settings.enabledPlugins[k] = v
  }
  delete settings.statusLine
  applyTtsHooks(settings)

  settings.env = {
    ...(settings.env || {}),
    CLAUDE_CODE_USE_OPENAI: '1',
    OPENAI_BASE_URL: OLLAMA_BASE,
    OPENAI_API_KEY: 'ollama',
    // Do NOT write OPENAI_MODEL here. run.bat sets it from --model, and the
    // /model picker saves to settings.model. ManagedEnv re-applies settings.env
    // after launch, so a saved OPENAI_MODEL would hijack any model switch.
    OLLAMA_HOST: OLLAMA_HOST,
    OLLAMA_NUM_GPU: '1',
    OLLAMA_FLASH_ATTENTION: '1',
    OLLAMA_CONTEXT_LENGTH: String(CTX),
    OLLAMA_MAX_VRAM: '32768',
    OLLAMA_KEEP_ALIVE: '120m',
    OLLAMA_NUM_PARALLEL: '1',
    // >1 loaded model = the GPU shares VRAM between models and evicts/reloads
    // mid-session (minutes). One slot, whichever model runs, keeps max speed.
    OLLAMA_MAX_LOADED_MODELS: '1',
    OLLAMA_NUM_THREAD: '24',
    OPENCLAUDE_PERFORMANCE_MODE: 'max5090',
    CLAUDE_CODE_NO_FLICKER: '0',
    CLAUDE_CODE_DISABLE_MOUSE: '1',
    CLAUDE_CODE_DISABLE_MOUSE_CLICKS: '1',
    // Stream idle was 300000 — a 5-minute hard kill while run.bat promised
    // 600000. Run.bat loses to settings.env (managedEnv), so this MUST agree.
    CLAUDE_STREAM_IDLE_TIMEOUT_MS: '600000',
    // QueryGuard: allow long silent thinking on cloud models (default idle kill is 5 min)
    OPENCLAUDE_QUERY_IDLE_TIMEOUT_MS: '900000',
    OPENCLAUDE_QUERY_HARD_MAX_MS: '7200000',
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
    CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS: JSON.stringify(honestMap ?? contextWindowsMap()),
    // Per-model auto-compact caps (JSON): compact near each model's OWN
    // honest window instead of one global number that squashes 163k/1M
    // models down to the 143k tier. '*' is the fallback for unlisted models
    // (keeps the old AUTO_COMPACT semantics for anything not in the map).
    // Gap of 10k under each map value reserves headroom for the compact
    // summary + output before the hard window.
    CLAUDE_CODE_AUTO_COMPACT_WINDOW: JSON.stringify(
      buildAutoCompactCapTable(honestMap ?? contextWindowsMap(), AUTO_COMPACT)
    ),
    // RepoMap: auto-inject codebase structural map at session start (env var gate)
    REPO_MAP: '1',
  }
  delete settings.env.OPENCLAUDE_TTS
  if (keepTavily) settings.env.TAVILY_API_KEY = keepTavily

  if (permissions) applyLocalPermissions(settings)
  else if (keepPerms) settings.permissions = keepPerms

  // Local MCP servers (stdio, fully offline — no cloud SaaS)
  settings.mcpServers = {
    filesystem: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem',
        path.join(user, 'Desktop'),
        path.join(user, 'Desktop', 'openclaude', 'openclaude-main')],
    },
    'sequential-thinking': {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    },
  }

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
    // Compute the honest context map from LIVE Ollama facts (native context +
    // Modelfile pins) so OpenClaude is never told more than will be served.
    // Static contextWindowsMap() stays as fallback when Ollama is unreachable.
    let honestMap = null
    try {
      // Use the STATIC contextWindowsMap() as the curated source so cloud model
      // entries always pick up corrected values (not stale ones from settings.json).
      const curated = contextWindowsMap()
      const rows = await fetchAllModelFacts(curated)
      const { map, meta } = honestMapFromRows(rows, curated)
      honestMap = map
      console.log(`[OK] context map from live Ollama facts: ${Object.keys(map).length} models (reBake pending: ${meta.reBake.length}, cloud: ${meta.cloud.length}, errors: ${meta.errors.length})`)
    } catch (e) {
      console.log(`[WARN] live context map unavailable (${e.message}) — using static map`)
    }
    applyLocalModelSettings({ parkMcps: process.argv.includes('--park-mcps'), permissions: true, honestMap })
    applyLocalProviderProfile()
    console.log(`[OK] settings: ${LOCAL_MODEL} effort=max think=max official-qwen38-sampling ${CTX} tts-hooks=on flash-attn=1`)
  }
}