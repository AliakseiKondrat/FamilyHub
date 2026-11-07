import { useState } from 'react'
import { createPortal } from 'react-dom'
import { update, useApp } from '../store'
import { LANG_NAMES, useT, type TKey } from '../i18n'
import { usePlatform } from '../lib/platform'
import { haptic } from '../ui'
import type { Lang } from '../types'

/** Newcomer walkthrough: one idea per card, in plain words, with the language picked first. */
const STEPS: { emoji: string; key: string; tip?: boolean }[] = [
  { emoji: '👋', key: 'welcome' },
  { emoji: '☀️', key: 'today' },
  { emoji: '🧭', key: 'tabs', tip: true },
  { emoji: '➕', key: 'add', tip: true },
  { emoji: '👆', key: 'swipe', tip: true },
  { emoji: '🔒', key: 'privacy' },
  { emoji: '🔥', key: 'us' },
  { emoji: '📅', key: 'calendar' },
  { emoji: '📲', key: 'install' },
  { emoji: '⚙️', key: 'settings' },
]

/** Settings → "Take the tour again" opens it from anywhere. */
export const tourBus = new EventTarget()
export const openTour = () => tourBus.dispatchEvent(new Event('open'))

export const finishTour = () => update((st) => { st.prefs = { ...st.prefs, tourDone: true } })

export default function Tour({ onClose }: { onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const platform = usePlatform()
  const [i, setI] = useState(0)
  const step = STEPS[i]
  const last = i === STEPS.length - 1
  const done = () => { finishTour(); onClose() }
  const go = (d: number) => { haptic(); setI((x) => Math.max(0, Math.min(STEPS.length - 1, x + d))) }
  const body = step.key === 'install' ? t(platform === 'android' ? 'tour.installAndroid' : 'tour.installIos') : t(`tour.${step.key}Body` as TKey)
  return createPortal(
    <div className="tour">
      <div className="tour-card" key={i}>
        <div className="tour-top">
          <span className="tour-count">{i + 1} / {STEPS.length}</span>
          {!last && <button className="tour-skip" onClick={done}>{t('tour.skip')}</button>}
        </div>
        <div className="tour-emoji">{step.emoji}</div>
        <h2 className="tour-title">{t(`tour.${step.key}` as TKey, { name: s.users[s.me].name })}</h2>
        <p className="tour-body">{body}</p>
        {step.tip && <p className="tour-tip">💡 {t(`tour.${step.key}Tip` as TKey)}</p>}
        {i === 0 && (
          <div className="chips tour-langs">
            {(Object.keys(LANG_NAMES) as Lang[]).map((l) => (
              <button key={l} className={'chip' + (s.lang === l ? ' on' : '')} onClick={() => update((st) => { st.lang = l })}>{LANG_NAMES[l]}</button>
            ))}
          </div>
        )}
        <div className="tour-dots">{STEPS.map((_, k) => <i key={k} className={k === i ? 'on' : k < i ? 'past' : ''} />)}</div>
        <div className="tour-nav">
          {i > 0 && <button className="glass-btn lg" onClick={() => go(-1)}>← {t('tour.back')}</button>}
          <button className="glass-btn lg tint" onClick={last ? done : () => go(1)}>{last ? t('tour.start') : `${t('tour.next')} →`}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
