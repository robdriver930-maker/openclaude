/**
 * Daily local MAX tag for OpenClaude.
 *
 *   node setup/create-coding-model.mjs
 *   node setup/create-coding-model.mjs --force
 *   → pulls official qwen3.8:27b if needed
 *   → creates/updates qwen3.8-oc-code:27b (160k, think max, official Qwen3.8 sampling, GPU)
 *
 * Double-click: run.bat
 */
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const modelfile = path.join(root, 'setup', 'Modelfile.qwen38-27b-oc-code')
const SOURCE = 'qwen3.8:27b'
const TAG = 'qwen3.8-oc-code:27b'
const force = process.argv.includes('--force')

function ollamaList() {
  try {
    return execFileSync('ollama', ['list'], { encoding: 'utf8' })
  } catch {
    return ''
  }
}

function modelfileChangedSinceCreate() {
  if (force) return true
  try {
    const show = execFileSync('ollama', ['show', TAG, '--modelfile'], { encoding: 'utf8' })
    const current = fs.readFileSync(modelfile, 'utf8').trim()
    return !show.includes(current.slice(0, 80))
  } catch {
    return true
  }
}

const listed = ollamaList()
if (!listed.includes('qwen3.8:27b') && !/\bqwen3\.8\b/.test(listed)) {
  console.log('Pulling official Qwen3.8-27B weights (one-time, ~18 GB)...')
  console.log(SOURCE)
  execFileSync('ollama', ['pull', SOURCE], { stdio: 'inherit' })
} else {
  console.log('Source weights already installed')
}

if (listed.includes(TAG) && !modelfileChangedSinceCreate()) {
  console.log('Daily tag already up to date:', TAG)
} else {
  console.log('Creating/updating daily MAX tag', TAG)
  console.log('Modelfile', modelfile)
  execFileSync('ollama', ['create', TAG, '-f', modelfile], { stdio: 'inherit' })
  console.log('OK', TAG)
}

console.log('Launcher: run.bat')
