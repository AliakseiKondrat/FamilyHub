import type { Lang, ModuleId, State } from './types'
import { useApp } from './store'

const ru = {
  'mod.today': 'Сегодня', 'mod.groceries': 'Продукты', 'mod.tasks': 'Задачи', 'mod.calendar': 'Календарь',
  'mod.budget': 'Бюджет', 'mod.watch': 'Смотреть', 'mod.recipes': 'Рецепты', 'mod.pet': 'Питомец',
  'mod.home': 'Дом', 'mod.travel': 'Путешествия', 'mod.dates': 'Свидания', 'mod.inbox': 'Входящие',
  'mod.archive': 'Архив', 'mod.photos': 'Фото', 'mod.cycle': 'Цикл', more: 'Ещё',

  add: 'Добавить', cancel: 'Отмена', done: 'Готово', save: 'Сохранить', delete: 'Удалить', edit: 'Изменить',
  title: 'Название', notes: 'Заметки', link: 'Ссылка', date: 'Дата', time: 'Время', start: 'Начало', end: 'Конец',
  who: 'Кто', both: 'Вместе', repeat: 'Повтор', 'rep.none': 'Нет', 'rep.daily': 'Каждый день',
  'rep.weekly': 'Каждую неделю', 'rep.monthly': 'Каждый месяц', 'rep.yearly': 'Каждый год',
  today: 'Сегодня', tomorrow: 'Завтра', yesterday: 'Вчера', overdue: 'Просрочено', later: 'Позже',
  noDate: 'Без срока', completed: 'Выполнено', showCompleted: 'Показать выполненные',
  hideCompleted: 'Скрыть выполненные', empty: 'Пока пусто', open: 'Открыть', category: 'Категория',
  amount: 'Сумма', random: 'Случайно', details: 'Подробнее', tags: 'Теги', all: 'Все', moveTo: 'Переместить в…',
  open_link: 'Открыть ссылку',

  surprise: 'Сюрприз', surpriseFor: 'Это сюрприз 🤫', surpriseHint: '{name} не увидит это до даты раскрытия или пока ты не раскроешь сам.',
  revealAt: 'Раскрыть', revealNow: 'Раскрыть сейчас', hiddenFrom: 'Скрыто от {name}',
  privateOnly: 'Только для меня', privateHint: 'Никто, кроме тебя, не увидит эту запись.', assignee: 'Кто делает',

  'greet.morning': 'Доброе утро, {name}', 'greet.day': 'Добрый день, {name}', 'greet.evening': 'Добрый вечер, {name}',
  'greet.night': 'Доброй ночи, {name}', todayEvents: 'События', todayTasks: 'Задачи на сегодня',
  nothingToday: 'На сегодня ничего — можно отдыхать', groceriesLeft: 'купить', tasksLeft: 'задач',
  tripIn: 'До поездки «{place}»: {n} дн.', tripNow: 'Вы в поездке «{place}» ✈️', petDue: '{name}: скоро',
  cycleDay: 'День цикла {n}', periodNow: '🌸 {name}: сейчас месячные', periodSoon: '🌸 {name}: месячные примерно через {n} дн.',
  dateIdea: 'Идея для свидания', onThisDay: 'В этот день',

  'gro.placeholder': 'Добавить… можно через запятую', inCart: 'В корзине', clearBought: 'Убрать купленное',
  frequent: 'Часто покупаем',
  'cat.produce': 'Овощи и фрукты', 'cat.dairy': 'Молочное и яйца', 'cat.meat': 'Мясо и рыба', 'cat.bakery': 'Хлеб и выпечка',
  'cat.frozen': 'Заморозка', 'cat.drinks': 'Напитки', 'cat.pantry': 'Бакалея', 'cat.household': 'Для дома',
  'cat.pet': 'Для питомца', 'cat.other': 'Другое',

  'task.placeholder': 'Новая задача — «завтра 18:00»', 'filter.all': 'Все', 'filter.mine': 'Мои', 'filter.shared': 'Общие',

  newEvent: 'Новое событие', allDay: 'Весь день', connectGoogle: 'Google Календарь', googleSoon: 'Синхронизация появится вместе с сервером',
  noEvents: 'Нет событий',

  spent: 'Потрачено', ofLimit: 'из {sum}', settled: 'Вы в расчёте 🤝', owes: 'Долг: {a} → {b} · {sum}',
  settle: 'Рассчитаться', settlement: 'Расчёт', shared: 'Общая', personal: 'Личная', paidBy: 'Кто платил', limits: 'Лимиты',
  noLimit: 'Без лимита', limit: 'Лимит в месяц', limitHint: 'Нажми на категорию, чтобы задать месячный лимит.', expenses: 'Траты', newExpense: 'Новая трата', byCategory: 'По категориям',
  'bcat.groceries': 'Продукты', 'bcat.eating': 'Кафе и рестораны', 'bcat.home': 'Дом и счета', 'bcat.transport': 'Транспорт',
  'bcat.fun': 'Развлечения', 'bcat.pet': 'Питомец', 'bcat.health': 'Здоровье', 'bcat.travel': 'Путешествия',
  'bcat.gifts': 'Подарки', 'bcat.subscriptions': 'Подписки', 'bcat.other': 'Другое',

  'ws.want': 'Хотим', 'ws.watching': 'Смотрим', 'ws.done': 'Посмотрели', 'wk.movie': 'Фильм', 'wk.series': 'Сериал',
  'wk.other': 'Другое', whatToWatch: 'Что посмотрим?', rating: 'Оценка', type: 'Тип', status: 'Статус',

  someday: 'Когда-нибудь', ingredients: 'Ингредиенты', ingredientsHint: 'Каждый с новой строки', toGroceries: 'Добавить в продукты',
  addedToGroceries: 'Добавлено в продукты ✓', cooked: 'Готовили {n}×', markCooked: 'Приготовили!',

  upcoming: 'Скоро', history: 'История', weight: 'Вес', addWeight: 'Записать вес', kg: 'кг', nextDue: 'Следующий раз',
  'pk.vaccine': 'Прививка', 'pk.parasite': 'Клещи и глисты', 'pk.vet': 'Ветеринар', 'pk.groom': 'Груминг', 'pk.other': 'Другое',
  markDone: 'Отметить сделанным', age: 'Возраст', years: 'г.', months: 'мес.', inDays: 'через {n} дн.', daysAgo: '{n} дн. назад',
  name: 'Имя',

  been: 'Были', ideas: 'Идеи', randomIdea: 'Выбрать идею', randomPick: 'Как насчёт этого?',

  upcomingTrips: 'Предстоящие', pastTrips: 'Прошедшие', plan: 'План', packing: 'Вещи', docs: 'Документы',
  destination: 'Куда', newTrip: 'Новая поездка', addDefaults: 'Добавить базовый список',
  defaultPacking: 'Паспорта,Зарядки,Наушники,Лекарства,Зубные щётки,Солнцезащитный крем,Адаптер для розетки',

  addPhotos: 'Добавить фото', album: 'Альбом', noPhotos: 'Добавь первые фото — откроется выбор из галереи iPhone',
  uploading: 'Загружаем…', photoHint: 'Фото сжимаются для экономии места, оригиналы остаются у тебя на iPhone.',
  'alb.us': 'Мы', 'alb.pet': 'Питомец', 'alb.travel': 'Путешествия', 'alb.home': 'Дом', 'alb.dates': 'Свидания',

  logStart: 'Начались сегодня', logEnd: 'Закончились сегодня', nextPeriod: 'Следующие', avgCycle: 'Средний цикл',
  periodLength: 'Длительность', days: 'дн.', cyclePrivate: 'Видишь только ты. {name} видит только дни месячных в календаре.',
  inPeriod: 'Сейчас месячные', dayN: 'день {n}',

  settings: 'Настройки', iAm: 'Кто я', iAmHint: 'В прототипе можно переключаться, чтобы посмотреть глазами партнёра.',
  people: 'Мы', language: 'Язык', country: 'Страна', poland: 'Польша', spain: 'Испания', currency: 'Валюта',
  theme: 'Оформление', 'theme.auto': 'Авто', 'theme.light': 'Светлое', 'theme.dark': 'Тёмное', sections: 'Разделы',
  sectionsHint: 'Нажми, чтобы переименовать или сменить эмодзи.', emoji: 'Эмодзи', integrations: 'Интеграции',
  siri: 'Команды Siri', widgets: 'Виджеты', push: 'Уведомления', soon: 'Скоро', data: 'Данные', export: 'Экспорт в файл',
  reset: 'Сбросить к демо-данным', resetConfirm: 'Удалить все данные на этом устройстве и вернуть демо?',
  prototype: 'Прототип: данные пока хранятся только на этом устройстве. Синхронизация между вами — следующий шаг.',
  install: 'Как установить на iPhone', installHint: 'Открой в Safari → «Поделиться» → «На экран Домой». Приложение откроется без адресной строки.',
  pet: 'Питомец', defaultName: 'По умолчанию',
  tagline: 'Наш общий дом', email: 'Email', password: 'Пароль', signIn: 'Войти', signUp: 'Создать аккаунт',
  haveAccount: 'Уже есть аккаунт? Войти', noAccount: 'Впервые здесь? Создать аккаунт',
  checkEmail: 'Готово! Подтверди адрес по ссылке из письма, потом вернись сюда и войди.',
  noAccess: '{email} нет в списке участников. Войди с другим адресом.', signOut: 'Выйти', account: 'Аккаунт',
  synced: 'Всё синхронизировано', offline: 'Нет сети — изменения отправятся позже', pendingN: 'Ждут отправки: {n}',
}

