import type { Lang } from '../types'

/*
 * «Around the world»: one culture for each week of the year. Two seasons of 52 alternate by year (even ISO years
 * take season A, odd years season B), so a couple meets 104 countries over two years; week 53 (some years have it)
 * is the special «Around the world». Weeks follow the calendar where a culture has its big moment: China at the
 * Lunar New Year, Ireland on St Patrick's, Japan in sakura season, Mexico on the Day of the Dead, Nepal at Tihar…
 * Each culture becomes an atmosphere: colours from its flag and nature, things drifting in the air, a scene.
 */

export type Motion = 'fall' | 'rise' | 'float' | 'streak'
export interface Culture {
  code: string; flag: string; name: Record<Lang, string>
  /** Main colour and second colour (headers, scene). */
  a1: string; a2: string
  glyphs: string[]; motion: Motion; deco: string[]
}

type Row = [code: string, flag: string, ru: string, en: string, pl: string, es: string, it: string, a1: string, a2: string, glyphs: string, motion: Motion, deco: string]
const row = (r: Row): Culture => ({
  code: r[0], flag: r[1], name: { ru: r[2], en: r[3], pl: r[4], es: r[5], it: r[6] },
  a1: r[7], a2: r[8], glyphs: r[9].split(' '), motion: r[10], deco: r[11].split(' '),
})

