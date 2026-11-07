// Family Hub push notifications.
//  - { type: 'record', record }  from the records insert trigger: tell the partner about something new
//  - { type: 'tick' }            from pg_cron every 5 minutes: task/event reminders, the morning summary, love notes coming due,
//                                 the Sunday-evening check-in reminder
//  - { type: 'test' }            from the app (user JWT): send a test notification to the caller's devices
// Each person picks where notifications go: the PWA (web push), the Telegram bot, or both. Telegram needs a linked chat;
// without one, notifications fall back to web push so nothing is lost.
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
    remind: '⏰ Напоминание', before: '🔔 Через {d} дн.', soon: '📅 Через {m} мин', morning: '☀️ Доброе утро!', tasksN: 'задач', eventsN: 'событий', buyN: 'купить',
    pay: 'платёж', pet: 'питомец', mood2: '💙 {n} сейчас грустно', mood1: '💙 {n} сейчас тяжело', moodBody: 'Может, написать или обнять?', note: '💌 {n} пишет тебе', noteBody: 'Открой, чтобы прочитать', ci: '📝 Как прошла ваша неделя?', ciBody: 'Чек-ин недели: 6 вопросов, меньше минуты', ciPartner: '📝 {n} ждёт твоих ответов', goalDone: '🎉 {n}: копилка собрана!', bdNew: '🎭 {n} готовит тебе сюрприз', bdNewBody: 'Свидание вслепую — загляни в «Мы»', bdHint: '💡 Подсказка к свиданию', bdOpen: '✉️ Пора вскрыть конверт!', bdOpenBody: 'Свидание начинается — открой «Мы»', test: '🔔 Уведомления работают!', testBody: 'Так будут выглядеть напоминания Family Hub' },
  en: { groceries: '🛒 {n}: groceries', tasks: '✅ New task from {n}', events: '📅 {n}: new event', music: '🎧 {n} shared a song',
    watch: '🍿 {n}: something to watch', notes: '📥 {n}: new note', expenses: '💸 {n}: new expense', settle: '🤝 {n}: settled up', photos: '📸 {n} added photos',
    recipes: '🍳 {n}: new recipe', trips: '✈️ {n}: new trip', goals: '🐷 {n}: new savings goal', petRecords: '🐶 {n}: pet record',
    remind: '⏰ Reminder', before: '🔔 In {d} days', soon: '📅 In {m} min', morning: '☀️ Good morning!', tasksN: 'tasks', eventsN: 'events', buyN: 'to buy',
    pay: 'payment', pet: 'pet', mood2: '💙 {n} feels sad right now', mood1: '💙 {n} is having a hard time', moodBody: 'Maybe send a message or a hug?', note: '💌 A note from {n}', noteBody: 'Open it to read', ci: '📝 How was your week?', ciBody: 'Weekly check-in: 6 questions, under a minute', ciPartner: '📝 {n} is waiting for your answers', goalDone: '🎉 {n}: savings goal reached!', bdNew: '🎭 {n} is planning a surprise for you', bdNewBody: 'A blind date — have a look in «Us»', bdHint: '💡 A hint for your date', bdOpen: '✉️ Time to open the envelope!', bdOpenBody: 'Your date is starting — open «Us»', test: '🔔 Notifications work!', testBody: 'This is how Family Hub reminders will look' },
  pl: { groceries: '🛒 {n}: zakupy', tasks: '✅ Nowe zadanie od {n}', events: '📅 {n}: nowe wydarzenie', music: '🎧 {n} poleca utwór',
    watch: '🍿 {n}: do obejrzenia', notes: '📥 {n}: nowa notatka', expenses: '💸 {n}: nowy wydatek', settle: '🤝 {n}: rozliczenie', photos: '📸 {n} dodał(a) zdjęcia',
    recipes: '🍳 {n}: nowy przepis', trips: '✈️ {n}: nowa podróż', goals: '🐷 {n}: nowa skarbonka', petRecords: '🐶 {n}: wpis o pupilu',
    remind: '⏰ Przypomnienie', before: '🔔 Za {d} dni', soon: '📅 Za {m} min', morning: '☀️ Dzień dobry!', tasksN: 'zadań', eventsN: 'wydarzeń', buyN: 'do kupienia',
    pay: 'płatność', pet: 'pupil', mood2: '💙 {n} jest teraz smutno', mood1: '💙 {n} ma teraz ciężko', moodBody: 'Może napisz albo przytul?', note: '💌 Liścik od: {n}', noteBody: 'Otwórz, aby przeczytać', ci: '📝 Jak minął wam tydzień?', ciBody: 'Podsumowanie tygodnia: 6 pytań, mniej niż minuta', ciPartner: '📝 {n} czeka na twoje odpowiedzi', goalDone: '🎉 {n}: cel osiągnięty!', bdNew: '🎭 {n} szykuje dla ciebie niespodziankę', bdNewBody: 'Randka w ciemno — zajrzyj do „My”', bdHint: '💡 Podpowiedź do randki', bdOpen: '✉️ Czas otworzyć kopertę!', bdOpenBody: 'Randka się zaczyna — otwórz „My”', test: '🔔 Powiadomienia działają!', testBody: 'Tak będą wyglądać przypomnienia Family Hub' },
  es: { groceries: '🛒 {n}: compra', tasks: '✅ Nueva tarea de {n}', events: '📅 {n}: nuevo evento', music: '🎧 {n} comparte una canción',
    watch: '🍿 {n}: algo para ver', notes: '📥 {n}: nueva nota', expenses: '💸 {n}: nuevo gasto', settle: '🤝 {n}: cuentas saldadas', photos: '📸 {n} añadió fotos',
    recipes: '🍳 {n}: nueva receta', trips: '✈️ {n}: nuevo viaje', goals: '🐷 {n}: nueva hucha', petRecords: '🐶 {n}: registro de mascota',
    remind: '⏰ Recordatorio', before: '🔔 En {d} días', soon: '📅 En {m} min', morning: '☀️ ¡Buenos días!', tasksN: 'tareas', eventsN: 'eventos', buyN: 'por comprar',
    pay: 'pago', pet: 'mascota', mood2: '💙 {n} está triste ahora', mood1: '💙 {n} lo está pasando mal', moodBody: '¿Le escribes o le das un abrazo?', note: '💌 Una nota de {n}', noteBody: 'Ábrela para leerla', ci: '📝 ¿Qué tal vuestra semana?', ciBody: 'Repaso de la semana: 6 preguntas, menos de un minuto', ciPartner: '📝 {n} espera tus respuestas', goalDone: '🎉 {n}: ¡meta conseguida!', bdNew: '🎭 {n} te prepara una sorpresa', bdNewBody: 'Una cita a ciegas: echa un vistazo en «Nosotros»', bdHint: '💡 Una pista para tu cita', bdOpen: '✉️ ¡Hora de abrir el sobre!', bdOpenBody: 'Empieza la cita: abre «Nosotros»', test: '🔔 ¡Las notificaciones funcionan!', testBody: 'Así se verán los recordatorios de Family Hub' },
  it: { groceries: '🛒 {n}: spesa', tasks: '✅ Nuova attività da {n}', events: '📅 {n}: nuovo evento', music: '🎧 {n} condivide una canzone',
    watch: '🍿 {n}: qualcosa da vedere', notes: '📥 {n}: nuova nota', expenses: '💸 {n}: nuova spesa', settle: '🤝 {n}: conti saldati', photos: '📸 {n} ha aggiunto foto',
    recipes: '🍳 {n}: nuova ricetta', trips: '✈️ {n}: nuovo viaggio', goals: '🐷 {n}: nuovo salvadanaio', petRecords: '🐶 {n}: nota sull\'animale',
    remind: '⏰ Promemoria', before: '🔔 Tra {d} giorni', soon: '📅 Tra {m} min', morning: '☀️ Buongiorno!', tasksN: 'attività', eventsN: 'eventi', buyN: 'da comprare',
    pay: 'pagamento', pet: 'animale', mood2: '💙 {n} è triste in questo momento', mood1: '💙 {n} sta passando un momento difficile', moodBody: 'Magari un messaggio o un abbraccio?', note: '💌 Un biglietto da {n}', noteBody: 'Aprilo per leggerlo', ci: '📝 Com\'è andata la vostra settimana?', ciBody: 'Check-in della settimana: 6 domande, meno di un minuto', ciPartner: '📝 {n} aspetta le tue risposte', goalDone: '🎉 {n}: obiettivo raggiunto!', bdNew: '🎭 {n} ti prepara una sorpresa', bdNewBody: 'Un appuntamento al buio: guarda in «Noi»', bdHint: '💡 Un indizio per l\'appuntamento', bdOpen: '✉️ È ora di aprire la busta!', bdOpenBody: 'L\'appuntamento sta per iniziare: apri «Noi»', test: '🔔 Le notifiche funzionano!', testBody: 'Così appariranno i promemoria di Family Hub' },
}
type Lang = keyof typeof TX
const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.split(`{${k}}`).join(String(x)), s)

