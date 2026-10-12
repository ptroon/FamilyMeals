import { resetToBlankDatabase } from './database.js';

console.log('[FamilyMeals] Initializing blank database with default admin account only...');
const result = resetToBlankDatabase();
console.log(`✅ Blank database initialized! Default admin: ${result.adminEmail} (0 meal plans, 0 recipes, 0 shopping lists).`);

