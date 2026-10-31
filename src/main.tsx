import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { initSync } from './sync'
import './styles.css'

registerSW({ immediate: true })
initSync()

// Keyboard on iOS: instead of letting Safari push the whole app up, keep it pinned and
// tell the CSS how much room the keyboard takes (--kb), so sheets shrink above it.
const vv = window.visualViewport
if (vv) {
  const onViewport = () => {
    const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
    document.documentElement.style.setProperty('--kb', `${Math.round(kb)}px`)
    if (window.scrollY !== 0) window.scrollTo(0, 0)
  }
  vv.addEventListener('resize', onViewport)
  vv.addEventListener('scroll', onViewport)
}

// iOS 26 home-screen apps (black-translucent status bar): the box that position:fixed layers
// are sized against ends about a status-bar height short of the physical screen bottom, so a
// black strip shows below the app. window.innerHeight can still report the full height, so
// measure the real bottom edge of a fixed probe and let CSS stretch the layers by the
// difference (--vp-gap). Only when the window spans the whole screen (not iPad split view).
const standalone =
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
const probe = document.createElement('div')
probe.style.cssText = 'position:fixed;top:0;bottom:0;left:0;width:0;visibility:hidden;pointer-events:none'
document.documentElement.appendChild(probe)
const fitScreen = () => {
  let gap = 0
  if (standalone) {
    const sw = Math.min(screen.width, screen.height)
    const sh = Math.max(screen.width, screen.height)
    const portrait = window.innerHeight >= window.innerWidth
    const fullW = portrait ? sw : sh
    const fullH = portrait ? sh : sw
    const d = Math.round(fullH - probe.getBoundingClientRect().bottom)
    if (Math.abs(window.innerWidth - fullW) <= 1 && d > 0 && d < 160) gap = d
  }
  document.documentElement.style.setProperty('--vp-gap', `${gap}px`)
}
fitScreen()
window.addEventListener('resize', fitScreen)
window.addEventListener('pageshow', fitScreen)
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && setTimeout(fitScreen, 100))
setTimeout(fitScreen, 500)
window.addEventListener('orientationchange', () => setTimeout(fitScreen, 300))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
