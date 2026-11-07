import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { base, other, update, useApp } from '../store'
import { useT, type TKey } from '../i18n'
import { useNav } from '../nav'
import { Check, Row, Screen, Section, Segmented, Sheet, haptic, toast } from '../ui'
import { addDays, fmtDate, today } from '../lib/date'
import {
  award, FLAME_MILESTONES, FREEZES_PER_MONTH, pausesOf, MOODS, moodEmoji, moodOf, MASCOT_STAGES, mascotMood, mascotStage, progress, questsFor, questText,
  TAP_GOAL, tapsOn, TREE_STAGES, treeStage, unaward,
} from '../lib/game'
import type { State } from '../types'
import { ITEMS } from '../lib/catalog'
import { activeLook, activeMascot, activeScene, lookOf } from '../lib/unlocks'
import { SceneView, openCollection } from './Collection'

/** Everything the ritual screens show, computed once per state change. */
export function useGame() {
  const s = useApp()
  const d = today()
  return useMemo(() => {
    const g = s.game
    const pauses = pausesOf(s)
    const p = progress(s.acts, pauses, d)
    const stage = g.pinnedStage ?? mascotStage(p.level)
    const tree = treeStage(p.treePoints)
    const shuffle = g.shuffle?.date === d ? g.shuffle.n : 0
    const quests = questsFor(d, g.questMode, shuffle)
    const marks = new Map(s.acts.filter((a) => a.kind === 'quest' && a.date === d).map((a) => [a.ref.split(':')[1], a]))
    const taps = tapsOn(s.acts, d)
    const pause = pauses.filter((x) => d >= x.from && d <= x.to).sort((a, b) => (a.to < b.to ? 1 : -1))[0]
    return { g, p, stage, tree, quests, marks, taps, pause, mood: mascotMood(p, pauses, d) }
  }, [s.acts, s.game, s.trips, d]) // eslint-disable-line react-hooks/exhaustive-deps
}

const mascotName = (s: State, t: ReturnType<typeof useT>) => s.game.mascotName || t('us.mascotDefault')

/** One love tap from me today (each person's count lives in one act per day). */
function tap() {
  update((st) => {
    const d = today()
    const id = `act:taps:${d}:${st.me}`
    const a = st.acts.find((x) => x.id === id)
    if (a) a.count = Math.min(TAP_GOAL, (a.count ?? 0) + 1)
    else st.acts.unshift({ id, kind: 'taps', ref: `${d}:${st.me}`, date: d, createdBy: st.me, createdAt: new Date().toISOString(), count: 1 })
  })
}

export function setMood(value: number) {
  update((st) => {
    const d = today()
    // A new record each time, so the server sees a fresh insert and can tell the partner.
    st.moods = st.moods.filter((m) => !(m.createdBy === st.me && m.date === d))
    st.moods.unshift({ ...base(st.me), date: d, value })
  })
  haptic()
}

/* ---------- pieces ---------- */
function MascotView({ big, onTap }: { big?: boolean; onTap?: () => void }) {
  const s = useApp()
  const { stage, mood } = useGame()
  const [hearts, setHearts] = useState(0)
  const st = MASCOT_STAGES[stage]
  const size = big ? st.size * 1.6 : st.size * 0.62
  return (
    <button className={`mascot-view mascot-${mood}`} style={{ '--mascot': `${size}px` } as CSSProperties}
      onClick={() => { onTap?.(); setHearts((n) => n + 1); haptic() }} aria-label="mascot">
      <span className="mascot-emoji">{ITEMS[activeMascot(s)].emoji}</span>
      <span className="mascot-badge">{mood === 'sleeping' ? '💤' : mood === 'vacation' ? '🏖️' : st.badge}</span>
      {hearts > 0 && <span key={hearts} className="mascot-hearts">💗💕💗</span>}
    </button>
  )
}

function TreeView({ big }: { big?: boolean }) {
  const { tree } = useGame()
  const st = TREE_STAGES[tree.index]
  const size = (big ? 70 : 34) + tree.index * (big ? 7 : 3)
  return (
    <div className="tree-view" style={{ '--tree': `${size}px` } as CSSProperties}>
      <span className="tree-emoji">{st.emoji}</span>
      {tree.index >= 7 && <span className="tree-sparkle">✨</span>}
    </div>
  )
}

