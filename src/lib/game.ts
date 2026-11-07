import type { Act, Lang, Mood, State, UserId } from '../types'
import { addDays, today } from './date'
import { QUEST_TX } from './quests-i18n'
import { ITEMS } from './catalog'

/*
 * The couple's daily ritual: a shared mascot (not the real pet!) and a relationship tree that grow from things done together.
 * Gentle by design — any joint action keeps the flame, missed days are covered by freezes, a pause
 * never breaks it, levels never go down, and growth is slow enough to last for months.
 */

/** XP per kind of joint action (once per record, or once per day for everyday things). */
export const XP: Record<Act['kind'], number> = {
  quest: 5, task: 3, grocery: 2, recipe: 12, watch: 10, wish: 20, date: 15, trip: 40,
  photo: 3, music: 2, goal: 6, event: 3, checkin: 15, note: 8, blind: 25, taps: 0,
}
/** Tree growth points: real things done together count, taps and quests barely. */
const TREE: Record<Act['kind'], number> = {
  quest: 1, task: 1, grocery: 1, recipe: 3, watch: 2, wish: 4, date: 4, trip: 10,
  photo: 1, music: 1, goal: 1, event: 1, checkin: 3, note: 2, blind: 6, taps: 0,
}
export const FED_DAY_XP = 10
export const TAPS_DAY_XP = 5
export const TAP_GOAL = 30
export const FREEZES_PER_MONTH = 3

/* ---------- levels ---------- */
/** Total XP needed to reach a level: grows steeply, so level 10 takes weeks and level 30 most of a year. */
export const levelXp = (n: number) => (n <= 1 ? 0 : Math.round(40 * Math.pow(n - 1, 1.6)))
export function levelOf(xp: number) {
  let n = 1
  while (levelXp(n + 1) <= xp) n++
  return { level: n, from: levelXp(n), to: levelXp(n + 1) }
}

/** Mascot growth: a new stage every five levels. */
export const MASCOT_STAGES = [
  { from: 1, badge: '🍼', size: 64 }, { from: 5, badge: '🎒', size: 76 }, { from: 10, badge: '⭐', size: 88 },
  { from: 15, badge: '🏅', size: 98 }, { from: 20, badge: '🎓', size: 106 }, { from: 25, badge: '👑', size: 116 },
] as const
export const mascotStage = (level: number) => MASCOT_STAGES.reduce((s, x, i) => (level >= x.from ? i : s), 0)

/** Mascot kinds live in the collection (catalog.ts); which ones a couple may use is decided in unlocks.ts. */
export const mascotEmoji = (kind: string) => ITEMS[`mascot:${kind}`]?.emoji ?? '🦊'

/** The tree: twelve stages, the last ones take a year or more of life together. */
export const TREE_STAGES = [
  { at: 0, emoji: '🌰' }, { at: 8, emoji: '🌱' }, { at: 25, emoji: '🌿' }, { at: 60, emoji: '🪴' },
  { at: 120, emoji: '🌳' }, { at: 220, emoji: '🌳' }, { at: 380, emoji: '🌳' }, { at: 600, emoji: '🌸' },
  { at: 900, emoji: '🍎' }, { at: 1300, emoji: '🌳' }, { at: 1800, emoji: '🌲' }, { at: 2500, emoji: '✨' },
] as const
export function treeStage(points: number) {
  const i = TREE_STAGES.reduce((s, x, k) => (points >= x.at ? k : s), 0)
  return { index: i, next: TREE_STAGES[i + 1]?.at }
}

/* ---------- the record of joint actions ---------- */
const actId = (kind: Act['kind'], ref: string) => `act:${kind}:${ref}`

/** Note a joint action once (same kind + ref never counts twice). */
export function award(st: State, kind: Act['kind'], ref: string, date = today()) {
  const id = actId(kind, ref)
  if (st.acts.some((a) => a.id === id)) return
  st.acts.unshift({ id, kind, ref, date, createdBy: st.me, createdAt: new Date().toISOString() })
}
export function unaward(st: State, kind: Act['kind'], ref: string) {
  const id = actId(kind, ref)
  st.acts = st.acts.filter((a) => a.id !== id)
}

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]))

/**
 * Called after every local edit: spot the moments worth celebrating (a task ticked off, a recipe cooked,
 * a film watched…) and note them, wherever in the app they happened.
 */
