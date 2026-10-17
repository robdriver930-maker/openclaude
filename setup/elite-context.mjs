#!/usr/bin/env node
/**
 * elite-context.mjs — ELITE per-model context setup for Robert's Ollama fleet.
 *
 * Doctrine (Robert, 2026-09-20): "each model context big enough for me to start
 * and finish a project." For EVERY local model:
 *   1. AIM at the elite tier target (context-targets.mjs targetContext/finalTarget).
 *   2. RE-BAKE the Modelfile num_ctx pin when served != target (reuses blobs).
 *   3. PROOF-LOAD changed models with a real chat request at the new context.
 *   4. STEP DOWN the CTX_LADDER ONLY on a hard Ollama load/memory error.
 *      A timeout is NOT a failure — the model loaded, generation was just slow
 *      (spill-to-CPU is accepted); it keeps the elite context, marked unproven.
 *   5. Report a JSON line per model: {model, from, to, status, gpu, proof}.
 *
 * Never RAISES above native (Ollama would clamp), never LOWERS a model that
 * already serves more than its tier (finalTarget floor), never touches cloud
 * models or embeddings.
 *
 * Usage:
 *   node setup/elite-context.mjs               # plan + apply + proof changed
 *   node setup/elite-context.mjs --plan        # show the plan, change nothing
 *   node setup/elite-context.mjs --model X     # only this model (always proofed)
 *   node setup/elite-context.mjs --report FILE # write JSON report
 */
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  fetchAllModelFacts,
  finalTarget,
  servedNow,
  isCloudModel,
  CTX_LADDER,
} from './context-targets.mjs'

const args = process.argv.slice(2)
const PLAN_ONLY = args.includes('--plan')
const modelArg = (() => {
  const i = args.indexOf('--model')
  return i >= 0 ? args[i + 1] : null
})()
const reportPath = (() => {
  const i = args.indexOf('--report')
  return i >= 0 ? args[i + 1] : null
})()

const HOST = `http://${(process.env.OLLAMA_HOST || '127.0.0.1:11434').replace(/^https?:\/\//, '')}`

function ollama(argsIn, opts = {}) {
  return execFileSync('ollama', argsIn, {
    encoding: 'utf8',
    timeout: opts.timeout ?? 120000,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

/** Probe the current num_ctx pin for ONE model (targeted, cheap). */
async function pinOf(name) {
  try {
    const res = await fetch(`${HOST}/api/show`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: name }),
    })
    if (!res.ok) return null
    const j = await res.json()
    const m = String(j.parameters || '').match(/num_ctx\s+(\d+)/i)
    return m ? Number(m[1]) : null
  } catch {
    return null
  }
}

/**
 * Proof-load: real generate call. Outcomes:
 *   { kind: 'ok' }                    — served a completion
 *   { kind: 'load-error', detail }    — Ollama refused to load (memory etc.)
 *   { kind: 'unproven', detail }      — timed out; model likely loaded, gen slow
 */
