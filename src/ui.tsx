import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Base, Repeat, UserId, Who } from './types'
import { getState, other, update, useApp } from './store'
import { translate, useT } from './i18n'
import { popWithoutAnimation, useNav } from './nav'
import { today } from './lib/date'
import { accentStyle, type Accent } from './theme'

/* ---------- Icons (SF Symbols look-alikes) ---------- */
const PATHS: Record<string, ReactNode> = {
  today: <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 9.8h17M8 3v4M16 3v4" /><circle cx="8.5" cy="14" r=".9" fill="currentColor" /><circle cx="12" cy="14" r=".9" fill="currentColor" /><circle cx="15.5" cy="14" r=".9" fill="currentColor" /></>,
  tasks: <><circle cx="5.5" cy="7" r="1.8" /><circle cx="5.5" cy="12.5" r="1.8" /><circle cx="5.5" cy="18" r="1.8" /><path d="M10 7h10M10 12.5h10M10 18h10" /></>,
  cart: <><path d="M2.5 4h2.6l2.3 11h11l2-8H6.3" /><circle cx="9" cy="19.5" r="1.4" /><circle cx="17" cy="19.5" r="1.4" /></>,
  grid: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.8" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="M15 4.5 7.5 12l7.5 7.5" />,
  fwd: <path d="M9 4.5 16.5 12 9 19.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  gear: <><path d="M10.3 3.2a1.8 1.8 0 0 1 3.4 0l.3.9a1.8 1.8 0 0 0 2.5 1l.8-.4a1.8 1.8 0 0 1 2.4 2.4l-.4.8a1.8 1.8 0 0 0 1 2.5l.9.3a1.8 1.8 0 0 1 0 3.4l-.9.3a1.8 1.8 0 0 0-1 2.5l.4.8a1.8 1.8 0 0 1-2.4 2.4l-.8-.4a1.8 1.8 0 0 0-2.5 1l-.3.9a1.8 1.8 0 0 1-3.4 0l-.3-.9a1.8 1.8 0 0 0-2.5-1l-.8.4a1.8 1.8 0 0 1-2.4-2.4l.4-.8a1.8 1.8 0 0 0-1-2.5l-.9-.3a1.8 1.8 0 0 1 0-3.4l.9-.3a1.8 1.8 0 0 0 1-2.5l-.4-.8a1.8 1.8 0 0 1 2.4-2.4l.8.4a1.8 1.8 0 0 0 2.5-1l.3-.9Z" /><circle cx="12" cy="12" r="3" /></>,
  dice: <><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="9" cy="9" r="1.1" fill="currentColor" /><circle cx="15" cy="15" r="1.1" fill="currentColor" /><circle cx="15" cy="9" r="1.1" fill="currentColor" /><circle cx="9" cy="15" r="1.1" fill="currentColor" /></>,
  trash: <><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></>,
  photo: <><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m3.5 17 5-4.5 4 3.5 3-2.5 5 4" /></>,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  pencil: <path d="M4.5 19.5 5.3 15.6 15.8 5.1a2 2 0 0 1 2.9 0l.2.2a2 2 0 0 1 0 2.9L8.4 18.7 4.5 19.5ZM13.8 7.1l3.1 3.1" />,
  star: <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.6Z" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>,
}

export function Icon({ name, style }: { name: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'back' || name === 'fwd' ? 2.6 : 1.9}
      strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
      {PATHS[name]}
    </svg>
  )
}

const Chevron = () => (
  <svg className="chev" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 1.5 7.5 7.5l-6 6" /></svg>
)

export interface Action { icon: ReactNode; label: string; onClick: () => void }

/**
 * A screen: colored header (aura) behind the status bar with a large title, optional hero content,
 * glass action buttons and extra header controls; the title collapses into a glass bar on scroll.
 * Pushed screens can be dismissed with a swipe from the left edge.
 */
/** Things the per-screen search can hide; forms (rows with inputs) always stay. */
const SEARCH_ITEMS = '.swipe, .row:not(.swipe .row):not(:has(input, textarea, select)), .poster, .track-card, .goal, .mod-tile, .banner, .photo, .card'

