import { useMemo, useState, type ReactNode } from 'react'
import { useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { useNav } from '../nav'
import { Empty, Icon, Row, Screen, Section } from '../ui'
import { fmtDate, fmtMoney } from '../lib/date'
import { catEmoji } from '../lib/cats'
import { currencyOf } from './Budget'
import type { ModuleId, State } from '../types'

interface Hit { id: string; module: ModuleId; title: string; sub?: string; icon?: ReactNode; trip?: string }

/** Every searchable record, flattened: what it's called, where it lives, and a short detail line. */
function index(s: State): Hit[] {
  const me = s.me
  const money = (n: number) => fmtMoney(n, currencyOf(s), s.lang)
  const date = (d?: string) => (d ? fmtDate(d, s.lang) : undefined)
  return [
    ...visible(s.tasks, me).map((x) => ({ id: x.id, module: 'tasks' as const, title: x.title, sub: [date(x.due), x.notes].filter(Boolean).join(' · '), icon: x.done ? '✓' : '○' })),
    ...visible(s.groceries, me).map((x) => ({ id: x.id, module: 'groceries' as const, title: x.title, icon: catEmoji(s, 'grocery', x.category) })),
    ...visible(s.events, me).map((x) => ({ id: x.id, module: 'calendar' as const, title: x.title, sub: [date(x.date), x.time, x.notes].filter(Boolean).join(' · '), icon: '📅' })),
    ...visible(s.expenses, me).filter((x) => !x.settlement).map((x) => ({ id: x.id, module: 'budget' as const, title: x.title, sub: `${money(x.amount)} · ${date(x.date)}`, icon: catEmoji(s, 'budget', x.category) })),
    ...visible(s.goals, me).map((x) => ({ id: x.id, module: 'budget' as const, title: x.title, sub: `${money(x.saved)} / ${money(x.target)}`, icon: x.emoji })),
    ...visible(s.recurring, me).map((x) => ({ id: x.id, module: 'budget' as const, title: x.title, sub: money(x.amount), icon: '🔁' })),
    ...visible(s.watch, me).map((x) => ({ id: x.id, module: 'watch' as const, title: x.title, sub: x.notes, icon: x.kind === 'series' ? '📺' : '🎬' })),
    ...visible(s.music, me).map((x) => ({ id: x.id, module: 'music' as const, title: x.title, sub: [x.artist, x.note].filter(Boolean).join(' · '), icon: '🎵' })),
    ...visible(s.recipes, me).map((x) => ({ id: x.id, module: 'recipes' as const, title: x.title, sub: [...x.tags, ...x.ingredients].join(', '), icon: '🍳' })),
    ...visible(s.notes, me).map((x) => ({ id: x.id, module: x.module, title: x.title, sub: [x.notes, x.url, ...(x.tags ?? [])].filter(Boolean).join(' · '), icon: x.url ? '🔗' : undefined })),
    ...visible(s.trips, me).map((x) => ({ id: x.id, module: 'travel' as const, title: x.title, sub: [x.destination, ...x.plan.map((p) => p.title), ...x.docs.map((d) => d.title)].filter(Boolean).join(' · '), icon: '✈️', trip: x.id })),
    ...visible(s.petRecords, me).map((x) => ({ id: x.id, module: 'pet' as const, title: x.title, sub: [date(x.date), x.notes].filter(Boolean).join(' · '), icon: '🐾' })),
  ]
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q)
  if (!q || i < 0) return <>{text}</>
  return <>{text.slice(0, i)}<mark className="result-hl">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>
}

export default function Search() {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const [q, setQ] = useState('')
  const all = useMemo(() => index(s), [s])
  const needle = q.trim().toLowerCase()
  const hits = needle ? all.filter((h) => `${h.title} ${h.sub ?? ''}`.toLowerCase().includes(needle)) : []
  // Group by section, biggest groups first.
  const groups = [...new Set(hits.map((h) => h.module))]
    .map((m) => ({ m, items: hits.filter((h) => h.module === m) }))
    .sort((a, b) => b.items.length - a.items.length)

  return (
    <Screen title={t('search')} back accent="more" searchable={false}
      head={<div className="quick lg">
        <span style={{ position: 'relative', zIndex: 2 }}><Icon name="search" style={{ width: 18, height: 18 }} /></span>
        <input data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchAll')} enterKeyHint="search" />
        {q && <button className="plus" onClick={() => setQ('')} aria-label="Clear"><Icon name="close" /></button>}
      </div>}>
      {!needle && <Empty emoji="🔎" text={t('searchHint')} />}
      {needle && hits.length === 0 && <Empty emoji="🤷" text={t('noResults')} />}
      {groups.map(({ m, items }) => {
        const l = moduleLabel(s, m)
        return (
          <Section key={m} big header={`${l.emoji} ${l.title} · ${items.length}`}>
            {items.slice(0, 12).map((h) => (
              <Row key={h.id} icon={h.icon ?? l.emoji} chevron
                title={<Highlight text={h.title} q={needle} />}
                sub={h.sub ? <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}><Highlight text={h.sub} q={needle} /></span> : undefined}
                onClick={() => (h.trip ? nav.push({ trip: h.trip }) : nav.open(m))} />
            ))}
          </Section>
        )
      })}
    </Screen>
  )
}