function Flame() {
  const t = useT()
  const { p, pause } = useGame()
  return (
    <span className={'flame-chip' + (p.todayFed ? ' on' : '')}>
      {pause ? '🏖️' : '🔥'} {t('us.days', { n: p.streak })}
    </span>
  )
}

function XpBar() {
  const t = useT()
  const { p } = useGame()
  const pct = ((p.xp - p.from) / Math.max(1, p.to - p.from)) * 100
  return (
    <div className="xp">
      <div className="xp-top"><b>{t('us.level', { n: p.level })}</b><span>{t('us.toNext', { n: p.level + 1, x: p.to - p.xp })}</span></div>
      <div className="progress"><i style={{ width: `${pct}%`, '--c': 'var(--orange)' } as CSSProperties} /></div>
    </div>
  )
}

export function MoodRow() {
  const s = useApp()
  const t = useT()
  const mine = moodOf(s.moods, s.me)
  const theirs = moodOf(s.moods, other(s.me))
  return (
    <div className="mood-box">
      <div className="mood-row">
        {MOODS.map((m) => (
          <button key={m.value} className={'mood-btn' + (mine?.value === m.value ? ' on' : '')} onClick={() => setMood(m.value)}>
            <span>{m.emoji}</span><small>{t(`mood.${m.value}` as TKey)}</small>
          </button>
        ))}
      </div>
      <div className="mood-partner">
        {t('us.partnerMood', { name: s.users[other(s.me)].name })}: {theirs ? `${moodEmoji(theirs.value)} ${t(`mood.${theirs.value}` as TKey)}` : t('us.noMood')}
      </div>
    </div>
  )
}

/** Compact card on Today: mascot (or tree), flame, level and today's quests at a glance. */
export function RitualCard() {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const { g, p, marks, quests } = useGame()
  if (!g.enabled || (!g.mascot && !g.tree && !g.quests)) return null
  const done = quests.filter((q) => marks.has(q.id)).length
  return (
    <div className="section">
      <div className="list ritual-card" role="button" onClick={() => nav.open('us')}>
        {lookOf(activeLook(s)).decor && <span className="rc-decor">{lookOf(activeLook(s)).decor}</span>}
        <div className="rc-visual">{g.mascot ? <MascotView onTap={() => nav.open('us')} /> : <TreeView />}</div>
        <div className="rc-info">
          <div className="rc-line"><b>{g.mascot ? mascotName(s, t) : t('us.tree')}</b><Flame /></div>
          <span className="rc-sub">{p.todayFed ? t('us.fedToday') : t('us.notYet')}</span>
          <XpBar />
          {g.quests && <span className="rc-sub">✔︎ {t('us.quests')}: {done}/{quests.length}</span>}
        </div>
      </div>
    </div>
  )
}

