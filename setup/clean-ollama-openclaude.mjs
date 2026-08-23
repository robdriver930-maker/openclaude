/**
 * Clean Ollama ↔ OpenClaude connection — aliases SNAPPY daily profile.
 * Faster default: qwen3.6-oc:27b @ 32k, effort high.
 * Deep MAX: node setup/max-local-connected.mjs  or  run.bat power
 */
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const target = path.join(here, 'snappy-local-5090.mjs')
const r = spawnSync(process.execPath, [target], { stdio: 'inherit' })
process.exit(r.status ?? 1)
