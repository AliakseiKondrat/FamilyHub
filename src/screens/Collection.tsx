import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { update, useApp } from '../store'
import { useT, type TKey } from '../i18n'
import { anchorsOf } from '../lib/anchors'
import { useNav } from '../nav'
import { Row, Screen, Section, Segmented, SelectRow, Sheet, ToggleRow, haptic, toast } from '../ui'
import { SYNC_ENABLED } from '../config'
import { fmtDate } from '../lib/date'
import { FONTS, loadFont } from '../theme'
import { CARDS, CATALOG, DEFAULTS, FLAMES, FRAMES, HATS, ITEMS, TG_PERKS, KINDS, METRICS, PIGGIES, SCENES, isCulture, itemName, type Item, type Kind, type Metric, type Rule, type Tier } from '../lib/catalog'
import { marathonOf, nextWeekOf } from '../lib/marathon'
import {
  activeCard, activeFlame, activeFrame, activeHat, activeLook, activeMascot, activePiggy, devGrant, devGrants, devHouseholds, devRevoke, devSetFreeForAll, devSetRule,
  devUpdateHousehold, isOpen, itemsOf, lookOf, ruleOf, startTryOn, stopTryOn, thankForGift, unseenGifts, useTryOn, useUnlocks,
  type Grant, type Household, type HouseholdGrant, type Status,
} from '../lib/unlocks'
import type { State, UserId } from '../types'
import { FeedbackList } from './Pairing'
import { telegramDiag, telegramSetup, type BotDiag } from '../lib/telegram'

/* ---------- previews ---------- */
const isDark = () => document.documentElement.dataset.theme === 'dark'
const CLASSIC: Record<'light' | 'dark', [string, string, string, string]> = {
  light: ['#f2f3f7', '#ffffff', '#ececf1', '#0a6cff'], dark: ['#000000', '#141416', '#232327', '#3d8bff'],
}

function ThemePreview({ id }: { id: string }) {
  const look = lookOf(id)
  const dark = isDark()
  const pal = (dark ? look.dark : look.light)[0] ? (dark ? look.dark : look.light) : CLASSIC[dark ? 'dark' : 'light']
  const [h1, h2] = look.headers ?? ['#4338ca', '#a855f7']
  return (
    <div className="theme-prev" style={{ background: look.wall?.[dark ? 1 : 0] ?? pal[0] }}>
      <div className="tp-head" style={{ background: `linear-gradient(135deg, ${h1}, ${h2})` }} />
      <div className="tp-body">
        {look.font && <span className="tp-font" style={{ fontFamily: FONTS[look.font].stack, color: pal[3] }} ref={() => loadFont(look.font!)}>Аа</span>}
        <div className="tp-row" style={{ background: pal[1], borderRadius: look.radius != null ? Math.min(10, look.radius / 2) : undefined, boxShadow: look.cards === 'neo' ? `2px 2px 0 ${pal[3]}` : look.cards === 'outline' ? `inset 0 0 0 1px ${pal[3]}` : undefined }} />
        <div className="tp-row" style={{ background: pal[1], width: '72%', borderRadius: look.radius != null ? Math.min(10, look.radius / 2) : undefined }} />
        <div className="tp-dot" style={{ background: pal[3] }} />
      </div>
      {look.decor && <span style={{ position: 'absolute', top: 6, right: 8, fontSize: 18 }}>{look.decor}</span>}
      {look.ambient && look.ambient.glyphs.slice(0, 2).map((g, i) => (
        <span key={i} style={{ position: 'absolute', left: `${18 + i * 44}%`, top: `${44 + i * 12}%`, fontSize: 12, color: look.ambient!.color, opacity: 0.85 }}>{g}</span>
      ))}
    </div>
  )
}

/** The mascot's backdrop with its decorations; `scale` shrinks the decorations for small previews. */
export function SceneView({ id, scale = 1, className, children }: { id: string; scale?: number; className?: string; children?: ReactNode }) {
  const sc = SCENES[ITEMS[id]?.key ?? 'none'] ?? {}
  return (
    <div className={className} style={sc.bg ? { background: sc.bg } : undefined}>
      {sc.deco?.map(([g, x, y, size], i) => <span key={i} className="deco" style={{ left: `${x}%`, top: `${y}%`, fontSize: size * scale }}>{g}</span>)}
      {children}
    </div>
  )
}

