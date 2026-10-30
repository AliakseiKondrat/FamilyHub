import type { Base, State, UserId } from './types'
import { addDays, today } from './lib/date'

let n = 0
const b = (by: UserId = 'a', extra: Partial<Base> = {}): Base => ({
  id: `demo-${++n}`, createdBy: by, createdAt: new Date().toISOString(), ...extra,
})

/** Empty data with default settings: the starting point for a signed-in, synced account. */
export function blankState(): State {
  return {
    ...demoState(),
    pet: { name: 'Честер', emoji: '🐶' },
    budgets: {},
    groceries: [], tasks: [], events: [], expenses: [], watch: [], recipes: [],
    petRecords: [], weights: [], notes: [], trips: [], photos: [], periods: [],
  }
}

/** Starting data so every screen has something to show; "Settings → Reset" brings it back. */
export function demoState(): State {
  n = 0
  const t = today()
  const d = (k: number) => addDays(t, k)
  return {
    version: 1,
    me: 'a',
    users: { a: { name: 'Алексей', emoji: '🧔' }, j: { name: 'Юля', emoji: '👩' } },
    lang: 'ru',
    country: 'PL',
    theme: 'auto',
    pet: { name: 'Честер', emoji: '🐶', birthday: '2022-04-12' },
    modules: {},
    budgets: { groceries: 2000, eating: 600, home: 800, pet: 300, fun: 400 },
    groceries: [
      { ...b('j'), title: 'Молоко', category: 'dairy', done: false },
      { ...b('a'), title: 'Бананы', category: 'produce', done: false },
      { ...b('j'), title: 'Авокадо', category: 'produce', done: false },
      { ...b('a'), title: 'Хлеб', category: 'bakery', done: false },
      { ...b('a'), title: 'Корм для Честера', category: 'pet', done: false },
      { ...b('j'), title: 'Бумажные полотенца', category: 'household', done: false },
      { ...b('a'), title: 'Сыр', category: 'dairy', done: true, doneAt: d(-1) },
    ],
    tasks: [
      { ...b('j'), title: 'Оплатить интернет', due: d(0), time: '20:00', assignee: 'a', done: false, repeat: 'monthly' },
      { ...b('a'), title: 'Записать Честера к ветеринару', due: d(1), assignee: 'both', done: false, repeat: 'none' },
      { ...b('j'), title: 'Поменять фильтр в вытяжке', due: d(-2), assignee: 'a', done: false, repeat: 'none' },
      { ...b('a'), title: 'Выбрать отель в Барселоне', due: d(5), assignee: 'j', done: false, repeat: 'none' },
      { ...b('a'), title: 'Разобрать шкаф', assignee: 'both', done: false, repeat: 'none' },
      { ...b('a', { surpriseFor: 'j' }), title: 'Заказать цветы Юле 💐', due: d(3), assignee: 'a', done: false, repeat: 'none' },
    ],
    events: [
      { ...b('a'), title: 'Ужин с друзьями', date: d(0), time: '19:30', endTime: '22:00', who: 'both', repeat: 'none' },
      { ...b('j'), title: 'Йога', date: d(1), time: '08:00', endTime: '09:00', who: 'j', repeat: 'weekly' },
      { ...b('a'), title: 'Стоматолог', date: d(4), time: '15:00', who: 'a', repeat: 'none' },
      { ...b('a', { surpriseFor: 'j' }), title: 'Сюрприз-свидание 🍷', date: d(6), time: '19:00', who: 'both', repeat: 'none' },
    ],
    expenses: [
      { ...b('a'), title: 'Biedronka', amount: 186.4, currency: 'PLN', category: 'groceries', paidBy: 'a', shared: true, date: d(-1) },
      { ...b('j'), title: 'Ужин в ресторане', amount: 240, currency: 'PLN', category: 'eating', paidBy: 'j', shared: true, date: d(-3) },
      { ...b('a'), title: 'Электричество', amount: 310, currency: 'PLN', category: 'home', paidBy: 'a', shared: true, date: d(-6) },
      { ...b('j'), title: 'Корм и вкусняшки', amount: 129, currency: 'PLN', category: 'pet', paidBy: 'j', shared: true, date: d(-8) },
      { ...b('a'), title: 'Netflix', amount: 49, currency: 'PLN', category: 'subscriptions', paidBy: 'a', shared: true, date: d(-10) },
    ],
    watch: [
      { ...b('j'), title: 'Дюна: Часть вторая', kind: 'movie', status: 'want' },
      { ...b('a'), title: 'Severance', kind: 'series', status: 'watching' },
      { ...b('j'), title: 'Прошлые жизни', kind: 'movie', status: 'done', rating: { a: 4, j: 5 } },
      { ...b('a'), title: 'Шоу Трумана', kind: 'movie', status: 'want' },
    ],
    recipes: [
      { ...b('j'), title: 'Паэлья с морепродуктами', url: 'https://www.example.com/paella', tags: ['ужин', 'испания'], ingredients: ['Рис для паэльи', 'Креветки', 'Мидии', 'Шафран', 'Лимон'], someday: true, cooked: 0 },
      { ...b('a'), title: 'Сырники', tags: ['завтрак'], ingredients: ['Творог', 'Яйца', 'Мука', 'Сметана'], someday: false, cooked: 6 },
      { ...b('j'), title: 'Рамен с нуля', tags: ['ужин', 'долго'], ingredients: ['Свиные кости', 'Лапша', 'Яйца', 'Мисо'], someday: true, cooked: 0 },
    ],
    petRecords: [
      { ...b('j'), kind: 'vaccine', title: 'Бешенство', date: addDays(t, -330), nextDue: d(35) },
      { ...b('a'), kind: 'parasite', title: 'Таблетка от клещей', date: d(-26), nextDue: d(4) },
      { ...b('j'), kind: 'vet', title: 'Плановый осмотр', date: d(-60), notes: 'Всё хорошо, вес в норме' },
      { ...b('a'), kind: 'groom', title: 'Груминг', date: d(-45), nextDue: d(15) },
    ],
    weights: [
      { id: 'w1', date: d(-120), kg: 11.2 }, { id: 'w2', date: d(-90), kg: 11.6 },
      { id: 'w3', date: d(-60), kg: 11.9 }, { id: 'w4', date: d(-30), kg: 12.1 }, { id: 'w5', date: d(-2), kg: 12.0 },
    ],
    notes: [
      { ...b('j'), module: 'home', title: 'Показания счётчиков', due: d(2), repeat: 'monthly', done: false },
      { ...b('a'), module: 'home', title: 'Гарантия на стиралку до 03.2027', notes: 'Чек в архиве' },
      { ...b('a'), module: 'inbox', title: 'Классный плед', url: 'https://www.example.com/pled' },
      { ...b('j'), module: 'inbox', title: 'Посмотреть квартиры в Валенсии' },
      { ...b('a'), module: 'dates', title: 'Пикник на закате', tags: ['лето', 'бесплатно'] },
      { ...b('j'), module: 'dates', title: 'Мастер-класс по керамике', tags: ['вместе'], url: 'https://www.example.com/ceramics' },
      { ...b('a'), module: 'dates', title: 'Кино под открытым небом', tags: ['лето'], done: true },
      { ...b('a', { privateTo: 'a' }), module: 'archive', title: 'Мои документы', notes: 'Только для меня' },
      { ...b('j'), module: 'archive', title: 'Договор аренды', url: 'https://www.example.com/lease.pdf' },
    ],
    trips: [
      {
        ...b('a'), title: 'Барселона', destination: 'Испания', start: d(24), end: d(29),
        plan: [{ id: 'p1', date: d(24), time: '07:15', title: '✈️ Вылет WAW → BCN' }, { id: 'p2', date: d(25), title: 'Саграда Фамилия' }],
        packing: [{ id: 'k1', title: 'Паспорта', done: true }, { id: 'k2', title: 'Зарядки', done: false }, { id: 'k3', title: 'Солнцезащитный крем', done: false }],
        docs: [{ id: 'dc1', title: 'Билеты Ryanair', url: 'https://www.example.com/tickets.pdf' }],
      },
    ],
    photos: [],
    periods: [
      { id: 'pr1', start: addDays(t, -60), end: addDays(t, -55) },
      { id: 'pr2', start: addDays(t, -32), end: addDays(t, -27) },
      { id: 'pr3', start: addDays(t, -4), end: addDays(t, 1) },
    ],
    cycleLength: 28,
    periodLength: 5,
  }
}