/* ---------- the screen ---------- */
export default function Us({ back }: { back?: boolean }) {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const { g, p, stage, tree, quests, marks, taps, pause, mood } = useGame()
  const [view, setView] = useState<'mascot' | 'tree'>(g.mascot ? 'mascot' : 'tree')
  const [how, setHow] = useState(false)
  const d = today()
  const partner = other(s.me)

  if (!g.enabled) {
    return (
      <Screen title={t('mod.us')} accent="us" back={back} searchable={false}>
        <Section footer={t('us.off')}><Row icon="⚙️" title={t('us.settings')} chevron onClick={() => nav.settings('game')} /></Section>
      </Screen>
    )
  }

  const both = g.mascot && g.tree
  const showMascot = g.mascot && (view === 'mascot' || !g.tree)
  const nextTree = TREE_STAGES[tree.index + 1]
  const toggleQuest = (id: string) => update((st) => {
    const ref = `${d}:${id}`
    if (st.acts.some((a) => a.id === `act:quest:${ref}`)) unaward(st, 'quest', ref); else award(st, 'quest', ref)
  })
  const days = Array.from({ length: 14 }, (_, i) => addDays(d, i - 13))

  return (
    <Screen title={t('mod.us')} accent="us" back={back} searchable={false}
      hero={<div className="us-hero">
        {both && <Segmented value={view} onChange={setView}
          options={[{ value: 'mascot', label: `${ITEMS[activeMascot(s)].emoji} ${t('us.mascot')}` }, { value: 'tree', label: `🌳 ${t('us.tree')}` }]} />}
        {showMascot ? (
          <>
            <SceneView id={activeScene(s)} className={activeScene(s) !== 'scene:none' ? 'mascot-scene' : undefined}>
              <MascotView big onTap={g.taps ? tap : undefined} />
            </SceneView>
            <div className="hero-num" style={{ fontSize: 26 }}>{mascotName(s, t)}</div>
            <div className="hero-sub">{t(`mstage.${stage}` as TKey)} · {t(`mascot.${mood}` as TKey)}</div>
          </>
        ) : (
          <>
            <TreeView big />
            <div className="hero-num" style={{ fontSize: 26 }}>{t(`tstage.${tree.index}` as TKey)}</div>
            <div className="hero-sub">{t('us.treePoints', { n: p.treePoints })} · {nextTree
              ? t('us.toStage', { name: t(`tstage.${tree.index + 1}` as TKey), n: nextTree.at - p.treePoints }) : t('us.maxStage')}</div>
          </>
        )}
        <div className="us-flame"><Flame /><span>{t('us.best', { n: p.best })}</span></div>
        <XpBar />
      </div>}>

      <Section header={t('us.mood')}><MoodRow /></Section>

      {g.quests && (
        <Section header={t('us.quests')} footer={t('us.questsHint')}
          action={<button onClick={() => update((st) => { const n = st.game.shuffle?.date === d ? st.game.shuffle.n : 0; st.game.shuffle = { date: d, n: n + 1 } })}>↻ {t('us.another')}</button>}>
          {quests.map((q) => {
            const m = marks.get(q.id)
            return <Row key={q.id} left={<Check on={!!m} onChange={() => toggleQuest(q.id)} color="var(--orange)" />}
              title={questText(q, s.lang)} dim={!!m} sub={m ? `${s.users[m.createdBy].emoji} ${s.users[m.createdBy].name} · +5 XP` : undefined}
              onClick={() => toggleQuest(q.id)} />
          })}
        </Section>
      )}

      {g.taps && g.mascot && (
        <Section header={t('us.taps')} footer={t('us.tapsHint', { n: TAP_GOAL })}>
          <Row icon="💗" title={taps.a >= TAP_GOAL && taps.j >= TAP_GOAL ? t('us.tapsDone')
            : t('us.tapsNow', { a: taps[s.me], b: taps[partner], n: TAP_GOAL, name: s.users[partner].name })} onClick={tap} />
        </Section>
      )}

      <Section header={t('us.week')} footer={`${t('us.legend')} · ${t('us.freezes', { n: p.freezesLeft, m: FREEZES_PER_MONTH })}`}>
        <div className="week-strip">
          {days.map((x) => (
            <div key={x} className={'ws-day' + (x === d ? ' today' : '')}>
              <span>{p.fed.has(x) ? '🔥' : p.frozen.has(x) ? '❄️' : p.paused.has(x) ? '🏖️' : '·'}</span>
              <small>{fmtDate(x, s.lang, { weekday: 'narrow' })}</small>
            </div>
          ))}
        </div>
        {pause && <Row icon="🏖️" title={t('us.pausedTill', { date: fmtDate(pause.to, s.lang) })} />}
      </Section>

      <Section header={t('us.stats')}>
        <div className="hero-row us-stats">
          <div><div className="hero-num">{p.actions}</div><div className="hero-lbl">{t('us.actions')}</div></div>
          <div><div className="hero-num">{p.fed.size}</div><div className="hero-lbl">{t('us.fedDays')}</div></div>
          <div><div className="hero-num">{p.best}</div><div className="hero-lbl">{t('us.bestFlame')}</div></div>
        </div>
      </Section>

      <Section>
        <Row icon="❓" title={t('us.how')} chevron onClick={() => setHow(true)} />
        <Row icon="✨" title={t('col.title')} chevron onClick={() => openCollection(nav, 'mascot')} />
        <Row icon="⚙️" title={t('set.game')} chevron onClick={() => nav.settings('game')} />
      </Section>

      {how && (
        <Sheet title={t('us.how')} onClose={() => setHow(false)}>
          <Section>
            <Row icon="🔥" title={<span style={{ fontWeight: 400 }}>{t('us.how1')}</span>} />
            <Row icon="❄️" title={<span style={{ fontWeight: 400 }}>{t('us.how2', { n: FREEZES_PER_MONTH })}</span>} />
            <Row icon="⭐" title={<span style={{ fontWeight: 400 }}>{t('us.how3')}</span>} />
            <Row icon="🌳" title={<span style={{ fontWeight: 400 }}>{t('us.how4')}</span>} />
          </Section>
          <Section footer={t('us.howFeed')}><Row icon="💗" title={t('us.fedToday')} /></Section>
        </Sheet>
      )}
    </Screen>
  )
}

