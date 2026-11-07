// Family Hub push notifications.
//  - { type: 'record', record }  from the records insert trigger: tell the partner about something new
//  - { type: 'tick' }            from pg_cron every 5 minutes: task/event reminders, the morning summary, love notes coming due
//  - { type: 'test' }            from the app (user JWT): send a test notification to the caller's devices
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type Role = 'a' | 'j'
type Row = { id: string; household?: string; collection: string; data: any; created_by: Role; private_to: Role | null; surprise_for: Role | null; reveal_at: string | null }

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const APP_URL = 'https://aliakseikondrat.github.io/FamilyHub/'
const other = (r: Role): Role => (r === 'a' ? 'j' : 'a')

let init: Promise<string> | null = null
async function setup() {
  const get = async (n: string) => (await sb.rpc('get_app_secret', { secret_name: n })).data as string
  const [pub, prv, cron] = await Promise.all([get('vapid_public'), get('vapid_private'), get('cron_secret')])
  webpush.setVapidDetails(APP_URL, pub, prv)
  return cron
}

/* ---------- texts ---------- */
const TX = {
  ru: { groceries: '🛒 {n}: в продукты', tasks: '✅ Новая задача от {n}', events: '📅 {n}: новое событие', music: '🎧 {n} делится треком',
    watch: '🍿 {n}: что посмотреть', notes: '📥 {n}: новая запись', expenses: '💸 {n}: новая трата', settle: '🤝 {n}: расчёт', photos: '📸 {n} добавил(а) фото',
    recipes: '🍳 {n}: новый рецепт', trips: '✈️ {n}: новая поездка', goals: '🐷 {n}: новая копилка', petRecords: '🐶 {n}: запись о питомце',
    remind: '⏰ Напоминание', soon: '📅 Через {m} мин', morning: '☀️ Доброе утро!', tasksN: 'задач', eventsN: 'событий', buyN: 'купить',
    pay: 'платёж', pet: 'питомец', mood2: '💙 {n} сейчас грустно', mood1: '💙 {n} сейчас тяжело', moodBody: 'Может, написать или обнять?', note: '💌 {n} пишет тебе', noteBody: 'Открой, чтобы прочитать', test: '🔔 Уведомления работают!', testBody: 'Так будут выглядеть напоминания Family Hub' },
  en: { groceries: '🛒 {n}: groceries', tasks: '✅ New task from {n}', events: '📅 {n}: new event', music: '🎧 {n} shared a song',
    watch: '🍿 {n}: something to watch', notes: '📥 {n}: new note', expenses: '💸 {n}: new expense', settle: '🤝 {n}: settled up', photos: '📸 {n} added photos',
    recipes: '🍳 {n}: new recipe', trips: '✈️ {n}: new trip', goals: '🐷 {n}: new savings goal', petRecords: '🐶 {n}: pet record',
    remind: '⏰ Reminder', soon: '📅 In {m} min', morning: '☀️ Good morning!', tasksN: 'tasks', eventsN: 'events', buyN: 'to buy',
    pay: 'payment', pet: 'pet', mood2: '💙 {n} feels sad right now', mood1: '💙 {n} is having a hard time', moodBody: 'Maybe send a message or a hug?', note: '💌 A note from {n}', noteBody: 'Open it to read', test: '🔔 Notifications work!', testBody: 'This is how Family Hub reminders will look' },
  pl: { groceries: '🛒 {n}: zakupy', tasks: '✅ Nowe zadanie od {n}', events: '📅 {n}: nowe wydarzenie', music: '🎧 {n} poleca utwór',
    watch: '🍿 {n}: do obejrzenia', notes: '📥 {n}: nowa notatka', expenses: '💸 {n}: nowy wydatek', settle: '🤝 {n}: rozliczenie', photos: '📸 {n} dodał(a) zdjęcia',
    recipes: '🍳 {n}: nowy przepis', trips: '✈️ {n}: nowa podróż', goals: '🐷 {n}: nowa skarbonka', petRecords: '🐶 {n}: wpis o pupilu',
    remind: '⏰ Przypomnienie', soon: '📅 Za {m} min', morning: '☀️ Dzień dobry!', tasksN: 'zadań', eventsN: 'wydarzeń', buyN: 'do kupienia',
    pay: 'płatność', pet: 'pupil', mood2: '💙 {n} jest teraz smutno', mood1: '💙 {n} ma teraz ciężko', moodBody: 'Może napisz albo przytul?', note: '💌 Liścik od: {n}', noteBody: 'Otwórz, aby przeczytać', test: '🔔 Powiadomienia działają!', testBody: 'Tak będą wyglądać przypomnienia Family Hub' },
  es: { groceries: '🛒 {n}: compra', tasks: '✅ Nueva tarea de {n}', events: '📅 {n}: nuevo evento', music: '🎧 {n} comparte una canción',
    watch: '🍿 {n}: algo para ver', notes: '📥 {n}: nueva nota', expenses: '💸 {n}: nuevo gasto', settle: '🤝 {n}: cuentas saldadas', photos: '📸 {n} añadió fotos',
    recipes: '🍳 {n}: nueva receta', trips: '✈️ {n}: nuevo viaje', goals: '🐷 {n}: nueva hucha', petRecords: '🐶 {n}: registro de mascota',
    remind: '⏰ Recordatorio', soon: '📅 En {m} min', morning: '☀️ ¡Buenos días!', tasksN: 'tareas', eventsN: 'eventos', buyN: 'por comprar',
    pay: 'pago', pet: 'mascota', mood2: '💙 {n} está triste ahora', mood1: '💙 {n} lo está pasando mal', moodBody: '¿Le escribes o le das un abrazo?', note: '💌 Una nota de {n}', noteBody: 'Ábrela para leerla', test: '🔔 ¡Las notificaciones funcionan!', testBody: 'Así se verán los recordatorios de Family Hub' },
  it: { groceries: '🛒 {n}: spesa', tasks: '✅ Nuova attività da {n}', events: '📅 {n}: nuovo evento', music: '🎧 {n} condivide una canzone',
    watch: '🍿 {n}: qualcosa da vedere', notes: '📥 {n}: nuova nota', expenses: '💸 {n}: nuova spesa', settle: '🤝 {n}: conti saldati', photos: '📸 {n} ha aggiunto foto',
    recipes: '🍳 {n}: nuova ricetta', trips: '✈️ {n}: nuovo viaggio', goals: '🐷 {n}: nuovo salvadanaio', petRecords: '🐶 {n}: nota sull\'animale',
    remind: '⏰ Promemoria', soon: '📅 Tra {m} min', morning: '☀️ Buongiorno!', tasksN: 'attività', eventsN: 'eventi', buyN: 'da comprare',
    pay: 'pagamento', pet: 'animale', mood2: '💙 {n} è triste in questo momento', mood1: '💙 {n} sta passando un momento difficile', moodBody: 'Magari un messaggio o un abbraccio?', note: '💌 Un biglietto da {n}', noteBody: 'Aprilo per leggerlo', test: '🔔 Le notifiche funzionano!', testBody: 'Così appariranno i promemoria di Family Hub' },
}
type Lang = keyof typeof TX
const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.split(`{${k}}`).join(String(x)), s)

