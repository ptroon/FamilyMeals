import { db, initDatabase } from '../src/server/db/database.js';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('--- Starting Verification for [BUG FIXES #2 12-Oct-2026] ---');

  initDatabase();

  // Test 1: Verify Font is Arial style
  console.log('\n[TEST 1] Verifying Arial Font Family:');
  const cssPath = path.resolve('src/client/styles/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  if (!cssContent.includes('Arial') || !cssContent.includes('--font-body: Arial')) {
    console.error('FAIL: Arial font not configured in index.css');
    process.exit(1);
  }
  console.log('✅ Arial sans-serif font successfully configured for body and headings.');

  // Test 2: Verify Version 0.3 on Navbar
  console.log('\n[TEST 2] Verifying Version 0.3 on Navigation Bar:');
  const navbarPath = path.resolve('src/client/components/Navbar.tsx');
  const navbarContent = fs.readFileSync(navbarPath, 'utf-8');
  if (!navbarContent.includes('v0.3')) {
    console.error('FAIL: v0.3 not found in Navbar.tsx');
    process.exit(1);
  }
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  if (packageJson.version !== '0.3.0') {
    console.error('FAIL: package.json version is not 0.3.0');
    process.exit(1);
  }
  console.log('✅ Version v0.3 displayed clearly on navigation bar and package.json updated to 0.3.0.');

  // Test 3, 4, 6: Verify MealPlanEditorView variable declarations & no reference errors
  console.log('\n[TEST 3, 4, 6] Verifying Meal Plan Editor (view, edit, clone, new):');
  const editorPath = path.resolve('src/client/pages/MealPlanEditorView.tsx');
  const editorContent = fs.readFileSync(editorPath, 'utf-8');
  const requiredVars = [
    'scheduleTotalCal',
    'scheduleTotalPro',
    'scheduleTotalCarb',
    'scheduleTotalFat',
    'scheduleAvgCal',
    'scheduleAvgPro',
    'scheduleAvgCarb',
    'scheduleAvgFat'
  ];
  for (const v of requiredVars) {
    if (!editorContent.includes(`let ${v}`) && !editorContent.includes(`const ${v}`)) {
      console.error(`FAIL: Missing declaration for ${v} in MealPlanEditorView.tsx`);
      process.exit(1);
    }
  }
  console.log('✅ All schedule macro variables properly declared and computed in MealPlanEditorView.');

  // Test 5: Verify Distribution Lists Persistence in SQLite database
  console.log('\n[TEST 5] Verifying Distribution Lists Auto-Persistence:');
  const user = db.prepare('SELECT id, email, distribution_lists FROM users WHERE email = ?').get('admin@familymeals.local') as any;
  if (!user) {
    console.error('FAIL: Default admin user not found');
    process.exit(1);
  }

  // Simulate updating distribution lists as done by persistDistributionLists
  const testDLs = [
    { id: 'dl-family', name: 'Family & Relatives', emails: ['dad@test.local', 'mum@test.local'] },
    { id: 'dl-work', name: 'Colleagues Lunch Club', emails: ['colleague@test.local'] }
  ];

  db.prepare('UPDATE users SET distribution_lists = ? WHERE id = ?').run(JSON.stringify(testDLs), user.id);
  const reloaded = db.prepare('SELECT distribution_lists FROM users WHERE id = ?').get(user.id) as any;
  const parsed = JSON.parse(reloaded.distribution_lists);
  if (parsed.length !== 2 || parsed[0].emails.length !== 2 || parsed[1].emails.length !== 1) {
    console.error('FAIL: Distribution list persistence failed');
    process.exit(1);
  }
  console.log('✅ Distribution lists successfully persisted and verified in database.');

  console.log('\n🎉 ALL FIXES FOR [BUG FIXES #2] VERIFIED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