export function Postcard({ id, text, small }: { id: string; text: ReactNode; small?: boolean }) {
  const c = CARDS[ITEMS[id]?.key ?? 'plain'] ?? CARDS.plain
  const card = (
    <div className={'postcard' + (c.serif ? ' serif' : '')} style={{ background: c.bg, color: c.ink, fontSize: small ? 11 : 16 }}>
      {c.frame && <><span className="pc-frame tl" style={small ? { fontSize: 12 } : undefined}>{c.frame}</span><span className="pc-frame br" style={small ? { fontSize: 12 } : undefined}>{c.frame}</span></>}
      <span>{text}</span>
    </div>
  )
  return c.edge ? <div className="postcard-edge" style={{ background: c.edge, padding: small ? 3 : 5 }}>{card}</div> : card
}

/** A savings bar in a goal design: gradient fill with the design's emoji riding at the edge. */
export function PiggyBar({ id, pct }: { id: string; pct: number }) {
  const p = PIGGIES[ITEMS[id]?.key ?? 'classic'] ?? PIGGIES.classic
  const w = Math.max(0, Math.min(100, pct))
  return (
    <div className={'progress' + (p.emoji ? ' ride' : '')}>
      <i style={{ width: `${w}%`, '--c': `linear-gradient(90deg, ${p.fill[0]}, ${p.fill[1]})` } as CSSProperties} />
      {p.emoji && <span className="g-ride" style={{ left: `${Math.max(6, Math.min(94, w))}%` }}>{p.emoji}</span>}
    </div>
  )
}

function ItemPreview({ item, big }: { item: Item; big?: boolean }) {
  const s = useApp()
  const t = useT()
  const cls = 'col-prev' + (big ? ' big' : '')
  switch (item.kind) {
    case 'theme': case 'atmo':
      return <div className={cls}><ThemePreview id={item.id} /></div>
    case 'mascot':
      return <div className={cls}>{item.emoji}</div>
    case 'scene':
      return <SceneView id={item.id} className={cls} scale={big ? 1 : 0.55}><span style={{ fontSize: big ? 64 : 34, position: 'relative' }}>{ITEMS[activeMascot(s)].emoji}</span></SceneView>
    case 'card':
      return <div className={cls} style={{ padding: big ? 14 : 8, display: 'block', background: 'var(--fill)' }}><Postcard id={item.id} text={t('col.sample')} small={!big} /></div>
    case 'piggy':
      return <div className={cls}><div className="piggy-prev"><PiggyBar id={item.id} pct={62} /></div></div>
    case 'flame':
      return <div className={cls}><span style={{ fontSize: big ? 84 : 46 }}><FlameGlyph id={item.id} /></span></div>
    case 'frame':
      return <div className={cls}><FramedAvatars id={item.id} /></div>
    case 'hat':
      return <div className={cls}><span className="mascot-view still" style={{ '--mascot': `${big ? 96 : 52}px` } as CSSProperties}><span className="mascot-emoji">{ITEMS[activeMascot(s)].emoji}</span><HatOn id={item.id} /></span></div>
  }
}

/* ---------- status ---------- */
function useStatusLines() {
  const t = useT()
  const s = useApp()
  return (st: Status): { text: string; ok?: boolean; bars?: { text: string; pct: number }[] } => {
    if (st.open) {
      if (st.why === 'owned' && st.grant?.source === 'gift' && st.grant.from_role) return { text: t('col.gifted', { name: s.users[st.grant.from_role].name }), ok: true }
      const key = { free: 'col.free', dev: 'col.devOpen', test: 'col.testOpen', owned: 'col.owned', earned: 'col.earned' } as const
      return { text: t(key[st.why]), ok: st.why !== 'free' }
    }
    if (st.rule.m === 'event') return { text: st.tier === 'public' ? `${eventHow(st.id, s, t)} · ${t('col.price', { n: st.rule.price })}` : eventHow(st.id, s, t) }
    // Everyone can get there by keeping at it; couples who aren't close need twice as far (or buy it sooner).
    const n = st.need
    const bars = [{ text: t(`col.m.${st.rule.m}`, { have: Math.min(st.have, n), n }), pct: (st.have / n) * 100 }]
    if (st.rule.refs) bars.push({ text: t('col.orRefs', { have: Math.min(st.refs, st.rule.refs), n: st.rule.refs }), pct: (st.refs / st.rule.refs) * 100 })
    return { text: bars[0].text, bars }
  }
}

