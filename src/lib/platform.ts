import { useSyncExternalStore } from 'react'

// iPhone and Android differ in what the phone itself offers (Shortcuts vs MacroDroid, Find My vs Find Hub,
// Scriptable widget vs icon shortcuts). The choice belongs to this device, not to the synced account:
// one person may use the same account on an iPhone and a Pixel at once.
export type Platform = 'ios' | 'android'
export type PlatformChoice = 'auto' | Platform

const KEY = 'familyhub:platform'
const listeners = new Set<() => void>()

export const detectPlatform = (): Platform => (/android/i.test(navigator.userAgent) ? 'android' : 'ios')

export function getPlatformChoice(): PlatformChoice {
  try { const v = localStorage.getItem(KEY); return v === 'ios' || v === 'android' ? v : 'auto' } catch { return 'auto' }
}
export function setPlatformChoice(v: PlatformChoice) {
  try { if (v === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, v) } catch { /* ignore */ }
  listeners.forEach((l) => l())
}
const current = (): Platform => { const c = getPlatformChoice(); return c === 'auto' ? detectPlatform() : c }

export const usePlatform = () => useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l) } }, current)
export const usePlatformChoice = () => useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l) } }, getPlatformChoice)

/** Apple's Find My app, or Google's Find Hub (opens the app on Android when installed). */
export const findDeviceUrl = (p: Platform) => (p === 'android' ? 'https://www.google.com/android/find' : 'findmy://')