/* ---------- shared data ---------- */
// Every couple (household) has its own settings, devices and records.
interface Ctx { hh: string; settings: any; prefs: Record<Role, any>; tz: string }
async function context(hh: string): Promise<Ctx> {
  const { data } = await sb.from('records').select('id,data').eq('household', hh).in('id', ['meta:settings', 'meta:prefs:a', 'meta:prefs:j'])
  const by = Object.fromEntries((data ?? []).map((r) => [r.id, r.data]))
  const settings = by['meta:settings'] ?? {}
  return { hh, settings, prefs: { a: by['meta:prefs:a'] ?? {}, j: by['meta:prefs:j'] ?? {} }, tz: settings.country === 'ES' ? 'Europe/Madrid' : 'Europe/Warsaw' }
}
const langOf = (c: Ctx, r: Role): Lang => (c.prefs[r]?.lang in TX ? c.prefs[r].lang : 'ru')
const notifyPrefs = (c: Ctx, r: Role) => ({ activity: true, reminders: true, morning: true, morningTime: '09:00', eventLead: 30, ...(c.prefs[r]?.prefs?.notify ?? {}) })
const nameOf = (c: Ctx, r: Role) => c.settings.users?.[r]?.name ?? (r === 'a' ? 'A' : 'J')

function localNow(tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date()).map((x) => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) }
}
const toMin = (hm: string) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m }
const visibleTo = (r: Row, role: Role, date: string) =>
  (!r.private_to || r.private_to === role) && (r.surprise_for !== role || (!!r.reveal_at && r.reveal_at <= date))

