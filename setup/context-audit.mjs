/**
 * context-audit.mjs — Audit every installed Ollama model for context honesty.
 *
 * For each model it compares three numbers that MUST agree:
 *   1. native    — the model's real context length (GGUF metadata, /api/show)
 *   2. numCtx    — the Modelfile PARAMETER num_ctx (what Ollama will actually serve)
 *   3. map       — what OpenClaude's CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS believes
 *
 * Verdicts: honest | MAP TOO HIGH (dangerous: compaction fires too late, silent
 * truncation) | low (usable headroom wasted) | NO MAP ENTRY (OpenClaude falls
 * back to a generic window).
 *
 *   node setup/context-audit.mjs            # full table + problem summary
 *   node setup/context-audit.mjs --quiet    # only problems
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { servedNow } from './context-targets.mjs'

const HOST = (process.env.OLLAMA_HOST || '127.0.0.1:11434').replace(/^https?:\/\//, '')
const base = `http://${HOST}`
const quiet = process.argv.includes('--quiet')

const settingsPath = path.join(os.homedir(), '.openclaude', 'settings.json')
let map = {}
try {
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
  map = JSON.parse(settings.env?.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS || '{}')
} catch (e) {
  console.error(`[warn] could not read settings map: ${e.message}`)
}

async function getJson(url, body) {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  return res.json()
}

const tags = await getJson(`${base}/api/tags`)
const rows = []
for (const m of tags.models ?? []) {
  const name = m.name
  let show = {}
  try {
    show = await getJson(`${base}/api/show`, { model: name })
  } catch (e) {
    rows.push({ name, architecture: '?', native: null, numCtx: null, map: map[name] ?? null, caps: [], error: e.message })
    continue
  }
  const mi = show.model_info ?? {}
  const native =
    mi['general.context_length'] ??
    Object.entries(mi).find(([k]) => k.endsWith('.context_length'))?.[1] ??
    null
  const numCtx = Number((show.parameters ?? '').match(/num_ctx\s+(\d+)/)?.[1] ?? '') || null
  // Cloud pointers (:cloud / *-cloud tags) are served upstream — the local
  // server never allocates a window, so min(native, env default) is
  // meaningless for them. Verified 2026-09-23: /api/chat accepts
  // num_ctx = full native on the Pro account (kimi-k3 at 1048576).
  const isCloud = /(:cloud|-cloud)$/.test(name) || (m.size ?? 0) === 0
  rows.push({
    name,
    architecture: isCloud ? '(cloud)' : mi['general.architecture'] ?? '?',
    native,
    numCtx,
    map: map[name] ?? null,
    caps: show.capabilities ?? [],
    error: null,
    cloud: isCloud,
  })
}

// Map entries with no local model (cloud models, removed locals).
for (const k of Object.keys(map)) {
  if (!rows.some(r => r.name === k)) {
    rows.push({ name: k, architecture: '(cloud or absent)', native: null, numCtx: null, map: map[k], caps: [], error: null })
  }
}

rows.sort((a, b) => (a.name > b.name ? 1 : -1))

const problems = []
for (const r of rows) {
  const served = r.cloud ? null : servedNow(r.native, r.numCtx)
  let verdict
  if (r.error) verdict = `SHOW FAILED (${r.error})`
  else if (r.map == null) verdict = 'NO MAP ENTRY'
  else if (r.cloud) verdict = 'unknown served (cloud)'
  else if (served == null) verdict = 'unknown served (cloud)'
  else if (r.map > served) verdict = `MAP TOO HIGH by ${r.map - served}`
  else if (r.map < served) verdict = `map low (headroom ${served - r.map})`
  else verdict = 'honest'
  r.served = served
  r.verdict = verdict
  const isProblem = verdict !== 'honest' && verdict !== 'map low (headroom 0)'
  if (!isProblem && quiet) continue
  if (verdict.startsWith('MAP TOO HIGH') || verdict === 'NO MAP ENTRY' || verdict.startsWith('SHOW FAILED')) problems.push(r)
  if (quiet && !isProblem) continue
  console.log(
    `${r.name.padEnd(60)} arch=${String(r.architecture).padEnd(12)} native=${String(r.native ?? '?').padEnd(7)} ` +
      `served=${String(r.served ?? '?').padEnd(7)} map=${String(r.map ?? '-').padEnd(7)} ` +
      `caps=${(r.caps.join('/') || '-').padEnd(24)} ${verdict}`,
  )
}

console.log('\n=== SUMMARY ===')
const honest = rows.filter(r => r.verdict === 'honest').length
const low = rows.filter(r => r.verdict?.startsWith('map low')).length
const tooHigh = rows.filter(r => r.verdict?.startsWith('MAP TOO HIGH')).length
const noMap = rows.filter(r => r.verdict === 'NO MAP ENTRY').length
const unknown = rows.filter(r => r.verdict?.startsWith('unknown')).length
const failed = rows.filter(r => r.verdict?.startsWith('SHOW FAILED')).length
console.log(`total=${rows.length} honest=${honest} low=${low} MAP_TOO_HIGH=${tooHigh} NO_MAP_ENTRY=${noMap} unknown=${unknown} failed=${failed}`)
if (problems.length) {
  console.log('\n=== PROBLEMS (map lies to OpenClaude) ===')
  for (const p of problems) console.log(`  ${p.name}  ->  ${p.verdict} (native=${p.native}, served=${p.served}, map=${p.map})`)
} else {
  console.log('No map honesty problems found.')
}