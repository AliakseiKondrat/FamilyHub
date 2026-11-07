import { useEffect, useState, type CSSProperties } from 'react'
import { update, useApp } from '../store'
import { useT, type TKey } from '../i18n'
import { useNav } from '../nav'
import { Row, Screen, Section, Sheet, haptic, toast } from '../ui'
import { fmtDate, addDays } from '../lib/date'
import { DAY_CAP, LEVEL_MAX, FLAME_MILESTONES } from '../lib/game'
import { CATALOG, ITEMS, itemName, type Item } from '../lib/catalog'
import { isOpen, ruleOf, statsOf, startTryOn } from '../lib/unlocks'
import { ACHIEVEMENTS, CHAINS, MEDALS, ROMAN, TITLES, chainStep, nextTitle, progressionOf, titleOf, unlockKeys, type Chain } from '../lib/progression'
import { claimCulture, cultureItem, cultureOfDate, joinMarathon, leaveMarathon, marathonOf, monthItem, type DayMark, type Marathon } from '../lib/marathon'
import { ItemSheet } from './Collection'
import type { State } from '../types'

/*
 * Progress and rewards: the couple's level (1–500) and title, today's XP against the daily cap, the reward track
 * (what opens next, with a preview), the «Around the world» marathon, long chains for every part of life,
 * one-off achievements, and banners when something new opens.
 */

const pct = (x: number) => `${Math.max(0, Math.min(100, x))}%`

/* ---------- the reward track: what opens next ---------- */
interface Node { key: string; emoji: string; title: string; sub: string; pct: number; item?: string; chain?: Chain; marathon?: true }

function useTrack(): Node[] {
  const s = useApp()
  const t = useT()
  const r = progressionOf(s)
  const m = r.m
  const nodes: Node[] = []
  const name = (id: string) => (ITEMS[id] ? itemName(ITEMS[id], s.lang) : id)
  if (s.game.enabled && s.game.quests) {
    if (m.joined) {
      const c = m.current.culture
      nodes.push({ key: 'week', emoji: c.flag, title: t('mr.week', { name: c.name[s.lang] }), sub: t('mr.days', { n: m.current.done }), pct: (m.current.done / 7) * 100, item: cultureItem(c) })
      if (!m.earned.has(monthItem(m.month.month))) nodes.push({ key: 'month', emoji: ITEMS[monthItem(m.month.month)]?.emoji ?? '📆', title: name(monthItem(m.month.month)), sub: t('mr.monthDays', { n: m.month.done, need: m.month.need }), pct: (m.month.done / m.month.need) * 100, item: monthItem(m.month.month) })
      if (m.nextStreak) nodes.push({ key: 'streak', emoji: ITEMS[m.nextStreak.item]?.emoji ?? '🧳', title: name(m.nextStreak.item), sub: t('mr.streak', { n: m.streak }) + ` / ${m.nextStreak.weeks}`, pct: (m.streak / m.nextStreak.weeks) * 100, item: m.nextStreak.item })
    } else {
      nodes.push({ key: 'join', emoji: '🌍', title: t('mr.title'), sub: t('mr.joinShort'), pct: 0, marathon: true })
    }
  }
  // The nearest catalog rewards by threshold (one per measure).
  const st = statsOf(s)
  const seen = new Set<string>()
  const cands = CATALOG.map((i) => ({ i, rule: ruleOf(i.id) })).filter((x) => x.rule && x.rule.m !== 'event' && !isOpen(x.i.id, s))
    .map((x) => ({ ...x, have: st[x.rule!.m as keyof typeof st] as number }))
    .sort((a, b) => b.have / b.rule!.n - a.have / a.rule!.n)
  for (const c of cands) {
    if (seen.has(c.rule!.m) || nodes.length > 7) continue
    seen.add(c.rule!.m)
    nodes.push({ key: c.i.id, emoji: c.i.emoji, title: itemName(c.i, s.lang), sub: t(`col.m.${c.rule!.m}` as TKey, { have: Math.min(c.have, c.rule!.n), n: c.rule!.n }), pct: (c.have / c.rule!.n) * 100, item: c.i.id })
  }
  // Next flame milestone and next title.
  const fm = FLAME_MILESTONES.find((n) => n > r.p.streak)
  if (fm) nodes.push({ key: 'flame', emoji: '🔥', title: t('pg.flameTo', { n: fm }), sub: t('us.days', { n: r.p.streak }), pct: (r.p.streak / fm) * 100 })
  const nt = nextTitle(r.p.level)
  if (nt) nodes.push({ key: 'title', emoji: '🏷️', title: `«${t(`title.${nt}` as TKey)}»`, sub: t('pg.atLevel', { n: nt }), pct: (r.p.level / nt) * 100 })
  // The chain closest to its next step.
  const ch = CHAINS.map((c) => ({ c, x: chainStep(c, r.chains[c.id]) })).filter((x) => !x.x.done).sort((a, b) => b.x.pct - a.x.pct)[0]
  if (ch) nodes.push({ key: 'chain', emoji: MEDALS[ch.x.reached] ?? '🏅', title: `${t(`ch.${ch.c.id}` as TKey)} ${ROMAN[ch.x.reached]}`, sub: `${r.chains[ch.c.id]} / ${ch.x.next}`, pct: ch.x.pct, chain: ch.c })
  return nodes
}

