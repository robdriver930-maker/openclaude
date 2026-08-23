/**
 * TTS (text-to-speech) helper for reading assistant responses aloud.
 *
 * Controlled by the OPENCLAUDE_TTS environment variable:
 *   OPENCLAUDE_TTS=1  — speak assistant messages aloud
 *   (unset or empty)  — silent (default)
 *
 * Uses the PowerShell script at ~/.openclaude/tts.ps1 which in turn
 * calls Windows built-in System.Speech.Synthesizer. No external installs.
 */
import { spawn } from 'child_process'
import { getCachedPowerShellPath } from './shell/powershellDetection.js'
import { isEnvTruthy } from './envUtils.js'

const TTS_SCRIPT = process.env.OPENCLAUDE_TTS_SCRIPT ?? ''
// Resolve ~/.openclaude/tts.ps1
const defaultTtsScript =
  process.env.USERPROFILE
    ? `${process.env.USERPROFILE}/.openclaude/tts.ps1`
    : ''

let lastSpokenAt = 0
const MIN_GAP_MS = 1000 // wait at least a second between speeches

function ttsEnabled(): boolean {
  return isEnvTruthy(process.env.OPENCLAUDE_TTS)
}

/**
 * Speak the given text aloud via PowerShell. Fire-and-forget — we don't
 * block the event loop waiting for speech to finish.
 *
 * @param text - The text to speak
 * @param stopReason - Only speaks when 'end_turn' (real assistant response).
 *   Slash commands, local output, and tool results pass null or other values
 *   and are silently skipped.
 */
export function speak(text: string, stopReason?: string | null): void {
  if (!ttsEnabled()) return

  // Only speak actual assistant conversation responses — not slash command
  // output, local command results, or tool noise. The model sets stop_reason
  // to 'end_turn' when it finishes a real response. Everything else (null,
  // 'max_tokens', etc.) is skipped.
  if (stopReason !== 'end_turn') return

  if (!text || text.trim().length < 15) return

  // Rate limit: skip if we spoke within the last second
  const now = Date.now()
  if (now - lastSpokenAt < MIN_GAP_MS) return
  lastSpokenAt = now

  const script = TTS_SCRIPT || defaultTtsScript
  if (!script) return

  // Strip code fences and system reminders for cleaner speech
  const clean = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, '') // strip remaining XML tags
    .trim()

  if (clean.length < 15) return

  getCachedPowerShellPath().then(pwsh => {
    const child = spawn(pwsh || 'pwsh', ['-File', script, '-Voice', 'Microsoft David Desktop', '-Rate', '1', clean], {
      stdio: 'ignore',
      detached: true,
    })
    child.unref() // don't keep Node alive waiting for it
  }).catch(() => {})
}
