import { useRef, useState, type CSSProperties } from 'react'
import { update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { useNav } from '../nav'
import { GlassButton, Icon, Screen, haptic, toast } from '../ui'
import { today } from '../lib/date'
import { ALL_MODULES } from '../defaults'
import { accentColors } from '../theme'
import type { ModuleId, State } from '../types'

function count(s: State, id: ModuleId): number | string {
  const me = s.me
  switch (id) {
    case 'photos': return visible(s.photos, me).length
    case 'music': return visible(s.music, me).length
    case 'watch': return visible(s.watch, me).filter((w) => w.status !== 'done').length
    case 'recipes': return visible(s.recipes, me).length
    case 'pet': return visible(s.petRecords, me).filter((r) => r.nextDue).length
    case 'travel': return visible(s.trips, me).filter((x) => x.end >= today()).length
    case 'tasks': return visible(s.tasks, me).filter((k) => !k.done).length
    case 'groceries': return visible(s.groceries, me).filter((g) => !g.done).length
    case 'cycle': return '🔒'
    case 'home': case 'dates': case 'inbox': case 'archive':
      return visible(s.notes, me).filter((n) => n.module === id && !n.done).length
    default: return ''
  }
}

const toggleFavorite = (id: ModuleId) => {
  let added = false
  update((st) => {
    const f = st.prefs.favorites ?? []
    added = !f.includes(id)
    st.prefs.favorites = added ? [...f, id] : f.filter((x) => x !== id)
  })
  return added
}

/** Long press (or a tap in edit mode) stars a tile; a normal tap opens the section. */
function useTilePress(id: ModuleId, editing: boolean, open: () => void, onStar: (added: boolean) => void) {
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const fired = useRef(false)
  const cancel = () => clearTimeout(timer.current)
  return {
    onPointerDown: () => {
      fired.current = false
      if (editing) return
      timer.current = setTimeout(() => { fired.current = true; haptic(); onStar(toggleFavorite(id)) }, 480)
    },
    onPointerUp: cancel, onPointerLeave: cancel, onPointerCancel: cancel,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClick: () => {
      if (fired.current) { fired.current = false; return }
      if (editing) { haptic(); toggleFavorite(id) } else open()
    },
  }
}

function Tile({ id, big, editing }: { id: ModuleId; big?: boolean; editing: boolean }) {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const l = moduleLabel(s, id)
  const [c1, c2] = accentColors(id, s)
  const fav = s.prefs.favorites?.includes(id)
  const press = useTilePress(id, editing, () => nav.push({ mod: id }), (added) => toast(added ? t('favAdded') : t('favRemoved')))
  const n = count(s, id)
  return (
    <button className={'card mod-tile' + (big ? ' fav' : '') + (editing ? ' editing' : '')} {...press}
      style={big ? { '--a1': c1, '--a2': c2 } as CSSProperties : undefined}>
      <div className="card-top">
        <span className="card-emoji" style={big ? undefined : { background: `linear-gradient(135deg, ${c1}, ${c2})` }}>{l.emoji}</span>
        {editing
          ? <span className={'fav-star' + (fav ? ' on' : '')}><Icon name="star" /></span>
          : <span className="card-num">{n}</span>}
      </div>
      <span className="card-label">{l.title}</span>
    </button>
  )
}

export default function More() {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const [editing, setEditing] = useState(false)
  // Everything not already in the tab bar; the cycle tracker only exists for Julia.
  const mods = ALL_MODULES.filter((m) => !s.prefs.tabs.includes(m) && !s.modules[m]?.hidden && (m !== 'cycle' || s.me === 'j'))
  const favs = (s.prefs.favorites ?? []).filter((m) => mods.includes(m))
  const rest = mods.filter((m) => !favs.includes(m))
  return (
    <Screen title={t('more')} accent="more" searchable={false}
      right={<>
        <GlassButton icon={editing ? 'check' : 'pencil'} label={editing ? t('done') : t('edit')} tint={editing} onClick={() => { haptic(); setEditing(!editing) }} />
        <GlassButton icon="gear" label={t('settings')} onClick={() => nav.settings()} />
      </>}
      head={<button className="quick lg" style={{ border: 0, width: 'calc(100% - 28px)', textAlign: 'left', color: 'rgba(255,255,255,.75)' }} onClick={nav.search}>
        <span style={{ position: 'relative', zIndex: 2 }}><Icon name="search" style={{ width: 18, height: 18 }} /></span>
        <span style={{ position: 'relative', zIndex: 2, fontWeight: 500 }}>{t('searchAll')}</span>
      </button>}>
      {favs.length > 0 && <>
        <div className="section-header" style={{ padding: '2px 30px 8px' }}><span>⭐️ {t('favSections')}</span></div>
        <div className="cards fav-cards">{favs.map((id) => <Tile key={id} id={id} big editing={editing} />)}</div>
        {rest.length > 0 && <div className="section-header" style={{ padding: '6px 30px 8px' }}><span>{t('allSections')}</span></div>}
      </>}
      <div className="cards">{rest.map((id) => <Tile key={id} id={id} editing={editing} />)}</div>
      {(editing || favs.length === 0) && <div className="section-footer" style={{ margin: '-6px 14px 16px' }}>{t('favHint')}</div>}
      <div className="section">
        <div className="list">
          <button className="row tap with-icon" onClick={() => nav.settings()}>
            <div className="row-icon" style={{ background: 'var(--gray)', color: '#fff' }}><Icon name="gear" style={{ width: 20, height: 20 }} /></div>
            <div className="row-main"><div className="row-title">{t('settings')}</div></div>
          </button>
          <a className="row tap with-icon" href="findmy://" style={{ color: 'inherit' }}>
            <div className="row-icon" style={{ background: 'linear-gradient(135deg,#34c759,#30b0c7)' }}>📍</div>
            <div className="row-main"><div className="row-title">{t('openFindMy')}</div></div>
          </a>
        </div>
      </div>
    </Screen>
  )
}
