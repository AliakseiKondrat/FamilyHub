import type { Lang } from '../types'
import { CULTURES, culturePalette, mix } from './cultures'

/*
 * The collection: everything that makes the app look like "ours" — themes, atmospheres, the couple's mascot,
 * its scene, postcards for love notes and savings goal designs. Our own set and names (the idea of selling looks
 * comes from Ottership; nothing else does).
 *
 * Who gets what is decided by the household's access tier (see unlocks.ts):
 *   dev    — the developers' couple: everything is open, they tune the rules below in the developer panel;
 *   close  — close couples: an item opens by itself once the couple reaches its usage threshold, or invites `refs` couples;
 *   public — everyone else: the item is bought once for both (Telegram Stars) or gifted by the partner.
 * Items without a rule are free for everyone.
 */

export type Tier = 'dev' | 'close' | 'public'
export type Kind = 'theme' | 'atmo' | 'mascot' | 'scene' | 'card' | 'piggy'
export const KINDS: Kind[] = ['theme', 'atmo', 'mascot', 'scene', 'card', 'piggy']
/**
 * What a close couple's threshold counts: couple level, best flame (days), joint actions, days with the flame, daily quests
 * done, passport stamps from the «Around the world» marathon. 'event' items are only earned through the marathon
 * (or bought by everyone else), never by a threshold.
 */
export type Metric = 'level' | 'flame' | 'acts' | 'days' | 'quests' | 'stamps' | 'event'
export const METRICS: Metric[] = ['level', 'flame', 'acts', 'days', 'quests', 'stamps', 'event']
export interface Rule { m: Metric; n: number; refs?: number; price: number }

export interface Item { id: string; kind: Kind; key: string; emoji: string; name: Record<Lang, string>; rule?: Rule }

const N = (ru: string, en: string, pl: string, es: string, it: string): Record<Lang, string> => ({ ru, en, pl, es, it })
const R = (m: Metric, n: number, price: number, refs?: number): Rule => ({ m, n, price, ...(refs ? { refs } : {}) })
/** Earned only in the marathon (or bought by everyone else). */
const EV: Rule = { m: 'event', n: 0, price: 150 }

/* ---------- looks: themes and atmospheres ---------- */
/** [background, card, pressed card, tint for buttons and links] */
type Pal = [string, string, string, string]
export interface Look {
  light: Pal; dark: Pal
  /** One gradient for every section header (the classic theme keeps each section's own colours). */
  headers?: [string, string]
  /** A wallpaper behind the screens: [light, dark] CSS backgrounds. */
  wall?: [string, string]
  /** Atmospheres: what drifts through the air, the mascot's scene and the couple card's decoration. */
  ambient?: { glyphs: string[]; motion: 'fall' | 'rise' | 'float' | 'streak'; color?: string; glow?: string; count?: number }
  scene?: string
  decor?: string
}

const STARS_DARK = 'radial-gradient(1.5px 1.5px at 12% 18%, #fff, transparent), radial-gradient(1px 1px at 32% 42%, #fff, transparent), '
  + 'radial-gradient(1.5px 1.5px at 58% 12%, #e0e7ff, transparent), radial-gradient(1px 1px at 76% 34%, #fff, transparent), '
  + 'radial-gradient(1.5px 1.5px at 88% 8%, #fff, transparent), radial-gradient(1px 1px at 22% 66%, #c7d2fe, transparent), '
  + 'radial-gradient(1px 1px at 68% 72%, #fff, transparent), radial-gradient(1.5px 1.5px at 92% 58%, #fff, transparent)'

