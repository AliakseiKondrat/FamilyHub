// Family Hub personal API for Siri Shortcuts and the Scriptable widget.
// Auth: personal key (from Settings → Siri) as `key` in the JSON body / query, or `Authorization: Bearer <key>`.
//  POST|GET /api/add      { list: groceries|tasks|inbox|music|watch|expense|status, text, ... }  → plain-text confirmation
//                         expense: amount, merchant, shared?  ·  status: event (code from Settings → Statuses), end?=1 — or text
//  GET      /api/list     ?name=groceries|tasks|events                         → plain text, one item per line
//  GET      /api/summary                                                       → JSON for the widget
//  GET      /api/meta     ?url=  (no key)                                      → link preview for Spotify/YouTube/Netflix/Apple TV
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

/* ---------- link previews (Spotify, YouTube, Netflix, Apple TV) ---------- */
const decode = (s?: string) => s?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const fetchHtml = async (url: string, lang = 'en') => (await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': lang } })).text()
async function ogTags(url: string) {
  return ogFromHtml(await fetchHtml(url))
}
function ogFromHtml(html: string) {
  const tags: Record<string, string> = {}
  for (const m of html.matchAll(/<meta\s+([^>]+?)\/?>/g)) {
    const attrs = Object.fromEntries([...m[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1].toLowerCase(), a[2]]))
    const k = attrs.property ?? attrs.name
    if (k && attrs.content && !tags[k]) tags[k] = decode(attrs.content)!
  }
  return tags
}
/**
 * Recipe from any cooking site: the schema.org Recipe that nearly every recipe page embeds as JSON-LD
 * (title, photo, ingredients, steps, time, servings), with the page's og: tags as a fallback.
 */
async function recipeMeta(url: string) {
  const html = await fetchHtml(url, 'ru,en;q=0.8,pl;q=0.6,es;q=0.5')
  const flat = (x: any): any[] => (!x ? [] : Array.isArray(x) ? x.flatMap(flat) : x['@graph'] ? flat(x['@graph']) : [x])
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap((m) => { try { return flat(JSON.parse(m[1].trim())) } catch { return [] } })
  const r = blocks.find((o) => [].concat(o?.['@type'] ?? []).includes('Recipe' as never))
  const og = ogFromHtml(html)
  const img = (i: any): string | undefined => (typeof i === 'string' ? i : Array.isArray(i) ? img(i[0]) : i?.url)
  const steps = (ins: any): string[] => !ins ? [] : typeof ins === 'string' ? ins.split(/\n+/).map((s) => s.trim()).filter(Boolean)
    : Array.isArray(ins) ? ins.flatMap(steps) : ins.itemListElement ? steps(ins.itemListElement) : ins.text ? [String(ins.text).trim()] : []
  const minutes = (d?: string) => { const m = d?.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/); return m ? (+(m[1] ?? 0)) * 1440 + (+(m[2] ?? 0)) * 60 + (+(m[3] ?? 0)) || undefined : undefined }
  const clean = (s: string) => decode(s.replace(/<[^>]+>/g, ''))!.replace(/\s+/g, ' ').trim()
  return {
    title: clean(r?.name ?? og['og:title'] ?? ''), image: img(r?.image) ?? og['og:image'],
    ingredients: ((r?.recipeIngredient ?? []) as string[]).map(clean).filter(Boolean),
    steps: steps(r?.recipeInstructions).map(clean).filter(Boolean),
    minutes: minutes(r?.totalTime ?? r?.cookTime), servings: r?.recipeYield ? String([].concat(r.recipeYield)[0]) : undefined,
    found: !!r,
  }
}

/** Title, picture and site name for any link, so a saved link shows as a picture, not a bare URL. */
async function previewMeta(url: string) {
  const special = await linkMeta(url).catch(() => null) // Spotify / YouTube / Netflix / Apple TV
  if (special?.title || special?.artwork) return { title: special.title, image: special.artwork, site: special.service }
  const html = await fetchHtml(url, 'ru,en;q=0.8,pl;q=0.6,es;q=0.5')
  const og = ogFromHtml(html)
  const title = og['og:title'] ?? og['twitter:title'] ?? decode(html.match(/<title[^>]*>([^<]*)/i)?.[1]?.trim())
  let image = og['og:image'] ?? og['og:image:url'] ?? og['twitter:image'] ?? og['twitter:image:src']
  try { if (image) image = new URL(image, url).href } catch { image = undefined }
  const site = og['og:site_name'] ?? new URL(url).hostname.replace(/^www\./, '')
  return { title: title?.replace(/\s+/g, ' ').trim(), image, site, description: og['og:description'] }
}

