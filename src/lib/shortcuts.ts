import type { Lang } from '../types'
import { API_BASE } from './widget'

/** A ready-made recipe for the Shortcuts app that talks to our personal API. */
export interface Preset {
  id: string; emoji: string
  kind: 'ask' | 'share' | 'auto' | 'read'
  route: 'add' | 'list'
  /** Fixed JSON fields (besides the key) or the query for list routes. */
  fields?: Record<string, string>
  /** Field filled from Shortcuts: "text" ← provided input, or several for the Wallet automation. */
  input?: Record<string, string>
  query?: string
  text: Record<'ru' | 'en', { title: string; desc: string; prompt?: string; trigger?: string; apps?: string; runFrom: string }>
}

export const PRESETS: Preset[] = [
  {
    id: 'groceries', emoji: '🛒', kind: 'ask', route: 'add', fields: { list: 'groceries' }, input: { text: 'Введённый текст' },
    text: {
      ru: { title: 'Добавить в продукты', desc: 'Пишешь или диктуешь «молоко, хлеб и яйца» — всё разложится по отделам.', prompt: 'Что купить?', runFrom: 'Виджет «Команды», касание задней панели, кнопка действия, Apple Watch' },
      en: { title: 'Add to groceries', desc: 'Type or dictate “milk, bread and eggs” — sorted into aisles.', prompt: 'What to buy?', runFrom: 'Shortcuts widget, Back Tap, Action button, Apple Watch' },
    },
  },
  {
    id: 'task', emoji: '✅', kind: 'ask', route: 'add', fields: { list: 'tasks' }, input: { text: 'Введённый текст' },
    text: {
      ru: { title: 'Новая задача', desc: 'Понимает «позвонить маме завтра 18:00».', prompt: 'Что сделать?', runFrom: 'Виджет «Команды», кнопка действия, Apple Watch' },
      en: { title: 'New task', desc: 'Understands “call mum tomorrow 18:00”.', prompt: 'What to do?', runFrom: 'Shortcuts widget, Action button, Apple Watch' },
    },
  },
  {
    id: 'music', emoji: '🎧', kind: 'share', route: 'add', fields: { list: 'music' }, input: { text: 'Входные данные команды' },
    text: {
      ru: { title: 'Трек в Family Hub', desc: 'В Spotify или YouTube: «Поделиться» → «Трек в Family Hub». Появится в «Музыке» с обложкой.', apps: 'Spotify, YouTube', runFrom: 'Меню «Поделиться»' },
      en: { title: 'Song to Family Hub', desc: 'In Spotify or YouTube: Share → “Song to Family Hub”. Shows up in Music with the cover.', apps: 'Spotify, YouTube', runFrom: 'Share menu' },
    },
  },
  {
    id: 'watch', emoji: '🍿', kind: 'share', route: 'add', fields: { list: 'watch' }, input: { text: 'Входные данные команды' },
    text: {
      ru: { title: 'Посмотреть позже', desc: 'Из Netflix, YouTube или Apple TV — в «Смотреть» со ссылкой и постером.', apps: 'Netflix, YouTube, Apple TV, Safari', runFrom: 'Меню «Поделиться»' },
      en: { title: 'Watch later', desc: 'From Netflix, YouTube or Apple TV — into the watchlist with link and poster.', apps: 'Netflix, YouTube, Apple TV, Safari', runFrom: 'Share menu' },
    },
  },
  {
    id: 'inbox', emoji: '📥', kind: 'share', route: 'add', fields: { list: 'inbox' }, input: { text: 'Входные данные команды' },
    text: {
      ru: { title: 'Во входящие', desc: 'Любая ссылка или текст — во «Входящие», разберёте потом.', apps: 'Safari, Instagram, любые приложения', runFrom: 'Меню «Поделиться»' },
      en: { title: 'To inbox', desc: 'Any link or text into the inbox, to sort later.', apps: 'Safari, Instagram, any app', runFrom: 'Share menu' },
    },
  },
  {
    id: 'wallet', emoji: '💳', kind: 'auto', route: 'add', fields: { list: 'expense', shared: 'true' }, input: { amount: 'Сумма', merchant: 'Продавец' },
    text: {
      ru: { title: 'Траты из Apple Pay', desc: 'Каждая оплата картой в Кошельке сама попадает в бюджет, категория — по магазину.', trigger: '«Транзакция» → выбери карты → «Запускать сразу»', runFrom: 'Автоматически' },
      en: { title: 'Apple Pay expenses', desc: 'Every Wallet card payment lands in the budget by itself, category by merchant.', trigger: '“Transaction” → pick cards → “Run Immediately”', runFrom: 'Automatic' },
    },
  },
  {
    id: 'drive', emoji: '🚗', kind: 'auto', route: 'add', fields: { list: 'status', event: 'drive' },
    text: {
      ru: { title: 'Статус «За рулём»', desc: 'Сел в машину — статус ставится сам. Вторая автоматизация на «Отключается» с теми же полями и end = 1 его снимет.', trigger: '«CarPlay» → «Подключается» (или «Bluetooth» → выбери магнитолу машины)', runFrom: 'Автоматически' },
      en: { title: '“Driving” status', desc: 'Get in the car and the status sets itself. A second automation on “Disconnects” with the same fields plus end = 1 clears it.', trigger: '“CarPlay” → “Connects” (or “Bluetooth” → pick the car stereo)', runFrom: 'Automatic' },
    },
  },
  {
    id: 'work', emoji: '💼', kind: 'auto', route: 'add', fields: { list: 'status', event: 'work' },
    text: {
      ru: { title: 'Статус «Работаю»', desc: 'По приходу на работу или включению фокуса «Работа». Снимается второй автоматизацией («Убытие» или фокус «Выключается») с end = 1.', trigger: '«Прибытие» → адрес работы, или «Фокусирование» → «Работа» → «Включается»', runFrom: 'Автоматически' },
      en: { title: '“Working” status', desc: 'When you arrive at work or turn on the Work focus. Cleared by a second one (“Leave” or focus “Is Turned Off”) with end = 1.', trigger: '“Arrive” → work address, or “Focus” → “Work” → “Is Turned On”', runFrom: 'Automatic' },
    },
  },
  {
    id: 'home', emoji: '🏠', kind: 'auto', route: 'add', fields: { list: 'status', event: 'home' },
    text: {
      ru: { title: 'Статус «Дома»', desc: 'Пришёл домой — «Дома». Если вы оба дома, на главной будет общий статус 💞. «Убытие» с end = 1 его снимет.', trigger: '«Прибытие» → «Дом»', runFrom: 'Автоматически' },
      en: { title: '“Home” status', desc: 'Arrive home — “Home”. When you’re both home, Today shows one shared status 💞. “Leave” with end = 1 clears it.', trigger: '“Arrive” → “Home”', runFrom: 'Automatic' },
    },
  },
  {
    id: 'sleep', emoji: '😴', kind: 'auto', route: 'add', fields: { list: 'status', event: 'sleep' },
    text: {
      ru: { title: 'Статус «Сплю»', desc: 'Вместе с режимом сна. Утром — вторая автоматизация на «Выключается» с end = 1.', trigger: '«Фокусирование» → «Сон» → «Включается»', runFrom: 'Автоматически' },
      en: { title: '“Sleeping” status', desc: 'Together with the Sleep focus. In the morning a second one on “Is Turned Off” with end = 1.', trigger: '“Focus” → “Sleep” → “Is Turned On”', runFrom: 'Automatic' },
    },
  },
  {
    id: 'rest', emoji: '🛋️', kind: 'auto', route: 'add', fields: { list: 'status', event: 'rest' },
    text: {
      ru: { title: 'Статус «Отдыхаю»', desc: 'Вместе с фокусом «Личное» (или «Не беспокоить»); можно и по времени, например в 21:00. Снимается так же, с end = 1.', trigger: '«Фокусирование» → «Личное» → «Включается», или «Время суток» → 21:00', runFrom: 'Автоматически' },
      en: { title: '“Resting” status', desc: 'Together with the Personal (or Do Not Disturb) focus; a time of day works too, e.g. 9 pm. Cleared the same way with end = 1.', trigger: '“Focus” → “Personal” → “Is Turned On”, or “Time of Day” → 21:00', runFrom: 'Automatic' },
    },
  },
  {
    id: 'readGroceries', emoji: '🗒️', kind: 'read', route: 'list', query: 'name=groceries',
    text: {
      ru: { title: 'Что купить?', desc: 'Показывает или читает вслух список продуктов — удобно в магазине и на часах.', runFrom: 'Виджет, Apple Watch, CarPlay' },
      en: { title: 'What to buy?', desc: 'Shows or reads out the shopping list — handy in the store and on the Watch.', runFrom: 'Widget, Apple Watch, CarPlay' },
    },
  },
  {
    id: 'readTasks', emoji: '📋', kind: 'read', route: 'list', query: 'name=tasks',
    text: {
      ru: { title: 'Задачи на сегодня', desc: 'Список задач на сегодня — например, утром по будильнику.', runFrom: 'Автоматизация «Будильник» → «Остановлен», виджет' },
      en: { title: 'Today’s tasks', desc: 'Today’s task list — e.g. in the morning when the alarm stops.', runFrom: '“Alarm” → “Is Stopped” automation, widget' },
    },
  },
]

