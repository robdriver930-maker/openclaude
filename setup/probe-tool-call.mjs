/**
 * Prove local model can emit a real tool call (not just narrate).
 */
import http from 'http'

const MODEL = process.argv[2] || 'qwen3.8-oc-code:27b'
const tools = [
  {
    type: 'function',
    function: {
      name: 'Glob',
      description: 'Find files by glob pattern',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
        },
        required: ['pattern'],
      },
    },
  },
]

function post(body) {
  return new Promise(resolve => {
    const data = JSON.stringify(body)
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 11434,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 120000,
      },
      res => {
        let d = ''
        res.on('data', c => (d += c))
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(d) })
          } catch {
            resolve({ status: res.statusCode, json: null, raw: d.slice(0, 500) })
          }
        })
      },
    )
    req.on('error', e => resolve({ status: 0, error: String(e.message || e) }))
    req.write(data)
    req.end()
  })
}

const t0 = Date.now()
const r = await post({
  model: MODEL,
  stream: false,
  think: false,
  options: { num_ctx: 163840, num_predict: 512, temperature: 0.3 },
  tools,
  messages: [
    {
      role: 'system',
      content:
        'You are a coding agent. For codebase questions you MUST call tools. Never say you will explore — call Glob or Read immediately.',
    },
    {
      role: 'user',
      content:
        'List TypeScript files under src using the Glob tool with pattern **/*.ts. Do not answer in prose first.',
    },
  ],
})
const ms = Date.now() - t0
const msg = r.json?.message || {}
const toolsOut = msg.tool_calls || []
const content = typeof msg.content === 'string' ? msg.content : ''
const thinking = typeof msg.thinking === 'string' ? msg.thinking : ''
console.log('status', r.status, `${ms}ms`)
console.log('tool_calls', toolsOut.length)
if (toolsOut[0]) console.log('first_tool', JSON.stringify(toolsOut[0]).slice(0, 200))
console.log('content_len', content.length, 'thinking_len', thinking.length)
console.log('content_preview', JSON.stringify(content).slice(0, 120))
if (toolsOut.length > 0) {
  console.log('TOOL_CALL_PASS')
  process.exit(0)
}
console.log('TOOL_CALL_FAIL')
process.exit(2)
