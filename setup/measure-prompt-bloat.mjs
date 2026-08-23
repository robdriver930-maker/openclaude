/**
 * Rough local estimate of what OpenClaude loads before any project work.
 * Character/4 ≈ tokens (good enough for "why is ctx already half full?").
 */
import fs from 'fs'
import path from 'path'

const user = process.env.USERPROFILE
const oc = path.join(user, '.openclaude')
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')

function chars(p) {
  try {
    return fs.readFileSync(p, 'utf8').length
  } catch {
    return 0
  }
}
function tok(n) {
  return Math.round(n / 4)
}

const claudeMd = chars(path.join(oc, 'CLAUDE.md'))
const settings = chars(path.join(oc, 'settings.json'))
const skillsDir = path.join(oc, 'skills')
const agentsDir = path.join(oc, 'agents')

let skillFront = 0
let skillCount = 0
let skillListing = 0
if (fs.existsSync(skillsDir)) {
  for (const name of fs.readdirSync(skillsDir)) {
    const skillMd = path.join(skillsDir, name, 'SKILL.md')
    if (!fs.existsSync(skillMd)) continue
    skillCount++
    const raw = fs.readFileSync(skillMd, 'utf8')
    skillFront += Math.min(raw.length, 800)
    // listing is usually name + description from frontmatter
    const desc = (raw.match(/^description:\s*(.+)$/m) || [])[1] || ''
    skillListing += name.length + desc.length + 8
  }
}

let agentFront = 0
let agentCount = 0
if (fs.existsSync(agentsDir)) {
  for (const f of fs.readdirSync(agentsDir).filter(x => x.endsWith('.md'))) {
    agentCount++
    const raw = fs.readFileSync(path.join(agentsDir, f), 'utf8')
    agentFront += Math.min(raw.length, 1200)
    const desc = (raw.match(/^description:\s*(.+)$/m) || [])[1] || ''
    skillListing += f.length + desc.length + 8
  }
}

// Repo CLAUDE.md also often loads as project instructions
const projectClaude = chars(path.join(root, 'CLAUDE.md'))
const projectLocal = chars(path.join(root, 'CLAUDE.local.md'))
const agentsMd = chars(path.join(root, 'AGENTS.md'))

const settingsJson = JSON.parse(
  fs.readFileSync(path.join(oc, 'settings.json'), 'utf8').replace(/^\uFEFF/, ''),
)
const ctx = Number(settingsJson.env?.OLLAMA_CONTEXT_LENGTH || 65536)
const auto = Number(settingsJson.env?.CLAUDE_CODE_AUTO_COMPACT_WINDOW || 53248)

// Built-in tools: OpenClaude ships many; schema payload is large (~8–20k tok typical)
const toolSchemaGuess = 12000
const systemBaseGuess = 4000
const reservedCompactGuess = 13000
const reservedOutputGuess = 8192

const memoryish =
  claudeMd + projectClaude + projectLocal + agentsMd + skillListing + Math.min(agentFront, 4000)
const estFixed = systemBaseGuess + toolSchemaGuess + tok(memoryish) + tok(skillFront) * 0.15

console.log('=== BASE CONTEXT ESTIMATE (before project work) ===')
console.log('skills_live', skillCount)
console.log('agents_live', agentCount)
console.log('CLAUDE.md_profile_chars', claudeMd, '~tok', tok(claudeMd))
console.log('CLAUDE.md_repo_chars', projectClaude, '~tok', tok(projectClaude))
console.log('CLAUDE.local.md_chars', projectLocal, '~tok', tok(projectLocal))
console.log('AGENTS.md_chars', agentsMd, '~tok', tok(agentsMd))
console.log('skill+agent_listing_chars', skillListing, '~tok', tok(skillListing))
console.log('settings_chars', settings)
console.log('')
console.log('window OLLAMA_CONTEXT_LENGTH', ctx)
console.log('auto_compact_window', auto)
console.log('reserved_output_guess', reservedOutputGuess)
console.log('reserved_compact_buffer_guess', reservedCompactGuess)
console.log('tool_schemas_guess', toolSchemaGuess)
console.log('system_base_guess', systemBaseGuess)
console.log('memory_instructions_est_tok', tok(memoryish))
console.log('')
console.log('est_content_before_chat_tok', Math.round(estFixed))
console.log(
  'est_%_of_64k',
  Math.round((estFixed / ctx) * 100) + '%',
)
console.log(
  'UI often adds reserved headroom — apparent % can look ~15–25 pts higher than chat history alone.',
)
console.log('')
console.log('If est_% is already high: slim CLAUDE.md, park more skills, or lower reserved waste.')
