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

/** [background, card, pressed card, tint] for light and dark, built from the culture's colours. */
export function culturePalette(c: Culture): { light: [string, string, string, string]; dark: [string, string, string, string] } {
  return {
    light: [mix(c.a1, '#ffffff', 0.9), '#ffffff', mix(c.a1, '#ffffff', 0.82), mix(c.a1, '#000000', 0.12)],
    dark: [mix(c.a1, '#000000', 0.9), mix(c.a1, '#000000', 0.82), mix(c.a1, '#000000', 0.72), mix(c.a1, '#ffffff', 0.35)],
  }
}
