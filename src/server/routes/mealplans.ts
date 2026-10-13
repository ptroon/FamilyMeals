import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';
import { authenticate, optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { MealPlan, MealPlanDay, MealPlanDayRecipe } from '../../types/index.js';

const router = Router();

function generateShareToken(): string {
  return crypto.randomBytes(6).toString('hex'); // 12-char unique token
}

// Format default name
function getDefaultPlanName(startDate: string, endDate: string): string {
  return `Meal Plan for ${startDate} to ${endDate}`;
}

// Calculate days between two dates
function getDayOffset(d1Str: string, d2Str: string): number {
  const d1 = new Date(d1Str + 'T00:00:00Z');
  const d2 = new Date(d2Str + 'T00:00:00Z');
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

// Add days to date string (YYYY-MM-DD)
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

// List meal plans
router.get('/', optionalAuthenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user?.id || null;
    const filter = (req.query.filter as string || '').trim();

    let sql = `
      SELECT p.*, u.name as author_name,
        (SELECT COUNT(*) FROM meal_plan_days d 
         JOIN meal_plan_day_recipes r ON d.id = r.day_id 
         WHERE d.meal_plan_id = p.id) as total_meals_count,
        (SELECT COUNT(*) FROM shopping_lists s WHERE s.meal_plan_id = p.id) as has_shopping_list
      FROM meal_plans p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userId) {
      if (filter === 'my') {
        sql += ` AND p.user_id = ?`;
        params.push(userId);
      } else {
        sql += ` AND (p.is_public = 1 OR p.user_id = ?)`;
        params.push(userId);
      }
    } else {
      sql += ` AND p.is_public = 1`;
    }

    sql += ` ORDER BY p.start_date DESC, p.created_at DESC`;

    const rows = db.prepare(sql).all(...params) as any[];

    const mealPlans = rows.map(r => ({
      ...r,
      is_public: Boolean(r.is_public),
      has_shopping_list: Boolean(r.has_shopping_list)
    }));

    res.json({ mealPlans });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch meal plans.' });
  }
});

// Get single meal plan with all days, slots, and recipes
router.get('/:id', optionalAuthenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const planRow = db.prepare(`
      SELECT p.*, u.name as author_name
      FROM meal_plans p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(id) as any;

    if (!planRow) {
      res.status(404).json({ error: 'Meal plan not found.' });
      return;
    }

    if (!planRow.is_public && (!userId || (planRow.user_id !== userId && req.user?.role !== 'admin'))) {
      res.status(403).json({ error: 'This meal plan is private.' });
      return;
    }

    const dayRows = db.prepare(`
      SELECT * FROM meal_plan_days
      WHERE meal_plan_id = ?
      ORDER BY date ASC, slot ASC
    `).all(id) as any[];

    const dayRecipeStmt = db.prepare(`
      SELECT dr.*, r.title as recipe_title, r.image_url as recipe_image, r.prep_time_minutes, r.cook_time_minutes
      FROM meal_plan_day_recipes dr
      LEFT JOIN recipes r ON dr.recipe_id = r.id
      WHERE dr.day_id = ?
    `);

    const days: MealPlanDay[] = dayRows.map(day => {
      const recipesRaw = dayRecipeStmt.all(day.id) as any[];
      const recipes: MealPlanDayRecipe[] = recipesRaw.map(r => ({
        id: r.id,
        day_id: r.day_id,
        recipe_id: r.recipe_id,
        recipe: r.recipe_id ? {
          id: r.recipe_id,
          title: r.recipe_title,
          image_url: r.recipe_image,
          prep_time_minutes: r.prep_time_minutes,
          cook_time_minutes: r.cook_time_minutes
        } as any : undefined,
        custom_item_name: r.custom_item_name,
        servings: r.servings,
        calories: r.calories,
        protein: r.protein,
        carbohydrates: r.carbohydrates,
        fat: r.fat,
        custom_ingredients: JSON.parse(r.custom_ingredients || '[]')
      }));

      return {
        id: day.id,
        meal_plan_id: day.meal_plan_id,
        date: day.date,
        slot: day.slot,
        meal_name: day.meal_name,
        is_blank: Boolean(day.is_blank),
        blank_reason: day.blank_reason,
        sort_order: day.sort_order,
        recipes
      };
    });

    const shoppingListExists = db.prepare('SELECT id FROM shopping_lists WHERE meal_plan_id = ?').get(id);

    const mealPlan: MealPlan = {
      ...planRow,
      is_public: Boolean(planRow.is_public),
      has_shopping_list: Boolean(shoppingListExists),
      days
    };

    res.json({ mealPlan });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch meal plan.' });
  }
});