/** A small celebration when the couple reaches a new level, and a big one at 7 / 30 / 100 / 365 days of flame
 *  (per device, so each phone shows it once; a fresh install starts quietly from where the couple is). */
export function useLevelUp() {
  const t = useT()
  const s = useApp()
  const { p, g } = useGame()
  const [milestone, setMilestone] = useState(0)
  useEffect(() => {
    if (!g.enabled) return
    const key = 'familyhub:flame'
    const reached = FLAME_MILESTONES.filter((m) => p.streak >= m).pop() ?? 0
    let seen: number | null = null
    try { const v = localStorage.getItem(key); seen = v == null ? null : Number(v) } catch { /* ignore */ }
    if (seen != null && reached > seen) { setMilestone(reached); haptic() }
    if (seen == null || reached > seen) { try { localStorage.setItem(key, String(reached)) } catch { /* ignore */ } }
  }, [p.streak, g.enabled]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!g.enabled) return
    const key = 'familyhub:level'
    let seen = 0
    try { seen = Number(localStorage.getItem(key) ?? 0) } catch { /* ignore */ }
    if (seen && p.level > seen) {
      const stageUp = mascotStage(p.level) > mascotStage(seen) && g.mascot
      toast(stageUp ? `${ITEMS[activeMascot(s)].emoji} ${t('us.stageUp', { stage: t(`mstage.${mascotStage(p.level)}` as TKey) })}` : `🎉 ${t('us.levelUp', { n: p.level })}`)
      haptic()
    }
    try { localStorage.setItem(key, String(p.level)) } catch { /* ignore */ }
  }, [p.level, g.enabled]) // eslint-disable-line react-hooks/exhaustive-deps
  return { milestone, dismiss: () => setMilestone(0) }
}

/** Confetti and a big flame for 7 / 30 / 100 / 365 days in a row. */
export function Celebration({ n, onClose }: { n: number; onClose: () => void }) {
  const t = useT()
  const bits = ['🎉', '✨', '🔥', '💛', '🎊', '💞']
  return createPortal(
    <div className="celebrate" onClick={onClose}>
      <div className="ambient" aria-hidden>
        {Array.from({ length: 26 }, (_, i) => (
          <i key={i} style={{ left: `${(i * 37) % 100}%`, fontSize: 16 + (i % 4) * 6,
            '--anim': 'amb-fall', '--dur': `${3 + (i % 5) * 0.7}s`, '--delay': `${-(i % 7) * 0.45}s`, '--dx': `${((i % 9) - 4) * 14}px` } as CSSProperties}>{bits[i % bits.length]}</i>
        ))}
      </div>
      <div className="celebrate-card" onClick={(e) => e.stopPropagation()}>
        <div className="celebrate-flame">🔥<b>{n}</b></div>
        <h2>{t('us.milestone', { n })}</h2>
        <p>{t(`us.milestone${n}` as TKey)}</p>
        <button className="glass-btn lg tint" onClick={onClose}>{t('us.hooray')}</button>
      </div>
    </div>,
    document.body,
  )
}