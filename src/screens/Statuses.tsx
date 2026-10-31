import { useState } from 'react'
import { base, other, update, useApp, visible } from '../store'
import { useT } from '../i18n'
import { Section, Sheet, TextRow, haptic } from '../ui'
import type { State, Status, StatusPreset, UserId } from '../types'

/** The newest status that hasn't faded yet for this person (a shared "together" one counts for both). */
export function currentStatus(s: State, u: UserId): Status | undefined {
  const fresh = Date.now() - s.prefs.statusHours * 3600000
  return visible(s.statuses ?? [], s.me)
    .filter((x) => (x.createdBy === u || x.together) && new Date(x.at).getTime() > fresh)
    .sort((a, b) => b.at.localeCompare(a.at))[0]
}

const agoText = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 60 ? `${Math.max(1, m)} мин` : `${Math.round(m / 60)} ч`
}

/** Replace my status (or our shared one) with a new one; null clears it. */
export function setStatus(p: StatusPreset | null) {
  update((st) => {
    st.statuses = (st.statuses ?? []).filter((x) => x.createdBy !== st.me && !(p?.together && x.together))
    if (p) st.statuses.unshift({
      ...base(st.me), text: p.label, emoji: p.emoji, together: p.together || undefined,
      preset: p.id === 'custom' ? undefined : p.id, at: new Date().toISOString(),
    })
  })
  haptic()
}

/** Two chips in the Today header: mine (tap to change) and my partner's — or one shared chip. */
export function StatusChips() {
  const s = useApp()
  const t = useT()
  const [open, setOpen] = useState(false)
  if (!s.prefs.showStatuses) return null
  const mine = currentStatus(s, s.me)
  const theirs = currentStatus(s, other(s.me))
  // Both doing the same thing (both driving, both at home) shows as one shared status.
  const same = !!mine && !!theirs && !mine.together && !theirs.together && (mine.preset ? mine.preset === theirs.preset : mine.text === theirs.text)
  const chip = (u: UserId | 'both', st: Status | undefined, onClick?: () => void) => (
    <button key={u} className="status-chip lg" onClick={onClick} disabled={!onClick}>
      <span className="sc-who">{u === 'both' ? '💞' : s.users[u].emoji}</span>
      <span className="sc-text">{st ? `${st.emoji ?? ''} ${st.text}` : onClick ? t('myStatus') : '—'}</span>
      {st && <span className="sc-ago">{st.auto ? '⚡ ' : ''}{agoText(st.at)}</span>}
    </button>
  )
  return (
    <>
      <div className="status-row">
        {mine?.together || same
          ? chip('both', mine, () => setOpen(true))
          : <>{chip(s.me, mine, () => setOpen(true))}{theirs && chip(other(s.me), theirs)}</>}
      </div>
      {open && <StatusSheet onClose={() => setOpen(false)} />}
    </>
  )
}

function StatusSheet({ onClose }: { onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [custom, setCustom] = useState('')
  const pick = (p: StatusPreset) => { setStatus(p); onClose() }
  const grid = (list: StatusPreset[]) => (
    <div className="cat-grid">
      {list.map((p) => (
        <button key={p.id} className="cat-btn" onClick={() => pick(p)}>
          <span className="ce">{p.emoji}</span>{p.label}
        </button>
      ))}
    </div>
  )
  return (
    <Sheet title={t('myStatus')} onClose={onClose}>
      {grid(s.prefs.statusPresets.filter((p) => !p.together))}
      <div className="section-header" style={{ padding: '0 30px 8px' }}>💞 {t('together')}</div>
      {grid(s.prefs.statusPresets.filter((p) => p.together))}
      <Section>
        <TextRow value={custom} onChange={setCustom} placeholder={t('customStatus')} />
        {custom.trim() && <button className="row tap accent" onClick={() => pick({ id: 'custom', emoji: '💬', label: custom.trim() })}>✓ {t('setStatus')}</button>}
      </Section>
      <Section>
        <button className="row tap destructive" onClick={() => { setStatus(null); onClose() }}>{t('clearStatus')}</button>
      </Section>
    </Sheet>
  )
}