export const LOOKS: Record<string, Look> = {
  classic: { light: ['', '', '', ''], dark: ['', '', '', ''] },
  paper: { light: ['#f4efe6', '#fffdf8', '#ece5d8', '#b4532a'], dark: ['#1a1714', '#24201b', '#322c25', '#e0895a'], headers: ['#8a5a3b', '#d4a373'] },
  mint: { light: ['#e9f5ef', '#ffffff', '#d9ede3', '#0f9d76'], dark: ['#07130f', '#10201a', '#1a2f27', '#34d399'], headers: ['#047857', '#5eead4'] },
  dusk: { light: ['#eeeef9', '#ffffff', '#e1e1f3', '#5b5bd6'], dark: ['#0b0b1a', '#15152a', '#212140', '#8b8bff'], headers: ['#3730a3', '#c026d3'] },
  latte: { light: ['#f3ebe2', '#fffaf4', '#e9ddcf', '#8b5e3c'], dark: ['#15100c', '#211913', '#2e241c', '#d4a574'], headers: ['#6f4e37', '#c8a27a'] },
  sea: { light: ['#e8f4f8', '#ffffff', '#d6ebf2', '#0284c7'], dark: ['#04121a', '#0b1f2a', '#12303f', '#38bdf8'], headers: ['#0369a1', '#2dd4bf'] },
  berry: { light: ['#f8ecf1', '#ffffff', '#efd9e3', '#be185d'], dark: ['#16070d', '#241019', '#341826', '#f472b6'], headers: ['#9d174d', '#a855f7'] },
  forest: { light: ['#eaf0e8', '#fbfdfa', '#dbe6d8', '#2f6b3a'], dark: ['#08110a', '#111d13', '#1b2c1e', '#6fcf7f'], headers: ['#14532d', '#65a30d'] },
  sunrise: {
    light: ['#fdf0ea', '#ffffff', '#f8dfd3', '#ea580c'], dark: ['#170c08', '#241510', '#352018', '#fb923c'], headers: ['#f97316', '#ec4899'],
    wall: ['linear-gradient(180deg, #fde3d6 0%, #fdf0ea 45%)', 'linear-gradient(180deg, #2c1209 0%, #170c08 45%)'],
  },
  noir: { light: ['#f1efe9', '#ffffff', '#e6e2d6', '#a16207'], dark: ['#000000', '#0f0f0f', '#1d1d1d', '#d4af37'], headers: ['#0a0a0a', '#52525b'] },
  aurora: {
    light: ['#edf3f5', '#ffffff', '#dde8ec', '#0d9488'], dark: ['#050b14', '#0d1624', '#18233a', '#5eead4'], headers: ['#0f766e', '#7c3aed'],
    wall: [
      'radial-gradient(120% 50% at 15% 0%, rgba(45, 212, 191, 0.22), transparent 60%), radial-gradient(90% 45% at 95% 5%, rgba(168, 85, 247, 0.2), transparent 60%), #edf3f5',
      'radial-gradient(120% 55% at 15% 0%, rgba(45, 212, 191, 0.35), transparent 60%), radial-gradient(90% 50% at 95% 5%, rgba(168, 85, 247, 0.35), transparent 60%), #050b14',
    ],
  },
  cosmos: {
    light: ['#eeecf8', '#ffffff', '#e0dcf2', '#7c3aed'], dark: ['#04030c', '#0f0d1f', '#1b1834', '#a78bfa'], headers: ['#1e1b4b', '#7c3aed'],
    wall: [
      'radial-gradient(100% 50% at 80% 0%, rgba(124, 58, 237, 0.16), transparent 60%), #eeecf8',
      `${STARS_DARK}, radial-gradient(120% 60% at 80% 0%, rgba(124, 58, 237, 0.35), transparent 60%), #04030c`,
    ],
  },
  gold: {
    light: ['#f7f1e3', '#fffcf3', '#eee3c8', '#a67c00'], dark: ['#0c0a05', '#1a160c', '#2a2414', '#e6c35c'], headers: ['#8a6d1d', '#e6c35c'],
    wall: [
      'radial-gradient(100% 45% at 50% 0%, rgba(230, 195, 92, 0.28), transparent 65%), #f7f1e3',
      'radial-gradient(100% 45% at 50% 0%, rgba(230, 195, 92, 0.22), transparent 65%), #0c0a05',
    ],
  },
  // Atmospheres
  snow: {
    light: ['#eef4fa', '#ffffff', '#dce8f4', '#2563eb'], dark: ['#060b14', '#0f1828', '#1a263b', '#93c5fd'], headers: ['#1e3a8a', '#60a5fa'],
    ambient: { glyphs: ['❄', '❅', '❆'], motion: 'fall', color: '#93c5fd' }, scene: 'cabin', decor: '❄️',
  },
  sakura: {
    light: ['#fbf0f3', '#ffffff', '#f4dde5', '#db2777'], dark: ['#160a0f', '#241319', '#341c25', '#f9a8d4'], headers: ['#be185d', '#f9a8d4'],
    ambient: { glyphs: ['🌸'], motion: 'fall', count: 12 }, scene: 'garden', decor: '🌸',
  },
  leaves: {
    light: ['#f8efe2', '#fffaf2', '#eedfc6', '#c2410c'], dark: ['#140c05', '#22160b', '#322112', '#fb923c'], headers: ['#9a3412', '#eab308'],
    ambient: { glyphs: ['🍂', '🍁'], motion: 'fall', count: 10 }, scene: 'campfire', decor: '🍁',
  },
  fireflies: {
    light: ['#eef3e6', '#ffffff', '#dfe8d1', '#65a30d'], dark: ['#050a06', '#0e1710', '#18251a', '#facc15'], headers: ['#1a2e05', '#ca8a04'],
    ambient: { glyphs: ['●'], motion: 'float', color: '#facc15', glow: '#fde047', count: 18 }, scene: 'mountains', decor: '✨',
  },
  valentine: {
    light: ['#fdeef2', '#ffffff', '#f7dae3', '#e11d48'], dark: ['#17070b', '#261017', '#381823', '#fb7185'], headers: ['#be123c', '#f472b6'],
    ambient: { glyphs: ['💗', '💕'], motion: 'rise', count: 10 }, scene: 'cafe', decor: '💌',
  },
  starfall: {
    light: ['#eef0fb', '#ffffff', '#dfe3f6', '#4f46e5'], dark: ['#03040d', '#0c0f22', '#171b36', '#fde68a'], headers: ['#0f172a', '#6366f1'],
    wall: ['radial-gradient(100% 50% at 50% 0%, rgba(99, 102, 241, 0.16), transparent 60%), #eef0fb', `${STARS_DARK}, #03040d`],
    ambient: { glyphs: ['✦'], motion: 'streak', color: '#fde68a', glow: '#fef3c7', count: 8 }, scene: 'space', decor: '🌠',
  },
}

