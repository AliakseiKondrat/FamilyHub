import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { initSync } from './sync'
import { initStatusBar } from './statusbar'
import './styles.css'

registerSW({ immediate: true })
initSync()
initStatusBar()

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