/** Is this the one in use (my look, or the couple's mascot / scene / postcard / savings design)? */
function chosen(item: Item, s: State) {
  switch (item.kind) {
    case 'theme': case 'atmo': return (s.prefs.look && isOpen(s.prefs.look, s) ? s.prefs.look : DEFAULTS.theme) === item.id
    case 'mascot': return activeMascot(s) === item.id
    case 'scene': return (s.game.scene && isOpen(s.game.scene, s) ? s.game.scene : DEFAULTS.scene) === item.id
    case 'card': return activeCard(s) === item.id
    case 'piggy': return activePiggy(s) === item.id
    case 'flame': return activeFlame(s) === item.id
    case 'frame': return activeFrame(s) === item.id
    case 'hat': return activeHat(s) === item.id
  }
}

function choose(item: Item) {
  stopTryOn()
  update((st) => {
    switch (item.kind) {
      case 'theme': case 'atmo': st.prefs = { ...st.prefs, look: item.id === DEFAULTS.theme ? undefined : item.id }; break
      case 'mascot': st.game = { ...st.game, mascotKind: item.key }; break
      case 'scene': st.game = { ...st.game, scene: item.id === DEFAULTS.scene ? undefined : item.id }; break
      case 'card': st.game = { ...st.game, card: item.id === DEFAULTS.card ? undefined : item.id }; break
      case 'piggy': st.game = { ...st.game, piggy: item.id === DEFAULTS.piggy ? undefined : item.id }; break
      case 'flame': st.game = { ...st.game, flame: item.id === DEFAULTS.flame ? undefined : item.id }; break
      case 'frame': st.game = { ...st.game, frame: item.id === DEFAULTS.frame ? undefined : item.id }; break
      case 'hat': st.game = { ...st.game, hat: item.id === DEFAULTS.hat ? undefined : item.id }; break
    }
  })
  haptic()
}

/* ---------- the collection screen ---------- */
/** Shelves: themes and atmospheres share one (atmospheres are themes that come alive), the world's cultures have their own. */
export type Shelf = 'look' | 'world' | 'mascot' | 'hat' | 'scene' | 'frame' | 'flame' | 'card' | 'piggy'
const SHELVES: Shelf[] = ['look', 'world', 'mascot', 'hat', 'scene', 'frame', 'flame', 'card', 'piggy']
const shelfItems = (sh: Shelf): Item[] => sh === 'look' ? CATALOG.filter((i) => (i.kind === 'theme' || i.kind === 'atmo') && !isCulture(i))
  : sh === 'world' ? worldOrder() : itemsOf(sh)
/** Countries already ours first, then by when their week comes round. */
const worldOrder = () => CATALOG.filter(isCulture).map((i) => ({ i, own: isOpen(i.id), at: nextWeekOf(i.key.slice(2)) ?? '9999' }))
  .sort((a, b) => Number(b.own) - Number(a.own) || a.at.localeCompare(b.at)).map((x) => x.i)
const toShelf = (k: Kind | Shelf): Shelf => (k === 'theme' || k === 'atmo' ? 'look' : k)
let startKind: Shelf = 'look'
/** Open the collection on a given shelf. */
export function openCollection(nav: ReturnType<typeof useNav>, kind: Kind | Shelf = 'look') { startKind = toShelf(kind); nav.settings('collection') }

export default function Collection() {
  const t = useT()
  const nav = useNav()
  const { s, tier, real, stats, status } = useUnlocks()
  const lines = useStatusLines()
  const [kind, setKind] = useState<Shelf>(startKind)
  const [open, setOpen] = useState<Item | null>(null)
  const sub = tier === 'dev' ? t('col.subDev') : tier === 'close' ? t('col.subClose') : t('col.subPublic')
  return (
    <Screen title={t('col.title')} back accent="us" subtitle={sub}>
      {tier === 'close' && (
        <div className="col-stats">
          <span>⭐ <b>{stats.level}</b> {t('col.s.level')}</span>
          <span>🔥 <b>{stats.flame}</b> {t('col.s.flame')}</span>
          <span>🤝 <b>{stats.acts}</b> {t('col.s.acts')}</span>
          <span>📅 <b>{stats.days}</b> {t('col.s.days')}</span>
          <span>💌 <b>{stats.refs}</b> {t('col.s.refs')}</span>
        </div>
      )}
      <div className="col-tabs">
        {SHELVES.map((k) => (
          <button key={k} className={'chip' + (k === kind ? ' on' : '')} onClick={() => { setKind(k); startKind = k }}>{t(`col.shelf.${k}`)}</button>
        ))}
      </div>
      <div className="col-hint">{t(`col.shelfHint.${kind}`)}</div>
      {kind === 'world' && <WorldHeader />}
      <div className="col-grid">
        {shelfItems(kind).map((item) => {
          const st = status(item.id)
          const l = lines(st)
          const on = chosen(item, s)
          return (
            <button key={item.id} className={'col-item' + (on ? ' on' : '')} onClick={() => setOpen(item)}>
              <div style={{ position: 'relative' }}>
                <ItemPreview item={item} />
                {!st.open && <span className="col-lock">🔒</span>}
                {item.kind === 'atmo' && kind === 'look' && <span className="col-live">✨</span>}
              </div>
              <div className="col-name">{itemName(item, s.lang)}</div>
              <div className={'col-st' + (on ? ' ok' : '')}>{on ? t('col.active') : l.text}</div>
              {!st.open && l.bars && <div className="col-bar"><i style={{ width: `${Math.min(100, Math.max(l.bars[0].pct, l.bars[1]?.pct ?? 0))}%` }} /></div>}
            </button>
          )
        })}
      </div>
      {real === 'dev' && (
        <Section><Row icon="🛠" title={t('dev.title')} chevron onClick={() => nav.settings('dev')} /></Section>
      )}
      {open && <ItemSheet item={open} onClose={() => setOpen(null)} />}
    </Screen>
  )
}

