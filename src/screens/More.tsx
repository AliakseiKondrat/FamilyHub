import { useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { useNav } from '../nav'
import { GlassButton, Icon, Screen } from '../ui'
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

export default function More() {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  // Everything not already in the tab bar; the cycle tracker only exists for Julia.
  const mods = ALL_MODULES.filter((m) => !s.prefs.tabs.includes(m) && !s.modules[m]?.hidden && (m !== 'cycle' || s.me === 'j'))
  return (
    <Screen title={t('more')} accent="more" right={<GlassButton icon="gear" label={t('settings')} onClick={() => nav.settings()} />}>
      <div className="cards">
        {mods.map((id) => {
          const l = moduleLabel(s, id)
          const [c1, c2] = accentColors(id, s)
          return (
            <button key={id} className="card mod-tile" onClick={() => nav.push({ mod: id })}>
              <div className="card-top">
                <span className="card-emoji" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>{l.emoji}</span>
                <span className="card-num" style={{ fontSize: 22, color: 'var(--label2)' }}>{count(s, id)}</span>
              </div>
              <span className="card-label">{l.title}</span>
            </button>
          )
        })}
      </div>
      <div className="section">
        <div className="list">
          <button className="row tap with-icon" onClick={() => nav.settings()}>
            <div className="row-icon" style={{ background: 'var(--gray)', color: '#fff' }}><Icon name="gear" style={{ width: 20, height: 20 }} /></div>
            <div className="row-main"><div className="row-title">{t('settings')}</div></div>
          </button>
          <button className="row tap with-icon" onClick={() => nav.settings('design')}>
            <div className="row-icon" style={{ background: 'linear-gradient(135deg,#ff2d55,#af52de,#0a84ff)' }}>🎨</div>
            <div className="row-main"><div className="row-title">{t('design')}</div></div>
          </button>
        </div>
      </div>
    </Screen>
  )
}
