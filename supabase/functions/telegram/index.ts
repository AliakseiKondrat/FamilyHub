// Family Hub × Telegram.
//  - { type: 'auth', initData }            from the mini app: sign in with Telegram → a one-time magic-link token
//  - { type: 'link', initData } + user JWT  from the mini app when already signed in: remember which Telegram user this is
//  - { type: 'setup' } + developer's JWT   point the bot's webhook here and add the «open app» menu button
//  - { type: 'linkCode' } + user JWT       a one-time code for t.me/<bot>?start=<code> (link Telegram to an existing account)
//  - { type: 'status' | 'unlink' } + JWT   is my Telegram linked / forget it
//  - { type: 'diag' } + developer's JWT    the bot's health: webhook, delivery errors, how many people are linked
//  - { type: 'perks' } + user JWT          community membership and boosts of my linked Telegram (rewards)
//  - commands: /buy /task /spent /list /today /wish /watch /idea /community /bonus /help
//  - Telegram updates (webhook, secret header): /start, links and text → «where to save?» → a record in that section
// The bot token is read from the TELEGRAM_BOT_TOKEN secret; without it every call answers «not configured».
import { createClient } from 'npm:@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const APP_URL = 'https://aliakseikondrat.github.io/FamilyHub/'
const FN_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram`
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' }
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function botToken(): Promise<string | null> {
  const env = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (env) return env
  const { data } = await sb.rpc('get_app_secret', { secret_name: 'telegram_bot_token' })
  return (data as string) || null
}

/** The bot's @username (for t.me links), looked up once per cold start. */
let botUser: string | undefined
async function botName(token: string) {
  if (botUser === undefined) botUser = (await tg(token, 'getMe', {}).catch(() => null))?.result?.username ?? ''
  return botUser || null
}

const enc = new TextEncoder()
async function hmac(key: ArrayBuffer | Uint8Array, msg: string) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)))
}
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('')

/** Telegram's initData check: HMAC-SHA256 with key HMAC("WebAppData", bot token); fresh within a day. */
async function verifyInitData(initData: string, token: string) {
  const p = new URLSearchParams(initData)
  const hash = p.get('hash')
  if (!hash) return null
  p.delete('hash')
  const check = [...p.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n')
  const secret = await hmac(enc.encode('WebAppData'), token)
  if (hex(await hmac(secret, check)) !== hash) return null
  if (Date.now() / 1000 - Number(p.get('auth_date') ?? 0) > 86400) return null
  try { return JSON.parse(p.get('user') ?? 'null') as { id: number; first_name?: string; language_code?: string } | null } catch { return null }
}

/** A stable secret for the webhook header, derived from the bot token. */
const webhookSecret = async (token: string) => hex(await hmac(enc.encode('FamilyHubWebhook'), token)).slice(0, 48)

async function tg(token: string, method: string, body: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return r.json()
}

/* ---------- texts for the bot (the person's Telegram language) ---------- */
const TX: Record<string, Record<string, string>> = {
  ru: { start: 'Привет! Это Family Hub — общее приложение для пары 💞\nОткрой его кнопкой ниже. А ещё сюда можно присылать ссылки и заметки — я спрошу, куда их сохранить.', open: 'Открыть Family Hub', where: 'Куда сохранить?', saved: 'Сохранено: {s} ✓', notLinked: 'Сначала открой приложение кнопкой ниже и войди — тогда я буду знать, в чью пару сохранять.', linked: 'Готово! Telegram привязан к Family Hub ✓\nВ приложении (Настройки → Уведомления) можно выбрать, чтобы уведомления приходили сюда.', badCode: 'Ссылка устарела. Нажми «Привязать Telegram» в приложении ещё раз.', inbox: '📥 Входящие', tasks: '✅ Задачи', groceries: '🛒 Продукты', watch: '🍿 Смотреть', recipes: '🍳 Рецепты', wishes: '🎁 Вишлист', places: '💕 Места' },
  en: { start: "Hi! This is Family Hub — a shared app for couples 💞\nOpen it with the button below. You can also send me links and notes — I'll ask where to save them.", open: 'Open Family Hub', where: 'Where shall I save it?', saved: 'Saved: {s} ✓', notLinked: "First open the app with the button below and sign in — then I'll know whose couple to save to.", linked: 'Done! Telegram is linked to Family Hub ✓\nIn the app (Settings → Notifications) you can choose to get notifications here.', badCode: 'This link has expired. Tap «Link Telegram» in the app again.', inbox: '📥 Inbox', tasks: '✅ Tasks', groceries: '🛒 Groceries', watch: '🍿 Watch', recipes: '🍳 Recipes', wishes: '🎁 Wishlist', places: '💕 Places' },
  pl: { start: 'Cześć! To Family Hub — wspólna aplikacja dla par 💞\nOtwórz ją przyciskiem poniżej. Możesz też wysyłać mi linki i notatki — zapytam, gdzie je zapisać.', open: 'Otwórz Family Hub', where: 'Gdzie zapisać?', saved: 'Zapisano: {s} ✓', notLinked: 'Najpierw otwórz aplikację przyciskiem poniżej i zaloguj się — wtedy będę wiedzieć, do czyjej pary zapisywać.', linked: 'Gotowe! Telegram połączony z Family Hub ✓\nW aplikacji (Ustawienia → Powiadomienia) możesz wybrać, by powiadomienia przychodziły tutaj.', badCode: 'Link wygasł. Naciśnij „Połącz Telegram” w aplikacji jeszcze raz.', inbox: '📥 Skrzynka', tasks: '✅ Zadania', groceries: '🛒 Zakupy', watch: '🍿 Do obejrzenia', recipes: '🍳 Przepisy', wishes: '🎁 Lista życzeń', places: '💕 Miejsca' },
  es: { start: '¡Hola! Esto es Family Hub, una app compartida para parejas 💞\nÁbrela con el botón de abajo. También puedes enviarme enlaces y notas: te preguntaré dónde guardarlos.', open: 'Abrir Family Hub', where: '¿Dónde lo guardo?', saved: 'Guardado: {s} ✓', notLinked: 'Primero abre la app con el botón de abajo e inicia sesión; así sabré en qué pareja guardarlo.', linked: '¡Listo! Telegram está vinculado a Family Hub ✓\nEn la app (Ajustes → Notificaciones) puedes elegir recibir las notificaciones aquí.', badCode: 'El enlace ha caducado. Pulsa «Vincular Telegram» en la app otra vez.', inbox: '📥 Bandeja', tasks: '✅ Tareas', groceries: '🛒 Compra', watch: '🍿 Para ver', recipes: '🍳 Recetas', wishes: '🎁 Deseos', places: '💕 Sitios' },
  it: { start: "Ciao! Questo è Family Hub, l'app condivisa per le coppie 💞\nAprila con il pulsante qui sotto. Puoi anche mandarmi link e note: ti chiederò dove salvarli.", open: 'Apri Family Hub', where: 'Dove lo salvo?', saved: 'Salvato: {s} ✓', notLinked: "Prima apri l'app con il pulsante qui sotto e accedi: così saprò in quale coppia salvare.", linked: 'Fatto! Telegram è collegato a Family Hub ✓\nNell\'app (Impostazioni → Notifiche) puoi scegliere di ricevere qui le notifiche.', badCode: 'Il link è scaduto. Tocca «Collega Telegram» nell\'app di nuovo.', inbox: '📥 In arrivo', tasks: '✅ Attività', groceries: '🛒 Spesa', watch: '🍿 Da vedere', recipes: '🍳 Ricette', wishes: '🎁 Desideri', places: '💕 Posti' },
}
const tx = (lang?: string) => TX[(lang ?? 'ru').slice(0, 2)] ?? TX.en
const TARGETS = ['inbox', 'tasks', 'groceries', 'watch', 'recipes', 'wishes', 'places'] as const
const GUESS: Record<string, string> = {
  ru: 'Похоже, это в «{s}». Сохранить туда или выбрать другое?', en: 'Looks like «{s}». Save it there or pick another?',
  pl: 'Wygląda na „{s}”. Zapisać tam czy wybrać inne?', es: 'Parece de «{s}». ¿Lo guardo ahí o eliges otro?', it: 'Sembra da «{s}». Lo salvo lì o scegli un altro?',
}
/** Guess the section from the link (and a word of the text), so the likely one is the first button. */
function guessTarget(text: string): (typeof TARGETS)[number] | null {
  const url = (text.match(/https?:\/\/\S+/)?.[0] ?? '').toLowerCase()
  const all = `${url} ${text.toLowerCase()}`
  if (/maps\.app\.goo\.gl|goo\.gl\/maps|google\.[a-z.]+\/maps|yandex\.[a-z]+\/maps|maps\.apple|2gis\.|tripadvisor|restaurantguru/.test(url)) return 'places'
  if (/youtube\.com|youtu\.be|imdb\.com|netflix\.com|letterboxd|filmweb|player\.pl|cda\.pl|polsatboxgo|canalplus|skyshowtime|tv\.apple|primevideo|disneyplus|max\.com|hbomax|atresplayer|rtve\.es|movistarplus|kinopoisk/.test(url)) return 'watch'
  if (/kwestiasmaku|aniagotuje|przepisy\.pl|mojewypieki|kuchnialidla|doradcasmaku|ugotuj\.to|smaker\.pl|kuchnia\.wp|allrecipes|bbcgoodfood|giallozafferano|recetasgratis|directoalpaladar|eda\.ru|povar\.ru|russianfood|recetas|recipe|рецепт|przepis|ricetta|receta/.test(all)) return 'recipes'
  // Shops: Polish first (that's where we live), Spanish for the move, and the big international ones.
  if (/allegro\.|olx\.pl|ceneo\.|empik\.|mediaexpert|x-kom|euro\.com\.pl|morele\.|mediamarkt|komputronik|vinted\.|temu\.|shein\.|zalando|answear|modivo|eobuwie|reserved\.|sinsay|mohito|ccc\.eu|pepco|notino|rossmann|douglas\.|hebe\.pl|smyk|decathlon|leroymerlin|castorama|ikea\.|amazon\.|aliexpress|zara\.com|hm\.com|etsy\.|ebay\.|sephora|wallapop|elcorteingles|pccomponentes|fnac\./.test(url)) return 'wishes'
  return null
}

/* ---------- commands: /buy, /task, /spent, /list, /today, /wish, /watch, /idea, /community, /bonus, /help ---------- */
const COMMUNITY = 'https://t.me/+jlK7z5g9zPVhMTU0'
const LANGS = ['ru', 'en', 'pl', 'es', 'it'] as const
type L = (typeof LANGS)[number]
const CMD: Record<L, Record<string, string>> = {
  ru: { start: 'Открыть Family Hub', buy: 'В покупки: /buy молоко, хлеб', task: 'Задача: /task позвонить маме завтра 18:00', spent: 'Трата: /spent 45 Biedronka', list: 'Что купить', today: 'Что у нас сегодня', wish: 'В вишлист: /wish ссылка', watch: 'В «Смотреть»: /watch название', idea: 'Во входящие: /idea мысль', community: 'Наше сообщество', bonus: 'Награды за сообщество и бусты', help: 'Что я умею' },
  en: { start: 'Open Family Hub', buy: 'To groceries: /buy milk, bread', task: 'Task: /task call mum tomorrow 18:00', spent: 'Expense: /spent 45 Biedronka', list: 'What to buy', today: 'What we have today', wish: 'To wishlist: /wish link', watch: 'To watchlist: /watch title', idea: 'To inbox: /idea a thought', community: 'Our community', bonus: 'Rewards for community and boosts', help: 'What I can do' },
  pl: { start: 'Otwórz Family Hub', buy: 'Do zakupów: /buy mleko, chleb', task: 'Zadanie: /task zadzwonić do mamy jutro 18:00', spent: 'Wydatek: /spent 45 Biedronka', list: 'Co kupić', today: 'Co mamy dziś', wish: 'Na listę życzeń: /wish link', watch: 'Do obejrzenia: /watch tytuł', idea: 'Do skrzynki: /idea myśl', community: 'Nasza społeczność', bonus: 'Nagrody za społeczność i boosty', help: 'Co potrafię' },
  es: { start: 'Abrir Family Hub', buy: 'A la compra: /buy leche, pan', task: 'Tarea: /task llamar a mamá mañana 18:00', spent: 'Gasto: /spent 45 Mercadona', list: 'Qué comprar', today: 'Qué tenemos hoy', wish: 'A deseos: /wish enlace', watch: 'Para ver: /watch título', idea: 'A la bandeja: /idea una idea', community: 'Nuestra comunidad', bonus: 'Premios por la comunidad y los boosts', help: 'Qué sé hacer' },
  it: { start: 'Apri Family Hub', buy: 'Alla spesa: /buy latte, pane', task: 'Attività: /task chiamare la mamma domani 18:00', spent: 'Spesa: /spent 45 Conad', list: 'Cosa comprare', today: 'Cosa abbiamo oggi', wish: 'Ai desideri: /wish link', watch: 'Da vedere: /watch titolo', idea: 'In arrivo: /idea un pensiero', community: 'La nostra community', bonus: 'Premi per community e boost', help: 'Cosa so fare' },
}
const HELP: Record<L, string> = {
  ru: 'Что я умею 👇\n\n🛒 /buy молоко, хлеб — в покупки (можно списком)\n✅ /task позвонить маме завтра 18:00 — задача с датой\n💸 /spent 45 Biedronka — записать трату\n🗒️ /list — что купить\n📅 /today — дела и события на сегодня\n🎁 /wish ссылка — в вишлист\n🍿 /watch название или ссылка — в «Смотреть»\n💡 /idea мысль — во входящие\n💬 /community — наше сообщество\n🏅 /bonus — награды за сообщество и бусты\n\nА ещё можно просто прислать ссылку или текст — я спрошу, куда сохранить.',
  en: 'What I can do 👇\n\n🛒 /buy milk, bread — to groceries (a list is fine)\n✅ /task call mum tomorrow 18:00 — a task with a date\n💸 /spent 45 Biedronka — log an expense\n🗒️ /list — what to buy\n📅 /today — today’s tasks and events\n🎁 /wish link — to the wishlist\n🍿 /watch title or link — to the watchlist\n💡 /idea a thought — to the inbox\n💬 /community — our community\n🏅 /bonus — rewards for the community and boosts\n\nOr just send me a link or text — I’ll ask where to save it.',
  pl: 'Co potrafię 👇\n\n🛒 /buy mleko, chleb — do zakupów (może być lista)\n✅ /task zadzwonić do mamy jutro 18:00 — zadanie z datą\n💸 /spent 45 Biedronka — zapisz wydatek\n🗒️ /list — co kupić\n📅 /today — zadania i wydarzenia na dziś\n🎁 /wish link — na listę życzeń\n🍿 /watch tytuł lub link — do obejrzenia\n💡 /idea myśl — do skrzynki\n💬 /community — nasza społeczność\n🏅 /bonus — nagrody za społeczność i boosty\n\nMożesz też po prostu wysłać link lub tekst — zapytam, gdzie zapisać.',
  es: 'Qué sé hacer 👇\n\n🛒 /buy leche, pan — a la compra (vale una lista)\n✅ /task llamar a mamá mañana 18:00 — tarea con fecha\n💸 /spent 45 Mercadona — anotar un gasto\n🗒️ /list — qué comprar\n📅 /today — tareas y eventos de hoy\n🎁 /wish enlace — a la lista de deseos\n🍿 /watch título o enlace — a «Por ver»\n💡 /idea una idea — a la bandeja\n💬 /community — nuestra comunidad\n🏅 /bonus — premios por la comunidad y los boosts\n\nO mándame un enlace o un texto: te preguntaré dónde guardarlo.',
  it: 'Cosa so fare 👇\n\n🛒 /buy latte, pane — alla spesa (anche una lista)\n✅ /task chiamare la mamma domani 18:00 — attività con data\n💸 /spent 45 Conad — segna una spesa\n🗒️ /list — cosa comprare\n📅 /today — attività ed eventi di oggi\n🎁 /wish link — alla lista dei desideri\n🍿 /watch titolo o link — a «Da vedere»\n💡 /idea un pensiero — in arrivo\n💬 /community — la nostra community\n🏅 /bonus — premi per community e boost\n\nOppure mandami un link o un testo: ti chiederò dove salvarlo.',
}
const SHORT: Record<L, string> = {
  ru: 'Family Hub — общее приложение для пары: покупки, задачи, бюджет, планы. Пиши сюда — я всё сохраню.',
  en: 'Family Hub — a shared app for couples: groceries, tasks, budget, plans. Write here and I’ll save it.',
  pl: 'Family Hub — wspólna aplikacja dla par: zakupy, zadania, budżet, plany. Napisz tu, a zapiszę.',
  es: 'Family Hub: la app compartida para parejas. Compra, tareas, presupuesto, planes. Escríbeme y lo guardo.',
  it: 'Family Hub: l’app condivisa per le coppie. Spesa, attività, budget, programmi. Scrivimi e salvo tutto.',
}
const ABOUT: Record<L, string> = {
  ru: 'Привет! Я помощник Family Hub 💞\n\n• Открываю приложение кнопкой «Family Hub» внизу\n• Сохраняю ссылки и заметки: пришли — спрошу, куда положить\n• /buy, /task, /spent — быстро добавить покупки, дела и траты\n• /today и /list — что сегодня и что купить\n• Присылаю уведомления, если выбрать Telegram в настройках приложения\n\nНажми «Старт» 👇',
  en: 'Hi! I’m the Family Hub helper 💞\n\n• I open the app with the «Family Hub» button below\n• I save links and notes: send one and I’ll ask where it goes\n• /buy, /task, /spent — quickly add groceries, tasks and expenses\n• /today and /list — what’s on today and what to buy\n• I send notifications if you choose Telegram in the app’s settings\n\nTap «Start» 👇',
  pl: 'Cześć! Jestem pomocnikiem Family Hub 💞\n\n• Otwieram aplikację przyciskiem «Family Hub» na dole\n• Zapisuję linki i notatki: wyślij, a zapytam, gdzie je dać\n• /buy, /task, /spent — szybko dodaj zakupy, zadania i wydatki\n• /today i /list — co dziś i co kupić\n• Wysyłam powiadomienia, jeśli wybierzesz Telegram w ustawieniach aplikacji\n\nNaciśnij «Start» 👇',
  es: '¡Hola! Soy el ayudante de Family Hub 💞\n\n• Abro la app con el botón «Family Hub» de abajo\n• Guardo enlaces y notas: mándamelos y te pregunto dónde\n• /buy, /task, /spent — añade rápido compra, tareas y gastos\n• /today y /list — qué hay hoy y qué comprar\n• Te mando notificaciones si eliges Telegram en los ajustes de la app\n\nPulsa «Iniciar» 👇',
  it: 'Ciao! Sono l’assistente di Family Hub 💞\n\n• Apro l’app con il pulsante «Family Hub» qui sotto\n• Salvo link e note: mandameli e ti chiedo dove metterli\n• /buy, /task, /spent — aggiungi al volo spesa, attività e spese\n• /today e /list — cosa c’è oggi e cosa comprare\n• Mando notifiche se scegli Telegram nelle impostazioni dell’app\n\nTocca «Avvia» 👇',
}
const RX: Record<L, Record<string, string>> = {
  ru: { needText: 'Напиши после команды, что добавить. Например: {ex}', buy: '🛒 В покупках: {s}', task: '✅ Задача: {s}', spent: '💸 Записал: {s}', noAmount: 'Не нашёл сумму. Например: /spent 45 Biedronka', wish: '🎁 В вишлисте: {s}', watch: '🍿 В «Смотреть»: {s}', idea: '💡 Во входящих: {s}', listEmpty: 'Список покупок пуст 🎉', listHead: '🛒 Купить ({n}):', todayEmpty: 'На сегодня ничего не запланировано ☀️', todayTasks: '✅ Дела:', todayEvents: '📅 События:', community: 'Наше сообщество Family Hub: новости, идеи для пар и ваши вопросы 💬\nЗа вступление — «Огонёк клуба» в приложении, а за бусты — ещё награды (/bonus).', join: 'Вступить', bonusNoCommunity: 'Сообщество ещё настраивается — загляни чуть позже 🙂', bonus: 'Твои награды:\n{lines}\n\nЧтобы забрать их, открой приложение → Настройки → Уведомления и связь → Уведомления → «Забрать награды».', perkMember: '{m} Вступил(а) в сообщество — «Огонёк клуба»', perkBoost1: '{m} 1 буст — «Рамка бустера»', perkBoost2: '{m} 2 буста — «Ракета бустера»', boostHow: 'Бусты доступны с Telegram Premium: открой канал → название вверху → «Бусты».' },
  en: { needText: 'Write what to add after the command. For example: {ex}', buy: '🛒 In groceries: {s}', task: '✅ Task: {s}', spent: '💸 Saved: {s}', noAmount: 'No amount found. For example: /spent 45 Biedronka', wish: '🎁 In the wishlist: {s}', watch: '🍿 In the watchlist: {s}', idea: '💡 In the inbox: {s}', listEmpty: 'The shopping list is empty 🎉', listHead: '🛒 To buy ({n}):', todayEmpty: 'Nothing planned for today ☀️', todayTasks: '✅ Tasks:', todayEvents: '📅 Events:', community: 'Our Family Hub community: news, ideas for couples and your questions 💬\nJoining gives the «Club flame» in the app, and boosts give more rewards (/bonus).', join: 'Join', bonusNoCommunity: 'The community is still being set up — check back a bit later 🙂', bonus: 'Your rewards:\n{lines}\n\nTo collect them, open the app → Settings → Notifications & links → Notifications → «Collect rewards».', perkMember: '{m} Joined the community — «Club flame»', perkBoost1: '{m} 1 boost — «Booster frame»', perkBoost2: '{m} 2 boosts — «Booster rocket»', boostHow: 'Boosts come with Telegram Premium: open the channel → its name at the top → «Boosts».' },
  pl: { needText: 'Po komendzie napisz, co dodać. Na przykład: {ex}', buy: '🛒 W zakupach: {s}', task: '✅ Zadanie: {s}', spent: '💸 Zapisano: {s}', noAmount: 'Nie znalazłem kwoty. Na przykład: /spent 45 Biedronka', wish: '🎁 Na liście życzeń: {s}', watch: '🍿 Do obejrzenia: {s}', idea: '💡 W skrzynce: {s}', listEmpty: 'Lista zakupów jest pusta 🎉', listHead: '🛒 Do kupienia ({n}):', todayEmpty: 'Na dziś nic nie zaplanowano ☀️', todayTasks: '✅ Zadania:', todayEvents: '📅 Wydarzenia:', community: 'Nasza społeczność Family Hub: nowości, pomysły dla par i wasze pytania 💬\nZa dołączenie — «Płomyk klubu» w aplikacji, a za boosty — kolejne nagrody (/bonus).', join: 'Dołącz', bonusNoCommunity: 'Społeczność jest jeszcze ustawiana — zajrzyj trochę później 🙂', bonus: 'Twoje nagrody:\n{lines}\n\nAby je odebrać, otwórz aplikację → Ustawienia → Powiadomienia i połączenia → Powiadomienia → «Odbierz nagrody».', perkMember: '{m} Dołączenie do społeczności — «Płomyk klubu»', perkBoost1: '{m} 1 boost — «Ramka boostera»', perkBoost2: '{m} 2 boosty — «Rakieta boostera»', boostHow: 'Boosty są w Telegram Premium: otwórz kanał → nazwa na górze → «Boosty».' },
  es: { needText: 'Escribe después del comando qué añadir. Por ejemplo: {ex}', buy: '🛒 En la compra: {s}', task: '✅ Tarea: {s}', spent: '💸 Anotado: {s}', noAmount: 'No encontré el importe. Por ejemplo: /spent 45 Mercadona', wish: '🎁 En deseos: {s}', watch: '🍿 En «Por ver»: {s}', idea: '💡 En la bandeja: {s}', listEmpty: 'La lista de la compra está vacía 🎉', listHead: '🛒 Por comprar ({n}):', todayEmpty: 'Hoy no hay nada planeado ☀️', todayTasks: '✅ Tareas:', todayEvents: '📅 Eventos:', community: 'Nuestra comunidad de Family Hub: novedades, ideas para parejas y vuestras preguntas 💬\nUnirte da la «Llama del club» en la app, y los boosts dan más premios (/bonus).', join: 'Unirme', bonusNoCommunity: 'La comunidad aún se está preparando; vuelve un poco más tarde 🙂', bonus: 'Tus premios:\n{lines}\n\nPara recogerlos, abre la app → Ajustes → Notificaciones y conexiones → Notificaciones → «Recoger premios».', perkMember: '{m} Unirte a la comunidad — «Llama del club»', perkBoost1: '{m} 1 boost — «Marco de booster»', perkBoost2: '{m} 2 boosts — «Cohete de booster»', boostHow: 'Los boosts vienen con Telegram Premium: abre el canal → su nombre arriba → «Boosts».' },
  it: { needText: 'Scrivi dopo il comando cosa aggiungere. Per esempio: {ex}', buy: '🛒 Nella spesa: {s}', task: '✅ Attività: {s}', spent: '💸 Segnato: {s}', noAmount: 'Non ho trovato l’importo. Per esempio: /spent 45 Conad', wish: '🎁 Nei desideri: {s}', watch: '🍿 In «Da vedere»: {s}', idea: '💡 In arrivo: {s}', listEmpty: 'La lista della spesa è vuota 🎉', listHead: '🛒 Da comprare ({n}):', todayEmpty: 'Niente in programma per oggi ☀️', todayTasks: '✅ Attività:', todayEvents: '📅 Eventi:', community: 'La nostra community di Family Hub: novità, idee per coppie e le vostre domande 💬\nUnirti dà la «Fiamma del club» nell’app, e i boost danno altri premi (/bonus).', join: 'Unisciti', bonusNoCommunity: 'La community è ancora in preparazione: ripassa tra poco 🙂', bonus: 'I tuoi premi:\n{lines}\n\nPer ritirarli, apri l’app → Impostazioni → Notifiche e collegamenti → Notifiche → «Ritira i premi».', perkMember: '{m} Iscrizione alla community — «Fiamma del club»', perkBoost1: '{m} 1 boost — «Cornice del booster»', perkBoost2: '{m} 2 boost — «Razzo del booster»', boostHow: 'I boost sono inclusi in Telegram Premium: apri il canale → il nome in alto → «Boost».' },
}
const langOf = (code?: string): L => ((LANGS as readonly string[]).includes((code ?? '').slice(0, 2)) ? (code ?? '').slice(0, 2) as L : 'en')

/* Grocery aisles, quick dates and amounts — the same rules as the personal API (supabase/functions/api). */
const STEMS: Record<string, string[]> = {
  produce: ['яблок', 'банан', 'авокад', 'помидор', 'томат', 'огур', 'картош', 'картоф', 'лук', 'морков', 'капуст', 'салат', 'перец', 'лимон', 'апельсин', 'груш', 'виноград', 'ягод', 'клубник', 'зелен', 'укроп', 'чеснок', 'гриб', 'брокол', 'apple', 'banana', 'avocado', 'tomato', 'cucumber', 'potato', 'onion', 'carrot', 'lettuce', 'pepper', 'lemon', 'orange', 'grape', 'berr', 'garlic', 'mushroom', 'jabł', 'pomidor', 'ogór', 'ziemniak', 'cebul', 'marchew', 'sałat', 'papryk', 'cytryn', 'czosn', 'grzyb', 'manzan', 'plátano', 'tomate', 'patata', 'cebolla', 'zanahoria', 'limón', 'naranja', 'fresa', 'mela', 'pomodor', 'patat', 'cipoll', 'carot', 'limon', 'arancia'],
  dairy: ['молок', 'кефир', 'сыр', 'творог', 'сметан', 'йогурт', 'сливк', 'яйц', 'milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'mleko', 'ser', 'jogurt', 'masło', 'śmietan', 'jaj', 'twaróg', 'leche', 'queso', 'yogur', 'mantequilla', 'huevo', 'latte', 'formaggio', 'burro', 'uova'],
  meat: ['мяс', 'куриц', 'курин', 'говяд', 'свинин', 'фарш', 'колбас', 'сосиск', 'ветчин', 'рыб', 'лосос', 'креветк', 'бекон', 'chicken', 'beef', 'pork', 'sausage', 'ham', 'fish', 'salmon', 'shrimp', 'bacon', 'mięso', 'kurczak', 'wołow', 'wieprz', 'kiełbas', 'szynk', 'ryb', 'łosoś', 'carne', 'pollo', 'cerdo', 'jamón', 'pescado', 'salmone', 'prosciutto', 'pesce'],
  bakery: ['хлеб', 'батон', 'булк', 'багет', 'лаваш', 'круассан', 'bread', 'baguette', 'bun', 'croissant', 'chleb', 'bułk', 'bagiet', 'barra', 'pane'],
  frozen: ['морожен', 'пельмен', 'заморож', 'ice cream', 'frozen', 'lody', 'mrożon', 'pierogi', 'helado', 'congelad', 'gelato', 'surgelat'],
  drinks: ['вод', 'сок', 'пиво', 'вино', 'кола', 'чай', 'кофе', 'water', 'juice', 'beer', 'wine', 'cola', 'tea', 'coffee', 'woda', 'sok', 'piwo', 'wino', 'herbat', 'kaw', 'agua', 'zumo', 'cerveza', 'vino', 'café', 'acqua', 'succo', 'birra'],
  pantry: ['рис', 'макарон', 'паст', 'гречк', 'мук', 'сахар', 'сол', 'консерв', 'соус', 'кетчуп', 'майонез', 'специ', 'овсян', 'хлопь', 'шоколад', 'печень', 'rice', 'pasta', 'flour', 'sugar', 'salt', 'oil', 'sauce', 'ketchup', 'oat', 'cereal', 'chocolate', 'cookie', 'ryż', 'makaron', 'mąk', 'cukier', 'sól', 'olej', 'oliw', 'sos', 'płatki', 'czekolad', 'ciastk', 'arroz', 'harina', 'azúcar', 'aceite', 'riso', 'farina', 'zucchero', 'olio'],
  household: ['бумаг', 'полотенц', 'мыл', 'шампун', 'порош', 'губк', 'пакет', 'салфет', 'зубн', 'paper', 'towel', 'soap', 'shampoo', 'detergent', 'sponge', 'tissue', 'toothpaste', 'papier', 'ręcznik', 'mydło', 'szampon', 'proszek', 'gąbk', 'chusteczk', 'papel', 'jabón', 'champú', 'sapone'],
  pet: ['корм', 'лакомств', 'для честера', 'dog food', 'pet food', 'treats', 'karma', 'przysmak', 'pienso', 'crocchette'],
}
function guessCategory(title: string) {
  const s = ' ' + title.toLowerCase() + ' '
  for (const cat of ['pet', 'household', 'produce', 'dairy', 'meat', 'bakery', 'frozen', 'drinks', 'pantry']) if (STEMS[cat].some((x) => s.includes(x))) return cat
  return 'other'
}
function localToday(tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}`
}
const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
function parseQuick(input: string, today: string) {
  let s = ' ' + input + ' '
  let due: string | undefined, time: string | undefined
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => void) => { const m = s.match(re); if (m) { fn(m); s = s.replace(re, ' ') } }
  take(/\s(послезавтра|pojutrze|pasado mañana|dopodomani|day after tomorrow)\s/i, () => { due = addDays(today, 2) })
  take(/\s(завтра|tomorrow|jutro|mañana|domani)\s/i, () => { due = addDays(today, 1) })
  take(/\s(сегодня|today|dziś|dzisiaj|hoy|oggi)\s/i, () => { due = today })
  take(/\s(?:в|at|o|a las|alle)?\s?([01]?\d|2[0-3])[:.]([0-5]\d)\s/i, (m) => { time = `${m[1].padStart(2, '0')}:${m[2]}` })
  if (time && !due) due = today
  return { title: s.replace(/\s+/g, ' ').trim(), due, time }
}
function parseAmount(s: string) {
  const m = String(s).replace(/\s| /g, '').match(/\d+(?:[.,]\d{3})*(?:[.,]\d{1,2})?/)
  if (!m) return NaN
  const dec = m[0].match(/^(.*)[.,](\d{1,2})$/)
  return parseFloat(dec ? `${dec[1].replace(/[.,]/g, '')}.${dec[2]}` : m[0].replace(/[.,]/g, ''))
}
const MERCHANT_CATS: [RegExp, string][] = [
  [/biedronka|lidl|żabka|zabka|carrefour|auchan|kaufland|mercadona|\bdia\b|aldi|netto|lewiatan|stokrotka|conad|coop|esselunga|spar|supermerc|market|продукт/i, 'groceries'],
  [/uber eats|glovo|wolt|pyszne|restaur|caf[eé]|coffee|кофе|кафе|starbucks|mcdonald|kfc|burger|pizza|sushi|\bbar\b|bistro/i, 'eating'],
  [/uber|bolt|free ?now|orlen|\bbp\b|shell|parking|pkp|metro|бензин|такси|ryanair|wizz/i, 'transport'],
  [/netflix|spotify|apple\.com|icloud|youtube|disney|hbo|prime video|playstation|chatgpt/i, 'subscriptions'],
  [/apteka|farmacia|pharm|rossmann|hebe|аптек/i, 'health'],
  [/maxi ?zoo|kakadu|zooplus|zoo\b|vet|корм/i, 'pet'],
  [/ikea|leroy|castorama|media ?markt|rtv|euro ?agd/i, 'home'],
  [/cinema|kino|кино|multikino|helios|teatr|museum|concert/i, 'fun'],
]
const visibleTo = (r: any, role: string, today: string) =>
  (!r.private_to || r.private_to === role) && (r.surprise_for !== role || (!!r.reveal_at && r.reveal_at <= today))