export function Screen({ title, accent, left, right, children, back, subtitle, hero, actions, head, auraImage, searchable = true }: {
  title: ReactNode; accent: Accent; left?: ReactNode; right?: ReactNode; children: ReactNode; back?: boolean
  subtitle?: ReactNode; hero?: ReactNode; actions?: Action[]; head?: ReactNode
  /** Optional picture blurred into the header (album art on the Music screen). */
  auraImage?: string
  /** Show the 🔍 button that filters this screen's content. */
  searchable?: boolean
}) {
  const nav = useNav()
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [auraH, setAuraH] = useState(360)
  const [searchOpen, setSearchOpen] = useState(false)
  const [sq, setSq] = useState('')
  useDelayedFocus(ref)
  useDelayedFocus(headRef, searchOpen)

  // Filter whatever this screen shows by its text, so every section gets search for free.
  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const apply = () => {
      const q = sq.trim().toLowerCase()
      body.querySelectorAll<HTMLElement>(SEARCH_ITEMS).forEach((el) => el.classList.toggle('search-hide', !!q && !el.textContent!.toLowerCase().includes(q)))
      body.querySelectorAll<HTMLElement>('.section, .cat-card').forEach((sec) => {
        const items = [...sec.querySelectorAll<HTMLElement>(SEARCH_ITEMS)]
        sec.classList.toggle('search-hide', !!q && items.length > 0 && items.every((i) => i.classList.contains('search-hide')))
      })
    }
    apply()
    if (!sq) return
    const mo = new MutationObserver(apply)
    mo.observe(body, { childList: true, subtree: true, characterData: true })
    return () => mo.disconnect()
  }, [sq])

  useEffect(() => {
    const el = ref.current!
    const on = () => setScrolled(el.scrollTop > 44)
    el.addEventListener('scroll', on, { passive: true })
    return () => el.removeEventListener('scroll', on)
  }, [])

  // The aura covers the header block and fades out just below it.
  useLayoutEffect(() => {
    const h = headRef.current
    if (!h) return
    const measure = () => setAuraH(h.offsetTop + h.offsetHeight + 80)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(h)
    return () => ro.disconnect()
  }, [])

  // Interactive edge-swipe back, like UINavigationController.
  const drag = useRef<{ x: number; dx: number } | null>(null)
  const onDown = (e: React.PointerEvent) => {
    if (back && e.clientX - (ref.current?.getBoundingClientRect().left ?? 0) < 24) drag.current = { x: e.clientX, dx: 0 }
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current, el = ref.current
    if (!d || !el) return
    d.dx = Math.max(0, e.clientX - d.x)
    el.classList.add('dragging')
    el.style.transform = `translateX(${d.dx}px)`
  }
  const onUp = () => {
    const d = drag.current, el = ref.current
    drag.current = null
    if (!d || !el) return
    el.classList.remove('dragging')
    if (d.dx > el.clientWidth * 0.33) {
      el.style.transform = 'translateX(100%)'
      setTimeout(popWithoutAnimation, 280)
    } else el.style.transform = ''
  }

  return (
    <div className={'screen' + (back ? ' push' : '') + (sq ? ' searching' : '')} ref={ref} style={{ ...accentStyle(accent), '--aura-h': auraH + 'px' } as CSSProperties}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <div className="aura">{auraImage && <div className="aura-img" style={{ backgroundImage: `url("${auraImage}")` }} />}</div>
      <div className={'navbar' + (scrolled ? ' scrolled' : '')}>
        <div className="navbar-row">
          <div className="navbar-side">
            {back && <button className="glass-btn lg" onClick={nav.pop} aria-label="Back"><Icon name="back" /></button>}
            {left}
          </div>
          <div className="navbar-title">{title}</div>
          <div className="navbar-side">
            {searchable && (
              <button className="glass-btn lg" aria-label={t('search')} onClick={() => {
                const open = !searchOpen
                setSearchOpen(open)
                if (!open) setSq('')
                else ref.current?.scrollTo({ top: 0, behavior: 'smooth' })
              }}><Icon name={searchOpen ? 'close' : 'search'} /></button>
            )}
            {right}
          </div>
        </div>
      </div>
      <div className="head" ref={headRef}>
        <div className="large-title">{title}</div>
        {subtitle && <div className="subtitle">{subtitle}</div>}
        {hero && <div className="hero-block">{hero}</div>}
        {actions && actions.length > 0 && (
          <div className="actions">
            {actions.map((a) => (
              <button key={a.label} className="action" onClick={a.onClick}>
                <span className="circle lg">{typeof a.icon === 'string' && a.icon in PATHS ? <Icon name={a.icon} /> : a.icon}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        )}
        {head && <div className="head-extra">{head}</div>}
        {searchOpen && (
          <div className="head-extra">
            <div className="quick lg screen-search">
              <span style={{ position: 'relative', zIndex: 2 }}>🔎</span>
              <input data-autofocus value={sq} onChange={(e) => setSq(e.target.value)} placeholder={t('searchHere')} enterKeyHint="search" />
              {sq && <button className="plus" onClick={() => setSq('')} aria-label="Clear"><Icon name="close" /></button>}
            </div>
          </div>
        )}
      </div>
      <div className="screen-body" ref={bodyRef}>{children}</div>
    </div>
  )
}

export function GlassButton({ icon, label, onClick, tint }: { icon?: string; label?: string; onClick: () => void; tint?: boolean }) {
  return (
    <button className={'glass-btn lg' + (tint ? ' tint' : '')} onClick={onClick} aria-label={label}>
      {icon ? <Icon name={icon} /> : <span>{label}</span>}
    </button>
  )
}

/* ---------- Cards / grouped lists ---------- */
export function Section({ header, footer, children, big, action }: {
  header?: ReactNode; footer?: ReactNode; children: ReactNode; big?: boolean; action?: ReactNode
}) {
  return (
    <div className="section">
      {header && !big && <div className="section-header"><span>{header}</span>{action}</div>}
      <div className="list">
        {header && big && <div className="card-head"><span>{header}</span>{action}</div>}
        {children}
      </div>
      {footer && <div className="section-footer">{footer}</div>}
    </div>
  )
}

export function Row({ icon, iconBg, title, sub, detail, onClick, chevron, left, right, dim, className, style }: {
  icon?: ReactNode; iconBg?: string; title: ReactNode; sub?: ReactNode; detail?: ReactNode; onClick?: () => void
  chevron?: boolean; left?: ReactNode; right?: ReactNode; dim?: boolean; className?: string; style?: CSSProperties
}) {
  const cls = ['row', onClick && 'tap', icon && 'with-icon', left && 'with-check', className].filter(Boolean).join(' ')
  return (
    <div className={cls} onClick={onClick} style={style} role={onClick ? 'button' : undefined}>
      {left}
      {icon && <div className="row-icon" style={{ background: iconBg ?? 'var(--fill)' }}>{icon}</div>}
      <div className="row-main">
        <div className={'row-title' + (dim ? ' dim' : '')}>{title}</div>
        {sub && <div className="row-sub">{sub}</div>}
      </div>
      {detail != null && <div className="row-detail">{detail}</div>}
      {right}
      {chevron && <Chevron />}
    </div>
  )
}

/** Swipe left to reveal Delete (full swipe deletes); the row collapses away before it is removed. */
export function Swipe({ children, onDelete, onComplete }: { children: ReactNode; onDelete: () => void; onComplete?: () => void }) {
  const t = useT()
  const [x, setX] = useState(0)
  const [drag, setDrag] = useState(false)
  const [removing, setRemoving] = useState(false)
  const start = useRef<{ x: number; y: number; base: number; locked?: 'h' | 'v' } | null>(null)
  const W = 88
  const remove = () => {
    if (!confirmDelete()) { setX(0); return }
    const prev = getState()
    haptic(); setRemoving(true); setX(-window.innerWidth); setTimeout(() => { onDelete(); offerUndo(prev) }, 260)
  }
  return (
    <div className={'swipe' + (removing ? ' removing' : '')}>
      <div className="swipe-actions">
        <button style={{ background: 'var(--red)' }} onClick={remove}>{t('delete')}</button>
      </div>
      {/* Swipe right to tick off, like Reminders. */}
      {onComplete && <div className="swipe-actions left" style={{ opacity: x > 0 ? 1 : 0 }}>
        <button style={{ background: x > W ? 'var(--green)' : 'var(--gray)' }}>✓</button>
      </div>}
      <div
        className={'swipe-content' + (drag ? ' dragging' : '')}
        style={{ transform: `translateX(${x}px)` }}
        onPointerDown={(e) => { start.current = { x: e.clientX, y: e.clientY, base: x } }}
        onPointerMove={(e) => {
          const s = start.current
          if (!s) return
          const dx = e.clientX - s.x, dy = e.clientY - s.y
          if (!s.locked && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) s.locked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
          if (s.locked === 'h') { e.stopPropagation(); setDrag(true); setX(Math.min(onComplete ? W * 1.6 : 0, Math.max(-W * 2, s.base + dx))) }
        }}
        onPointerUp={() => {
          const s = start.current
          start.current = null
          if (!s?.locked || s.locked === 'v') return
          setDrag(false)
          if (x > W && onComplete) { haptic(); onComplete(); setX(0) }
          else if (x < -W * 1.6) remove()
          else setX(x < -W / 2 ? -W : 0)
        }}
        onPointerCancel={() => { start.current = null; setDrag(false); setX(0) }}
        onClickCapture={(e) => { if (x !== 0) { e.stopPropagation(); setX(0) } }}
      >
        {children}
      </div>
    </div>
  )
}

export function Check({ on, onChange, color }: { on: boolean; onChange: () => void; color?: string }) {
  return (
    <button className={'check' + (on ? ' on' : '')} style={{ '--c': color } as CSSProperties}
      onClick={(e) => { e.stopPropagation(); haptic(); onChange() }} aria-pressed={on}>
      <Icon name="check" />
    </button>
  )
}

export function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return <button className={'switch' + (on ? ' on' : '')} onClick={() => { haptic(); onChange(!on) }} role="switch" aria-checked={on} />
}

/** Segmented control whose thumb slides with a spring. */
export function Segmented<T extends string>({ value, options, onChange, inSheet }: {
  value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; inSheet?: boolean
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div className={'seg' + (inSheet ? ' in-sheet' : '')}>
      <div className="seg-thumb" style={{ width: `calc((100% - 6px) / ${options.length})`, transform: `translateX(${i * 100}%)` }} />
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? 'on' : ''} onClick={() => { if (o.value !== value) haptic(); onChange(o.value) }}>{o.label}</button>
      ))}
    </div>
  )
}

