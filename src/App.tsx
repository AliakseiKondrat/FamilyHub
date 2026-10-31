import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useApp } from './store'
import { moduleLabel, useT } from './i18n'
import { consumeSkipLeave, useNav, type Route, type Tab } from './nav'
import { Icon } from './ui'
import type { ModuleId } from './types'
import Today from './screens/Today'
import Groceries from './screens/Groceries'
import Tasks from './screens/Tasks'
import Calendar from './screens/Calendar'
import Budget from './screens/Budget'
import Watch from './screens/Watch'
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

function moduleScreen(id: ModuleId, pushed: boolean): ReactNode {
  switch (id) {
    case 'today': return <Today />
    case 'groceries': return <Groceries back={pushed} />
    case 'tasks': return <Tasks back={pushed} />
    case 'calendar': return <Calendar back={pushed} />
    case 'budget': return <Budget />
    case 'watch': return <Watch />
    case 'recipes': return <Recipes />
    case 'pet': return <Pet />
    case 'home': case 'inbox': case 'archive': case 'dates': return <Notes module={id} />
    case 'travel': return <Travel />
    case 'photos': return <Photos />
    case 'cycle': return <Cycle />
  }
}

function routeScreen(r: Route): ReactNode {
  if ('mod' in r) return moduleScreen(r.mod, true)
  if ('trip' in r) return <TripDetail id={r.trip} />
  return <Settings />
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = s.lang
  }, [theme, s.lang])

  if (sync.status === 'loading') return <div className="loading">❤️</div>
  if (sync.status !== 'ready') return <Login />

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'today', icon: 'today', label: moduleLabel(s, 'today').title },
    { id: 'calendar', icon: 'calendar', label: moduleLabel(s, 'calendar').title },
    { id: 'tasks', icon: 'tasks', label: moduleLabel(s, 'tasks').title },
    { id: 'groceries', icon: 'cart', label: moduleLabel(s, 'groceries').title },
    { id: 'more', icon: 'grid', label: t('more') },
  ]
  const active = tabs.findIndex((tb) => tb.id === nav.tab)
  const layers = [...nav.stack.map((r, i) => ({ r, i, out: false })), ...(leaving ? [{ r: leaving, i: nav.stack.length, out: true }] : [])]

  return (
    <div className="app">
      <div className={nav.stack.length ? 'covered-wrap' : undefined} key={nav.tab}>
        {nav.tab === 'more' ? <More /> : moduleScreen(nav.tab, false)}
      </div>
      {layers.map(({ r, i, out }) => (
        <div key={i} className={out ? 'leaving-wrap' : i < nav.stack.length - 1 ? 'covered-wrap' : undefined}>{routeScreen(r)}</div>
      ))}
      <nav className="tabbar lg">
        <div className="tab-lens" style={{ transform: `translateX(${active * 100}%)` }}><i key={squish} className={squish ? 'squish' : undefined} /></div>
        {tabs.map((tb) => (
          <button key={tb.id} className={'tab' + (nav.tab === tb.id ? ' on' : '')}
            onClick={() => {
              if (nav.tab === tb.id && nav.stack.length) history.go(-nav.stack.length)
              else if (nav.tab !== tb.id) { setSquish((n) => n + 1); nav.setTab(tb.id) }
            }}>
            <Icon name={tb.icon} />
            <span>{tb.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