export function ItemSheet({ item, onClose }: { item: Item; onClose: () => void }) {
  const t = useT()
  const { s, status } = useUnlocks()
  const lines = useStatusLines()
  const [pay, setPay] = useState(false)
  const st = status(item.id)
  const l = lines(st)
  const on = chosen(item, s)
  const look = item.kind === 'theme' || item.kind === 'atmo'
  const partner = s.users[s.me === 'a' ? 'j' : 'a'].name
  return (
    <Sheet title={`${item.emoji} ${itemName(item, s.lang)}`} onClose={onClose}>
      <div style={{ margin: '0 16px 14px' }}><ItemPreview item={item} big /></div>
      <Section footer={pay ? t('col.paySoon') : undefined}>
        {st.open
          ? <Row icon={on ? '✅' : '🔓'} title={on ? t('col.active') : l.text} />
          : l.bars
            ? l.bars.map((b, i) => (
                <div key={i} className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                  <span>{i === 0 ? '🔒 ' : '💌 '}{b.text}</span>
                  <div className="col-bar" style={{ margin: 0 }}><i style={{ width: `${Math.min(100, b.pct)}%` }} /></div>
                </div>
              ))
            : <Row icon="🔒" title={l.text} />}
        {st.open && !on && <button className="row tap accent" onClick={() => { choose(item); onClose() }}>{t('col.choose')}</button>}
        {look && !on && <button className="row tap accent" onClick={() => { startTryOn(item.id); onClose() }}>👀 {t('col.tryOn')}</button>}
        {!st.open && st.tier === 'public' && <>
          <button className="row tap accent" onClick={() => setPay(true)}>⭐ {t('col.buy', { n: st.rule.price })}</button>
          <button className="row tap accent" onClick={() => setPay(true)}>🎁 {t('col.gift', { name: partner })}</button>
        </>}
      </Section>
      <div className="col-hint" style={{ margin: '0 30px 16px' }}>{t(`col.hint.${item.kind}`)}</div>
    </Sheet>
  )
}

/* ---------- things that live above every screen ---------- */
/** Snow, petals, fireflies… drifting over the app while an atmosphere is on. */
export function Ambient() {
  const { s } = useUnlocks()
  const a = lookOf(activeLook(s)).ambient
  if (!a || s.design.reduceMotion) return null
  const n = a.count ?? 14
  const rnd = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x) }
  const durs = { fall: [9, 9], rise: [10, 8], float: [3, 4], streak: [7, 9] }[a.motion]
  return (
    <div className="ambient" aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const dur = durs[0] + rnd(i, 4) * durs[1]
        const style = {
          left: a.motion === 'streak' ? `${45 + rnd(i, 1) * 60}%` : `${rnd(i, 1) * 100}%`,
          top: a.motion === 'float' ? `${10 + rnd(i, 2) * 80}%` : a.motion === 'streak' ? `${rnd(i, 2) * 35}%` : 0,
          fontSize: a.motion === 'float' ? 5 + rnd(i, 3) * 5 : a.motion === 'streak' ? 10 + rnd(i, 3) * 6 : 12 + rnd(i, 3) * 12,
          color: a.color,
          '--glow': a.glow, '--anim': `amb-${a.motion}`, '--dur': `${dur}s`,
          '--delay': a.motion === 'streak' ? `${rnd(i, 5) * dur}s` : `${-rnd(i, 5) * dur}s`,
          '--dx': `${(rnd(i, 6) - 0.5) * 90}px`,
        } as CSSProperties
        return <i key={i} className={a.glow ? 'glow' : undefined} style={style}>{a.glyphs[i % a.glyphs.length]}</i>
      })}
    </div>
  )
}

