import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const dbPath = process.env.DATABASE_PATH || 'data/familymeals.db';
const fullDbPath = path.resolve(process.cwd(), dbPath);

// Ensure directory exists
const dir = path.dirname(fullDbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(fullDbPath);

// Enable WAL mode & foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'approved',
      saved_emails TEXT DEFAULT '[]',
      distribution_lists TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      prep_time_minutes INTEGER DEFAULT 0,
      cook_time_minutes INTEGER DEFAULT 0,
      servings INTEGER DEFAULT 4,
      is_public INTEGER DEFAULT 1,
      image_url TEXT,
      method TEXT NOT NULL,
      calories REAL DEFAULT 0,
      protein REAL DEFAULT 0,
      carbohydrates REAL DEFAULT 0,
      fat REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL,
      item TEXT NOT NULL,
      amount REAL NOT NULL,
      unit TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Pantry',
      macro_type TEXT DEFAULT '',
      calories REAL DEFAULT 0,
      protein REAL DEFAULT 0,
      carbohydrates REAL DEFAULT 0,
      fat REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meal_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_public INTEGER DEFAULT 1,
      share_token TEXT UNIQUE NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meal_plan_days (
      id TEXT PRIMARY KEY,
      meal_plan_id TEXT NOT NULL,
      date TEXT NOT NULL,
      slot TEXT NOT NULL,
      meal_name TEXT DEFAULT '',
      is_blank INTEGER DEFAULT 0,
      blank_reason TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meal_plan_day_recipes (
      id TEXT PRIMARY KEY,
      day_id TEXT NOT NULL,
      recipe_id TEXT,
      custom_item_name TEXT DEFAULT '',
      servings REAL DEFAULT 1,
      calories REAL DEFAULT 0,
      protein REAL DEFAULT 0,
      carbohydrates REAL DEFAULT 0,
      fat REAL DEFAULT 0,
      custom_ingredients TEXT DEFAULT '[]',
      FOREIGN KEY (day_id) REFERENCES meal_plan_days(id) ON DELETE CASCADE,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS shopping_lists (
      id TEXT PRIMARY KEY,
      meal_plan_id TEXT UNIQUE NOT NULL,
      share_token TEXT UNIQUE NOT NULL,
      generated_at TEXT NOT NULL,
      items_json TEXT NOT NULL,
      FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_recipes_user ON recipes(user_id);
    CREATE INDEX IF NOT EXISTS idx_recipes_public ON recipes(is_public);
    CREATE INDEX IF NOT EXISTS idx_meal_plans_user ON meal_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_meal_plans_share ON meal_plans(share_token);
    CREATE INDEX IF NOT EXISTS idx_shopping_share ON shopping_lists(share_token);
  `);

  // Migrate distribution_lists column if missing in existing DBs
  try {
    db.exec("ALTER TABLE users ADD COLUMN distribution_lists TEXT DEFAULT '[]'");
  } catch {
    // Column already exists
  }

  // Initialize Default Settings if not present
  const defaultSettings: Record<string, string> = {
    app_name: 'FamilyMeals',
    calorie_target_default: '2000',
    protein_target_default: '120',
    carbs_target_default: '220',
    fat_target_default: '65',
    allow_registrations: 'true',
    smtp_host: process.env.SMTP_HOST || '',
    smtp_port: process.env.SMTP_PORT || '587',
    smtp_secure: process.env.SMTP_SECURE || 'false',
    smtp_user: process.env.SMTP_USER || '',
    smtp_pass: process.env.SMTP_PASS || '',
    smtp_from_email: process.env.SMTP_FROM_EMAIL || 'meals@familymeals.local',
    smtp_from_name: process.env.SMTP_FROM_NAME || 'FamilyMeals Kitchen',
    gemini_api_key: process.env.GEMINI_API_KEY || '',
    google_client_id: process.env.GOOGLE_CLIENT_ID || ''
  };

  const getSettingStmt = db.prepare('SELECT value FROM app_settings WHERE key = ?');
  const setSettingStmt = db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)');

  for (const [key, val] of Object.entries(defaultSettings)) {
    const existing = getSettingStmt.get(key);
    if (!existing) {
      setSettingStmt.run(key, val);
    }
  }

  // Migration: Ensure status column exists on users
  try {
    db.prepare("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'").run();
  } catch {
    // Column already exists
  }

  // Seed default admin account if none exists
  const adminCheck = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!adminCheck) {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@familymeals.local';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'AdminFamilyMeals123!';
    const passwordHash = bcrypt.hashSync(adminPassword, 12);
    const now = new Date().toISOString();
    const adminId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, status, saved_emails, distribution_lists, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'admin', 'approved', '[]', '[]', ?, ?)
    `).run(adminId, adminEmail, passwordHash, 'Head Chef Admin', now, now);

    console.log(`[Database] First run initialized: Created blank database with default administrator (${adminEmail})`);
  }
}

/**
 * Resets the database to a fresh blank state containing only the default admin account
 * and default application settings (no meal plans, no recipes, no shopping lists).
 */
export function resetToBlankDatabase(): { backupPath?: string; adminEmail: string } {
  initDatabase();

  let backupPath: string | undefined;
  if (fs.existsSync(fullDbPath)) {
    backupPath = `${fullDbPath}.bak-${Date.now()}`;
    try {
      db.pragma('wal_checkpoint(FULL)');
      fs.copyFileSync(fullDbPath, backupPath);
    } catch {
      backupPath = undefined;
    }
  }

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@familymeals.local';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'AdminFamilyMeals123!';
  const passwordHash = bcrypt.hashSync(adminPassword, 12);
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare('DELETE FROM shopping_lists').run();
    db.prepare('DELETE FROM meal_plan_day_recipes').run();
    db.prepare('DELETE FROM meal_plan_days').run();
    db.prepare('DELETE FROM meal_plans').run();
    db.prepare('DELETE FROM recipe_ingredients').run();
    db.prepare('DELETE FROM recipes').run();
    db.prepare("DELETE FROM users WHERE role != 'admin'").run();

    const existingAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as { id: string } | undefined;
    if (!existingAdmin) {
      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, status, saved_emails, distribution_lists, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'admin', 'approved', '[]', '[]', ?, ?)
      `).run(crypto.randomUUID(), adminEmail, passwordHash, 'Head Chef Admin', now, now);
    } else {
      db.prepare(`
        UPDATE users
        SET status = 'approved', saved_emails = '[]', distribution_lists = '[]', updated_at = ?
        WHERE id = ?
      `).run(now, existingAdmin.id);
    }
  })();

  console.log(`[Database] Reset to blank database complete (0 meal plans, 0 recipes, 0 shopping lists). Default admin: ${adminEmail}`);
  return { backupPath, adminEmail };
}