/** Mark a key as sent; false if it was sent before. */
async function once(key: string) {
  const { error } = await sb.from('push_log').insert({ key })
  return !error
}

async function sendTo(hh: string, role: Role, payload: { title: string; body?: string; tag?: string; url?: string }) {
  const { data: subs } = await sb.from('push_subscriptions').select('*').eq('household', hh).eq('role', role)
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ url: APP_URL, ...payload }), { TTL: 3600 })
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
    }
  }))
  return subs?.length ?? 0
}

/* ---------- new record → partner ---------- */
async function onRecord(rec: Row) {
  if (rec.id.startsWith('rec-')) return // booked recurring payments
  const hh = rec.household ?? 'h1'
  const c = await context(hh)
  const to = other(rec.created_by)
  const { date, minutes } = localNow(c.tz)
  if (!visibleTo(rec, to, date) || !notifyPrefs(c, to).activity) return
  const d = rec.data ?? {}
  if (d.example) return // starter examples for a new couple
  let key: keyof (typeof TX)['ru'] = rec.collection as any
  let body: string = d.title ?? ''
  switch (rec.collection) {
    case 'tasks': if (d.assignee !== to && d.assignee !== 'both') return; break
    case 'events': body = [d.title, d.date, d.time].filter(Boolean).join(' · '); break
    case 'music': body = `${d.title} — ${d.artist}`; break
    case 'expenses':
      if (!d.shared || d.income) return
      if (d.settlement) { key = 'settle'; body = `${d.amount} ${d.currency}` } else body = `${d.title} · ${d.amount} ${d.currency}`
      break
    case 'photos': body = ''; if (!(await once(`${hh}:photos:${to}:${date}:${Math.floor(minutes / 15)}`))) return; break
    case 'groceries': if (!(await once(`${hh}:gro:${to}:${date}:${Math.floor(minutes / 10)}`))) return; break
    case 'notes': case 'watch': case 'recipes': case 'trips': case 'goals': case 'petRecords': break
    case 'moods':
      // Only a sad or hard mood, only if the sender allows it, and at most once in three hours.
      if (d.value > 2 || c.settings.game?.moodAlerts === false) return
      if (!(await once(`${hh}:mood:${to}:${date}:${Math.floor(minutes / 180)}`))) return
      key = d.value === 1 ? 'mood1' : 'mood2'
      body = TX[langOf(c, to)].moodBody
      break
    default: return
  }
  // At most a few activity pushes per minute (protects against imports).
  let slot = false
  for (let i = 0; i < 3 && !slot; i++) slot = await once(`${hh}:rate:${to}:${date}:${minutes}:${i}`)
  if (!slot) return
  const tx = TX[langOf(c, to)]
  await sendTo(hh, to, { title: fill(tx[key] ?? tx.notes, { n: nameOf(c, rec.created_by) }), body, tag: `${rec.collection}-${rec.id}` })
}

/* ---------- reminders ---------- */
function occursOn(start: string, repeat: string, day: string) {
  if (day < start) return false
  const s = new Date(start + 'T00:00:00Z'), d = new Date(day + 'T00:00:00Z')
  switch (repeat) {
    case 'daily': return true
    case 'weekly': return Math.round((+d - +s) / 86400000) % 7 === 0
    case 'monthly': return s.getUTCDate() === d.getUTCDate()
    case 'yearly': return s.getUTCDate() === d.getUTCDate() && s.getUTCMonth() === d.getUTCMonth()
    default: return day === start
  }
}

async function tick() {
  const { data: hhs } = await sb.from('members').select('household')
  for (const hh of new Set((hhs ?? []).map((m) => m.household as string))) await tickHousehold(hh)
  // Keep the log small.
  await sb.from('push_log').delete().lt('sent_at', new Date(Date.now() - 3 * 86400000).toISOString())
}