export function presetSteps(p: Preset, lang: Lang) {
  const ru = lang === 'ru'
  const tx = p.text[ru ? 'ru' : 'en']
  const fixed = Object.entries(p.fields ?? {}).map(([k, v]) => `${k} = ${v}`)
  // Variable names as the Shortcuts app shows them in each language.
  const EN: Record<string, string> = { 'Введённый текст': 'Provided Input', 'Входные данные команды': 'Shortcut Input', 'Сумма': 'Amount', 'Продавец': 'Merchant' }
  const dynamic = Object.entries(p.input ?? {}).map(([k, v]) => (ru ? `${k} = «${v}»` : `${k} = “${EN[v] ?? v}”`))
  const fields = [ru ? 'key = твой ключ' : 'key = your key', ...fixed, ...dynamic].join(', ')
  const post = ru ? '«Получить содержимое URL»: адрес ниже, «Метод» → POST, «Тело запроса» → JSON.' : '“Get Contents of URL”: address below, Method → POST, Request Body → JSON.'
  const show = ru ? '«Показать уведомление» → «Содержимое URL» (необязательно).' : '“Show Notification” → “Contents of URL” (optional).'
  switch (p.kind) {
    case 'ask': return ru
      ? [`«Команды» → «+», назови «${tx.title}».`, `«Запросить ввод» (текст): «${tx.prompt}».`, post, `Поля JSON: ${fields}.`, show]
      : [`Shortcuts → “+”, name it “${tx.title}”.`, `“Ask for Input” (text): “${tx.prompt}”.`, post, `JSON fields: ${fields}.`, show]
    case 'share': return ru
      ? [`Новая команда «${tx.title}» → ⓘ → включи «Показывать в меню Поделиться» (URL и текст).`, post, `Поля JSON: ${fields}.`, show, `Готово: в ${tx.apps} → «Поделиться» → «${tx.title}».`]
      : [`New shortcut “${tx.title}” → ⓘ → turn on “Show in Share Sheet” (URLs and text).`, post, `JSON fields: ${fields}.`, show, `Done: in ${tx.apps} → Share → “${tx.title}”.`]
    case 'auto': return ru
      ? [`«Команды» → «Автоматизация» → «+» → ${tx.trigger}.`, '«Запускать сразу», уведомление о запуске — по вкусу.', post, `Поля JSON: ${fields}.`]
      : [`Shortcuts → Automation → “+” → ${tx.trigger}.`, '“Run Immediately”; run notification is up to you.', post, `JSON fields: ${fields}.`]
    case 'read': return ru
      ? [`Новая команда «${tx.title}».`, '«Получить содержимое URL»: адрес ниже (метод GET).', '«Быстрый просмотр» или «Произнести текст» → «Содержимое URL».']
      : [`New shortcut “${tx.title}”.`, '“Get Contents of URL”: address below (method GET).', '“Quick Look” or “Speak Text” → “Contents of URL”.']
  }
}

