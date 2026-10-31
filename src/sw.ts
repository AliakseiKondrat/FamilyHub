/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

// Offline app shell.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
self.skipWaiting()
clientsClaim()

// Push from the "push" edge function: { title, body, tag, url }.
self.addEventListener('push', (event) => {
  const data = (() => { try { return event.data?.json() ?? {} } catch { return { title: event.data?.text() } } })()
  event.waitUntil(self.registration.showNotification(data.title ?? 'Family Hub', {
    body: data.body ?? '',
    tag: data.tag,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    data: { url: data.url ?? self.registration.scope },
  }))
})

// Tapping a notification focuses the open app or opens it.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? self.registration.scope
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = all.find((c) => c.url.startsWith(self.registration.scope))
    if (open) return open.focus()
    return self.clients.openWindow(url)
  })())
})
