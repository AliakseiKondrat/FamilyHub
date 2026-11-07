// Family Hub × Telegram.
//  - { type: 'auth', initData }            from the mini app: sign in with Telegram → a one-time magic-link token
//  - { type: 'link', initData } + user JWT  from the mini app when already signed in: remember which Telegram user this is
//  - { type: 'setup' } + developer's JWT   point the bot's webhook here and add the «open app» menu button
//  - { type: 'linkCode' } + user JWT       a one-time code for t.me/<bot>?start=<code> (link Telegram to an existing account)
//  - { type: 'status' | 'unlink' } + JWT   is my Telegram linked / forget it
//  - { type: 'diag' } + developer's JWT    the bot's health: webhook, delivery errors, how many people are linked
//  - Telegram updates (webhook, secret header): /start, links and text → «where to save?» → a record in that section
// The bot token is read from the TELEGRAM_BOT_TOKEN secret; without it every call answers «not configured».
import { createClient } from 'npm:@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const APP_URL = 'https://aliakseikondrat.github.io/FamilyHub/'
const FN_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram`
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' }
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function botToken(): Promise<string | null> {
  const env = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (env) return env
  const { data } = await sb.rpc('get_app_secret', { secret_name: 'telegram_bot_token' })
  return (data as string) || null
}

/** The bot's @username (for t.me links), looked up once per cold start. */
let botUser: string | undefined
async function botName(token: string) {
  if (botUser === undefined) botUser = (await tg(token, 'getMe', {}).catch(() => null))?.result?.username ?? ''
  return botUser || null
}

const enc = new TextEncoder()
async function hmac(key: ArrayBuffer | Uint8Array, msg: string) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)))
}
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('')

/** Telegram's initData check: HMAC-SHA256 with key HMAC("WebAppData", bot token); fresh within a day. */
async function verifyInitData(initData: string, token: string) {
  const p = new URLSearchParams(initData)
  const hash = p.get('hash')
  if (!hash) return null
  p.delete('hash')
  const check = [...p.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n')
  const secret = await hmac(enc.encode('WebAppData'), token)
  if (hex(await hmac(secret, check)) !== hash) return null
  if (Date.now() / 1000 - Number(p.get('auth_date') ?? 0) > 86400) return null
  try { return JSON.parse(p.get('user') ?? 'null') as { id: number; first_name?: string; language_code?: string } | null } catch { return null }
}

/** A stable secret for the webhook header, derived from the bot token. */
const webhookSecret = async (token: string) => hex(await hmac(enc.encode('FamilyHubWebhook'), token)).slice(0, 48)

async function tg(token: string, method: string, body: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return r.json()
}

/* ---------- texts for the bot (the person's Telegram language) ---------- */
const TX: Record<string, Record<string, string>> = {
  ru: { start: 'Привет! Это Family Hub — общее приложение для пары 💞\nОткрой его кнопкой ниже. А ещё сюда можно присылать ссылки и заметки — я спрошу, куда их сохранить.', open: 'Открыть Family Hub', where: 'Куда сохранить?', saved: 'Сохранено: {s} ✓', notLinked: 'Сначала открой приложение кнопкой ниже и войди — тогда я буду знать, в чью пару сохранять.', linked: 'Готово! Telegram привязан к Family Hub ✓\nВ приложении (Настройки → Уведомления) можно выбрать, чтобы уведомления приходили сюда.', badCode: 'Ссылка устарела. Нажми «Привязать Telegram» в приложении ещё раз.', inbox: '📥 Входящие', tasks: '✅ Задачи', groceries: '🛒 Продукты', watch: '🍿 Смотреть', recipes: '🍳 Рецепты', wishes: '🎁 Вишлист', places: '💕 Места' },
  en: { start: "Hi! This is Family Hub — a shared app for couples 💞\nOpen it with the button below. You can also send me links and notes — I'll ask where to save them.", open: 'Open Family Hub', where: 'Where shall I save it?', saved: 'Saved: {s} ✓', notLinked: "First open the app with the button below and sign in — then I'll know whose couple to save to.", linked: 'Done! Telegram is linked to Family Hub ✓\nIn the app (Settings → Notifications) you can choose to get notifications here.', badCode: 'This link has expired. Tap «Link Telegram» in the app again.', inbox: '📥 Inbox', tasks: '✅ Tasks', groceries: '🛒 Groceries', watch: '🍿 Watch', recipes: '🍳 Recipes', wishes: '🎁 Wishlist', places: '💕 Places' },
  pl: { start: 'Cześć! To Family Hub — wspólna aplikacja dla par 💞\nOtwórz ją przyciskiem poniżej. Możesz też wysyłać mi linki i notatki — zapytam, gdzie je zapisać.', open: 'Otwórz Family Hub', where: 'Gdzie zapisać?', saved: 'Zapisano: {s} ✓', notLinked: 'Najpierw otwórz aplikację przyciskiem poniżej i zaloguj się — wtedy będę wiedzieć, do czyjej pary zapisywać.', linked: 'Gotowe! Telegram połączony z Family Hub ✓\nW aplikacji (Ustawienia → Powiadomienia) możesz wybrać, by powiadomienia przychodziły tutaj.', badCode: 'Link wygasł. Naciśnij „Połącz Telegram” w aplikacji jeszcze raz.', inbox: '📥 Skrzynka', tasks: '✅ Zadania', groceries: '🛒 Zakupy', watch: '🍿 Do obejrzenia', recipes: '🍳 Przepisy', wishes: '🎁 Lista życzeń', places: '💕 Miejsca' },
  es: { start: '¡Hola! Esto es Family Hub, una app compartida para parejas 💞\nÁbrela con el botón de abajo. También puedes enviarme enlaces y notas: te preguntaré dónde guardarlos.', open: 'Abrir Family Hub', where: '¿Dónde lo guardo?', saved: 'Guardado: {s} ✓', notLinked: 'Primero abre la app con el botón de abajo e inicia sesión; así sabré en qué pareja guardarlo.', linked: '¡Listo! Telegram está vinculado a Family Hub ✓\nEn la app (Ajustes → Notificaciones) puedes elegir recibir las notificaciones aquí.', badCode: 'El enlace ha caducado. Pulsa «Vincular Telegram» en la app otra vez.', inbox: '📥 Bandeja', tasks: '✅ Tareas', groceries: '🛒 Compra', watch: '🍿 Para ver', recipes: '🍳 Recetas', wishes: '🎁 Deseos', places: '💕 Sitios' },
  it: { start: "Ciao! Questo è Family Hub, l'app condivisa per le coppie 💞\nAprila con il pulsante qui sotto. Puoi anche mandarmi link e note: ti chiederò dove salvarli.", open: 'Apri Family Hub', where: 'Dove lo salvo?', saved: 'Salvato: {s} ✓', notLinked: "Prima apri l'app con il pulsante qui sotto e accedi: così saprò in quale coppia salvare.", linked: 'Fatto! Telegram è collegato a Family Hub ✓\nNell\'app (Impostazioni → Notifiche) puoi scegliere di ricevere qui le notifiche.', badCode: 'Il link è scaduto. Tocca «Collega Telegram» nell\'app di nuovo.', inbox: '📥 In arrivo', tasks: '✅ Attività', groceries: '🛒 Spesa', watch: '🍿 Da vedere', recipes: '🍳 Ricette', wishes: '🎁 Desideri', places: '💕 Posti' },
}
const tx = (lang?: string) => TX[(lang ?? 'ru').slice(0, 2)] ?? TX.en
const TARGETS = ['inbox', 'tasks', 'groceries', 'watch', 'recipes', 'wishes', 'places'] as const

/** The member behind a Telegram user: their linked email → membership. */
async function memberOf(tgId: number) {
  const { data: link } = await sb.from('tg_links').select('email').eq('tg_id', tgId).maybeSingle()
  const email = link?.email ?? `tg${tgId}@users.telegram.invalid`
  const { data: m } = await sb.from('members').select('role, household').ilike('email', email).maybeSingle()
  return m as { role: 'a' | 'j'; household: string } | null
}

/** Shape a record like the app does for each section. */
function recordFor(target: (typeof TARGETS)[number], text: string, role: 'a' | 'j') {
  const url = text.match(/https?:\/\/\S+/)?.[0]
  const title = (url ? text.replace(url, '').trim() : text.trim()).slice(0, 200) || url || '—'
  const base = { id: crypto.randomUUID(), createdBy: role, createdAt: new Date().toISOString() }
  switch (target) {
    case 'inbox': return { collection: 'notes', data: { ...base, module: 'inbox', title, url } }
    case 'places': return { collection: 'notes', data: { ...base, module: 'dates', title, url } }
    case 'tasks': return { collection: 'tasks', data: { ...base, title, assignee: 'both', done: false, repeat: 'none', notes: url } }
    case 'groceries': return { collection: 'groceries', data: { ...base, title, category: 'other', done: false } }
    case 'watch': return { collection: 'watch', data: { ...base, title, kind: 'movie', status: 'want', url } }
    case 'recipes': return { collection: 'recipes', data: { ...base, title, url, tags: [], ingredients: [], someday: true, cooked: 0 } }
    case 'wishes': return { collection: 'wishes', data: { ...base, title, url, owner: role, kind: 'gift' } }
  }
}

async function onUpdate(token: string, u: any) {
  if (u.message) {
    const m = u.message, from = m.from, t = tx(from?.language_code)
    const chat = m.chat.id
    const text: string = m.text ?? m.caption ?? ''
    await sb.from('tg_links').update({ chat_id: chat, updated_at: new Date().toISOString() }).eq('tg_id', from.id)
    const openBtn = { inline_keyboard: [[{ text: t.open, web_app: { url: APP_URL } }]] }
    const code = text.match(/^\/start\s+(L[A-Za-z0-9]{10,})/)?.[1]
    if (code) {
      // A one-time code from «Link Telegram» in the app: tie this chat to that member.
      const { data: c } = await sb.from('tg_codes').select('email, created_at').eq('code', code).maybeSingle()
      const fresh = c && Date.now() - Date.parse(c.created_at) < 15 * 60000
      if (fresh) {
        await sb.from('tg_links').delete().eq('email', c.email).neq('tg_id', from.id)
        await sb.from('tg_links').upsert({ tg_id: from.id, email: c.email, chat_id: chat, updated_at: new Date().toISOString() })
        await sb.from('tg_codes').delete().eq('code', code)
      }
      await tg(token, 'sendMessage', { chat_id: chat, text: fresh ? t.linked : t.badCode, reply_markup: openBtn })
      return
    }
    if (!text || text.startsWith('/start')) { await tg(token, 'sendMessage', { chat_id: chat, text: t.start, reply_markup: openBtn }); return }
    const member = await memberOf(from.id)
    if (!member) { await tg(token, 'sendMessage', { chat_id: chat, text: t.notLinked, reply_markup: openBtn }); return }
    const { data: p } = await sb.from('tg_pending').insert({ household: member.household, role: member.role, text: text.slice(0, 2000) }).select('id').single()
    const rows = [TARGETS.slice(0, 3), TARGETS.slice(3, 5), TARGETS.slice(5)].map((r) => r.map((k) => ({ text: t[k], callback_data: `s:${p!.id}:${k}` })))
    await tg(token, 'sendMessage', { chat_id: chat, text: t.where, reply_to_message_id: m.message_id, reply_markup: { inline_keyboard: rows } })
    return
  }
  if (u.callback_query) {
    const q = u.callback_query, t = tx(q.from?.language_code)
    const [, id, target] = String(q.data ?? '').split(':')
    const { data: p } = await sb.from('tg_pending').select('*').eq('id', id).maybeSingle()
    if (p && (TARGETS as readonly string[]).includes(target)) {
      const r = recordFor(target as (typeof TARGETS)[number], p.text, p.role)
      await sb.from('records').insert({ id: r.data.id, household: p.household, collection: r.collection, data: r.data, created_by: p.role })
      await sb.from('tg_pending').delete().eq('id', id)
      await tg(token, 'editMessageText', { chat_id: q.message.chat.id, message_id: q.message.message_id, text: t.saved.replace('{s}', t[target]) })
    }
    await tg(token, 'answerCallbackQuery', { callback_query_id: q.id })
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const token = await botToken()
  if (!token) return json({ error: 'not configured' }, 503)

  // Telegram's webhook calls carry the secret header.
  if (req.headers.get('x-telegram-bot-api-secret-token')) {
    if (req.headers.get('x-telegram-bot-api-secret-token') !== await webhookSecret(token)) return new Response('forbidden', { status: 403 })
    await onUpdate(token, await req.json().catch(() => ({})))
    return new Response('ok')
  }

  const body = await req.json().catch(() => ({}))
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''

  if (body.type === 'auth' || body.type === 'link') {
    const user = await verifyInitData(String(body.initData ?? ''), token)
    if (!user) return json({ error: 'bad initData' }, 401)
    if (body.type === 'link') {
      const { data: u } = await sb.auth.getUser(jwt)
      if (!u.user?.email) return json({ error: 'not signed in' }, 401)
      // In a private chat with the bot the chat id is the user's id: link the chat right away, no message needed.
      await sb.from('tg_links').delete().eq('email', u.user.email.toLowerCase()).neq('tg_id', user.id)
      await sb.from('tg_links').upsert({ tg_id: user.id, email: u.user.email.toLowerCase(), chat_id: user.id, updated_at: new Date().toISOString() })
      return json({ ok: true })
    }
    // Sign in with Telegram: a Supabase user per Telegram account, then a one-time magic-link token.
    const { data: link } = await sb.from('tg_links').select('email').eq('tg_id', user.id).maybeSingle()
    const email = link?.email ?? `tg${user.id}@users.telegram.invalid`
    if (!link) {
      await sb.auth.admin.createUser({ email, email_confirm: true, user_metadata: { telegram_id: user.id, name: user.first_name } }).catch(() => null)
      await sb.from('tg_links').upsert({ tg_id: user.id, email, chat_id: user.id, updated_at: new Date().toISOString() })
    }
    const { data, error } = await sb.auth.admin.generateLink({ type: 'magiclink', email })
    if (error || !data?.properties?.hashed_token) return json({ error: error?.message ?? 'no link' }, 500)
    return json({ token_hash: data.properties.hashed_token, name: user.first_name })
  }

  if (body.type === 'linkCode' || body.type === 'status' || body.type === 'unlink') {
    const { data: u } = await sb.auth.getUser(jwt)
    const email = u.user?.email?.toLowerCase()
    if (!email) return json({ error: 'not signed in' }, 401)
    const bot = await botName(token)
    if (body.type === 'unlink') { await sb.from('tg_links').delete().eq('email', email); return json({ ok: true, bot }) }
    if (body.type === 'status') {
      const { data } = await sb.from('tg_links').select('chat_id').eq('email', email).not('chat_id', 'is', null).limit(1)
      return json({ linked: !!data?.length, bot })
    }
    await sb.from('tg_codes').delete().lt('created_at', new Date(Date.now() - 3600000).toISOString())
    const code = 'L' + [...crypto.getRandomValues(new Uint8Array(12))].map((b) => 'abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 54]).join('')
    await sb.from('tg_codes').insert({ code, email })
    return json({ code, bot, url: bot ? `https://t.me/${bot}?start=${code}` : null })
  }

  if (body.type === 'setup' || body.type === 'diag') {
    // Developers only: the caller must be in a dev-tier household.
    const { data: u } = await sb.auth.getUser(jwt)
    const { data: m } = await sb.from('members').select('household').ilike('email', u.user?.email ?? '-').maybeSingle()
    const { data: h } = m ? await sb.from('households').select('tier').eq('id', m.household).maybeSingle() : { data: null }
    if (h?.tier !== 'dev') return json({ error: 'forbidden' }, 403)
    let set: { hook?: boolean; menu?: boolean; error?: string } = {}
    if (body.type === 'setup') {
      const hook = await tg(token, 'setWebhook', { url: FN_URL, secret_token: await webhookSecret(token), allowed_updates: ['message', 'callback_query'], drop_pending_updates: false })
      const menu = await tg(token, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'Family Hub', web_app: { url: APP_URL } } })
      await tg(token, 'setMyCommands', { commands: [{ command: 'start', description: 'Family Hub' }] })
      set = { hook: hook.ok, menu: menu.ok, error: hook.ok ? (menu.ok ? undefined : menu.description) : hook.description }
    }
    // Health: is the webhook ours, is Telegram failing to deliver, how many people the bot can write to.
    const [me, info] = await Promise.all([tg(token, 'getMe', {}), tg(token, 'getWebhookInfo', {})])
    const w = info.result ?? {}
    const { count: linked } = await sb.from('tg_links').select('tg_id', { count: 'exact', head: true }).not('chat_id', 'is', null)
    const mine = await sb.from('tg_links').select('chat_id').eq('email', (u.user?.email ?? '-').toLowerCase()).not('chat_id', 'is', null).limit(1)
    return json({
      ...set, bot: me.result?.username ?? null, webhook: w.url === FN_URL, webhookUrl: w.url ? new URL(w.url).host : null,
      pending: w.pending_update_count ?? 0, lastError: w.last_error_message ?? null,
      lastErrorAt: w.last_error_date ? new Date(w.last_error_date * 1000).toISOString() : null,
      linked: linked ?? 0, meLinked: !!mine.data?.length,
    })
  }

  return json({ error: 'unknown request' }, 400)
})
