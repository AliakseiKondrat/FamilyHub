export const GROCERY_CATS = ['produce', 'dairy', 'meat', 'bakery', 'frozen', 'drinks', 'pantry', 'household', 'pet', 'other'] as const
export const GROCERY_EMOJI: Record<string, string> = {
  produce: '🥦', dairy: '🧀', meat: '🥩', bakery: '🍞', frozen: '🧊', drinks: '🥤',
  pantry: '🥫', household: '🧻', pet: '🐾', other: '🛍️',
}

// Word stems in RU / EN / PL / ES; matched as substrings of the lowercased item.
const STEMS: Record<string, string[]> = {
  produce: ['яблок', 'банан', 'авокад', 'помидор', 'томат', 'огур', 'картош', 'картоф', 'лук', 'морков', 'капуст', 'салат', 'перец', 'лимон', 'апельсин', 'груш', 'виноград', 'ягод', 'клубник', 'зелен', 'укроп', 'петрушк', 'чеснок', 'гриб', 'кабач', 'брокол',
    'apple', 'banana', 'avocado', 'tomato', 'cucumber', 'potato', 'onion', 'carrot', 'lettuce', 'pepper', 'lemon', 'orange', 'grape', 'berr', 'garlic', 'mushroom', 'broccoli',
    'jabł', 'banan', 'pomidor', 'ogór', 'ziemniak', 'cebul', 'marchew', 'sałat', 'papryk', 'cytryn', 'pomarańcz', 'czosn', 'grzyb',
    'manzan', 'plátano', 'platano', 'aguacate', 'tomate', 'pepino', 'patata', 'cebolla', 'zanahoria', 'lechuga', 'pimiento', 'limón', 'naranja', 'uva', 'fresa', 'ajo', 'champiñ'],
  dairy: ['молок', 'кефир', 'сыр', 'творог', 'сметан', 'йогурт', 'масло слив', 'сливк', 'яйц', 'ряженк',
    'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'egg',
    'mleko', 'ser', 'jogurt', 'masło', 'śmietan', 'jaj', 'twaróg', 'kefir',
    'leche', 'queso', 'yogur', 'mantequilla', 'nata', 'huevo'],
  meat: ['мяс', 'куриц', 'курин', 'говяд', 'свинин', 'фарш', 'колбас', 'сосиск', 'ветчин', 'рыб', 'лосос', 'креветк', 'тунец', 'бекон',
    'chicken', 'beef', 'pork', 'mince', 'sausage', 'ham', 'fish', 'salmon', 'shrimp', 'prawn', 'tuna', 'bacon',
    'mięso', 'kurczak', 'wołow', 'wieprz', 'kiełbas', 'szynk', 'ryb', 'łosoś', 'krewet',
    'carne', 'pollo', 'ternera', 'cerdo', 'salchich', 'jamón', 'jamon', 'pescado', 'salmón', 'gamba', 'atún'],
  bakery: ['хлеб', 'батон', 'булк', 'багет', 'лаваш', 'круассан', 'bread', 'baguette', 'bun', 'croissant', 'tortilla',
    'chleb', 'bułk', 'bagiet', 'pan ', 'barra', 'bollo', 'cruasán'],
  frozen: ['морожен', 'пельмен', 'заморож', 'ice cream', 'frozen', 'lody', 'mrożon', 'pierogi', 'helado', 'congelad'],
  drinks: ['вод', 'сок', 'пиво', 'вино', 'кола', 'чай', 'кофе', 'water', 'juice', 'beer', 'wine', 'cola', 'tea', 'coffee',
    'woda', 'sok', 'piwo', 'wino', 'herbat', 'kaw', 'agua', 'zumo', 'cerveza', 'vino', 'té ', 'café'],
  pantry: ['рис', 'макарон', 'паст', 'гречк', 'мук', 'сахар', 'сол', 'масло олив', 'масло подсол', 'консерв', 'соус', 'кетчуп', 'майонез', 'специ', 'овсян', 'хлопь', 'шоколад', 'печень',
    'rice', 'pasta', 'flour', 'sugar', 'salt', 'oil', 'sauce', 'ketchup', 'mayo', 'oat', 'cereal', 'chocolate', 'cookie',
    'ryż', 'makaron', 'mąk', 'cukier', 'sól', 'olej', 'oliw', 'sos', 'płatki', 'czekolad', 'ciastk',
    'arroz', 'harina', 'azúcar', 'sal ', 'aceite', 'salsa', 'avena', 'cereales', 'chocolate', 'galleta'],
  household: ['бумаг', 'полотенц', 'мыл', 'шампун', 'порош', 'губк', 'пакет', 'салфет', 'зубн', 'средство',
    'paper', 'towel', 'soap', 'shampoo', 'detergent', 'sponge', 'bags', 'tissue', 'toothpaste',
    'papier', 'ręcznik', 'mydło', 'szampon', 'proszek', 'gąbk', 'worki', 'chusteczk', 'pasta do zęb',
    'papel', 'toalla', 'jabón', 'champú', 'detergente', 'esponja', 'bolsas', 'pañuel', 'pasta de dientes'],
  pet: ['корм', 'лакомств', 'собак', 'пёс', 'пес', 'для честера', 'dog', 'pet food', 'treats', 'karma', 'pies', 'przysmak', 'pienso', 'perro', 'premios'],
}

export function guessCategory(title: string) {
  const s = ' ' + title.toLowerCase() + ' '
  // Pet first: "корм для собаки" should not land in pantry.
  for (const cat of ['pet', 'household', ...GROCERY_CATS.filter((c) => c !== 'pet' && c !== 'household' && c !== 'other')]) {
    if (STEMS[cat]?.some((stem) => s.includes(stem))) return cat
  }
  return 'other'
}

export const BUDGET_CATS = ['groceries', 'eating', 'home', 'transport', 'fun', 'pet', 'health', 'travel', 'gifts', 'subscriptions', 'salary', 'other'] as const
export const BUDGET_EMOJI: Record<string, string> = {
  groceries: '🛒', eating: '🍽️', home: '🏠', transport: '🚗', fun: '🎉', pet: '🐶', health: '💊',
  travel: '✈️', gifts: '🎁', subscriptions: '📺', salary: '💼', other: '💸',
}
export const BUDGET_COLOR: Record<string, string> = {
  groceries: 'var(--green)', eating: 'var(--orange)', home: 'var(--blue)', transport: 'var(--teal)', fun: 'var(--purple)',
  pet: 'var(--brown)', health: 'var(--red)', travel: 'var(--indigo)', gifts: 'var(--pink)', subscriptions: 'var(--yellow)', salary: 'var(--green)', other: 'var(--gray)',
}
/** Colors for custom categories, assigned by position. */
export const EXTRA_COLORS = ['#ff6482', '#64d2ff', '#ffd426', '#bf5af2', '#30d158', '#ff9f0a', '#5e5ce6', '#ac8e68']

export const PET_EMOJI: Record<string, string> = { vaccine: '💉', parasite: '🕷️', vet: '🩺', groom: '✂️', other: '📌' }
/** Default interval (days) to the next time, by record kind. */
export const PET_INTERVAL: Record<string, number | undefined> = { vaccine: 365, parasite: 30, groom: 60, vet: undefined, other: undefined }

export const ALBUMS = ['us', 'pet', 'travel', 'home', 'dates'] as const
