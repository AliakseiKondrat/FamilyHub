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

// iOS home-screen apps: the layout viewport can end short of the physical screen bottom,
// leaving a black strip under fixed full-screen layers. Measure the gap so CSS can stretch
// them down to the real screen edge (--vp-gap). Only when the window spans the full screen.
const standalone =
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
const fitScreen = () => {
  let gap = 0
  if (standalone) {
    const sw = Math.min(screen.width, screen.height)
    const sh = Math.max(screen.width, screen.height)
    const portrait = window.innerHeight >= window.innerWidth
    const fullW = portrait ? sw : sh
    const fullH = portrait ? sh : sw
    const d = fullH - window.innerHeight
    if (Math.abs(window.innerWidth - fullW) <= 1 && d > 0 && d < 160) gap = d
  }
  document.documentElement.style.setProperty('--vp-gap', `${gap}px`)
}
fitScreen()
window.addEventListener('resize', fitScreen)
window.addEventListener('orientationchange', () => setTimeout(fitScreen, 300))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
