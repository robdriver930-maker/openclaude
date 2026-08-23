/** Probe native /api/chat streaming (what OpenClaude uses for local Ollama). */
import http from 'http'

const model = process.argv[2] || 'qwen3.6-oc:27b'
const body = {
  model,
  stream: true,
  think: true,
  messages: [{ role: 'user', content: 'Reply with exactly: PONG' }],
  options: { num_predict: 64 },
}
const payload = JSON.stringify(body)
const started = Date.now()
let chunks = 0
let first = 0
let raw = ''
console.log('NATIVE /api/chat model=%s', model)
const req = http.request(
  {
    hostname: '127.0.0.1',
    port: 11434,
    path: '/api/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
    timeout: 120000,
  },
  res => {
    console.log('STATUS', res.statusCode)
    res.on('data', c => {
      chunks++
      if (!first) first = Date.now()
      raw += c.toString('utf8')
      process.stdout.write('.')
    })
    res.on('end', () => {
      console.log('')
      console.log('DONE total_ms=%d first_ms=%d chunks=%d', Date.now() - started, first - started, chunks)
      const lines = raw.split('\n').filter(Boolean)
      console.log('lines=%d', lines.length)
      console.log('first=', lines[0]?.slice(0, 300))
      console.log('mid=', lines[Math.floor(lines.length / 2)]?.slice(0, 300))
      console.log('last=', lines.at(-1)?.slice(0, 300))
      process.exit(0)
    })
  },
)
req.on('error', e => {
  console.error(e)
  process.exit(1)
})
req.on('timeout', () => {
  console.error('TIMEOUT chunks=%d', chunks)
  req.destroy()
  process.exit(2)
})
req.write(payload)
req.end()
