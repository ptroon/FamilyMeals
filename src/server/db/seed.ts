import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db, initDatabase } from './database.js';

initDatabase();

console.log('[Seed] Seeding sample wholesome family recipes and meal plans...');

const admin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin') as any;
const adminId = admin ? admin.id : crypto.randomUUID();

const sampleRecipes = [
  {
    title: 'Herb-Roasted Chicken with Crispy Potato Wedges',
    description: 'A classic Sunday family dinner with tender, juicy chicken, golden crispy potato wedges, and roasted rosemary vegetables.',
    prep_time_minutes: 20,
    cook_time_minutes: 45,
    servings: 4,
    calories: 520,
    protein: 48,
    carbohydrates: 38,
    fat: 18,
    image_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=800&q=80',
    method: `Preheat your oven to 200°C (400°F). Line a large baking tray with parchment paper.

Pat chicken breasts dry with paper towels. Season generously with sea salt, black pepper, smoked paprika, dried thyme, and 1 tbsp of olive oil.

Wash and cut the potatoes into even wedges. Toss in a large bowl with minced garlic, fresh chopped rosemary, 1 tbsp olive oil, and a pinch of salt.

Arrange the chicken breasts and potato wedges in a single layer on the tray, ensuring they do not overlap so they crisp nicely.

Roast in the center of the oven for 35 to 45 minutes, turning the wedges once halfway through, until chicken reaches 74°C (165°F) internally and potatoes are golden and fork-tender.

Let rest for 5 minutes before serving with a squeeze of fresh lemon juice.`,
    ingredients: [
      { item: 'Chicken breast', amount: 600, unit: 'g', category: 'Meat & Poultry', macro_type: 'protein', calories: 240, protein: 46, carbohydrates: 0, fat: 5 },
      { item: 'Russet potatoes', amount: 700, unit: 'g', category: 'Produce', macro_type: 'carbohydrates', calories: 180, protein: 4, carbohydrates: 36, fat: 0 },
      { item: 'Olive oil', amount: 2, unit: 'tbsp', category: 'Pantry', macro_type: 'fat', calories: 80, protein: 0, carbohydrates: 0, fat: 9 },
      { item: 'Garlic cloves', amount: 4, unit: 'clove', category: 'Produce', macro_type: '', calories: 10, protein: 0.5, carbohydrates: 2, fat: 0 },
      { item: 'Fresh rosemary', amount: 2, unit: 'tbsp', category: 'Produce', macro_type: '', calories: 5, protein: 0, carbohydrates: 0, fat: 0 },
      { item: 'Smoked paprika', amount: 1, unit: 'tsp', category: 'Spices & Seasonings', macro_type: '', calories: 5, protein: 0, carbohydrates: 0, fat: 0 }
    ]
  },
  {
    title: 'Hearty Lentil & Sweet Potato Cottage Pie',
    description: 'A comforting, nutrient-dense plant-powered cottage pie topped with velvety mashed sweet potatoes.',
    prep_time_minutes: 25,
    cook_time_minutes: 40,
    servings: 6,
    calories: 410,
    protein: 19,
    carbohydrates: 62,
    fat: 9,
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    method: `Peel and chop sweet potatoes. Boil in salted water until soft (around 15 minutes), then drain and mash with 1 tbsp olive oil and a dash of nutmeg.

In a large pan, heat olive oil over medium heat. Sauté diced onions, carrots, and celery until softened (6-8 minutes).

Stir in minced garlic, tomato paste, and vegetable broth. Add rinsed brown lentils and dried thyme.

Simmer gently for 25 minutes until lentils are tender and sauce is thick and flavorful. Stir in green peas.

Transfer the lentil mixture into a 9x13 inch casserole dish. Smooth the mashed sweet potatoes evenly over the top, making rustic ridges with a fork.

Bake at 190°C (375°F) for 20-25 minutes until bubbling and lightly golden on top. Let cool 10 minutes before slicing.`,
    ingredients: [
      { item: 'Sweet potatoes', amount: 800, unit: 'g', category: 'Produce', macro_type: 'carbohydrates', calories: 150, protein: 2, carbohydrates: 35, fat: 0 },
      { item: 'Brown lentils', amount: 300, unit: 'g', category: 'Pantry & Grains', macro_type: 'protein', calories: 160, protein: 14, carbohydrates: 24, fat: 1 },
      { item: 'Carrots', amount: 3, unit: 'piece', category: 'Produce', macro_type: '', calories: 25, protein: 1, carbohydrates: 5, fat: 0 },
      { item: 'Brown onion', amount: 1, unit: 'piece', category: 'Produce', macro_type: '', calories: 20, protein: 0.5, carbohydrates: 4, fat: 0 },
      { item: 'Green peas', amount: 150, unit: 'g', category: 'Frozen', macro_type: '', calories: 35, protein: 2, carbohydrates: 6, fat: 0 },
      { item: 'Vegetable broth', amount: 500, unit: 'ml', category: 'Pantry', macro_type: '', calories: 10, protein: 0, carbohydrates: 1, fat: 0 },
      { item: 'Tomato paste', amount: 2, unit: 'tbsp', category: 'Pantry', macro_type: '', calories: 10, protein: 0.5, carbohydrates: 2, fat: 0 }
    ]
  },
  {
    title: 'Pan-Seared Salmon with Garlic Green Beans & Quinoa',
    description: 'Omega-3 rich salmon fillets paired with fluffy quinoa and crisp sautéed garlic green beans.',
    prep_time_minutes: 15,
    cook_time_minutes: 20,
    servings: 4,
    calories: 490,
    protein: 42,
    carbohydrates: 32,
    fat: 21,
    image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80',
    method: `Rinse quinoa thoroughly. Bring 400ml of water to a boil, stir in quinoa and a pinch of salt. Cover, reduce to low heat, and simmer for 15 minutes. Fluff with a fork.

Season salmon fillets with sea salt, black pepper, and lemon zest.

Heat 1 tbsp olive oil in a skillet over medium-high heat. Place salmon skin-side down and sear for 4-5 minutes until skin is crisp. Flip and cook for another 3 minutes. Remove to a warm plate.

In the same skillet, add fresh trimmed green beans and minced garlic with a splash of water. Cover for 3 minutes to steam-sauté until crisp-tender.

Serve each fillet on a bed of warm quinoa with green beans alongside and fresh lemon wedges.`,
    ingredients: [
      { item: 'Salmon fillets', amount: 500, unit: 'g', category: 'Meat & Poultry', macro_type: 'protein', calories: 260, protein: 34, carbohydrates: 0, fat: 14 },
      { item: 'Quinoa', amount: 200, unit: 'g', category: 'Pantry & Grains', macro_type: 'carbohydrates', calories: 170, protein: 6, carbohydrates: 30, fat: 3 },
      { item: 'Green beans', amount: 400, unit: 'g', category: 'Produce', macro_type: '', calories: 30, protein: 2, carbohydrates: 6, fat: 0 },
      { item: 'Garlic cloves', amount: 3, unit: 'clove', category: 'Produce', macro_type: '', calories: 10, protein: 0.5, carbohydrates: 2, fat: 0 },
      { item: 'Olive oil', amount: 1.5, unit: 'tbsp', category: 'Pantry', macro_type: 'fat', calories: 60, protein: 0, carbohydrates: 0, fat: 7 }
    ]
  },
  {
    title: 'Whole Grain Berry & Chia Seed Overnight Oats',
    description: 'An easy, high-fiber make-ahead family breakfast packed with oats, chia seeds, and fresh berries.',
    prep_time_minutes: 10,
    cook_time_minutes: 0,
    servings: 4,
    calories: 340,
    protein: 14,
    carbohydrates: 48,
    fat: 10,
    image_url: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=800&q=80',
    method: `In four individual glass jars or a large mixing bowl, combine rolled oats, chia seeds, and a pinch of cinnamon.

Pour in whole milk or oat milk, and stir in Greek yogurt and honey until thoroughly mixed.

Cover jars with lids and refrigerate for at least 6 hours or overnight.

In the morning, top with fresh blueberries or strawberries and a sprinkle of chopped walnuts before enjoying chilled.`,
    ingredients: [
      { item: 'Rolled oats', amount: 200, unit: 'g', category: 'Pantry & Grains', macro_type: 'carbohydrates', calories: 190, protein: 6, carbohydrates: 34, fat: 3 },
      { item: 'Whole milk', amount: 400, unit: 'ml', category: 'Dairy & Refrigerated', macro_type: 'protein', calories: 65, protein: 3.5, carbohydrates: 5, fat: 3.5 },
      { item: 'Greek yogurt', amount: 200, unit: 'g', category: 'Dairy & Refrigerated', macro_type: 'protein', calories: 50, protein: 5, carbohydrates: 2, fat: 2 },
      { item: 'Chia seeds', amount: 2, unit: 'tbsp', category: 'Pantry & Grains', macro_type: 'fat', calories: 30, protein: 1, carbohydrates: 2, fat: 2 },
      { item: 'Fresh berries', amount: 200, unit: 'g', category: 'Produce', macro_type: 'carbohydrates', calories: 25, protein: 0.5, carbohydrates: 6, fat: 0 },
      { item: 'Honey', amount: 2, unit: 'tbsp', category: 'Pantry', macro_type: 'carbohydrates', calories: 30, protein: 0, carbohydrates: 8, fat: 0 }
    ]
  }
];