export function deriveActs(prev: State, next: State) {
  if (!next.game?.enabled || !next.acts) return
  const d = today()
  const was = byId(prev.tasks)
  for (const k of next.tasks) if (k.done && !k.example && !was.get(k.id)?.done) award(next, 'task', `${k.id}:${d}`)
  // Repeating tasks jump to the next date instead of being "done".
  for (const k of next.tasks) { const p = was.get(k.id); if (!k.example && p && p.due && k.due && k.due > p.due && k.repeat && k.repeat !== 'none') award(next, 'task', `${k.id}:${d}`) }
  if (next.groceries.some((g) => g.done && !g.example && !prev.groceries.find((p) => p.id === g.id)?.done)) award(next, 'grocery', d)
  const recipes = byId(prev.recipes)
  for (const r of next.recipes) if (r.cooked > (recipes.get(r.id)?.cooked ?? 0)) award(next, 'recipe', `${r.id}:${d}`)
  const watch = byId(prev.watch)
  for (const w of next.watch) if (w.status === 'done' && watch.get(w.id)?.status !== 'done') award(next, 'watch', w.id)
  const wishes = byId(prev.wishes)
  for (const w of next.wishes) if (w.got && !w.example && !wishes.get(w.id)?.got) award(next, 'wish', w.id)
  const notes = byId(prev.notes)
  for (const n of next.notes) if (n.module === 'dates' && n.done && !notes.get(n.id)?.done) award(next, 'date', n.id)
  const trips = byId(prev.trips)
  for (const tr of next.trips) if (!trips.has(tr.id)) award(next, 'trip', tr.id)
  const goals = byId(prev.goals)
  for (const g of next.goals) if (g.saved > (goals.get(g.id)?.saved ?? 0)) award(next, 'goal', `${g.id}:${d}`)
  if (next.photos.length > prev.photos.length) award(next, 'photo', d)
  if (next.music.length > prev.music.length) award(next, 'music', d)
  const events = byId(prev.events)
  if (next.events.some((e) => !events.has(e.id) && e.who === 'both' && !e.source && !e.example)) award(next, 'event', d)
}

/* ---------- streak, XP, tree ---------- */
export interface Pause { from: string; to: string }

/** Days the flame rests: pauses set by hand plus every shared trip (private trips and surprises don't count,
 *  so both phones compute the same flame). */
export function pausesOf(s: Pick<State, 'game' | 'trips'>): Pause[] {
  if (s.game.tripPause === false) return s.game.pauses
  const trips = s.trips.filter((t) => t.start && t.end && !t.privateTo && !t.surpriseFor)
  return [...s.game.pauses, ...trips.map((t) => ({ from: t.start, to: t.end < t.start ? t.start : t.end }))]
}

/** Flame lengths worth a celebration. */
export const FLAME_MILESTONES = [7, 30, 100, 365]
const paused = (pauses: Pause[], d: string) => pauses.some((p) => d >= p.from && d <= p.to)

/** Love taps: each person's count for a day (stored as a 'taps' act per person and day). */
export function tapsOn(acts: Act[], d: string) {
  const of = (u: UserId) => acts.find((a) => a.kind === 'taps' && a.id === actId('taps', `${d}:${u}`))?.count ?? 0
  return { a: of('a'), j: of('j') }
}

export interface Progress {
  fed: Set<string>; frozen: Set<string>; paused: Set<string>
  streak: number; best: number; todayFed: boolean; freezesLeft: number
  xp: number; level: number; from: number; to: number
  treePoints: number; actions: number
}

