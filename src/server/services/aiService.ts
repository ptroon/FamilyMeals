import { GoogleGenAI } from '@google/genai';
import { db } from '../db/database.js';

export function getGeminiApiKey(): string {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('gemini_api_key') as { value: string } | undefined;
  return row?.value || process.env.GEMINI_API_KEY || '';
}

export async function parseRecipeWithAI(text: string) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Google Gemini API Key is not configured. Please add it in Admin Settings.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are a culinary nutritionist. Parse the following recipe text into a JSON object adhering to this schema:
{
  "title": string,
  "description": string,
  "prep_time_minutes": number,
  "cook_time_minutes": number,
  "servings": number,
  "method": string (plain text instructions, with double line breaks \\n\\n separating each distinct step),
  "calories": number (total for whole recipe or per serving? Make this PER SERVING),
  "protein": number (in grams, per serving),
  "carbohydrates": number (in grams, per serving),
  "fat": number (in grams, per serving),
  "ingredients": [
    {
      "item": string,
      "amount": number,
      "unit": string (e.g. g, ml, cup, tbsp, tsp, piece, can, slice),
      "category": string (one of: Produce, Meat & Poultry, Dairy & Refrigerated, Bakery, Pantry & Grains, Spices & Seasonings, Canned & Jarred, Frozen, Condiments & Sauces, Other),
      "macro_type": string ("protein" | "carbohydrates" | "fat" | ""),
      "calories": number,
      "protein": number,
      "carbohydrates": number,
      "fat": number
    }
  ]
}

Only return valid JSON without markdown fences.

Recipe text to parse:
${text}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });

  const raw = response.text?.trim() || '{}';
  const clean = raw.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
  return JSON.parse(clean);
}

export async function suggestMealPlanWithAI(preferences: {
  daysCount: number;
  caloriesTarget: number;
  proteinTarget: number;
  dietaryNotes?: string;
  availableRecipes: string[];
}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Google Gemini API Key is not configured. Please add it in Admin Settings.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are a family meal planning assistant. Suggest a balanced ${preferences.daysCount}-day family meal plan.
Daily targets: ~${preferences.caloriesTarget} kcal, ~${preferences.proteinTarget}g protein.
Dietary notes: ${preferences.dietaryNotes || 'Wholesome family cooking from scratch'}.
Available existing recipes to prioritize if suitable: ${preferences.availableRecipes.join(', ')}.

Respond ONLY with valid JSON in this structure:
{
  "suggestions": [
    {
      "dayIndex": number (0 to ${preferences.daysCount - 1}),
      "breakfast": { "title": string, "calories": number, "protein": number, "carbs": number, "fat": number, "notes": string },
      "lunch": { "title": string, "calories": number, "protein": number, "carbs": number, "fat": number, "notes": string },
      "dinner": { "title": string, "calories": number, "protein": number, "carbs": number, "fat": number, "notes": string }
    }
  ],
  "summary": string
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });

  const raw = response.text?.trim() || '{}';
  const clean = raw.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
  return JSON.parse(clean);
}