/** "Trying on: Sakura · 0:42 · Undo" while a look is on approval. */
export function TryOnBar() {
  const t = useT()
  const s = useApp()
  const tr = useTryOn()
  const [, tick] = useState(0)
  useEffect(() => {
    if (!tr) return
    const i = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(i)
  }, [tr])
  if (!tr || !ITEMS[tr.id]) return null
  const left = Math.max(0, Math.ceil((tr.until - Date.now()) / 1000))
  return (
    <div className="tryon-bar lg">
      👀 {t('col.trying', { name: itemName(ITEMS[tr.id], s.lang) })} · 0:{String(left).padStart(2, '0')}
      <button onClick={stopTryOn}>{t('col.tryEnd')}</button>
    </div>
  )
}

/** A gift from the partner: show it once and say thank you. */
export function GiftNotice() {
  const t = useT()
  const { s } = useUnlocks()
  const g = unseenGifts(s)[0]
  const item = g && ITEMS[g.item]
  if (!g || !item || !g.from_role) return null
  return (
    <Sheet title="🎁" onClose={() => thankForGift(g.item)}>
      <div className="gift-card">
        <div className="gift-emoji">{item.emoji}</div>
        <p style={{ fontWeight: 700, fontSize: 19, margin: '8px 16px 14px' }}>{t('col.giftFrom', { name: s.users[g.from_role].name, item: itemName(item, s.lang) })}</p>
      </div>
      <div style={{ margin: '0 16px 14px' }}><ItemPreview item={item} big /></div>
      <Section><button className="row tap accent" onClick={() => thankForGift(g.item)}>{t('col.thanks')}</button></Section>
    </Sheet>
  )
}

/* ---------- developer panel ---------- */
function NumRow({ label, value, onChange }: { label: ReactNode; value: number; onChange: (n: number) => void }) {
  return (
    <label className="row">
      <span className="label" style={{ flex: 1 }}>{label}</span>
      <input type="number" inputMode="numeric" min={0} value={Number.isFinite(value) ? value : ''} style={{ width: 90, textAlign: 'right', border: 0, background: 'none' }}
        onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))} />
    </label>
  )
}

export function DevPage() {
  const t = useT()
  const { s, server, real } = useUnlocks()
  const [rule, setRule] = useState<Item | null>(null)
  const [list, setList] = useState<Household[] | null>(null)
  const [err, setErr] = useState('')
  const [couple, setCouple] = useState<Household | null>(null)
  const reload = () => { if (SYNC_ENABLED) devHouseholds().then(setList).catch((e) => setErr(e.message)) }
  useEffect(reload, [])
  const fail = (e: { message?: string }) => toast(t('dev.err', { msg: e?.message ?? '?' }))
  const ruleText = (r: Rule) => `${t(`dev.m.${r.m}`)} ≥ ${r.n}${r.refs ? ` · 💌 ${r.refs}` : ''} · ${r.price} ⭐`

  if (real !== 'dev') return <Screen title={t('dev.title')} back accent="settings"><Section footer={t('col.locked')}>{null}</Section></Screen>

  return (
    <Screen title={t('dev.title')} back accent="settings" subtitle={t('dev.sub')}>
      <div style={{ margin: '0 14px 6px' }}>
        <div className="section-header" style={{ padding: '6px 16px 8px' }}>{t('dev.viewAs')}</div>
        <Segmented inSheet value={s.prefs.devAs ?? 'dev'} onChange={(v) => update((st) => { st.prefs = { ...st.prefs, devAs: v === 'dev' ? undefined : v } })}
          options={(['dev', 'close', 'public'] as const).map((v) => ({ value: v, label: t(`dev.as.${v}`) }))} />
      </div>
      <Section footer={t('dev.testHint')}>
        <ToggleRow icon="🧪" label={t('dev.test')} on={server.freeForAll} onChange={(v) => devSetFreeForAll(v).catch(fail)} />
      </Section>
      <Section header={t('dev.couples')} footer={!SYNC_ENABLED ? t('dev.offline') : err || undefined}>
        {(list ?? []).map((h) => (
          <Row key={h.id} icon={h.tier === 'dev' ? '🛠' : h.tier === 'close' ? '💞' : '👥'} title={`${h.id} · ${h.emails ?? '—'}`} chevron onClick={() => setCouple(h)}
            sub={[t(`tier.${h.tier}`), t('dev.members', { n: h.members }), h.last_active ? t('dev.active', { date: fmtDate(h.last_active.slice(0, 10), s.lang) }) : '',
              h.referred_by ? `💌 ${h.referred_by}` : ''].filter(Boolean).join(' · ')} />
        ))}
      </Section>
      {SYNC_ENABLED && <BotHealth />}
      <FeedbackList />
      <div className="col-hint" style={{ margin: '4px 30px 10px' }}>{t('dev.rulesHint')}</div>
      {KINDS.map((k) => (
        <Section key={k} header={`${t('dev.rules')} · ${t(`col.kind.${k}`)}`}>
          {itemsOf(k).map((i) => {
            const r = ruleOf(i.id)
            return <Row key={i.id} icon={i.emoji} title={itemName(i, s.lang)} sub={r ? ruleText(r) : t('dev.makeFree')}
              detail={i.id in server.overrides ? t('dev.changed') : undefined} chevron onClick={() => setRule(i)} />
          })}
        </Section>
      ))}
      {rule && <RuleSheet item={rule} onClose={() => setRule(null)} onError={fail} />}
      {couple && <CoupleSheet h={couple} all={list ?? []} onClose={() => setCouple(null)} onChanged={reload} onError={fail} />}
    </Screen>
  )
}

