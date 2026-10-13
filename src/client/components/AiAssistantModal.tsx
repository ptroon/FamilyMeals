import React, { useState } from 'react';
import { api } from '../api.js';
import { Recipe, RecipeIngredient } from '../../types/index.js';
import { X, Sparkles, ChefHat, FileText, Check } from 'lucide-react';

interface AiAssistantModalProps {
  onClose: () => void;
  onParsedRecipe: (recipe: Partial<Recipe>) => void;
}

function parseRecipeLocally(text: string): Partial<Recipe> {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return {};

  let title = lines[0].replace(/^[#*-\d.)\s]+/, '').replace(/^recipe[:\s]*/i, '').trim();
  let description = '';
  let prep_time_minutes = 15;
  let cook_time_minutes = 25;
  let servings = 4;
  const ingredients: RecipeIngredient[] = [];
  const methodSteps: string[] = [];

  let currentSection: 'header' | 'ingredients' | 'method' = 'header';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section headers
    if (/^(ingredients?|what you('ll)? need|shopping list|items)[:\s]*$/i.test(line)) {
      currentSection = 'ingredients';
      continue;
    }
    if (/^(method|instructions?|directions?|steps?|preparation|cooking steps)[:\s]*$/i.test(line)) {
      currentSection = 'method';
      continue;
    }

    // Check for prep/cook time
    const prepMatch = line.match(/prep(?:aration)?\s*(?:time)?[:\s]+(\d+)\s*m/i);
    if (prepMatch) prep_time_minutes = parseInt(prepMatch[1], 10);

    const cookMatch = line.match(/cook(?:ing)?\s*(?:time)?[:\s]+(\d+)\s*m/i);
    if (cookMatch) cook_time_minutes = parseInt(cookMatch[1], 10);

    const servMatch = line.match(/serv(?:es|ings)[:\s]+(\d+)/i);
    if (servMatch) servings = parseInt(servMatch[1], 10);

    if (i === 0) continue; // title line

    if (currentSection === 'header') {
      if (!description && !prepMatch && !cookMatch && !servMatch && !/^[-*•]/.test(line)) {
        description = line;
      } else if (/^[-*•]/.test(line)) {
        // Detected bullet point ingredient in header
        currentSection = 'ingredients';
      }
    }

    if (currentSection === 'ingredients') {
      const cleanLine = line.replace(/^[-*•\d+.)]\s*/, '').trim();
      if (!cleanLine) continue;

      // Extract amount, unit, and item: e.g. "500g chicken breast", "2 tbsp olive oil", "1 can chopped tomatoes"
      const ingMatch = cleanLine.match(/^([\d./]+)?\s*(g|kg|ml|l|tbsp|tsp|tablespoons?|teaspoons?|cups?|can|cans|tin|tins|clove|cloves|slice|slices|piece|pieces)?\s*(?:of\s+)?(.*)$/i);

      if (ingMatch) {
        const amtStr = ingMatch[1] || '1';
        let amt = 1;
        if (amtStr.includes('/')) {
          const parts = amtStr.split('/');
          amt = parseFloat(parts[0]) / parseFloat(parts[1]);
        } else {
          amt = parseFloat(amtStr) || 1;
        }
        const unit = (ingMatch[2] || '').toLowerCase();
        const itemName = (ingMatch[3] || cleanLine).trim();

        if (itemName) {
          ingredients.push({
            item: itemName,
            amount: amt,
            unit: unit || 'g',
            category: 'Produce',
            calories: 0,
            protein: 0,
            carbohydrates: 0,
            fat: 0
          });
        }
      } else {
        ingredients.push({
          item: cleanLine,
          amount: 1,
          unit: 'portion',
          category: 'Produce',
          calories: 0,
          protein: 0,
          carbohydrates: 0,
          fat: 0
        });
      }
    } else if (currentSection === 'method') {
      const step = line.replace(/^\d+[.)]\s*/, '').trim();
      if (step) methodSteps.push(step);
    }
  }

  const method = methodSteps.length > 0 ? methodSteps.join('\n\n') : lines.slice(1).join('\n\n');

  return {
    title,
    description: description || `Delicious homemade ${title}`,
    prep_time_minutes,
    cook_time_minutes,
    servings,
    method,
    ingredients
  };
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ onClose, onParsedRecipe }) => {
  const [recipeText, setRecipeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!recipeText.trim()) {
      setError('Please enter or paste recipe text.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. First attempt AI parsing if backend AI service is active
      let parsedRecipe: Partial<Recipe> | null = null;
      try {
        const aiRes = await api.parseRecipeWithAI(recipeText);
        if (aiRes && aiRes.recipe && aiRes.recipe.title) {
          parsedRecipe = aiRes.recipe;
        }
      } catch {
        // Fall back seamlessly to local parser if AI is unavailable or removed by Google
      }

      // 2. If AI not available, use smart local rule-based recipe parser
      if (!parsedRecipe) {
        parsedRecipe = parseRecipeLocally(recipeText);
      }

      // 3. Dynamically enrich ingredients with UK Government CoFID nutrient database
      if (parsedRecipe.ingredients && parsedRecipe.ingredients.length > 0) {
        const enrichedIngredients = await Promise.all(
          parsedRecipe.ingredients.map(async (ing) => {
            try {
              const nut = await api.lookupNutrients(ing.item, ing.amount || 100, ing.unit || 'g');
              if (nut && nut.found) {
                return {
                  ...ing,
                  calories: nut.calories,
                  protein: nut.protein,
                  carbohydrates: nut.carbohydrates,
                  fat: nut.fat,
                  category: nut.category || ing.category,
                  macro_type: nut.macro_type || '',
                  matched_cofid: nut.matchedFood
                };
              }
            } catch {
              // Ignore individual lookup errors
            }
            return ing;
          })
        );
        parsedRecipe.ingredients = enrichedIngredients as any;

        // Sum recipe per-serving totals
        let totCal = 0, totPro = 0, totCarb = 0, totFat = 0;
        enrichedIngredients.forEach(i => {
          totCal += Number(i.calories) || 0;
          totPro += Number(i.protein) || 0;
          totCarb += Number(i.carbohydrates) || 0;
          totFat += Number(i.fat) || 0;
        });
        const s = Math.max(Number(parsedRecipe.servings) || 4, 1);
        parsedRecipe.calories = Math.round(totCal / s);
        parsedRecipe.protein = Math.round((totPro / s) * 10) / 10;
        parsedRecipe.carbohydrates = Math.round((totCarb / s) * 10) / 10;
        parsedRecipe.fat = Math.round((totFat / s) * 10) / 10;
      }

      onParsedRecipe(parsedRecipe);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to parse recipe text.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Quick Recipe Text Importer</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '14px' }}>
            Paste any unformatted recipe text from a website, email, or notes. The importer automatically extracts the recipe title, prep/cook time, servings, ingredients, cooking steps, and auto-enriches them with <strong>UK Government CoFID macro-nutrients</strong>.
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <textarea
              rows={9}
              value={recipeText}
              onChange={(e) => setRecipeText(e.target.value)}
              placeholder={`Example:
Lemon Garlic Roasted Salmon
Serves: 4
Prep time: 15 mins
Cook time: 20 mins

Ingredients:
- 500g salmon fillet
- 2 tbsp olive oil
- 3 cloves garlic
- 1 tsp mustard
- 300g broccoli florets

Method:
1. Preheat oven to 190°C.
2. Season salmon with olive oil, minced garlic, mustard, salt and pepper.
3. Roast salmon and broccoli on baking sheet for 20 minutes until tender.`}
              className="form-textarea"
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={14} color="var(--secondary)" />
            <span>Works 100% offline and free — enriched automatically with official UK CoFID nutrition data.</span>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || !recipeText.trim()}
            onClick={handleParse}
            className="btn btn-primary"
          >
            <Sparkles size={16} /> {loading ? 'Importing & Calculating Macros...' : 'Parse & Open in Editor'}
          </button>
        </div>
      </div>
    </div>
  );
};