/* ---------- Android: the same API through MacroDroid (free, Google Play) ---------- */

type AndroidText = { trigger: string; endTrigger?: string; desc?: string; title?: string }
/**
 * MacroDroid triggers for the presets that make sense on Android. Adding to lists by hand is covered by the app
 * itself there (Share → Family Hub, long-press on the icon), so only automatic and read-out presets are listed.
 */
export const ANDROID: Record<string, Record<'ru' | 'en', AndroidText>> = {
  wallet: {
    ru: { title: 'Траты из Google Кошелька', trigger: '«Уведомление» → «Получено» → приложение Google Кошелёк', desc: 'Каждая оплата телефоном попадает в бюджет: сумму и магазин сервер берёт из текста уведомления.' },
    en: { title: 'Google Wallet expenses', trigger: '“Notification” → “Received” → Google Wallet app', desc: 'Every phone payment lands in the budget: the server reads amount and shop from the notification text.' },
  },
  drive: {
    ru: { trigger: '«Bluetooth» → «Подключено» → магнитола машины (или «Android Auto» → «Подключено»)', endTrigger: '«Bluetooth» → «Отключено» → та же магнитола', desc: 'Сел в машину — «За рулём», вышел — статус снимается сам.' },
    en: { trigger: '“Bluetooth” → “Connected” → the car stereo (or “Android Auto” → “Connected”)', endTrigger: '“Bluetooth” → “Disconnected” → the same stereo', desc: 'Get in the car — “Driving”; get out — it clears itself.' },
  },
  work: {
    ru: { trigger: '«Местоположение» → «Геозона» → «Вход» → адрес работы', endTrigger: '«Геозона» → «Выход» → адрес работы', desc: 'Пришёл на работу — «Работаю», ушёл — статус снимается.' },
    en: { trigger: '“Location” → “Geofence” → “Enter” → work address', endTrigger: '“Geofence” → “Exit” → work address', desc: 'Arrive at work — “Working”; leave — it clears.' },
  },
  home: {
    ru: { trigger: '«Местоположение» → «Геозона» → «Вход» → дом (или подключение к домашнему Wi-Fi)', endTrigger: '«Геозона» → «Выход» → дом (или отключение от домашнего Wi-Fi)', desc: 'Пришёл домой — «Дома». Если вы оба дома, на главной будет общий статус 💞.' },
    en: { trigger: '“Location” → “Geofence” → “Enter” → home (or connecting to home Wi-Fi)', endTrigger: '“Geofence” → “Exit” → home (or leaving home Wi-Fi)', desc: 'Arrive home — “Home”. When you’re both home, Today shows one shared status 💞.' },
  },
  sleep: {
    ru: { trigger: '«Не беспокоить» → «Включён» (на Pixel его включает «Режим отхода ко сну»)', endTrigger: '«Не беспокоить» → «Выключен»', desc: 'Лёг спать — «Сплю», утром статус снимается сам.' },
    en: { trigger: '“Do Not Disturb” → “Enabled” (on a Pixel, Bedtime mode turns it on)', endTrigger: '“Do Not Disturb” → “Disabled”', desc: 'Go to bed — “Sleeping”; in the morning it clears itself.' },
  },
  rest: {
    ru: { trigger: '«День/время» → например 21:00', desc: 'Снимать не обязательно: «Сплю» его заменит, а старый статус и так гаснет сам.' },
    en: { trigger: '“Day/Time” → e.g. 21:00', desc: 'No need to clear it: “Sleeping” replaces it, and old statuses fade anyway.' },
  },
  readGroceries: {
    ru: { trigger: '«Ярлык» (иконка макроса на главном экране) или «Голосовая команда»' },
    en: { trigger: '“Shortcut launched” (macro icon on the Home screen) or a voice trigger' },
  },
  readTasks: {
    ru: { trigger: '«Будильник» → «Отключён» (утром) или «Ярлык» на главном экране' },
    en: { trigger: '“Alarm” → “Dismissed” (mornings) or a Home-screen shortcut' },
  },
}