export function Empty({ emoji, text }: { emoji: string; text: ReactNode }) {
  return <div className="empty"><div className="e-emoji">{emoji}</div>{text}</div>
}

export function QuickAdd({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => void }) {
  const [v, setV] = useState('')
  const submit = () => { if (v.trim()) { onAdd(v.trim()); setV('') } }
  return (
    <div className="quick lg">
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} enterKeyHint="done"
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
      <button className="plus" disabled={!v.trim()} onClick={submit} aria-label="Add"><Icon name="plus" /></button>
    </div>
  )
}

/**
 * Focus the field marked data-autofocus once the slide-in has finished, without scrolling the page.
 * Focusing during the animation made iOS shove the whole app up to make room for the keyboard.
 */
function useDelayedFocus(ref: React.RefObject<HTMLElement>, when: unknown = true) {
  useEffect(() => {
    if (!when) return
    const id = setTimeout(() => ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true }), 460)
    return () => clearTimeout(id)
  }, [when]) // eslint-disable-line react-hooks/exhaustive-deps
}

/* ---------- Delete confirmation ---------- */
/** True when it's fine to delete: the setting is off, or the person confirmed. */
export function confirmDelete() {
  const s = getState()
  return !s.prefs.confirmDelete || window.confirm(translate(s.lang, 'confirmDelete'))
}
// Every "Delete" button in an editor is a .row.destructive labelled with the translated word;
// catch them in one place instead of wiring each editor.
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest?.('.row.destructive')
    if (!el || el.textContent?.trim() !== translate(getState().lang, 'delete')) return
    if (!confirmDelete()) { e.stopPropagation(); e.preventDefault(); return }
    const prev = getState()
    setTimeout(() => offerUndo(prev), 0)
  }, true)
}