async function tickHousehold(hh: string) {
  const c = await context(hh)
  const { date, minutes } = localNow(c.tz)
  // Anything whose moment fell within the last 15 minutes (cron runs every 5; `once` stops repeats).
  const due = (m: number) => m <= minutes && m > minutes - 15
  const { data } = await sb.from('records').select('id,collection,data,created_by,private_to,surprise_for,reveal_at')
    .eq('household', hh).eq('deleted', false).in('collection', ['tasks', 'events', 'petRecords', 'recurring', 'groceries', 'loveNotes'])
  const rows = (data ?? []) as Row[]
  // Love notes whose moment has come (within the last two days): one push to the person they're for.
  const nowIso = new Date().toISOString(), recent = new Date(Date.now() - 2 * 86400000).toISOString()
  for (const r of rows) {
    const d = r.data
    if (r.collection !== 'loveNotes' || !d?.to || !d.deliverAt || d.deliverAt > nowIso || d.deliverAt < recent) continue
    if (await once(`${hh}:note:${r.id}`)) {
      const tx = TX[langOf(c, d.to)]
      await sendTo(hh, d.to, { title: fill(tx.note, { n: nameOf(c, r.created_by) }), body: tx.noteBody, tag: r.id })
    }
  }
  for (const role of ['a', 'j'] as Role[]) {
    const np = notifyPrefs(c, role)
    const tx = TX[langOf(c, role)]
    const mine = rows.filter((r) => visibleTo(r, role, date))
    if (np.reminders) {
      for (const r of mine) {
        const d = r.data
        if (r.collection === 'tasks' && !d.done && d.due === date && d.time && (d.assignee === role || d.assignee === 'both') && due(toMin(d.time))) {
          if (await once(`${hh}:task:${r.id}:${date}:${d.time}:${role}`)) await sendTo(hh, role, { title: tx.remind, body: `${d.title} · ${d.time}`, tag: r.id })
        }
        if (r.collection === 'events' && d.time && (d.who === role || d.who === 'both') && occursOn(d.date, d.repeat ?? 'none', date) && due(toMin(d.time) - np.eventLead)) {
          if (await once(`${hh}:event:${r.id}:${date}:${role}`)) await sendTo(hh, role, { title: fill(tx.soon, { m: np.eventLead }), body: `${d.title} · ${d.time}`, tag: r.id })
        }
      }
    }
    if (np.morning && due(toMin(np.morningTime)) && await once(`${hh}:morning:${role}:${date}`)) {
      const tasks = mine.filter((r) => r.collection === 'tasks' && !r.data.done && r.data.due && r.data.due <= date && (r.data.assignee === role || r.data.assignee === 'both')).length
      const events = mine.filter((r) => r.collection === 'events' && occursOn(r.data.date, r.data.repeat ?? 'none', date)).length
      const buy = mine.filter((r) => r.collection === 'groceries' && !r.data.done).length
      const pets = mine.filter((r) => r.collection === 'petRecords' && r.data.nextDue === date).map((r) => r.data.title)
      const pays = mine.filter((r) => r.collection === 'recurring' && r.data.active && Number(date.slice(8)) === r.data.day).map((r) => r.data.title)
      const parts = [`${tx.tasksN}: ${tasks}`, `${tx.eventsN}: ${events}`, `${tx.buyN}: ${buy}`]
      if (pets.length) parts.push(`🐶 ${pets.join(', ')}`)
      if (pays.length) parts.push(`💳 ${pays.join(', ')}`)
      await sendTo(hh, role, { title: tx.morning, body: parts.join(' · '), tag: 'morning' })
    }
  }
}

/* ---------- entry ---------- */
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  init ??= setup()
  const cronSecret = await init
  const body = await req.json().catch(() => ({}))

  if (body.type === 'test') {
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    const { data: u } = await sb.auth.getUser(jwt)
    const { data: m } = await sb.from('members').select('role,household').ilike('email', u.user?.email ?? '-').maybeSingle()
    if (!m) return new Response('forbidden', { status: 403, headers: cors })
    const c = await context(m.household)
    const tx = TX[langOf(c, m.role)]
    const n = await sendTo(m.household, m.role, { title: tx.test, body: tx.testBody, tag: 'test' })
    return new Response(JSON.stringify({ sent: n }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  if (req.headers.get('x-cron-secret') !== cronSecret) return new Response('forbidden', { status: 403, headers: cors })
  if (body.type === 'record' && body.record) await onRecord(body.record)
  else if (body.type === 'tick') await tick()
  return new Response('ok', { headers: cors })
})
