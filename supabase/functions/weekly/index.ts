// «Country of the week» in our Telegram channel: every Monday the bot posts the «Around the world» country of
// that ISO week — flag, a tradition, a dish to cook together, a date idea and a button into the app.
//  - from pg_cron (header x-cron-key = vault secret weekly_key): posts once per week (app_config tg_weekly_last)
//  - { dry: true, date? } + developer's JWT: returns the text without posting (to check a week ahead)
// Texts and the week order: public/weekly.json on the site (scripts/weekly-build.mjs).
import { createClient } from 'npm:@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const APP_URL = 'https://aliakseikondrat.github.io/FamilyHub/'
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json' } })
const secret = async (name: string) => ((await sb.rpc('get_app_secret', { secret_name: name })).data as string | null) || null

function warsawToday() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}`
}
/** ISO week (Monday–Sunday), the same rule as the app's marathon. */
function isoWeek(iso: string) {
  const d = new Date(iso + 'T00:00:00Z')
  const monday = new Date(d); monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3)
  const year = d.getUTCFullYear()
  const week = 1 + Math.floor((d.getTime() - Date.UTC(year, 0, 1)) / 86400000 / 7)
  return { year, week, monday: monday.toISOString().slice(0, 10) }
}
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const day = (iso: string) => `${Number(iso.slice(8))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`
const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface Weekly { A: string[]; B: string[]; world: string; c: Record<string, { flag: string; name: string; fact: string; dish: string; idea: string }> }

async function postFor(date: string) {
  const w = isoWeek(date)
  const data: Weekly = await (await fetch(`${APP_URL}weekly.json?v=${w.year}-${w.week}`)).json()
  const code = w.week >= 53 ? data.world : (w.year % 2 === 0 ? data.A : data.B)[w.week - 1]
  const c = data.c[code]
  const range = `${day(w.monday)} – ${day(addDays(w.monday, 6))}`
  const text = [
    `🌍 <b>Страна недели: ${c.flag} ${esc(c.name)}</b>`,
    `<i>${range}</i>`,
    '',
    `✨ ${esc(c.fact)}`,
    `🍽 <b>Приготовьте вместе:</b> ${esc(c.dish)}`,
    `💕 <b>Идея свидания:</b> ${esc(c.idea)}`,
    '',
    `🏅 Выполняйте три задания дня каждый день недели в «Кругосветке» — и получите тему «${esc(c.name)}» с её флагом.`,
  ].join('\n')
  return { key: `${w.year}-W${w.week}`, code, text }
}

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}))
  const fromCron = !!req.headers.get('x-cron-key') && req.headers.get('x-cron-key') === await secret('weekly_key')
  if (!fromCron) {
    // Developers may preview any week (dry) or post by hand (force).
    const { data: u } = await sb.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', '') ?? '')
    const { data: m } = await sb.from('members').select('household').ilike('email', u.user?.email ?? '-').maybeSingle()
    const { data: h } = m ? await sb.from('households').select('tier').eq('id', m.household).maybeSingle() : { data: null }
    if (h?.tier !== 'dev') return json({ error: 'forbidden' }, 403)
  }
  const p = await postFor(typeof body.date === 'string' ? body.date : warsawToday())
  if (body.dry) return json(p)
  const { data: last } = await sb.from('app_config').select('value').eq('key', 'tg_weekly_last').maybeSingle()
  if ((last?.value as { key?: string } | null)?.key === p.key && !body.force) return json({ skipped: 'already posted', ...p })
  const { data: com } = await sb.from('app_config').select('value').eq('key', 'tg_community').maybeSingle()
  const chat = (com?.value as { id?: number } | null)?.id
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN') || await secret('telegram_bot_token')
  if (!chat || !token) return json({ error: 'no channel or bot' }, 503)
  const r = await (await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: p.text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: [[{ text: '💞 Открыть Family Hub', url: APP_URL }]] } }),
  })).json()
  if (r.ok) await sb.from('app_config').upsert({ key: 'tg_weekly_last', value: { key: p.key, code: p.code, message: r.result?.message_id, at: new Date().toISOString() }, updated_at: new Date().toISOString(), updated_by: 'weekly' })
  return json({ ok: !!r.ok, error: r.description, ...p })
})
