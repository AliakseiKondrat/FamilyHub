import { useSyncExternalStore } from 'react'

// iPhone and Android differ in what the phone itself offers (Shortcuts vs MacroDroid, Find My vs Find Hub,
// Scriptable widget vs icon shortcuts). An iPad or a computer also gets the wide layout (sidebar, columns).
// The choice belongs to this device, not to the synced account: one person may use the same account on an
// iPhone, an iPad and a laptop at once.
export type Platform = 'ios' | 'android'
/** What this device is: picks the instructions (Platform) and the layout. */
export type Device = 'ios' | 'android' | 'ipad' | 'desktop'
export type PlatformChoice = 'auto' | Device

const KEY = 'familyhub:platform'
const DEVICES: Device[] = ['ios', 'android', 'ipad', 'desktop']
const listeners = new Set<() => void>()

/** iPadOS reports itself as a Mac, so a «Mac» with a touch screen is an iPad. */
export function detectDevice(): Device {
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'android'
  if (/ipad/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ipad'
  if (/iphone|ipod/i.test(ua)) return 'ios'
  return matchMedia('(pointer: fine)').matches ? 'desktop' : 'ios'
}
export const detectPlatform = (): Platform => (detectDevice() === 'android' ? 'android' : 'ios')

export function getPlatformChoice(): PlatformChoice {
  try { const v = localStorage.getItem(KEY) as Device | null; return v && DEVICES.includes(v) ? v : 'auto' } catch { return 'auto' }
}
export function setPlatformChoice(v: PlatformChoice) {
  try { if (v === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, v) } catch { /* ignore */ }
  listeners.forEach((l) => l())
}
const currentDevice = (): Device => { const c = getPlatformChoice(); return c === 'auto' ? detectDevice() : c }
/** Instructions follow the system: an iPad and a computer get the Apple ones (Shortcuts, Find My). */
const current = (): Platform => (currentDevice() === 'android' ? 'android' : 'ios')

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const usePlatform = () => useSyncExternalStore(subscribe, current)
export const useDevice = () => useSyncExternalStore(subscribe, currentDevice)
export const usePlatformChoice = () => useSyncExternalStore(subscribe, getPlatformChoice)

/** Apple's Find My app, or Google's Find Hub (opens the app on Android when installed). */
export const findDeviceUrl = (p: Platform) => (p === 'android' ? 'https://www.google.com/android/find' : 'findmy://')
