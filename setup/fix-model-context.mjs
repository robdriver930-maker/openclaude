/**
 * fix-model-context.mjs — Make every local Ollama model SERVE what OpenClaude PROMISES.
 *
 * Problem this fixes (found 2026-09-20): 41 models' Modelfile num_ctx pins were BELOW
 * what the settings map told OpenClaude (e.g. uncensored:latest pinned 16384 while the
 * map said 32768) -> silent truncation + auto-compact requests that can never fit.
 * Conversely 62 models were throttled below their native capability (e.g. the flagship
 * qwen3.8-oc-code:27b pinned 65536 while the map promised 160k).
 *
 * What it does:
 *   1. Reads live facts for every model (native context, Modelfile pin, params, caps).
 *   2. Computes a VRAM-safe target per model (see context-targets.mjs tiers).
 *   3. Re-bakes the Modelfile pin (`ollama create` reuses blobs — no re-download)
 *      so SERVED == TARGET for every local chat model.
 *
 *   node setup/fix-model-context.mjs            # dry run: show the plan
 *   node setup/fix-model-context.mjs --apply    # re-bake the pins for real
 *   node setup/fix-model-context.mjs --model uncensored:latest [--apply]
 *
 * After applying, run: node setup/apply-local-model-settings.mjs
 * (it now computes the honest CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS map from live facts).
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync } from 'child_process'
import {
  fetchAllModelFacts,
  finalTarget,
  servedNow,
  parseNumCtx,
  isCloudModel,
} from './context-targets.mjs'

const APPLY = process.argv.includes('--apply')
const modelFilterIdx = process.argv.indexOf('--model')
const modelFilter = modelFilterIdx >= 0 ? process.argv[modelFilterIdx + 1] : null

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', timeout: 180_000, windowsHide: true })
}

function reBake(name, target) {
  const tmp = path.join(os.tmpdir(), `oc-ctx-${name.replace(/[^\w.-]+/g, '_')}.modelfile`)
  const modelfile = run('ollama', ['show', '--modelfile', name])
  let replaced = false
  const lines = modelfile.split(/\r?\n/).map(line => {
    if (/^PARAMETER\s+num_ctx\s+\d+/i.test(line)) {
      replaced = true
      return `PARAMETER num_ctx ${target}`
    }
    return line
  })
  if (!replaced) {
    // Insert after the FROM line so it applies to the base weights.
    const fromIdx = lines.findIndex(l => /^FROM\s/i.test(l))
    lines.splice(fromIdx + 1, 0, `PARAMETER num_ctx ${target}`)
  }
  fs.writeFileSync(tmp, lines.join('\n'), 'utf8')
  try {
    run('ollama', ['create', name, '-f', tmp])
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

console.log(`Scanning installed models (apply=${APPLY})...`)
const curatedMap = (() => {
  try {
    const s = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.openclaude', 'settings.json'), 'utf8'))
    return JSON.parse(s.env?.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS || '{}')
  } catch {
    return {}
  }
})()

const rows = await fetchAllModelFacts(curatedMap)

const plan = []
for (const r of rows) {
  if (modelFilter && r.name !== modelFilter) continue
  if (r.error || isCloudModel(r.name) || !r.native) continue
  if (Array.isArray(r.caps) && r.caps.includes('embedding')) continue
  // finalTarget = VRAM tier, but never below what the model serves today (no regressions)
  const target = finalTarget(r)
  if (!target) continue
  const served = servedNow(r.native, r.pin)
  const needsReBake = served !== target
  plan.push({ name: r.name, native: r.native, pin: r.pin, served, target, needsReBake })
}

const toFix = plan.filter(p => p.needsReBake)
console.log(`\n=== RE-BAKE PLAN (${toFix.length} of ${plan.length} local chat models) ===`)
for (const p of toFix) {
  console.log(`  ${p.name.padEnd(58)} pin ${String(p.pin ?? 'none').padEnd(7)} -> ${String(p.target).padEnd(7)} (served ${p.served} -> ${p.target})`)
}

if (!APPLY) {
  console.log('\nDry run only. Re-run with --apply to re-bake the Modelfiles above.')
  console.log('The honest context map itself is applied by apply-local-model-settings.mjs (no re-bake needed for that).')
  process.exit(0)
}

console.log('\n=== APPLYING ===')
let ok = 0
const failed = []
for (const p of toFix) {
  try {
    reBake(p.name, p.target)
    ok++
    console.log(`  [OK] ${p.name} -> num_ctx ${p.target}`)
  } catch (e) {
    failed.push({ name: p.name, error: String(e.message).slice(0, 200) })
    console.log(`  [FAIL] ${p.name}: ${String(e.message).slice(0, 120)}`)
  }
}

// Verify pins actually landed — ground truth is the re-baked Modelfile itself.
function modelfilePin(name) {
  try {
    const mf = run('ollama', ['show', '--modelfile', name])
    return parseNumCtx(mf)
  } catch {
    return null
  }
}
console.log('\n=== VERIFY (baked Modelfile pins) ===')
let verified = 0
for (const p of toFix) {
  const pin = modelfilePin(p.name)
  const okMatch = pin === p.target
  console.log(`  ${p.name}: pinned=${pin ?? '?'} expected=${p.target} ${okMatch ? 'MATCH' : 'CHECK'}`)
  if (okMatch) verified++
}

console.log(`\nre-baked=${ok}/${toFix.length} verified=${verified} failed=${failed.length}`)
if (failed.length) {
  console.log('Failures (safe to re-run this script):')
  for (const f of failed) console.log(`  ${f.name}: ${f.error}`)
}
console.log('\nNext: node setup/apply-local-model-settings.mjs  (writes the honest context map)')