/**
 * Install reply-voice hooks and keep them alive.
 * Launchers used to set disableAllHooks=true and delete hooks, which
 * killed TTS. Every launcher must call this after rewriting settings.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const user = process.env.USERPROFILE
const settingsPath = path.join(user, '.openclaude', 'settings.json')

const SPEAK = '& "$env:USERPROFILE\\.openclaude\\speak-reply.ps1"'
const TOGGLE = '& "$env:USERPROFILE\\.openclaude\\tts-prompt-toggle.ps1"'

function readJson(p) {
  let r = fs.readFileSync(p, 'utf8')
  if (r.charCodeAt(0) === 0xfeff) r = r.slice(1)
  return JSON.parse(r)
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 4) + '\n', 'utf8')
}

export function applyTtsHooks(settings) {
  settings.disableAllHooks = false
  settings.hooks = settings.hooks && typeof settings.hooks === 'object' ? settings.hooks : {}
  settings.hooks.Stop = [
    {
      matcher: '',
      hooks: [
        {
          type: 'command',
          command: SPEAK,
          shell: 'powershell',
          async: true,
          timeout: 120,
          statusMessage: 'Speaking reply',
        },
      ],
    },
  ]
  settings.hooks.UserPromptSubmit = [
    {
      matcher: '',
      hooks: [
        {
          type: 'command',
          command: TOGGLE,
          shell: 'powershell',
          async: false,
          timeout: 15,
          statusMessage: 'Voice switch',
        },
      ],
    },
  ]
  return settings
}

export function installTtsHooks() {
  const settings = readJson(settingsPath)
  applyTtsHooks(settings)
  writeJson(settingsPath, settings)
  return settings
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  installTtsHooks()
  console.log('[OK] TTS hooks installed (disableAllHooks=false, Stop + UserPromptSubmit)')
}
