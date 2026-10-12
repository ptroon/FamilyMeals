import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';
import { authenticate, optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { Recipe, RecipeIngredient } from '../../types/index.js';
import { lookupUkGovNutrient } from '../services/ukGovFoodNutrients.js';

const router = Router();

// Lookup dynamic macro-nutrients from UK Government CoFID dataset
router.get('/lookup-nutrients', (req, res): void => {
  const item = (req.query.item as string || '').trim();
  const amount = Number(req.query.amount) || 100;
  const unit = (req.query.unit as string || 'g').trim();

  if (!item) {
    res.json({ found: false });
    return;
  }

  const result = lookupUkGovNutrient(item, amount, unit);
  if (result) {
    res.json(result);
  } else {
    res.json({ found: false, item });
  }
});

// Upload image
router.post('/upload-image', authenticate, upload.single('image'), (req: AuthenticatedRequest, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ error: 'No image file uploaded.' });
    return;
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// List recipes
router.get('/', optionalAuthenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user?.id || null;
    const query = (req.query.q as string || '').toLowerCase().trim();
    const filter = (req.query.filter as string || '').trim(); // 'my', 'public', etc.

    let sql = `
      SELECT r.*, u.name as author_name
      FROM recipes r
      JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userId) {
      if (filter === 'my') {
        sql += ` AND r.user_id = ?`;
        params.push(userId);
      } else {
        // Can view public recipes OR user's own private recipes
        sql += ` AND (r.is_public = 1 OR r.user_id = ?)`;
        params.push(userId);
      }
    } else {
      // Non-authenticated: only public
      sql += ` AND r.is_public = 1`;
    }

    if (query) {
      sql += ` AND (LOWER(r.title) LIKE ? OR LOWER(r.description) LIKE ? OR LOWER(r.method) LIKE ?)`;
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }

    sql += ` ORDER BY r.created_at DESC`;

    const rows = db.prepare(sql).all(...params) as any[];

    // Fetch ingredients count for each recipe
    const getCountStmt = db.prepare('SELECT COUNT(*) as count FROM recipe_ingredients WHERE recipe_id = ?');

    const recipes = rows.map(r => ({
      ...r,
      is_public: Boolean(r.is_public),
      ingredients_count: (getCountStmt.get(r.id) as any)?.count || 0
    }));

    res.json({ recipes });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch recipes.' });
  }
});

// Get single recipe with ingredients
router.get('/:id', optionalAuthenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const row = db.prepare(`
      SELECT r.*, u.name as author_name
      FROM recipes r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `).get(id) as any;

    if (!row) {
      res.status(404).json({ error: 'Recipe not found.' });
      return;
    }

    // Access check: if private and not owner and not admin
    if (!row.is_public && (!userId || (row.user_id !== userId && req.user?.role !== 'admin'))) {
      res.status(403).json({ error: 'This recipe is private.' });
      return;
    }

    const ingredients = db.prepare(`
      SELECT * FROM recipe_ingredients
      WHERE recipe_id = ?
      ORDER BY sort_order ASC
    `).all(id) as RecipeIngredient[];

    const recipe: Recipe = {
      ...row,
      is_public: Boolean(row.is_public),
      ingredients
    };

    res.json({ recipe });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch recipe.' });
  }
});

// Create recipe
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const {
      title,
      description = '',
      prep_time_minutes = 0,
      cook_time_minutes = 0,
      servings = 4,
      is_public = true,
      image_url = '',
      method = '',
      calories = 0,
      protein = 0,
      carbohydrates = 0,
      fat = 0,
      ingredients = []
    } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ error: 'Recipe title is required.' });
      return;
    }

    const recipeId = crypto.randomUUID();
    const now = new Date().toISOString();
    const userId = req.user!.id;

    // Calculate aggregated macros if not explicitly provided
    let calcCalories = Number(calories) || 0;
    let calcProtein = Number(protein) || 0;
    let calcCarbs = Number(carbohydrates) || 0;
    let calcFat = Number(fat) || 0;

    if (calcCalories === 0 && ingredients.length > 0) {
      for (const ing of ingredients) {
        calcCalories += Number(ing.calories) || 0;
        calcProtein += Number(ing.protein) || 0;
        calcCarbs += Number(ing.carbohydrates) || 0;
        calcFat += Number(ing.fat) || 0;
      }
    }

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

    db.transaction(() => {
      insertRecipe.run(
        recipeId,
        userId,
        title.trim(),
        description.trim(),
        Number(prep_time_minutes) || 0,
        Number(cook_time_minutes) || 0,
        Number(servings) || 4,
        is_public ? 1 : 0,
        image_url || '',
        method || '',
        calcCalories,
        calcProtein,
        calcCarbs,
        calcFat,
        now,
        now
      );

      ingredients.forEach((ing: any, index: number) => {
        if (!ing.item || !ing.item.trim()) return;
        insertIngredient.run(
          crypto.randomUUID(),
          recipeId,
          ing.item.trim(),
          Number(ing.amount) || 1,
          (ing.unit || '').trim(),
          ing.category || 'Pantry',
          ing.macro_type || '',
          Number(ing.calories) || 0,
          Number(ing.protein) || 0,
          Number(ing.carbohydrates) || 0,
          Number(ing.fat) || 0,
          index
        );
      });
    })();

    res.status(201).json({ id: recipeId, message: 'Recipe created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create recipe.' });
  }
});

// Update recipe
router.put('/:id', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const existing = db.prepare('SELECT user_id FROM recipes WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Recipe not found.' });
      return;
    }

    if (existing.user_id !== userId && userRole !== 'admin') {
      res.status(403).json({ error: 'You do not have permission to edit this recipe.' });
      return;
    }

    const {
      title,
      description = '',
      prep_time_minutes = 0,
      cook_time_minutes = 0,
      servings = 4,
      is_public = true,
      image_url = '',
      method = '',
      calories = 0,
      protein = 0,
      carbohydrates = 0,
      fat = 0,
      ingredients = []
    } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ error: 'Recipe title is required.' });
      return;
    }

    const now = new Date().toISOString();

    let calcCalories = Number(calories) || 0;
    let calcProtein = Number(protein) || 0;
    let calcCarbs = Number(carbohydrates) || 0;
    let calcFat = Number(fat) || 0;

    if (calcCalories === 0 && ingredients.length > 0) {
      for (const ing of ingredients) {
        calcCalories += Number(ing.calories) || 0;
        calcProtein += Number(ing.protein) || 0;
        calcCarbs += Number(ing.carbohydrates) || 0;
        calcFat += Number(ing.fat) || 0;
      }
    }

    const updateRecipe = db.prepare(`
      UPDATE recipes SET
        title = ?, description = ?, prep_time_minutes = ?, cook_time_minutes = ?,
        servings = ?, is_public = ?, image_url = ?, method = ?,
        calories = ?, protein = ?, carbohydrates = ?, fat = ?, updated_at = ?
      WHERE id = ?
    `);

    const deleteIngredients = db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?');

    const insertIngredient = db.prepare(`
      INSERT INTO recipe_ingredients (
        id, recipe_id, item, amount, unit, category, macro_type,
        calories, protein, carbohydrates, fat, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      updateRecipe.run(
        title.trim(),
        description.trim(),
        Number(prep_time_minutes) || 0,
        Number(cook_time_minutes) || 0,
        Number(servings) || 4,
        is_public ? 1 : 0,
        image_url || '',
        method || '',
        calcCalories,
        calcProtein,
        calcCarbs,
        calcFat,
        now,
        id
      );

      deleteIngredients.run(id);

      ingredients.forEach((ing: any, index: number) => {
        if (!ing.item || !ing.item.trim()) return;
        insertIngredient.run(
          crypto.randomUUID(),
          id,
          ing.item.trim(),
          Number(ing.amount) || 1,
          (ing.unit || '').trim(),
          ing.category || 'Pantry',
          ing.macro_type || '',
          Number(ing.calories) || 0,
          Number(ing.protein) || 0,
          Number(ing.carbohydrates) || 0,
          Number(ing.fat) || 0,
          index
        );
      });

      // Synchronize dynamic macro-nutrients in any scheduled meal plans referencing this recipe
      const baseServings = Math.max(Number(servings) || 4, 1);
      db.prepare(`
        UPDATE meal_plan_day_recipes
        SET
          calories = ROUND(? * (servings / ?), 1),
          protein = ROUND(? * (servings / ?), 1),
          carbohydrates = ROUND(? * (servings / ?), 1),
          fat = ROUND(? * (servings / ?), 1)
        WHERE recipe_id = ?
      `).run(calcCalories, baseServings, calcProtein, baseServings, calcCarbs, baseServings, calcFat, baseServings, id);
    })();

    res.json({ message: 'Recipe updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update recipe.' });
  }
});

// Delete recipe
router.delete('/:id', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const existing = db.prepare('SELECT user_id FROM recipes WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Recipe not found.' });
      return;
    }

    if (existing.user_id !== userId && userRole !== 'admin') {
      res.status(403).json({ error: 'You do not have permission to delete this recipe.' });
      return;
    }

    db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
    res.json({ message: 'Recipe deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete recipe.' });
  }
});

export default router;

