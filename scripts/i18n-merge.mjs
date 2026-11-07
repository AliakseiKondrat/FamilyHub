// Merges translated strings from a JSON file into src/i18n.ts.
//   node scripts/i18n-merge.mjs pl scripts/i18n/pl.json   → adds the keys to the existing `pl` dictionary
//   node scripts/i18n-merge.mjs it scripts/i18n/it.json   → creates `const it` after the last dictionary if it doesn't exist yet
// Keys the dictionary already has are left alone; unknown keys (not in Russian) are rejected.
import { readFileSync, writeFileSync } from 'node:fs'
import { dicts } from './i18n-missing.mjs'

const [lang, file] = process.argv.slice(2)
if (!lang || !file) throw new Error('usage: node scripts/i18n-merge.mjs <lang> <file.json>')
const path = new URL('../src/i18n.ts', import.meta.url)
let src = readFileSync(path, 'utf8')
const all = dicts()
const ru = all.ru
const have = all[lang] ?? {}
const add = JSON.parse(readFileSync(file, 'utf8'))

// Russian is the reference: new keys start there. Every other language may only fill keys Russian has.
const isRu = lang === 'ru'
const unknown = isRu ? [] : Object.keys(add).filter((k) => !(k in ru))
if (unknown.length) throw new Error('keys not in ru: ' + unknown.join(', '))
// A placeholder must be one the code passes: Russian or English uses it. Ones both use are required.
const ph = (s) => new Set([...(s ?? '').matchAll(/\{(\w+)\}/g)].map((m) => m[1]))
for (const [k, v] of Object.entries(add)) {
  if (isRu) break
  const r = ph(ru[k]), e = ph(all.en?.[k] ?? ru[k]), got = ph(v)
  const extra = [...got].filter((p) => !r.has(p) && !e.has(p))
  const lost = [...r].filter((p) => e.has(p) && !got.has(p))
  if (extra.length || lost.length) throw new Error(`placeholders in ${k}: unknown {${extra}} missing {${lost}}`)
}

const esc = (s) => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
const keyOf = (k) => (/^[A-Za-z_]\w*$/.test(k) ? k : esc(k))
// Keep the Russian order so every dictionary reads the same way.
const lines = (isRu ? Object.keys(add) : Object.keys(ru)).filter((k) => k in add && !(k in have)).map((k) => `  ${keyOf(k)}: ${esc(add[k])},`)

const head = new RegExp(`const ${lang}(?:: [^=]+)? = \\{`)
if (head.test(src)) {
  const start = src.search(head)
  const end = src.indexOf('\n}', start)
  src = src.slice(0, end) + '\n' + lines.join('\n') + src.slice(end)
} else {
  const anchor = '\n/** Russian is complete'
  const at = src.indexOf(anchor)
  if (at < 0) throw new Error('anchor not found')
  src = src.slice(0, at) + `\nconst ${lang}: Partial<Dict> = {\n${lines.join('\n')}\n}\n` + src.slice(at)
}
// Windows can hold the file for a moment while the dev server reads it: retry briefly.
for (let i = 0; ; i++) {
  try { writeFileSync(path, src); break } catch (e) { if (i >= 5) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300) }
}
console.log(`${lang}: +${lines.length} keys`)
