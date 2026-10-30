import { useState, type CSSProperties } from 'react'
import { base, other, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { DateRow, GlassButton, Icon, Marks, Row, Screen, Section, Segmented, Sheet, Swipe, TextRow, VisibilityFields } from '../ui'
import { fmtDate, fmtMoney, fromISO, LOCALES, toISO, today } from '../lib/date'
import { BUDGET_CATS, BUDGET_COLOR, BUDGET_EMOJI } from '../lib/categories'
import type { Expense, State, UserId } from '../types'

export const currencyOf = (s: State) => (s.country === 'ES' ? 'EUR' : 'PLN')

/** Positive: partner owes me. Shared expenses split 50/50; settlements move money directly. */
function balance(s: State, me: UserId) {
  let b = 0
  for (const e of visible(s.expenses, me)) {
    if (!e.shared) continue
    const share = e.settlement ? e.amount : e.amount / 2
    b += e.paidBy === me ? share : -share
  }
  return Math.round(b * 100) / 100
}

export default function Budget() {
  const s = useApp()
  const t = useT()
  const [month, setMonth] = useState(today().slice(0, 7))
  const [edit, setEdit] = useState<Expense | null>(null)
  const [limitCat, setLimitCat] = useState<string | null>(null)
  const cur = currencyOf(s)
  const money = (n: number) => fmtMoney(n, cur, s.lang)

  const all = visible(s.expenses, s.me).filter((e) => !e.settlement)
  const inMonth = all.filter((e) => e.date.startsWith(month))
  // Shared expenses plus my own personal ones; partner's personal spending stays theirs.
  const mine = inMonth.filter((e) => e.shared || e.paidBy === s.me)
  const total = mine.reduce((a, e) => a + e.amount, 0)
  const byCat = BUDGET_CATS.map((c) => ({ c, sum: mine.filter((e) => e.category === c).reduce((a, e) => a + e.amount, 0) }))
    .filter((x) => x.sum > 0 || s.budgets[x.c]).sort((a, b) => b.sum - a.sum)
  const totalLimit = Object.values(s.budgets).reduce((a, b) => a + b, 0)

  const bal = balance(s, s.me)
  const partner = other(s.me)
  const first = fromISO(month + '-01')
  const shift = (n: number) => setMonth(toISO(new Date(first.getFullYear(), first.getMonth() + n, 1)).slice(0, 7))

  const days = [...new Set(mine.map((e) => e.date))].sort().reverse()

  return (
    <Screen title={moduleLabel(s, 'budget').title} back
      right={<GlassButton icon="plus" label={t('newExpense')} onClick={() => setEdit(newExpense(s))} />}>
      <div className="hero" style={{ '--h1': '#34c759', '--h2': '#30b0c7' } as CSSProperties}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="glass-btn" style={{ background: 'rgba(255,255,255,.2)', color: '#fff' }} onClick={() => shift(-1)}><Icon name="back" /></button>
          <div className="h-title cap" style={{ fontSize: 18 }}>
            {new Intl.DateTimeFormat(LOCALES[s.lang], { month: 'long', year: 'numeric' }).format(first)}
          </div>
          <button className="glass-btn" style={{ background: 'rgba(255,255,255,.2)', color: '#fff' }} onClick={() => shift(1)}><Icon name="fwd" /></button>
        </div>
        <div className="h-row" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <div>
            <div className="h-num money" style={{ fontSize: 34 }}>{money(total)}</div>
            <div className="h-lbl">{t('spent')}{totalLimit ? ` · ${t('ofLimit', { sum: money(totalLimit) })}` : ''}</div>
          </div>
        </div>
      </div>

      <Section>
        <Row icon={bal === 0 ? '🤝' : '⚖️'}
          title={bal === 0 ? t('settled') : bal > 0
            ? t('owes', { a: s.users[partner].name, b: s.users[s.me].name, sum: money(bal) })
            : t('owes', { a: s.users[s.me].name, b: s.users[partner].name, sum: money(-bal) })}
          right={bal !== 0 ? <button className="chip" style={{ background: 'var(--fill)' }} onClick={() => update((st) => {
            st.expenses.push({ ...base(st.me), title: t('settlement'), amount: Math.abs(bal), currency: cur, category: 'other',
              paidBy: bal > 0 ? partner : st.me, shared: true, date: today(), settlement: true })
          })}>{t('settle')}</button> : undefined} />
      </Section>

      <Section header={t('byCategory')} footer={t('limitHint')}>
        {byCat.map(({ c, sum }) => {
          const lim = s.budgets[c]
          const pct = lim ? Math.min(100, (sum / lim) * 100) : 0
          return (
            <Row key={c} icon={BUDGET_EMOJI[c]} onClick={() => setLimitCat(c)}
              title={<div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>{t(`bcat.${c}` as 'bcat.other')}</span>
                <span className="money" style={{ color: lim && sum > lim ? 'var(--red)' : undefined }}>{money(sum)}</span>
              </div>}
              sub={lim ? <div style={{ width: '100%' }}>
                <div className="progress"><i style={{ width: pct + '%', '--c': sum > lim ? 'var(--red)' : BUDGET_COLOR[c] } as CSSProperties} /></div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{t('ofLimit', { sum: money(lim) })}</div>
              </div> : undefined} />
          )
        })}
      </Section>

      {days.map((day) => (
        <Section key={day} header={fmtDate(day, s.lang, { weekday: 'short', day: 'numeric', month: 'long' })}>
          {mine.filter((e) => e.date === day).map((e) => (
            <Swipe key={e.id} onDelete={() => update((st) => { st.expenses = st.expenses.filter((x) => x.id !== e.id) })}>
              <Row icon={BUDGET_EMOJI[e.category]} iconBg={`color-mix(in srgb, ${BUDGET_COLOR[e.category]} 18%, transparent)`}
                title={<>{e.title} <Marks x={e} /></>}
                sub={<>{s.users[e.paidBy].emoji} {e.shared ? t('shared') : t('personal')}</>}
                detail={<span className="money" style={{ color: 'var(--label)' }}>{money(e.amount)}</span>}
                onClick={() => setEdit(e)} />
            </Swipe>
          ))}
        </Section>
      ))}

      {edit && <ExpenseEditor expense={edit} onClose={() => setEdit(null)} />}
      {limitCat && <LimitSheet cat={limitCat} onClose={() => setLimitCat(null)} />}
    </Screen>
  )
}

function newExpense(s: State): Expense {
  return { ...base(s.me), title: '', amount: 0, currency: currencyOf(s), category: 'groceries', paidBy: s.me, shared: true, date: today() }
}

function ExpenseEditor({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(expense)
  const [amount, setAmount] = useState(expense.amount ? String(expense.amount) : '')
  const isNew = !s.expenses.some((e) => e.id === expense.id)
  const parsed = parseFloat(amount.replace(',', '.'))
  const save = () => update((st) => {
    // A surprise purchase stays in the buyer's personal budget so shared totals don't give it away.
    const x = { ...v, amount: parsed, title: v.title.trim() || t(`bcat.${v.category}` as 'bcat.other'), shared: v.surpriseFor ? false : v.shared }
    if (isNew) st.expenses.push(x)
    else st.expenses = st.expenses.map((e) => (e.id === x.id ? x : e))
  })
  return (
    <Sheet title={isNew ? t('newExpense') : t('edit')} onClose={onClose} onDone={save} doneDisabled={!(parsed > 0)}>
      <input className="amount-input money" inputMode="decimal" placeholder="0" value={amount} autoFocus={isNew}
        onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} />
      <div style={{ textAlign: 'center', marginTop: -14, marginBottom: 16, color: 'var(--label2)' }}>{v.currency}</div>
      <div className="cat-grid">
        {BUDGET_CATS.map((c) => (
          <button key={c} className={'cat-btn' + (v.category === c ? ' on' : '')} onClick={() => setV({ ...v, category: c })}>
            <span className="ce">{BUDGET_EMOJI[c]}</span>{t(`bcat.${c}` as 'bcat.other')}
          </button>
        ))}
      </div>
      <Section>
        <TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('title')} />
        <DateRow label={t('date')} value={v.date} clearable={false} onChange={(date) => date && setV({ ...v, date })} />
      </Section>
      <div style={{ margin: '0 16px' }}>
        <div className="section-header">{t('paidBy')}</div>
        <Segmented inSheet value={v.paidBy} onChange={(paidBy) => setV({ ...v, paidBy })}
          options={(['a', 'j'] as UserId[]).map((u) => ({ value: u, label: `${s.users[u].emoji} ${s.users[u].name}` }))} />
        {!v.surpriseFor && <Segmented inSheet value={v.shared ? 'shared' : 'personal'} onChange={(x) => setV({ ...v, shared: x === 'shared' })}
          options={[{ value: 'shared', label: `💞 ${t('shared')}` }, { value: 'personal', label: `👤 ${t('personal')}` }]} />}
      </div>
      <VisibilityFields value={v} onChange={setV} />
    </Sheet>
  )
}

function LimitSheet({ cat, onClose }: { cat: string; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(s.budgets[cat] ? String(s.budgets[cat]) : '')
  return (
    <Sheet title={`${BUDGET_EMOJI[cat]} ${t(`bcat.${cat}` as 'bcat.other')}`} onClose={onClose}
      onDone={() => update((st) => { const n = parseFloat(v.replace(',', '.')); if (n > 0) st.budgets[cat] = n; else delete st.budgets[cat] })}>
      <div className="section-header" style={{ padding: '0 32px 7px' }}>{t('limit')}</div>
      <input className="amount-input money" inputMode="decimal" placeholder={t('noLimit')} value={v} autoFocus
        onChange={(e) => setV(e.target.value.replace(/[^\d.,]/g, ''))} />
    </Sheet>
  )
}
