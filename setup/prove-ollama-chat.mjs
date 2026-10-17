/** Quick /v1 chat proof used by run.bat. Exit 0 only if Ollama answers. */
import http from 'http'

const model = process.argv[2] || 'qwen3.8-oc-code:27b'

const body = JSON.stringify({
  model,
  messages: [{ role: 'user', content: 'Reply with exactly: PING_OK' }],
  stream: false,
  max_tokens: 32,
  temperature: 0,
})

const result = await new Promise(resolve => {
  const req = http.request(
    {
      hostname: '127.0.0.1',
      port: 11434,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ollama',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 180000,
    },
    res => {
      let d = ''
      res.on('data', c => (d += c))
      res.on('end', () => {
        try {
          const j = JSON.parse(d)
          const msg = j.choices?.[0]?.message || {}
          const content = msg.content || ''
          const reasoning = msg.reasoning || msg.reasoning_content || ''
          const ok =
            res.statusCode === 200 &&
            (content.length > 0 || reasoning.length > 0 || /PING_OK/i.test(content))
          resolve({
            ok,
            status: res.statusCode,
            content: String(content).slice(0, 40),
            reasoning_len: String(reasoning).length,
          })
        } catch {
          resolve({ ok: false, status: res.statusCode, raw: d.slice(0, 120) })
        }
      })
    },
  )
  req.on('error', e => resolve({ ok: false, error: e.message }))
  req.on('timeout', () => {
    req.destroy()
    resolve({ ok: false, error: 'timeout' })
  })
  req.write(body)
  req.end()
})

if (!result.ok) {
  console.error('CHAT_PROOF_FAIL', JSON.stringify(result))
  process.exit(1)
}
console.log('CHAT_PROOF_OK', model, `reasoning_len=${result.reasoning_len}`)
process.exit(0)
