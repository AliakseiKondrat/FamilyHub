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
  {
    id: 'readEvents', emoji: '📅', kind: 'read', route: 'list', query: 'name=events',
    text: {
      ru: { title: 'Что у нас в планах?', desc: 'Ближайшие события из общего календаря — вслух или на экране.', runFrom: 'Siri, виджет, Apple Watch, CarPlay' },
      en: { title: 'What’s coming up?', desc: 'The next events from the shared calendar — read out or on screen.', runFrom: 'Siri, widget, Apple Watch, CarPlay' },
    },
  },
  {
    id: 'expense', emoji: '💸', kind: 'ask', route: 'add', fields: { list: 'expense', shared: 'true' }, input: { text: 'Введённый текст' },
    text: {
      ru: { title: 'Записать трату', desc: 'Скажи «кофе 15» или «Biedronka 84,50» — сумма и магазин попадут в общий бюджет, категория определится сама.', prompt: 'Что и сколько?', runFrom: 'Siri, виджет «Команды», кнопка действия, Apple Watch' },
      en: { title: 'Log an expense', desc: 'Say “coffee 15” or “Biedronka 84.50” — amount and shop go to the shared budget, category picked automatically.', prompt: 'What and how much?', runFrom: 'Siri, Shortcuts widget, Action button, Apple Watch' },
    },
  },
  {
    id: 'wish', emoji: '🎁', kind: 'share', route: 'add', fields: { list: 'wish' }, input: { text: 'Входные данные команды' },
    text: {
      ru: { title: 'В вишлист', desc: 'Увидел что-то в магазине — «Поделиться» → «В вишлист». Название и картинка подтянутся сами.', apps: 'Allegro, Amazon, Zalando, Safari', runFrom: 'Меню «Поделиться»' },
      en: { title: 'To wishlist', desc: 'Saw something in a shop — Share → “To wishlist”. Name and picture fill in by themselves.', apps: 'Allegro, Amazon, Zalando, Safari', runFrom: 'Share menu' },
    },
  },
  {
    id: 'place', emoji: '📍', kind: 'share', route: 'add', fields: { list: 'place' }, input: { text: 'Входные данные команды' },
    text: {
      ru: { title: 'Место для свидания', desc: 'Кафе или выставка из карт или Instagram — «Поделиться» → место попадёт в «Свидания».', apps: 'Google Карты, Apple Карты, Instagram, Safari', runFrom: 'Меню «Поделиться»' },
      en: { title: 'Date spot', desc: 'A café or an exhibition from maps or Instagram — Share → it lands in Dates.', apps: 'Google Maps, Apple Maps, Instagram, Safari', runFrom: 'Share menu' },
    },
  },
  {
    id: 'recipe', emoji: '🍳', kind: 'share', route: 'add', fields: { list: 'recipe' }, input: { text: 'Входные данные команды' },
    text: {
      ru: { title: 'Рецепт в книгу', desc: 'Со страницы рецепта — ингредиенты, шаги и время подтянутся сами.', apps: 'Safari, YouTube, Instagram', runFrom: 'Меню «Поделиться»' },
      en: { title: 'Recipe to the book', desc: 'From a recipe page — ingredients, steps and time fill in by themselves.', apps: 'Safari, YouTube, Instagram', runFrom: 'Share menu' },
    },
  },
]

/** How the commands page groups presets. */
export const PRESET_KINDS: Preset['kind'][] = ['ask', 'share', 'read', 'auto']

/** The fields to type into “Get Contents of URL”: name, what to put there, and whether it's a value to copy or a variable to pick. */
export function presetFields(p: Preset, lang: Lang, key: string | null): { name: string; value: string; copy: boolean }[] {
  const ru = lang === 'ru'
  const EN: Record<string, string> = { 'Введённый текст': 'Provided Input', 'Входные данные команды': 'Shortcut Input', 'Сумма': 'Amount', 'Продавец': 'Merchant' }
  return [
    { name: 'key', value: key ?? (ru ? 'сначала создай ключ выше' : 'create a key above first'), copy: !!key },
    ...Object.entries(p.fields ?? {}).map(([name, value]) => ({ name, value, copy: true })),
    ...Object.entries(p.input ?? {}).map(([name, v]) => ({ name, value: ru ? `переменная «${v}»` : `variable “${EN[v] ?? v}”`, copy: false })),
  ]
}