/* ---------- shared data ---------- */
// Every couple (household) has its own settings, devices and records.
interface Ctx { hh: string; settings: any; prefs: Record<Role, any>; tz: string }
const ctxCache = new Map<string, { at: number; c: Promise<Ctx> }>()
/** Settings change rarely; a warm function reuses them for a minute. */
function contextCached(hh: string) {
  const hit = ctxCache.get(hh)
  if (hit && Date.now() - hit.at < 60000) return hit.c
  return context(hh)
}
async function context(hh: string): Promise<Ctx> {
  const { data } = await sb.from('records').select('id,data').eq('household', hh).in('id', ['meta:settings', 'meta:prefs:a', 'meta:prefs:j'])
  const by = Object.fromEntries((data ?? []).map((r) => [r.id, r.data]))
  const settings = by['meta:settings'] ?? {}
  const c: Ctx = { hh, settings, prefs: { a: by['meta:prefs:a'] ?? {}, j: by['meta:prefs:j'] ?? {} }, tz: settings.country === 'ES' ? 'Europe/Madrid' : 'Europe/Warsaw' }
  ctxCache.set(hh, { at: Date.now(), c: Promise.resolve(c) })
  return c
}
const langOf = (c: Ctx, r: Role): Lang => (c.prefs[r]?.lang in TX ? c.prefs[r].lang : 'ru')
const notifyPrefs = (c: Ctx, r: Role) => ({ activity: true, reminders: true, morning: true, morningTime: '09:00', eventLead: 30, channel: 'push' as 'push' | 'tg' | 'both', ...(c.prefs[r]?.prefs?.notify ?? {}) })
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

