/**
 * Parse Desktop public-apis README into catalog.json (Desktop + this skill).
 *   node Skills/public-apis/build-catalog.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const skillDir = path.dirname(fileURLToPath(import.meta.url))
const catalogDir = path.join(process.env.USERPROFILE, 'Desktop', 'public-apis-master')
const readmePath = path.join(catalogDir, 'README.md')

if (!fs.existsSync(readmePath)) {
  console.error('Missing README.md at', readmePath)
  process.exit(1)
}

const raw = fs.readFileSync(readmePath, 'utf8')
const apis = []
let category = ''

function clean(s) {
  return String(s || '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function authNorm(s) {
  const v = clean(s).replace(/^`|`$/g, '')
  if (!v || /^no$/i.test(v)) return 'No'
  return v
}

function yesNo(s) {
  const v = clean(s)
  if (/^yes$/i.test(v)) return 'Yes'
  if (/^no$/i.test(v)) return 'No'
  return v || 'Unknown'
}

for (const line of raw.split(/\r?\n/)) {
  const heading = line.match(/^###\s+(.+?)\s*$/)
  if (heading) {
    category = heading[1].trim()
    continue
  }
  if (!/^\|/.test(line) || /^\|\s*:?-{3,}/.test(line) || /^\|\s*API\s*\|/i.test(line)) continue
  if (/APILayer/i.test(category) || category === 'Index') continue

  const m = line.match(
    /^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|(?:\s*([^|]*)\|)?/,
  )
  if (!m) continue

  const name = clean(m[1])
  const url = clean(m[2])
  const description = clean(m[3])
  const auth = authNorm(m[4])
  const https = yesNo(m[5])
  const cors = yesNo(m[6])
  if (!name || !url || !category) continue
  if (!description) continue
  if (!/^(Yes|No|Unknown)$/i.test(https)) continue
  if (!/https?:\/\//i.test(url) && !url.startsWith('www.')) continue

  apis.push({
    name,
    url,
    description,
    auth,
    https,
    cors,
    category,
  })
}

const seen = new Set()
const unique = apis.filter(a => {
  const key = `${a.category}::${a.name}::${a.url}`
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

const catalog = {
  source: 'https://github.com/public-apis/public-apis',
  readme: readmePath,
  generatedAt: new Date().toISOString(),
  count: unique.length,
  apis: unique,
}

const json = JSON.stringify(catalog, null, 2) + '\n'
const dests = [path.join(catalogDir, 'catalog.json'), path.join(skillDir, 'catalog.json')]
for (const dest of dests) {
  fs.writeFileSync(dest, json, 'utf8')
  console.log('[OK]', dest, unique.length, 'apis')
}

if (unique.length < 800) {
  console.error('Catalog too small — parser likely failed')
  process.exit(1)
}
