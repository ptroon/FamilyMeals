// UK Government (Office for Health Improvement and Disparities / PHE)
// McCance and Widdowson's The Composition of Foods Integrated Dataset (CoFID) Reference Nutrition Data

export interface CofidFoodEntry {
  names: string[]; // Variations/aliases to match
  displayName: string;
  category: string;
  macroType: 'protein' | 'carbohydrates' | 'fat' | 'mixed' | '';
  // Per 100g values according to UK CoFID
  kcal100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  // Weight in grams of 1 "piece" / "item" / "portion" if applicable
  pieceGrams?: number;
}

export const UK_GOV_COFID_FOODS: CofidFoodEntry[] = [
  // --- Poultry & Meats ---
  {
    names: ['chicken breast', 'chicken breasts', 'chicken fillet', 'chicken fillets', 'skinless chicken breast'],
    displayName: 'Chicken Breast (raw, skinless)',
    category: 'Meat & Poultry',
    macroType: 'protein',
    kcal100g: 106,
    protein100g: 24.0,
    carbs100g: 0.0,
    fat100g: 1.1,
    pieceGrams: 160
  },
  {
    names: ['chicken thigh', 'chicken thighs', 'chicken'],
    displayName: 'Chicken Thigh (raw, skinless)',
    category: 'Meat & Poultry',
    macroType: 'protein',
    kcal100g: 133,
    protein100g: 19.5,
    carbs100g: 0.0,
    fat100g: 6.0,
    pieceGrams: 120
  },
  {
    names: ['lean minced beef', 'mince', 'ground beef', 'beef mince', 'minced beef'],
    displayName: 'Minced Beef (lean, ~5% fat)',
    category: 'Meat & Poultry',
    macroType: 'protein',
    kcal100g: 137,
    protein100g: 21.4,
    carbs100g: 0.0,
    fat100g: 5.4,
    pieceGrams: 125
  },
  {
    names: ['beef steak', 'steak', 'sirloin', 'rump steak', 'ribeye'],
    displayName: 'Beef Steak (lean, trimmed)',
    category: 'Meat & Poultry',
    macroType: 'protein',
    kcal100g: 143,
    protein100g: 22.8,
    carbs100g: 0.0,
    fat100g: 5.6,
    pieceGrams: 200
  },
  {
    names: ['pork chop', 'pork loin', 'pork loin chop', 'pork'],
    displayName: 'Pork Loin (lean, raw)',
    category: 'Meat & Poultry',
    macroType: 'protein',
    kcal100g: 139,
    protein100g: 22.1,
    carbs100g: 0.0,
    fat100g: 5.4,
    pieceGrams: 150
  },
  {
    names: ['turkey breast', 'turkey mince', 'turkey'],
    displayName: 'Turkey Breast (skinless, raw)',
    category: 'Meat & Poultry',
    macroType: 'protein',
    kcal100g: 104,
    protein100g: 24.6,
    carbs100g: 0.0,
    fat100g: 0.7,
    pieceGrams: 160
  },
  {
    names: ['bacon', 'back bacon', 'streaky bacon', 'rashers'],
    displayName: 'Back Bacon (raw)',
    category: 'Meat & Poultry',
    macroType: 'fat',
    kcal100g: 243,
    protein100g: 16.5,
    carbs100g: 0.5,
    fat100g: 19.4,
    pieceGrams: 35
  },
  {
    names: ['sausage', 'sausages', 'pork sausages'],
    displayName: 'Pork Sausages',
    category: 'Meat & Poultry',
    macroType: 'fat',
    kcal100g: 268,
    protein100g: 13.0,
    carbs100g: 9.5,
    fat100g: 20.0,
    pieceGrams: 60
  },

  // --- Fish & Seafood ---
  {
    names: ['salmon fillet', 'salmon fillets', 'salmon', 'fresh salmon'],
    displayName: 'Atlantic Salmon (raw)',
    category: 'Meat & Poultry',
    macroType: 'protein',
    kcal100g: 180,
    protein100g: 20.4,
    carbs100g: 0.0,
    fat100g: 11.0,
    pieceGrams: 130
  },
  {
    names: ['cod fillet', 'cod', 'white fish', 'haddock'],
    displayName: 'Cod Fillet (raw)',
    category: 'Meat & Poultry',
    macroType: 'protein',
    kcal100g: 78,
    protein100g: 17.5,
    carbs100g: 0.0,
    fat100g: 0.7,
    pieceGrams: 140
  },
  {
    names: ['tuna', 'canned tuna', 'tuna in spring water', 'tuna steak'],
    displayName: 'Tuna (canned in spring water, drained)',
    category: 'Meat & Poultry',
    macroType: 'protein',
    kcal100g: 109,
    protein100g: 24.9,
    carbs100g: 0.0,
    fat100g: 1.0,
    pieceGrams: 120
  },
  {
    names: ['prawns', 'king prawns', 'shrimp'],
    displayName: 'King Prawns (raw, peeled)',
    category: 'Meat & Poultry',
    macroType: 'protein',
    kcal100g: 71,
    protein100g: 15.4,
    carbs100g: 0.5,
    fat100g: 0.8,
    pieceGrams: 20
  },

  // --- Dairy & Eggs ---
  {
    names: ['egg', 'eggs', 'whole egg', 'chicken egg'],
    displayName: 'Whole Egg (medium)',
    category: 'Dairy & Refrigerated',
    macroType: 'protein',
    kcal100g: 131,
    protein100g: 12.6,
    carbs100g: 0.0,
    fat100g: 9.0,
    pieceGrams: 53 // 1 medium UK egg ~ 53g
  },
  {
    names: ['semi-skimmed milk', 'milk', 'cow milk'],
    displayName: 'Semi-skimmed Milk',
    category: 'Dairy & Refrigerated',
    macroType: 'protein',
    kcal100g: 47,
    protein100g: 3.6,
    carbs100g: 4.7,
    fat100g: 1.7,
    pieceGrams: 250 // glass
  },
  {
    names: ['whole milk', 'full fat milk'],
    displayName: 'Whole Milk',
    category: 'Dairy & Refrigerated',
    macroType: 'mixed',
    kcal100g: 64,
    protein100g: 3.4,
    carbs100g: 4.6,
    fat100g: 3.6,
    pieceGrams: 250
  },
  {
    names: ['cheddar cheese', 'cheddar', 'mature cheddar', 'cheese'],
    displayName: 'Cheddar Cheese',
    category: 'Dairy & Refrigerated',
    macroType: 'fat',
    kcal100g: 416,
    protein100g: 25.4,
    carbs100g: 0.1,
    fat100g: 34.9,
    pieceGrams: 30 // portion
  },
  {
    names: ['mozzarella', 'fresh mozzarella'],
    displayName: 'Mozzarella Cheese',
    category: 'Dairy & Refrigerated',
    macroType: 'fat',
    kcal100g: 238,
    protein100g: 18.0,
    carbs100g: 2.0,
    fat100g: 17.5,
    pieceGrams: 125 // ball
  },
  {
    names: ['greek yogurt', 'greek yoghurt', 'natural yogurt', 'yoghurt'],
    displayName: 'Greek Style Natural Yogurt (0% or low fat)',
    category: 'Dairy & Refrigerated',
    macroType: 'protein',
    kcal100g: 57,
    protein100g: 9.0,
    carbs100g: 4.0,
    fat100g: 0.5,
    pieceGrams: 150
  },
  {
    names: ['butter', 'salted butter', 'unsalted butter'],
    displayName: 'Butter',
    category: 'Dairy & Refrigerated',
    macroType: 'fat',
    kcal100g: 744,
    protein100g: 0.6,
    carbs100g: 0.6,
    fat100g: 82.2,
    pieceGrams: 10
  },

  // --- Vegetables & Produce ---
  {
    names: ['russet potatoes', 'potatoes', 'potato', 'baking potato', 'white potato'],
    displayName: 'Potatoes (raw, flesh and skin)',
    category: 'Produce',
    macroType: 'carbohydrates',
    kcal100g: 75,
    protein100g: 1.9,
    carbs100g: 16.8,
    fat100g: 0.1,
    pieceGrams: 175 // 1 medium potato
  },
  {
    names: ['potato fries', 'fries', 'chips', 'potato wedges', 'oven chips'],
    displayName: 'Potato Fries / Wedges (oven baked)',
    category: 'Produce',
    macroType: 'carbohydrates',
    kcal100g: 158,
    protein100g: 2.6,
    carbs100g: 27.5,
    fat100g: 4.1,
    pieceGrams: 150
  },
  {
    names: ['sweet potatoes', 'sweet potato', 'yam'],
    displayName: 'Sweet Potatoes (raw)',
    category: 'Produce',
    macroType: 'carbohydrates',
    kcal100g: 84,
    protein100g: 1.2,
    carbs100g: 20.1,
    fat100g: 0.1,
    pieceGrams: 200
  },
  {
    names: ['onion', 'brown onion', 'onions', 'red onion'],
    displayName: 'Onion (raw)',
    category: 'Produce',
    macroType: '',
    kcal100g: 37,
    protein100g: 1.2,
    carbs100g: 7.5,
    fat100g: 0.1,
    pieceGrams: 140
  },
  {
    names: ['carrots', 'carrot'],
    displayName: 'Carrots (raw)',
    category: 'Produce',
    macroType: '',
    kcal100g: 35,
    protein100g: 0.7,
    carbs100g: 7.7,
    fat100g: 0.2,
    pieceGrams: 80
  },
  {
    names: ['garlic cloves', 'garlic', 'clove garlic', 'cloves'],
    displayName: 'Garlic (raw cloves)',
    category: 'Produce',
    macroType: '',
    kcal100g: 98,
    protein100g: 7.9,
    carbs100g: 16.3,
    fat100g: 0.6,
    pieceGrams: 4 // 1 clove ~ 4g
  },
  {
    names: ['green beans', 'fine green beans', 'string beans'],
    displayName: 'Green Beans (raw)',
    category: 'Produce',
    macroType: '',
    kcal100g: 25,
    protein100g: 1.8,
    carbs100g: 3.6,
    fat100g: 0.2,
    pieceGrams: 80
  },
  {
    names: ['broccoli', 'broccoli florets'],
    displayName: 'Broccoli (raw)',
    category: 'Produce',
    macroType: '',
    kcal100g: 32,
    protein100g: 3.2,
    carbs100g: 3.8,
    fat100g: 0.6,
    pieceGrams: 300 // 1 head
  },
  {
    names: ['spinach', 'baby spinach'],
    displayName: 'Spinach (fresh, raw)',
    category: 'Produce',
    macroType: '',
    kcal100g: 25,
    protein100g: 2.8,
    carbs100g: 1.6,
    fat100g: 0.8,
    pieceGrams: 100
  },
  {
    names: ['mushrooms', 'button mushrooms', 'chestnut mushrooms'],
    displayName: 'Mushrooms (raw)',
    category: 'Produce',
    macroType: '',
    kcal100g: 16,
    protein100g: 2.2,
    carbs100g: 0.4,
    fat100g: 0.5,
    pieceGrams: 20
  },
  {
    names: ['tomatoes', 'tomato', 'cherry tomatoes'],
    displayName: 'Tomatoes (standard, raw)',
    category: 'Produce',
    macroType: '',
    kcal100g: 18,
    protein100g: 0.9,
    carbs100g: 3.1,
    fat100g: 0.1,
    pieceGrams: 85
  },
  {
    names: ['bell pepper', 'peppers', 'red pepper', 'green pepper'],
    displayName: 'Bell Pepper (raw)',
    category: 'Produce',
    macroType: '',
    kcal100g: 26,
    protein100g: 1.0,
    carbs100g: 4.8,
    fat100g: 0.2,
    pieceGrams: 160
  },
  {
    names: ['green peas', 'frozen peas', 'peas'],
    displayName: 'Green Peas (frozen, boiled)',
    category: 'Frozen',
    macroType: '',
    kcal100g: 78,
    protein100g: 5.5,
    carbs100g: 10.6,
    fat100g: 1.3,
    pieceGrams: 80
  },
  {
    names: ['fresh berries', 'berries', 'blueberries', 'strawberries', 'raspberries'],
    displayName: 'Mixed Berries (fresh)',
    category: 'Produce',
    macroType: 'carbohydrates',
    kcal100g: 38,
    protein100g: 0.9,
    carbs100g: 7.7,
    fat100g: 0.3,
    pieceGrams: 150
  },

  // --- Grains, Bakery & Pantry ---
  {
    names: ['rolled oats', 'oats', 'porridge oats'],
    displayName: 'Rolled Oats (raw dry)',
    category: 'Pantry & Grains',
    macroType: 'carbohydrates',
    kcal100g: 375,
    protein100g: 11.0,
    carbs100g: 60.0,
    fat100g: 8.0,
    pieceGrams: 40 // portion
  },
  {
    names: ['flour', 'plain flour', 'all-purpose flour', 'white flour', 'self-raising flour'],
    displayName: 'White Wheat Flour',
    category: 'Pantry & Grains',
    macroType: 'carbohydrates',
    kcal100g: 351,
    protein100g: 10.3,
    carbs100g: 73.4,
    fat100g: 1.4,
    pieceGrams: 125 // cup
  },
  {
    names: ['white rice', 'rice', 'basmati rice', 'jasmine rice'],
    displayName: 'Basmati White Rice (dry weight)',
    category: 'Pantry & Grains',
    macroType: 'carbohydrates',
    kcal100g: 356,
    protein100g: 8.5,
    carbs100g: 77.0,
    fat100g: 0.6,
    pieceGrams: 75 // portion
  },
  {
    names: ['brown rice', 'wholegrain rice'],
    displayName: 'Brown Rice (dry weight)',
    category: 'Pantry & Grains',
    macroType: 'carbohydrates',
    kcal100g: 345,
    protein100g: 8.0,
    carbs100g: 72.0,
    fat100g: 2.2,
    pieceGrams: 75
  },
  {
    names: ['pasta', 'penne', 'spaghetti', 'fusilli'],
    displayName: 'Pasta (standard dry weight)',
    category: 'Pantry & Grains',
    macroType: 'carbohydrates',
    kcal100g: 355,
    protein100g: 12.0,
    carbs100g: 72.0,
    fat100g: 1.5,
    pieceGrams: 75
  },
  {
    names: ['quinoa', 'white quinoa'],
    displayName: 'Quinoa (dry weight)',
    category: 'Pantry & Grains',
    macroType: 'carbohydrates',
    kcal100g: 368,
    protein100g: 14.1,
    carbs100g: 64.2,
    fat100g: 6.1,
    pieceGrams: 60
  },
  {
    names: ['brown lentils', 'lentils', 'green lentils', 'red lentils'],
    displayName: 'Lentils (dry weight)',
    category: 'Pantry & Grains',
    macroType: 'protein',
    kcal100g: 338,
    protein100g: 24.0,
    carbs100g: 52.0,
    fat100g: 1.5,
    pieceGrams: 60
  },
  {
    names: ['bread', 'wholemeal bread', 'white bread', 'sliced bread', 'toast'],
    displayName: 'Bread (average sliced)',
    category: 'Bakery',
    macroType: 'carbohydrates',
    kcal100g: 235,
    protein100g: 9.0,
    carbs100g: 44.0,
    fat100g: 1.8,
    pieceGrams: 38 // 1 slice
  },

  // --- Oils, Fats & Condiments ---
  {
    names: ['olive oil', 'extra virgin olive oil', 'vegetable oil', 'sunflower oil', 'cooking oil'],
    displayName: 'Olive Oil',
    category: 'Pantry',
    macroType: 'fat',
    kcal100g: 899,
    protein100g: 0.0,
    carbs100g: 0.0,
    fat100g: 99.9,
    pieceGrams: 14 // 1 tbsp ~ 14g
  },
  {
    names: ['chia seeds', 'chia seed'],
    displayName: 'Chia Seeds',
    category: 'Pantry & Grains',
    macroType: 'fat',
    kcal100g: 486,
    protein100g: 16.5,
    carbs100g: 42.1,
    fat100g: 30.7,
    pieceGrams: 12 // 1 tbsp
  },
  {
    names: ['honey'],
    displayName: 'Honey',
    category: 'Pantry',
    macroType: 'carbohydrates',
    kcal100g: 304,
    protein100g: 0.3,
    carbs100g: 82.4,
    fat100g: 0.0,
    pieceGrams: 21 // 1 tbsp
  },
  {
    names: ['tomato paste', 'tomato puree'],
    displayName: 'Tomato Puree / Paste',
    category: 'Pantry',
    macroType: '',
    kcal100g: 78,
    protein100g: 4.4,
    carbs100g: 13.8,
    fat100g: 0.6,
    pieceGrams: 16 // 1 tbsp
  },
  {
    names: ['canned chopped tomatoes', 'crushed tomatoes', 'canned tomatoes', 'tin tomatoes'],
    displayName: 'Canned Chopped Tomatoes',
    category: 'Canned & Jarred',
    macroType: '',
    kcal100g: 21,
    protein100g: 1.1,
    carbs100g: 3.5,
    fat100g: 0.2,
    pieceGrams: 400 // 1 tin
  },
  {
    names: ['vegetable broth', 'vegetable stock', 'chicken broth', 'chicken stock'],
    displayName: 'Vegetable / Chicken Broth',
    category: 'Pantry',
    macroType: '',
    kcal100g: 7,
    protein100g: 0.4,
    carbs100g: 0.8,
    fat100g: 0.2,
    pieceGrams: 250 // cup
  }
];