/* ---------- Haptics ---------- */
// iOS Safari has no Vibration API, but toggling a native <input switch> (iOS 18+) plays the system haptic.
let hapticLabel: HTMLLabelElement | null = null
export function haptic() {
  if (!getState().design.haptics) return
  if (navigator.vibrate) { navigator.vibrate(8); return }
  if (!hapticLabel) {
    hapticLabel = document.createElement('label')
    hapticLabel.setAttribute('aria-hidden', 'true')
    hapticLabel.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    hapticLabel.appendChild(input)
    document.body.appendChild(hapticLabel)
  }
  hapticLabel.click()
}

/* ---------- Sheet (modal card from the bottom, drag down to dismiss) ---------- */
export function Sheet({ title, onClose, onDone, doneDisabled, children }: {
  title?: ReactNode; onClose: () => void; onDone?: () => void; doneDisabled?: boolean; children: ReactNode
}) {
  const [closing, setClosing] = useState(false)
  const [dy, setDy] = useState(0)
  const start = useRef<number | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  useDelayedFocus(sheetRef)
  const close = (after?: () => void) => {
    setClosing(true)
    setTimeout(() => { after?.(); onClose() }, 240)
  }
  const style = { '--from': `translateY(${dy}px)`, transform: dy && !closing ? `translateY(${dy}px)` : undefined } as CSSProperties
  // Portal to <body> so the sheet sits above the tab bar regardless of which screen opened it.
  return createPortal(
    <>
      <div className={'backdrop' + (closing ? ' closing' : '')} onClick={() => close()} />
      <div ref={sheetRef} className={'sheet' + (closing ? ' closing' : '') + (start.current != null ? ' dragging' : '')} style={style}>
        <div
          onPointerDown={(e) => {
            // Centered cards on iPad/Mac close with the button, not by dragging.
            if (document.documentElement.dataset.layout === 'wide') return
            // Capturing the pointer on a button would steal its click (Close / Done stopped working).
            if ((e.target as HTMLElement).closest('button')) return
            start.current = e.clientY; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
          }}
          onPointerMove={(e) => { if (start.current != null) setDy(Math.max(0, e.clientY - start.current)) }}
          onPointerUp={() => { start.current = null; if (dy > 110) close(); else setDy(0) }}
          onPointerCancel={() => { start.current = null; setDy(0) }}
        >
          <div className="sheet-grabber" />
          <div className="sheet-head">
            <button className="glass-btn lg" onClick={() => close()} aria-label="Close"><Icon name="close" /></button>
            <div className="sheet-title">{title}</div>
            {onDone
              ? <button className="glass-btn lg tint" disabled={doneDisabled} style={doneDisabled ? { opacity: 0.35 } : undefined}
                  onClick={() => close(onDone)} aria-label="Done"><Icon name="check" /></button>
              : <div style={{ width: 40 }} />}
          </div>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>,
    document.body,
  )
}

