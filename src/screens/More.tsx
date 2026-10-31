import { useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { useNav } from '../nav'
import { GlassButton, Icon, Screen } from '../ui'
import { today } from '../lib/date'
import type { ModuleId, State } from '../types'

const MODULES: ModuleId[] = ['budget', 'photos', 'watch', 'recipes', 'pet', 'home', 'travel', 'dates', 'inbox', 'archive', 'cycle']

function count(s: State, id: ModuleId): number | string {
  const me = s.me
  switch (id) {
    case 'budget': return ''
    case 'photos': return visible(s.photos, me).length
    case 'watch': return visible(s.watch, me).filter((w) => w.status !== 'done').length
    case 'recipes': return visible(s.recipes, me).length
    case 'pet': return visible(s.petRecords, me).filter((r) => r.nextDue).length
    case 'travel': return visible(s.trips, me).filter((x) => x.end >= today()).length
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
  // The cycle tracker only exists for Julia.
  const mods = MODULES.filter((m) => m !== 'cycle' || s.me === 'j')
  return (
    <Screen title={t('more')} accent="more" right={<GlassButton icon="gear" label={t('settings')} onClick={() => nav.push({ settings: true })} />}>
      <div className="cards">
        {mods.map((id) => {
          const l = moduleLabel(s, id)
          return (
            <button key={id} className="card mod-tile" onClick={() => nav.push({ mod: id })}>
              <div className="card-top">
                <span className="card-emoji">{l.emoji}</span>
                <span className="card-num" style={{ fontSize: 22, color: 'var(--label2)' }}>{count(s, id)}</span>
              </div>
              <span className="card-label">{l.title}</span>
            </button>
          )
        })}
      </div>
      <div className="section">
        <div className="list">
          <button className="row tap with-icon" onClick={() => nav.push({ settings: true })}>
            <div className="row-icon" style={{ background: 'var(--gray)', color: '#fff' }}><Icon name="gear" style={{ width: 20, height: 20 }} /></div>
            <div className="row-main"><div className="row-title">{t('settings')}</div></div>
          </button>
        </div>
      </div>
    </Screen>
  )
}