// Helper to convert units to weight in grams
export function estimateGrams(amount: number, unit: string, entry: CofidFoodEntry): number {
  const u = (unit || '').trim().toLowerCase();
  const amt = Number(amount) || 1;

  switch (u) {
    case 'g':
    case 'gram':
    case 'grams':
      return amt;
    case 'kg':
    case 'kilogram':
    case 'kilograms':
      return amt * 1000;
    case 'ml':
    case 'milliliter':
    case 'milliliters':
      return amt; // approx 1ml = 1g for water/milk/broth
    case 'l':
    case 'liter':
    case 'liters':
      return amt * 1000;
    case 'tbsp':
    case 'tablespoon':
    case 'tablespoons':
      return amt * 15; // 1 tbsp ~ 15g
    case 'tsp':
    case 'teaspoon':
    case 'teaspoons':
      return amt * 5; // 1 tsp ~ 5g
    case 'cup':
    case 'cups':
      return amt * (entry.category === 'Produce' ? 150 : 200); // 1 cup approx 150-200g
    case 'clove':
    case 'cloves':
      return amt * 4;
    case 'can':
    case 'cans':
    case 'tin':
    case 'tins':
      return amt * (entry.pieceGrams || 400);
    case 'slice':
    case 'slices':
      return amt * (entry.pieceGrams || 38);
    case 'piece':
    case 'pieces':
    case 'item':
    case 'items':
    case 'portion':
    case 'portions':
    case '':
      return amt * (entry.pieceGrams || 100);
    default:
      return amt;
  }
}

