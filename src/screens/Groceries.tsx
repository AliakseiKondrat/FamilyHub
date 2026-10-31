import { useState } from 'react'
import { base, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { Check, QuickAdd, Row, Screen, Section, Sheet, Swipe, TextRow, VisibilityFields, Marks } from '../ui'
import { guessCategory } from '../lib/categories'
import { catEmoji, catTitle } from '../lib/cats'
import { today } from '../lib/date'
import type { Grocery, State } from '../types'

const cap = (x: string) => x[0].toUpperCase() + x.slice(1)

/** Add items (comma-separated) to the list; a known item is just un-ticked. */
export function addItems(st: State, text: string, category?: string) {
  const cats = st.groceryCats.filter((c) => !c.hidden).map((c) => c.id)
  for (const title of text.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean)) {
    const existing = st.groceries.find((g) => g.title.toLowerCase() === title.toLowerCase())
    if (existing) { existing.done = false; if (category) existing.category = category; continue }
    const guess = guessCategory(title)
    st.groceries.unshift({ ...base(st.me), title: cap(title), category: category ?? (cats.includes(guess) ? guess : 'other'), done: false })
  }
}

export default function Groceries({ back }: { back?: boolean }) {
  const s = useApp()
  const t = useT()
  const [edit, setEdit] = useState<Grocery | null>(null)
  const list = visible(s.groceries, s.me)
  const todo = list.filter((g) => !g.done)
  const bought = list.filter((g) => g.done)
  const cats = s.groceryCats.filter((c) => !c.hidden)
  // Items whose category was hidden or deleted still show up, under "other".
  const catOf = (g: Grocery) => (cats.some((c) => c.id === g.category) ? g.category : 'other')

  // Items bought most often that aren't on the list right now.
  const counts = new Map<string, number>()
  for (const g of s.groceries) counts.set(g.title, (counts.get(g.title) ?? 0) + (g.done ? 2 : 1))
  const frequent = [...counts.entries()].filter(([title]) => !todo.some((g) => g.title === title))
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([title]) => title)

  const toggle = (id: string) => update((st) => {
    const g = st.groceries.find((x) => x.id === id)!
    g.done = !g.done
    g.doneAt = g.done ? today() : undefined
  })
  const remove = (id: string) => update((st) => { st.groceries = st.groceries.filter((x) => x.id !== id) })
  // Collapsed state is remembered per person; empty categories start collapsed.
  const collapsed = new Set(s.prefs.groceryCollapsed)
  const isOpen = (id: string, n: number) => (collapsed.has(id) ? false : collapsed.has('!' + id) ? true : n > 0)
  const setOpen = (id: string, open: boolean) => update((st) => {
    const set = new Set(st.prefs.groceryCollapsed.filter((x) => x !== id && x !== '!' + id))
    if (!open) set.add(id); else set.add('!' + id)
    st.prefs.groceryCollapsed = [...set]
  })

  const { title } = moduleLabel(s, 'groceries')
  return (
    <Screen title={title} back={back} accent="groceries" subtitle={todo.length ? `${todo.length} ${t('groceriesLeft')}` : undefined}
      head={<>
        <QuickAdd placeholder={t('gro.placeholder')} onAdd={(text) => update((st) => addItems(st, text))} />
        {s.prefs.groceryQuickChips && frequent.length > 0 && (
          <div className="chips">
            {frequent.map((f) => <button key={f} className="chip" onClick={() => update((st) => addItems(st, f))}>+ {f}</button>)}
          </div>
        )}
      </>}>

      {cats.map((c) => {
        const items = todo.filter((g) => catOf(g) === c.id)
        const open = isOpen(c.id, items.length)
        return (
          <div key={c.id} className={'section cat-card' + (open ? ' open' : '')}>
            <div className="list">
              <div className="card-head" onClick={() => setOpen(c.id, !open)} role="button">
                <span className="ch-left">{catEmoji(s, 'grocery', c.id)} {catTitle(s, 'grocery', c.id)}{items.length > 0 && <span className="ch-count">{items.length}</span>}</span>
                <svg className="ch-chev" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 1.5 7.5 7.5l-6 6" /></svg>
              </div>
              <div className="cat-body">
                <div>
                  {items.map((g) => (
                    <Swipe key={g.id} onDelete={() => remove(g.id)} onComplete={() => toggle(g.id)}>
                      <Row left={<Check on={false} onChange={() => toggle(g.id)} color="var(--green)" />}
                        title={<>{g.title} <Marks x={g} /></>} onClick={() => setEdit(g)} />
                    </Swipe>
                  ))}
                  <InlineAdd onAdd={(text) => update((st) => addItems(st, text, c.id))} placeholder={items.length ? t('addToCat') : t('emptyCat')} />
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {bought.length > 0 && (
        <Section big header={`🧺 ${t('inCart')}`} action={
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

function InlineAdd({ onAdd, placeholder }: { onAdd: (text: string) => void; placeholder: string }) {
  const [v, setV] = useState('')
  const submit = () => { if (v.trim()) { onAdd(v.trim()); setV('') } }
  return (
    <div className="row with-check inline-add">
      <span className="check" style={{ borderStyle: 'dashed', color: 'var(--blue)', display: 'grid', placeItems: 'center', fontSize: 16 }}>+</span>
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} enterKeyHint="done"
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }} onBlur={submit} />
    </div>
  )
}

function GroceryEditor({ item, onClose }: { item: Grocery; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(item)
  return (
    <Sheet title={item.title} onClose={onClose}
      onDone={() => update((st) => { st.groceries = st.groceries.map((g) => (g.id === v.id ? v : g)) })}>
      <Section><TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('title')} /></Section>
      <div className="section-header" style={{ padding: '0 30px 8px' }}>{t('category')}</div>
      <div className="cat-grid">
        {s.groceryCats.filter((c) => !c.hidden).map((c) => (
          <button key={c.id} className={'cat-btn' + (v.category === c.id ? ' on' : '')} onClick={() => setV({ ...v, category: c.id })}>
            <span className="ce">{c.emoji}</span>{catTitle(s, 'grocery', c.id)}
          </button>
        ))}
      </div>
      <VisibilityFields value={v} onChange={setV} />
      <Section>
        <button className="row tap destructive" onClick={() => { update((st) => { st.groceries = st.groceries.filter((g) => g.id !== v.id) }); onClose() }}>{t('delete')}</button>
      </Section>
    </Sheet>
  )
}