/* ---------- Telegram as a notification channel ---------- */
let tgTok: string | null = null
/** The bot token (remembered once found, so adding the secret later works without a restart). */
async function tgToken() {
  tgTok ||= Deno.env.get('TELEGRAM_BOT_TOKEN') || ((await sb.rpc('get_app_secret', { secret_name: 'telegram_bot_token' })).data as string) || null
  return tgTok
}
const OPEN: Record<string, string> = { ru: 'Открыть Family Hub', en: 'Open Family Hub', pl: 'Otwórz Family Hub', es: 'Abrir Family Hub', it: 'Apri Family Hub' }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The person's Telegram chat, if they linked one. */
async function chatOf(hh: string, role: Role): Promise<number | null> {
  const { data: m } = await sb.from('members').select('email').eq('household', hh).eq('role', role).maybeSingle()
  if (!m?.email) return null
  const { data } = await sb.from('tg_links').select('chat_id').ilike('email', m.email).not('chat_id', 'is', null).order('updated_at', { ascending: false }).limit(1)
  return (data?.[0]?.chat_id as number) ?? null
}

async function sendTelegram(hh: string, role: Role, lang: string, p: { title: string; body?: string }) {
  const token = await tgToken()
  const chat = token ? await chatOf(hh, role) : null
  if (!token || !chat) return 0
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, parse_mode: 'HTML', text: `<b>${esc(p.title)}</b>${p.body ? `\n${esc(p.body)}` : ''}`,
      reply_markup: { inline_keyboard: [[{ text: OPEN[lang] ?? OPEN.en, web_app: { url: APP_URL } }]] } }),
  }).catch(() => null)
  return r?.ok ? 1 : 0
}

/** Deliver to the person through the channel they chose (Settings → Notifications). */
async function sendTo(hh: string, role: Role, payload: { title: string; body?: string; tag?: string; url?: string }) {
  const c = await contextCached(hh)
  const channel = notifyPrefs(c, role).channel ?? 'push'
  let n = 0
  if (channel !== 'push') n += await sendTelegram(hh, role, langOf(c, role), payload)
  // Web push for «push» and «both», and as a fallback when Telegram isn't linked.
  if (channel !== 'tg' || n === 0) n += await sendPush(hh, role, payload)
  return n
}

