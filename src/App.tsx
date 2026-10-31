import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useApp } from './store'
import { moduleLabel, useT } from './i18n'
import { consumeSkipLeave, useNav, type Route, type Tab } from './nav'
import { Icon } from './ui'
import { accentColors, applyDesign } from './theme'
import type { ModuleId } from './types'
import Today from './screens/Today'
import Groceries from './screens/Groceries'
import Tasks from './screens/Tasks'
import Calendar from './screens/Calendar'
import Budget, { bookRecurring } from './screens/Budget'
import Watch from './screens/Watch'
import Music, { MiniPlayer } from './screens/Music'
import Recipes from './screens/Recipes'
import Pet from './screens/Pet'
import Notes from './screens/Notes'
import Travel, { TripDetail } from './screens/Travel'
import Photos from './screens/Photos'
import Cycle from './screens/Cycle'
import More from './screens/More'
import Settings from './screens/Settings'
import Login from './screens/Login'
import { useSync } from './sync'

const TAB_ICONS: Partial<Record<ModuleId, string>> = { today: 'today', calendar: 'calendar', tasks: 'tasks', groceries: 'cart' }

function moduleScreen(id: ModuleId, back: boolean): ReactNode {
  switch (id) {
    case 'today': return <Today back={back} />
    case 'groceries': return <Groceries back={back} />
    case 'tasks': return <Tasks back={back} />
    case 'calendar': return <Calendar back={back} />
    case 'budget': return <Budget back={back} />
    case 'watch': return <Watch back={back} />
    case 'music': return <Music back={back} />
    case 'recipes': return <Recipes back={back} />
    case 'pet': return <Pet back={back} />
    case 'home': case 'inbox': case 'archive': case 'dates': return <Notes module={id} back={back} />
    case 'travel': return <Travel back={back} />
    case 'photos': return <Photos back={back} />
    case 'cycle': return <Cycle back={back} />
  }
}

function routeScreen(r: Route): ReactNode {
  if ('mod' in r) return moduleScreen(r.mod, true)
  if ('trip' in r) return <TripDetail id={r.trip} />
  return <Settings page={r.settings} />
}

function useResolvedTheme(theme: 'auto' | 'light' | 'dark') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const [sysDark, setSysDark] = useState(mq.matches)
  useEffect(() => {
    const on = (e: MediaQueryListEvent) => setSysDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [mq])
  return theme === 'auto' ? (sysDark ? 'dark' : 'light') : theme
}

/** Keeps the popped screen mounted for its slide-out animation. */
function useLeaving(stack: Route[]) {
  const prev = useRef(stack)
  const [leaving, setLeaving] = useState<Route | null>(null)
  useLayoutEffect(() => {
    if (stack.length < prev.current.length && !consumeSkipLeave()) {
      setLeaving(prev.current[prev.current.length - 1])
      const id = setTimeout(() => setLeaving(null), 320)
      prev.current = stack
      return () => clearTimeout(id)
    }
    prev.current = stack
  }, [stack])
  return leaving
}

export default function App() {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const sync = useSync()
  const theme = useResolvedTheme(s.theme)
  const leaving = useLeaving(nav.stack)
  const [squish, setSquish] = useState(0)
  const barRef = useRef<HTMLElement>(null)
  const lensRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; moved: boolean } | null>(null)
  const swallowClick = useRef(false)

  useEffect(() => { applyDesign(s, theme) }, [s, theme])
  // Book this month's recurring payments once the data is ready.
  useEffect(() => { if (sync.status === 'ready') bookRecurring() }, [sync.status])

  if (sync.status === 'loading') return <div className="loading">❤️</div>
  if (sync.status !== 'ready') return <Login />

  const tabs: { id: Tab; icon: string; emoji?: string; label: string }[] = [
    ...s.prefs.tabs.map((id) => {
      const l = moduleLabel(s, id)
      return { id: id as Tab, icon: TAB_ICONS[id] ?? '', emoji: TAB_ICONS[id] ? undefined : l.emoji, label: l.title }
    }),
    { id: 'more', icon: 'grid', label: t('more') },
  ]
  const active = tabs.findIndex((tb) => tb.id === nav.tab)
  const go = (id: Tab) => {
    if (nav.tab === id && nav.stack.length) history.go(-nav.stack.length)
    else if (nav.tab !== id) { setSquish((n) => n + 1); nav.setTab(id); if (s.design.haptics) navigator.vibrate?.(6) }
  }

  // Slide a finger along the bar: the lens follows and the nearest tab opens on release.
  const tabAt = (clientX: number) => {
    const r = barRef.current!.getBoundingClientRect()
    return Math.max(0, Math.min(tabs.length - 1, Math.floor(((clientX - r.left - 4) / (r.width - 8)) * tabs.length)))
  }
  const onBarDown = (e: React.PointerEvent) => { if (s.prefs.swipeTabs) drag.current = { x: e.clientX, moved: false } }
  const onBarMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || !lensRef.current || !barRef.current) return
    if (!d.moved && Math.abs(e.clientX - d.x) < 10) return
    d.moved = true
    const r = barRef.current.getBoundingClientRect()
    const w = (r.width - 8) / tabs.length
    const x = Math.max(0, Math.min(r.width - 8 - w, e.clientX - r.left - 4 - w / 2))
    lensRef.current.style.transition = 'none'
    lensRef.current.style.transform = `translateX(${x}px) scale(1.08)`
  }
  const onBarUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d?.moved || !lensRef.current) return
    swallowClick.current = true
    const i = tabAt(e.clientX)
    lensRef.current.style.transition = ''
    lensRef.current.style.transform = `translateX(${i * 100}%)`
    go(tabs[i].id)
  }

  const layers = [...nav.stack.map((r, i) => ({ r, i, out: false })), ...(leaving ? [{ r: leaving, i: nav.stack.length, out: true }] : [])]
  const activeAccent = nav.tab === 'more' ? 'more' : nav.tab

  return (
    <div className="app" style={{ '--tab-accent': accentColors(activeAccent, s)[0] } as React.CSSProperties}>
      <div className={nav.stack.length ? 'covered-wrap' : undefined} key={nav.tab}>
        {nav.tab === 'more' ? <More /> : moduleScreen(nav.tab, false)}
      </div>
      {layers.map(({ r, i, out }) => (
        <div key={i} className={out ? 'leaving-wrap' : i < nav.stack.length - 1 ? 'covered-wrap' : undefined}>{routeScreen(r)}</div>
      ))}
      <MiniPlayer />
      <nav className="tabbar lg" ref={barRef} onPointerDown={onBarDown} onPointerMove={onBarMove} onPointerUp={onBarUp}
        onPointerCancel={() => { drag.current = null }}
        onClickCapture={(e) => { if (swallowClick.current) { swallowClick.current = false; e.stopPropagation() } }}>
        <div className="tab-lens" ref={lensRef} style={{ width: `calc((100% - 8px) / ${tabs.length})`, transform: `translateX(${Math.max(0, active) * 100}%)`, opacity: active < 0 ? 0 : 1 }}>
          <i key={squish} className={squish ? 'squish' : undefined} />
        </div>
        {tabs.map((tb) => (
          <button key={tb.id} className={'tab' + (nav.tab === tb.id ? ' on' : '')} onClick={() => go(tb.id)}>
            {tb.emoji ? <span className="tab-emoji">{tb.emoji}</span> : <Icon name={tb.icon} />}
            <span>{tb.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
