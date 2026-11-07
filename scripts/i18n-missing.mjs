// Lists the UI strings each language still lacks compared with Russian (the complete reference).
//   node scripts/i18n-missing.mjs            → counts per language
//   node scripts/i18n-missing.mjs pl out.json → the missing Russian strings for one language, as JSON
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const src = readFileSync(new URL('../src/i18n.ts', import.meta.url), 'utf8')
const entry = /(?:^|[\s,{])('(?:[^'\\]|\\.)*'|[A-Za-z_]\w*)\s*:\s*('(?:[^'\\]|\\.)*')/g
const unq = (s) => (s.startsWith("'") ? s.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\') : s)

export function dicts() {
  const out = {}
  for (const m of src.matchAll(/const (\w\w)(?:: [^=]+)? = \{([\s\S]*?)\n\}/g)) {
    const d = {}
    for (const e of m[2].matchAll(entry)) d[unq(e[1])] = unq(e[2])
    out[m[1]] = d
  }
  return out
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
const d = isCli ? dicts() : null
const [lang, file] = isCli ? process.argv.slice(2) : []
if (!isCli) {
  // imported as a module: nothing to print
} else if (!lang) {
  for (const l of Object.keys(d)) console.log(l, Object.keys(d[l]).length, 'keys,', Object.keys(d.ru).filter((k) => !(k in d[l])).length, 'missing')
} else {
  const miss = Object.fromEntries(Object.keys(d.ru).filter((k) => !(k in (d[lang] ?? {}))).map((k) => [k, d.ru[k]]))
  writeFileSync(file, JSON.stringify(miss, null, 1))
  console.log(Object.keys(miss).length, 'missing for', lang)
}
