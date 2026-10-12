import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { sendMealPlanEmail } from '../services/emailService.js';
import { MealPlan, ShoppingList } from '../../types/index.js';

const router = Router();

// Publicly view a Meal Plan via short share token or plan ID
router.get('/plan/:token', (req, res): void => {
  try {
    const { token } = req.params;

    const planRow = db.prepare(`
      SELECT p.*, COALESCE(u.name, 'Family Planner') as author_name
      FROM meal_plans p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.share_token = ? OR p.id = ?
    `).get(token, token) as any;

    if (!planRow) {
      res.status(404).json({ error: 'Meal plan not found or link has expired.' });
      return;
    }

    const dayRows = db.prepare(`
      SELECT * FROM meal_plan_days
      WHERE meal_plan_id = ?
      ORDER BY date ASC, slot ASC
    `).all(planRow.id) as any[];

    const dayRecipeStmt = db.prepare(`
      SELECT dr.*, r.title as recipe_title, r.image_url as recipe_image, r.prep_time_minutes, r.cook_time_minutes, r.description, r.method
      FROM meal_plan_day_recipes dr
      LEFT JOIN recipes r ON dr.recipe_id = r.id
      WHERE dr.day_id = ?
    `);

    const getRecipeIngredientsStmt = db.prepare('SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY sort_order ASC');

    const days = dayRows.map(day => {
      const recipesRaw = dayRecipeStmt.all(day.id) as any[];
      const recipes = recipesRaw.map(r => ({
        id: r.id,
        day_id: r.day_id,
        recipe_id: r.recipe_id,
        recipe: r.recipe_id ? {
          id: r.recipe_id,
          title: r.recipe_title,
          image_url: r.recipe_image,
          description: r.description,
          method: r.method,
          prep_time_minutes: r.prep_time_minutes,
          cook_time_minutes: r.cook_time_minutes,
          ingredients: getRecipeIngredientsStmt.all(r.recipe_id)
        } : undefined,
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

    const shoppingRow = db.prepare('SELECT share_token FROM shopping_lists WHERE meal_plan_id = ?').get(planRow.id) as any;

    const mealPlan: MealPlan & { shopping_share_token?: string } = {
      ...planRow,
      is_public: Boolean(planRow.is_public),
      days,
      shopping_share_token: shoppingRow?.share_token
    };

    res.json({ mealPlan });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch shared meal plan.' });
  }
});

// Publicly view a Shopping List via short share token or ID
router.get('/list/:token', (req, res): void => {
  try {
    const { token } = req.params;

    const row = db.prepare(`
      SELECT s.*, p.name as meal_plan_name, p.start_date, p.end_date, p.is_public
      FROM shopping_lists s
      LEFT JOIN meal_plans p ON s.meal_plan_id = p.id
      WHERE s.share_token = ? OR s.id = ? OR s.meal_plan_id = ?
    `).get(token, token, token) as any;

    if (!row) {
      res.status(404).json({ error: 'Shopping list not found or link has expired.' });
      return;
    }

    const shoppingList: ShoppingList = {
      id: row.id,
      meal_plan_id: row.meal_plan_id,
      share_token: row.share_token,
      meal_plan_name: row.meal_plan_name,
      start_date: row.start_date,
      end_date: row.end_date,
      generated_at: row.generated_at,
      items: JSON.parse(row.items_json || '[]')
    };

    res.json({ shoppingList });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch shared shopping list.' });
  }
});

// Send meal plan short-link to user's distribution list or specific email via SMTP
router.post('/plan/:id/email', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { distribution_list_id, single_email, custom_emails } = req.body;
    const user = req.user!;

    const plan = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(id) as any;
    if (!plan) {
      res.status(404).json({ error: 'Meal plan not found.' });
      return;
    }

    // Determine recipient emails based on DL or single email
    let recipients: string[] = [];
    let recipientLabel = '';

    if (distribution_list_id && Array.isArray(user.distribution_lists)) {
      const dl = user.distribution_lists.find(d => d.id === distribution_list_id);
      if (dl && dl.emails.length > 0) {
        recipients = dl.emails;
        recipientLabel = `Distribution List "${dl.name}" (${dl.emails.length} contacts)`;
      } else {
        res.status(400).json({ error: 'Selected Distribution List has no email addresses.' });
        return;
      }
    } else if (single_email && typeof single_email === 'string') {
      const trimmed = single_email.trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        recipients = [trimmed];
        recipientLabel = trimmed;
      } else {
        res.status(400).json({ error: 'Invalid email address provided.' });
        return;
      }
    } else if (Array.isArray(custom_emails) && custom_emails.length > 0) {
      recipients = custom_emails.map((e: string) => e.trim().toLowerCase()).filter((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      recipientLabel = `${recipients.length} recipient(s)`;
    } else if (Array.isArray(user.saved_emails) && user.saved_emails.length > 0) {
      recipients = user.saved_emails;
      recipientLabel = `Saved Family Contacts (${recipients.length})`;
    }

    if (recipients.length === 0) {
      res.status(400).json({ error: 'No recipient email addresses selected. Please select a Distribution List or enter an email address.' });
      return;
    }

    const appUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const shareUrl = `${appUrl}/share/plan/${plan.share_token}`;

    const result = await sendMealPlanEmail(recipients, plan.name, shareUrl, user.name);

    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }

    res.json({ message: `Successfully sent meal plan to ${recipientLabel}!`, shareUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send email.' });
  }
});

export default router;