// Find closest UK CoFID entry
export function lookupUkGovNutrient(itemName: string, amount: number = 100, unit: string = 'g') {
  if (!itemName || !itemName.trim()) {
    return null;
  }

  const query = itemName.trim().toLowerCase();

  // 1. Direct or alias match
  let matched = UK_GOV_COFID_FOODS.find(entry =>
    entry.names.some(alias => alias === query || query === alias)
  );

  // 2. Partial substring match
  if (!matched) {
    matched = UK_GOV_COFID_FOODS.find(entry =>
      entry.names.some(alias => query.includes(alias) || alias.includes(query))
    );
  }

  // 3. Word token overlap
  if (!matched) {
    const tokens = query.split(/\s+/).filter(t => t.length > 2);
    matched = UK_GOV_COFID_FOODS.find(entry =>
      tokens.some(token => entry.names.some(alias => alias.includes(token)))
    );
  }

  if (!matched) {
    return null;
  }

  const grams = estimateGrams(amount, unit, matched);
  const factor = grams / 100;

  return {
    found: true,
    item: itemName,
    matchedFood: matched.displayName,
    source: 'UK Government CoFID (Composition of Foods Integrated Dataset)',
    amount,
    unit,
    category: matched.category,
    macro_type: matched.macroType,
    calories: Math.round(matched.kcal100g * factor),
    protein: Math.round(matched.protein100g * factor * 10) / 10,
    carbohydrates: Math.round(matched.carbs100g * factor * 10) / 10,
    fat: Math.round(matched.fat100g * factor * 10) / 10
  };
}