export function RewardTrack() {
  const t = useT()
  const nodes = useTrack()
  const [item, setItem] = useState<Item | null>(null)
  const [chain, setChain] = useState<Chain | null>(null)
  const [mar, setMar] = useState(false)
  if (!nodes.length) return null
  return (
    <Section header={t('pg.track')} footer={t('pg.trackHint')}>
      <div className="track">
        {nodes.map((n) => (
          <button key={n.key} className="track-node" onClick={() => { haptic(); if (n.item && ITEMS[n.item]) setItem(ITEMS[n.item]); else if (n.chain) setChain(n.chain); else if (n.marathon) setMar(true) }}>
            <span className="tn-emoji">{n.emoji}</span>
            <b>{n.title}</b>
            <span className="tn-sub">{n.sub}</span>
            <span className="tn-bar"><i style={{ width: pct(n.pct) }} /></span>
          </button>
        ))}
      </div>
      {item && <ItemSheet item={item} onClose={() => setItem(null)} />}
      {chain && <ChainSheet chain={chain} onClose={() => setChain(null)} />}
      {mar && <MarathonSheet onClose={() => setMar(false)} />}
    </Section>
  )
}

/* ---------- the marathon ---------- */
const DAY_ICON: Record<DayMark, string> = { done: '✓', part: '·', miss: '✕', pause: '🏖', today: '', future: '', out: '' }

function WeekDots({ m }: { m: Marathon }) {
  const s = useApp()
  return (
    <div className="mr-dots">
      {m.current.days.map((d) => (
        <span key={d.date} className={`mr-dot ${d.mark}`} title={fmtDate(d.date, s.lang)}>
          <small>{new Date(d.date + 'T00:00:00').toLocaleDateString(s.lang, { weekday: 'narrow' })}</small>
          <i>{d.mark === 'today' ? `${Math.min(3, d.n)}/3` : DAY_ICON[d.mark]}</i>
        </span>
      ))}
    </div>
  )
}

