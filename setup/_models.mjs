import http from 'http'
import { execSync } from 'child_process'

function get(path) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port: 11434, path, timeout: 8000 }, res => {
      let d = ''
      res.on('data', c => (d += c))
      res.on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

try {
  const tags = await get('/api/tags')
  const models = (tags.models || []).map(m => ({
    name: m.name,
    gb: +(m.size / 1e9).toFixed(1),
  })).sort((a, b) => a.name.localeCompare(b.name))
  console.log('MODELS')
  for (const m of models) console.log(`${m.gb.toString().padStart(6)} GB  ${m.name}`)
  try {
    const gpu = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader', { encoding: 'utf8' }).trim()
    console.log('GPU', gpu)
  } catch {
    console.log('GPU unknown')
  }
} catch (e) {
  console.error('ERR', e.message || e)
  process.exit(1)
}
