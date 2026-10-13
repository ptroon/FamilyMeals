async function run() {
  const base = 'http://localhost:3000';

  console.log('--- 1. Testing Nutrient Lookup ---');
  const resMustard = await (await fetch(base + '/api/recipes/lookup-nutrients?item=mustard&amount=1&unit=tbsp')).json();
  console.log('Lookup mustard:', resMustard.matchedFood);
  if (!resMustard.matchedFood || !resMustard.matchedFood.includes('Mustard')) {
    throw new Error('Mustard lookup failed! Got: ' + JSON.stringify(resMustard));
  }

  const resMus = await (await fetch(base + '/api/recipes/lookup-nutrients?item=mus')).json();
  console.log('Lookup mus:', resMus);
  if (resMus.found) {
    throw new Error('mus should NOT have matched! Got: ' + JSON.stringify(resMus));
  }

  const resMushrooms = await (await fetch(base + '/api/recipes/lookup-nutrients?item=mushrooms')).json();
  console.log('Lookup mushrooms:', resMushrooms.matchedFood);
  if (!resMushrooms.matchedFood || !resMushrooms.matchedFood.includes('Mushrooms')) {
    throw new Error('Mushrooms lookup failed! Got: ' + JSON.stringify(resMushrooms));
  }

  console.log('\n--- 2. Testing Admin Login & Backup / Export Downloads ---');
  const loginRes = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@familymeals.local', password: 'AdminFamilyMeals123!' })
  });
  const adminAuth = await loginRes.json();
  if (!adminAuth.token) throw new Error('Admin login failed: ' + JSON.stringify(adminAuth));
  const adminToken = adminAuth.token;

  // Test DB backup download via Bearer header
  const dbBearerRes = await fetch(base + '/api/admin/backup/database', {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  if (!dbBearerRes.ok) throw new Error('DB backup Bearer failed: ' + dbBearerRes.status);
  console.log('DB Backup download (Bearer): OK (Content-Type:', dbBearerRes.headers.get('content-type') + ')');

  // Test DB backup download via ?token= query param (Chrome direct download test)
  const dbQueryRes = await fetch(base + '/api/admin/backup/database?token=' + encodeURIComponent(adminToken));
  if (!dbQueryRes.ok) throw new Error('DB backup ?token= failed: ' + dbQueryRes.status);
  console.log('DB Backup download (?token=): OK');

  // Test JSON export via ?token= query param
  const jsonQueryRes = await fetch(base + '/api/admin/export/json?token=' + encodeURIComponent(adminToken));
  if (!jsonQueryRes.ok) throw new Error('JSON export ?token= failed: ' + jsonQueryRes.status);
  const jsonExportData = await jsonQueryRes.json();
  console.log('JSON export (?token=): OK, recipes count:', jsonExportData.recipes.length);

  // Test YAML export via Bearer header
  const yamlRes = await fetch(base + '/api/admin/export/yaml', {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  if (!yamlRes.ok) throw new Error('YAML export failed: ' + yamlRes.status);
  console.log('YAML export (Bearer): OK');

  console.log('\n--- 3. Testing User Registration & Approval Flow ---');
  const testEmail = 'newuser' + Date.now() + '@familytest.local';
  const regRes = await fetch(base + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'SecurePassword123!', name: 'New Family Member' })
  });
  const regData = await regRes.json();
  console.log('Registration response:', regData);
  if (!regData.pending) throw new Error('Registration should be pending approval!');

  // Try logging in before approval -> Should return 403
  const loginBeforeApprove = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'SecurePassword123!' })
  });
  console.log('Login before approval status (expected 403):', loginBeforeApprove.status);
  if (loginBeforeApprove.status !== 403) throw new Error('User was able to log in while pending approval!');

  // Admin lists users and finds new user
  const usersRes = await (await fetch(base + '/api/admin/users', {
    headers: { Authorization: 'Bearer ' + adminToken }
  })).json();
  const pendingUser = usersRes.users.find((u: any) => u.email === testEmail);
  console.log('Pending user found in admin list:', pendingUser.email, 'status:', pendingUser.status);
  if (pendingUser.status !== 'pending') throw new Error('User status in admin list is not pending!');

  // Admin approves user
  const approveRes = await (await fetch(base + '/api/admin/users/' + pendingUser.id + '/approve', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + adminToken }
  })).json();
  console.log('Approve response:', approveRes.message);

  // User logs in after approval -> Should succeed 200
  const loginAfterApprove = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'SecurePassword123!' })
  });
  const userAuth = await loginAfterApprove.json();
  console.log('Login after approval status:', loginAfterApprove.status, 'User role:', userAuth.user?.role, 'Status:', userAuth.user?.status);
  if (!userAuth.token) throw new Error('Login failed after approval!');

  console.log('\n--- 4. Testing End Date Validation (end_date < start_date) ---');
  const invalidPlanRes = await fetch(base + '/api/meal-plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: JSON.stringify({
      name: 'Invalid Date Plan',
      start_date: '2026-10-20',
      end_date: '2026-10-15', // End is before start!
      days: []
    })
  });
  console.log('Invalid plan creation status (expected 400):', invalidPlanRes.status);
  if (invalidPlanRes.status !== 400) throw new Error('Server allowed end_date earlier than start_date!');

  console.log('\n--- 5. Testing Shopping List Spoon Unit Formatting (tbsp/tsp blank volume) ---');
  // Create a meal plan with a recipe having tbsp and tsp ingredients
  const validPlanRes = await (await fetch(base + '/api/meal-plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: JSON.stringify({
      name: 'Spoon Condiment Test Plan',
      start_date: '2026-10-20',
      end_date: '2026-10-21',
      days: [
        {
          date: '2026-10-20',
          slot: 'dinner',
          meal_name: 'Dinner',
          recipes: [
            {
              custom_item_name: 'Steak with Mustard',
              servings: 2,
              custom_ingredients: [
                { item: 'Beef Sirloin', amount: 400, unit: 'g', category: 'Meat & Poultry' },
                { item: 'English Mustard', amount: 1, unit: 'tsp', category: 'Pantry' },
                { item: 'Olive Oil', amount: 2, unit: 'tbsp', category: 'Pantry' }
              ]
            }
          ]
        }
      ]
    })
  })).json();

  // Generate shopping list
  const shopRes = await (await fetch(base + '/api/shopping-lists/plan/' + validPlanRes.id + '/generate', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + adminToken }
  })).json();

  const items = shopRes.shoppingList.items;
  console.log('Generated shopping list items:');
  items.forEach((it: any) => console.log(' -', it.item, '| amount:', it.amount, '| unit:', JSON.stringify(it.unit)));

  const mustardItem = items.find((it: any) => it.item.toLowerCase().includes('mustard'));
  const oilItem = items.find((it: any) => it.item.toLowerCase().includes('olive oil'));
  const beefItem = items.find((it: any) => it.item.toLowerCase().includes('beef'));

  if (!mustardItem || mustardItem.amount !== 0 || mustardItem.unit !== '') {
    throw new Error('Mustard amount was not set to blank/0: ' + JSON.stringify(mustardItem));
  }
  if (!oilItem || oilItem.amount !== 0 || oilItem.unit !== '') {
    throw new Error('Olive oil amount was not set to blank/0: ' + JSON.stringify(oilItem));
  }
  if (!beefItem || beefItem.amount <= 0) {
    throw new Error('Beef item did not retain weight: ' + JSON.stringify(beefItem));
  }
  console.log('✅ Mustard & Olive Oil spoon quantities correctly blanked on shopping list!');

  console.log('\n========================================');
  console.log('🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('========================================');
}

run().catch(e => { console.error('TEST ERROR:', e); process.exit(1); });
