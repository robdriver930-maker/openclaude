/**
 * context-targets.mjs — shared ground-truth logic for Ollama context windows.
 *
 * Used by: context-audit.mjs (audit), fix-model-context.mjs (re-bake pins),
 *          apply-local-model-settings.mjs (honest CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS map).
 *
 * Ground rules (verified against Ollama server.log on 2026-09-20):
 *   - What a model actually SERVES = min(native context_length, Modelfile num_ctx pin,
 *     or OLLAMA_CONTEXT_LENGTH server default when no pin exists).
 *   - Modelfile pins OVERRIDE the server default. Pins above the training length get
 *     clamped with: "requested context size too large for model".
 *   - OpenClaude must never be TOLD a number bigger than what will be served
 *     (that is what breaks auto-compact: the compaction request itself overflows).
 */
import fs from 'fs'
import os from 'os'
import path from 'path'

// OLLAMA_CONTEXT_LENGTH at User scope, verified via PowerShell on 2026-09-20.
export const ENV_DEFAULT_CTX = 32768

export function parseNumCtx(parameters) {
  const m = String(parameters || '').match(/num_ctx\s+(\d+)/i)
  return m ? Number(m[1]) : null
}

export function nativeContext(modelInfo) {
  if (!modelInfo || typeof modelInfo !== 'object') return null
  const direct = modelInfo['general.context_length']
  if (typeof direct === 'number') return direct
  const hit = Object.entries(modelInfo).find(([k]) => k.endsWith('.context_length'))
  return hit && typeof hit[1] === 'number' ? hit[1] : null
}

export function parameterCount(modelInfo, name) {
  const p = modelInfo?.['general.parameter_count']
  if (typeof p === 'number' && p > 0) return p
  const label = modelInfo?.['general.size_label']
  const m = String(label || '').match(/([\d.]+)\s*[bB]/)
  if (m) return parseFloat(m[1]) * 1e9
  const n = String(name || '').match(/(\d+(?:\.\d+)?)b\b/i)
  if (n) return parseFloat(n[1]) * 1e9
  return null
}

export function isCloudModel(name) {
  return /:cloud$|-cloud(?::|$)/i.test(String(name)) || String(name).startsWith('BT-Cloud-')
}

/** What Ollama will actually serve for this model RIGHT NOW. */
export function servedNow(native, pin) {
  if (!Number.isFinite(native) || !native) return null
  return Math.min(native, pin ?? ENV_DEFAULT_CTX)
}

/**
 * ELITE tier targets for the RTX 5090 32GB (flash-attn ON, q8_0 KV — verified live
 * in server.log). Doctrine (Robert, 2026-09-20): context must be big enough to
 * START AND FINISH a project — max context wins, brief CPU spill is accepted,
 * and a HARD LOAD FAILURE is the only reason to step down (elite-context.mjs
 * proof-loads every change and walks CTX_LADDER down until it loads).
 *   - small models (<=40k native): serve full native — KV cache is trivial
 *   - 60B+ dense: 65536 — weights already dominate/spill; KV still affordable
 *   - dense 25-60B: 131072 — spill possible, loads verified by proof-load
 *   - small dense, MoE any size, deepseek2 (MLA KV is tiny): 163840
 *   - gemma family: 131072 (sliding-window hybrid keeps KV small)
 *   - qwen dense: 163840 — PROVEN (flagship loads n_ctx=163840, 100% GPU)
 * Cloud/unknown models keep their curated value; embeddings keep min(native, curated).
 */
export const CTX_LADDER = [32768, 16384, 8192]

export function targetContext({ native, arch, params, name, caps = [], curated = null }) {
  if (!Number.isFinite(native) || !native) return curated ?? null
  if (isCloudModel(name)) return curated
  if (Array.isArray(caps) && caps.includes('embedding')) return Math.min(native, curated ?? native)
  if (native <= 40960) return native
  const a = String(arch || '')
  const P = params
  if (P && P >= 60e9) return Math.min(native, 32768)
  if (a === 'deepseek2') return Math.min(native, 32768)
  if (/moe/i.test(a)) return Math.min(native, 32768)
  if (a.startsWith('gemma')) return Math.min(native, 32768)
  if (P && P >= 25e9) return Math.min(native, 32768)
  return Math.min(native, 32768)
}

/**
 * Final target = tier target, but NEVER below what the model serves today
 * (no capability regressions). If today's served beats the tier, keep it.
 */
export function finalTarget(row) {
  const tier = targetContext(row)
  if (tier == null) return null
  const served = servedNow(row.native, row.pin)
  if (served != null && served > tier) return served
  return tier
}

async function getJson(url, body, timeoutMs = 15000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

/**
 * Collect ground-truth facts for every model in `ollama list`.
 * Returns rows: { name, arch, native, pin, params, caps, curated, error }
 */
export async function fetchAllModelFacts(curatedMap = {}) {
  const host = (process.env.OLLAMA_HOST || '127.0.0.1:11434').replace(/^https?:\/\//, '')
  const base = `http://${host}`
  const tags = await getJson(`${base}/api/tags`)
  const rows = []
  for (const m of tags.models ?? []) {
    const name = m.name
    const row = { name, arch: '?', native: null, pin: null, params: null, caps: [], curated: curatedMap[name] ?? null, error: null }
    try {
      const show = await getJson(`${base}/api/show`, { model: name })
      const mi = show.model_info ?? {}
      row.arch = mi['general.architecture'] ?? '?'
      row.native = nativeContext(mi)
      row.params = parameterCount(mi, name)
      row.pin = parseNumCtx(show.parameters)
      row.caps = show.capabilities ?? []
    } catch (e) {
      row.error = e.message
    }
    rows.push(row)
  }
  rows.sort((a, b) => (a.name > b.name ? 1 : -1))
  return rows
}

export function cachePath() {
  return path.join(os.homedir(), '.openclaude', 'context-windows.cache.json')
}

/**
 * Honest map for every model, computed from live facts.
 *   map[name] = finalTarget (== what will actually be served after any re-bake)
 *   meta.reBake = models whose Modelfile pin must change for served == target
 * Curated entries fill cloud/unknown gaps; curated cloud entries with no local
 * tag are preserved so the map never loses coverage.
 */
export function honestMapFromRows(rows, curatedMap = {}) {
  const map = {}
  const meta = { reBake: [], honest: [], cloud: [], errors: [] }
  for (const r of rows) {
    if (r.error) {
      if (r.curated) map[r.name] = r.curated
      meta.errors.push(r.name)
      continue
    }
    if (isCloudModel(r.name) || !r.native) {
      if (r.curated) map[r.name] = r.curated
      meta.cloud.push(r.name)
      continue
    }
    const target = finalTarget(r)
    if (target == null) {
      if (r.curated) map[r.name] = r.curated
      continue
    }
    map[r.name] = target
    const served = servedNow(r.native, r.pin)
    if (served !== target) meta.reBake.push({ name: r.name, from: r.pin, to: target, servedBefore: served })
    else meta.honest.push(r.name)
  }
  for (const [k, v] of Object.entries(curatedMap)) {
    if (!(k in map)) map[k] = v
  }
  return { map, meta }
}