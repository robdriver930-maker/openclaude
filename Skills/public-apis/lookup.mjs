/**
 * Search the local public-apis catalog.
 *   node lookup.mjs weather
 *   node lookup.mjs --https --auth none maps
 *   node lookup.mjs --category Animals
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const skillDir = path.dirname(fileURLToPath(import.meta.url))
const desktopCatalog = path.join(
  process.env.USERPROFILE,
  'Desktop',
  'public-apis-master',
  'catalog.json',
)
const skillCatalog = path.join(skillDir, 'catalog.json')
const catalogPath = fs.existsSync(desktopCatalog) ? desktopCatalog : skillCatalog

if (!fs.existsSync(catalogPath)) {
  console.error('No catalog.json. Run: node Skills\\public-apis\\build-catalog.mjs')
  process.exit(1)
}

const args = process.argv.slice(2)
const positional = []
let categoryFilter = ''
let httpsOnly = false
let corsYes = false
let authNone = false

for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--https') {
    httpsOnly = true
    continue
  }
  if (a === '--cors') {
    corsYes = true
    continue
  }
  if (a === '--category') {
    categoryFilter = String(args[++i] || '')
      .trim()
      .toLowerCase()
    continue
  }
  if (a === '--auth') {
    const v = String(args[++i] || 'none').toLowerCase()
    authNone = v === 'none' || v === 'no'
    continue
  }
  if (a.startsWith('--')) continue
  positional.push(a)
}

const query = positional.join(' ').trim().toLowerCase()
const terms = query.split(/\s+/).filter(Boolean)
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))

function score(api) {
  const hay = `${api.name} ${api.description} ${api.category}`.toLowerCase()
  if (categoryFilter && !api.category.toLowerCase().includes(categoryFilter)) return 0
  if (httpsOnly && api.https !== 'Yes') return 0
  if (corsYes && api.cors !== 'Yes') return 0
  if (authNone && api.auth !== 'No') return 0
  if (terms.length === 0) return categoryFilter ? 1 : 0
  let n = 0
  for (const t of terms) {
    if (api.name.toLowerCase() === t) n += 8
    else if (api.name.toLowerCase().includes(t)) n += 5
    else if (api.category.toLowerCase().includes(t)) n += 3
    else if (hay.includes(t)) n += 2
    else return 0
  }
  if (api.https === 'Yes') n += 0.4
  if (api.auth === 'No') n += 0.3
  if (api.cors === 'Yes') n += 0.2
  return n
}

const hits = catalog.apis
  .map(api => ({ api, n: score(api) }))
  .filter(x => x.n > 0)
  .sort((a, b) => b.n - a.n)
  .slice(0, 12)

if (hits.length === 0) {
  console.log('NO_MATCH', query || categoryFilter || '(empty)')
  console.log('Tip: node lookup.mjs weather   or   node lookup.mjs --category Weather')
  process.exit(2)
}

console.log(`FOUND ${hits.length} / ${catalog.count}   catalog=${catalogPath}`)
for (const { api } of hits) {
  console.log(
    `${api.name}\t${api.category}\tauth=${api.auth}\thttps=${api.https}\tcors=${api.cors}\t${api.url}\t${api.description}`,
  )
}