/** The marathon's card under the daily quests: this week's country, days so far, the month and weeks in a row. */
export function MarathonCard() {
  const s = useApp()
  const t = useT()
  const m = marathonOf(s)
  const [open, setOpen] = useState(false)
  const c = m.current.culture
  return (
    <Section header={`🌍 ${t('mr.title')}`} footer={m.joined ? (m.current.complete ? t('mr.weekDone', { name: c.name[s.lang] }) : m.current.failed ? t('mr.weekFail') : !m.current.eligible ? t('mr.short') : t('mr.rule')) : t('mr.pitch')}>
      <button className="mr-card" style={{ '--c1': c.a1, '--c2': c.a2 } as CSSProperties} onClick={() => setOpen(true)}>
        <span className="mr-flag">{c.flag}</span>
        <span className="mr-main">
          <b>{t('mr.week', { name: c.name[s.lang] })}</b>
          <span>{m.joined ? t('mr.days', { n: m.current.done }) : t('mr.joinShort')}</span>
        </span>
        <span className="mr-deco">{c.deco.slice(0, 2).join(' ')}</span>
      </button>
      {m.joined && <WeekDots m={m} />}
      {m.joined && (
        <div className="mr-stats">
          <span>📆 {t('mr.monthDays', { n: m.month.done, need: m.month.need })}</span>
          <span>🔗 {t('mr.streak', { n: m.streak })}</span>
          <span>🛂 {t('mr.stamps', { n: m.stamps.length })}</span>
          {m.jokers > 0 && <span>🃏 {t('mr.jokers', { n: m.jokers })}</span>}
        </div>
      )}
      {!m.joined && <button className="row tap accent" onClick={() => { update((st) => joinMarathon(st)); haptic(); toast(t('mr.joined')) }}>🌍 {t('mr.join')}</button>}
      {open && <MarathonSheet onClose={() => setOpen(false)} />}
    </Section>
  )
}