async function chatProof(model, timeoutMs = 420000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  const started = Date.now()
  try {
    const res = await fetch(`${HOST}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: 'Reply with exactly: ELITE-OK',
        stream: false,
        think: false,
        options: { num_predict: 8 },
      }),
      signal: ctrl.signal,
    })
    const text = await res.text()
    if (!res.ok) {
      const low = text.toLowerCase()
      const loadErr = res.status >= 500 || /memory|vram|load|reserve|allocat/.test(low)
      return loadErr
        ? { kind: 'load-error', detail: `HTTP ${res.status}: ${text.slice(0, 260)}` }
        : { kind: 'load-error', detail: `HTTP ${res.status}: ${text.slice(0, 260)}` }
    }
    let reply = ''
    try { reply = JSON.parse(text).response ?? '' } catch { reply = text.slice(0, 100) }
    return { kind: 'ok', detail: reply.trim().slice(0, 60), ms: Date.now() - started }
  } catch (e) {
    if (e.name === 'AbortError') return { kind: 'unproven', detail: `no completion within ${timeoutMs}ms (load/gen slow — kept elite context)` }
    return { kind: 'load-error', detail: String(e.message || e) }
  } finally {
    clearTimeout(t)
  }
}

function gpuPercent(model) {
  try {
    const ps = ollama(['ps'], { timeout: 15000 })
    for (const line of ps.split('\n')) {
      if (line.startsWith(model)) {
        const m = line.match(/(\d+)%\s+GPU/)
        if (m) return Number(m[1])
      }
    }
  } catch {}
  return null
}

/** Rewrite/insert the num_ctx PARAMETER in a model's Modelfile and re-create it. */
function reBake(name, target) {
  const mf = ollama(['show', '--modelfile', name])
  const lines = mf.split('\n')
  const pinRe = /^(\s*PARAMETER\s+)?num_ctx\s+\d+/i
  let replaced = false
  let seenPin = false
  const out = lines.filter((l) => {
    // dedupe: after the first num_ctx line, drop any repeats (old double-pin cleanup)
    if (pinRe.test(l)) {
      if (seenPin) return false
      seenPin = true
    }
    return true
  }).map((l) => {
    const m = l.match(pinRe)
    if (m) { replaced = true; return `${m[1] ?? ''}num_ctx ${target}` }
    return l
  })
  if (!replaced) {
    let idx = -1
    for (let i = out.length - 1; i >= 0; i--) {
      if (/^\s*PARAMETER\b/i.test(out[i])) { idx = i + 1; break }
      if (/^\s*(FROM|MESSAGE|ADAPTER|LICENSE)\b/i.test(out[i])) { if (idx < 0) idx = i + 1; break }
    }
    out.splice(idx < 0 ? out.length : idx, 0, `PARAMETER num_ctx ${target}`)
  }
  const tmp = path.join(process.env.TEMP || path.join(os.homedir(), 'AppData', 'Local', 'Temp'), `elite-${name.replace(/[^\w.-]+/g, '_')}.modelfile`)
  fs.writeFileSync(tmp, out.join('\n'))
  execFileSync('ollama', ['create', name, '-f', tmp], { encoding: 'utf8', timeout: 600000, stdio: ['ignore', 'pipe', 'pipe'] })
  fs.rmSync(tmp, { force: true })
}

// ---------------------------------------------------------------- main
console.log(`=== ELITE CONTEXT SETUP ${PLAN_ONLY ? '(PLAN ONLY)' : '(apply + proof)'} ===`)
const facts = await fetchAllModelFacts({})
const report = []

for (const r of facts) {
  if (modelArg && r.name !== modelArg) continue
  if (r.error) { report.push({ model: r.name, status: 'skip', reason: `show failed: ${r.error}` }); continue }
  if (isCloudModel(r.name)) { report.push({ model: r.name, status: 'skip', reason: 'cloud model' }); continue }
  if (Array.isArray(r.caps) && r.caps.includes('embedding')) { report.push({ model: r.name, status: 'skip', reason: 'embedding' }); continue }
  const target = finalTarget(r)
  if (!target) { report.push({ model: r.name, status: 'skip', reason: 'unknown native context' }); continue }

  const servedBefore = servedNow(r.native, r.pin)
  const effective = Math.min(target, r.native)
  const entry = { model: r.name, arch: r.arch, native: r.native, from: r.pin, to: effective, servedBefore }
  const needsReBake = !PLAN_ONLY && servedBefore !== effective

  if (needsReBake) {
    try {
      reBake(r.name, effective)
      entry.reBaked = true
      entry.pinAfter = await pinOf(r.name)
      if (entry.pinAfter !== effective) {
        entry.status = 'rebake-verify-failed'
        entry.reason = `pin reads back ${entry.pinAfter}, wanted ${effective}`
        report.push(entry)
        console.log(`[??] ${r.name}: pin verify mismatch`)
        continue
      }
    } catch (e) {
      entry.status = 'rebake-failed'
      entry.reason = String(e.message || e).slice(0, 300)
      report.push(entry)
      console.log(`[XX] ${r.name}: re-bake failed`)
      continue
    }
  }

  // Proof-load ONLY changed models (or when a single model was requested).
  // Unchanged models keep status 'elite' without an expensive re-load.
  let final = effective
  let status = 'elite'
  let proofDetail = needsReBake || modelArg ? null : 'unchanged — not re-proofed'
  if (!PLAN_ONLY && (needsReBake || modelArg)) {
    let proof = await chatProof(r.name)
    const ladder = CTX_LADDER.filter((c) => c < final)
    let steps = 0
    while (proof.kind === 'load-error' && steps < ladder.length) {
      const next = ladder[steps++]
      try {
        reBake(r.name, next)
        final = next
        entry.stepDown = next
        proof = await chatProof(r.name)
      } catch (e) {
        proof = { kind: 'load-error', detail: `re-bake at ${next} failed: ${String(e.message || e).slice(0, 200)}` }
        break
      }
    }
    entry.proof = proof.detail || 'ELITE-OK'
    if (proof.kind === 'ok') { status = 'elite'; entry.proofMs = proof.ms }
    else if (proof.kind === 'unproven') status = 'elite-unproven'
    else { status = 'proof-failed'; entry.reason = proof.detail }
    entry.gpu = proof.kind === 'ok' ? gpuPercent(r.name) : null
  }
  entry.final = final
  entry.status = PLAN_ONLY ? 'planned' : status
  if (proofDetail) entry.proof = proofDetail
  report.push(entry)
  const mark = PLAN_ONLY ? '[::]' : status === 'elite' ? '[OK]' : status === 'elite-unproven' ? '[~]' : '[XX]'
  console.log(`${mark} ${r.name.padEnd(46)} ${String(entry.from ?? '-').padStart(7)} -> ${String(final).padStart(7)}  ${entry.status}`)
}

if (reportPath) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
}
const n = (s) => report.filter((e) => e.status === s).length
console.log(`\n=== ELITE SUMMARY: ${n('elite')} elite, ${n('elite-unproven')} unproven-slow, ${n('proof-failed') + n('rebake-failed') + n('rebake-verify-failed')} failed, ${n('skip')} skipped, ${n('planned')} planned ===`)
if (PLAN_ONLY) console.log('(plan only — nothing was changed)')