function RuleSheet({ item, onClose, onError }: { item: Item; onClose: () => void; onError: (e: Error) => void }) {
  const t = useT()
  const s = useApp()
  const cur = ruleOf(item.id)
  const [free, setFree] = useState(!cur)
  const [m, setM] = useState<Metric>(cur?.m ?? 'level')
  const [n, setN] = useState(cur?.n ?? 10)
  const [refs, setRefs] = useState(cur?.refs ?? 0)
  const [price, setPrice] = useState(cur?.price ?? 100)
  const save = () => devSetRule(item.id, free ? null : { m, n: Math.max(1, n), refs: refs || undefined, price }).then(() => toast(t('dev.saved'))).catch(onError)
  return (
    <Sheet title={`${item.emoji} ${itemName(item, s.lang)}`} onClose={onClose} onDone={save}>
      <Section><ToggleRow icon="🎁" label={t('dev.makeFree')} on={free} onChange={setFree} /></Section>
      {!free && (
        <Section footer={t('dev.rulesHint')}>
          <SelectRow label={t('dev.metric')} value={m} onChange={setM} options={METRICS.map((x) => ({ value: x, label: t(`dev.m.${x}`) }))} />
          <NumRow label={t('dev.n')} value={n} onChange={setN} />
          <NumRow label={t('dev.refs')} value={refs} onChange={setRefs} />
          <NumRow label={t('dev.price')} value={price} onChange={setPrice} />
        </Section>
      )}
      <Section>
        <button className="row tap accent" onClick={() => { devSetRule(item.id, 'reset').then(() => toast(t('dev.saved'))).catch(onError); onClose() }}>{t('dev.reset')}</button>
      </Section>
    </Sheet>
  )
}

