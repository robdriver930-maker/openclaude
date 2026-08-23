/**
 * Probe raw Ollama OpenAI-compat streaming — isolate hang vs OpenClaude.
 */
import http from 'http'

const model = process.argv[2] || 'qwen3.6-oc:27b'
const withTools = process.argv.includes('--tools')
const withEffort = process.argv.includes('--effort')

const body = {
  model,
  stream: true,
  messages: [{ role: 'user', content: 'Reply with exactly: PONG' }],
  max_tokens: 64,
}
if (withEffort) body.reasoning_effort = 'low'
if (withTools) {
  body.tools = [
    {
      type: 'function',
      function: {
        name: 'Bash',
        description: 'Run a shell command',
        parameters: {
          type: 'object',
          properties: { command: { type: 'string' } },
          required: ['command'],
        },
      },
    },
  ]
}

const payload = JSON.stringify(body)
const started = Date.now()
let chunks = 0
let bytes = 0
let firstChunkAt = 0
let lastChunkAt = 0
let raw = ''

console.log('PROBE model=%s tools=%s effort=%s', model, withTools, withEffort)

const req = http.request(
  {
    hostname: '127.0.0.1',
    port: 11434,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ollama',
      'Content-Length': Buffer.byteLength(payload),
    },
    timeout: 120000,
  },
  res => {
    console.log('STATUS', res.statusCode)
    res.on('data', c => {
      chunks++
      bytes += c.length
      if (!firstChunkAt) firstChunkAt = Date.now()
      lastChunkAt = Date.now()
      raw += c.toString('utf8')
      process.stdout.write('.')
    })
    res.on('end', () => {
      console.log('')
      console.log('DONE total_ms=%d first_ms=%d chunks=%d bytes=%d', Date.now() - started, firstChunkAt - started, chunks, bytes)
      console.log('---RAW---')
      console.log(raw.slice(0, 2000))
      process.exit(0)
    })
  },
)
req.on('error', e => {
  console.error('ERR', e.message)
  process.exit(1)
})
req.on('timeout', () => {
  console.error('TIMEOUT after %dms chunks=%d', Date.now() - started, chunks)
  req.destroy()
  process.exit(2)
})
req.write(payload)
req.end()