export function progress(acts: Act[], pauses: Pause[], now = today()): Progress {
  const fed = new Set<string>()
  const tapDays = new Map<string, { a: number; j: number }>()
  let xp = 0, treePoints = 0, actions = 0
  for (const a of acts) {
    if (a.kind === 'taps') {
      const t = tapDays.get(a.date) ?? { a: 0, j: 0 }
      t[a.createdBy] = Math.max(t[a.createdBy], a.count ?? 0)
      tapDays.set(a.date, t)
      continue
    }
    fed.add(a.date)
    xp += XP[a.kind]
    treePoints += TREE[a.kind]
    actions++
  }
  for (const [d, t] of tapDays) if (t.a >= TAP_GOAL && t.j >= TAP_GOAL) { fed.add(d); xp += TAPS_DAY_XP }
  xp += fed.size * FED_DAY_XP

  // Walk the days from the first one with anything in it.
  const first = [...fed].sort()[0]
  const frozen = new Set<string>(), pausedDays = new Set<string>()
  let streak = 0, best = 0
  const used = new Map<string, number>()
  if (first) {
    for (let d = first; d <= now; d = addDays(d, 1)) {
      if (fed.has(d)) streak++
      else if (paused(pauses, d)) pausedDays.add(d)
      else if (d === now) { /* the day isn't over yet */ }
      else {
        const m = d.slice(0, 7)
        const n = used.get(m) ?? 0
        if (streak > 0 && n < FREEZES_PER_MONTH) { used.set(m, n + 1); frozen.add(d); streak++ }
        else streak = 0
      }
      best = Math.max(best, streak)
    }
  }
  const { level, from, to } = levelOf(xp)
  return {
    fed, frozen, paused: pausedDays, streak, best, todayFed: fed.has(now),
    freezesLeft: FREEZES_PER_MONTH - (used.get(now.slice(0, 7)) ?? 0),
    xp, level, from, to, treePoints, actions,
  }
}

/** How the mascot feels right now. */
export function mascotMood(p: Progress, pauses: Pause[], now = today()): 'happy' | 'waiting' | 'missing' | 'sleeping' | 'vacation' {
  if (paused(pauses, now)) return 'vacation'
  if (p.todayFed) return 'happy'
  const h = new Date().getHours()
  if (h >= 23 || h < 7) return 'sleeping'
  const y = addDays(now, -1)
  return p.fed.has(y) || p.frozen.has(y) || p.paused.has(y) ? 'waiting' : 'missing'
}

/* ---------- daily quests ---------- */
export interface Quest { id: string; mode: 'near' | 'far' | 'any'; ru: string; en: string }

