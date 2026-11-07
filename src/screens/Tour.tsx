import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getState, update, useApp } from '../store'
import { LANG_NAMES, useT, type TKey } from '../i18n'
import { useNav, type Route } from '../nav'
import { ALL_MODULES } from '../defaults'
import { usePlatform } from '../lib/platform'
import { haptic } from '../ui'
import { inTelegram } from '../lib/telegram'
import type { Lang, ModuleId, State } from '../types'

/*
 * Newcomer walkthrough over the real app: each step opens the screen it talks about, dims everything except
 * one control, draws an arrow to it and says in plain words what it does and what to tap. "Next" is the only
 * thing to press; tapping the highlighted spot works too. Steps whose control isn't there (a hidden section,
 * a feature switched off) show as a plain card instead.
 */

const wideLayout = () => document.documentElement.dataset.layout === 'wide'
/** The screen on top (not the one sliding away or covered by a pushed screen). */
const top = () => [...document.querySelectorAll('.screen')].filter((el) => !el.closest('.covered-wrap, .leaving-wrap')).pop() ?? null
const inTop = (sel: string) => () => top()?.querySelector(sel) ?? null
const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

interface Step {
  key: string
  emoji: string
  /** Section to open before the step. */
  go?: ModuleId
  /** The control to point at; none = a centred card. */
  target?: () => Element | null
  /** A point outside the page to aim at (the browser's own buttons). */
  aim?: () => { x: number; y: number }
  skip?: (s: State) => boolean
  /** Text key when it differs from the step key (wide layout, platform). */
  text?: () => string
}

const STEPS: Step[] = [
  { key: 'welcome', emoji: '👋' },
  { key: 'today', emoji: '☀️', go: 'today', target: inTop('.large-title') },
  { key: 'status', emoji: '💬', go: 'today', target: inTop('.status-chip'), skip: (s) => !s.prefs.showStatuses },
  { key: 'actions', emoji: '⚡️', go: 'today', target: inTop('.actions') },
  { key: 'ritual', emoji: '🔥', go: 'today', target: inTop('.ritual-card'), skip: (s) => !s.game.enabled },
  { key: 'tabs', emoji: '🧭', target: () => document.querySelector('.tabbar') ?? document.querySelector('.sidebar .sb-list'), text: () => (wideLayout() ? 'tabsWide' : 'tabs') },
  { key: 'more', emoji: '🗂️', target: () => document.querySelector('.tabbar .tab:last-child'), skip: () => wideLayout() },
  { key: 'add', emoji: '🛒', go: 'groceries', target: inTop('.quick:not(.screen-search)') },
  { key: 'swipe', emoji: '👉', go: 'groceries', target: inTop('.swipe') },
  { key: 'task', emoji: '✅', go: 'tasks', target: inTop('.navbar-side:last-child .glass-btn:last-child') },
  { key: 'privacy', emoji: '🤫' },
  { key: 'calendar', emoji: '📅', go: 'calendar', target: inTop('.cal') },
  { key: 'search', emoji: '🔎', go: 'today', target: inTop('.navbar-side:last-child .glass-btn:first-child') },
  { key: 'us', emoji: '🦊', go: 'us', target: inTop('.us-hero'), skip: (s) => !s.game.enabled },
  { key: 'telegram', emoji: '✈️', skip: () => inTelegram() },
  {
    key: 'settings', emoji: '⚙️', go: 'today',
    target: () => (wideLayout() ? document.querySelector('.sidebar > .sb-item:last-child') : top()?.querySelector('.navbar-side:last-child .glass-btn:last-child') ?? null),
  },
  {
    key: 'install', emoji: '📲', skip: () => standalone() || inTelegram(),
    text: () => (getPlatform() === 'android' ? 'installAndroid' : 'installIos'),
    aim: () => (getPlatform() === 'android' ? { x: innerWidth - 18, y: -8 } : { x: innerWidth / 2, y: innerHeight + 8 }),
  },
  { key: 'tips', emoji: '💡' },
  { key: 'done', emoji: '🎉' },
]
let getPlatform = () => 'ios'

