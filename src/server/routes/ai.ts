import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { parseRecipeWithAI, suggestMealPlanWithAI } from '../services/aiService.js';
import { db } from '../db/database.js';

const router = Router();

router.use(authenticate);

// Parse natural language recipe into structured recipe object
router.post('/parse-recipe', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Recipe text is required.' });
      return;
    }

    const structured = await parseRecipeWithAI(text);
    res.json({ recipe: structured });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI recipe parsing failed.' });
  }
});

// Suggest a weekly meal plan with AI
router.post('/suggest-plan', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { daysCount = 7, caloriesTarget = 2000, proteinTarget = 120, dietaryNotes = '' } = req.body;

    // Get current public recipe titles
    const recipes = db.prepare('SELECT title FROM recipes WHERE is_public = 1 LIMIT 30').all() as any[];
    const titles = recipes.map(r => r.title);

    const suggestion = await suggestMealPlanWithAI({
      daysCount: Number(daysCount) || 7,
      caloriesTarget: Number(caloriesTarget) || 2000,
      proteinTarget: Number(proteinTarget) || 120,
      dietaryNotes,
      availableRecipes: titles
    });

    res.json(suggestion);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI meal planning failed.' });
  }
});

export default router;

