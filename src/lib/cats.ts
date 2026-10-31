import type { State } from '../types'
import { translate, type TKey } from '../i18n'
import { BUDGET_COLOR, EXTRA_COLORS } from './categories'

/** Display name for a grocery or budget category: custom title, else the translated built-in name. */
export function catTitle(s: State, kind: 'grocery' | 'budget', id: string) {
  const list = kind === 'grocery' ? s.groceryCats : s.budgetCats
  const c = list.find((x) => x.id === id)
  if (c?.title) return c.title
  const key = (kind === 'grocery' ? `cat.${id}` : `bcat.${id}`) as TKey
  const tr = translate(s.lang, key)
  return tr === key ? id : tr
}

export function catEmoji(s: State, kind: 'grocery' | 'budget', id: string) {
  const list = kind === 'grocery' ? s.groceryCats : s.budgetCats
  return list.find((x) => x.id === id)?.emoji ?? '🛍️'
}

export function budgetColor(s: State, id: string) {
  if (BUDGET_COLOR[id]) return BUDGET_COLOR[id]
  const i = s.budgetCats.filter((c) => c.custom).findIndex((c) => c.id === id)
  return EXTRA_COLORS[Math.max(0, i) % EXTRA_COLORS.length]
}
