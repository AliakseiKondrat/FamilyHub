// Builds public/weekly.json for the «Country of the week» post in our Telegram channel (supabase/functions/weekly):
// the week order of «Around the world» from src/lib/cultures.ts plus a tradition, a dish and a date idea per country
// from scripts/weekly-texts.json.   node scripts/weekly-build.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/lib/cultures.ts', import.meta.url), 'utf8')
const texts = JSON.parse(readFileSync(new URL('./weekly-texts.json', import.meta.url), 'utf8'))
const rows = [...src.matchAll(/\['([a-z-]+)', '([^']+)', '([^']+)'/g)].map((m) => ({ code: m[1], flag: m[2], name: m[3] }))
const A = rows.slice(0, 52), B = rows.slice(52, 104), world = rows.find((r) => r.code === 'world')
if (A.length !== 52 || B.length !== 52 || !world) throw new Error(`unexpected culture rows: ${rows.length}`)
const missing = rows.filter((r) => !texts[r.code]).map((r) => r.code)
if (missing.length) throw new Error('no texts for: ' + missing.join(', '))
const c = Object.fromEntries(rows.map((r) => { const [fact, dish, idea] = texts[r.code]; return [r.code, { flag: r.flag, name: r.name, fact, dish, idea }] }))
writeFileSync(new URL('../public/weekly.json', import.meta.url), JSON.stringify({ A: A.map((r) => r.code), B: B.map((r) => r.code), world: 'world', c }))
console.log('weekly.json:', rows.length, 'countries')