/* ---------- Form rows ---------- */
export function TextRow({ value, onChange, placeholder, autoFocus, multiline }: {
  value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean; multiline?: boolean
}) {
  return (
    <div className="row">
      {multiline
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        : <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} data-autofocus={autoFocus || undefined} />}
    </div>
  )
}

export function DateRow({ label, value, onChange, type = 'date', clearable = true }: {
  label: ReactNode; value?: string; onChange: (v: string | undefined) => void; type?: 'date' | 'time'; clearable?: boolean
}) {
  const t = useT()
  const on = !!value
  return (
    <div className="row">
      <span className="label">{label}</span>
      {on && <input className="pill-input" type={type} value={value} onChange={(e) => onChange(e.target.value || undefined)} />}
      {clearable
        ? <Switch on={on} onChange={(v) => onChange(v ? (type === 'date' ? today() : '09:00') : undefined)} />
        : !on && <button className="chip" onClick={() => onChange(today())}>{t('add')}</button>}
    </div>
  )
}

export function SelectRow<T extends string>({ label, value, options, onChange }: {
  label: ReactNode; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void
}) {
  return (
    <div className="row">
      <span className="label" style={{ flex: 'none' }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Chevron />
    </div>
  )
}

export function ToggleRow({ label, on, onChange, icon }: { label: ReactNode; on: boolean; onChange: (v: boolean) => void; icon?: string }) {
  return (
    <div className={'row' + (icon ? ' with-icon' : '')}>
      {icon && <div className="row-icon">{icon}</div>}
      <span className="label">{label}</span>
      <Switch on={on} onChange={onChange} />
    </div>
  )
}

export function RepeatRow({ value, onChange }: { value: Repeat; onChange: (v: Repeat) => void }) {
  const t = useT()
  const opts: Repeat[] = ['none', 'daily', 'weekly', 'monthly', 'yearly']
  return <SelectRow label={t('repeat')} value={value} onChange={onChange} options={opts.map((r) => ({ value: r, label: t(`rep.${r}`) }))} />
}

export function WhoPicker({ value, onChange, allowBoth = true }: { value: Who; onChange: (v: Who) => void; allowBoth?: boolean }) {
  const s = useApp()
  const t = useT()
  const opts: { value: Who; label: string }[] = [
    ...(allowBoth ? [{ value: 'both' as Who, label: `💞 ${t('both')}` }] : []),
    { value: 'a', label: `${s.users.a.emoji} ${s.users.a.name}` },
    { value: 'j', label: `${s.users.j.emoji} ${s.users.j.name}` },
  ]
  return <Segmented value={value} onChange={onChange} options={opts} inSheet />
}

/** "Surprise for partner" + reveal date, and "only me". Shared by every editor sheet. */
export function VisibilityFields<T extends Base>({ value, onChange, allowPrivate }: {
  value: T; onChange: (v: T) => void; allowPrivate?: boolean
}) {
  const s = useApp()
  const t = useT()
  const partner = other(s.me)
  const pName = s.users[partner].name
  // Only the author controls visibility of a record.
  if (value.createdBy !== s.me) return null
  return (
    <Section footer={value.surpriseFor ? t('surpriseHint', { name: pName }) : value.privateTo ? t('privateHint') : undefined}>
      <ToggleRow icon="🎁" label={t('surpriseFor', { name: pName })} on={!!value.surpriseFor}
        onChange={(v) => onChange({ ...value, surpriseFor: v ? partner : undefined, revealAt: v ? value.revealAt : undefined, privateTo: undefined })} />
      {value.surpriseFor && (
        <DateRow label={t('revealAt')} value={value.revealAt} onChange={(d) => onChange({ ...value, revealAt: d })} />
      )}
      {allowPrivate && (
        <ToggleRow icon="🔒" label={t('privateOnly')} on={!!value.privateTo}
          onChange={(v) => onChange({ ...value, privateTo: v ? s.me : undefined, surpriseFor: undefined, revealAt: undefined })} />
      )}
    </Section>
  )
}

/** Small badges after a title: 🎁 surprise (author's view), 🔒 private. */
export function Marks({ x }: { x: Base }) {
  const s = getState()
  return (
    <>
      {x.surpriseFor && x.createdBy === s.me && <span className="badge" style={{ '--c': 'var(--pink)' } as CSSProperties}>🎁</span>}
      {x.privateTo && <span className="badge" style={{ '--c': 'var(--gray)' } as CSSProperties}>🔒</span>}
    </>
  )
}

export function Avatar({ who }: { who: Who }) {
  const s = useApp()
  if (who === 'both') return <span className="avatar" style={{ '--c': 'var(--purple)' } as CSSProperties}>💞</span>
  return <span className="avatar" style={{ '--c': `var(--${who})` } as CSSProperties}>{s.users[who as UserId].emoji}</span>
}

let toastTimer: ReturnType<typeof setTimeout> | undefined
export function toast(text: string, action?: { label: string; onClick: () => void }, ms = 1800) {
  document.querySelector('.toast')?.remove()
  const el = document.createElement('div')
  el.className = 'toast lg' + (action ? ' with-action' : '')
  const span = document.createElement('span')
  span.textContent = text
  el.appendChild(span)
  const hide = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260) }
  if (action) {
    const b = document.createElement('button')
    b.textContent = action.label
    b.onclick = () => { clearTimeout(toastTimer); hide(); action.onClick() }
    el.appendChild(b)
  }
  document.body.appendChild(el)
  clearTimeout(toastTimer)
  toastTimer = setTimeout(hide, ms)
}

