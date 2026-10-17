/**
 * repin-unpinned.mjs — Complete context coverage: EVERY local chat model pinned.
 *
 * Rules (Robert, 2026-09-23 — "every model, none missed"):
 *   1. NEVER downgrade an existing pin. Elite pass (163840 fleet) stays.
 *   2. pin > native → clamp to native (qwq:32b 131072 > 40960 native).
 *   3. pin missing → min(native, tier ceiling):
 *      deepseek2 family → 163840 (proven fit: uncensored @100% GPU this card)
 *      everything else  → 131072 (proven-fit ceiling, context-optimizer skill)
 *      native < ceiling → full native (qwen2.5-coder 32k, phi4 16k, ...)
 *   4. Cloud pointers (size 0) → skip (upstream-controlled).
 *   5. Embedding models → skip (full native, no KV growth).
 * Re-bakes from the model's OWN blob — zero downloads. Verifies each pin.
 * Dry-run by default; --apply to write.
 */
import { execFileSync } from 'child_process'
import fs from 'fs'

const APPLY = process.argv.includes('--apply')
const HOST = 'http://127.0.0.1:11434'
const CEILING = 131072
const DEEPSEEK2 = 163840

async function getJson(url, body) {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  return res.json()
}

function ollama(args) {
  return execFileSync('ollama', args, { encoding: 'utf8', timeout: 300000 })
}

const tags = await getJson(`${HOST}/api/tags`)
const results = []
for (const m of tags.models ?? []) {
  const name = m.name
  if ((m.size ?? 0) === 0) continue // cloud pointer (no local weights)
  if (/:cloud$|-cloud$/.test(name)) continue // cloud tag: upstream-controlled, never re-bake (stub blob)
  const show = await getJson(`${HOST}/api/show`, { model: name })
  const caps = show.capabilities ?? []
  if (caps.includes('embedding')) continue
  const mi = show.model_info ?? {}
  const arch = mi['general.architecture'] ?? ''
  const native =
    mi['general.context_length'] ??
    Object.entries(mi).find(([k]) => k.endsWith('.context_length'))?.[1] ??
    null
  if (!native) { console.log(`SKIP   ${name} (no native context in metadata)`); continue }
  const pin = Number((show.parameters ?? '').match(/num_ctx\s+(\d+)/)?.[1] ?? '') || null

  let target
  let reason
  const ceiling = /deepseek2/i.test(arch) ? DEEPSEEK2 : CEILING
  if (pin !== null && pin > native) {
    target = native
    reason = `clamp pin ${pin} > native`
  } else if (pin !== null && pin < native && pin < ceiling && !/^(llama3\.3:70b|deepseek-r1:70b)$/.test(name)) {
    // Too-low pin = capability left on the table. Repair up to the tier
    // ceiling (70B pair excluded: their 65536 pin is the deliberate VRAM tier).
    target = Math.min(native, ceiling)
    reason = `repair low pin ${pin}`
  } else if (pin !== null) {
    continue // pin at/beyond target already — never downgrade
  } else {
    target = Math.min(native, ceiling)
    reason = 'unpinned'
  }
  console.log(`PINS   ${name}  ${pin ?? 'unpinned'} -> ${target}  (${reason}, native=${native}, arch=${arch})`)
  results.push({ name, from: pin, to: target })

  if (!APPLY) continue
  const mf = ollama(['show', '--modelfile', name])
  const lines = mf.split('\n').filter(l => !/^PARAMETER\s+num_ctx\b/.test(l.trim()))
  const fromIdx = lines.findIndex(l => l.startsWith('FROM '))
  lines.splice(fromIdx + 1, 0, `PARAMETER num_ctx ${target}`)
  const tmp = `C:/Users/GoldenBoy/AppData/Local/Temp/rebake-${name.replace(/[^a-zA-Z0-9._-]+/g, '_')}.Modelfile`
  fs.writeFileSync(tmp, lines.join('\n'))
  ollama(['create', name, '-f', tmp])
  const after = await getJson(`${HOST}/api/show`, { model: name })
  const newPin = Number((after.parameters ?? '').match(/num_ctx\s+(\d+)/)?.[1] ?? '') || null
  console.log(`  -> pinned ${newPin} ${newPin === target ? 'OK' : 'MISMATCH!'}`)
}
console.log(`\n${APPLY ? 'APPLIED' : 'dry run'}: ${results.length} pin(s) ${APPLY ? 'written' : 'planned'} (rerun with --apply to write)`)