type Dict = typeof ru

const en: Dict = {
  'mod.today': 'Today', 'mod.groceries': 'Groceries', 'mod.tasks': 'Tasks', 'mod.calendar': 'Calendar',
  'mod.budget': 'Budget', 'mod.watch': 'Watchlist', 'mod.recipes': 'Recipes', 'mod.pet': 'Pet',
  'mod.home': 'Home', 'mod.travel': 'Travel', 'mod.dates': 'Dates', 'mod.inbox': 'Inbox',
  'mod.archive': 'Archive', 'mod.photos': 'Photos', 'mod.cycle': 'Cycle', more: 'More',

  add: 'Add', cancel: 'Cancel', done: 'Done', save: 'Save', delete: 'Delete', edit: 'Edit',
  title: 'Title', notes: 'Notes', link: 'Link', date: 'Date', time: 'Time', start: 'Start', end: 'End',
  who: 'Who', both: 'Together', repeat: 'Repeat', 'rep.none': 'Never', 'rep.daily': 'Every day',
  'rep.weekly': 'Every week', 'rep.monthly': 'Every month', 'rep.yearly': 'Every year',
  today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday', overdue: 'Overdue', later: 'Later',
  noDate: 'No date', completed: 'Completed', showCompleted: 'Show completed',
  hideCompleted: 'Hide completed', empty: 'Nothing here yet', open: 'Open', category: 'Category',
  amount: 'Amount', random: 'Random', details: 'Details', tags: 'Tags', all: 'All', moveTo: 'Move to…',
  open_link: 'Open link',

  surprise: 'Surprise', surpriseFor: 'Surprise for {name}', surpriseHint: '{name} won’t see this until the reveal date or until you reveal it.',
  revealAt: 'Reveal on', revealNow: 'Reveal now', hiddenFrom: 'Hidden from {name}',
  privateOnly: 'Only me', privateHint: 'Nobody but you will see this.', assignee: 'Assigned to',

  'greet.morning': 'Good morning, {name}', 'greet.day': 'Good afternoon, {name}', 'greet.evening': 'Good evening, {name}',
  'greet.night': 'Good night, {name}', todayEvents: 'Events', todayTasks: 'Due today',
  nothingToday: 'Nothing for today — time to relax', groceriesLeft: 'to buy', tasksLeft: 'tasks',
  tripIn: '{n} days until “{place}”', tripNow: 'You’re on “{place}” ✈️', petDue: 'For {name}',
  cycleDay: 'Cycle day {n}', periodNow: '🌸 {name} is on her period', periodSoon: '🌸 {name}’s period in about {n} days',
  dateIdea: 'Date idea', onThisDay: 'On this day',

  'gro.placeholder': 'Add… separate with commas', inCart: 'In the cart', clearBought: 'Clear bought',
  frequent: 'Often bought',
  'cat.produce': 'Fruit & veg', 'cat.dairy': 'Dairy & eggs', 'cat.meat': 'Meat & fish', 'cat.bakery': 'Bakery',
  'cat.frozen': 'Frozen', 'cat.drinks': 'Drinks', 'cat.pantry': 'Pantry', 'cat.household': 'Household',
  'cat.pet': 'Pet', 'cat.other': 'Other',

  'task.placeholder': 'New task — “tomorrow 18:00”', 'filter.all': 'All', 'filter.mine': 'Mine', 'filter.shared': 'Shared',

  newEvent: 'New event', allDay: 'All day', connectGoogle: 'Google Calendar', googleSoon: 'Sync arrives together with the server',
  noEvents: 'No events',

  spent: 'Spent', ofLimit: 'of {sum}', settled: 'You’re all square 🤝', owes: '{a} owes {b} {sum}',
  settle: 'Settle up', settlement: 'Settlement', shared: 'Shared', personal: 'Personal', paidBy: 'Paid by', limits: 'Limits',
  noLimit: 'No limit', limit: 'Monthly limit', limitHint: 'Tap a category to set a monthly limit.', expenses: 'Expenses', newExpense: 'New expense', byCategory: 'By category',
  'bcat.groceries': 'Groceries', 'bcat.eating': 'Eating out', 'bcat.home': 'Home & bills', 'bcat.transport': 'Transport',
  'bcat.fun': 'Fun', 'bcat.pet': 'Pet', 'bcat.health': 'Health', 'bcat.travel': 'Travel',
  'bcat.gifts': 'Gifts', 'bcat.subscriptions': 'Subscriptions', 'bcat.other': 'Other',

  'ws.want': 'Want', 'ws.watching': 'Watching', 'ws.done': 'Watched', 'wk.movie': 'Movie', 'wk.series': 'Series',
  'wk.other': 'Other', whatToWatch: 'What shall we watch?', rating: 'Rating', type: 'Type', status: 'Status',

  someday: 'Someday', ingredients: 'Ingredients', ingredientsHint: 'One per line', toGroceries: 'Add to groceries',
  addedToGroceries: 'Added to groceries ✓', cooked: 'Cooked {n}×', markCooked: 'We cooked it!',

  upcoming: 'Upcoming', history: 'History', weight: 'Weight', addWeight: 'Log weight', kg: 'kg', nextDue: 'Next time',
  'pk.vaccine': 'Vaccine', 'pk.parasite': 'Ticks & worms', 'pk.vet': 'Vet', 'pk.groom': 'Grooming', 'pk.other': 'Other',
  markDone: 'Mark as done', age: 'Age', years: 'y', months: 'mo', inDays: 'in {n} d', daysAgo: '{n} d ago',
  name: 'Name',

  been: 'Done', ideas: 'Ideas', randomIdea: 'Pick an idea', randomPick: 'How about this?',

  upcomingTrips: 'Upcoming', pastTrips: 'Past', plan: 'Plan', packing: 'Packing', docs: 'Documents',
  destination: 'Where', newTrip: 'New trip', addDefaults: 'Add basic list',
  defaultPacking: 'Passports,Chargers,Headphones,Medicine,Toothbrushes,Sunscreen,Plug adapter',

  addPhotos: 'Add photos', album: 'Album', noPhotos: 'Add your first photos — the iPhone photo picker will open',
  uploading: 'Uploading…', photoHint: 'Photos are compressed to save space; originals stay on your iPhone.',
  'alb.us': 'Us', 'alb.pet': 'Pet', 'alb.travel': 'Travel', 'alb.home': 'Home', 'alb.dates': 'Dates',

  logStart: 'Started today', logEnd: 'Ended today', nextPeriod: 'Next period', avgCycle: 'Average cycle',
  periodLength: 'Period length', days: 'd', cyclePrivate: 'Only you see this. {name} only sees period days in the calendar.',
  inPeriod: 'Period now', dayN: 'day {n}',

  settings: 'Settings', iAm: 'I am', iAmHint: 'In the prototype you can switch to see the app through your partner’s eyes.',
  people: 'Us', language: 'Language', country: 'Country', poland: 'Poland', spain: 'Spain', currency: 'Currency',
  theme: 'Appearance', 'theme.auto': 'Auto', 'theme.light': 'Light', 'theme.dark': 'Dark', sections: 'Sections',
  sectionsHint: 'Tap to rename or change the emoji.', emoji: 'Emoji', integrations: 'Integrations',
  siri: 'Siri Shortcuts', widgets: 'Widgets', push: 'Notifications', soon: 'Soon', data: 'Data', export: 'Export to file',
  reset: 'Reset to demo data', resetConfirm: 'Delete all data on this device and restore the demo?',
  prototype: 'Prototype: data lives only on this device for now. Syncing between you is the next step.',
  install: 'Install on iPhone', installHint: 'Open in Safari → Share → Add to Home Screen. The app opens without the address bar.',
  pet: 'Pet', defaultName: 'Default',
  tagline: 'Our shared home', email: 'Email', password: 'Password', signIn: 'Sign in', signUp: 'Create account',
  haveAccount: 'Already have an account? Sign in', noAccount: 'New here? Create an account',
  checkEmail: 'Done! Confirm your address with the link in the email, then come back and sign in.',
  noAccess: '{email} is not on the members list. Sign in with another address.', signOut: 'Sign out', account: 'Account',
  synced: 'Everything is synced', offline: 'Offline — changes will be sent later', pendingN: 'Waiting to send: {n}',
}

