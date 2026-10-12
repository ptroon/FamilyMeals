import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { load as yamlLoad, dump as yamlDump } from 'js-yaml';
import multer from 'multer';
import crypto from 'crypto';
import { db, resetToBlankDatabase } from '../db/database.js';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { testSmtpConnection } from '../services/emailService.js';
import { AppSettings, Recipe, MealPlan } from '../../types/index.js';

const router = Router();
const uploadMem = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// All routes here require Admin authentication
router.use(authenticate, requireAdmin);

// Get App Settings
router.get('/settings', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const rows = db.prepare('SELECT key, value FROM app_settings').all() as Array<{ key: string; value: string }>;
    const settingsMap: Record<string, string> = {};
    for (const r of rows) {
      settingsMap[r.key] = r.value;
    }

    const appSettings: AppSettings = {
      app_name: settingsMap['app_name'] || 'FamilyMeals',
      calorie_target_default: Number(settingsMap['calorie_target_default']) || 2000,
      protein_target_default: Number(settingsMap['protein_target_default']) || 120,
      carbs_target_default: Number(settingsMap['carbs_target_default']) || 220,
      fat_target_default: Number(settingsMap['fat_target_default']) || 65,
      allow_registrations: settingsMap['allow_registrations'] !== 'false',
      smtp_host: settingsMap['smtp_host'] || '',
      smtp_port: Number(settingsMap['smtp_port']) || 587,
      smtp_secure: settingsMap['smtp_secure'] === 'true',
      smtp_user: settingsMap['smtp_user'] || '',
      smtp_pass: settingsMap['smtp_pass'] ? '********' : '', // mask password
      smtp_from_email: settingsMap['smtp_from_email'] || 'meals@familymeals.local',
      smtp_from_name: settingsMap['smtp_from_name'] || 'FamilyMeals Kitchen',
      has_gemini_key: Boolean(settingsMap['gemini_api_key'] || process.env.GEMINI_API_KEY),
      google_client_id: settingsMap['google_client_id'] || process.env.GOOGLE_CLIENT_ID || ''
    };

    res.json({ settings: appSettings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch settings.' });
  }
});

// Update App Settings
router.post('/settings', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const {
      app_name,
      calorie_target_default,
      protein_target_default,
      carbs_target_default,
      fat_target_default,
      allow_registrations,
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_user,
      smtp_pass,
      smtp_from_email,
      smtp_from_name,
      gemini_api_key,
      google_client_id
    } = req.body;

    const setStmt = db.prepare(`
      INSERT INTO app_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    db.transaction(() => {
      if (app_name !== undefined) setStmt.run('app_name', String(app_name));
      if (calorie_target_default !== undefined) setStmt.run('calorie_target_default', String(calorie_target_default));
      if (protein_target_default !== undefined) setStmt.run('protein_target_default', String(protein_target_default));
      if (carbs_target_default !== undefined) setStmt.run('carbs_target_default', String(carbs_target_default));
      if (fat_target_default !== undefined) setStmt.run('fat_target_default', String(fat_target_default));
      if (allow_registrations !== undefined) setStmt.run('allow_registrations', String(allow_registrations));
      if (smtp_host !== undefined) setStmt.run('smtp_host', String(smtp_host));
      if (smtp_port !== undefined) setStmt.run('smtp_port', String(smtp_port));
      if (smtp_secure !== undefined) setStmt.run('smtp_secure', String(smtp_secure));
      if (smtp_user !== undefined) setStmt.run('smtp_user', String(smtp_user));
      if (smtp_pass !== undefined && smtp_pass !== '********') setStmt.run('smtp_pass', String(smtp_pass));
      if (smtp_from_email !== undefined) setStmt.run('smtp_from_email', String(smtp_from_email));
      if (smtp_from_name !== undefined) setStmt.run('smtp_from_name', String(smtp_from_name));
      if (gemini_api_key !== undefined && gemini_api_key !== '********') setStmt.run('gemini_api_key', String(gemini_api_key));
      if (google_client_id !== undefined) setStmt.run('google_client_id', String(google_client_id));
    })();

    res.json({ message: 'Settings saved successfully!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update settings.' });
  }
});

// Test SMTP Settings
router.post('/smtp/test', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { target_email } = req.body;
    const recipient = target_email || req.user!.email;

    const result = await testSmtpConnection(recipient);
    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }

    res.json({ message: result.message });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'SMTP test error.' });
  }
});

// Download SQLite Database Backup file
router.get('/backup/database', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const dbPath = process.env.DATABASE_PATH || 'data/familymeals.db';
    const fullDbPath = path.resolve(process.cwd(), dbPath);

    if (!fs.existsSync(fullDbPath)) {
      res.status(404).send('Database file not found.');
      return;
    }

    // Force SQLite checkpoint so all WAL changes are written to main database file
    db.pragma('wal_checkpoint(TRUNCATE)');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'application/vnd.sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="familymeals-backup-${timestamp}.db"`);

    const fileStream = fs.createReadStream(fullDbPath);
    fileStream.pipe(res);
  } catch (err: any) {
    res.status(500).send('Database backup failed: ' + err.message);
  }
});

