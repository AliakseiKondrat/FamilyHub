import { supabase } from './supabase'
import { getState } from '../store'

// Public half of the VAPID pair; the private half lives in Supabase Vault.
const VAPID_PUBLIC = 'BDWvLX3hqXLAEc6VIj9x-yUuUMphrSugUCLyRx4Tv7VDekEHtWtlTv-dql2wYRCoghOuRlc59yN8YgYvqZb5j7M'

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export type PushSupport = 'ok' | 'needs-install' | 'unsupported'
export function pushSupport(): PushSupport {
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) return 'ok'
  // iPhone/iPad only offer web push to apps added to the Home Screen.
  return isIOS() && !standalone() ? 'needs-install' : 'unsupported'
}

export async function pushStatus(): Promise<'on' | 'off' | 'denied'> {
  if (pushSupport() !== 'ok') return 'off'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'on' : 'off'
}

function keyBytes(b64: string) {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

/** Ask permission (must run from a tap), subscribe this device and register it for the current person. */
export async function enablePush() {
  if ((await Notification.requestPermission()) !== 'granted') return false
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) })
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  if (supabase) {
    const { error } = await supabase.from('push_subscriptions').upsert({
      endpoint: j.endpoint, role: getState().me, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent.slice(0, 200),
    })
    if (error) throw error
  }
  return true
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await supabase?.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

/** Server round trip in synced mode; a local notification in demo mode. */
export async function testPush(title: string, body: string) {
  if (supabase) {
    const { error } = await supabase.functions.invoke('push', { body: { type: 'test' } })
    if (error) throw error
    return
  }
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification(title, { body, icon: 'icons/icon-192.png' })
}
