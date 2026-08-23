/**
 * Fix corrupted settings that end with literal \\n and/or an extra }.
 */
import fs from 'fs'
import path from 'path'

const NEW = 'qwen3.8-oc-code:27b'
const user = process.env.USERPROFILE
const files = [
  path.join(user, '.openclaude', 'settings.json'),
  path.join(user, '.openclaude', 'performance-mode.json'),
  path.join(user, '.openclaude', '.openclaude-profile.json'),
  path.join(user, '.openclaude-profiles', 'software-ai', 'settings.json'),
  path.join(user, '.openclaude-profiles', 'coder', 'settings.json'),
  path.join(user, '.openclaude-profiles', 'websites', 'settings.json'),
  path.join(user, '.openclaude-profiles', 'goldenboy', 'settings.json'),
]

function repairRaw(raw) {
  let r = raw.replace(/^\uFEFF/, '')
  // strip trailing literal backslash-n sequences
  while (r.endsWith('\\n')) r = r.slice(0, -2)
  r = r.trimEnd()
  // if still not parseable, trim to last balanced JSON object
  try {
    JSON.parse(r)
    return r
  } catch {
    // common corruption: valid json + extra } + junk
    let end = r.length
    while (end > 0) {
      const slice = r.slice(0, end).trimEnd()
      try {
        JSON.parse(slice)
        return slice
      } catch {
        end--
      }
    }
    throw new Error('could not repair')
  }
}

for (const f of files) {
  if (!fs.existsSync(f)) {
    console.log('skip missing', f)
    continue
  }
  const raw = fs.readFileSync(f, 'utf8')
  try {
    const repaired = repairRaw(raw)
    const s = JSON.parse(repaired)
    if ('model' in s) s.model = NEW
    if (s.env && typeof s.env === 'object' && 'OPENAI_MODEL' in s.env) {
      s.env.OPENAI_MODEL = NEW
    }
    if ('localModel' in s) s.localModel = NEW
    if (s.env && typeof s.env === 'object' && typeof s.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS === 'string') {
      try {
        const map = JSON.parse(s.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS)
        map[NEW] = map[NEW] || 163840
        delete map['qwen3-coder:480b-cloud']
        s.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS = JSON.stringify(map)
      } catch {
        /* keep */
      }
    }
    const indent = f.includes('.openclaude-profile.json') ? 2 : 4
    fs.writeFileSync(f, JSON.stringify(s, null, indent) + '\n', 'utf8')
    console.log(
      'FIXED',
      f,
      '->',
      s.model || s.localModel || (s.env && s.env.OPENAI_MODEL),
    )
  } catch (e) {
    console.log('FAIL', f, e.message)
  }
}