/** "Artist - Song (Official Video)" → { artist, title } */
function splitYoutubeTitle(t: string, channel?: string) {
  const clean = t.replace(/\s*[([](official|music|lyric|audio|video|hd|4k|remaster)[^)\]]*[)\]]/gi, '').trim()
  const m = clean.match(/^(.+?)\s+[-–—]\s+(.+)$/)
  return m ? { artist: m[1].trim(), title: m[2].trim() } : { artist: (channel ?? '').replace(/\s*-\s*Topic$/, ''), title: clean }
}

async function linkMeta(url: string) {
  const u = new URL(url)
  const h = u.hostname
  if (/spotify\.com$/.test(h)) {
    const parts = u.pathname.split('/').filter(Boolean).filter((p) => !p.startsWith('intl-'))
    const [type, id] = parts.slice(-2)
    const og = await ogTags(`https://open.spotify.com/${type}/${id}`)
    const desc = og['og:description'] ?? ''
    return { service: 'spotify', title: og['og:title'] ?? '', artist: desc.split(' · ')[0] ?? '', artwork: og['og:image'], url: `https://open.spotify.com/${type}/${id}`, embed: `https://open.spotify.com/embed/${type}/${id}` }
  }
  if (/youtube\.com$|youtu\.be$/.test(h)) {
    const id = h.endsWith('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v') ?? u.pathname.split('/').pop()
    const o = await (await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`)).json().catch(() => ({}))
    const { artist, title } = splitYoutubeTitle(o.title ?? '', o.author_name)
    return { service: 'youtube', title, artist, artwork: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, url: `https://www.youtube.com/watch?v=${id}`, embed: `https://www.youtube.com/embed/${id}`, rawTitle: o.title }
  }
  if (/netflix\.com$|tv\.apple\.com$/.test(h)) {
    const og = await ogTags(url)
    const title = (og['og:title'] ?? '').replace(/^(Watch|Смотреть|Ver|Oglądaj)\s+/i, '').replace(/\s*[|–-]\s*(Netflix|Apple TV\+?).*$/i, '').trim()
    return { service: h.includes('netflix') ? 'netflix' : 'appletv', title, artist: '', artwork: og['og:image'], url }
  }
  return null
}

/* ---------- Apple Pay / Wallet transactions ---------- */
const MERCHANT_CATS: [RegExp, string][] = [
  [/biedronka|lidl|żabka|zabka|carrefour|auchan|kaufland|mercadona|\bdia\b|aldi|netto|lewiatan|stokrotka|eroski|alcampo|spar|supermerc|market/i, 'groceries'],
  [/uber eats|glovo|wolt|pyszne|just ?eat|restaur|caf[eé]|coffee|starbucks|costa|mcdonald|kfc|burger|pizza|sushi|\bbar\b|bistro|telepizza/i, 'eating'],
  [/uber|bolt|free ?now|cabify|orlen|\bbp\b|shell|repsol|cepsa|circle k|parking|pkp|renfe|metro|jakdojade|ryanair|wizz|vueling|iberia|\blot\b/i, 'transport'],
  [/netflix|spotify|apple\.com|icloud|youtube|disney|hbo|prime video|playstation|xbox|chatgpt|openai|anthropic/i, 'subscriptions'],
  [/apteka|farmacia|pharm|rossmann|hebe|\bdm\b|clinic|dentist|medic/i, 'health'],
  [/maxi ?zoo|kakadu|tiendanimal|zooplus|\bpet\b|zoo\b|vet/i, 'pet'],
  [/ikea|leroy|castorama|\bobi\b|media ?markt|rtv|euro ?agd|el corte|zara home/i, 'home'],
  [/cinema|kino|\bcine\b|multikino|helios|teatr|museum|concert|ticketmaster|eventim/i, 'fun'],
  [/booking|airbnb|hotel|hostel/i, 'travel'],
]
/** "1 234,56 zł" / "€12.50" / "45,20" → 1234.56 / 12.5 / 45.2 */
function parseAmount(s: string) {
  const m = String(s).replace(/\s| /g, '').match(/\d+(?:[.,]\d{3})*(?:[.,]\d{1,2})?/)
  if (!m) return NaN
  // The last separator followed by 1–2 digits is the decimal point; any others group thousands.
  const dec = m[0].match(/^(.*)[.,](\d{1,2})$/)
  return parseFloat(dec ? `${dec[1].replace(/[.,]/g, '')}.${dec[2]}` : m[0].replace(/[.,]/g, ''))
}

const visibleTo = (r: any, role: Role, today: string) =>
  (!r.private_to || r.private_to === role) && (r.surprise_for !== role || (!!r.reveal_at && r.reveal_at <= today))

/* ---------- handlers ---------- */
type StatusPreset = { id: string; emoji: string; label: string; together?: boolean }
/** Used when the person's own list (synced from Settings → Statuses) lacks the code. */
const DEFAULT_STATUSES: StatusPreset[] = [
  { id: 'work', emoji: '💼', label: 'Работаю' }, { id: 'busy', emoji: '⛔️', label: 'Занят(а)' }, { id: 'free', emoji: '🟢', label: 'Свободен(на)' },
  { id: 'drive', emoji: '🚗', label: 'За рулём' }, { id: 'home', emoji: '🏠', label: 'Дома' }, { id: 'sport', emoji: '🏃', label: 'Спорт' },
  { id: 'shop', emoji: '🛒', label: 'В магазине' }, { id: 'sleep', emoji: '😴', label: 'Сплю' }, { id: 'rest', emoji: '🛋️', label: 'Отдыхаю' },
]

async function add(role: Role, list: string, input: string, tz: string, lang: string, body: any = {}, country = 'PL', presets?: StatusPreset[]) {
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
  if (list === 'music') {
    const url = input.match(/https?:\/\/\S+/)?.[0]
    const m = url ? await linkMeta(url).catch(() => null) : null
    const b = base()
    // Without a link, "Artist - Title" (or just a title) is accepted too.
    const fallback = splitYoutubeTitle(input)
    const track = m
      ? { title: m.title || fallback.title, artist: m.artist, artwork: m.artwork ?? '', url: m.url, embed: m.embed, service: m.service }
      : { title: fallback.title, artist: fallback.artist, url }
    await sb.from('records').insert({ id: b.id, collection: 'music', created_by: role, data: { ...b, ...track, likes: [] } })
    return (ru ? '🎧 Добавлено: ' : '🎧 Added: ') + [track.artist, track.title].filter(Boolean).join(' — ')
  }
  if (list === 'watch') {
    const url = input.match(/https?:\/\/\S+/)?.[0]
    const m = url ? await linkMeta(url).catch(() => null) : null
    const b = base()
    const title = (m?.service === 'youtube' ? (m as any).rawTitle : m?.title) || input.replace(url ?? '', '').trim() || url || input
    const service = m?.service ?? (url ? 'custom' : undefined)
    await sb.from('records').insert({ id: b.id, collection: 'watch', created_by: role, data: {
      ...b, title, kind: 'movie', status: 'want', links: url ? [{ service, url, label: service === 'custom' ? new URL(url).hostname.replace(/^www\./, '') : undefined }] : [],
      poster: m?.artwork,
    } })
    return (ru ? '🍿 В «Смотреть»: ' : '🍿 Added to watchlist: ') + title
  }
  if (list === 'expense') {
    // From the Wallet "Transaction" automation: amount + merchant; or plain text "45,20 Biedronka".
    const amount = parseAmount(body.amount ?? input)
    if (!(amount > 0)) return ru ? 'Не нашёл сумму' : 'No amount found'
    const merchant = String(body.merchant ?? input.replace(/[\d\s.,]+(zł|pln|eur|€|\$)?/gi, ' ')).trim() || (ru ? 'Покупка' : 'Purchase')
    const category = body.category ?? MERCHANT_CATS.find(([re]) => re.test(merchant))?.[1] ?? 'other'
    const shared = body.shared === undefined ? true : body.shared === true || body.shared === 'true' || body.shared === 'да'
    const b = base()
    await sb.from('records').insert({ id: b.id, collection: 'expenses', created_by: role, data: {
      ...b, title: merchant, amount, currency: country === 'ES' ? 'EUR' : 'PLN', category, paidBy: role, shared, date: today, source: 'wallet',
    } })
    return (ru ? '💸 Записано: ' : '💸 Saved: ') + `${merchant} · ${amount}`
  }
  if (list === 'status') {
    // From phone automations: event = a status code ("drive", "sleep"…) from the person's list in Settings → Statuses;
    // end = 1 clears it again, but only if it is still the status that event set. Plain text works too.
    const event = String(body.event ?? '').trim()
    const end = ['1', 'true', 'yes', 'да'].includes(String(body.end ?? '').toLowerCase()) || event === 'off'
    const { data: old } = await sb.from('records').select('id,data').in('collection', ['status', 'statuses']).eq('created_by', role).eq('deleted', false)
    if (end) {
      const ids = (old ?? []).filter((o) => event === 'off' || o.data.preset === event).map((o) => o.id)
      if (ids.length) await sb.from('records').update({ deleted: true }).in('id', ids)
      return ru ? '👋 Статус снят' : '👋 Status cleared'
    }
    const preset = event ? (presets ?? DEFAULT_STATUSES).find((p) => p.id === event) ?? DEFAULT_STATUSES.find((p) => p.id === event) : undefined
    if (event && !preset && !input) return ru ? `Нет статуса с кодом «${event}»` : `No status with code “${event}”`
    if (old?.length) await sb.from('records').update({ deleted: true }).in('id', old.map((o) => o.id))
    const b = base()
    await sb.from('records').insert({ id: b.id, collection: 'statuses', created_by: role, data: {
      ...b, text: preset?.label ?? input, emoji: preset?.emoji, preset: preset?.id, auto: true, at: new Date().toISOString(),
    } })
    return (ru ? 'Статус: ' : 'Status: ') + [preset?.emoji, preset?.label ?? input].filter(Boolean).join(' ')
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
  // Link preview for the app itself (no key; only for the supported services).
  if (route === 'meta') {
    const target = url.searchParams.get('url') ?? ''
    if (!/^https:\/\/([\w-]+\.)*(spotify\.com|youtube\.com|youtu\.be|netflix\.com|tv\.apple\.com)\//.test(target)) return json({ error: 'unsupported' })
    return json((await linkMeta(target).catch(() => null)) ?? { error: 'failed' })
  }
  // Recipe import and link previews for the app (signed-in members only).
  if (route === 'recipe' || route === 'preview') {
    const { data: u } = await sb.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', '') ?? '')
    if (!u.user) return text('forbidden', 403)
    const target = url.searchParams.get('url') ?? ''
    if (!/^https?:\/\//.test(target)) return json({ error: 'bad url' })
    return json(await (route === 'recipe' ? recipeMeta(target) : previewMeta(target)).catch((e) => ({ error: String(e) })))
  }
  const key = body.key ?? url.searchParams.get('key') ?? req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!key) return text('missing key', 401)
  const { data: tok } = await sb.from('api_tokens').select('role').eq('token_hash', await sha256(key)).maybeSingle()
  if (!tok) return text('invalid key', 401)
  const role = tok.role as Role

  const { data: meta } = await sb.from('records').select('id,data').in('id', ['meta:settings', `meta:prefs:${role}`])
  const settings = meta?.find((m) => m.id === 'meta:settings')?.data ?? {}
  const personal = meta?.find((m) => m.id === `meta:prefs:${role}`)?.data
  const lang = personal?.lang ?? 'ru'
  const tz = settings.country === 'ES' ? 'Europe/Madrid' : 'Europe/Warsaw'

  if (route === 'add') {
    // Query parameters work too, for apps that can only open a URL (Android automations, browser bookmarks).
    const args = { ...Object.fromEntries(url.searchParams), ...body }
    const list = args.list ?? 'groceries'
    const input = String(args.text ?? args.amount ?? '').trim()
    if (!input && !(list === 'status' && args.event)) return text(lang === 'ru' ? 'Пустой текст' : 'Empty text', 400)
    return text(await add(role, list, input, tz, lang, args, settings.country, personal?.prefs?.statusPresets))
  }
  if (route === 'list') {
    const s = await summary(role, tz)
    const name = url.searchParams.get('name') ?? 'groceries'
    const items = name === 'tasks' ? s.tasks.map((x) => (x.time ? `${x.time} ${x.title}` : x.title))
      : name === 'events' ? s.events.map((e) => `${e.date === s.today ? '' : e.date.slice(8) + '.' + e.date.slice(5, 7) + ' '}${e.time ?? ''} ${e.title}`.trim())
      : s.groceries
    return text(items.length ? items.join('\n') : (lang === 'ru' ? 'Список пуст' : 'The list is empty'))
  }
  if (route === 'summary') return json(await summary(role, tz))
  return text('not found', 404)
})