/** A plain GET address with everything in it: MacroDroid's HTTP request then needs nothing else. */
export function androidUrl(p: Preset, key: string, end = false) {
  if (p.route === 'list') return `${API_BASE}/list?${p.query}&key=${key}`
  // MacroDroid fills [notification_title] / [notification] with the payment notification's text.
  const extra = p.id === 'wallet' ? { text: '[notification_title]%20[notification]' } : {}
  const params = { key, ...p.fields, ...extra, ...(end ? { end: '1' } : {}) }
  return `${API_BASE}/add?` + Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')
}

export function androidSteps(p: Preset, lang: Lang) {
  const ru = lang === 'ru'
  const a = ANDROID[p.id][ru ? 'ru' : 'en']
  const where = a.endTrigger ? (ru ? '«Включение» ниже' : '“Start” below') : (ru ? 'ниже' : 'below')
  const http = ru ? `Действие: «Подключение» → «HTTP-запрос», метод GET, адрес — ${where}.` : `Action: “Connectivity” → “HTTP Request”, method GET, URL — ${where}.`
  const steps = ru
    ? ['Установи MacroDroid из Google Play и открой его.', '«Добавить макрос».', `Триггер: ${a.trigger}.`, http]
    : ['Install MacroDroid from Google Play and open it.', '“Add Macro”.', `Trigger: ${a.trigger}.`, http]
  if (p.kind === 'read') steps.push(ru
    ? 'В запросе сохрани ответ в текстовую переменную, затем «Уведомление» или «Произнести текст» с этой переменной.'
    : 'In the request save the response to a string variable, then “Display Notification” or “Speak Text” with it.')
  if (a.endTrigger) steps.push(ru
    ? `Второй макрос, чтобы статус снимался: триггер ${a.endTrigger}, тот же HTTP-запрос с адресом «Выключение».`
    : `A second macro clears the status: trigger ${a.endTrigger}, the same HTTP request with the “End” URL.`)
  return steps
}