const pl: Dict = {
  'mod.today': 'Dziś', 'mod.groceries': 'Zakupy', 'mod.tasks': 'Zadania', 'mod.calendar': 'Kalendarz',
  'mod.budget': 'Budżet', 'mod.watch': 'Do obejrzenia', 'mod.recipes': 'Przepisy', 'mod.pet': 'Pupil',
  'mod.home': 'Dom', 'mod.travel': 'Podróże', 'mod.dates': 'Randki', 'mod.inbox': 'Skrzynka',
  'mod.archive': 'Archiwum', 'mod.photos': 'Zdjęcia', 'mod.cycle': 'Cykl', more: 'Więcej',

  add: 'Dodaj', cancel: 'Anuluj', done: 'Gotowe', save: 'Zapisz', delete: 'Usuń', edit: 'Edytuj',
  title: 'Nazwa', notes: 'Notatki', link: 'Link', date: 'Data', time: 'Godzina', start: 'Początek', end: 'Koniec',
  who: 'Kto', both: 'Razem', repeat: 'Powtarzaj', 'rep.none': 'Nigdy', 'rep.daily': 'Codziennie',
  'rep.weekly': 'Co tydzień', 'rep.monthly': 'Co miesiąc', 'rep.yearly': 'Co rok',
  today: 'Dziś', tomorrow: 'Jutro', yesterday: 'Wczoraj', overdue: 'Zaległe', later: 'Później',
  noDate: 'Bez terminu', completed: 'Ukończone', showCompleted: 'Pokaż ukończone',
  hideCompleted: 'Ukryj ukończone', empty: 'Na razie pusto', open: 'Otwórz', category: 'Kategoria',
  amount: 'Kwota', random: 'Losowo', details: 'Szczegóły', tags: 'Tagi', all: 'Wszystko', moveTo: 'Przenieś do…',
  open_link: 'Otwórz link',

  surprise: 'Niespodzianka', surpriseFor: 'To niespodzianka 🤫', surpriseHint: '{name} nie zobaczy tego do dnia odsłonięcia albo dopóki sam tego nie odsłonisz.',
  revealAt: 'Odsłoń', revealNow: 'Odsłoń teraz', hiddenFrom: 'Ukryte przed {name}',
  privateOnly: 'Tylko dla mnie', privateHint: 'Nikt poza tobą tego nie zobaczy.', assignee: 'Kto robi',

  'greet.morning': 'Dzień dobry, {name}', 'greet.day': 'Cześć, {name}', 'greet.evening': 'Dobry wieczór, {name}',
  'greet.night': 'Dobranoc, {name}', todayEvents: 'Wydarzenia', todayTasks: 'Na dziś',
  nothingToday: 'Na dziś nic — czas odpocząć', groceriesLeft: 'do kupienia', tasksLeft: 'zadań',
  tripIn: 'Do wyjazdu „{place}”: {n} dni', tripNow: 'Jesteście w podróży „{place}” ✈️', petDue: '{name}: wkrótce',
  cycleDay: 'Dzień cyklu {n}', periodNow: '🌸 {name} ma teraz okres', periodSoon: '🌸 {name}: okres za około {n} dni',
  dateIdea: 'Pomysł na randkę', onThisDay: 'Tego dnia',

  'gro.placeholder': 'Dodaj… można po przecinku', inCart: 'W koszyku', clearBought: 'Usuń kupione',
  frequent: 'Często kupujemy',
  'cat.produce': 'Warzywa i owoce', 'cat.dairy': 'Nabiał i jajka', 'cat.meat': 'Mięso i ryby', 'cat.bakery': 'Pieczywo',
  'cat.frozen': 'Mrożonki', 'cat.drinks': 'Napoje', 'cat.pantry': 'Spożywcze', 'cat.household': 'Chemia i dom',
  'cat.pet': 'Dla pupila', 'cat.other': 'Inne',

  'task.placeholder': 'Nowe zadanie — „jutro 18:00”', 'filter.all': 'Wszystkie', 'filter.mine': 'Moje', 'filter.shared': 'Wspólne',

  newEvent: 'Nowe wydarzenie', allDay: 'Cały dzień', connectGoogle: 'Kalendarz Google', googleSoon: 'Synchronizacja pojawi się razem z serwerem',
  noEvents: 'Brak wydarzeń',

  spent: 'Wydano', ofLimit: 'z {sum}', settled: 'Jesteście kwita 🤝', owes: 'Dług: {a} → {b} · {sum}',
  settle: 'Rozlicz', settlement: 'Rozliczenie', shared: 'Wspólny', personal: 'Osobisty', paidBy: 'Kto płacił', limits: 'Limity',
  noLimit: 'Bez limitu', limit: 'Limit miesięczny', limitHint: 'Dotknij kategorii, aby ustawić limit miesięczny.', expenses: 'Wydatki', newExpense: 'Nowy wydatek', byCategory: 'Według kategorii',
  'bcat.groceries': 'Zakupy spożywcze', 'bcat.eating': 'Restauracje', 'bcat.home': 'Dom i rachunki', 'bcat.transport': 'Transport',
  'bcat.fun': 'Rozrywka', 'bcat.pet': 'Pupil', 'bcat.health': 'Zdrowie', 'bcat.travel': 'Podróże',
  'bcat.gifts': 'Prezenty', 'bcat.subscriptions': 'Subskrypcje', 'bcat.other': 'Inne',

  'ws.want': 'Chcemy', 'ws.watching': 'Oglądamy', 'ws.done': 'Obejrzane', 'wk.movie': 'Film', 'wk.series': 'Serial',
  'wk.other': 'Inne', whatToWatch: 'Co obejrzymy?', rating: 'Ocena', type: 'Typ', status: 'Status',

  someday: 'Kiedyś', ingredients: 'Składniki', ingredientsHint: 'Każdy w nowej linii', toGroceries: 'Dodaj do zakupów',
  addedToGroceries: 'Dodano do zakupów ✓', cooked: 'Gotowaliśmy {n}×', markCooked: 'Ugotowane!',

  upcoming: 'Wkrótce', history: 'Historia', weight: 'Waga', addWeight: 'Zapisz wagę', kg: 'kg', nextDue: 'Następny raz',
  'pk.vaccine': 'Szczepienie', 'pk.parasite': 'Kleszcze i robaki', 'pk.vet': 'Weterynarz', 'pk.groom': 'Groomer', 'pk.other': 'Inne',
  markDone: 'Oznacz jako zrobione', age: 'Wiek', years: 'l.', months: 'mies.', inDays: 'za {n} dni', daysAgo: '{n} dni temu',
  name: 'Imię',

  been: 'Byliśmy', ideas: 'Pomysły', randomIdea: 'Wylosuj pomysł', randomPick: 'Może to?',

  upcomingTrips: 'Nadchodzące', pastTrips: 'Minione', plan: 'Plan', packing: 'Rzeczy', docs: 'Dokumenty',
  destination: 'Dokąd', newTrip: 'Nowa podróż', addDefaults: 'Dodaj podstawową listę',
  defaultPacking: 'Paszporty,Ładowarki,Słuchawki,Leki,Szczoteczki,Krem z filtrem,Przejściówka do gniazdka',

  addPhotos: 'Dodaj zdjęcia', album: 'Album', noPhotos: 'Dodaj pierwsze zdjęcia — otworzy się galeria iPhone',
  uploading: 'Wysyłanie…', photoHint: 'Zdjęcia są kompresowane, oryginały zostają na twoim iPhonie.',
  'alb.us': 'My', 'alb.pet': 'Pupil', 'alb.travel': 'Podróże', 'alb.home': 'Dom', 'alb.dates': 'Randki',

  logStart: 'Zaczął się dziś', logEnd: 'Skończył się dziś', nextPeriod: 'Następny', avgCycle: 'Średni cykl',
  periodLength: 'Długość okresu', days: 'dni', cyclePrivate: 'Widzisz tylko ty. {name} widzi w kalendarzu tylko dni okresu.',
  inPeriod: 'Teraz okres', dayN: 'dzień {n}',

  settings: 'Ustawienia', iAm: 'Kim jestem', iAmHint: 'W prototypie możesz się przełączyć, by zobaczyć aplikację oczami partnera.',
  people: 'My', language: 'Język', country: 'Kraj', poland: 'Polska', spain: 'Hiszpania', currency: 'Waluta',
  theme: 'Wygląd', 'theme.auto': 'Auto', 'theme.light': 'Jasny', 'theme.dark': 'Ciemny', sections: 'Sekcje',
  sectionsHint: 'Dotknij, aby zmienić nazwę lub emoji.', emoji: 'Emoji', integrations: 'Integracje',
  siri: 'Skróty Siri', widgets: 'Widżety', push: 'Powiadomienia', soon: 'Wkrótce', data: 'Dane', export: 'Eksport do pliku',
  reset: 'Przywróć dane demo', resetConfirm: 'Usunąć wszystkie dane na tym urządzeniu i przywrócić demo?',
  prototype: 'Prototyp: dane są na razie tylko na tym urządzeniu. Synchronizacja między wami to następny krok.',
  install: 'Jak zainstalować na iPhonie', installHint: 'Otwórz w Safari → Udostępnij → Do ekranu początkowego. Aplikacja otworzy się bez paska adresu.',
  pet: 'Pupil', defaultName: 'Domyślnie',
  tagline: 'Nasz wspólny dom', email: 'Email', password: 'Hasło', signIn: 'Zaloguj się', signUp: 'Utwórz konto',
  haveAccount: 'Masz już konto? Zaloguj się', noAccount: 'Pierwszy raz? Utwórz konto',
  checkEmail: 'Gotowe! Potwierdź adres linkiem z maila, potem wróć tu i zaloguj się.',
  noAccess: '{email} nie ma na liście członków. Zaloguj się innym adresem.', signOut: 'Wyloguj', account: 'Konto',
  synced: 'Wszystko zsynchronizowane', offline: 'Brak sieci — zmiany wyślą się później', pendingN: 'Czeka na wysłanie: {n}',
}