export function MarathonSheet({ onClose }: { onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const m = marathonOf(s)
  const [item, setItem] = useState<Item | null>(null)
  const [leave, setLeave] = useState(false)
  const c = m.current.culture
  const upcoming = Array.from({ length: 6 }, (_, i) => addDays(m.current.monday, (i + 1) * 7)).map((d) => ({ d, c: cultureOfDate(d) }))
  return (
    <Sheet title={`🌍 ${t('mr.title')}`} onClose={onClose}>
      <div className="mr-hero" style={{ '--c1': c.a1, '--c2': c.a2 } as CSSProperties}>
        <div className="mr-hero-flag">{c.flag}</div>
        <b>{c.name[s.lang]}</b>
        <span>{c.deco.join(' ')}</span>
      </div>
      {m.joined && <WeekDots m={m} />}
      <Section footer={t('mr.pitch')}>
        <button className="row tap accent" onClick={() => { startTryOn(cultureItem(c)); onClose() }}>👀 {t('mr.preview')}</button>
        <button className="row tap accent" onClick={() => setItem(ITEMS[cultureItem(c)])}>{c.flag} {t('mr.reward')}: {c.name[s.lang]}</button>
        {!m.joined && <button className="row tap accent" onClick={() => { update((st) => joinMarathon(st)); haptic(); toast(t('mr.joined')) }}>🌍 {t('mr.join')}</button>}
      </Section>
      {m.joined && (
        <Section header={t('mr.progress')}>
          <Row icon="📆" title={itemName(ITEMS[monthItem(m.month.month)], s.lang)} sub={t('mr.monthDays', { n: m.month.done, need: m.month.need })}
            detail={m.earned.has(monthItem(m.month.month)) ? '✓' : undefined} onClick={() => setItem(ITEMS[monthItem(m.month.month)])} />
          {m.nextStreak && <Row icon={ITEMS[m.nextStreak.item].emoji} title={itemName(ITEMS[m.nextStreak.item], s.lang)}
            sub={`${t('mr.streak', { n: m.streak })} / ${m.nextStreak.weeks}`} onClick={() => setItem(ITEMS[m.nextStreak!.item])} />}
          <Row icon="🏆" title={t('mr.best', { n: m.best })} />
        </Section>
      )}
      <Section header={t('mr.soon')}>
        {upcoming.map(({ d, c: x }) => (
          <Row key={d} icon={x.flag} title={x.name[s.lang]} detail={fmtDate(d, s.lang)} onClick={() => setItem(ITEMS[cultureItem(x)])} />
        ))}
      </Section>
      <Section header={`${t('mr.passport')} · ${t('mr.stamps', { n: m.stamps.length })}`} footer={m.stamps.length ? undefined : t('mr.noStamps')}>
        {m.stamps.length > 0 && <div className="passport">{m.stamps.map((x) => <button key={x.code} onClick={() => setItem(ITEMS[cultureItem(x)])}>{x.flag}</button>)}</div>}
      </Section>
      {m.missed.length > 0 && (
        <Section header={`${t('mr.missed')} · ${t('mr.jokers', { n: m.jokers })}`} footer={t('mr.jokerHint')}>
          {m.missed.map((x) => (
            <Row key={x.code} icon={x.flag} title={x.name[s.lang]}
              detail={m.jokers > 0 ? <button className="chip" onClick={(e) => { e.stopPropagation(); update((st) => claimCulture(st, x.code)); haptic(); toast(t('mr.claimed', { name: x.name[s.lang] })) }}>🃏 {t('mr.claim')}</button> : undefined} />
          ))}
        </Section>
      )}
      {m.joined && (
        <Section footer={t('mr.leaveHint')}>
          {leave
            ? <button className="row tap destructive" onClick={() => { update((st) => leaveMarathon(st)); setLeave(false); haptic() }}>{t('mr.leaveSure')}</button>
            : <button className="row tap destructive" onClick={() => setLeave(true)}>{t('mr.leave')}</button>}
        </Section>
      )}
      {item && <ItemSheet item={item} onClose={() => setItem(null)} />}
    </Sheet>
  )
}

/* ---------- chains ---------- */
function ChainSheet({ chain, onClose }: { chain: Chain; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const have = progressionOf(s).chains[chain.id]
  const x = chainStep(chain, have)
  return (
    <Sheet title={`${chain.emoji} ${t(`ch.${chain.id}` as TKey)}`} onClose={onClose}>
      <div className="chain-head"><b>{have}</b> {t(`chu.${chain.id}` as TKey)}</div>
      <Section>
        {chain.steps.map((n, i) => (
          <Row key={n} icon={i < x.reached ? MEDALS[i] : '🔒'} title={`${t(`ch.${chain.id}` as TKey)} ${ROMAN[i]}`} dim={i >= x.reached}
            sub={`${n} ${t(`chu.${chain.id}` as TKey)}`} detail={i < x.reached ? '✓' : i === x.reached ? `${have}/${n}` : undefined} />
        ))}
      </Section>
    </Sheet>
  )
}

/* ---------- the page ---------- */
export default function ProgressPage() {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const r = progressionOf(s)
  const [chain, setChain] = useState<Chain | null>(null)
  const [ach, setAch] = useState<string | null>(null)
  const tl = titleOf(r.p.level)
  const xpPct = r.p.max ? 100 : ((r.p.xp - r.p.from) / Math.max(1, r.p.to - r.p.from)) * 100
  return (
    <Screen title={t('pg.title')} back accent="us"
      hero={<div className="pg-hero">
        <div className="pg-title">«{t(`title.${tl}` as TKey)}»</div>
        <div className="pg-level">{t('pg.level', { n: r.p.level, max: LEVEL_MAX })}</div>
        <div className="progress"><i style={{ width: pct(xpPct), '--c': 'var(--orange)' } as CSSProperties} /></div>
        <div className="pg-today">{r.p.dayRaw >= DAY_CAP ? t('pg.capped') : t('pg.today', { x: r.p.dayXp, cap: DAY_CAP })}</div>
      </div>}>
      <RewardTrack />
      {s.game.enabled && s.game.quests && <MarathonCard />}
      <Section header={t('pg.chains')} footer={t('pg.chainsHint', { have: r.medals, all: r.medalsAll })}>
        {CHAINS.map((c) => {
          const x = chainStep(c, r.chains[c.id])
          return (
            <Row key={c.id} icon={c.emoji} chevron onClick={() => setChain(c)}
              title={<>{t(`ch.${c.id}` as TKey)} {x.reached > 0 && <span className="medal">{MEDALS[x.reached - 1]} {ROMAN[x.reached - 1]}</span>}</>}
              sub={<>
                <span>{x.done ? t('pg.maxed') : `${r.chains[c.id]} / ${x.next} ${t(`chu.${c.id}` as TKey)}`}</span>
                <span className="col-bar" style={{ margin: '6px 0 0' }}><i style={{ width: pct(x.pct) }} /></span>
              </>} />
          )
        })}
      </Section>
      <Section header={t('pg.ach')} footer={t('pg.achHint', { have: r.achieved.size, all: ACHIEVEMENTS.length })}>
        <div className="ach-grid">
          {ACHIEVEMENTS.map((a) => (
            <button key={a.id} className={'ach' + (r.achieved.has(a.id) ? ' on' : '')} onClick={() => setAch(a.id)}>
              <span>{a.emoji}</span><small>{t(`ach.${a.id}` as TKey)}</small>
            </button>
          ))}
        </div>
      </Section>
      <Section header={t('pg.titles')}>
        <div className="titles">
          {TITLES.map((n) => <span key={n} className={r.p.level >= n ? 'on' : ''}>{n} · {t(`title.${n}` as TKey)}</span>)}
        </div>
      </Section>
      <Section><Row icon="🏆" title={t('lb.title')} chevron onClick={() => nav.settings('leaders')} /></Section>
      {chain && <ChainSheet chain={chain} onClose={() => setChain(null)} />}
      {ach && (
        <Sheet title={`${ACHIEVEMENTS.find((a) => a.id === ach)!.emoji} ${t(`ach.${ach}` as TKey)}`} onClose={() => setAch(null)}>
          <Section footer={r.achieved.has(ach as never) ? t('pg.got') : t('pg.notYet')}><Row title={t(`ach.${ach}.d` as TKey)} /></Section>
        </Sheet>
      )}
    </Screen>
  )
}

/* ---------- «new!» banners ---------- */
const SEEN = 'familyhub:seen-unlocks'
const readSeen = (): Set<string> | null => { try { const v = localStorage.getItem(SEEN); return v ? new Set(JSON.parse(v)) : null } catch { return null } }
const writeSeen = (x: Set<string>) => { try { localStorage.setItem(SEEN, JSON.stringify([...x])) } catch { /* ignore */ } }

/** Shows a banner for each medal, achievement, title or marathon reward that opened since the app last looked. */
export function UnlockBanner() {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const [queue, setQueue] = useState<{ key: string; emoji: string; kind: string; name: string }[]>([])
  useEffect(() => {
    if (!s.game.enabled) return
    const r = progressionOf(s)
    const keys = [...unlockKeys(r), ...[...r.m.earned].map((i) => `i:${i}`)]
    const seen = readSeen()
    // First run: everything already there is old news.
    if (!seen) { writeSeen(new Set(keys)); return }
    const fresh = keys.filter((k) => !seen.has(k))
    if (!fresh.length) return
    fresh.forEach((k) => seen.add(k))
    writeSeen(seen)
    setQueue((q) => [...q, ...fresh.slice(0, 5).map((k) => describe(k, s, t))])
  }, [s.acts, s.game, s.moods]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!queue.length) return
    const id = setTimeout(() => setQueue((q) => q.slice(1)), 4500)
    return () => clearTimeout(id)
  }, [queue])
  const b = queue[0]
  if (!b) return null
  return (
    <button key={b.key} className="unlock-banner lg" onClick={() => { setQueue((q) => q.slice(1)); nav.settings('progress') }}>
      <span className="ub-emoji">{b.emoji}</span>
      <span><small>{b.kind}</small><b>{b.name}</b></span>
    </button>
  )
}

function describe(key: string, s: State, t: ReturnType<typeof useT>) {
  const [k, a, b] = key.split(':')
  if (k === 'a') { const x = ACHIEVEMENTS.find((y) => y.id === a); return { key, emoji: x?.emoji ?? '🏅', kind: t('pg.newAch'), name: t(`ach.${a}` as TKey) } }
  if (k === 'c') { const c = CHAINS.find((y) => y.id === a)!; const i = Number(b); return { key, emoji: MEDALS[i], kind: t('pg.newMedal'), name: `${t(`ch.${c.id}` as TKey)} ${ROMAN[i]}` } }
  if (k === 't') return { key, emoji: '🏷️', kind: t('pg.newTitle'), name: `«${t(`title.${a}` as TKey)}»` }
  const id = key.slice(2)
  return { key, emoji: ITEMS[id]?.emoji ?? '🎁', kind: t('pg.newItem'), name: ITEMS[id] ? itemName(ITEMS[id], s.lang) : id }
}