/** Season A — even ISO years (2026, 2028…). Index = ISO week − 1. */
export const SEASON_A: Culture[] = ([
  ['sco', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Шотландия', 'Scotland', 'Szkocja', 'Escocia', 'Scozia', '#1e3a8a', '#15803d', '❄ ✦', 'fall', '🏰 🐑 🥃'],
  ['by', '🇧🇾', 'Беларусь', 'Belarus', 'Białoruś', 'Bielorrusia', 'Bielorussia', '#b91c1c', '#15803d', '❄ ⭐', 'fall', '🏡 🌾 ⭐'],
  ['fi', '🇫🇮', 'Финляндия', 'Finland', 'Finlandia', 'Finlandia', 'Finlandia', '#1d4ed8', '#38bdf8', '❄', 'fall', '🦌 🌲 🌌'],
  ['kr', '🇰🇷', 'Южная Корея', 'South Korea', 'Korea Południowa', 'Corea del Sur', 'Corea del Sud', '#be123c', '#1d4ed8', '🏮', 'rise', '🏯 🍵 🌙'],
  ['cn', '🇨🇳', 'Китай', 'China', 'Chiny', 'China', 'Cina', '#dc2626', '#f59e0b', '🧧 🏮', 'rise', '🐉 🏮 🧧'],
  ['vn', '🇻🇳', 'Вьетнам', 'Vietnam', 'Wietnam', 'Vietnam', 'Vietnam', '#dc2626', '#facc15', '🌸', 'fall', '🛶 🏮 🌾'],
  ['it', '🇮🇹', 'Италия', 'Italy', 'Włochy', 'Italia', 'Italia', '#15803d', '#dc2626', '💕 🎭', 'rise', '🏛️ 🍝 🛶'],
  ['br', '🇧🇷', 'Бразилия', 'Brazil', 'Brazylia', 'Brasil', 'Brasile', '#16a34a', '#facc15', '🎉 🪶', 'fall', '🥁 🌴 🦜'],
  ['is', '🇮🇸', 'Исландия', 'Iceland', 'Islandia', 'Islandia', 'Islanda', '#1e40af', '#22d3ee', '●', 'float', '🌋 🐴 🌌'],
  ['in', '🇮🇳', 'Индия', 'India', 'Indie', 'India', 'India', '#ea580c', '#db2777', '🌺 🪔', 'fall', '🐘 🕌 🪷'],
  ['ie', '🇮🇪', 'Ирландия', 'Ireland', 'Irlandia', 'Irlanda', 'Irlanda', '#15803d', '#f97316', '🍀', 'fall', '🏰 🌈 🍀'],
  ['ir', '🇮🇷', 'Иран', 'Iran', 'Iran', 'Irán', 'Iran', '#0f766e', '#be123c', '🌷', 'fall', '🕌 🌷 🍎'],
  ['jp', '🇯🇵', 'Япония', 'Japan', 'Japonia', 'Japón', 'Giappone', '#db2777', '#f9a8d4', '🌸', 'fall', '🏯 🗻 🍡'],
  ['gr', '🇬🇷', 'Греция', 'Greece', 'Grecja', 'Grecia', 'Grecia', '#1d4ed8', '#38bdf8', '🫒', 'fall', '🏛️ ⛵ ☀️'],
  ['th', '🇹🇭', 'Таиланд', 'Thailand', 'Tajlandia', 'Tailandia', 'Thailandia', '#7c3aed', '#f59e0b', '💧 🌺', 'fall', '🛕 🐘 🌴'],
  ['nl', '🇳🇱', 'Нидерланды', 'Netherlands', 'Holandia', 'Países Bajos', 'Paesi Bassi', '#ea580c', '#db2777', '🌷', 'fall', '🌷 🚲 🧀'],
  ['ua', '🇺🇦', 'Украина', 'Ukraine', 'Ukraina', 'Ucrania', 'Ucraina', '#2563eb', '#facc15', '🌻', 'fall', '🌻 🌾 🏡'],
  ['kz', '🇰🇿', 'Казахстан', 'Kazakhstan', 'Kazachstan', 'Kazajistán', 'Kazakistan', '#0891b2', '#facc15', '🌷', 'fall', '🐎 ⛺ 🦅'],
  ['nz', '🇳🇿', 'Новая Зеландия', 'New Zealand', 'Nowa Zelandia', 'Nueva Zelanda', 'Nuova Zelanda', '#0f766e', '#1e3a8a', '🌿', 'fall', '🥝 🏔️ 🐑'],
  ['no', '🇳🇴', 'Норвегия', 'Norway', 'Norwegia', 'Noruega', 'Norvegia', '#b91c1c', '#1e3a8a', '✦', 'streak', '🏔️ ⛵ 🐟'],
  ['es', '🇪🇸', 'Испания', 'Spain', 'Hiszpania', 'España', 'Spagna', '#dc2626', '#f59e0b', '🌹', 'fall', '💃 🏰 🥘'],
  ['tr', '🇹🇷', 'Турция', 'Turkey', 'Turcja', 'Turquía', 'Turchia', '#dc2626', '#0e7490', '🎈', 'rise', '🕌 🎈 🧿'],
  ['pt', '🇵🇹', 'Португалия', 'Portugal', 'Portugalia', 'Portugal', 'Portogallo', '#15803d', '#dc2626', '🎉', 'fall', '🏰 🚋 🐟'],
  ['dk', '🇩🇰', 'Дания', 'Denmark', 'Dania', 'Dinamarca', 'Danimarca', '#dc2626', '#fb7185', '🌼', 'fall', '🧜‍♀️ 🏰 🚲'],
  ['se', '🇸🇪', 'Швеция', 'Sweden', 'Szwecja', 'Suecia', 'Svezia', '#2563eb', '#facc15', '🌼', 'fall', '🍓 🌸 🏡'],
  ['hr', '🇭🇷', 'Хорватия', 'Croatia', 'Chorwacja', 'Croacia', 'Croazia', '#1d4ed8', '#dc2626', '🐚', 'fall', '⛵ 🏰 🌊'],
  ['us', '🇺🇸', 'США', 'USA', 'USA', 'EE. UU.', 'USA', '#1d4ed8', '#dc2626', '✨', 'streak', '🗽 🌭 🎆'],
  ['fr', '🇫🇷', 'Франция', 'France', 'Francja', 'Francia', 'Francia', '#1d4ed8', '#dc2626', '✨', 'streak', '🗼 🥐 🍷'],
  ['eg', '🇪🇬', 'Египет', 'Egypt', 'Egipt', 'Egipto', 'Egitto', '#d97706', '#1e3a8a', '●', 'float', '🐪 🏜️ ☀️'],
  ['ma', '🇲🇦', 'Марокко', 'Morocco', 'Maroko', 'Marruecos', 'Marocco', '#b91c1c', '#15803d', '✨', 'float', '🕌 🐪 🫖'],
  ['id', '🇮🇩', 'Индонезия', 'Indonesia', 'Indonezja', 'Indonesia', 'Indonesia', '#dc2626', '#0d9488', '🌺', 'fall', '🌴 🏝️ 🛕'],
  ['pe', '🇵🇪', 'Перу', 'Peru', 'Peru', 'Perú', 'Perù', '#dc2626', '#a16207', '●', 'float', '🦙 🏔️ 🌽'],
  ['cu', '🇨🇺', 'Куба', 'Cuba', 'Kuba', 'Cuba', 'Cuba', '#1d4ed8', '#dc2626', '🎵', 'rise', '🚗 🌴 🎺'],
  ['gb', '🇬🇧', 'Великобритания', 'United Kingdom', 'Wielka Brytania', 'Reino Unido', 'Regno Unito', '#1e3a8a', '#dc2626', '🌹', 'fall', '🏰 ☕ 💂'],
  ['ke', '🇰🇪', 'Кения', 'Kenya', 'Kenia', 'Kenia', 'Kenya', '#15803d', '#b91c1c', '●', 'float', '🦒 🦁 🌅'],
  ['au', '🇦🇺', 'Австралия', 'Australia', 'Australia', 'Australia', 'Australia', '#1e40af', '#f59e0b', '🌿', 'fall', '🦘 🏖️ 🐨'],
  ['ch', '🇨🇭', 'Швейцария', 'Switzerland', 'Szwajcaria', 'Suiza', 'Svizzera', '#dc2626', '#64748b', '❄', 'fall', '🏔️ 🐄 🧀'],
  ['de', '🇩🇪', 'Германия', 'Germany', 'Niemcy', 'Alemania', 'Germania', '#b91c1c', '#ca8a04', '🍂', 'fall', '🏰 🥨 🍺'],
  ['cz', '🇨🇿', 'Чехия', 'Czechia', 'Czechy', 'Chequia', 'Cechia', '#1d4ed8', '#b91c1c', '🍂', 'fall', '🏰 🍺 🎻'],
  ['at', '🇦🇹', 'Австрия', 'Austria', 'Austria', 'Austria', 'Austria', '#dc2626', '#f59e0b', '🎵', 'rise', '🏔️ 🎻 🍰'],
  ['hu', '🇭🇺', 'Венгрия', 'Hungary', 'Węgry', 'Hungría', 'Ungheria', '#15803d', '#dc2626', '🍂', 'fall', '🏰 🛁 🌶️'],
  ['ge', '🇬🇪', 'Грузия', 'Georgia', 'Gruzja', 'Georgia', 'Georgia', '#b91c1c', '#7c2d12', '🍇', 'fall', '⛰️ 🍷 🍇'],
  ['am', '🇦🇲', 'Армения', 'Armenia', 'Armenia', 'Armenia', 'Armenia', '#ea580c', '#1d4ed8', '🌸', 'fall', '⛰️ ⛪ 🍑'],
  ['mx', '🇲🇽', 'Мексика', 'Mexico', 'Meksyk', 'México', 'Messico', '#ea580c', '#db2777', '🌼', 'fall', '💀 🌵 🪅'],
  ['np', '🇳🇵', 'Непал', 'Nepal', 'Nepal', 'Nepal', 'Nepal', '#b91c1c', '#1e3a8a', '🪔', 'rise', '🏔️ 🛕 🪔'],
  ['pl', '🇵🇱', 'Польша', 'Poland', 'Polska', 'Polonia', 'Polonia', '#dc2626', '#f87171', '🍂', 'fall', '🏰 🥟 🦅'],
  ['be', '🇧🇪', 'Бельгия', 'Belgium', 'Belgia', 'Bélgica', 'Belgio', '#ca8a04', '#b91c1c', '🍂', 'fall', '🏰 🧇 🍫'],
  ['ar', '🇦🇷', 'Аргентина', 'Argentina', 'Argentyna', 'Argentina', 'Argentina', '#38bdf8', '#f59e0b', '🌹', 'fall', '💃 🥩 ⛰️'],
  ['ca', '🇨🇦', 'Канада', 'Canada', 'Kanada', 'Canadá', 'Canada', '#dc2626', '#7f1d1d', '🍁 ❄', 'fall', '🏔️ 🦫 🍁'],
  ['ee', '🇪🇪', 'Эстония', 'Estonia', 'Estonia', 'Estonia', 'Estonia', '#2563eb', '#0f172a', '❄', 'fall', '🏰 🌲 ❄️'],
  ['ru', '🇷🇺', 'Россия', 'Russia', 'Rosja', 'Rusia', 'Russia', '#1d4ed8', '#dc2626', '❄', 'fall', '🪆 ⛪ 🌲'],
  ['ph', '🇵🇭', 'Филиппины', 'Philippines', 'Filipiny', 'Filipinas', 'Filippine', '#1d4ed8', '#facc15', '⭐', 'rise', '🏝️ ⭐ 🥭'],
] as Row[]).map(row)

/** Season B — odd ISO years (2027, 2029…). */
export const SEASON_B: Culture[] = ([
  ['bg', '🇧🇬', 'Болгария', 'Bulgaria', 'Bułgaria', 'Bulgaria', 'Bulgaria', '#15803d', '#dc2626', '❄', 'fall', '🌹 🏔️ ⛪'],
  ['et', '🇪🇹', 'Эфиопия', 'Ethiopia', 'Etiopia', 'Etiopía', 'Etiopia', '#16a34a', '#facc15', '●', 'float', '☕ ⛪ 🦁'],
  ['lv', '🇱🇻', 'Латвия', 'Latvia', 'Łotwa', 'Letonia', 'Lettonia', '#9f1239', '#fda4af', '❄', 'fall', '🏰 🌲 ❄️'],
  ['mn', '🇲🇳', 'Монголия', 'Mongolia', 'Mongolia', 'Mongolia', 'Mongolia', '#b91c1c', '#1d4ed8', '❄', 'fall', '🐎 ⛺ 🦅'],
  ['sg', '🇸🇬', 'Сингапур', 'Singapore', 'Singapur', 'Singapur', 'Singapore', '#dc2626', '#f59e0b', '🏮', 'rise', '🦁 🌃 🌺'],
  ['la', '🇱🇦', 'Лаос', 'Laos', 'Laos', 'Laos', 'Laos', '#1e3a8a', '#dc2626', '🏮', 'rise', '🛕 🐘 🛶'],
  ['do', '🇩🇴', 'Доминикана', 'Dominican Republic', 'Dominikana', 'República Dominicana', 'Repubblica Dominicana', '#1e3a8a', '#dc2626', '🎭 🎉', 'fall', '🏝️ 🌴 🥁'],
  ['tt', '🇹🇹', 'Тринидад и Тобаго', 'Trinidad and Tobago', 'Trynidad i Tobago', 'Trinidad y Tobago', 'Trinidad e Tobago', '#b91c1c', '#0f172a', '🎉', 'fall', '🥁 🌴 🦜'],
  ['il', '🇮🇱', 'Израиль', 'Israel', 'Izrael', 'Israel', 'Israele', '#1d4ed8', '#38bdf8', '●', 'float', '🏛️ 🌴 🍊'],
  ['lk', '🇱🇰', 'Шри-Ланка', 'Sri Lanka', 'Sri Lanka', 'Sri Lanka', 'Sri Lanka', '#b45309', '#15803d', '🌺', 'fall', '🐘 🍵 🌴'],
  ['za', '🇿🇦', 'ЮАР', 'South Africa', 'RPA', 'Sudáfrica', 'Sudafrica', '#15803d', '#f59e0b', '●', 'float', '🦁 🏔️ 🐧'],
  ['az', '🇦🇿', 'Азербайджан', 'Azerbaijan', 'Azerbejdżan', 'Azerbaiyán', 'Azerbaigian', '#0891b2', '#dc2626', '🌷', 'fall', '🕌 🔥 🌷'],
  ['uz', '🇺🇿', 'Узбекистан', 'Uzbekistan', 'Uzbekistan', 'Uzbekistán', 'Uzbekistan', '#0e7490', '#16a34a', '🌷', 'fall', '🕌 🍈 🐪'],
  ['si', '🇸🇮', 'Словения', 'Slovenia', 'Słowenia', 'Eslovenia', 'Slovenia', '#1d4ed8', '#15803d', '🌿', 'fall', '🏔️ 🏰 🌲'],
  ['sk', '🇸🇰', 'Словакия', 'Slovakia', 'Słowacja', 'Eslovaquia', 'Slovacchia', '#1d4ed8', '#dc2626', '🌸', 'fall', '🏰 🏔️ 🥚'],
  ['kh', '🇰🇭', 'Камбоджа', 'Cambodia', 'Kambodża', 'Camboya', 'Cambogia', '#1e3a8a', '#dc2626', '💧', 'fall', '🛕 🐘 🌴'],
  ['rs', '🇷🇸', 'Сербия', 'Serbia', 'Serbia', 'Serbia', 'Serbia', '#b91c1c', '#1e3a8a', '🌸', 'fall', '🏰 🎺 🌸'],
  ['lt', '🇱🇹', 'Литва', 'Lithuania', 'Litwa', 'Lituania', 'Lituania', '#ca8a04', '#15803d', '🌼', 'fall', '🏰 🌲 🌼'],
  ['co', '🇨🇴', 'Колумбия', 'Colombia', 'Kolumbia', 'Colombia', 'Colombia', '#ca8a04', '#1d4ed8', '🌺', 'fall', '☕ 🦜 🌺'],
  ['cl', '🇨🇱', 'Чили', 'Chile', 'Chile', 'Chile', 'Cile', '#1d4ed8', '#dc2626', '✦', 'streak', '🗿 🏔️ 🍷'],
  ['mt', '🇲🇹', 'Мальта', 'Malta', 'Malta', 'Malta', 'Malta', '#dc2626', '#f59e0b', '✨', 'float', '🏰 ⛵ ☀️'],
  ['ro', '🇷🇴', 'Румыния', 'Romania', 'Rumunia', 'Rumanía', 'Romania', '#1d4ed8', '#facc15', '🌼', 'fall', '🏰 🦇 🌲'],
  ['fj', '🇫🇯', 'Фиджи', 'Fiji', 'Fidżi', 'Fiyi', 'Figi', '#0ea5e9', '#0f766e', '🌺', 'fall', '🏝️ 🌊 🐠'],
  ['ec', '🇪🇨', 'Эквадор', 'Ecuador', 'Ekwador', 'Ecuador', 'Ecuador', '#ca8a04', '#1d4ed8', '●', 'float', '🐢 🌋 🦜'],
  ['jm', '🇯🇲', 'Ямайка', 'Jamaica', 'Jamajka', 'Jamaica', 'Giamaica', '#16a34a', '#facc15', '🎵', 'rise', '🌴 🎶 🏖️'],
  ['me', '🇲🇪', 'Черногория', 'Montenegro', 'Czarnogóra', 'Montenegro', 'Montenegro', '#b91c1c', '#ca8a04', '🐚', 'fall', '⛰️ ⛵ 🏰'],
  ['mv', '🇲🇻', 'Мальдивы', 'Maldives', 'Malediwy', 'Maldivas', 'Maldive', '#0ea5e9', '#15803d', '🫧', 'rise', '🏝️ 🐠 🐢'],
  ['al', '🇦🇱', 'Албания', 'Albania', 'Albania', 'Albania', 'Albania', '#dc2626', '#0f172a', '🫒', 'fall', '🏰 🦅 🫒'],
  ['tn', '🇹🇳', 'Тунис', 'Tunisia', 'Tunezja', 'Túnez', 'Tunisia', '#dc2626', '#0ea5e9', '✨', 'float', '🏜️ 🕌 🌴'],
  ['jo', '🇯🇴', 'Иордания', 'Jordan', 'Jordania', 'Jordania', 'Giordania', '#be123c', '#a16207', '●', 'float', '🏜️ 🐪 🌙'],
  ['lb', '🇱🇧', 'Ливан', 'Lebanon', 'Liban', 'Líbano', 'Libano', '#dc2626', '#15803d', '🌿', 'fall', '🌲 🏛️ 🍋'],
  ['cy', '🇨🇾', 'Кипр', 'Cyprus', 'Cypr', 'Chipre', 'Cipro', '#ea580c', '#15803d', '🫒', 'fall', '🏛️ ⛵ 🍋'],
  ['tz', '🇹🇿', 'Танзания', 'Tanzania', 'Tanzania', 'Tanzania', 'Tanzania', '#16a34a', '#0ea5e9', '●', 'float', '🏔️ 🦓 🦒'],
  ['sn', '🇸🇳', 'Сенегал', 'Senegal', 'Senegal', 'Senegal', 'Senegal', '#16a34a', '#facc15', '🎵', 'rise', '🌳 🥁 🌅'],
  ['gh', '🇬🇭', 'Гана', 'Ghana', 'Ghana', 'Ghana', 'Ghana', '#dc2626', '#facc15', '🎵', 'rise', '🥁 🌴 🍫'],
  ['ng', '🇳🇬', 'Нигерия', 'Nigeria', 'Nigeria', 'Nigeria', 'Nigeria', '#16a34a', '#15803d', '🎵', 'rise', '🥁 🌍 🎭'],
  ['mg', '🇲🇬', 'Мадагаскар', 'Madagascar', 'Madagaskar', 'Madagascar', 'Madagascar', '#16a34a', '#dc2626', '🌿', 'fall', '🌳 🐒 🦎'],
  ['bt', '🇧🇹', 'Бутан', 'Bhutan', 'Bhutan', 'Bután', 'Bhutan', '#f59e0b', '#ea580c', '●', 'float', '🛕 🐉 🏔️'],
  ['kg', '🇰🇬', 'Кыргызстан', 'Kyrgyzstan', 'Kirgistan', 'Kirguistán', 'Kirghizistan', '#dc2626', '#facc15', '●', 'float', '🐎 ⛺ 🏔️'],
  ['my', '🇲🇾', 'Малайзия', 'Malaysia', 'Malezja', 'Malasia', 'Malesia', '#1e3a8a', '#dc2626', '🌺', 'fall', '🏙️ 🌴 🐅'],
  ['pk', '🇵🇰', 'Пакистан', 'Pakistan', 'Pakistan', 'Pakistán', 'Pakistan', '#15803d', '#0f766e', '●', 'float', '🏔️ 🕌 🌙'],
  ['gt', '🇬🇹', 'Гватемала', 'Guatemala', 'Gwatemala', 'Guatemala', 'Guatemala', '#0ea5e9', '#15803d', '🪶', 'fall', '🌋 🦜 🛕'],
  ['cr', '🇨🇷', 'Коста-Рика', 'Costa Rica', 'Kostaryka', 'Costa Rica', 'Costa Rica', '#1e3a8a', '#dc2626', '🌿', 'fall', '🌋 🦥 🦜'],
  ['bo', '🇧🇴', 'Боливия', 'Bolivia', 'Boliwia', 'Bolivia', 'Bolivia', '#dc2626', '#16a34a', '●', 'float', '🏔️ 🦙 🧂'],
  ['mu', '🇲🇺', 'Маврикий', 'Mauritius', 'Mauritius', 'Mauricio', 'Mauritius', '#dc2626', '#1d4ed8', '🪔', 'rise', '🏝️ 🪔 🐢'],
  ['uy', '🇺🇾', 'Уругвай', 'Uruguay', 'Urugwaj', 'Uruguay', 'Uruguay', '#1d4ed8', '#facc15', '🍂', 'fall', '🏖️ 🧉 ☀️'],
  ['ve', '🇻🇪', 'Венесуэла', 'Venezuela', 'Wenezuela', 'Venezuela', 'Venezuela', '#ca8a04', '#1d4ed8', '💧', 'fall', '⛰️ 💧 🦜'],
  ['om', '🇴🇲', 'Оман', 'Oman', 'Oman', 'Omán', 'Oman', '#dc2626', '#15803d', '✨', 'float', '🏜️ 🕌 🐪'],
  ['ae', '🇦🇪', 'ОАЭ', 'UAE', 'ZEA', 'EAU', 'EAU', '#15803d', '#0f172a', '✨', 'float', '🏙️ 🐪 🌙'],
  ['md', '🇲🇩', 'Молдова', 'Moldova', 'Mołdawia', 'Moldavia', 'Moldavia', '#1d4ed8', '#facc15', '🍇', 'fall', '🍇 🍷 ⛪'],
  ['ad', '🇦🇩', 'Андорра', 'Andorra', 'Andora', 'Andorra', 'Andorra', '#1d4ed8', '#dc2626', '❄', 'fall', '🏔️ ⛷️ 🏰'],
  ['bs', '🇧🇸', 'Багамы', 'Bahamas', 'Bahamy', 'Bahamas', 'Bahamas', '#0ea5e9', '#facc15', '🎉', 'fall', '🏝️ 🥁 🐚'],
] as Row[]).map(row)

/** Week 53, in the years that have one. */
export const WORLD: Culture = row(['world', '🌍', 'Вокруг света', 'Around the world', 'Dookoła świata', 'La vuelta al mundo', 'Il giro del mondo', '#0ea5e9', '#a855f7', '✦', 'streak', '🌍 ✈️ 🗺️'])

export const CULTURES: Culture[] = [...SEASON_A, ...SEASON_B, WORLD]

/** The culture of an ISO week. */
export const cultureOf = (year: number, week: number): Culture => (week >= 53 ? WORLD : (year % 2 === 0 ? SEASON_A : SEASON_B)[week - 1])

/* ---------- colours: a palette from the culture's two colours ---------- */
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
const toHex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
/** Mix colour a with b: t = share of b. */
export const mix = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)) }