const SOURCES = ['dev', 'giftA', 'giftJ'] as const
function CoupleSheet({ h, all, onClose, onChanged, onError }: {
  h: Household; all: Household[]; onClose: () => void; onChanged: () => void; onError: (e: Error) => void
}) {
  const t = useT()
  const s = useApp()
  const [grants, setGrants] = useState<HouseholdGrant[]>([])
  const [what, setWhat] = useState(CATALOG.find((i) => i.rule)!.id)
  const [as, setAs] = useState<(typeof SOURCES)[number]>('dev')
  const load = () => devGrants(h.id).then(setGrants).catch(onError)
  useEffect(() => { load() }, [h.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const setTier = (tier: Tier) => devUpdateHousehold(h.id, { tier }).then(onChanged).catch(onError)
  const setRef = (ref: string) => devUpdateHousehold(h.id, { referred_by: ref || null }).then(onChanged).catch(onError)
  const grant = () => {
    const source: Grant['source'] = as === 'dev' ? 'dev' : 'gift'
    const from: UserId | null = as === 'giftA' ? 'a' : as === 'giftJ' ? 'j' : null
    devGrant(h.id, what, source, from).then(load).catch(onError)
  }
  const srcLabel = (g: HouseholdGrant) => g.source === 'gift' ? t(g.from_role === 'j' ? 'dev.src.giftJ' : 'dev.src.giftA') : t(`dev.src.${g.source}`)
  return (
    <Sheet title={`${h.id} · ${t(`tier.${h.tier}`)}`} onClose={onClose}>
      <Section footer={h.emails ?? undefined}>
        {h.tier === 'dev'
          ? <Row icon="🛠" title={t('dev.tier')} detail={t('tier.dev')} />
          : <SelectRow label={t('dev.tier')} value={h.tier} onChange={setTier} options={(['close', 'public'] as const).map((v) => ({ value: v, label: t(`tier.${v}`) }))} />}
        <SelectRow label={t('dev.refBy')} value={h.referred_by ?? ''} onChange={setRef}
          options={[{ value: '', label: t('dev.nobody') }, ...all.filter((x) => x.id !== h.id).map((x) => ({ value: x.id, label: x.id }))]} />
      </Section>
      <Section header={t('dev.grants')}>
        {grants.length === 0 && <Row title={<span style={{ color: 'var(--label2)' }}>{t('empty')}</span>} />}
        {grants.map((g) => {
          const it = ITEMS[g.item]
          return <Row key={g.item} icon={it?.emoji ?? '❔'} title={it ? itemName(it, s.lang) : g.item} sub={srcLabel(g)}
            right={<button className="glass-btn lg" style={{ height: 32, fontSize: 14 }} onClick={() => devRevoke(h.id, g.item).then(load).catch(onError)}>{t('dev.revoke')}</button>} />
        })}
      </Section>
      <Section>
        <SelectRow label={t('dev.grantWhat')} value={what} onChange={setWhat}
          options={CATALOG.filter((i) => ruleOf(i.id)).map((i) => ({ value: i.id, label: `${i.emoji} ${itemName(i, s.lang)} · ${t(`col.kind.${i.kind}`)}` }))} />
        <SelectRow label={t('dev.grantAs')} value={as} onChange={setAs} options={SOURCES.map((v) => ({ value: v, label: t(`dev.src.${v}`) }))} />
        <button className="row tap accent" onClick={grant}>{t('dev.grant')}</button>
      </Section>
    </Sheet>
  )
}

/** Developers: connect the bot and see whether it works — webhook, delivery errors, who it can write to. */
function BotHealth() {
  const s = useApp()
  const t = useT()
  const [d, setD] = useState<BotDiag | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { telegramDiag().then(setD) }, [])
  const setup = async () => {
    setBusy(true)
    const r = await telegramSetup()
    setBusy(false)
    setD(r)
    toast(r.error === 'not configured' ? t('tgd.noToken') : r.error ? t('dev.err', { msg: r.error }) : t('tg.setupDone', { bot: r.bot ?? '?' }))
  }
  const ok = (v?: boolean) => (v ? '✅' : '⚠️')
  const noToken = d?.error === 'not configured'
  return (
    <Section header="Telegram" footer={noToken ? t('tg.setupHint') : t('tgd.hint')}>
      {d === null ? <div className="row"><span className="label">…</span></div> : noToken ? (
        <div className="row"><span className="label">⚠️ {t('tgd.noToken')}</span></div>
      ) : d.error && d.error !== 'not configured' && d.bot === undefined ? (
        <div className="row"><span className="label">⚠️ {d.error}</span></div>
      ) : (
        <>
          <div className="row"><span className="label">{ok(!!d.bot)} {t('tgd.bot')}</span><span className="value">{d.bot ? '@' + d.bot : '—'}</span></div>
          <div className="row"><span className="label">{ok(d.webhook)} {t('tgd.webhook')}</span><span className="value">{d.webhook ? t('tgd.ours') : d.webhookUrl ?? t('tgd.none')}</span></div>
          <div className="row"><span className="label">{ok(!d.pending)} {t('tgd.pending')}</span><span className="value">{d.pending ?? 0}</span></div>
          {d.lastError && <Row icon="⚠️" title={t('tgd.lastError')} sub={`${d.lastError}${d.lastErrorAt ? ' · ' + fmtDate(d.lastErrorAt.slice(0, 10), s.lang) + ' ' + d.lastErrorAt.slice(11, 16) : ''}`} />}
          <div className="row"><span className="label">{ok(d.meLinked)} {t('tgd.me')}</span><span className="value">{d.meLinked ? '✓' : '—'}</span></div>
          <div className="row"><span className="label">👥 {t('tgd.linked')}</span><span className="value">{d.linked ?? 0}</span></div>
        </>
      )}
      <button className="row tap accent" disabled={busy} onClick={setup}>✈️ {busy ? '…' : t('tg.setup')}</button>
      {d?.bot && <a className="row tap accent" href={`https://t.me/${d.bot}`} target="_blank" rel="noreferrer">💬 {t('tgd.open')}</a>}
    </Section>
  )
}

/** How a marathon reward is earned, for its locked card in the collection. */
export function eventHow(id: string, s: State, t: ReturnType<typeof useT>): string {
  const item = ITEMS[id]
  if (!item) return ''
  if (TG_PERKS[id]) return t(`tgp.how.${TG_PERKS[id]}` as TKey)
  if (item.kind === 'atmo' && item.key.startsWith('c-')) {
    const when = nextWeekOf(item.key.slice(2))
    const m = marathonOf(s)
    if (when && when === m.current.monday) return t('mr.now')
    return when ? t('mr.nextTime', { date: fmtDate(when, s.lang, { day: 'numeric', month: 'long', year: 'numeric' }) }) : t('col.event')
  }
  if (item.kind === 'card' && /^m\d\d$/.test(item.key)) return t('mr.howMonth')
  return t('mr.howStreak', { n: ({ parrot: 2, globe: 4, camel: 8, suitcase: 13, kangaroo: 26, passport: 39 } as Record<string, number>)[item.key] ?? 52 })
}


/** The world shelf: the passport so far and this week's country. */
function WorldHeader() {
  const s = useApp()
  const t = useT()
  const m = marathonOf(s)
  return (
    <div className="col-world">
      <span>{m.current.culture.flag} <b>{t('mr.week', { name: m.current.culture.name[s.lang] })}</b></span>
      <span>🛂 {t('mr.stamps', { n: m.stamps.length })} · {t('mr.ofAll', { n: CATALOG.filter(isCulture).length })}</span>
    </div>
  )
}

/* ---------- the flame's colour, the couple's frame, the mascot's hat ---------- */
/** The flame in the couple's colour (filters and a little animation — no extra images). */
export function FlameGlyph({ id }: { id?: string }) {
  const s = useApp()
  const f = FLAMES[ITEMS[id ?? activeFlame(s)]?.key ?? 'classic'] ?? FLAMES.classic
  return <span className={'flame-g' + (f.anim ? ` fl-${f.anim}` : '')} style={f.filter ? { filter: f.filter } : undefined}>{f.glyph}</span>
}
/** Class, CSS variables and a little decoration for the ring around the couple's avatars. */
export function frameOf(id: string): { cls: string; style?: CSSProperties; deco?: string } {
  const f = FRAMES[ITEMS[id]?.key ?? 'none'] ?? {}
  if (!f.ring) return { cls: '' }
  return { cls: ' framed' + (f.spin ? ' spin' : ''), style: { '--ring': f.ring, '--glow': f.glow ?? 'transparent' } as CSSProperties, deco: f.deco }
}
function FramedAvatars({ id }: { id: string }) {
  const s = useApp()
  const fr = frameOf(id)
  return (
    <span className={'couple-avatars' + fr.cls} style={fr.style}>
      <span>{s.users[s.me].emoji}</span><span>{s.users[s.me === 'a' ? 'j' : 'a'].emoji}</span>
      {fr.deco && <><i className="frame-deco d1">{fr.deco}</i><i className="frame-deco d2">{fr.deco}</i></>}
    </span>
  )
}
/** What the mascot wears, placed over a .mascot-view (sizes follow --mascot). */
export function HatOn({ id }: { id?: string }) {
  const s = useApp()
  const h = HATS[ITEMS[id ?? activeHat(s)]?.key ?? 'none']
  if (!h?.glyph) return null
  // Placed on this mascot's head / eyes / neck (anchors.ts); the glyph sits centred in a 1.25 × 1.15 box.
  const [x, y, size, rot = 0] = anchorsOf(ITEMS[activeMascot(s)]?.key ?? 'fox')[h.pos]
  const style = { left: `calc(var(--mascot) * ${0.125 + x})`, top: `calc(var(--mascot) * ${0.075 + y})`, fontSize: `calc(var(--mascot) * ${size})`, transform: `translate(-50%, -50%) rotate(${rot}deg)` }
  return <span className="mascot-hat" style={style}>{h.glyph}</span>
}
