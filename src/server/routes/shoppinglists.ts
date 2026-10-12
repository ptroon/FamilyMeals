import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';
import { authenticate, optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { aggregateIngredients, exportToCsv, exportToPlainText } from '../services/shoppingAggregator.js';
import { ShoppingList, ShoppingListItem } from '../../types/index.js';

const router = Router();

function generateShareToken(): string {
  return crypto.randomBytes(6).toString('hex');
}

// Get shopping list for a meal plan
router.get('/plan/:planId', optionalAuthenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { planId } = req.params;
    const userId = req.user?.id || null;

    // Check plan access
    const plan = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(planId) as any;
    if (!plan) {
      res.status(404).json({ error: 'Meal plan not found.' });
      return;
    }

    if (!plan.is_public && (!userId || (plan.user_id !== userId && req.user?.role !== 'admin'))) {
      res.status(403).json({ error: 'This meal plan is private.' });
      return;
    }

    const row = db.prepare('SELECT * FROM shopping_lists WHERE meal_plan_id = ?').get(planId) as any;
    if (!row) {
      res.status(404).json({ error: 'No shopping list generated yet for this meal plan.' });
      return;
    }

    const list: ShoppingList = {
      id: row.id,
      meal_plan_id: row.meal_plan_id,
      share_token: row.share_token,
      meal_plan_name: plan.name,
      start_date: plan.start_date,
      end_date: plan.end_date,
      generated_at: row.generated_at,
      items: JSON.parse(row.items_json || '[]')
    };

    res.json({ shoppingList: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch shopping list.' });
  }
});

// Generate / Regenerate shopping list for a meal plan (overwrites persistent record)
router.post('/plan/:planId/generate', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { planId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const plan = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(planId) as any;
    if (!plan) {
      res.status(404).json({ error: 'Meal plan not found.' });
      return;
    }

    if (plan.user_id !== userId && userRole !== 'admin') {
      res.status(403).json({ error: 'Permission denied.' });
      return;
    }

    // Fetch all active days with recipes
    const days = db.prepare('SELECT id FROM meal_plan_days WHERE meal_plan_id = ? AND is_blank = 0').all(planId) as any[];
    if (days.length === 0) {
      res.status(400).json({ error: 'Cannot generate shopping list: meal plan has no meals scheduled.' });
      return;
    }

    const dayIds = days.map(d => d.id);
    const placeholders = dayIds.map(() => '?').join(',');

    const mealItems = db.prepare(`
      SELECT dr.*, r.servings as recipe_base_servings
      FROM meal_plan_day_recipes dr
      LEFT JOIN recipes r ON dr.recipe_id = r.id
      WHERE dr.day_id IN (${placeholders})
    `).all(...dayIds) as any[];

    if (mealItems.length === 0) {
      res.status(400).json({ error: 'Cannot generate shopping list: no recipes or food items found in this meal plan.' });
      return;
    }

    const getIngredientsStmt = db.prepare('SELECT * FROM recipe_ingredients WHERE recipe_id = ?');

    const rawIngredientsToAggregate: Array<{ item: string; amount: number; unit: string; category: string }> = [];

    for (const item of mealItems) {
      const targetServings = Number(item.servings) || 1;

      if (item.recipe_id) {
        const baseServings = Number(item.recipe_base_servings) || 1;
        const multiplier = targetServings / baseServings;
        const ingredients = getIngredientsStmt.all(item.recipe_id) as any[];

        for (const ing of ingredients) {
          rawIngredientsToAggregate.push({
            item: ing.item,
            amount: (Number(ing.amount) || 1) * multiplier,
            unit: ing.unit,
            category: ing.category
          });
        }
      }

      // Handle custom ad-hoc components with custom_ingredients
      if (item.custom_ingredients) {
        try {
          const custom = JSON.parse(item.custom_ingredients);
          if (Array.isArray(custom)) {
            for (const ing of custom) {
              rawIngredientsToAggregate.push({
                item: ing.item,
                amount: (Number(ing.amount) || 1) * targetServings,
                unit: ing.unit,
                category: ing.category || 'Pantry'
              });
            }
          }
        } catch {
          // Ignore JSON parse error
        }
      }

      // If user typed a custom item name without full recipe (e.g. "Potato fries", "Grilled steak")
      if (!item.recipe_id && item.custom_item_name && (!item.custom_ingredients || item.custom_ingredients === '[]')) {
        rawIngredientsToAggregate.push({
          item: item.custom_item_name,
          amount: targetServings,
          unit: 'portion',
          category: 'Produce'
        });
      }
    }

    if (rawIngredientsToAggregate.length === 0) {
      res.status(400).json({ error: 'Cannot generate shopping list: no ingredients found in selected recipes.' });
      return;
    }

    // Check if an existing shopping list exists to keep previously checked items
    const existingListRow = db.prepare('SELECT * FROM shopping_lists WHERE meal_plan_id = ?').get(planId) as any;
    const checkedMap: Record<string, boolean> = {};

    if (existingListRow) {
      try {
        const existingItems: ShoppingListItem[] = JSON.parse(existingListRow.items_json);
        for (const it of existingItems) {
          if (it.checked) {
            checkedMap[it.normalized_item] = true;
          }
        }
      } catch {
        // Ignore
      }
    }

    // Concatenate and aggregate items across the entire meal plan
    const aggregatedItems = aggregateIngredients(rawIngredientsToAggregate, checkedMap);

    const now = new Date().toISOString();
    const listId = existingListRow ? existingListRow.id : crypto.randomUUID();
    const shareToken = existingListRow ? existingListRow.share_token : generateShareToken();

    // Persist & overwrite
    db.prepare(`
      INSERT INTO shopping_lists (id, meal_plan_id, share_token, generated_at, items_json)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(meal_plan_id) DO UPDATE SET
        generated_at = excluded.generated_at,
        items_json = excluded.items_json
    `).run(listId, planId, shareToken, now, JSON.stringify(aggregatedItems));

    const responseList: ShoppingList = {
      id: listId,
      meal_plan_id: String(planId),
      share_token: shareToken,
      meal_plan_name: plan.name,
      start_date: plan.start_date,
      end_date: plan.end_date,
      generated_at: now,
      items: aggregatedItems
    };

    res.json({
      message: 'Shopping list generated successfully!',
      shoppingList: responseList
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate shopping list.' });
  }
});

// Update item checked state (for in-store shopping)
router.patch('/plan/:planId/items/:itemId', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { planId, itemId } = req.params;
    const { checked } = req.body;

    const row = db.prepare('SELECT * FROM shopping_lists WHERE meal_plan_id = ?').get(planId) as any;
    if (!row) {
      res.status(404).json({ error: 'Shopping list not found.' });
      return;
    }

    const items: ShoppingListItem[] = JSON.parse(row.items_json || '[]');
    const target = items.find(i => i.id === itemId);
    if (!target) {
      res.status(404).json({ error: 'Item not found in shopping list.' });
      return;
    }

    target.checked = Boolean(checked);

    db.prepare('UPDATE shopping_lists SET items_json = ? WHERE meal_plan_id = ?').run(JSON.stringify(items), planId);

    res.json({ message: 'Item updated.', items });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update item.' });
  }
});

