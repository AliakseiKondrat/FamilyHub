// Tints the (opaque) iOS status bar to match whatever is drawn at the top of the screen,
// so the header colour visually continues under the clock. iOS follows <meta name="theme-color">.

const FIXED: [string, string][] = [
  ['.login', '#4338ca'],
  ['.loading', '#4338ca'],
  ['.cook', '#c2410c'],
  ['.viewer', '#000000'],
]

function topColor(): string {
  const x = window.innerWidth / 2
  for (const el of document.elementsFromPoint(x, 1)) {
    if (el.closest('.backdrop')) continue
    for (const [sel, c] of FIXED) if (el.closest(sel)) return c
    const screen = el.closest<HTMLElement>('.screen')
    if (screen) {
      const a1 = getComputedStyle(screen).getPropertyValue('--a1').trim()
      if (a1) return a1
    }
  }
  return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#4338ca'
}

export function initStatusBar() {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  let queued = false
  const update = () => {
    queued = false
    const c = topColor()
    if (meta!.content !== c) meta!.content = c
  }
  const schedule = () => {
    if (queued) return
    queued = true
    // Wait for push/pop animations (~0.42s) to settle before sampling.
    setTimeout(() => requestAnimationFrame(update), 450)
  }
  new MutationObserver(schedule).observe(document.body, {
    subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'data-theme'],
  })
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  schedule()
}
