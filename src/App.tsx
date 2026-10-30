import { useEffect, useState, type ReactNode } from 'react'
import { useApp } from './store'
import { moduleLabel, useT } from './i18n'
import { useNav, type Route, type Tab } from './nav'
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

export default function App() {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const sync = useSync()
  const theme = useResolvedTheme(s.theme)

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

  const top = nav.stack[nav.stack.length - 1]
  return (
    <div className="app">
      {nav.tab === 'more' ? <More /> : moduleScreen(nav.tab, false)}
      {top && <div key={nav.stack.length}>{routeScreen(top)}</div>}
      <nav className="tabbar">
        {tabs.map((tb) => (
          <button key={tb.id} className={'tab' + (nav.tab === tb.id ? ' on' : '')}
            onClick={() => (nav.tab === tb.id && nav.stack.length ? history.go(-nav.stack.length) : nav.setTab(tb.id))}>
            <Icon name={tb.icon} />
            <span>{tb.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
