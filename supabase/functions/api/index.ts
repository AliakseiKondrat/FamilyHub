// Family Hub personal API for Siri Shortcuts and the Scriptable widget.
// Auth: personal key (from Settings → Siri) as `key` in the JSON body / query, or `Authorization: Bearer <key>`.
//  POST|GET /api/add      { list: groceries|tasks|inbox, text }  → plain-text confirmation (Siri reads it out)
//  GET      /api/list     ?name=groceries|tasks                    → plain text, one item per line
//  GET      /api/summary                                           → JSON for the widget
import { createClient } from 'npm:@supabase/supabase-js@2'

type Role = 'a' | 'j'
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' }
const text = (s: string, status = 200) => new Response(s, { status, headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8' } })
const json = (o: unknown) => new Response(JSON.stringify(o), { headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } })

async function sha256(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

/* ---------- grocery categories (same stems as the app) ---------- */
const STEMS: Record<string, string[]> = {
  produce: ['яблок', 'банан', 'авокад', 'помидор', 'томат', 'огур', 'картош', 'картоф', 'лук', 'морков', 'капуст', 'салат', 'перец', 'лимон', 'апельсин', 'груш', 'виноград', 'ягод', 'клубник', 'зелен', 'укроп', 'петрушк', 'чеснок', 'гриб', 'кабач', 'брокол', 'apple', 'banana', 'avocado', 'tomato', 'cucumber', 'potato', 'onion', 'carrot', 'lettuce', 'pepper', 'lemon', 'orange', 'grape', 'berr', 'garlic', 'mushroom', 'broccoli', 'jabł', 'pomidor', 'ogór', 'ziemniak', 'cebul', 'marchew', 'sałat', 'papryk', 'cytryn', 'pomarańcz', 'czosn', 'grzyb', 'manzan', 'plátano', 'platano', 'aguacate', 'tomate', 'pepino', 'patata', 'cebolla', 'zanahoria', 'lechuga', 'pimiento', 'limón', 'naranja', 'uva', 'fresa', 'ajo', 'champiñ'],
  dairy: ['молок', 'кефир', 'сыр', 'творог', 'сметан', 'йогурт', 'масло слив', 'сливк', 'яйц', 'ряженк', 'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'egg', 'mleko', 'ser', 'jogurt', 'masło', 'śmietan', 'jaj', 'twaróg', 'kefir', 'leche', 'queso', 'yogur', 'mantequilla', 'nata', 'huevo'],
  meat: ['мяс', 'куриц', 'курин', 'говяд', 'свинин', 'фарш', 'колбас', 'сосиск', 'ветчин', 'рыб', 'лосос', 'креветк', 'тунец', 'бекон', 'chicken', 'beef', 'pork', 'mince', 'sausage', 'ham', 'fish', 'salmon', 'shrimp', 'prawn', 'tuna', 'bacon', 'mięso', 'kurczak', 'wołow', 'wieprz', 'kiełbas', 'szynk', 'ryb', 'łosoś', 'krewet', 'carne', 'pollo', 'ternera', 'cerdo', 'salchich', 'jamón', 'jamon', 'pescado', 'salmón', 'gamba', 'atún'],
  bakery: ['хлеб', 'батон', 'булк', 'багет', 'лаваш', 'круассан', 'bread', 'baguette', 'bun', 'croissant', 'tortilla', 'chleb', 'bułk', 'bagiet', 'pan ', 'barra', 'bollo', 'cruasán'],
  frozen: ['морожен', 'пельмен', 'заморож', 'ice cream', 'frozen', 'lody', 'mrożon', 'pierogi', 'helado', 'congelad'],
  drinks: ['вод', 'сок', 'пиво', 'вино', 'кола', 'чай', 'кофе', 'water', 'juice', 'beer', 'wine', 'cola', 'tea', 'coffee', 'woda', 'sok', 'piwo', 'wino', 'herbat', 'kaw', 'agua', 'zumo', 'cerveza', 'vino', 'té ', 'café'],
  pantry: ['рис', 'макарон', 'паст', 'гречк', 'мук', 'сахар', 'сол', 'масло олив', 'масло подсол', 'консерв', 'соус', 'кетчуп', 'майонез', 'специ', 'овсян', 'хлопь', 'шоколад', 'печень', 'rice', 'pasta', 'flour', 'sugar', 'salt', 'oil', 'sauce', 'ketchup', 'mayo', 'oat', 'cereal', 'chocolate', 'cookie', 'ryż', 'makaron', 'mąk', 'cukier', 'sól', 'olej', 'oliw', 'sos', 'płatki', 'czekolad', 'ciastk', 'arroz', 'harina', 'azúcar', 'sal ', 'aceite', 'salsa', 'avena', 'cereales', 'galleta'],
  household: ['бумаг', 'полотенц', 'мыл', 'шампун', 'порош', 'губк', 'пакет', 'салфет', 'зубн', 'средство', 'paper', 'towel', 'soap', 'shampoo', 'detergent', 'sponge', 'bags', 'tissue', 'toothpaste', 'papier', 'ręcznik', 'mydło', 'szampon', 'proszek', 'gąbk', 'worki', 'chusteczk', 'papel', 'toalla', 'jabón', 'champú', 'detergente', 'esponja', 'bolsas', 'pañuel'],
  pet: ['корм', 'лакомств', 'собак', 'пёс', 'пес', 'для честера', 'dog', 'pet food', 'treats', 'karma', 'pies', 'przysmak', 'pienso', 'perro', 'premios'],
}
function guessCategory(title: string) {
  const s = ' ' + title.toLowerCase() + ' '
  for (const cat of ['pet', 'household', 'produce', 'dairy', 'meat', 'bakery', 'frozen', 'drinks', 'pantry']) if (STEMS[cat].some((x) => s.includes(x))) return cat
  return 'other'
}

/* ---------- dates in the household's time zone ---------- */
function localToday(tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}`
}
const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }

/** "купить цветы завтра 18:00" → title, due, time (RU/EN/PL/ES), like the app's quick add. */
function parseQuick(input: string, today: string) {
  let s = ' ' + input + ' '
  let due: string | undefined, time: string | undefined
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => void) => { const m = s.match(re); if (m) { fn(m); s = s.replace(re, ' ') } }
  take(/\s(послезавтра|pojutrze|pasado mañana|pasado manana|day after tomorrow)\s/i, () => { due = addDays(today, 2) })
  take(/\s(завтра|tomorrow|jutro|mañana|manana)\s/i, () => { due = addDays(today, 1) })
  take(/\s(сегодня|today|dziś|dzis|dzisiaj|hoy)\s/i, () => { due = today })
  take(/\s(?:в|at|o|a las)?\s?([01]?\d|2[0-3])[:.]([0-5]\d)\s/i, (m) => { time = `${m[1].padStart(2, '0')}:${m[2]}` })
  if (time && !due) due = today
  return { title: s.replace(/\s+/g, ' ').trim(), due, time }
}

const visibleTo = (r: any, role: Role, today: string) =>
  (!r.private_to || r.private_to === role) && (r.surprise_for !== role || (!!r.reveal_at && r.reveal_at <= today))

/* ---------- handlers ---------- */
async function add(role: Role, list: string, input: string, tz: string, lang: string) {
  const today = localToday(tz)
  const base = () => ({ id: crypto.randomUUID(), createdBy: role, createdAt: new Date().toISOString() })
  const ru = lang === 'ru'
  if (list === 'groceries') {
    const items = input.split(/,|;|\n|\s+и\s+|\s+and\s+|\s+i\s+|\s+y\s+/i).map((x) => x.trim()).filter(Boolean)
    const { data: existing } = await sb.from('records').select('id,data').eq('collection', 'groceries').eq('deleted', false)
    const added: string[] = []
    for (const raw of items) {
      const title = raw[0].toUpperCase() + raw.slice(1)
      const ex = (existing ?? []).find((r) => String(r.data.title).toLowerCase() === title.toLowerCase())
      if (ex) await sb.from('records').update({ data: { ...ex.data, done: false } }).eq('id', ex.id)
      else { const b = base(); await sb.from('records').insert({ id: b.id, collection: 'groceries', created_by: role, data: { ...b, title, category: guessCategory(title), done: false } }) }
      added.push(title)
    }
    return (ru ? 'Добавлено в продукты: ' : 'Added to groceries: ') + added.join(', ')
  }
  if (list === 'tasks') {
    const p = parseQuick(input, today)
    const b = base()
    await sb.from('records').insert({ id: b.id, collection: 'tasks', created_by: role,
      data: { ...b, title: p.title || input, due: p.due, time: p.time, assignee: 'both', done: false, repeat: 'none' } })
    return (ru ? 'Задача добавлена: ' : 'Task added: ') + (p.title || input) + (p.due ? ` · ${p.due}${p.time ? ' ' + p.time : ''}` : '')
  }
  if (list === 'inbox') {
    const b = base()
    const url = input.match(/https?:\/\/\S+/)?.[0]
    await sb.from('records').insert({ id: b.id, collection: 'notes', created_by: role, data: { ...b, module: 'inbox', title: url ? input.replace(url, '').trim() || url : input, url } })
    return ru ? 'Сохранено во входящие' : 'Saved to inbox'
  }
  return ru ? 'Неизвестный список' : 'Unknown list'
}

async function summary(role: Role, tz: string) {
  const today = localToday(tz)
  const { data } = await sb.from('records').select('collection,data,private_to,surprise_for,reveal_at').eq('deleted', false).in('collection', ['groceries', 'tasks', 'events'])
  const rows = (data ?? []).filter((r) => visibleTo(r, role, today))
  const groceries = rows.filter((r) => r.collection === 'groceries' && !r.data.done).map((r) => r.data.title as string)
  const tasks = rows.filter((r) => r.collection === 'tasks' && !r.data.done && r.data.due && r.data.due <= today && (r.data.assignee === role || r.data.assignee === 'both'))
    .map((r) => ({ title: r.data.title, time: r.data.time ?? null, overdue: r.data.due < today })).sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'))
  const events = rows.filter((r) => r.collection === 'events' && r.data.date >= today && (r.data.who === role || r.data.who === 'both'))
    .map((r) => ({ title: r.data.title, date: r.data.date, time: r.data.time ?? null })).sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? ''))).slice(0, 5)
  return { today, tasks, events, groceries, counts: { tasks: tasks.length, groceries: groceries.length } }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const url = new URL(req.url)
  const route = url.pathname.split('/').pop()
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
  const key = body.key ?? url.searchParams.get('key') ?? req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!key) return text('missing key', 401)
  const { data: tok } = await sb.from('api_tokens').select('role').eq('token_hash', await sha256(key)).maybeSingle()
  if (!tok) return text('invalid key', 401)
  const role = tok.role as Role

  const { data: meta } = await sb.from('records').select('id,data').in('id', ['meta:settings', `meta:prefs:${role}`])
  const settings = meta?.find((m) => m.id === 'meta:settings')?.data ?? {}
  const lang = meta?.find((m) => m.id === `meta:prefs:${role}`)?.data?.lang ?? 'ru'
  const tz = settings.country === 'ES' ? 'Europe/Madrid' : 'Europe/Warsaw'

  if (route === 'add') {
    const list = body.list ?? url.searchParams.get('list') ?? 'groceries'
    const input = String(body.text ?? url.searchParams.get('text') ?? '').trim()
    if (!input) return text(lang === 'ru' ? 'Пустой текст' : 'Empty text', 400)
    return text(await add(role, list, input, tz, lang))
  }
  if (route === 'list') {
    const s = await summary(role, tz)
    const name = url.searchParams.get('name') ?? 'groceries'
    const items = name === 'tasks' ? s.tasks.map((x) => (x.time ? `${x.time} ${x.title}` : x.title)) : s.groceries
    return text(items.length ? items.join('\n') : (lang === 'ru' ? 'Список пуст' : 'The list is empty'))
  }
  if (route === 'summary') return json(await summary(role, tz))
  return text('not found', 404)
})