/** iPhone: what to tap in the Shortcuts app, in plain words, one action per step. */
export function presetSteps(p: Preset, lang: Lang) {
  const ru = lang === 'ru'
  const tx = p.text[ru ? 'ru' : 'en']
  const open = ru
    ? 'Открой приложение «Команды» (иконка с двумя цветными квадратами) и нажми «+» вверху справа.'
    : 'Open the Shortcuts app (two coloured squares icon) and tap “+” at the top right.'
  const name = ru
    ? `Нажми на название вверху → «Переименовать» и напиши: «${tx.title}». Это же имя потом говоришь Siri.`
    : `Tap the name at the top → Rename, and type: “${tx.title}”. That is also what you say to Siri.`
  const url = ru
    ? 'Внизу в поиске действий напиши «URL» и выбери «Получить содержимое URL». Нажми на синее слово «URL» и вставь адрес (кнопка «Скопировать» ниже).'
    : 'In the action search at the bottom type “URL” and pick “Get Contents of URL”. Tap the blue word “URL” and paste the address (Copy button below).'
  const post = ru
    ? 'Нажми стрелку «›» у этого действия: «Метод» → POST, «Тело запроса» → JSON.'
    : 'Tap the “›” arrow on that action: Method → POST, Request Body → JSON.'
  const fields = ru
    ? 'Нажми «Добавить новое поле» → «Текст» для каждой строки из таблицы ниже: слева имя (key, list…), справа значение. Где написано «переменная» — нажми на поле значения и выбери её из подсказок над клавиатурой.'
    : 'Tap “Add new field” → Text for each row of the table below: name on the left (key, list…), value on the right. Where it says “variable”, tap the value field and pick it from the suggestions above the keyboard.'
  const done = ru ? 'Нажми «Готово» вверху справа.' : 'Tap Done at the top right.'
  const said = tx.title.replace(/\?$/, '').toLowerCase()
  switch (p.kind) {
    case 'ask': return [open, name,
      ru ? `В поиске действий напиши «Запросить» и выбери «Запросить ввод». В поле вопроса напиши: «${tx.prompt}».` : `In the action search type “Ask” and pick “Ask for Input”. Type the question: “${tx.prompt}”.`,
      url, post, fields, done,
      ru ? `Проверь: скажи «Привет, Siri, ${said}» — или добавь виджет «Команды» на экран «Домой».` : `Try it: say “Hey Siri, ${said}” — or add the Shortcuts widget to the Home Screen.`]
    case 'share': return [open, name,
      ru ? 'Нажми ⓘ внизу экрана → включи «Показывать в меню Поделиться» → «Готово».' : 'Tap ⓘ at the bottom → turn on “Show in Share Sheet” → Done.',
      url, post, fields, done,
      ru ? `Проверь: в ${tx.apps} нажми «Поделиться» и пролистай ряд вниз до «${tx.title}».` : `Try it: in ${tx.apps} tap Share and scroll down to “${tx.title}”.`]
    case 'read': return [open, name, url,
      ru ? 'Ещё одно действие: «Произнести текст» (Siri прочитает вслух) или «Быстрый просмотр» (покажет на экране).' : 'One more action: “Speak Text” (Siri reads it out) or “Quick Look” (shows it on screen).',
      done,
      ru ? `Проверь: «Привет, Siri, ${said}».` : `Try it: “Hey Siri, ${said}”.`]
    case 'auto': return [
      ru ? 'Открой «Команды» → вкладка «Автоматизация» внизу → «+» (или «Новая автоматизация»).' : 'Open Shortcuts → Automation tab at the bottom → “+” (or New Automation).',
      ru ? `Выбери, когда запускать: ${tx.trigger}.` : `Choose when it runs: ${tx.trigger}.`,
      ru ? 'Выбери «Запускать сразу» → «Далее» → «Новая пустая автоматизация».' : 'Pick “Run Immediately” → Next → New Blank Automation.',
      url, post, fields, done,
      ru ? 'Всё: дальше телефон делает это сам.' : 'That is it: the phone does it by itself from now on.']
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
  const steps = ru
    ? ['Установи бесплатное приложение MacroDroid из Google Play и открой его.',
      'Нажми большую плитку «Добавить макрос».',
      `В блоке «Триггеры» (красный) нажми «+» и выбери: ${a.trigger}.`,
      `В блоке «Действия» (синий) нажми «+» → «Подключение» → «HTTP-запрос». Метод — GET, в поле URL вставь адрес${a.endTrigger ? ' «Включение»' : ''} (кнопка «Скопировать» ниже).`]
    : ['Install the free MacroDroid app from Google Play and open it.',
      'Tap the big “Add Macro” tile.',
      `In the red Triggers block tap “+” and pick: ${a.trigger}.`,
      `In the blue Actions block tap “+” → Connectivity → HTTP Request. Method GET, paste the${a.endTrigger ? ' “Start”' : ''} address into URL (Copy button below).`]
  if (p.kind === 'read') steps.push(ru
    ? 'В этом же HTTP-запросе включи сохранение ответа в новую текстовую переменную. Затем ещё одно действие: «Уведомление» или «Произнести текст» с этой переменной.'
    : 'In the same HTTP Request turn on saving the response to a new string variable. Then add “Display Notification” or “Speak Text” with that variable.')
  steps.push(ru ? 'Вверху напиши имя макроса и сохрани (значок ✓ или дискеты).' : 'Type a macro name at the top and save it (✓ or the disk icon).')
  if (a.endTrigger) steps.push(ru
    ? `Чтобы статус снимался сам, сделай второй макрос так же: триггер ${a.endTrigger}, адрес «Выключение».`
    : `To clear the status by itself, make a second macro the same way: trigger ${a.endTrigger}, the “End” address.`)
  return steps
}