/** Settings → "Take the tour again" opens it from anywhere. */
export const tourBus = new EventTarget()
export const openTour = () => tourBus.dispatchEvent(new Event('open'))
export const finishTour = () => update((st) => { st.prefs = { ...st.prefs, tourDone: true } })

/*
 * Screen tips: the first time a screen opens, a few steps about that screen only, drawn the same way as the
 * big tour (dim, hole, arrow). Seen ones are remembered in prefs.guidesSeen; Settings → Help lists them all.
 * Texts: guide.<screen>.<step> and guide.<screen>.<step>Body.
 */
const ADD = '.navbar-side:last-child .glass-btn:last-child'
type G = [key: string, emoji: string, target?: string]
const GUIDES: Record<string, G[]> = {
  today: [['intro', '☀️'], ['stats', '📊', '.hero-row'], ['search', '🔎', '.navbar-side:last-child .glass-btn:first-child'], ['cards', '🧱', '.banner']],
  us: [['intro', '💞'], ['hero', '🔥', '.us-hero'], ['tabs', '🗂️', '.us-tabs']],
  calendar: [['intro', '📅'], ['grid', '🗓️', '.cal'], ['add', '➕', ADD]],
  tasks: [['intro', '✅'], ['quick', '⌨️', '.quick'], ['filter', '🔀', '.seg'], ['swipe', '👉', '.swipe']],
  groceries: [['intro', '🛒'], ['quick', '✍️', '.quick'], ['chips', '⚡️', '.chips'], ['cats', '🗂️', '.cat-card'], ['swipe', '👉', '.swipe']],
  budget: [['intro', '💰'], ['stats', '📊', '.stat-row'], ['filter', '🔀', '.seg'], ['goals', '🐷', '.goal-grid'], ['add', '➕', ADD]],
  music: [['intro', '🎧'], ['quick', '🔗', '.quick'], ['chips', '🏷️', '.chips']],
  photos: [['intro', '📸'], ['add', '➕', ADD], ['chips', '🏷️', '.chips']],
  watch: [['intro', '🍿'], ['filter', '🔀', '.seg'], ['pick', '🎲', '.actions'], ['grid', '🎬', '.poster-grid']],
  wishlist: [['intro', '🎁'], ['filter', '🔀', '.seg'], ['grid', '🛍️', '.wish-grid'], ['add', '➕', ADD]],
  recipes: [['intro', '🍳'], ['chips', '🏷️', '.chips'], ['pick', '🎲', '.actions'], ['add', '➕', ADD]],
  pet: [['intro', '🐶'], ['actions', '⚡️', '.actions'], ['add', '➕', ADD]],
  home: [['intro', '🏠'], ['list', '🧽', '.section'], ['add', '➕', ADD]],
  travel: [['intro', '✈️'], ['list', '🧳', '.section'], ['add', '➕', ADD]],
  dates: [['intro', '💕'], ['filter', '🔀', '.seg'], ['pick', '🎲', '.actions'], ['add', '➕', ADD]],
  lists: [['intro', '📝'], ['add', '➕', ADD]],
  inbox: [['intro', '📥'], ['quick', '✍️', '.quick'], ['swipe', '👉', '.swipe']],
  archive: [['intro', '🗄️']],
  cycle: [['intro', '🌸'], ['add', '➕', ADD]],
  more: [['intro', '⋯'], ['search', '🔎', '.quick'], ['tiles', '🗂️', '.more-group']],
  settings: [['intro', '⚙️'], ['search', '🔎', '.quick'], ['groups', '🗂️', '.set-groups']],
}
const guideSteps = (g: string): Step[] => (GUIDES[g] ?? []).map(([key, emoji, sel]) => ({ key, emoji, target: sel ? inTop(sel) : undefined, text: () => `${g}.${key}` }))