/** The household's country (currency, time zone) from its shared settings. */
async function placeOf(hh: string) {
  const { data } = await sb.from('records').select('data').eq('household', hh).eq('id', 'meta:settings').maybeSingle()
  const country = data?.data?.country === 'ES' ? 'ES' : 'PL'
  return { currency: country === 'ES' ? 'EUR' : 'PLN', tz: country === 'ES' ? 'Europe/Madrid' : 'Europe/Warsaw' }
}

/** A command with its words: /buy milk → saved, and a short confirmation (or a hint when the words are missing). */
async function runCommand(cmd: string, arg: string, member: { role: 'a' | 'j'; household: string }, l: L): Promise<string> {
  const r = RX[l], hh = member.household, role = member.role
  const base = () => ({ id: crypto.randomUUID(), createdBy: role, createdAt: new Date().toISOString() })
  const insert = (collection: string, data: Record<string, unknown>) => sb.from('records').insert({ household: hh, id: data.id, collection, created_by: role, data })
  const { currency, tz } = await placeOf(hh)
  const today = localToday(tz)
  if (['buy', 'task', 'spent', 'wish', 'watch', 'idea'].includes(cmd) && !arg) return r.needText.replace('{ex}', CMD[l][cmd].split(': ')[1] ?? `/${cmd}`)
  const url = arg.match(/https?:\/\/\S+/)?.[0]
  const title = (url ? arg.replace(url, '').trim() : arg).slice(0, 200) || url || ''
  switch (cmd) {
    case 'buy': {
      const items = arg.split(/,|;|\n|\s+и\s+|\s+and\s+|\s+i\s+|\s+y\s+|\s+e\s+/i).map((x) => x.trim()).filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1))
      const { data: existing } = await sb.from('records').select('id,data').eq('household', hh).eq('collection', 'groceries').eq('deleted', false)
      for (const t of items) {
        const ex = (existing ?? []).find((x) => String(x.data.title).toLowerCase() === t.toLowerCase())
        if (ex) await sb.from('records').update({ data: { ...ex.data, done: false } }).eq('household', hh).eq('id', ex.id)
        else await insert('groceries', { ...base(), title: t, category: guessCategory(t), done: false })
      }
      return r.buy.replace('{s}', items.join(', '))
    }
    case 'task': {
      const p = parseQuick(arg, today)
      await insert('tasks', { ...base(), title: p.title || arg, due: p.due, time: p.time, assignee: 'both', done: false, repeat: 'none' })
      return r.task.replace('{s}', (p.title || arg) + (p.due ? ` · ${p.due.slice(8)}.${p.due.slice(5, 7)}${p.time ? ' ' + p.time : ''}` : ''))
    }
    case 'spent': {
      const amount = parseAmount(arg)
      if (!(amount > 0)) return r.noAmount
      const merchant = arg.replace(/[\d\s.,]+(zł|pln|eur|€|\$)?/gi, ' ').trim() || '—'
      const category = MERCHANT_CATS.find(([re]) => re.test(merchant))?.[1] ?? 'other'
      await insert('expenses', { ...base(), title: merchant, amount, currency, category, paidBy: role, shared: true, date: today, source: 'telegram' })
      return r.spent.replace('{s}', `${merchant} · ${amount} ${currency}`)
    }
    case 'wish': await insert('wishes', { ...base(), title, url, owner: role, kind: 'gift', priority: 1 }); return r.wish.replace('{s}', title)
    case 'watch': await insert('watch', { ...base(), title, kind: 'movie', status: 'want', links: url ? [{ service: 'custom', url }] : [] }); return r.watch.replace('{s}', title)
    case 'idea': await insert('notes', { ...base(), module: 'inbox', title, url }); return r.idea.replace('{s}', title)
    case 'list': case 'today': {
      const { data } = await sb.from('records').select('collection,data,private_to,surprise_for,reveal_at').eq('household', hh).eq('deleted', false).in('collection', cmd === 'list' ? ['groceries'] : ['tasks', 'events'])
      const rows = (data ?? []).filter((x) => visibleTo(x, role, today))
      if (cmd === 'list') {
        const items = rows.filter((x) => !x.data.done).map((x) => `• ${x.data.title}`)
        return items.length ? `${r.listHead.replace('{n}', String(items.length))}\n${items.join('\n')}` : r.listEmpty
      }
      const mine = (who?: string) => !who || who === 'both' || who === role
      const tasks = rows.filter((x) => x.collection === 'tasks' && !x.data.done && x.data.due && x.data.due <= today && mine(x.data.assignee))
        .sort((a, b) => (a.data.time ?? '99').localeCompare(b.data.time ?? '99')).map((x) => `• ${x.data.time ? x.data.time + ' ' : ''}${x.data.title}`)
      const events = rows.filter((x) => x.collection === 'events' && x.data.date === today && mine(x.data.who))
        .sort((a, b) => (a.data.time ?? '').localeCompare(b.data.time ?? '')).map((x) => `• ${x.data.time ? x.data.time + ' ' : ''}${x.data.title}`)
      if (!tasks.length && !events.length) return r.todayEmpty
      return [events.length ? `${r.todayEvents}\n${events.join('\n')}` : '', tasks.length ? `${r.todayTasks}\n${tasks.join('\n')}` : ''].filter(Boolean).join('\n\n')
    }
  }
  return HELP[l]
}