/** Our own pool of small things to do for each other: near = together in person, far = at a distance. */
export const QUESTS: Quest[] = [
  { id: 'q1', mode: 'near', ru: 'Обнимитесь и постойте так полминуты', en: 'Hug and stay like that for half a minute' },
  { id: 'q2', mode: 'near', ru: 'Пройдитесь вместе хотя бы 20 минут', en: 'Take a walk together for at least 20 minutes' },
  { id: 'q3', mode: 'near', ru: 'Поужинайте без телефонов на столе', en: 'Have dinner with no phones on the table' },
  { id: 'q4', mode: 'near', ru: 'Приготовьте что-нибудь вдвоём у одной плиты', en: 'Cook something together at the same stove' },
  { id: 'q5', mode: 'near', ru: 'Потанцуйте под одну песню прямо дома', en: 'Dance to one song right at home' },
  { id: 'q6', mode: 'near', ru: 'Сделайте общее фото — любое', en: 'Take a photo of the two of you — any photo' },
  { id: 'q7', mode: 'near', ru: 'Сварите друг другу чай или кофе', en: 'Make each other tea or coffee' },
  { id: 'q8', mode: 'near', ru: 'Посмотрите вместе закат или вечерние огни', en: 'Watch the sunset or the city lights together' },
  { id: 'q9', mode: 'near', ru: 'Сыграйте во что-нибудь вдвоём, хоть 10 минут', en: 'Play something together, even for 10 minutes' },
  { id: 'q10', mode: 'near', ru: 'Разберите вместе один ящик или полку', en: 'Sort out one drawer or shelf together' },
  { id: 'q11', mode: 'near', ru: 'Сделайте друг другу массаж плеч', en: 'Give each other a shoulder massage' },
  { id: 'q12', mode: 'near', ru: 'Почитайте друг другу вслух пару страниц', en: 'Read a couple of pages aloud to each other' },
  { id: 'q13', mode: 'near', ru: 'Устройте мини-пикник, хоть на полу', en: 'Have a mini picnic, even on the floor' },
  { id: 'q14', mode: 'near', ru: 'Попробуйте вместе что-то новое из магазина', en: 'Try something new from the shop together' },
  { id: 'q15', mode: 'near', ru: 'Зайдите туда, где ещё не были, хоть в соседний двор', en: "Go somewhere you've never been, even the next yard" },
  { id: 'q16', mode: 'near', ru: 'Лягте спать в одно время', en: 'Go to bed at the same time' },
  { id: 'q17', mode: 'near', ru: 'Позавтракайте вместе не торопясь', en: 'Have an unhurried breakfast together' },
  { id: 'q18', mode: 'near', ru: 'Сделайте вместе зарядку или растяжку', en: 'Do a short workout or stretch together' },
  { id: 'q19', mode: 'near', ru: 'Посмотрите старые общие фото', en: 'Look through old photos of the two of you' },
  { id: 'q20', mode: 'near', ru: 'Спойте вместе, пусть и фальшиво', en: 'Sing together, even off-key' },
  { id: 'q21', mode: 'near', ru: 'Нарисуйте друг друга за две минуты', en: 'Draw each other in two minutes' },
  { id: 'q22', mode: 'near', ru: 'Выпейте кофе вне дома вдвоём', en: 'Have a coffee out, just the two of you' },
  { id: 'q23', mode: 'near', ru: 'Покатайтесь вместе на велосипедах или самокатах', en: 'Ride bikes or scooters together' },
  { id: 'q24', mode: 'near', ru: 'Застелите постель вдвоём', en: 'Make the bed together' },
  { id: 'q25', mode: 'near', ru: 'Испеките или купите что-то сладкое к чаю', en: 'Bake or buy something sweet for tea' },
  { id: 'q26', mode: 'near', ru: 'Полежите обнявшись 10 минут без экрана', en: 'Lie cuddled up for 10 minutes, no screens' },
  { id: 'q27', mode: 'near', ru: 'Поцелуй просто так, без повода', en: 'Kiss for no reason at all' },
  { id: 'q28', mode: 'near', ru: 'Устройте вечер кино с пледом', en: 'Have a movie night under a blanket' },
  { id: 'q29', mode: 'near', ru: 'Вынесите мусор вместе и прогуляйтесь до угла', en: 'Take the rubbish out together and walk to the corner' },
  { id: 'q30', mode: 'near', ru: 'Найдите вечером на небе хотя бы одну звезду', en: 'Find at least one star in the evening sky' },
  { id: 'q31', mode: 'far', ru: 'Созвонитесь по видео хотя бы на 10 минут', en: 'Video-call for at least 10 minutes' },
  { id: 'q32', mode: 'far', ru: 'Отправь фото того, что видишь прямо сейчас', en: 'Send a photo of what you see right now' },
  { id: 'q33', mode: 'far', ru: 'Запиши голосовое с чем-то тёплым', en: 'Record a voice message with something warm' },
  { id: 'q34', mode: 'far', ru: 'Посмотрите одну серию в одно время', en: 'Watch one episode at the same time' },
  { id: 'q35', mode: 'far', ru: 'Напиши «доброе утро» первым', en: 'Be the first to say good morning' },
  { id: 'q36', mode: 'far', ru: 'Закажи партнёру доставку чего-то вкусного', en: 'Order something tasty delivered to your partner' },
  { id: 'q37', mode: 'far', ru: 'Договоритесь, когда увидитесь и чем займётесь', en: "Agree when you'll meet and what you'll do" },
  { id: 'q38', mode: 'far', ru: 'Поделись песней, которая сейчас крутится в голове', en: "Share the song that's stuck in your head" },
  { id: 'q39', mode: 'far', ru: 'Сыграйте вместе в онлайн-игру или викторину', en: 'Play an online game or quiz together' },
  { id: 'q40', mode: 'far', ru: 'Посмотрите на небо в одно время и напишите, что видите', en: 'Look at the sky at the same time and describe it' },
  { id: 'q41', mode: 'far', ru: 'Напиши три причины, почему рад(а), что вы вместе', en: "Write three reasons you're glad you're together" },
  { id: 'q42', mode: 'far', ru: 'Вспомните в переписке ваше любимое общее воспоминание', en: 'Recall your favourite shared memory in chat' },
  { id: 'q43', mode: 'any', ru: 'Скажи вслух, за что благодарен(на) сегодня', en: "Say out loud what you're grateful for today" },
  { id: 'q44', mode: 'any', ru: 'Сделай искренний комплимент', en: 'Give a sincere compliment' },
  { id: 'q45', mode: 'any', ru: 'Спроси, как прошёл день, и просто выслушай', en: 'Ask how the day went and just listen' },
  { id: 'q46', mode: 'any', ru: 'Скажи «я тебя люблю» без повода', en: 'Say "I love you" for no reason' },
  { id: 'q47', mode: 'any', ru: 'Расскажи о самом приятном моменте дня', en: 'Tell the nicest moment of your day' },
  { id: 'q48', mode: 'any', ru: 'Обсудите планы на выходные', en: 'Talk about your plans for the weekend' },
  { id: 'q49', mode: 'any', ru: 'Задайте друг другу вопрос, который ещё не задавали', en: "Ask each other a question you've never asked" },
  { id: 'q50', mode: 'any', ru: 'Расскажите друг другу по истории из детства', en: 'Tell each other a story from childhood' },
  { id: 'q51', mode: 'any', ru: 'Вспомните ваше первое свидание в деталях', en: 'Recall your first date in detail' },
  { id: 'q52', mode: 'any', ru: 'Назовите по три вещи, которые цените друг в друге', en: 'Name three things you value in each other' },
  { id: 'q53', mode: 'any', ru: 'Поделись маленькой мечтой, о которой партнёр не знает', en: "Share a small dream your partner doesn't know about" },
  { id: 'q54', mode: 'any', ru: 'Спроси, что сделало бы день партнёра лучше, — и сделай', en: "Ask what would make your partner's day better — and do it" },
  { id: 'q55', mode: 'any', ru: 'Проведите вечер без жалоб и критики', en: 'Spend an evening without complaints or criticism' },
  { id: 'q56', mode: 'any', ru: 'Выслушай 10 минут, не перебивая и не советуя', en: 'Listen for 10 minutes without interrupting or advising' },
  { id: 'q57', mode: 'any', ru: 'Соберите общий плейлист хотя бы из пяти песен', en: 'Build a shared playlist of at least five songs' },
  { id: 'q58', mode: 'any', ru: 'Возьми на себя дело, которое обычно делает партнёр', en: 'Take on a chore your partner usually does' },
  { id: 'q59', mode: 'any', ru: 'Запланируйте следующее свидание', en: 'Plan your next date' },
  { id: 'q60', mode: 'any', ru: 'Научите друг друга чему-нибудь за 10 минут', en: 'Teach each other something in 10 minutes' },
  { id: 'q61', mode: 'any', ru: 'Скажи о партнёре что-то хорошее кому-то ещё', en: 'Say something nice about your partner to someone else' },
  { id: 'q62', mode: 'any', ru: 'Оставь записку в неожиданном месте', en: 'Leave a note somewhere unexpected' },
  { id: 'q63', mode: 'any', ru: 'Отложите немного в общую копилку', en: 'Put a little into a shared savings goal' },
  { id: 'q64', mode: 'any', ru: 'Добавьте друг другу по желанию в вишлист', en: 'Add a wish to each other’s wishlist' },
  { id: 'q65', mode: 'any', ru: 'Помоги с мелочью, которую партнёр давно откладывает', en: "Help with a small thing your partner keeps putting off" },
  { id: 'q66', mode: 'any', ru: 'Найдите смешное видео и посмейтесь вместе', en: 'Find a funny video and laugh together' },
  { id: 'q67', mode: 'any', ru: 'Придумайте пункт в общий список «когда-нибудь»', en: 'Add one item to your shared "someday" list' },
  { id: 'q68', mode: 'any', ru: 'Выберите вместе место для будущей поездки', en: 'Choose a place for a future trip together' },
  { id: 'q69', mode: 'any', ru: 'Спроси, чем можешь помочь сегодня', en: 'Ask how you can help today' },
  { id: 'q70', mode: 'any', ru: 'Поблагодари за что-то конкретное из сегодняшнего', en: 'Say thanks for something specific from today' },
  { id: 'q71', mode: 'any', ru: 'Похвали за мелочь, которую обычно не замечают', en: 'Praise a small thing that usually goes unnoticed' },
  { id: 'q72', mode: 'any', ru: 'Задайте друг другу по вопросу «а что, если…»', en: 'Ask each other one "what if…" question' },
  { id: 'q73', mode: 'any', ru: 'Проверьте, хорошо ли знаете друг друга: 5 вопросов о любимом', en: 'Quiz each other: five questions about favourite things' },
  { id: 'q74', mode: 'any', ru: 'Напиши тёплое сообщение просто так', en: 'Send a warm message for no reason' },
  { id: 'q75', mode: 'any', ru: 'Пожелай удачи перед чем-то важным', en: 'Wish good luck before something important' },
  { id: 'q76', mode: 'far', ru: 'Отправь фото своего завтрака', en: 'Send a photo of your breakfast' },
  { id: 'q77', mode: 'far', ru: 'Посмотрите один и тот же фильм и обсудите его', en: 'Watch the same film and talk it over' },
  { id: 'q78', mode: 'far', ru: 'Созвонитесь перед сном хотя бы на 5 минут', en: 'Call before bed, even for 5 minutes' },
  { id: 'q79', mode: 'far', ru: 'Пришли фото места, которое напоминает о партнёре', en: 'Send a photo of a place that reminds you of your partner' },
  { id: 'q80', mode: 'far', ru: 'Прочитайте одну и ту же статью и обменяйтесь мнениями', en: 'Read the same article and swap thoughts' },
  { id: 'q81', mode: 'far', ru: 'Запиши видео-«привет» на 15 секунд', en: 'Record a 15-second video hello' },
  { id: 'q82', mode: 'far', ru: 'Приготовьте одно блюдо одновременно по видеосвязи', en: 'Cook the same dish at the same time on a video call' },
  { id: 'q83', mode: 'far', ru: 'Расскажи, что сегодня тебя рассмешило', en: 'Tell what made you laugh today' },
  { id: 'q84', mode: 'far', ru: 'Распишите вместе план следующей встречи по часам', en: 'Plan your next meeting together hour by hour' },
  { id: 'q85', mode: 'far', ru: 'Отправь песню, которая напоминает о вас', en: 'Send a song that reminds you of the two of you' },
  { id: 'q86', mode: 'far', ru: 'Сыграйте в «20 вопросов» в переписке', en: 'Play «20 questions» by message' },
  { id: 'q87', mode: 'far', ru: 'Сделайте одинаковые селфи в одной позе', en: 'Take matching selfies in the same pose' },
  { id: 'q88', mode: 'far', ru: 'Пожелай доброй ночи голосовым', en: 'Say good night in a voice message' },
  { id: 'q89', mode: 'far', ru: 'Закажите друг другу по маленькому сюрпризу онлайн', en: 'Order each other a small surprise online' },
  { id: 'q90', mode: 'far', ru: 'Посчитайте дни до встречи и придумайте, как её отметить', en: 'Count the days until you meet and plan how to celebrate' },
  { id: 'q91', mode: 'far', ru: 'Напиши, что первым делом сделаешь, когда увидитесь', en: 'Write the first thing you will do when you meet' },
  { id: 'q92', mode: 'far', ru: 'Погуляйте одновременно, каждый у себя, на связи', en: 'Go for a walk at the same time, each where you are, on a call' },
  { id: 'q93', mode: 'far', ru: 'Поделись тем, что сейчас читаешь, смотришь или слушаешь', en: "Share what you're reading, watching or listening to" },
  { id: 'q94', mode: 'near', ru: 'Разберите холодильник и придумайте ужин из того, что есть', en: "Go through the fridge and make dinner from what's there" },
  { id: 'q95', mode: 'near', ru: 'Сходите вместе за продуктами на неделю', en: 'Do the weekly grocery shop together' },
  { id: 'q96', mode: 'near', ru: 'Повесьте или переставьте что-нибудь дома вдвоём', en: 'Hang or rearrange something at home together' },
  { id: 'q97', mode: 'near', ru: 'Полейте цветы и протрите пыль вдвоём', en: 'Water the plants and dust together' },
  { id: 'q98', mode: 'near', ru: 'Устройте домашний спа-вечер: маски, музыка, чай', en: 'Have a home spa evening: face masks, music, tea' },
  { id: 'q99', mode: 'near', ru: 'Испеките что-нибудь простое по новому рецепту', en: 'Bake something simple from a new recipe' },
  { id: 'q100', mode: 'near', ru: 'Сыграйте в настольную игру', en: 'Play a board game' },
  { id: 'q101', mode: 'near', ru: 'Сходите на фотопрогулку — по 10 кадров каждый', en: 'Go on a photo walk — 10 shots each' },
  { id: 'q102', mode: 'near', ru: 'Поужинайте при свечах, пусть даже макаронами', en: "Have dinner by candlelight, even if it's pasta" },
  { id: 'q103', mode: 'near', ru: 'Погладьте бельё вдвоём под подкаст', en: 'Do the ironing together with a podcast on' },
  { id: 'q104', mode: 'near', ru: 'Посадите что-нибудь: зелень на подоконнике или цветок', en: 'Plant something: herbs on the windowsill or a flower' },
  { id: 'q105', mode: 'near', ru: 'Помойте посуду вместе и поболтайте', en: 'Wash up together and chat' },
  { id: 'q106', mode: 'any', ru: 'Вспомните, за что вы друг друга полюбили', en: 'Remember why you fell for each other' },
  { id: 'q107', mode: 'any', ru: 'Расскажите, какими видите себя через 5 лет', en: 'Tell each other how you see yourselves in 5 years' },
  { id: 'q108', mode: 'any', ru: 'Составьте список «10 мест, куда хотим поехать»', en: 'Make a list of «10 places we want to go»' },
  { id: 'q109', mode: 'any', ru: 'Обсудите один денежный вопрос спокойно и без упрёков', en: 'Talk calmly about one money question, no blame' },
  { id: 'q110', mode: 'any', ru: 'Поделитесь тем, что вас сейчас тревожит', en: "Share what's worrying you right now" },
  { id: 'q111', mode: 'any', ru: 'Скажи, что тебе больше всего нравится в вашем доме', en: 'Say what you love most about your home' },
  { id: 'q112', mode: 'any', ru: 'Придумайте название для вашей пары', en: 'Come up with a name for your couple' },
  { id: 'q113', mode: 'any', ru: 'Напишите друг другу по короткой записке на завтра', en: 'Write each other a short note for tomorrow' },
  { id: 'q114', mode: 'any', ru: 'Вспомните самое смешное, что с вами случалось', en: 'Recall the funniest thing that ever happened to you two' },
  { id: 'q115', mode: 'any', ru: 'Выберите фильм на выходные', en: 'Pick a film for the weekend' },
  { id: 'q116', mode: 'any', ru: 'Расскажите о человеке, который вас вдохновляет', en: 'Tell each other about someone who inspires you' },
  { id: 'q117', mode: 'any', ru: 'Попросите друг у друга совета в какой-нибудь мелочи', en: "Ask each other's advice on something small" },
  { id: 'q118', mode: 'any', ru: 'Назовите одну привычку, которую хотите завести вместе', en: "Name one habit you'd like to start together" },
  { id: 'q119', mode: 'any', ru: 'Поблагодари за то, что обычно кажется само собой разумеющимся', en: 'Say thanks for something usually taken for granted' },
  { id: 'q120', mode: 'any', ru: 'Скажите, где прямо сейчас хотели бы оказаться вдвоём', en: "Say where you'd love to be together right now" },
]

