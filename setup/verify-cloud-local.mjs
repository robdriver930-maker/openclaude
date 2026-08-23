/**
 * Cloud vs local smoke checks for OpenClaude launcher path.
 */
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import http from 'http'

const ROOT = 'C:\\Users\\GoldenBoy\\Desktop\\openclaude\\openclaude-main'
const USER = process.env.USERPROFILE
const results = []

function ok(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail })
  console.log(`${pass ? '[OK]' : '[FAIL]'} ${name}${detail ? ' — ' + detail : ''}`)
}

function getJson(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('timeout'))
    })
  })
}

async function postGenerate(model, timeoutMs = 180000) {
  const body = JSON.stringify({
    model,
    prompt: 'Reply with exactly: CLOUD_OK',
    stream: false,
    keep_alive: '10m',
  })
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 11434,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: timeoutMs,
      },
      res => {
        let data = ''
        res.on('data', c => (data += c))
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(data) })
          } catch (e) {
            resolve({ status: res.statusCode, raw: data.slice(0, 500), error: String(e) })
          }
        })
      },
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('generate timeout'))
    })
    req.write(body)
    req.end()
  })
}

async function chatCompletions(model, timeoutMs = 180000) {
  const body = JSON.stringify({
    model,
    messages: [{ role: 'user', content: 'Reply with exactly: CLOUD_CHAT_OK' }],
    max_tokens: 32,
    temperature: 0,
  })
  return new Promise((resolve, reject) => {
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
        timeout: timeoutMs,
      },
      res => {
        let data = ''
        res.on('data', c => (data += c))
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(data) })
          } catch (e) {
            resolve({ status: res.statusCode, raw: data.slice(0, 500), error: String(e) })
          }
        })
      },
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('chat timeout'))
    })
    req.write(body)
    req.end()
  })
}