/** Screens that have tips, in the order of the person's sections. */
export function guideKeys(s: State): string[] {
  const mods = ALL_MODULES.filter((m) => GUIDES[m] && (m !== 'cycle' || s.me === 'j') && (m !== 'us' || s.game.enabled))
  return [...mods, 'more', 'settings']
}
/** The screen on top as a guide key (or null for screens without tips). */
export function guideKeyOf(nav: { tab: string; stack: Route[] }): string | null {
  const r = nav.stack[nav.stack.length - 1]
  if (!r) return GUIDES[nav.tab] ? nav.tab : null
  if ('mod' in r) return GUIDES[r.mod] ? r.mod : null
  if ('settings' in r && r.settings === 'root') return 'settings'
  return null
}
/** Settings → Help: open that screen, then its tips. */
export function openGuide(k: string, nav: ReturnType<typeof useNav>) {
  if (k === 'settings') nav.settings('root')
  else if (k === 'more') nav.setTab('more')
  else nav.open(k as ModuleId)
  setTimeout(() => tourBus.dispatchEvent(new CustomEvent('guide', { detail: k })), 500)
}
export const markGuide = (k: string) => update((st) => {
  const seen = st.prefs.guidesSeen ?? []
  if (!seen.includes(k)) st.prefs = { ...st.prefs, guidesSeen: [...seen, k] }
})


interface Box { x: number; y: number; w: number; h: number }