const es: Dict = {
  'mod.today': 'Hoy', 'mod.groceries': 'Compra', 'mod.tasks': 'Tareas', 'mod.calendar': 'Calendario',
  'mod.budget': 'Presupuesto', 'mod.watch': 'Por ver', 'mod.recipes': 'Recetas', 'mod.pet': 'Mascota',
  'mod.home': 'Casa', 'mod.travel': 'Viajes', 'mod.dates': 'Citas', 'mod.inbox': 'Bandeja',
  'mod.archive': 'Archivo', 'mod.photos': 'Fotos', 'mod.cycle': 'Ciclo', more: 'Más',

  add: 'Añadir', cancel: 'Cancelar', done: 'Hecho', save: 'Guardar', delete: 'Eliminar', edit: 'Editar',
  title: 'Título', notes: 'Notas', link: 'Enlace', date: 'Fecha', time: 'Hora', start: 'Inicio', end: 'Fin',
  who: 'Quién', both: 'Juntos', repeat: 'Repetir', 'rep.none': 'Nunca', 'rep.daily': 'Cada día',
  'rep.weekly': 'Cada semana', 'rep.monthly': 'Cada mes', 'rep.yearly': 'Cada año',
  today: 'Hoy', tomorrow: 'Mañana', yesterday: 'Ayer', overdue: 'Vencidas', later: 'Más tarde',
  noDate: 'Sin fecha', completed: 'Completadas', showCompleted: 'Mostrar completadas',
  hideCompleted: 'Ocultar completadas', empty: 'Aún no hay nada', open: 'Abrir', category: 'Categoría',
  amount: 'Importe', random: 'Al azar', details: 'Detalles', tags: 'Etiquetas', all: 'Todo', moveTo: 'Mover a…',
  open_link: 'Abrir enlace',

  surprise: 'Sorpresa', surpriseFor: 'Sorpresa para {name}', surpriseHint: '{name} no lo verá hasta la fecha de revelación o hasta que lo reveles tú.',
  revealAt: 'Revelar el', revealNow: 'Revelar ahora', hiddenFrom: 'Oculto para {name}',
  privateOnly: 'Solo yo', privateHint: 'Nadie más que tú lo verá.', assignee: 'Quién lo hace',

  'greet.morning': 'Buenos días, {name}', 'greet.day': 'Buenas tardes, {name}', 'greet.evening': 'Buenas tardes, {name}',
  'greet.night': 'Buenas noches, {name}', todayEvents: 'Eventos', todayTasks: 'Para hoy',
  nothingToday: 'Nada para hoy — a descansar', groceriesLeft: 'por comprar', tasksLeft: 'tareas',
  tripIn: 'Faltan {n} días para «{place}»', tripNow: 'Estáis de viaje en «{place}» ✈️', petDue: 'Para {name}',
  cycleDay: 'Día {n} del ciclo', periodNow: '🌸 {name} tiene la regla', periodSoon: '🌸 La regla de {name} en unos {n} días',
  dateIdea: 'Idea para una cita', onThisDay: 'Tal día como hoy',

  'gro.placeholder': 'Añadir… separa con comas', inCart: 'En el carrito', clearBought: 'Quitar comprados',
  frequent: 'Compramos a menudo',
  'cat.produce': 'Frutas y verduras', 'cat.dairy': 'Lácteos y huevos', 'cat.meat': 'Carne y pescado', 'cat.bakery': 'Panadería',
  'cat.frozen': 'Congelados', 'cat.drinks': 'Bebidas', 'cat.pantry': 'Despensa', 'cat.household': 'Hogar y limpieza',
  'cat.pet': 'Mascota', 'cat.other': 'Otros',

  'task.placeholder': 'Nueva tarea — «mañana 18:00»', 'filter.all': 'Todas', 'filter.mine': 'Mías', 'filter.shared': 'Comunes',

  newEvent: 'Nuevo evento', allDay: 'Todo el día', connectGoogle: 'Google Calendar', googleSoon: 'La sincronización llegará con el servidor',
  noEvents: 'Sin eventos',

  spent: 'Gastado', ofLimit: 'de {sum}', settled: 'Estáis en paz 🤝', owes: '{a} debe a {b} {sum}',
  settle: 'Saldar', settlement: 'Liquidación', shared: 'Común', personal: 'Personal', paidBy: 'Pagó', limits: 'Límites',
  noLimit: 'Sin límite', limit: 'Límite mensual', limitHint: 'Toca una categoría para fijar un límite mensual.', expenses: 'Gastos', newExpense: 'Nuevo gasto', byCategory: 'Por categoría',
  'bcat.groceries': 'Supermercado', 'bcat.eating': 'Restaurantes', 'bcat.home': 'Casa y facturas', 'bcat.transport': 'Transporte',
  'bcat.fun': 'Ocio', 'bcat.pet': 'Mascota', 'bcat.health': 'Salud', 'bcat.travel': 'Viajes',
  'bcat.gifts': 'Regalos', 'bcat.subscriptions': 'Suscripciones', 'bcat.other': 'Otros',

  'ws.want': 'Queremos', 'ws.watching': 'Viendo', 'ws.done': 'Vistas', 'wk.movie': 'Película', 'wk.series': 'Serie',
  'wk.other': 'Otro', whatToWatch: '¿Qué vemos?', rating: 'Nota', type: 'Tipo', status: 'Estado',

  someday: 'Algún día', ingredients: 'Ingredientes', ingredientsHint: 'Uno por línea', toGroceries: 'Añadir a la compra',
  addedToGroceries: 'Añadido a la compra ✓', cooked: 'Cocinado {n}×', markCooked: '¡Lo cocinamos!',

  upcoming: 'Próximo', history: 'Historial', weight: 'Peso', addWeight: 'Anotar peso', kg: 'kg', nextDue: 'Próxima vez',
  'pk.vaccine': 'Vacuna', 'pk.parasite': 'Garrapatas y parásitos', 'pk.vet': 'Veterinario', 'pk.groom': 'Peluquería', 'pk.other': 'Otro',
  markDone: 'Marcar como hecho', age: 'Edad', years: 'a', months: 'm', inDays: 'en {n} d', daysAgo: 'hace {n} d',
  name: 'Nombre',

  been: 'Hechas', ideas: 'Ideas', randomIdea: 'Elegir una idea', randomPick: '¿Qué tal esto?',

  upcomingTrips: 'Próximos', pastTrips: 'Pasados', plan: 'Plan', packing: 'Equipaje', docs: 'Documentos',
  destination: 'Destino', newTrip: 'Nuevo viaje', addDefaults: 'Añadir lista básica',
  defaultPacking: 'Pasaportes,Cargadores,Auriculares,Medicinas,Cepillos de dientes,Protector solar,Adaptador de enchufe',

  addPhotos: 'Añadir fotos', album: 'Álbum', noPhotos: 'Añade tus primeras fotos — se abrirá la galería del iPhone',
  uploading: 'Subiendo…', photoHint: 'Las fotos se comprimen; los originales se quedan en tu iPhone.',
  'alb.us': 'Nosotros', 'alb.pet': 'Mascota', 'alb.travel': 'Viajes', 'alb.home': 'Casa', 'alb.dates': 'Citas',

  logStart: 'Empezó hoy', logEnd: 'Terminó hoy', nextPeriod: 'Próxima', avgCycle: 'Ciclo medio',
  periodLength: 'Duración', days: 'd', cyclePrivate: 'Solo lo ves tú. {name} solo ve los días de regla en el calendario.',
  inPeriod: 'Con la regla', dayN: 'día {n}',

  settings: 'Ajustes', iAm: 'Soy', iAmHint: 'En el prototipo puedes cambiar para ver la app como tu pareja.',
  people: 'Nosotros', language: 'Idioma', country: 'País', poland: 'Polonia', spain: 'España', currency: 'Moneda',
  theme: 'Apariencia', 'theme.auto': 'Auto', 'theme.light': 'Claro', 'theme.dark': 'Oscuro', sections: 'Secciones',
  sectionsHint: 'Toca para renombrar o cambiar el emoji.', emoji: 'Emoji', integrations: 'Integraciones',
  siri: 'Atajos de Siri', widgets: 'Widgets', push: 'Notificaciones', soon: 'Pronto', data: 'Datos', export: 'Exportar a archivo',
  reset: 'Restaurar datos de demo', resetConfirm: '¿Borrar todos los datos de este dispositivo y restaurar la demo?',
  prototype: 'Prototipo: por ahora los datos solo están en este dispositivo. La sincronización entre vosotros es el siguiente paso.',
  install: 'Instalar en el iPhone', installHint: 'Abre en Safari → Compartir → Añadir a pantalla de inicio. La app se abrirá sin barra de direcciones.',
  pet: 'Mascota', defaultName: 'Por defecto',
  tagline: 'Nuestro hogar compartido', email: 'Email', password: 'Contraseña', signIn: 'Entrar', signUp: 'Crear cuenta',
  haveAccount: '¿Ya tienes cuenta? Entrar', noAccount: '¿Primera vez? Crear cuenta',
  checkEmail: '¡Listo! Confirma tu dirección con el enlace del correo y vuelve aquí para entrar.',
  noAccess: '{email} no está en la lista de miembros. Entra con otra dirección.', signOut: 'Cerrar sesión', account: 'Cuenta',
  synced: 'Todo sincronizado', offline: 'Sin conexión — los cambios se enviarán después', pendingN: 'Pendientes de enviar: {n}',
}

export const DICTS: Record<Lang, Dict> = { ru, en, pl, es }
export type TKey = keyof Dict

export const LANG_NAMES: Record<Lang, string> = { ru: 'Русский', en: 'English', pl: 'Polski', es: 'Español' }

export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>) {
  let s: string = DICTS[lang][key] ?? ru[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}

export function useT() {
  const { lang } = useApp()
  return (key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars)
}

export const DEFAULT_EMOJI: Record<ModuleId, string> = {
  today: '☀️', groceries: '🛒', tasks: '✅', calendar: '📅', budget: '💰', watch: '🍿', recipes: '🍳',
  pet: '🐶', home: '🏠', travel: '✈️', dates: '💕', inbox: '📥', archive: '🗄️', photos: '📸', cycle: '🌸',
}

/** User-chosen name/emoji for a section, falling back to the translated default. */
export function moduleLabel(s: State, id: ModuleId) {
  const m = s.modules[id]
  return { title: m?.title || translate(s.lang, `mod.${id}` as TKey), emoji: m?.emoji || DEFAULT_EMOJI[id] }
}