/* ---------- the mascot's scene ---------- */
/** A background plus a few emoji placed around the mascot: [glyph, left %, top %, size px]. */
export interface Scene { bg?: string; deco?: [string, number, number, number][] }
export const SCENES: Record<string, Scene> = {
  none: {},
  morning: { bg: 'linear-gradient(180deg, #fff7d6, #ffd9b8)' },
  mint: { bg: 'linear-gradient(180deg, #dcfce7, #a7f3d0)' },
  lavender: { bg: 'linear-gradient(180deg, #ede9fe, #c4b5fd)' },
  caramel: { bg: 'linear-gradient(180deg, #fde68a, #d97706)' },
  deepsea: { bg: 'linear-gradient(180deg, #0ea5e9, #1e3a8a)', deco: [['🫧', 12, 20, 18], ['🫧', 82, 60, 14]] },
  glow: { bg: 'radial-gradient(circle at 50% 45%, #fef9c3, #f9a8d4 55%, #a78bfa)' },
  campfire: { bg: 'linear-gradient(180deg, #1e1b4b, #7c2d12)', deco: [['🌲', 4, 38, 34], ['🌲', 80, 30, 38], ['🔥', 74, 76, 22], ['⭐', 20, 8, 12], ['⭐', 64, 10, 10]] },
  beach: { bg: 'linear-gradient(180deg, #7dd3fc 0%, #bae6fd 58%, #fde68a 59%, #fcd34d 100%)', deco: [['☀️', 80, 6, 26], ['🌴', 2, 34, 42], ['🐚', 82, 80, 18]] },
  mountains: { bg: 'linear-gradient(180deg, #93c5fd, #e0f2fe)', deco: [['🏔️', 2, 52, 42], ['🏔️', 74, 46, 48], ['☁️', 38, 6, 22]] },
  cafe: { bg: 'linear-gradient(180deg, #78350f, #d6a77a)', deco: [['☕', 8, 74, 24], ['🥐', 80, 76, 24], ['🪴', 82, 14, 24]] },
  garden: { bg: 'linear-gradient(180deg, #bbf7d0, #86efac)', deco: [['🌷', 6, 76, 22], ['🌼', 82, 78, 22], ['🦋', 74, 12, 20], ['🌸', 14, 14, 18]] },
  cabin: { bg: 'linear-gradient(180deg, #1e3a8a, #93c5fd)', deco: [['🏡', 2, 60, 36], ['❄️', 78, 10, 18], ['❄️', 30, 6, 14], ['🌲', 82, 58, 32]] },
  city: { bg: 'linear-gradient(180deg, #0f172a, #4c1d95)', deco: [['🌃', 2, 64, 36], ['🌙', 80, 6, 22], ['✨', 30, 12, 14]] },
  space: { bg: 'radial-gradient(circle at 70% 30%, #4c1d95, #020617 70%)', deco: [['🪐', 76, 10, 28], ['⭐', 14, 14, 12], ['🌍', 4, 68, 26], ['✨', 60, 80, 14]] },
  globe: { bg: 'radial-gradient(circle at 50% 120%, #22c55e, #0ea5e9 45%, #1e3a8a)', deco: [['✈️', 72, 10, 22], ['🗺️', 4, 70, 30], ['🌍', 78, 66, 30]] },
}

