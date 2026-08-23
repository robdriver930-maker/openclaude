/**
 * Restore MCP servers parked by snappy-local-5090.mjs
 */
import fs from 'fs'
import path from 'path'

const user = process.env.USERPROFILE
const settingsPath = path.join(user, '.openclaude', 'settings.json')
const ocjPath = path.join(user, '.openclaude.json')
const mcpBackupPath = path.join(user, '.openclaude', 'mcpServers.backup-speed.json')

function readJson(p) {
  let r = fs.readFileSync(p, 'utf8')
  if (r.charCodeAt(0) === 0xfeff) r = r.slice(1)
  return JSON.parse(r)
}
function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 4) + '\n', 'utf8')
}

if (!fs.existsSync(mcpBackupPath)) {
  console.log('NO_BACKUP', mcpBackupPath)
  process.exit(2)
}

const backup = readJson(mcpBackupPath)
const mcp = backup.mcpServers || backup
if (!mcp || typeof mcp !== 'object' || !Object.keys(mcp).length) {
  console.log('EMPTY_BACKUP')
  process.exit(3)
}

const settings = readJson(settingsPath)
settings.mcpServers = mcp
writeJson(settingsPath, settings)

if (fs.existsSync(ocjPath)) {
  const ocj = readJson(ocjPath)
  ocj.mcpServers = mcp
  writeJson(ocjPath, ocj)
}

console.log('OK restored', Object.keys(mcp).length, 'MCP servers')
console.log('Restart OpenClaude for them to connect.')
