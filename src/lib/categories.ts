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

/** Emoji for a grocery item, guessed from its name (RU / EN / PL / ES stems, most specific first). */
const ITEM_EMOJI: [string[], string][] = [
  [['корм', 'для честера', 'dog food', 'pet food', 'karma', 'pienso'], '🦴'],
  [['лакомств', 'treats', 'przysmak', 'premios'], '🦴'],
  [['туалетн', 'toilet', 'papier toalet', 'papel higi'], '🧻'],
  [['бумажн', 'полотенц', 'paper towel', 'ręcznik', 'toalla'], '🧻'],
  [['зубн', 'toothpaste', 'pasta do zęb', 'pasta de dient'], '🪥'],
  [['шампун', 'shampoo', 'szampon', 'champú'], '🧴'],
  [['мыл', 'soap', 'mydło', 'jabón'], '🧼'],
  [['порош', 'detergent', 'proszek', 'detergente', 'стирк'], '🫧'],
  [['губк', 'sponge', 'gąbk', 'esponja'], '🧽'],
  [['салфет', 'tissue', 'chusteczk', 'pañuel'], '🤧'],
  [['пакет', 'мешк', 'bags', 'worki', 'bolsas'], '🛍️'],
  [['батарейк', 'battery', 'bateri', 'pila'], '🔋'],
  [['лампоч', 'bulb', 'żarów', 'bombilla'], '💡'],
  [['мороженое', 'морожен', 'ice cream', 'lody', 'helado'], '🍦'],
  [['пельмен', 'вареник', 'pierogi', 'dumpling'], '🥟'],
  [['пицц', 'pizza'], '🍕'],
  [['бургер', 'burger'], '🍔'],
  [['суши', 'sushi'], '🍣'],
  [['хамон', 'jamón', 'jamon', 'prosciutto'], '🍖'],
  [['бекон', 'bacon', 'boczek', 'beicon'], '🥓'],
  [['колбас', 'сосиск', 'сардель', 'sausage', 'kiełbas', 'parówk', 'salchich', 'chorizo'], '🌭'],
  [['ветчин', 'ham', 'szynk'], '🍖'],
  [['курин', 'куриц', 'chicken', 'kurczak', 'pollo'], '🍗'],
  [['фарш', 'говяд', 'стейк', 'beef', 'steak', 'mince', 'wołow', 'ternera'], '🥩'],
  [['свинин', 'pork', 'wieprz', 'cerdo'], '🥩'],
  [['мяс', 'meat', 'mięso', 'carne'], '🥩'],
  [['креветк', 'shrimp', 'prawn', 'krewet', 'gamba', 'langostino'], '🦐'],
  [['кальмар', 'осьмин', 'squid', 'octopus', 'kalmar', 'pulpo', 'calamar'], '🦑'],
  [['краб', 'crab', 'krab', 'cangrejo'], '🦀'],
  [['мидии', 'устриц', 'mussel', 'oyster', 'mejill', 'ostra'], '🦪'],
  [['лосос', 'сёмг', 'семг', 'тунец', 'рыб', 'fish', 'salmon', 'tuna', 'ryb', 'łosoś', 'tuńczyk', 'pescado', 'salmón', 'atún'], '🐟'],
  [['яйц', 'egg', 'jaj', 'huevo'], '🥚'],
  [['молок', 'milk', 'mleko', 'leche'], '🥛'],
  [['сливочн', 'масло слив', 'butter', 'masło', 'mantequilla'], '🧈'],
  [['сыр', 'cheese', 'ser ', 'sery', 'queso', 'моцарел', 'пармез', 'mozzarel'], '🧀'],
  [['йогурт', 'кефир', 'творог', 'сметан', 'yog', 'jogurt', 'kefir', 'twaróg', 'śmietan', 'nata'], '🥛'],
  [['круассан', 'croissant', 'cruasán', 'rogal'], '🥐'],
  [['багет', 'baguette', 'bagiet', 'barra'], '🥖'],
  [['лаваш', 'тортиль', 'tortilla', 'wrap'], '🫓'],
  [['блин', 'pancake', 'naleśnik', 'tortita'], '🥞'],
  [['хлеб', 'батон', 'булк', 'bread', 'bun', 'chleb', 'bułk', 'pan ', 'bollo'], '🍞'],
  [['торт', 'пирож', 'cake', 'ciast', 'tarta', 'pastel'], '🍰'],
  [['печень', 'cookie', 'biscuit', 'ciastk', 'galleta'], '🍪'],
  [['шоколад', 'chocolate', 'czekolad'], '🍫'],
  [['конфет', 'candy', 'sweets', 'cukierk', 'caramelo', 'golosin'], '🍬'],
  [['мёд', 'мед ', 'honey', 'miód', 'miel'], '🍯'],
  [['чипс', 'chips', 'crisps', 'patatas fritas'], '🥔'],
  [['попкорн', 'popcorn', 'palomitas'], '🍿'],
  [['орех', 'арахис', 'миндал', 'nut', 'peanut', 'almond', 'orzech', 'migdał', 'nuez', 'almendra', 'cacahuete'], '🥜'],
  [['банан', 'banana', 'plátano', 'platano'], '🍌'],
  [['яблок', 'apple', 'jabł', 'manzan'], '🍎'],
  [['груш', 'pear', 'grusz', 'pera'], '🍐'],
  [['апельсин', 'мандарин', 'orange', 'pomarańcz', 'mandaryn', 'naranja', 'mandarina'], '🍊'],
  [['лимон', 'лайм', 'lemon', 'lime', 'cytryn', 'limón', 'lima'], '🍋'],
  [['виноград', 'grape', 'winogron', 'uva'], '🍇'],
  [['клубник', 'strawberr', 'truskawk', 'fresa'], '🍓'],
  [['черешн', 'вишн', 'cherr', 'wiśni', 'czereśn', 'cereza'], '🍒'],
  [['черник', 'голубик', 'blueberr', 'borówk', 'arándano'], '🫐'],
  [['персик', 'peach', 'brzoskwin', 'melocot'], '🍑'],
  [['ананас', 'pineapple', 'ananas', 'piña'], '🍍'],
  [['манго', 'mango'], '🥭'],
  [['арбуз', 'watermelon', 'arbuz', 'sandía'], '🍉'],
  [['дын', 'melon', 'melón'], '🍈'],
  [['киви', 'kiwi'], '🥝'],
  [['кокос', 'coconut', 'kokos', 'coco'], '🥥'],
  [['авокад', 'avocado', 'awokado', 'aguacate'], '🥑'],
  [['помидор', 'томат', 'tomato', 'pomidor', 'tomate'], '🍅'],
  [['огур', 'cucumber', 'ogór', 'pepino'], '🥒'],
  [['перец', 'pepper', 'papryk', 'pimiento'], '🫑'],
  [['чили', 'халапен', 'chili', 'jalape'], '🌶️'],
  [['кукуруз', 'corn', 'kukurydz', 'maíz'], '🌽'],
  [['морков', 'carrot', 'marchew', 'zanahoria'], '🥕'],
  [['картош', 'картоф', 'potato', 'ziemniak', 'patata'], '🥔'],
  [['баклажан', 'eggplant', 'aubergine', 'bakłażan', 'berenjena'], '🍆'],
  [['брокол', 'broccoli', 'brokuł', 'brócoli'], '🥦'],
  [['капуст', 'салат', 'шпинат', 'cabbage', 'lettuce', 'spinach', 'kapust', 'sałat', 'szpinak', 'lechuga', 'espinaca', 'col '], '🥬'],
  [['чеснок', 'garlic', 'czosn', 'ajo'], '🧄'],
  [['лук', 'onion', 'cebul', 'cebolla'], '🧅'],
  [['гриб', 'шампиньон', 'mushroom', 'grzyb', 'pieczark', 'champiñ', 'seta'], '🍄'],
  [['зелен', 'укроп', 'петрушк', 'базилик', 'кинз', 'herb', 'basil', 'parsley', 'zioł', 'bazyli', 'pietrusz', 'albahaca', 'perejil'], '🌿'],
  [['оливк', 'маслин', 'olive', 'oliwk', 'aceituna'], '🫒'],
  [['масло', 'oil', 'olej', 'oliw', 'aceite'], '🫗'],
  [['рис', 'rice', 'ryż', 'arroz'], '🍚'],
  [['макарон', 'спагетти', 'паст', 'pasta', 'spaghetti', 'makaron'], '🍝'],
  [['лапш', 'noodle', 'ramen', 'fideo'], '🍜'],
  [['мук', 'flour', 'mąk', 'harina'], '🌾'],
  [['гречк', 'овсян', 'хлопь', 'каш', 'oat', 'cereal', 'granola', 'płatki', 'owsian', 'avena', 'cereales'], '🥣'],
  [['сахар', 'sugar', 'cukier', 'azúcar'], '🧂'],
  [['сол', 'специ', 'salt', 'spice', 'sól', 'przypraw', 'sal ', 'especia'], '🧂'],
  [['консерв', 'фасол', 'горош', 'нут', 'canned', 'beans', 'chickpea', 'konserw', 'fasol', 'ciecierzyc', 'lata', 'judía', 'garbanzo', 'lenteja', 'чечевиц'], '🥫'],
  [['соус', 'кетчуп', 'майонез', 'горчиц', 'sauce', 'ketchup', 'mayo', 'mustard', 'sos', 'musztard', 'salsa', 'mostaza'], '🥫'],
  [['кофе', 'coffee', 'kaw', 'café'], '☕️'],
  [['чай', 'tea', 'herbat', 'té '], '🍵'],
  [['пиво', 'beer', 'piwo', 'cerveza'], '🍺'],
  [['шампанск', 'игрист', 'prosecco', 'cava', 'champagne', 'szampan'], '🍾'],
  [['вино', 'wine', 'wino', 'vino'], '🍷'],
  [['виски', 'коньяк', 'водк', 'ром', 'джин', 'ликёр', 'текил', 'алкогол', 'whisk', 'vodka', 'gin', 'rum', 'tequila', 'alcohol', 'alkohol', 'wódk'], '🥃'],
  [['сок', 'juice', 'sok', 'zumo'], '🧃'],
  [['кола', 'газировк', 'лимонад', 'cola', 'soda', 'lemonade', 'napój', 'refresco', 'tonic', 'тоник'], '🥤'],
  [['вод', 'water', 'woda', 'agua'], '💧'],
  [['лёд', 'лед ', 'ice', 'lód', 'hielo'], '🧊'],
  [['лекарств', 'таблет', 'витамин', 'аптек', 'medicine', 'pill', 'vitamin', 'lek', 'tablet', 'witamin', 'medicina', 'pastilla'], '💊'],
  [['подгуз', 'diaper', 'pielusz', 'pañal'], '👶'],
  [['цвет', 'букет', 'flower', 'kwiat', 'flor'], '💐'],
]

export function groceryEmoji(title: string): string | undefined {
  const s = ' ' + title.toLowerCase() + ' '
  return ITEM_EMOJI.find(([stems]) => stems.some((x) => s.includes(x)))?.[1]
}