// Create meal plan
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const {
      name,
      start_date,
      end_date,
      is_public = true,
      notes = '',
      days = []
    } = req.body;

    if (!start_date || !end_date) {
      res.status(400).json({ error: 'Start date and End date are required.' });
      return;
    }

    if (new Date(end_date) < new Date(start_date)) {
      res.status(400).json({ error: 'End date cannot be earlier than start date.' });
      return;
    }

    const planName = (name && name.trim()) ? name.trim() : getDefaultPlanName(start_date, end_date);
    const planId = crypto.randomUUID();
    const shareToken = generateShareToken();
    const now = new Date().toISOString();
    const userId = req.user!.id;

    const insertPlan = db.prepare(`
      INSERT INTO meal_plans (
        id, user_id, name, start_date, end_date, is_public, share_token, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertDay = db.prepare(`
      INSERT INTO meal_plan_days (
        id, meal_plan_id, date, slot, meal_name, is_blank, blank_reason, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertDayRecipe = db.prepare(`
      INSERT INTO meal_plan_day_recipes (
        id, day_id, recipe_id, custom_item_name, servings, calories, protein, carbohydrates, fat, custom_ingredients
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      insertPlan.run(
        planId,
        userId,
        planName,
        start_date,
        end_date,
        is_public ? 1 : 0,
        shareToken,
        notes,
        now,
        now
      );

      for (const day of days) {
        const dayId = crypto.randomUUID();
        insertDay.run(
          dayId,
          planId,
          day.date,
          day.slot || 'dinner',
          day.meal_name || '',
          day.is_blank ? 1 : 0,
          day.blank_reason || '',
          day.sort_order || 0
        );

        if (!day.is_blank && Array.isArray(day.recipes)) {
          for (const item of day.recipes) {
            insertDayRecipe.run(
              crypto.randomUUID(),
              dayId,
              item.recipe_id || null,
              item.custom_item_name || '',
              Number(item.servings) || 1,
              Number(item.calories) || 0,
              Number(item.protein) || 0,
              Number(item.carbohydrates) || 0,
              Number(item.fat) || 0,
              JSON.stringify(item.custom_ingredients || [])
            );
          }
        }
      }
    })();

    res.status(201).json({ id: planId, share_token: shareToken, message: 'Meal plan created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create meal plan.' });
  }
});

// Update meal plan (full update with days)
router.put('/:id', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const existing = db.prepare('SELECT user_id, share_token FROM meal_plans WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Meal plan not found.' });
      return;
    }

    if (existing.user_id !== userId && userRole !== 'admin') {
      res.status(403).json({ error: 'Permission denied.' });
      return;
    }

    const {
      name,
      start_date,
      end_date,
      is_public = true,
      notes = '',
      days = []
    } = req.body;

    if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
      res.status(400).json({ error: 'End date cannot be earlier than start date.' });
      return;
    }

    const planName = (name && name.trim()) ? name.trim() : getDefaultPlanName(start_date, end_date);
    const now = new Date().toISOString();
    const shareToken = existing.share_token || generateShareToken();

    const updatePlan = db.prepare(`
      UPDATE meal_plans SET
        name = ?, start_date = ?, end_date = ?, is_public = ?, share_token = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `);

    // Clean old days
    const deleteDays = db.prepare('DELETE FROM meal_plan_days WHERE meal_plan_id = ?');

    const insertDay = db.prepare(`
      INSERT INTO meal_plan_days (
        id, meal_plan_id, date, slot, meal_name, is_blank, blank_reason, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertDayRecipe = db.prepare(`
      INSERT INTO meal_plan_day_recipes (
        id, day_id, recipe_id, custom_item_name, servings, calories, protein, carbohydrates, fat, custom_ingredients
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      updatePlan.run(
        planName,
        start_date,
        end_date,
        is_public ? 1 : 0,
        shareToken,
        notes,
        now,
        id
      );

      deleteDays.run(id);

      for (const day of days) {
        const dayId = crypto.randomUUID();
        insertDay.run(
          dayId,
          id,
          day.date,
          day.slot || 'dinner',
          day.meal_name || '',
          day.is_blank ? 1 : 0,
          day.blank_reason || '',
          day.sort_order || 0
        );

        if (!day.is_blank && Array.isArray(day.recipes)) {
          for (const item of day.recipes) {
            insertDayRecipe.run(
              crypto.randomUUID(),
              dayId,
              item.recipe_id || null,
              item.custom_item_name || '',
              Number(item.servings) || 1,
              Number(item.calories) || 0,
              Number(item.protein) || 0,
              Number(item.carbohydrates) || 0,
              Number(item.fat) || 0,
              JSON.stringify(item.custom_ingredients || [])
            );
          }
        }
      }
    })();

    res.json({ id, share_token: shareToken, message: 'Meal plan updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update meal plan.' });
  }
});

// Clone meal plan
router.post('/:id/clone', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { new_start_date, new_name } = req.body;

    if (!new_start_date) {
      res.status(400).json({ error: 'New start date is required to clone meal plan.' });
      return;
    }

    const sourcePlan = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(id) as any;
    if (!sourcePlan) {
      res.status(404).json({ error: 'Source meal plan not found.' });
      return;
    }

    // Calculate duration in days between old start and end
    const durationDays = getDayOffset(sourcePlan.start_date, sourcePlan.end_date);
    const newEndDate = addDays(new_start_date, durationDays);
    const planName = (new_name && new_name.trim()) ? new_name.trim() : getDefaultPlanName(new_start_date, newEndDate);
    const offsetDays = getDayOffset(sourcePlan.start_date, new_start_date);

    const newPlanId = crypto.randomUUID();
    const newShareToken = generateShareToken();
    const now = new Date().toISOString();
    const userId = req.user!.id;

    // Fetch all source days
    const sourceDays = db.prepare('SELECT * FROM meal_plan_days WHERE meal_plan_id = ?').all(id) as any[];

    // Fetch all source day recipes
    const getRecipesStmt = db.prepare('SELECT * FROM meal_plan_day_recipes WHERE day_id = ?');

    const insertPlan = db.prepare(`
      INSERT INTO meal_plans (
        id, user_id, name, start_date, end_date, is_public, share_token, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertDay = db.prepare(`
      INSERT INTO meal_plan_days (
        id, meal_plan_id, date, slot, meal_name, is_blank, blank_reason, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertDayRecipe = db.prepare(`
      INSERT INTO meal_plan_day_recipes (
        id, day_id, recipe_id, custom_item_name, servings, calories, protein, carbohydrates, fat, custom_ingredients
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      insertPlan.run(
        newPlanId,
        userId,
        planName,
        new_start_date,
        newEndDate,
        1, // default public
        newShareToken,
        sourcePlan.notes || '',
        now,
        now
      );

      for (const sDay of sourceDays) {
        const targetDate = addDays(sDay.date, offsetDays);
        const newDayId = crypto.randomUUID();

        insertDay.run(
          newDayId,
          newPlanId,
          targetDate,
          sDay.slot,
          sDay.meal_name,
          sDay.is_blank,
          sDay.blank_reason,
          sDay.sort_order
        );

        const recipes = getRecipesStmt.all(sDay.id) as any[];
        for (const r of recipes) {
          insertDayRecipe.run(
            crypto.randomUUID(),
            newDayId,
            r.recipe_id,
            r.custom_item_name,
            r.servings,
            r.calories,
            r.protein,
            r.carbohydrates,
            r.fat,
            r.custom_ingredients
          );
        }
      }
    })();

    res.status(201).json({
      id: newPlanId,
      share_token: newShareToken,
      message: 'Meal plan cloned successfully to new schedule!'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to clone meal plan.' });
  }
});

// Delete meal plan
router.delete('/:id', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const existing = db.prepare('SELECT user_id FROM meal_plans WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Meal plan not found.' });
      return;
    }

    if (existing.user_id !== userId && userRole !== 'admin') {
      res.status(403).json({ error: 'Permission denied.' });
      return;
    }

    db.prepare('DELETE FROM meal_plans WHERE id = ?').run(id);
    res.json({ message: 'Meal plan deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete meal plan.' });
  }
});

export default router;