/* ---------- Undo delete ---------- */
type Removed = { key: string; item: { id: string }; index: number }[]
/** Records that were in `prev` but are gone now, in every list of the state. */
function removedSince(prev: object): Removed {
  const now = getState() as unknown as Record<string, unknown>
  const out: Removed = []
  for (const [key, before] of Object.entries(prev)) {
    const after = now[key]
    if (!Array.isArray(before) || !Array.isArray(after) || !before.length || typeof before[0]?.id !== 'string') continue
    const ids = new Set(after.map((x: { id: string }) => x.id))
    before.forEach((item: { id: string }, index) => { if (!ids.has(item.id)) out.push({ key, item, index }) })
  }
  return out
}
/** After a delete, show "Deleted · Undo" for a few seconds; Undo puts the records back where they were. */
export function offerUndo(prev: object) {
  const gone = removedSince(prev)
  if (!gone.length) return
  const lang = getState().lang
  toast(translate(lang, 'deletedN'), {
    label: translate(lang, 'undo'),
    onClick: () => {
      update((st) => {
        const s = st as unknown as Record<string, { id: string }[]>
        for (const g of gone) if (!s[g.key].some((x) => x.id === g.item.id)) s[g.key].splice(Math.min(g.index, s[g.key].length), 0, g.item)
      })
      toast(translate(lang, 'restored'))
    },
  }, 4500)
}