/** [background, card, pressed card, tint] for light and dark: a clearly tinted ground and cards warmed by the second colour. */
export function culturePalette(c: Culture): { light: [string, string, string, string]; dark: [string, string, string, string] } {
  return {
    light: [mix(c.a1, '#ffffff', 0.84), mix(c.a2, '#ffffff', 0.95), mix(c.a1, '#ffffff', 0.74), mix(c.a1, '#000000', 0.15)],
    dark: [mix(c.a1, '#000000', 0.84), mix(c.a1, '#000000', 0.74), mix(c.a1, '#000000', 0.64), mix(c.a1, '#ffffff', 0.42)],
  }
}

/* ---------- patterns: every culture gets a wallpaper of its own, drawn with CSS ---------- */
export type Pattern = 'tartan' | 'waves' | 'dots' | 'stripes' | 'diag' | 'zellige' | 'stars' | 'snow' | 'checks' | 'sun' | 'folk' | 'kente' | 'grid' | 'scales'
export const PATTERN: Record<string, Pattern> = {
  // Season A
  sco: 'tartan', by: 'folk', fi: 'snow', kr: 'grid', cn: 'stars', vn: 'scales', it: 'checks', br: 'diag', is: 'snow', in: 'dots', ie: 'diag',
  ir: 'zellige', jp: 'waves', gr: 'stripes', th: 'scales', nl: 'stripes', ua: 'folk', kz: 'sun', nz: 'waves', no: 'snow', es: 'dots', tr: 'zellige',
  pt: 'scales', dk: 'grid', se: 'stripes', hr: 'checks', us: 'stars', fr: 'stripes', eg: 'sun', ma: 'zellige', id: 'scales', pe: 'kente', cu: 'diag',
  gb: 'grid', ke: 'kente', au: 'sun', ch: 'grid', de: 'checks', cz: 'folk', at: 'stripes', hu: 'folk', ge: 'dots', am: 'scales', mx: 'kente', np: 'stars',
  pl: 'folk', be: 'grid', ar: 'sun', ca: 'snow', ee: 'grid', ru: 'folk', ph: 'stars',
  // Season B
  bg: 'folk', et: 'kente', lv: 'folk', mn: 'sun', sg: 'scales', la: 'scales', do: 'diag', tt: 'diag', il: 'grid', lk: 'dots', za: 'kente', az: 'zellige',
  uz: 'zellige', si: 'snow', sk: 'folk', kh: 'scales', rs: 'folk', lt: 'folk', co: 'stripes', cl: 'stars', mt: 'grid', ro: 'folk', fj: 'waves', ec: 'sun',
  jm: 'stripes', me: 'waves', mv: 'waves', al: 'grid', tn: 'zellige', jo: 'sun', lb: 'grid', cy: 'waves', tz: 'kente', sn: 'kente', gh: 'kente', ng: 'kente',
  mg: 'dots', bt: 'scales', kg: 'sun', my: 'stripes', pk: 'stars', gt: 'kente', cr: 'diag', bo: 'kente', mu: 'waves', uy: 'sun', ve: 'stars', om: 'zellige',
  ae: 'stars', md: 'folk', ad: 'snow', bs: 'waves', world: 'stars',
}