// Export CSV format
router.get('/plan/:planId/export/csv', optionalAuthenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { planId } = req.params;
    const plan = db.prepare('SELECT name FROM meal_plans WHERE id = ?').get(planId) as any;
    const row = db.prepare('SELECT items_json FROM shopping_lists WHERE meal_plan_id = ?').get(planId) as any;

    if (!row || !plan) {
      res.status(404).send('Shopping list not found.');
      return;
    }

    const items: ShoppingListItem[] = JSON.parse(row.items_json || '[]');
    const csvData = exportToCsv(items, plan.name);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Shopping-List-${planId.slice(0, 8)}.csv"`);
    res.send(csvData);
  } catch (err: any) {
    res.status(500).send('Failed to export CSV: ' + err.message);
  }
});

// Export Plain Text format
router.get('/plan/:planId/export/text', optionalAuthenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { planId } = req.params;
    const plan = db.prepare('SELECT name FROM meal_plans WHERE id = ?').get(planId) as any;
    const row = db.prepare('SELECT items_json FROM shopping_lists WHERE meal_plan_id = ?').get(planId) as any;

    if (!row || !plan) {
      res.status(404).send('Shopping list not found.');
      return;
    }

    const items: ShoppingListItem[] = JSON.parse(row.items_json || '[]');
    const textData = exportToPlainText(items, plan.name);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Shopping-List-${planId.slice(0, 8)}.txt"`);
    res.send(textData);
  } catch (err: any) {
    res.status(500).send('Failed to export text: ' + err.message);
  }
});

export default router;