const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0 }

/** Today's three quests: the same on both phones, a fresh set every day, shuffled again on request. */
export function questsFor(date: string, mode: 'near' | 'far' | 'all', shuffle = 0, count = 3): Quest[] {
  const pool = QUESTS.filter((q) => mode === 'all' || q.mode === mode || q.mode === 'any')
  const picked: Quest[] = []
  let h = hash(`${date}#${shuffle}`)
  while (picked.length < Math.min(count, pool.length)) {
    const q = pool[h % pool.length]
    if (!picked.includes(q)) picked.push(q)
    h = hash(String(h))
  }
  return picked
}
export const questText = (q: Quest, lang: Lang) =>
  lang === 'ru' ? q.ru : lang === 'en' ? q.en : QUEST_TX[lang][Number(q.id.slice(1)) - 1] ?? q.en

/* ---------- mood ---------- */
export const MOODS = [
  { value: 5, emoji: '🤩' }, { value: 4, emoji: '🙂' }, { value: 3, emoji: '😐' }, { value: 2, emoji: '😔' }, { value: 1, emoji: '😣' },
] as const
export const moodEmoji = (v?: number) => MOODS.find((m) => m.value === v)?.emoji
/** Each person's latest mood today. */
export const moodOf = (moods: Mood[], u: UserId, d = today()) =>
  moods.filter((m) => m.createdBy === u && m.date === d).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