/** Community perks: is this Telegram user in our community, and how many boosts did they give it. */
async function perksOf(token: string, tgId: number) {
  const { data } = await sb.from('app_config').select('value').eq('key', 'tg_community').maybeSingle()
  const chat = (data?.value as { id?: number } | null)?.id
  if (!chat) return null
  const [m, b] = await Promise.all([tg(token, 'getChatMember', { chat_id: chat, user_id: tgId }), tg(token, 'getUserChatBoosts', { chat_id: chat, user_id: tgId })])
  const st = m.result?.status
  const member = st === 'member' || st === 'administrator' || st === 'creator' || (st === 'restricted' && m.result?.is_member)
  return { member: !!member, boosts: b.result?.boosts?.length ?? 0 }
}

/** The member behind a Telegram user: their linked email → membership. */
async function memberOf(tgId: number) {
  const { data: link } = await sb.from('tg_links').select('email').eq('tg_id', tgId).maybeSingle()
  const email = link?.email ?? `tg${tgId}@users.telegram.invalid`
  const { data: m } = await sb.from('members').select('role, household').ilike('email', email).maybeSingle()
  return m as { role: 'a' | 'j'; household: string } | null
}

/** Shape a record like the app does for each section. */
function recordFor(target: (typeof TARGETS)[number], text: string, role: 'a' | 'j') {
  const url = text.match(/https?:\/\/\S+/)?.[0]
  const title = (url ? text.replace(url, '').trim() : text.trim()).slice(0, 200) || url || '—'
  const base = { id: crypto.randomUUID(), createdBy: role, createdAt: new Date().toISOString() }
  switch (target) {
    case 'inbox': return { collection: 'notes', data: { ...base, module: 'inbox', title, url } }
    case 'places': return { collection: 'notes', data: { ...base, module: 'dates', title, url } }
    case 'tasks': return { collection: 'tasks', data: { ...base, title, assignee: 'both', done: false, repeat: 'none', notes: url } }
    case 'groceries': return { collection: 'groceries', data: { ...base, title, category: 'other', done: false } }
    case 'watch': return { collection: 'watch', data: { ...base, title, kind: 'movie', status: 'want', url } }
    case 'recipes': return { collection: 'recipes', data: { ...base, title, url, tags: [], ingredients: [], someday: true, cooked: 0 } }
    case 'wishes': return { collection: 'wishes', data: { ...base, title, url, owner: role, kind: 'gift' } }
  }
}