export function Stars({ value, onChange }: { value?: number; onChange?: (v: number) => void }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} className={(value ?? 0) >= n ? 'on' : ''} onClick={() => onChange?.(n === value ? 0 : n)} disabled={!onChange}>★</button>
      ))}
    </div>
  )
}

export const EMOJIS = '🛒✅📅💰🍿🎬📺🍳🥘🍰🐶🐕🐾🏠🛋️🔑✈️🌍🧳💕❤️🌹🥂📥📌🗄️🔒📸🖼️🌸🌙☀️⭐️🎁🎉🎵📚💊🩺🚗🧹🧺💡🪴🐱🍕☕️🍷🏖️⛰️🎮🧘‍♀️💼📝' +
  '😀😍🥰😎🤩🥳😴🤒🤗👍🙌👏💪🙏👀💯🔥✨🌈⚡️❄️🌊🌿🌵🌻🍀🍁🎄🎃🦋🐝🐢🦊🐰🐻🐼🦄🐟🐦' +
  '🍎🍓🍌🥑🥦🥕🧀🥚🥐🍞🥩🍗🍣🍜🍝🥗🍔🌮🍩🍪🍫🍦🧁🍯🥛🧃🍺🍾🧊' +
  '🚲🛴🚆🚌🚕⛽️🅿️🗺️🏕️🏝️🏔️🗼🏰⛪️🏟️🎢🎡🎭🎨🎤🎧🎸🎹⚽️🏀🎾🏓⛳️🏊🚴🧗🎿' +
  '📱💻⌚️📷🔋🔌🧾💳💶💵🏦📈📊🗂️📎✂️🖊️📖🗓️⏰⏳🔔📣💬📞✉️📦🏷️🧸🪄🛠️🔧🧯🧼🧴🪥🛁🛏️🪑🚪🪟🧺👕👗👟👜🕶️💍💄'
export function emojiList() {
  return [...new Intl.Segmenter().segment(EMOJIS)].map((x) => x.segment)
}