// Restore SQLite Database from uploaded file
router.post('/restore/database', uploadMem.single('backupFile'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No database file provided.' });
      return;
    }

    const dbPath = process.env.DATABASE_PATH || 'data/familymeals.db';
    const fullDbPath = path.resolve(process.cwd(), dbPath);

    // Create an automatic rollback safety backup of current db before restoring
    if (fs.existsSync(fullDbPath)) {
      const rollbackPath = `${fullDbPath}.bak-${Date.now()}`;
      fs.copyFileSync(fullDbPath, rollbackPath);
    }

    // Write uploaded buffer to database file
    fs.writeFileSync(fullDbPath, req.file.buffer);

    res.json({ message: 'Database restored successfully! The server is now using the uploaded database.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to restore database.' });
  }
});

// Initialize / Reset to a New Blank Database (Default Admin Account Only, 0 meal plans/recipes/shopping lists)
router.post('/database/reset-blank', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const result = resetToBlankDatabase();
    res.json({
      message: `Created new blank database with default admin account (${result.adminEmail}) and 0 meal plans, recipes, or shopping lists.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to initialize blank database.' });
  }
});

// Bulk Import Recipes (YAML or JSON)
router.post('/recipes/import', uploadMem.single('file'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    let content = '';
    if (req.file) {
      content = req.file.buffer.toString('utf-8');
    } else if (req.body.content) {
      content = req.body.content;
    } else {
      res.status(400).json({ error: 'Please upload a YAML/JSON file or paste the content.' });
      return;
    }

    let parsed: any;
    try {
      // js-yaml load parses both valid YAML and JSON!
      parsed = yamlLoad(content);
    } catch (parseErr: any) {
      res.status(400).json({ error: 'Invalid YAML or JSON format: ' + parseErr.message });
      return;
    }

    // Support single recipe or array of recipes
    const recipesToImport: any[] = Array.isArray(parsed) ? parsed : (parsed.recipes && Array.isArray(parsed.recipes) ? parsed.recipes : [parsed]);

    if (recipesToImport.length === 0) {
      res.status(400).json({ error: 'No recipes found in the provided file.' });
      return;
    }

    const userId = req.user!.id;
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

    let importedCount = 0;

    db.transaction(() => {
      for (const r of recipesToImport) {
        if (!r.title || typeof r.title !== 'string') continue;

        const recipeId = crypto.randomUUID();
        const ingredients = Array.isArray(r.ingredients) ? r.ingredients : [];

        let calcCalories = Number(r.calories) || 0;
        let calcProtein = Number(r.protein) || 0;
        let calcCarbs = Number(r.carbohydrates || r.carbs) || 0;
        let calcFat = Number(r.fat) || 0;

        if (calcCalories === 0 && ingredients.length > 0) {
          for (const ing of ingredients) {
            calcCalories += Number(ing.calories) || 0;
            calcProtein += Number(ing.protein) || 0;
            calcCarbs += Number(ing.carbohydrates || ing.carbs) || 0;
            calcFat += Number(ing.fat) || 0;
          }
        }

        insertRecipe.run(
          recipeId,
          userId,
          r.title.trim(),
          (r.description || '').trim(),
          Number(r.prep_time_minutes || r.prep_time) || 0,
          Number(r.cook_time_minutes || r.cook_time) || 0,
          Number(r.servings) || 4,
          r.is_public !== false ? 1 : 0,
          r.image_url || '',
          r.method || '',
          calcCalories,
          calcProtein,
          calcCarbs,
          calcFat,
          now,
          now
        );

        ingredients.forEach((ing: any, idx: number) => {
          if (!ing.item) return;
          insertIngredient.run(
            crypto.randomUUID(),
            recipeId,
            String(ing.item).trim(),
            Number(ing.amount) || 1,
            String(ing.unit || '').trim(),
            ing.category || 'Pantry',
            ing.macro_type || '',
            Number(ing.calories) || 0,
            Number(ing.protein) || 0,
            Number(ing.carbohydrates || ing.carbs) || 0,
            Number(ing.fat) || 0,
            idx
          );
        });

        importedCount++;
      }
    })();

    res.json({
      message: `Successfully imported ${importedCount} recipe(s)!`,
      count: importedCount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to import recipes.' });
  }
});

// Bulk Export (YAML or JSON) of all Recipes, Meals, and Meal Plans
router.get('/export/:format', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const format = String(req.params.format).toLowerCase();
    if (format !== 'yaml' && format !== 'json') {
      res.status(400).send('Format must be "yaml" or "json"');
      return;
    }

    // Fetch all recipes with ingredients
    const recipes = db.prepare('SELECT * FROM recipes ORDER BY created_at DESC').all() as any[];
    const getIngredients = db.prepare('SELECT item, amount, unit, category, macro_type, calories, protein, carbohydrates, fat FROM recipe_ingredients WHERE recipe_id = ? ORDER BY sort_order ASC');

    const formattedRecipes = recipes.map(r => ({
      title: r.title,
      description: r.description,
      prep_time_minutes: r.prep_time_minutes,
      cook_time_minutes: r.cook_time_minutes,
      servings: r.servings,
      is_public: Boolean(r.is_public),
      image_url: r.image_url,
      method: r.method,
      calories: r.calories,
      protein: r.protein,
      carbohydrates: r.carbohydrates,
      fat: r.fat,
      ingredients: getIngredients.all(r.id)
    }));

    // Fetch all meal plans with days and recipes
    const mealPlans = db.prepare('SELECT * FROM meal_plans ORDER BY start_date DESC').all() as any[];
    const getDays = db.prepare('SELECT * FROM meal_plan_days WHERE meal_plan_id = ? ORDER BY date ASC, slot ASC');
    const getDayRecipes = db.prepare(`
      SELECT dr.custom_item_name, dr.servings, dr.calories, dr.protein, dr.carbohydrates, dr.fat, dr.custom_ingredients, r.title as recipe_title
      FROM meal_plan_day_recipes dr
      LEFT JOIN recipes r ON dr.recipe_id = r.id
      WHERE dr.day_id = ?
    `);

    const formattedPlans = mealPlans.map(p => {
      const days = (getDays.all(p.id) as any[]).map(d => ({
        date: d.date,
        slot: d.slot,
        meal_name: d.meal_name,
        is_blank: Boolean(d.is_blank),
        blank_reason: d.blank_reason,
        recipes: (getDayRecipes.all(d.id) as any[]).map(dr => ({
          recipe_title: dr.recipe_title || dr.custom_item_name,
          servings: dr.servings,
          calories: dr.calories,
          protein: dr.protein,
          carbohydrates: dr.carbohydrates,
          fat: dr.fat
        }))
      }));

      return {
        name: p.name,
        start_date: p.start_date,
        end_date: p.end_date,
        is_public: Boolean(p.is_public),
        notes: p.notes,
        days
      };
    });

    const exportPayload = {
      app: 'FamilyMeals',
      exported_at: new Date().toISOString(),
      recipes: formattedRecipes,
      meal_plans: formattedPlans
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="familymeals-export-${timestamp}.json"`);
      res.send(JSON.stringify(exportPayload, null, 2));
    } else {
      res.setHeader('Content-Type', 'text/yaml');
      res.setHeader('Content-Disposition', `attachment; filename="familymeals-export-${timestamp}.yaml"`);
      res.send(yamlDump(exportPayload, { indent: 2, lineWidth: -1 }));
    }
  } catch (err: any) {
    res.status(500).send('Bulk export failed: ' + err.message);
  }
});

export default router;
