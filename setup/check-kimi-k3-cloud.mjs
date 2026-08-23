#!/usr/bin/env node
/**
 * Preflight for kimi-k3:cloud via local Ollama OpenAI shim.
 * Exit 0 = usable. Exit 2 = Extra usage / payment required. Exit 1 = other failure.
 */
const BASE = process.env.OPENAI_BASE_URL || 'http://127.0.0.1:11434/v1'
const MODEL = process.env.OPENAI_MODEL || 'kimi-k3:cloud'

async function main() {
  const body = {
    model: MODEL,
    messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
    stream: false,
    max_tokens: 8,
  }

  let res
  try {
    res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ollama',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    })
  } catch (err) {
    console.error(`[FAIL] Cannot reach Ollama at ${BASE}`)
    console.error(String(err?.message || err))
    console.error('Start the Ollama app, wait 10s, retry.')
    process.exitCode = 1
    return
  }

  const text = await res.text()
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = null
  }

  if (res.ok) {
    const content = parsed?.choices?.[0]?.message?.content ?? ''
    console.log(`[OK] ${MODEL} answered via Ollama cloud`)
    if (content) console.log(`Reply: ${String(content).slice(0, 120)}`)
    process.exitCode = 0
    return
  }

  const detail =
    parsed?.error?.message ||
    parsed?.error ||
    parsed?.message ||
    text.slice(0, 500)
  const detailStr = String(detail)
  const lower = detailStr.toLowerCase()

  if (
    res.status === 402 ||
    lower.includes('extra usage') ||
    lower.includes('payment required')
  ) {
    console.error(
      `[FAIL] ${MODEL} needs Ollama Extra usage credits (not normal Pro %).`,
    )
    console.error('')
    console.error(
      'Your Pro session/weekly usage can look almost empty and Kimi K3 still fails.',
    )
    console.error('Ollama bills kimi-k3:cloud from Extra usage $ only.')
    console.error('')
    console.error('Fix now:')
    console.error('  1. Open https://ollama.com/settings')
    console.error('  2. Extra usage → add credit (or turn Auto reload ON)')
    console.error('  3. Re-run run-kimi-k3.bat')
    console.error('')
    console.error('Until then (works on Pro without Extra $):')
    console.error('  run-kimi.bat   → kimi-k2.7-code:cloud (Pro included)')
    console.error('  run.bat        → local qwen3.8-oc-code:27b')
    console.error('')
    console.error(`Provider: ${detailStr}`)
    process.exitCode = 2
    return
  }

  console.error(`[FAIL] ${MODEL} HTTP ${res.status}`)
  console.error(detailStr)
  process.exitCode = 1
}

await main()