/* ---------- postcards for love notes ---------- */
export interface Card { bg: string; ink: string; frame?: string; serif?: boolean; edge?: string }
export const CARDS: Record<string, Card> = {
  plain: { bg: '#ffffff', ink: '#1f2937' },
  kraft: { bg: 'linear-gradient(135deg, #d9bd92, #c49a64)', ink: '#3b2a14', serif: true },
  hearts: { bg: 'radial-gradient(circle at 15% 20%, #ffd1dc 0 10%, transparent 11%), radial-gradient(circle at 85% 80%, #ffd1dc 0 12%, transparent 13%), #fff1f5', ink: '#9d174d', frame: '💗' },
  bloom: { bg: 'linear-gradient(160deg, #fef3c7, #fce7f3)', ink: '#7c2d12', frame: '💐', serif: true },
  night: { bg: `${STARS_DARK}, linear-gradient(160deg, #1e1b4b, #0f172a)`, ink: '#e0e7ff', frame: '🌙' },
  retro: { bg: '#fdf6e3', ink: '#374151', frame: '✉️', serif: true, edge: 'repeating-linear-gradient(135deg, #ef4444 0 10px, #fdf6e3 10px 20px, #3b82f6 20px 30px, #fdf6e3 30px 40px)' },
  watercolor: { bg: 'radial-gradient(circle at 25% 25%, #bae6fd, transparent 45%), radial-gradient(circle at 75% 75%, #fbcfe8, transparent 45%), radial-gradient(circle at 80% 20%, #fde68a, transparent 35%), #ffffff', ink: '#334155', frame: '🎨' },
  goldfoil: { bg: 'linear-gradient(135deg, #111827, #1f2937)', ink: '#f5d77a', frame: '✨', serif: true, edge: 'linear-gradient(135deg, #b8860b, #f5d77a, #b8860b)' },
  // The marathon: a postcard for each month of quests, and the passport for 39 weeks in a row.
  m01: { bg: 'radial-gradient(circle at 20% 20%, #ffffff 0 8%, transparent 9%), radial-gradient(circle at 80% 70%, #e0f2fe 0 12%, transparent 13%), linear-gradient(160deg, #dbeafe, #eff6ff)', ink: '#1e3a8a', frame: '❄️' },
  m02: { bg: 'repeating-linear-gradient(45deg, #fce7f3 0 12px, #fbcfe8 12px 24px)', ink: '#9d174d', frame: '🧤' },
  m03: { bg: 'radial-gradient(circle at 85% 15%, #ffffff 0 10%, transparent 11%), linear-gradient(180deg, #f0fdf4, #bbf7d0)', ink: '#166534', frame: '🌱' },
  m04: { bg: 'radial-gradient(circle at 30% 0%, #bae6fd, transparent 60%), linear-gradient(180deg, #f0f9ff, #e0f2fe)', ink: '#075985', frame: '💧' },
  m05: { bg: 'radial-gradient(circle at 75% 25%, #ddd6fe 0 18%, transparent 19%), radial-gradient(circle at 20% 80%, #e9d5ff 0 14%, transparent 15%), #faf5ff', ink: '#6b21a8', frame: '💜' },
  m06: { bg: 'linear-gradient(180deg, #e0e7ff, #fdf4ff 60%, #fef3c7)', ink: '#3730a3', frame: '🌙', serif: true },
  m07: { bg: 'radial-gradient(circle at 15% 25%, #fecaca 0 7%, transparent 8%), radial-gradient(circle at 70% 60%, #fecaca 0 6%, transparent 7%), radial-gradient(circle at 40% 85%, #fecaca 0 5%, transparent 6%), #fff1f2', ink: '#9f1239', frame: '🍓' },
  m08: { bg: `${STARS_DARK}, linear-gradient(160deg, #0f172a, #312e81)`, ink: '#fef3c7', frame: '🌠' },
  m09: { bg: 'linear-gradient(135deg, #fef9c3, #fde68a 60%, #fca5a5)', ink: '#7c2d12', frame: '🍎', serif: true },
  m10: { bg: 'linear-gradient(160deg, #fed7aa, #fdba74 50%, #fb923c)', ink: '#7c2d12', frame: '🍁' },
  m11: { bg: 'repeating-linear-gradient(0deg, rgba(124, 45, 18, 0.35) 0 2px, transparent 2px 22px), repeating-linear-gradient(90deg, rgba(124, 45, 18, 0.35) 0 2px, transparent 2px 22px), #fde68a', ink: '#451a03', frame: '☕', serif: true },
  m12: { bg: 'radial-gradient(circle at 10% 15%, #fde047 0 3%, transparent 4%), radial-gradient(circle at 30% 10%, #f87171 0 3%, transparent 4%), radial-gradient(circle at 50% 16%, #4ade80 0 3%, transparent 4%), radial-gradient(circle at 70% 9%, #60a5fa 0 3%, transparent 4%), radial-gradient(circle at 90% 15%, #f472b6 0 3%, transparent 4%), linear-gradient(180deg, #1e293b, #0f172a)', ink: '#f8fafc', frame: '✨' },
  passport: { bg: 'repeating-linear-gradient(0deg, transparent 0 22px, rgba(30, 58, 138, 0.08) 22px 23px), #f5f0e1', ink: '#1e3a8a', frame: '🛂', serif: true, edge: 'repeating-linear-gradient(90deg, #1e3a8a 0 8px, #f5f0e1 8px 12px)' },
}

