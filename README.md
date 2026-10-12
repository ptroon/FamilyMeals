# 🍲 FamilyMeals

> **Wholesome Family Meal Planner, Macro Nutrient Tracker & Intelligent Shopping List Generator**  
> Designed for families cooking from scratch with healthy eating, macro tracking, and synchronized grocery planning.

---

## ✨ Features

### 📅 1. Meal Planner & Calendar Scheduling
- **Custom Date Ranges**: Select any start and end date (defaults to `"Meal Plan for <start date> to <end date>"`).
- **Multi-Recipe Slots**: Schedule as many recipes as you want per meal (Breakfast, Lunch, Dinner, Snack).
- **Macro Nutrient Components**: Pick individual macro components directly (e.g., 200g meat for protein, 150g potato fries for carbohydrates).
- **Blank Meal Slots with Reasons**: Leave any day or meal slot blank and provide a reason (e.g. *"Eating out at Grandma's"*, *"Leftovers"*).
- **Clone Entire Meal Plan**: Clone any meal plan to a new start date and name; automatically offsets all recipes and slots to the new schedule.
- **Clone Single Meal**: Clone a specific meal from any existing meal plan into your current slot.
- **Public vs. Private Plans**: Control visibility (Public by default).

### 🥗 2. Recipe Management & Method Steps
- **Ingredient Measures & Macros**: Enter food items with measure, volume, amount, or weight (e.g. `500g`, `2 tbsp`, `1 cup`), categorized for shopping, with individual or overall protein, carbs, fat, and calories.
- **Numbered Method Instructions**: Edit cooking instructions in plain text; automatically split into clear, numbered steps using blank lines (`\n\n`).
- **Timing & Portions**: Track prep time, cook time, and servings count.
- **Homely Imagery**: Upload custom photos or choose from curated food images (focus on wholesome ingredients, no people).
- **Macro Tracking**: Real-time tracking of calories, protein, carbs, and fat per portion and per day.

### 🛒 3. Shopping List Generation & Concatenation
- **One-Click Generation**: Gather all ingredients across all recipes in the meal plan.
- **Concatenation of Repeated Items**: Automatically combines identical ingredients across the plan (e.g. `2 eggs` + `4 eggs` = `6 eggs`; `200g flour` + `300g flour` = `500g flour`).
- **Categorized Checklist**: Organizes items into Produce, Meat & Poultry, Dairy, Bakery, Pantry, Spices, etc.
- **Persistence**: Saved to application database and refreshed each time the generation button is pressed.
- **Interactive Checklist**: Check off items while shopping in-store.
- **Multi-Format Export**:
  - **CSV Export**: Direct spreadsheet download.
  - **Plain Text Export**: Newline-delimited text ready to copy into Apple Notes, Google Keep, or messaging apps.
  - **Print Layout**: Dedicated `@media print` clean layout.

### 🔗 4. Public Short-Links & Sharing
- **Public Meal Plan Short-Links**: Non-authenticated visitors can view meal plans and recipes on mobile or desktop in read-only mode.
- **Public Shopping List Short-Links**: Non-authenticated family members can view and check off groceries from any device.
- **1-Click SMS / Text Copy**: Easily copy short links to clipboard for SMS or WhatsApp.
- **SMTP Email Dispatch**: Send meal plan links to saved family email contacts with a single click.

### 🛡️ 5. Administrator Control Panel
- **App Variables**: Set application name, default macronutrient goals, and toggle user registration.
- **SMTP Email Setup**: Configure SMTP server details and test sending directly in the UI.
- **Database Backup & Restore**: Download a live snapshot of the SQLite database (`.db` file) or upload a backup file to restore.
- **Bulk Recipe Import**: Upload or paste YAML or JSON files to batch import recipes without typing.
- **Bulk Export**: Download all recipes, meals, and meal plans in YAML or JSON format.

### 🤖 6. Google Gemini AI Assistance (Free Tier)
- **AI Recipe Parser**: Paste unstructured recipe text from anywhere and Gemini parses ingredients, units, macros, and method steps.
- **AI Meal Optimizer**: Get recommendations to balance macros for the week.

---

## 🎨 Design & Aesthetic
- **Warm, Homely Theme**: Terracotta (`#c2593f`), sage green (`#4a6b57`), and golden amber (`#d97706`).
- **Light & Dark Modes**: Easily toggleable in the navigation bar with local persistence and system preference detection.
- **Responsive**: Fully responsive layout for Chrome, Firefox, Edge, Safari, tablets, and smartphones.
- **Family Focus**: Wholesome food imagery with zero people in images.

---

## 🚀 Quick Start

### 1. Install & Build
```bash
npm install
npm run seed     # Seeds 4 delicious recipes and a weekly meal plan
npm run build    # Compiles client (Vite) and server (TypeScript)
npm start        # Starts server on http://localhost:3000
```

### 2. Default Login
- **Email:** `admin@familymeals.local`
- **Password:** `AdminFamilyMeals123!`

---

## ☁️ Cloud & Google App Hosting

See [DEPLOYMENT.md](file:///d:/projects/FamilyMeals/DEPLOYMENT.md) for full instructions on running in Google App Hosting, Google Cloud Run, and setting up Google AI Studio keys and SMTP delivery.