async function sendPush(hh: string, role: Role, payload: { title: string; body?: string; tag?: string; url?: string }) {
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
    case 'events': if (d.blindId) return; body = [d.title, d.date, d.time].filter(Boolean).join(' · '); break
    case 'blindDates': key = 'bdNew'; body = TX[langOf(c, to)].bdNewBody; break
    case 'acts': if (d.kind !== 'goal' || !String(d.ref).endsWith(':reached')) return; key = 'goalDone'; body = d.label ?? ''; break
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
    .eq('household', hh).eq('deleted', false).in('collection', ['tasks', 'events', 'petRecords', 'recurring', 'groceries', 'loveNotes', 'checkins', 'blindDates'])
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
  // Blind dates: hints as they open, then «time to open the envelope» — only to the person it's for.
  for (const r of rows) {
    const d = r.data
    if (r.collection !== 'blindDates' || !d?.to || d.rating) continue
    const tx = TX[langOf(c, d.to)]
    for (const [i, h] of (d.hints ?? []).entries()) {
      if (h.at <= nowIso && h.at >= recent && await once(`${hh}:bdhint:${r.id}:${i}`)) await sendTo(hh, d.to, { title: tx.bdHint, body: h.text, tag: `${r.id}-h${i}` })
    }
    if (d.when <= nowIso && d.when >= recent && await once(`${hh}:bdopen:${r.id}`)) await sendTo(hh, d.to, { title: tx.bdOpen, body: tx.bdOpenBody, tag: r.id })
  }
  for (const role of ['a', 'j'] as Role[]) {
    const np = notifyPrefs(c, role)
    const tx = TX[langOf(c, role)]
    const mine = rows.filter((r) => visibleTo(r, role, date))
    if (np.reminders) {
      for (const r of mine) {
        const d = r.data
        // «Remind N days before»: at 9:00 that many days ahead of the date.
        if (r.collection === 'tasks' && !d.done && d.due && d.remindBefore > 0 && (d.assignee === role || d.assignee === 'both') && due(toMin('09:00'))
          && new Date(Date.parse(d.due + 'T00:00:00Z') - d.remindBefore * 86400000).toISOString().slice(0, 10) === date) {
          if (await once(`${hh}:before:${r.id}:${d.due}:${role}`)) await sendTo(hh, role, { title: fill(tx.before, { d: d.remindBefore }), body: d.title, tag: `${r.id}-before` })
        }
        if (r.collection === 'tasks' && !d.done && d.due === date && d.time && (d.assignee === role || d.assignee === 'both') && due(toMin(d.time))) {
          if (await once(`${hh}:task:${r.id}:${date}:${d.time}:${role}`)) await sendTo(hh, role, { title: tx.remind, body: `${d.title} · ${d.time}`, tag: r.id })
        }
        if (r.collection === 'events' && d.time && (d.who === role || d.who === 'both') && occursOn(d.date, d.repeat ?? 'none', date) && due(toMin(d.time) - np.eventLead)) {
          if (await once(`${hh}:event:${r.id}:${date}:${role}`)) await sendTo(hh, role, { title: fill(tx.soon, { m: np.eventLead }), body: `${d.title} · ${d.time}`, tag: r.id })
        }
      }
    }
    // Sunday 19:00: remind whoever hasn't done this week's check-in (gently, once).
    const day = new Date(date + 'T00:00:00Z')
    if (np.reminders && day.getUTCDay() === 0 && c.settings.game?.enabled !== false && due(toMin('19:00'))) {
      const monday = new Date(day.getTime() - 6 * 86400000).toISOString().slice(0, 10)
      const answered = (r: Role) => rows.some((x) => x.collection === 'checkins' && x.data?.week === monday && x.created_by === r)
      if (!answered(role) && await once(`${hh}:checkin:${role}:${monday}`)) {
        await sendTo(hh, role, answered(other(role))
          ? { title: fill(tx.ciPartner, { n: nameOf(c, other(role)) }), body: tx.ciBody, tag: 'checkin' }
          : { title: tx.ci, body: tx.ciBody, tag: 'checkin' })
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