/* ---------- savings goal designs ---------- */
/** The emoji rides along the progress bar; the bar takes the fill colours. */
export const PIGGIES: Record<string, { emoji: string; fill: [string, string] }> = {
  classic: { emoji: '', fill: ['#34d399', '#16a34a'] },
  piggy: { emoji: '🐷', fill: ['#f9a8d4', '#ec4899'] },
  jar: { emoji: '🫙', fill: ['#fcd34d', '#f59e0b'] },
  amphora: { emoji: '🏺', fill: ['#fdba74', '#c2410c'] },
  rocket: { emoji: '🚀', fill: ['#60a5fa', '#7c3aed'] },
  moneytree: { emoji: '🌳', fill: ['#86efac', '#15803d'] },
  hoard: { emoji: '🐉', fill: ['#fde68a', '#b45309'] },
  suitcase: { emoji: '🧳', fill: ['#fcd34d', '#b45309'] },
}

/* ---------- the catalog ---------- */
const item = (kind: Kind, key: string, emoji: string, name: Record<Lang, string>, rule?: Rule): Item => ({ id: `${kind}:${key}`, kind, key, emoji, name, rule })

export const CATALOG: Item[] = [
  // Themes — colours of the whole app, each person picks their own.
  item('theme', 'classic', '🎨', N('Классика', 'Classic', 'Klasyka', 'Clásico', 'Classico')),
  item('theme', 'paper', '📜', N('Бумага', 'Paper', 'Papier', 'Papel', 'Carta')),
  item('theme', 'mint', '🍃', N('Мятный чай', 'Mint tea', 'Herbata miętowa', 'Té de menta', 'Tè alla menta')),
  item('theme', 'dusk', '🌆', N('Сумерки', 'Dusk', 'Zmierzch', 'Crepúsculo', 'Crepuscolo'), R('level', 8, 120)),
  item('theme', 'latte', '☕', N('Латте', 'Latte', 'Latte', 'Latte', 'Latte'), R('flame', 7, 120)),
  item('theme', 'sea', '🌊', N('Морской бриз', 'Sea breeze', 'Morska bryza', 'Brisa marina', 'Brezza marina'), R('acts', 100, 150)),
  item('theme', 'berry', '🫐', N('Ягодный морс', 'Berry punch', 'Owocowy poncz', 'Ponche de frutos rojos', 'Frutti di bosco'), R('level', 22, 150)),
  item('theme', 'forest', '🌲', N('Хвойный лес', 'Pine forest', 'Las sosnowy', 'Pinar', 'Pineta'), R('flame', 30, 180)),
  item('theme', 'sunrise', '🌅', N('Рассвет', 'Sunrise', 'Wschód słońca', 'Amanecer', 'Alba'), R('level', 38, 200)),
  item('theme', 'noir', '🖤', N('Нуар', 'Noir', 'Noir', 'Noir', 'Noir'), R('flame', 60, 250)),
  item('theme', 'aurora', '🌌', N('Северное сияние', 'Northern lights', 'Zorza polarna', 'Aurora boreal', 'Aurora boreale'), R('level', 65, 300, 2)),
  item('theme', 'cosmos', '🪐', N('Космос', 'Cosmos', 'Kosmos', 'Cosmos', 'Cosmo'), R('days', 365, 400, 3)),
  item('theme', 'gold', '👑', N('Золотая пара', 'Golden couple', 'Złota para', 'Pareja de oro', "Coppia d'oro"), R('level', 95, 500, 5)),
  // Atmospheres — a theme plus things drifting in the air, a scene for the mascot and a touch on the couple card.
  item('atmo', 'snow', '❄️', N('Первый снег', 'First snow', 'Pierwszy śnieg', 'Primera nevada', 'Prima neve'), R('flame', 14, 200)),
  item('atmo', 'sakura', '🌸', N('Сакура', 'Sakura', 'Sakura', 'Sakura', 'Sakura'), R('level', 28, 200)),
  item('atmo', 'leaves', '🍁', N('Медовая осень', 'Honey autumn', 'Miodowa jesień', 'Otoño de miel', 'Autunno di miele'), R('acts', 500, 250)),
  item('atmo', 'fireflies', '✨', N('Светлячки', 'Fireflies', 'Świetliki', 'Luciérnagas', 'Lucciole'), R('flame', 45, 250)),
  item('atmo', 'valentine', '💌', N('Валентинка', 'Valentine', 'Walentynka', 'San Valentín', 'San Valentino'), R('level', 48, 300, 2)),
  item('atmo', 'starfall', '🌠', N('Звездопад', 'Starfall', 'Deszcz gwiazd', 'Lluvia de estrellas', 'Pioggia di stelle'), R('level', 95, 600, 5)),
  // Mascots — shared by the couple.
  item('mascot', 'fox', '🦊', N('Лиса', 'Fox', 'Lis', 'Zorro', 'Volpe')),
  item('mascot', 'cat', '🐱', N('Кот', 'Cat', 'Kot', 'Gato', 'Gatto')),
  item('mascot', 'dog', '🐶', N('Пёс', 'Dog', 'Pies', 'Perro', 'Cane')),
  item('mascot', 'rabbit', '🐰', N('Кролик', 'Bunny', 'Królik', 'Conejo', 'Coniglio')),
  item('mascot', 'bear', '🐻', N('Медведь', 'Bear', 'Miś', 'Oso', 'Orso')),
  item('mascot', 'panda', '🐼', N('Панда', 'Panda', 'Panda', 'Panda', 'Panda')),
  item('mascot', 'penguin', '🐧', N('Пингвин', 'Penguin', 'Pingwin', 'Pingüino', 'Pinguino')),
  item('mascot', 'hedgehog', '🦔', N('Ёжик', 'Hedgehog', 'Jeż', 'Erizo', 'Riccio'), R('level', 5, 80)),
  item('mascot', 'koala', '🐨', N('Коала', 'Koala', 'Koala', 'Koala', 'Koala'), R('flame', 7, 100)),
  item('mascot', 'owl', '🦉', N('Сова', 'Owl', 'Sowa', 'Búho', 'Gufo'), R('level', 15, 120)),
  item('mascot', 'sloth', '🦥', N('Ленивец', 'Sloth', 'Leniwiec', 'Perezoso', 'Bradipo'), R('acts', 150, 150)),
  item('mascot', 'turtle', '🐢', N('Черепаха', 'Turtle', 'Żółw', 'Tortuga', 'Tartaruga'), R('level', 22, 150)),
  item('mascot', 'flamingo', '🦩', N('Фламинго', 'Flamingo', 'Flaming', 'Flamenco', 'Fenicottero'), R('flame', 21, 180)),
  item('mascot', 'octopus', '🐙', N('Осьминог', 'Octopus', 'Ośmiornica', 'Pulpo', 'Polpo'), R('acts', 400, 200)),
  item('mascot', 'lion', '🦁', N('Лев', 'Lion', 'Lew', 'León', 'Leone'), R('level', 38, 250)),
  item('mascot', 'unicorn', '🦄', N('Единорог', 'Unicorn', 'Jednorożec', 'Unicornio', 'Unicorno'), R('level', 56, 300, 2)),
  item('mascot', 'whale', '🐳', N('Кит', 'Whale', 'Wieloryb', 'Ballena', 'Balena'), R('flame', 100, 350, 3)),
  item('mascot', 'dragon', '🐉', N('Дракон', 'Dragon', 'Smok', 'Dragón', 'Drago'), R('level', 75, 400, 4)),
  // Scenes for the mascot — shared.
  item('scene', 'none', '⬜', N('Без фона', 'No background', 'Bez tła', 'Sin fondo', 'Senza sfondo')),
  item('scene', 'morning', '🌤️', N('Утро', 'Morning', 'Poranek', 'Mañana', 'Mattino')),
  item('scene', 'mint', '🌿', N('Мята', 'Mint', 'Mięta', 'Menta', 'Menta')),
  item('scene', 'lavender', '💜', N('Лаванда', 'Lavender', 'Lawenda', 'Lavanda', 'Lavanda')),
  item('scene', 'caramel', '🍯', N('Карамель', 'Caramel', 'Karmel', 'Caramelo', 'Caramello'), R('flame', 7, 50)),
  item('scene', 'deepsea', '🫧', N('Глубина', 'Deep sea', 'Głębia', 'Mar profundo', 'Abissi'), R('level', 10, 50)),
  item('scene', 'glow', '🔆', N('Сияние', 'Glow', 'Blask', 'Resplandor', 'Bagliore'), R('level', 18, 50)),
  item('scene', 'campfire', '🏕️', N('У костра', 'By the campfire', 'Przy ognisku', 'Junto a la hoguera', 'Accanto al falò'), R('acts', 80, 150)),
  item('scene', 'beach', '🏖️', N('Пляж', 'Beach', 'Plaża', 'Playa', 'Spiaggia'), R('flame', 14, 150)),
  item('scene', 'mountains', '🏔️', N('Горы', 'Mountains', 'Góry', 'Montañas', 'Montagne'), R('level', 28, 150)),
  item('scene', 'cafe', '☕', N('Кофейня', 'Café', 'Kawiarnia', 'Cafetería', 'Caffè'), R('acts', 250, 150)),
  item('scene', 'garden', '🌷', N('Сад', 'Garden', 'Ogród', 'Jardín', 'Giardino'), R('level', 34, 150)),
  item('scene', 'cabin', '🏡', N('Зимний домик', 'Winter cabin', 'Zimowa chatka', 'Cabaña de invierno', "Baita d'inverno"), R('flame', 45, 150)),
  item('scene', 'city', '🌃', N('Огни города', 'City lights', 'Światła miasta', 'Luces de la ciudad', 'Luci della città'), R('days', 100, 150)),
  item('scene', 'space', '🪐', N('Открытый космос', 'Outer space', 'Kosmos', 'Espacio exterior', 'Spazio profondo'), R('level', 56, 200, 2)),
  // Postcards for love notes — shared.
  item('card', 'plain', '🤍', N('Простая', 'Plain', 'Prosta', 'Sencilla', 'Semplice')),
  item('card', 'kraft', '📦', N('Крафт', 'Kraft', 'Kraft', 'Kraft', 'Kraft')),
  item('card', 'hearts', '💗', N('Сердечки', 'Little hearts', 'Serduszka', 'Corazones', 'Cuoricini'), R('flame', 7, 100)),
  item('card', 'bloom', '💐', N('Букет', 'Bouquet', 'Bukiet', 'Ramo', 'Bouquet'), R('level', 15, 100)),
  item('card', 'night', '🌙', N('Ночное небо', 'Night sky', 'Nocne niebo', 'Cielo nocturno', 'Cielo notturno'), R('acts', 200, 120)),
  item('card', 'retro', '✉️', N('Ретро-почта', 'Retro mail', 'Retro poczta', 'Correo retro', 'Posta rétro'), R('level', 28, 120)),
  item('card', 'watercolor', '🎨', N('Акварель', 'Watercolour', 'Akwarela', 'Acuarela', 'Acquerello'), R('flame', 30, 150)),
  item('card', 'goldfoil', '✨', N('Золотое тиснение', 'Gold foil', 'Złote tłoczenie', 'Estampado dorado', "Lamina d'oro"), R('level', 65, 200, 2)),
  // Savings goal designs — shared.
  item('piggy', 'classic', '📊', N('Простая', 'Simple', 'Prosta', 'Sencilla', 'Semplice')),
  item('piggy', 'piggy', '🐷', N('Свинка', 'Piggy', 'Świnka', 'Cerdito', 'Porcellino')),
  item('piggy', 'jar', '🫙', N('Банка с монетками', 'Coin jar', 'Słoik na monety', 'Bote de monedas', 'Barattolo di monete'), R('level', 8, 80)),
  item('piggy', 'amphora', '🏺', N('Амфора', 'Amphora', 'Amfora', 'Ánfora', 'Anfora'), R('acts', 150, 100)),
  item('piggy', 'rocket', '🚀', N('Ракета', 'Rocket', 'Rakieta', 'Cohete', 'Razzo'), R('flame', 21, 120)),
  item('piggy', 'moneytree', '🌳', N('Денежное дерево', 'Money tree', 'Drzewko szczęścia', 'Árbol del dinero', 'Albero dei soldi'), R('level', 38, 150)),
  item('piggy', 'hoard', '🐉', N('Драконье золото', "Dragon's hoard", 'Smoczy skarb', 'Tesoro del dragón', 'Tesoro del drago'), R('level', 75, 250, 3)),
  // «Around the world» — earned in the marathon (marathon.ts): weeks in a row and months of quests.
  item('mascot', 'parrot', '🦜', N('Попугай-путешественник', 'Travelling parrot', 'Papuga podróżniczka', 'Loro viajero', 'Pappagallo viaggiatore'), EV),
  item('mascot', 'camel', '🐫', N('Верблюд', 'Camel', 'Wielbłąd', 'Camello', 'Cammello'), EV),
  item('mascot', 'kangaroo', '🦘', N('Кенгуру', 'Kangaroo', 'Kangur', 'Canguro', 'Canguro'), EV),
  item('scene', 'globe', '🌍', N('Глобус', 'Globe', 'Globus', 'Globo', 'Mappamondo'), EV),
  item('piggy', 'suitcase', '🧳', N('Чемодан странствий', 'Travel suitcase', 'Walizka podróżnika', 'Maleta viajera', 'Valigia del viaggiatore'), EV),
  item('card', 'passport', '🛂', N('Паспорт', 'Passport', 'Paszport', 'Pasaporte', 'Passaporto'), EV),
  item('card', 'm01', '❄️', N('Январь · Морозный узор', 'January · Frost pattern', 'Styczeń · Mroźny wzór', 'Enero · Escarcha', 'Gennaio · Ricami di brina'), EV),
  item('card', 'm02', '🧤', N('Февраль · Варежки', 'February · Mittens', 'Luty · Rękawiczki', 'Febrero · Manoplas', 'Febbraio · Muffole'), EV),
  item('card', 'm03', '🌱', N('Март · Подснежники', 'March · Snowdrops', 'Marzec · Przebiśniegi', 'Marzo · Campanillas', 'Marzo · Bucaneve'), EV),
  item('card', 'm04', '💧', N('Апрель · Капель', 'April · Spring drops', 'Kwiecień · Roztopy', 'Abril · Gotas de primavera', 'Aprile · Gocce di primavera'), EV),
  item('card', 'm05', '💜', N('Май · Сирень', 'May · Lilac', 'Maj · Bez', 'Mayo · Lilas', 'Maggio · Lillà'), EV),
  item('card', 'm06', '🌙', N('Июнь · Белые ночи', 'June · White nights', 'Czerwiec · Białe noce', 'Junio · Noches blancas', 'Giugno · Notti bianche'), EV),
  item('card', 'm07', '🍓', N('Июль · Земляника', 'July · Wild strawberries', 'Lipiec · Poziomki', 'Julio · Fresas silvestres', 'Luglio · Fragoline'), EV),
  item('card', 'm08', '🌠', N('Август · Звездопад', 'August · Shooting stars', 'Sierpień · Spadające gwiazdy', 'Agosto · Estrellas fugaces', 'Agosto · Stelle cadenti'), EV),
  item('card', 'm09', '🍎', N('Сентябрь · Яблоки', 'September · Apples', 'Wrzesień · Jabłka', 'Septiembre · Manzanas', 'Settembre · Mele'), EV),
  item('card', 'm10', '🍁', N('Октябрь · Листопад', 'October · Falling leaves', 'Październik · Liście', 'Octubre · Hojas caídas', 'Ottobre · Foglie'), EV),
  item('card', 'm11', '☕', N('Ноябрь · Плед и какао', 'November · Blanket and cocoa', 'Listopad · Koc i kakao', 'Noviembre · Manta y cacao', 'Novembre · Coperta e cioccolata'), EV),
  item('card', 'm12', '✨', N('Декабрь · Огоньки', 'December · Fairy lights', 'Grudzień · Światełka', 'Diciembre · Lucecitas', 'Dicembre · Lucine'), EV),
  // One atmosphere for each culture of the year (cultures.ts).
  ...CULTURES.map((c) => item('atmo', `c-${c.code}`, c.flag, c.name, EV)),
]

