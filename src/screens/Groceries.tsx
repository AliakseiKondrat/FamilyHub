import { useState } from 'react'
import { base, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { Check, Empty, QuickAdd, Row, Screen, Section, Sheet, Swipe, TextRow, VisibilityFields, Marks } from '../ui'
import { GROCERY_CATS, GROCERY_EMOJI, guessCategory } from '../lib/categories'
import { today } from '../lib/date'
import type { Grocery } from '../types'

export default function Groceries({ back }: { back?: boolean }) {
  const s = useApp()
  const t = useT()
  const [edit, setEdit] = useState<Grocery | null>(null)
  const list = visible(s.groceries, s.me)
  const todo = list.filter((g) => !g.done)
  const bought = list.filter((g) => g.done)

  // Items bought most often that aren't on the list right now.
  const counts = new Map<string, number>()
  for (const g of s.groceries) counts.set(g.title, (counts.get(g.title) ?? 0) + (g.done ? 2 : 1))
  const frequent = [...counts.entries()].filter(([title]) => !todo.some((g) => g.title === title))
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([title]) => title)

  const add = (text: string) => update((st) => {
    for (const title of text.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean)) {
      const existing = st.groceries.find((g) => g.title.toLowerCase() === title.toLowerCase())
      if (existing) { existing.done = false; continue }
      st.groceries.unshift({ ...base(st.me), title: title[0].toUpperCase() + title.slice(1), category: guessCategory(title), done: false })
    }
  })
  const toggle = (id: string) => update((st) => {
    const g = st.groceries.find((x) => x.id === id)!
    g.done = !g.done
    g.doneAt = g.done ? today() : undefined
  })
  const remove = (id: string) => update((st) => { st.groceries = st.groceries.filter((x) => x.id !== id) })

  const { title } = moduleLabel(s, 'groceries')
  return (
    <Screen title={title} back={back} subtitle={todo.length ? `${todo.length} ${t('groceriesLeft')}` : undefined}>
      <QuickAdd placeholder={t('gro.placeholder')} onAdd={add} />

      {frequent.length > 0 && (
        <div className="chips">
          {frequent.map((f) => <button key={f} className="chip" onClick={() => add(f)}>+ {f}</button>)}
        </div>
      )}

      {todo.length === 0 && <Empty emoji="🧺" text={t('empty')} />}

      {GROCERY_CATS.map((cat) => {
        const items = todo.filter((g) => g.category === cat)
        if (!items.length) return null
        return (
          <Section key={cat} header={`${GROCERY_EMOJI[cat]} ${t(`cat.${cat}`)}`}>
            {items.map((g) => (
              <Swipe key={g.id} onDelete={() => remove(g.id)}>
                <Row left={<Check on={false} onChange={() => toggle(g.id)} color="var(--green)" />}
                  title={<>{g.title} <Marks x={g} /></>} onClick={() => setEdit(g)} />
              </Swipe>
            ))}
          </Section>
        )
      })}

      {bought.length > 0 && (
        <Section header={t('inCart')} action={
          <button onClick={() => update((st) => { st.groceries = st.groceries.filter((g) => !g.done || !visible([g], st.me).length) })}>{t('clearBought')}</button>
        }>
          {bought.map((g) => (
            <Swipe key={g.id} onDelete={() => remove(g.id)}>
              <Row left={<Check on onChange={() => toggle(g.id)} color="var(--green)" />} title={g.title} dim />
            </Swipe>
          ))}
        </Section>
      )}

      {edit && <GroceryEditor item={edit} onClose={() => setEdit(null)} />}
    </Screen>
  )
}

function GroceryEditor({ item, onClose }: { item: Grocery; onClose: () => void }) {
  const t = useT()
  const [v, setV] = useState(item)
  return (
    <Sheet title={item.title} onClose={onClose}
      onDone={() => update((st) => { st.groceries = st.groceries.map((g) => (g.id === v.id ? v : g)) })}>
      <Section><TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('title')} /></Section>
      <div className="section-header" style={{ padding: '0 32px 7px' }}>{t('category')}</div>
      <div className="cat-grid">
        {GROCERY_CATS.map((c) => (
          <button key={c} className={'cat-btn' + (v.category === c ? ' on' : '')} onClick={() => setV({ ...v, category: c })}>
            <span className="ce">{GROCERY_EMOJI[c]}</span>{t(`cat.${c}`)}
          </button>
        ))}
      </div>
      <VisibilityFields value={v} onChange={setV} />
    </Sheet>
  )
}
