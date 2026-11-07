import { base, update } from '../store'
import { translate } from '../i18n'
import { addDays, today } from './date'
import type { State } from '../types'

/*
 * A few example entries for a brand-new couple, so the first screens aren't empty (Ottership does the same).
 * Each one is marked «example · can be deleted», gives no points to the mascot and sends no push.
 */

export const hasExamples = (s: State) =>
  s.tasks.some((x) => x.example) || s.groceries.some((x) => x.example) || s.events.some((x) => x.example) || s.wishes.some((x) => x.example)

export function seedExamples() {
  update((st) => {
    if (hasExamples(st)) return
    const t = (k: Parameters<typeof translate>[1]) => translate(st.lang, k)
    const me = st.me, d = today()
    st.tasks = [{ ...base(me), title: t('ex.task'), due: d, assignee: 'both', done: false, repeat: 'none', example: true }, ...st.tasks]
    st.groceries = [
      { ...base(me), title: t('ex.gro1'), category: 'dairy', done: false, example: true },
      { ...base(me), title: t('ex.gro2'), category: 'bakery', done: false, example: true },
      ...st.groceries,
    ]
    st.events = [{ ...base(me), title: t('ex.event'), date: addDays(d, 1), time: '19:00', who: 'both', repeat: 'none', example: true }, ...st.events]
    st.wishes = [{ ...base(me), title: t('ex.wish'), owner: me, kind: 'gift', example: true }, ...st.wishes]
  })
}

export function removeExamples() {
  update((st) => {
    st.tasks = st.tasks.filter((x) => !x.example)
    st.groceries = st.groceries.filter((x) => !x.example)
    st.events = st.events.filter((x) => !x.example)
    st.wishes = st.wishes.filter((x) => !x.example)
  })
}