/* Each culture's atmosphere: palette from its colours, things in the air, a scene with its landmarks. */
for (const c of CULTURES) {
  const p = culturePalette(c)
  const dot = ['●', '✦', '✨'].includes(c.glyphs[0])
  LOOKS[`c-${c.code}`] = {
    light: p.light, dark: p.dark, headers: [c.a1, c.a2], scene: `c-${c.code}`, decor: c.deco[0],
    ambient: { glyphs: c.glyphs, motion: c.motion, count: c.glyphs[0] === '●' ? 16 : 10, ...(dot ? { color: mix(c.a2, '#ffffff', 0.35), glow: c.glyphs[0] === '●' ? mix(c.a2, '#ffffff', 0.6) : undefined } : {}) },
  }
  SCENES[`c-${c.code}`] = { bg: `linear-gradient(180deg, ${mix(c.a2, '#ffffff', 0.25)}, ${c.a1})`, deco: [[c.deco[0], 4, 58, 36], [c.deco[1] ?? c.deco[0], 76, 54, 34], [c.deco[2] ?? c.deco[0], 40, 6, 20]] }
}
/** A culture's atmosphere (the marathon's weekly reward). */
export const isCulture = (i: Item) => i.kind === 'atmo' && i.key.startsWith('c-')

export const ITEMS: Record<string, Item> = Object.fromEntries(CATALOG.map((i) => [i.id, i]))
/** The default pick of each kind — always free. */
export const DEFAULTS: Record<Kind, string> = { theme: 'theme:classic', atmo: 'theme:classic', mascot: 'mascot:fox', scene: 'scene:none', card: 'card:plain', piggy: 'piggy:classic' }
export const itemName = (i: Item, lang: Lang) => i.name[lang] ?? i.name.en