async function main() {
  console.log('=== OpenClaude cloud vs local checks ===\n')

  ok('dist/cli.mjs exists', fs.existsSync(path.join(ROOT, 'dist', 'cli.mjs')))
  ok('run.bat exists', fs.existsSync(path.join(ROOT, 'run.bat')))

  const agentDir = path.join(USER, '.openclaude', 'agents')
  const skillDir = path.join(USER, '.openclaude', 'skills')
  const agentCount = fs.existsSync(agentDir)
    ? fs.readdirSync(agentDir).filter(f => f.endsWith('.md')).length
    : 0
  const skillCount = fs.existsSync(skillDir)
    ? fs.readdirSync(skillDir).filter(n =>
        fs.statSync(path.join(skillDir, n)).isDirectory(),
      ).length
    : 0
  ok('agents installed', agentCount >= 76, `${agentCount}`)
  ok(
    'capability-dispatcher present',
    fs.existsSync(path.join(agentDir, 'capability-dispatcher.md')),
  )
  ok('skills present', skillCount >= 50, `${skillCount}`)

  let tags
  try {
    tags = await getJson('http://127.0.0.1:11434/api/tags')
    ok('Ollama API reachable', true)
  } catch (e) {
    ok('Ollama API reachable', false, String(e.message || e))
    printSummary()
    process.exit(1)
  }

  const names = (tags.models || []).map(m => m.name)
  ok('local model listed', names.includes('qwen3-coder:30b'), names.filter(n => n.includes('qwen3-coder')).join(', '))
  ok(
    'cloud model listed',
    names.includes('qwen3-coder:480b-cloud'),
    names.filter(n => n.includes('cloud') || n.includes('480b')).join(', ') || 'none',
  )

  // Cloud generate smoke
  if (names.includes('qwen3-coder:480b-cloud')) {
    console.log('\nWarming/testing cloud model (may take a minute)...')
    try {
      const gen = await postGenerate('qwen3-coder:480b-cloud')
      const text = gen.json?.response || ''
      ok(
        'cloud /api/generate works',
        gen.status === 200 && text.length > 0,
        `status=${gen.status} response=${JSON.stringify(text).slice(0, 80)}`,
      )
    } catch (e) {
      ok('cloud /api/generate works', false, String(e.message || e))
    }

    try {
      const chat = await chatCompletions('qwen3-coder:480b-cloud')
      const content = chat.json?.choices?.[0]?.message?.content || ''
      ok(
        'cloud OpenAI-compat chat works',
        chat.status === 200 && content.length > 0,
        `status=${chat.status} content=${JSON.stringify(content).slice(0, 80)}`,
      )
    } catch (e) {
      ok('cloud OpenAI-compat chat works', false, String(e.message || e))
    }
  } else {
    ok('cloud /api/generate works', false, 'model not installed/listed')
    ok('cloud OpenAI-compat chat works', false, 'model not installed/listed')
  }

  // CLI version + model flag (non-interactive)
  const node = 'C:\\Program Files\\nodejs\\node.exe'
  const cli = path.join(ROOT, 'dist', 'cli.mjs')
  const ver = spawnSync(node, [cli, '--version'], {
    encoding: 'utf8',
    timeout: 30000,
    env: {
      ...process.env,
      CLAUDE_CODE_USE_OPENAI: '1',
      OPENAI_BASE_URL: 'http://127.0.0.1:11434/v1',
      OPENAI_API_KEY: 'ollama',
    },
  })
  ok(
    'CLI --version',
    ver.status === 0 && /0\.\d+/.test(ver.stdout + ver.stderr),
    (ver.stdout || ver.stderr || '').trim().slice(0, 80),
  )

  // Print mode: cloud model one-shot if supported
  console.log('\nCLI print smoke (cloud model)...')
  const print = spawnSync(
    node,
    [
      '--max-old-space-size=8192',
      cli,
      '--model',
      'qwen3-coder:480b-cloud',
      '--print',
      '--dangerously-skip-permissions',
      'Reply with exactly: CLOUD_OC_OK',
    ],
    {
      encoding: 'utf8',
      timeout: 240000,
      cwd: ROOT,
      env: {
        ...process.env,
        CLAUDE_CODE_USE_OPENAI: '1',
        OPENAI_BASE_URL: 'http://127.0.0.1:11434/v1',
        OPENAI_API_KEY: 'ollama',
        OPENAI_MODEL: 'qwen3-coder:480b-cloud',
        API_TIMEOUT_MS: '2400000',
        CLAUDE_STREAM_IDLE_TIMEOUT_MS: '900000',
      },
    },
  )
  const out = (print.stdout || '') + (print.stderr || '')
  ok(
    'CLI cloud --print chat',
    print.status === 0 && /CLOUD_OC_OK|OK/i.test(out),
    `exit=${print.status} out=${JSON.stringify(out).slice(0, 200)}`,
  )

  // Same agents path for both modes: parse run.bat cloud branch
  const runBat = fs.readFileSync(path.join(ROOT, 'run.bat'), 'utf8')
  ok('run.bat cloud sets 480b model', /MODE=cloud[\s\S]*MODEL=qwen3-coder:480b-cloud/.test(runBat.replace(/\r/g, '')))
  ok('run.bat cloud still uses Ollama base URL', /OPENAI_BASE_URL=http:\/\/127\.0\.0\.1:11434\/v1/.test(runBat))
  ok('run.bat cloud launches dist\\cli.mjs', /dist\\cli\.mjs/.test(runBat) && /--model %MODEL%/.test(runBat))
  ok(
    'agents/skills not mode-gated in run.bat',
    !/if .*cloud.*agents/i.test(runBat) && runBat.includes('.openclaude\\skills'),
  )

  printSummary()
}

function printSummary() {
  const failed = results.filter(r => !r.pass)
  console.log('\n=== SUMMARY ===')
  console.log(`Passed: ${results.length - failed.length}/${results.length}`)
  if (failed.length) {
    console.log('Failed:')
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`)
    process.exit(1)
  }
  console.log('Cloud path looks equivalent for tools/agents/skills; model is the main difference.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