const now = new Date().toISOString();

const insertRecipe = db.prepare(`
  INSERT INTO recipes (
    id, user_id, title, description, prep_time_minutes, cook_time_minutes,
    servings, is_public, image_url, method, calories, protein, carbohydrates, fat,
    created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertIngredient = db.prepare(`
  INSERT INTO recipe_ingredients (
    id, recipe_id, item, amount, unit, category, macro_type,
    calories, protein, carbohydrates, fat, sort_order
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const createdRecipeIds: string[] = [];

for (const r of sampleRecipes) {
  // Check if title already exists
  const existing = db.prepare('SELECT id FROM recipes WHERE title = ?').get(r.title) as any;
  if (existing) {
    createdRecipeIds.push(existing.id);
    continue;
  }

  const recipeId = crypto.randomUUID();
  createdRecipeIds.push(recipeId);

  insertRecipe.run(
    recipeId,
    adminId,
    r.title,
    r.description,
    r.prep_time_minutes,
    r.cook_time_minutes,
    r.servings,
    1,
    r.image_url,
    r.method,
    r.calories,
    r.protein,
    r.carbohydrates,
    r.fat,
    now,
    now
  );

  r.ingredients.forEach((ing, idx) => {
    insertIngredient.run(
      crypto.randomUUID(),
      recipeId,
      ing.item,
      ing.amount,
      ing.unit,
      ing.category,
      ing.macro_type,
      ing.calories,
      ing.protein,
      ing.carbohydrates,
      ing.fat,
      idx
    );
  });
}

console.log(`[Seed] Seeded ${createdRecipeIds.length} recipes.`);

// Seed a sample meal plan if none exists
const planCount = (db.prepare('SELECT COUNT(*) as count FROM meal_plans').get() as any).count;
if (planCount === 0 && createdRecipeIds.length >= 3) {
  const planId = crypto.randomUUID();
  const today = new Date();
  const startStr = today.toISOString().split('T')[0];
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 6);
  const endStr = nextWeek.toISOString().split('T')[0];
  const shareToken = crypto.randomBytes(6).toString('hex');

  db.prepare(`
    INSERT INTO meal_plans (id, user_id, name, start_date, end_date, is_public, share_token, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    planId,
    adminId,
    `Meal Plan for ${startStr} to ${endStr}`,
    startStr,
    endStr,
    1,
    shareToken,
    'Wholesome weekly family plan with homemade dinners and breakfast prep',
    now,
    now
  );

  const insertDay = db.prepare(`
    INSERT INTO meal_plan_days (id, meal_plan_id, date, slot, meal_name, is_blank, blank_reason, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDayRecipe = db.prepare(`
    INSERT INTO meal_plan_day_recipes (id, day_id, recipe_id, custom_item_name, servings, calories, protein, carbohydrates, fat, custom_ingredients)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < 7; i++) {
    const curDate = new Date(today);
    curDate.setDate(curDate.getDate() + i);
    const dateStr = curDate.toISOString().split('T')[0];

    // Day slot 1: Breakfast
    const bDayId = crypto.randomUUID();
    insertDay.run(bDayId, planId, dateStr, 'breakfast', 'Wholesome Breakfast', 0, '', 0);
    insertDayRecipe.run(crypto.randomUUID(), bDayId, createdRecipeIds[3], '', 4, 340, 14, 48, 10, '[]');

    // Day slot 2: Dinner
    const dDayId = crypto.randomUUID();
    if (i === 5) {
      // Saturday: Blank slot with reason as specified in requirements!
      insertDay.run(dDayId, planId, dateStr, 'dinner', 'Family Dinner', 1, "Eating out at Grandma's for Sunday roast preview", 1);
    } else {
      const recIdx = i % 3; // alternate chicken, cottage pie, salmon
      const rec = sampleRecipes[recIdx];
      insertDay.run(dDayId, planId, dateStr, 'dinner', 'Family Dinner', 0, '', 1);
      insertDayRecipe.run(crypto.randomUUID(), dDayId, createdRecipeIds[recIdx], '', 4, rec.calories, rec.protein, rec.carbohydrates, rec.fat, '[]');
    }
  }

  console.log('[Seed] Seeded sample weekly meal plan with scheduled days and blank comment slot!');
}

console.log('[Seed] Seeding completed.');