async function onUpdate(token: string, u: any) {
  // The bot made an admin of a channel or group by one of the developers: that's our community (for /bonus and rewards).
  if (u.my_chat_member) {
    const c = u.my_chat_member, st = c.new_chat_member?.status
    if (st === 'administrator' && (c.chat.type === 'channel' || c.chat.type === 'supergroup')) {
      const m = await memberOf(c.from.id)
      const { data: h } = m ? await sb.from('households').select('tier').eq('id', m.household).maybeSingle() : { data: null }
      if (h?.tier === 'dev') await sb.from('app_config').upsert({ key: 'tg_community', value: { id: c.chat.id, title: c.chat.title, type: c.chat.type }, updated_at: new Date().toISOString(), updated_by: 'telegram' })
    }
    return
  }
  if (u.message) {
    const m = u.message, from = m.from, t = tx(from?.language_code)
    const chat = m.chat.id
    const text: string = m.text ?? m.caption ?? ''
    await sb.from('tg_links').update({ chat_id: chat, updated_at: new Date().toISOString() }).eq('tg_id', from.id)
    const openBtn = { inline_keyboard: [[{ text: t.open, web_app: { url: APP_URL } }]] }
    const code = text.match(/^\/start\s+(L[A-Za-z0-9]{10,})/)?.[1]
    if (code) {
      // A one-time code from «Link Telegram» in the app: tie this chat to that member.
      const { data: c } = await sb.from('tg_codes').select('email, created_at').eq('code', code).maybeSingle()
      const fresh = c && Date.now() - Date.parse(c.created_at) < 15 * 60000
      if (fresh) {
        await sb.from('tg_links').delete().eq('email', c.email).neq('tg_id', from.id)
        await sb.from('tg_links').upsert({ tg_id: from.id, email: c.email, chat_id: chat, updated_at: new Date().toISOString() })
        await sb.from('tg_codes').delete().eq('code', code)
      }
      await tg(token, 'sendMessage', { chat_id: chat, text: fresh ? t.linked : t.badCode, reply_markup: openBtn })
      return
    }
    const l = langOf(from?.language_code)
    const say = (s: string, markup: unknown = undefined) => tg(token, 'sendMessage', { chat_id: chat, text: s, reply_markup: markup, disable_web_page_preview: true })
    const joinBtn = { inline_keyboard: [[{ text: `💬 ${RX[l].join}`, url: COMMUNITY }]] }
    if (!text || text.startsWith('/start')) { await say(`${t.start}\n\n${HELP[l]}`, openBtn); return }
    const cmd = text.match(/^\/([a-z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/i)
    const name = cmd?.[1].toLowerCase()
    if (name === 'help') { await say(HELP[l], openBtn); return }
    if (name === 'community') { await say(RX[l].community, joinBtn); return }
    if (name === 'bonus') {
      const p = await perksOf(token, from.id)
      if (!p) { await say(RX[l].bonusNoCommunity, joinBtn); return }
      const mark = (ok: boolean) => (ok ? '✅' : '▫️')
      const lines = [RX[l].perkMember.replace('{m}', mark(p.member)), RX[l].perkBoost1.replace('{m}', mark(p.boosts >= 1)), RX[l].perkBoost2.replace('{m}', mark(p.boosts >= 2))].join('\n')
      await say(`${RX[l].bonus.replace('{lines}', lines)}${p.boosts < 2 ? `\n\n${RX[l].boostHow}` : ''}`, p.member ? openBtn : joinBtn)
      return
    }
    const member = await memberOf(from.id)
    if (!member) { await tg(token, 'sendMessage', { chat_id: chat, text: t.notLinked, reply_markup: openBtn }); return }
    if (name && ['buy', 'task', 'spent', 'list', 'today', 'wish', 'watch', 'idea'].includes(name)) {
      await say(await runCommand(name, (cmd?.[2] ?? '').trim(), member, l))
      return
    }
    if (name) { await say(HELP[l], openBtn); return }
    const { data: p } = await sb.from('tg_pending').insert({ household: member.household, role: member.role, text: text.slice(0, 2000) }).select('id').single()
    const guess = guessTarget(text)
    const rest = TARGETS.filter((k) => k !== guess)
    const btn = (k: string, star = false) => ({ text: (star ? '⭐ ' : '') + t[k], callback_data: `s:${p!.id}:${k}` })
    const rows = [...(guess ? [[btn(guess, true)]] : []), rest.slice(0, 3).map((k) => btn(k)), rest.slice(3).map((k) => btn(k))].filter((r) => r.length)
    const lang = (from?.language_code ?? 'ru').slice(0, 2)
    await tg(token, 'sendMessage', { chat_id: chat, text: guess ? (GUESS[lang] ?? GUESS.en).replace('{s}', t[guess]) : t.where, reply_to_message_id: m.message_id, reply_markup: { inline_keyboard: rows } })
    return
  }
  if (u.callback_query) {
    const q = u.callback_query, t = tx(q.from?.language_code)
    const [, id, target] = String(q.data ?? '').split(':')
    const { data: p } = await sb.from('tg_pending').select('*').eq('id', id).maybeSingle()
    if (p && (TARGETS as readonly string[]).includes(target)) {
      const r = recordFor(target as (typeof TARGETS)[number], p.text, p.role)
      await sb.from('records').insert({ id: r.data.id, household: p.household, collection: r.collection, data: r.data, created_by: p.role })
      await sb.from('tg_pending').delete().eq('id', id)
      await tg(token, 'editMessageText', { chat_id: q.message.chat.id, message_id: q.message.message_id, text: t.saved.replace('{s}', t[target]) })
    }
    await tg(token, 'answerCallbackQuery', { callback_query_id: q.id })
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const token = await botToken()
  if (!token) return json({ error: 'not configured' }, 503)

  // Telegram's webhook calls carry the secret header.
  if (req.headers.get('x-telegram-bot-api-secret-token')) {
    if (req.headers.get('x-telegram-bot-api-secret-token') !== await webhookSecret(token)) return new Response('forbidden', { status: 403 })
    await onUpdate(token, await req.json().catch(() => ({})))
    return new Response('ok')
  }

  const body = await req.json().catch(() => ({}))
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''

  if (body.type === 'auth' || body.type === 'link') {
    const user = await verifyInitData(String(body.initData ?? ''), token)
    if (!user) return json({ error: 'bad initData' }, 401)
    if (body.type === 'link') {
      const { data: u } = await sb.auth.getUser(jwt)
      if (!u.user?.email) return json({ error: 'not signed in' }, 401)
      // In a private chat with the bot the chat id is the user's id: link the chat right away, no message needed.
      await sb.from('tg_links').delete().eq('email', u.user.email.toLowerCase()).neq('tg_id', user.id)
      await sb.from('tg_links').upsert({ tg_id: user.id, email: u.user.email.toLowerCase(), chat_id: user.id, updated_at: new Date().toISOString() })
      return json({ ok: true })
    }
    // Sign in with Telegram: a Supabase user per Telegram account, then a one-time magic-link token.
    const { data: link } = await sb.from('tg_links').select('email').eq('tg_id', user.id).maybeSingle()
    const email = link?.email ?? `tg${user.id}@users.telegram.invalid`
    if (!link) {
      await sb.auth.admin.createUser({ email, email_confirm: true, user_metadata: { telegram_id: user.id, name: user.first_name } }).catch(() => null)
      await sb.from('tg_links').upsert({ tg_id: user.id, email, chat_id: user.id, updated_at: new Date().toISOString() })
    }
    const { data, error } = await sb.auth.admin.generateLink({ type: 'magiclink', email })
    if (error || !data?.properties?.hashed_token) return json({ error: error?.message ?? 'no link' }, 500)
    return json({ token_hash: data.properties.hashed_token, name: user.first_name })
  }

  if (body.type === 'perks') {
    // The app's «Collect rewards»: my linked Telegram account in our community, and its boosts.
    const { data: u } = await sb.auth.getUser(jwt)
    const email = u.user?.email?.toLowerCase()
    if (!email) return json({ error: 'not signed in' }, 401)
    const { data: link } = await sb.from('tg_links').select('tg_id').eq('email', email).maybeSingle()
    if (!link) return json({ linked: false, community: COMMUNITY })
    const p = await perksOf(token, link.tg_id)
    return json({ linked: true, community: COMMUNITY, ready: !!p, member: p?.member ?? false, boosts: p?.boosts ?? 0 })
  }

  if (body.type === 'linkCode' || body.type === 'status' || body.type === 'unlink') {
    const { data: u } = await sb.auth.getUser(jwt)
    const email = u.user?.email?.toLowerCase()
    if (!email) return json({ error: 'not signed in' }, 401)
    const bot = await botName(token)
    if (body.type === 'unlink') { await sb.from('tg_links').delete().eq('email', email); return json({ ok: true, bot }) }
    if (body.type === 'status') {
      const { data } = await sb.from('tg_links').select('chat_id').eq('email', email).not('chat_id', 'is', null).limit(1)
      return json({ linked: !!data?.length, bot })
    }
    await sb.from('tg_codes').delete().lt('created_at', new Date(Date.now() - 3600000).toISOString())
    const code = 'L' + [...crypto.getRandomValues(new Uint8Array(12))].map((b) => 'abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 54]).join('')
    await sb.from('tg_codes').insert({ code, email })
    return json({ code, bot, url: bot ? `https://t.me/${bot}?start=${code}` : null })
  }

  if (body.type === 'setup' || body.type === 'diag') {
    // Developers only: the caller must be in a dev-tier household.
    const { data: u } = await sb.auth.getUser(jwt)
    const { data: m } = await sb.from('members').select('household').ilike('email', u.user?.email ?? '-').maybeSingle()
    const { data: h } = m ? await sb.from('households').select('tier').eq('id', m.household).maybeSingle() : { data: null }
    if (h?.tier !== 'dev') return json({ error: 'forbidden' }, 403)
    let set: { hook?: boolean; menu?: boolean; error?: string } = {}
    if (body.type === 'setup') {
      const hook = await tg(token, 'setWebhook', { url: FN_URL, secret_token: await webhookSecret(token), allowed_updates: ['message', 'callback_query', 'my_chat_member'], drop_pending_updates: false })
      const menu = await tg(token, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'Family Hub', web_app: { url: APP_URL } } })
      // Commands, the «What can this bot do?» text and the profile line, in each language (English is the default).
      const order = ['start', 'buy', 'task', 'spent', 'list', 'today', 'wish', 'watch', 'idea', 'community', 'bonus', 'help']
      for (const l of LANGS) {
        const language_code = l === 'en' ? undefined : l
        await tg(token, 'setMyCommands', { commands: order.map((command) => ({ command, description: CMD[l][command] })), language_code })
        await tg(token, 'setMyDescription', { description: ABOUT[l], language_code })
        await tg(token, 'setMyShortDescription', { short_description: SHORT[l], language_code })
      }
      set = { hook: hook.ok, menu: menu.ok, error: hook.ok ? (menu.ok ? undefined : menu.description) : hook.description }
    }
    // Health: is the webhook ours, is Telegram failing to deliver, how many people the bot can write to.
    const [me, info] = await Promise.all([tg(token, 'getMe', {}), tg(token, 'getWebhookInfo', {})])
    const w = info.result ?? {}
    const { count: linked } = await sb.from('tg_links').select('tg_id', { count: 'exact', head: true }).not('chat_id', 'is', null)
    const mine = await sb.from('tg_links').select('chat_id').eq('email', (u.user?.email ?? '-').toLowerCase()).not('chat_id', 'is', null).limit(1)
    return json({
      ...set, bot: me.result?.username ?? null, webhook: w.url === FN_URL, webhookUrl: w.url ? new URL(w.url).host : null,
      pending: w.pending_update_count ?? 0, lastError: w.last_error_message ?? null,
      lastErrorAt: w.last_error_date ? new Date(w.last_error_date * 1000).toISOString() : null,
      linked: linked ?? 0, meLinked: !!mine.data?.length,
    })
  }

  return json({ error: 'unknown request' }, 400)
})