export default function Tour({ onClose, guide }: { onClose: () => void; guide?: string }) {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const platform = usePlatform()
  getPlatform = () => platform
  const steps = guide ? guideSteps(guide) : STEPS.filter((x) => !x.skip?.(s))
  const [i, setI] = useState(0)
  const step = steps[Math.min(i, steps.length - 1)]
  const last = i >= steps.length - 1
  const [box, setBox] = useState<Box | null>(null)
  const [ready, setReady] = useState(false)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const [bubble, setBubble] = useState<DOMRect | null>(null)

  const done = () => { if (guide) { markGuide(guide); onClose(); return } finishTour(); onClose(); nav.setTab(getState().prefs.tabs[0] ?? 'today') }
  const go = (d: number) => { haptic(); setI((x) => Math.max(0, Math.min(steps.length - 1, x + d))) }

  // Open the step's screen, then find its control, bring it into view and keep measuring it.
  useEffect(() => {
    setReady(false); setBox(null); setBubble(null)
    if (step.go) {
      const st = getState()
      if (wideLayout() || st.prefs.tabs.includes(step.go)) nav.setTab(step.go)
      else { nav.setTab(st.prefs.tabs[0] ?? 'today'); setTimeout(() => nav.open(step.go!), 60) }
    }
    if (!step.target) { const id = setTimeout(() => setReady(true), step.go ? 350 : 0); return () => clearTimeout(id) }
    let el: Element | null = null
    let tries = 0
    const measure = () => {
      if (!el || !el.isConnected) el = step.target!()
      if (!el) return false
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return false
      // Keep the hole inside the screen even for tall controls.
      const y = Math.max(8, r.top), bottom = Math.min(innerHeight - 8, r.bottom)
      setBox({ x: r.left, y, w: r.width, h: Math.max(24, bottom - y) })
      return true
    }
    const find = setInterval(() => {
      tries++
      el = step.target!()
      if (el) {
        clearInterval(find)
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        setTimeout(() => { measure(); setReady(true) }, 450)
      } else if (tries > 15) { clearInterval(find); setReady(true) }
    }, 100)
    const follow = setInterval(measure, 400)
    window.addEventListener('resize', measure)
    return () => { clearInterval(find); clearInterval(follow); window.removeEventListener('resize', measure) }
  }, [i]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (bubbleRef.current) setBubble(bubbleRef.current.getBoundingClientRect())
  }, [box, ready, i, s.lang])

  // Where the bubble goes: on the side of the control with more room, or at the bottom for huge controls.
  const W = innerWidth, H = innerHeight
  const aim = step.aim?.()
  const hole = box ?? (aim ? { x: aim.x, y: aim.y, w: 0, h: 0 } : null)
  const bw = Math.min(360, W - 24)
  let pos: { left: number; top?: number; bottom?: number } = { left: (W - bw) / 2, top: Math.max(24, H / 2 - 160) }
  let place: 'below' | 'above' | 'center' = 'center'
  if (hole && ready) {
    const cx = hole.x + hole.w / 2
    const left = Math.max(12, Math.min(W - bw - 12, cx - bw / 2))
    const below = H - (hole.y + hole.h), above = hole.y
    if (below >= above && below > 230) { place = 'below'; pos = { left, top: hole.y + hole.h + 70 } }
    else if (above > 230) { place = 'above'; pos = { left, bottom: H - hole.y + 70 } }
    else { place = 'below'; pos = { left, bottom: 20 } }
  }

  // The arrow: from the bubble's edge to the control's edge, gently curved.
  let arrow: string | null = null
  if (hole && bubble && ready && place !== 'center') {
    const tx = Math.max(16, Math.min(W - 16, hole.x + hole.w / 2))
    const targetBelowBubble = bubble.top > hole.y + hole.h / 2 ? false : true
    const sx = Math.max(bubble.left + 30, Math.min(bubble.right - 30, tx))
    const sy = targetBelowBubble ? bubble.bottom + 4 : bubble.top - 4
    const ty = targetBelowBubble ? Math.max(sy + 30, hole.y - 10) : Math.min(sy - 30, hole.y + hole.h + 10)
    const clampedTy = Math.max(6, Math.min(H - 6, ty))
    const my = (sy + clampedTy) / 2
    arrow = `M ${sx} ${sy} C ${sx} ${my}, ${tx} ${my}, ${tx} ${clampedTy}`
  }

  const key = step.text?.() ?? step.key
  const name = s.users[s.me].name
  return createPortal(
    <div className="coach" onClick={(e) => { if (e.target === e.currentTarget && box) go(1) }}>
      {box && ready
        ? <div className="coach-hole" style={{ left: box.x - 8, top: box.y - 8, width: box.w + 16, height: box.h + 16 }} onClick={() => go(1)} />
        : <div className="coach-dim" />}
      {arrow && (
        <svg className="coach-arrow" width={W} height={H} aria-hidden>
          <defs>
            <marker id="coach-head" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto">
              <path d="M1,1 L11,6 L1,11 Z" fill="#fff" />
            </marker>
          </defs>
          <path d={arrow} markerEnd="url(#coach-head)" />
        </svg>
      )}
      <div ref={bubbleRef} className={'coach-bubble' + (ready ? ' in' : '')} key={i} style={{ width: bw, ...pos }}>
        <div className="coach-top">
          <span className="coach-count">{guide ? `💡 ${t('guide.tip')} · ` : ''}{i + 1} / {steps.length}</span>
          {!last && <button className="coach-skip" onClick={done}>{t('tour.skip')}</button>}
        </div>
        <div className="coach-title"><span className="coach-emoji">{step.emoji}</span>{t(`${guide ? 'guide' : 'coach'}.${key}` as TKey, { name })}</div>
        <p className="coach-body">{t(`${guide ? 'guide' : 'coach'}.${key}Body` as TKey, { name })}</p>
        {step.key === 'welcome' && (
          <div className="chips coach-langs">
            {(Object.keys(LANG_NAMES) as Lang[]).map((l) => (
              <button key={l} className={'chip' + (s.lang === l ? ' on' : '')} onClick={() => update((st) => { st.lang = l })}>{LANG_NAMES[l]}</button>
            ))}
          </div>
        )}
        <div className="coach-dots">{steps.map((_, k) => <i key={k} className={k === i ? 'on' : k < i ? 'past' : ''} />)}</div>
        <div className="coach-nav">
          {i > 0 && <button className="glass-btn lg" onClick={() => go(-1)}>← {t('tour.back')}</button>}
          <button className="glass-btn lg tint" onClick={last ? done : () => go(1)}>{last ? t(guide ? 'guide.got' : 'tour.start') : `${t('tour.next')} →`}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