const rgba = (c: string, a: number) => { const [r, g, b] = hex(c); return `rgba(${r}, ${g}, ${b}, ${a})` }

/**
 * A wallpaper: CSS layers over a base colour. `k` scales the pattern and `turn` tilts the striped ones, so two cultures
 * with the same kind of pattern still look different.
 */
export function patternWall(p: Pattern, c1: string, c2: string, base: string, strength: number, k = 1, turn = 0): string {
  const A = rgba(c1, strength), B = rgba(c2, strength * 1.1), S = (n: number) => `${Math.round(n * k)}px`
  switch (p) {
    case 'tartan': return `repeating-linear-gradient(${turn}deg, ${A} 0 ${S(7)}, transparent ${S(7)} ${S(24)}, ${B} ${S(24)} ${S(28)}, transparent ${S(28)} ${S(50)}), repeating-linear-gradient(${90 + turn}deg, ${A} 0 ${S(7)}, transparent ${S(7)} ${S(24)}, ${B} ${S(24)} ${S(28)}, transparent ${S(28)} ${S(50)}), ${base}`
    case 'waves': { const w = `radial-gradient(circle at 50% 100%, ${A} 0 ${S(3)}, transparent ${S(4)} ${S(7)}, ${A} ${S(8)} ${S(10)}, transparent ${S(11)} ${S(14)}, ${B} ${S(15)} ${S(17)}, transparent ${S(18)})`
      return `${w} 0 0 / ${S(36)} ${S(18)}, ${w} ${S(18)} ${S(9)} / ${S(36)} ${S(18)}, ${base}` }
    case 'dots': return `radial-gradient(${A} ${S(3)}, transparent ${S(3.6)}) 0 0 / ${S(24)} ${S(24)}, radial-gradient(${B} ${S(2)}, transparent ${S(2.6)}) ${S(12)} ${S(12)} / ${S(24)} ${S(24)}, ${base}`
    case 'stripes': return `repeating-linear-gradient(${90 + turn}deg, ${A} 0 ${S(16)}, transparent ${S(16)} ${S(32)}, ${B} ${S(32)} ${S(40)}, transparent ${S(40)} ${S(64)}), ${base}`
    case 'diag': return `repeating-linear-gradient(${135 + turn}deg, ${A} 0 ${S(10)}, transparent ${S(10)} ${S(28)}, ${B} ${S(28)} ${S(36)}, transparent ${S(36)} ${S(56)}), ${base}`
    case 'zellige': return `radial-gradient(circle, transparent ${S(5)}, ${B} ${S(6)} ${S(7.5)}, transparent ${S(8.5)}) 0 0 / ${S(30)} ${S(30)}, conic-gradient(from 45deg, ${A} 25%, transparent 0 50%, ${A} 0 75%, transparent 0) 0 0 / ${S(30)} ${S(30)}, ${base}`
    case 'stars': {
      const st = (x: number, y: number, r: number, col: string) => `radial-gradient(${r}px ${r}px at ${x}% ${y}%, ${col}, transparent) 0 0 / ${S(110)} ${S(110)}`
      return [st(18, 22, 2.2, A), st(62, 14, 1.6, B), st(84, 58, 2.6, A), st(36, 70, 1.8, B), st(70, 88, 1.4, A), st(8, 84, 1.8, B), base].join(', ')
    }
    case 'snow': return `radial-gradient(${A} ${S(1.8)}, transparent ${S(2.4)}) 0 0 / ${S(34)} ${S(34)}, radial-gradient(${B} ${S(1.2)}, transparent ${S(1.8)}) ${S(17)} ${S(9)} / ${S(34)} ${S(34)}, radial-gradient(${A} ${S(1)}, transparent ${S(1.5)}) ${S(8)} ${S(24)} / ${S(34)} ${S(34)}, ${base}`
    case 'checks': return `repeating-linear-gradient(0deg, ${A} 0 ${S(14)}, transparent ${S(14)} ${S(28)}), repeating-linear-gradient(90deg, ${A} 0 ${S(14)}, transparent ${S(14)} ${S(28)}), ${base}`
    case 'sun': return `repeating-conic-gradient(from ${turn}deg at 50% -8%, ${A} 0 5deg, transparent 5deg 13deg), radial-gradient(circle at 50% -8%, ${B}, transparent 55%), ${base}`
    case 'folk': return `linear-gradient(45deg, transparent 40%, ${A} 40% 60%, transparent 60%) 0 0 / ${S(16)} ${S(16)}, linear-gradient(-45deg, transparent 40%, ${A} 40% 60%, transparent 60%) 0 0 / ${S(16)} ${S(16)}, repeating-linear-gradient(0deg, transparent 0 ${S(64)}, ${B} ${S(64)} ${S(70)}), ${base}`
    case 'kente': return `repeating-linear-gradient(90deg, ${A} 0 ${S(8)}, ${B} ${S(8)} ${S(16)}, transparent ${S(16)} ${S(40)}), repeating-linear-gradient(0deg, transparent 0 ${S(40)}, ${B} ${S(40)} ${S(48)}), ${base}`
    case 'grid': return `linear-gradient(${A} 1.5px, transparent 1.5px) 0 0 / ${S(26)} ${S(26)}, linear-gradient(90deg, ${A} 1.5px, transparent 1.5px) 0 0 / ${S(26)} ${S(26)}, radial-gradient(${B} ${S(2)}, transparent ${S(2.6)}) ${S(13)} ${S(13)} / ${S(26)} ${S(26)}, ${base}`
    case 'scales': return `radial-gradient(circle at 50% 0, transparent ${S(9)}, ${A} ${S(10)} ${S(11.5)}, transparent ${S(12.5)}) 0 0 / ${S(24)} ${S(12)}, radial-gradient(circle at 50% 0, transparent ${S(9)}, ${B} ${S(10)} ${S(11.5)}, transparent ${S(12.5)}) ${S(12)} ${S(6)} / ${S(24)} ${S(12)}, ${base}`
  }
}

/** The culture's wallpaper for light and dark (its own pattern, scale and tilt). */
export function cultureWall(c: Culture): [string, string] {
  let h = 0
  for (const ch of c.code) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const k = 0.8 + (h % 7) / 10, turn = (h % 5) * 9
  const p = PATTERN[c.code] ?? 'dots'
  const pal = culturePalette(c)
  return [
    patternWall(p, c.a1, c.a2, pal.light[0], 0.12, k, turn),
    patternWall(p, mix(c.a1, '#ffffff', 0.25), mix(c.a2, '#ffffff', 0.2), pal.dark[0], 0.1, k, turn),
  ]
}
