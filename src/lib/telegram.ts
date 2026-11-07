import { supabase } from './supabase'
import { SUPABASE_URL } from '../config'

/*
 * Family Hub as a Telegram mini app: the same PWA code, opened from the bot's menu button.
 * Inside Telegram we load Telegram's script, expand to full height, follow its back button and haptics,
 * offer «Sign in with Telegram», and tell the bot which Telegram user is signed in (for «where to save?»).
 */

interface WebApp {
  initData: string
  ready(): void; expand(): void
  setHeaderColor(c: string): void; setBackgroundColor(c: string): void
  BackButton: { show(): void; hide(): void; onClick(f: () => void): void; offClick(f: () => void): void }
  HapticFeedback?: { impactOccurred(s: 'light' | 'medium'): void }
}
const w = window as Window & { Telegram?: { WebApp?: WebApp }; TelegramWebviewProxy?: unknown }

/** Opened from Telegram (it puts tgWebAppData in the address hash, or injects its webview proxy). */
export const inTelegram = () => /tgWebApp/.test(location.hash) || !!w.TelegramWebviewProxy || !!w.Telegram?.WebApp?.initData
export const webApp = () => w.Telegram?.WebApp

let loading: Promise<WebApp | undefined> | null = null
export function loadTelegram(): Promise<WebApp | undefined> {
  if (!inTelegram()) return Promise.resolve(undefined)
  loading ??= new Promise((resolve) => {
    if (w.Telegram?.WebApp) { resolve(w.Telegram.WebApp); return }
    const s = document.createElement('script')
    s.src = 'https://telegram.org/js/telegram-web-app.js'
    s.onload = () => {
      const app = w.Telegram?.WebApp
      app?.ready(); app?.expand()
      resolve(app)
    }
    s.onerror = () => resolve(undefined)
    document.head.appendChild(s)
  })
  return loading
}

/** Match Telegram's chrome to the app's background. */
export function paintTelegram(bg: string) {
  const app = webApp()
  if (!app || !bg) return
  try { app.setHeaderColor(bg); app.setBackgroundColor(bg) } catch { /* older clients */ }
}

/** Telegram's own back button while a screen is pushed. */
let backHandler: (() => void) | null = null
export function telegramBack(show: boolean) {
  const app = webApp()
  if (!app) return
  if (backHandler) app.BackButton.offClick(backHandler)
  if (show) { backHandler = () => history.back(); app.BackButton.onClick(backHandler); app.BackButton.show() }
  else { backHandler = null; app.BackButton.hide() }
}

export const telegramHaptic = () => { const h = webApp()?.HapticFeedback; if (h) { h.impactOccurred('light'); return true } return false }

const FN = `${SUPABASE_URL}/functions/v1/telegram`

/** «Sign in with Telegram»: the function checks Telegram's signature and hands back a one-time sign-in token. */
export async function telegramSignIn(): Promise<string | null> {
  const app = await loadTelegram()
  if (!app?.initData || !supabase) return 'Telegram'
  const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'auth', initData: app.initData }) })
    .then((x) => x.json()).catch(() => null)
  if (!r?.token_hash) return r?.error ?? 'Telegram'
  const { error } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: r.token_hash })
  return error?.message ?? null
}

/** Signed in inside Telegram: remember which Telegram user this is, so the bot saves into the right couple. */
export async function telegramLink() {
  const app = await loadTelegram()
  if (!app?.initData || !supabase) return
  const token = (await supabase.auth.getSession()).data.session?.access_token
  if (!token) return
  await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ type: 'link', initData: app.initData }) }).catch(() => null)
}

/** The bot's health as the developers see it. */
export interface BotDiag {
  bot?: string | null; webhook?: boolean; webhookUrl?: string | null; pending?: number; lastError?: string | null; lastErrorAt?: string | null
  linked?: number; meLinked?: boolean; hook?: boolean; menu?: boolean; error?: string
}
async function devCall(type: 'setup' | 'diag'): Promise<BotDiag> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  return fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` }, body: JSON.stringify({ type }) })
    .then((x) => x.json()).catch((e) => ({ error: String(e) }))
}
/** Developers: point the bot at the function and add the «Family Hub» menu button; answers with the bot's health. */
export const telegramSetup = () => devCall('setup')
export const telegramDiag = () => devCall('diag')

/* ---------- linking Telegram to an existing account (from the PWA) ---------- */
async function call<T>(type: string): Promise<T & { error?: string }> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (!token) return { error: 'not signed in' } as T & { error?: string }
  return fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ type }) })
    .then((x) => x.json()).catch((e) => ({ error: String(e) }))
}
/** Is my Telegram linked (a chat the bot can write to), and what's the bot called. error 'not configured' = no bot yet. */
export const telegramStatus = () => call<{ linked?: boolean; bot?: string | null }>('status')
/** A one-time link to the bot: opening it in Telegram ties that chat to me. */
export const telegramLinkCode = () => call<{ url?: string | null; bot?: string | null }>('linkCode')
export const telegramUnlink = () => call<{ ok?: boolean }>('unlink')
