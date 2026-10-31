import { useEffect, useState, type CSSProperties } from 'react'
import { base, getState, other, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { DateRow, GlassButton, Icon, Marks, Row, Screen, Section, Segmented, Sheet, Swipe, Switch, TextRow, VisibilityFields, emojiList } from '../ui'
import { diffDays, fmtDate, fmtMoney, fromISO, LOCALES, toISO, today } from '../lib/date'
import { budgetColor, catEmoji, catTitle } from '../lib/cats'
import type { Expense, Goal, Recurring, State, UserId } from '../types'

export const currencyOf = (s: State) => (s.country === 'ES' ? 'EUR' : 'PLN')
const pct = (s: State, u: UserId) => (u === 'a' ? s.splitA : 100 - s.splitA) / 100

/** Positive: partner owes me. Shared costs split by the configured ratio; settlements move money directly. */
function balance(s: State, me: UserId) {
  let b = 0
  for (const e of visible(s.expenses, me)) {
    if (!e.shared || e.income) continue
    if (e.settlement) { b += e.paidBy === me ? e.amount : -e.amount; continue }
    b += e.paidBy === me ? e.amount * pct(s, other(me)) : -e.amount * pct(s, me)
  }
  return Math.round(b * 100) / 100
}

type Filter = 'all' | 'shared' | 'mine'
function monthExpenses(s: State, month: string, filter: Filter = 'all') {
  // Shared expenses plus my own personal ones; the partner's personal spending stays theirs.
  return visible(s.expenses, s.me).filter((e) => !e.settlement && e.date.startsWith(month) && (e.shared || e.paidBy === s.me))
    .filter((e) => filter === 'all' || (filter === 'shared' ? e.shared : !e.shared))
}

/** Month totals for the Today card and the hero. */
export function monthSpending(s: State, month: string, filter: Filter = 'all') {
  const list = monthExpenses(s, month, filter)
  const spent = list.filter((e) => !e.income).reduce((a, e) => a + e.amount, 0)
  const income = list.filter((e) => e.income).reduce((a, e) => a + e.amount, 0)
  const limit = Object.entries(s.budgets).filter(([c]) => s.budgetCats.some((x) => x.id === c && !x.hidden)).reduce((a, [, v]) => a + v, 0)
  return { spent, income, limit, list }
}

/** Recurring payments due this month that haven't been booked yet (deterministic ids keep both phones from doubling them). */
export function bookRecurring() {
  const s = getState()
  const month = today().slice(0, 7)
  const day = Number(today().slice(8, 10))
  const due = visible(s.recurring, s.me).filter((r) => r.active && r.day <= day && !s.expenses.some((e) => e.id === `rec-${r.id}-${month}`))
  if (!due.length) return
  update((st) => {
    for (const r of due) {
      st.expenses.push({
        id: `rec-${r.id}-${month}`, createdBy: r.createdBy, createdAt: new Date().toISOString(), title: r.title, amount: r.amount,
        currency: currencyOf(st), category: r.category, paidBy: r.paidBy, shared: r.shared,
        date: `${month}-${String(Math.min(r.day, 28)).padStart(2, '0')}`, recurringId: r.id,
      })
    }
  })
}

function Donut({ parts }: { parts: { value: number; color: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1
  const C = 2 * Math.PI * 52
  let offset = 0
  return (
    <svg className="donut" viewBox="0 0 132 132">
      <circle cx="66" cy="66" r="52" fill="none" stroke="var(--fill)" strokeWidth="16" />
      {parts.map((p, i) => {
        const len = (p.value / total) * C
        const el = <circle key={i} cx="66" cy="66" r="52" fill="none" stroke={p.color} strokeWidth="16"
          strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-offset} transform="rotate(-90 66 66)" strokeLinecap="butt" />
        offset += len
        return el
      })}
    </svg>
  )
}

export default function Budget({ back }: { back?: boolean }) {
  const s = useApp()
  const t = useT()
  const [month, setMonth] = useState(today().slice(0, 7))
  const [edit, setEdit] = useState<Expense | null>(null)
  const [limitCat, setLimitCat] = useState<string | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [rec, setRec] = useState<Recurring | null>(null)
  const cur = currencyOf(s)
  const money = (n: number) => fmtMoney(n, cur, s.lang)
  const filter = s.prefs.budgetFilter
  useEffect(() => { bookRecurring() }, [])

  const { spent, income, limit, list } = monthSpending(s, month, filter)
  const expenses = list.filter((e) => !e.income)
  const cats = s.budgetCats.filter((c) => !c.hidden && c.id !== 'salary')
  const byCat = cats.map((c) => ({ c: c.id, sum: expenses.filter((e) => e.category === c.id).reduce((a, e) => a + e.amount, 0) }))
    .filter((x) => x.sum > 0 || s.budgets[x.c]).sort((a, b) => b.sum - a.sum)

  // Pace: average per day so far, projected to the end of the month, against last month.
  const first = fromISO(month + '-01')
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const isCurrent = month === today().slice(0, 7)
  const daysGone = isCurrent ? Number(today().slice(8, 10)) : daysInMonth
  const perDay = spent / Math.max(1, daysGone)
  const forecast = isCurrent ? perDay * daysInMonth : spent
  const lastMonth = toISO(new Date(first.getFullYear(), first.getMonth() - 1, 1)).slice(0, 7)
  const prevSpent = monthSpending(s, lastMonth, filter).spent
  const delta = prevSpent ? Math.round(((isCurrent ? forecast : spent) / prevSpent - 1) * 100) : null

  const sharedSpent = { a: 0, j: 0 }
  for (const e of expenses) if (e.shared) sharedSpent[e.paidBy] += e.amount
  const sharedTotal = sharedSpent.a + sharedSpent.j

  const bal = balance(s, s.me)
  const partner = other(s.me)
  const shift = (n: number) => setMonth(toISO(new Date(first.getFullYear(), first.getMonth() + n, 1)).slice(0, 7))
  const days = [...new Set(list.map((e) => e.date))].sort().reverse()
  const goals = visible(s.goals, s.me)
  const recurring = visible(s.recurring, s.me)

  return (
    <Screen title={moduleLabel(s, 'budget').title} back={back} accent="budget"
      right={<GlassButton icon="plus" label={t('newExpense')} onClick={() => setEdit(newExpense(s))} />}
      hero={<div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="glass-btn lg" onClick={() => shift(-1)} aria-label="Previous"><Icon name="back" /></button>
          <div className="cap" style={{ fontWeight: 700 }}>{new Intl.DateTimeFormat(LOCALES[s.lang], { month: 'long', year: 'numeric' }).format(first)}</div>
          <button className="glass-btn lg" onClick={() => shift(1)} aria-label="Next"><Icon name="fwd" /></button>
        </div>
        <div className="hero-big money" style={{ marginTop: 14 }}>{money(income ? income - spent : spent)}</div>
        <div className="hero-sub">{income ? `${t('remaining')} · ${t('spent')} ${money(spent)}` : t('spent')}{limit ? ` · ${t('ofLimit', { sum: money(limit) })}` : ''}</div>
        {limit > 0 && (
          <div className="progress" style={{ background: 'rgba(255,255,255,.25)', margin: '14px 20px 0' }}>
            <i style={{ width: Math.min(100, (spent / limit) * 100) + '%', background: '#fff' }} />
          </div>
        )}
      </div>}
      actions={[
        { icon: '💸', label: t('expenses'), onClick: () => setEdit(newExpense(s)) },
        { icon: '💼', label: t('income'), onClick: () => setEdit({ ...newExpense(s), income: true, category: 'salary', shared: false }) },
        { icon: '🐷', label: t('goals'), onClick: () => setGoal({ ...base(s.me), title: '', emoji: '🐷', target: 1000, saved: 0 }) },
        ...(bal !== 0 ? [{ icon: '🤝', label: t('settle'), onClick: () => update((st) => {
          st.expenses.push({ ...base(st.me), title: t('settlement'), amount: Math.abs(bal), currency: cur, category: 'other',
            paidBy: bal > 0 ? partner : st.me, shared: true, date: today(), settlement: true })
        }) }] : []),
      ]}
      head={<Segmented value={filter} onChange={(budgetFilter) => update((st) => { st.prefs.budgetFilter = budgetFilter })}
        options={[{ value: 'all', label: t('filter.all') }, { value: 'shared', label: t('filter.shared') }, { value: 'mine', label: t('personal') }]} />}>

      <div className="stat-row">
        <div className="stat"><span>{t('avgDay')}</span><b className="money">{money(Math.round(perDay))}</b></div>
        <div className="stat"><span>{t('forecast')}</span><b className="money">{money(Math.round(forecast))}</b></div>
        <div className="stat"><span>{t('vsLast')}</span><b style={{ color: delta == null ? undefined : delta > 0 ? 'var(--red)' : 'var(--green)' }}>{delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta}%`}</b></div>
      </div>

      <Section>
        <Row icon={bal === 0 ? '🤝' : '⚖️'}
          title={bal === 0 ? t('settled') : bal > 0
            ? t('owes', { a: s.users[partner].name, b: s.users[s.me].name, sum: money(bal) })
            : t('owes', { a: s.users[s.me].name, b: s.users[partner].name, sum: money(-bal) })} />
        {sharedTotal > 0 && (
          <div style={{ padding: '4px 16px 14px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--label2)' }}>{t('byPerson')}</div>
            <div className="split-bar"><i style={{ width: (sharedSpent.a / sharedTotal) * 100 + '%', background: 'var(--a)' }} /><i style={{ width: (sharedSpent.j / sharedTotal) * 100 + '%', background: 'var(--j)' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--label2)' }}>
              <span>{s.users.a.emoji} {money(sharedSpent.a)}</span><span>{money(sharedSpent.j)} {s.users.j.emoji}</span>
            </div>
          </div>
        )}
      </Section>

      {byCat.some((x) => x.sum > 0) && (
        <Section big header={t('byCategory')}>
          <div className="donut-wrap">
            <Donut parts={byCat.filter((x) => x.sum > 0).map((x) => ({ value: x.sum, color: budgetColor(s, x.c) }))} />
            <div className="legend">
              {byCat.filter((x) => x.sum > 0).slice(0, 6).map((x) => (
                <div key={x.c}><i style={{ background: budgetColor(s, x.c) }} /><span>{catTitle(s, 'budget', x.c)}</span><b>{Math.round((x.sum / (spent || 1)) * 100)}%</b></div>
              ))}
            </div>
          </div>
        </Section>
      )}

      <Section big header={t('limits')} footer={t('limitHint')}>
        {(byCat.length ? byCat : cats.slice(0, 4).map((c) => ({ c: c.id, sum: 0 }))).map(({ c, sum }) => {
          const lim = s.budgets[c]
          const p = lim ? Math.min(100, (sum / lim) * 100) : 0
          return (
            <Row key={c} icon={catEmoji(s, 'budget', c)} onClick={() => setLimitCat(c)} iconBg={`color-mix(in srgb, ${budgetColor(s, c)} 18%, transparent)`}
              title={<div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>{catTitle(s, 'budget', c)}</span>
                <span className="money" style={{ color: lim && sum > lim ? 'var(--red)' : undefined }}>{money(sum)}</span>
              </div>}
              sub={lim ? <div style={{ width: '100%' }}>
                <div className="progress"><i style={{ width: p + '%', '--c': sum > lim ? 'var(--red)' : budgetColor(s, c) } as CSSProperties} /></div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{t('ofLimit', { sum: money(lim) })} · {t('remaining')} {money(Math.max(0, lim - sum))}</div>
              </div> : undefined} />
          )
        })}
      </Section>

      {goals.length > 0 && (
        <>
          <div className="section-header" style={{ padding: '6px 30px 8px' }}><span>🐷 {t('goals')}</span></div>
          <div className="goal-grid">
            {goals.map((g) => (
              <button key={g.id} className="goal" onClick={() => setGoal(g)}>
                <div className="g-emoji">{g.emoji}</div>
                <div className="g-title">{g.title}</div>
                <div className="progress"><i style={{ width: Math.min(100, (g.saved / g.target) * 100) + '%', '--c': 'var(--green)' } as CSSProperties} /></div>
                <div className="g-sum">{money(g.saved)} / {money(g.target)}</div>
              </button>
            ))}
          </div>
        </>
      )}

      <Section big header={`🔁 ${t('recurringT')}`} action={<button onClick={() => setRec({ ...base(s.me), title: '', amount: 0, category: 'subscriptions', paidBy: s.me, shared: true, day: 1, active: true })}>+ {t('add')}</button>}>
        {recurring.length === 0 && <Row title={<span style={{ color: 'var(--label2)' }}>{t('empty')}</span>} />}
        {recurring.map((r) => (
          <Row key={r.id} icon={catEmoji(s, 'budget', r.category)} title={r.title} dim={!r.active} onClick={() => setRec(r)}
            sub={`${t('monthlyOn', { n: r.day })} · ${s.users[r.paidBy].emoji} ${r.shared ? t('shared') : t('personal')}`}
            detail={<span className="money" style={{ color: 'var(--label)' }}>{money(r.amount)}</span>} />
        ))}
      </Section>

      {days.map((day) => (
        <Section key={day} big header={<span className="cap" style={{ display: 'inline-block' }}>{fmtDate(day, s.lang, { weekday: 'short', day: 'numeric', month: 'long' })}</span>}>
          {list.filter((e) => e.date === day).map((e) => (
            <Swipe key={e.id} onDelete={() => update((st) => { st.expenses = st.expenses.filter((x) => x.id !== e.id) })}>
              <Row icon={catEmoji(s, 'budget', e.category)} iconBg={`color-mix(in srgb, ${budgetColor(s, e.category)} 18%, transparent)`}
                title={<>{e.title} <Marks x={e} />{e.recurringId && ' 🔁'}</>}
                sub={<>{s.users[e.paidBy].emoji} {e.income ? t('income') : e.shared ? t('shared') : t('personal')}</>}
                detail={<span className="money" style={{ color: e.income ? 'var(--green)' : 'var(--label)' }}>{e.income ? '+' : ''}{money(e.amount)}</span>}
                onClick={() => setEdit(e)} />
            </Swipe>
          ))}
        </Section>
      ))}

      {edit && <ExpenseEditor expense={edit} onClose={() => setEdit(null)} />}
      {limitCat && <LimitSheet cat={limitCat} onClose={() => setLimitCat(null)} />}
      {goal && <GoalSheet goal={goal} onClose={() => setGoal(null)} />}
      {rec && <RecurringSheet rec={rec} onClose={() => setRec(null)} />}
    </Screen>
  )
}

function newExpense(s: State): Expense {
  return { ...base(s.me), title: '', amount: 0, currency: currencyOf(s), category: 'groceries', paidBy: s.me, shared: true, date: today() }
}

const parseAmount = (v: string) => parseFloat(v.replace(',', '.'))
const AmountInput = ({ value, onChange, autoFocus, placeholder = '0' }: { value: string; onChange: (v: string) => void; autoFocus?: boolean; placeholder?: string }) => (
  <input className="amount-input money" inputMode="decimal" placeholder={placeholder} value={value} autoFocus={autoFocus}
    onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))} />
)

function CategoryPicker({ value, onChange, income }: { value: string; onChange: (c: string) => void; income?: boolean }) {
  const s = useApp()
  const cats = s.budgetCats.filter((c) => !c.hidden && (income ? ['salary', 'other', 'gifts'].includes(c.id) || c.custom : c.id !== 'salary'))
  return (
    <div className="cat-grid">
      {cats.map((c) => (
        <button key={c.id} className={'cat-btn' + (value === c.id ? ' on' : '')} onClick={() => onChange(c.id)}>
          <span className="ce">{c.emoji}</span>{catTitle(s, 'budget', c.id)}
        </button>
      ))}
    </div>
  )
}

function ExpenseEditor({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(expense)
  const [amount, setAmount] = useState(expense.amount ? String(expense.amount) : '')
  const isNew = !s.expenses.some((e) => e.id === expense.id)
  const parsed = parseAmount(amount)
  const save = () => update((st) => {
    // A surprise purchase stays in the buyer's personal budget so shared totals don't give it away.
    const x = { ...v, amount: parsed, title: v.title.trim() || catTitle(st, 'budget', v.category), shared: v.surpriseFor ? false : v.shared }
    if (isNew) st.expenses.push(x)
    else st.expenses = st.expenses.map((e) => (e.id === x.id ? x : e))
  })
  return (
    <Sheet title={isNew ? (v.income ? t('income') : t('newExpense')) : t('edit')} onClose={onClose} onDone={save} doneDisabled={!(parsed > 0)}>
      <div style={{ margin: '0 14px' }}>
        <Segmented inSheet value={v.income ? 'in' : 'out'} onChange={(x) => setV({ ...v, income: x === 'in' || undefined, category: x === 'in' ? 'salary' : 'groceries', shared: x === 'in' ? false : v.shared })}
          options={[{ value: 'out', label: `💸 ${t('expenses')}` }, { value: 'in', label: `💼 ${t('income')}` }]} />
      </div>
      <AmountInput value={amount} onChange={setAmount} autoFocus={isNew} />
      <div style={{ textAlign: 'center', marginTop: -14, marginBottom: 16, color: 'var(--label2)' }}>{v.currency}</div>
      <CategoryPicker value={v.category} onChange={(category) => setV({ ...v, category })} income={v.income} />
      <Section>
        <TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('title')} />
        <DateRow label={t('date')} value={v.date} clearable={false} onChange={(date) => date && setV({ ...v, date })} />
      </Section>
      <div style={{ margin: '0 14px' }}>
        <div className="section-header">{v.income ? t('who') : t('paidBy')}</div>
        <Segmented inSheet value={v.paidBy} onChange={(paidBy) => setV({ ...v, paidBy })}
          options={(['a', 'j'] as UserId[]).map((u) => ({ value: u, label: `${s.users[u].emoji} ${s.users[u].name}` }))} />
        {!v.surpriseFor && <Segmented inSheet value={v.shared ? 'shared' : 'personal'} onChange={(x) => setV({ ...v, shared: x === 'shared' })}
          options={[{ value: 'shared', label: `💞 ${t('shared')}` }, { value: 'personal', label: `👤 ${t('personal')}` }]} />}
      </div>
      {!v.income && <VisibilityFields value={v} onChange={setV} />}
      {!isNew && (
        <Section>
          <button className="row tap destructive" onClick={() => { update((st) => { st.expenses = st.expenses.filter((e) => e.id !== v.id) }); onClose() }}>{t('delete')}</button>
        </Section>
      )}
    </Sheet>
  )
}

function LimitSheet({ cat, onClose }: { cat: string; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(s.budgets[cat] ? String(s.budgets[cat]) : '')
  return (
    <Sheet title={`${catEmoji(s, 'budget', cat)} ${catTitle(s, 'budget', cat)}`} onClose={onClose}
      onDone={() => update((st) => { const n = parseAmount(v); if (n > 0) st.budgets[cat] = n; else delete st.budgets[cat] })}>
      <div className="section-header" style={{ padding: '0 30px 8px' }}>{t('limit')}</div>
      <AmountInput value={v} onChange={setV} autoFocus placeholder={t('noLimit')} />
    </Sheet>
  )
}

function GoalSheet({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(goal)
  const [target, setTarget] = useState(String(goal.target))
  const [add, setAdd] = useState('')
  const isNew = !s.goals.some((g) => g.id === goal.id)
  const money = (n: number) => fmtMoney(n, currencyOf(s), s.lang)
  const left = v.deadline ? diffDays(v.deadline, today()) : null
  return (
    <Sheet title={isNew ? t('newGoal') : `${v.emoji} ${v.title}`} onClose={onClose} doneDisabled={!v.title.trim() || !(parseAmount(target) > 0)}
      onDone={() => update((st) => {
        const x = { ...v, target: parseAmount(target), saved: v.saved + (parseAmount(add) || 0) }
        if (isNew) st.goals.push(x); else st.goals = st.goals.map((g) => (g.id === x.id ? x : g))
      })}>
      {!isNew && (
        <div style={{ textAlign: 'center', padding: '0 20px 8px' }}>
          <div style={{ fontSize: 54 }}>{v.emoji}</div>
          <div className="hero-big money" style={{ fontSize: 36 }}>{money(v.saved)}</div>
          <div style={{ color: 'var(--label2)' }}>{t('target')}: {money(v.target)}{left != null && left >= 0 ? ` · ${t('inDays', { n: left })}` : ''}</div>
          <div className="progress" style={{ margin: '12px 20px 4px' }}><i style={{ width: Math.min(100, (v.saved / v.target) * 100) + '%', '--c': 'var(--green)' } as CSSProperties} /></div>
          <div className="section-header" style={{ justifyContent: 'center', marginTop: 12 }}>{t('addMoney')}</div>
          <AmountInput value={add} onChange={setAdd} placeholder="+0" />
        </div>
      )}
      <Section>
        <TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('title')} autoFocus={isNew} />
        <div className="row"><span className="label">{t('target')}</span><input className="pill-input money" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d.,]/g, ''))} style={{ maxWidth: 140 }} /></div>
        <DateRow label={`📅 ${t('date')}`} value={v.deadline} onChange={(deadline) => setV({ ...v, deadline })} />
      </Section>
      <Section header={t('emoji')}>
        <div className="emoji-grid">
          {['🐷', '🏝️', '🇪🇸', '🏠', '🚗', '💍', '🎁', '✈️', '💻', '📱', '🛋️', '🐶', ...emojiList().slice(0, 4)].map((e) => (
            <button key={e} className={e === v.emoji ? 'on' : ''} onClick={() => setV({ ...v, emoji: e })}>{e}</button>
          ))}
        </div>
      </Section>
      {!isNew && (
        <Section>
          <button className="row tap destructive" onClick={() => { update((st) => { st.goals = st.goals.filter((g) => g.id !== v.id) }); onClose() }}>{t('delete')}</button>
        </Section>
      )}
    </Sheet>
  )
}

function RecurringSheet({ rec, onClose }: { rec: Recurring; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(rec)
  const [amount, setAmount] = useState(rec.amount ? String(rec.amount) : '')
  const isNew = !s.recurring.some((r) => r.id === rec.id)
  return (
    <Sheet title={isNew ? t('newRecurring') : v.title} onClose={onClose} doneDisabled={!v.title.trim() || !(parseAmount(amount) > 0)}
      onDone={() => {
        update((st) => {
          const x = { ...v, amount: parseAmount(amount), day: Math.min(28, Math.max(1, v.day)) }
          if (isNew) st.recurring.push(x); else st.recurring = st.recurring.map((r) => (r.id === x.id ? x : r))
        })
        bookRecurring()
      }}>
      <AmountInput value={amount} onChange={setAmount} autoFocus={isNew} />
      <CategoryPicker value={v.category} onChange={(category) => setV({ ...v, category })} />
      <Section>
        <TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('title')} />
        <div className="row"><span className="label">{t('dayOfMonth')}</span>
          <input className="pill-input" type="number" min={1} max={28} value={v.day} style={{ maxWidth: 80 }} onChange={(e) => setV({ ...v, day: Number(e.target.value) || 1 })} />
        </div>
        <div className="row"><span className="label">{t('active')}</span><Switch on={v.active} onChange={(active) => setV({ ...v, active })} /></div>
      </Section>
      <div style={{ margin: '0 14px' }}>
        <div className="section-header">{t('paidBy')}</div>
        <Segmented inSheet value={v.paidBy} onChange={(paidBy) => setV({ ...v, paidBy })}
          options={(['a', 'j'] as UserId[]).map((u) => ({ value: u, label: `${s.users[u].emoji} ${s.users[u].name}` }))} />
        <Segmented inSheet value={v.shared ? 'shared' : 'personal'} onChange={(x) => setV({ ...v, shared: x === 'shared' })}
          options={[{ value: 'shared', label: `💞 ${t('shared')}` }, { value: 'personal', label: `👤 ${t('personal')}` }]} />
      </div>
      {!isNew && (
        <Section>
          <button className="row tap destructive" onClick={() => { update((st) => { st.recurring = st.recurring.filter((r) => r.id !== v.id) }); onClose() }}>{t('delete')}</button>
        </Section>
      )}
    </Sheet>
  )
}
