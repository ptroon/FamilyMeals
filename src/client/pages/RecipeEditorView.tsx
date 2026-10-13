import React, { useState, useEffect } from 'react';
import { Recipe, RecipeIngredient } from '../../types/index.js';
import { api } from '../api.js';
import { ArrowLeft, Plus, Trash2, Upload, Sparkles, Image as ImageIcon } from 'lucide-react';

interface RecipeEditorViewProps {
  recipeId?: string; // If provided, edit mode
  onBack: () => void;
  onSaved: (savedId: string) => void;
}

const CATEGORIES = [
  'Produce',
  'Meat & Poultry',
  'Dairy & Refrigerated',
  'Bakery',
  'Pantry & Grains',
  'Pantry',
  'Spices & Seasonings',
  'Canned & Jarred',
  'Frozen',
  'Condiments & Sauces',
  'Beverages',
  'Other'
];

const PRESET_IMAGES = [
  { label: 'Roast Chicken & Veg', url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=800&q=80' },
  { label: 'Cottage Pie / Bake', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80' },
  { label: 'Fresh Salmon & Greens', url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80' },
  { label: 'Overnight Oats & Berries', url: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=800&q=80' },
  { label: 'Warm Hearty Soup', url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80' },
  { label: 'Fresh Farm Produce', url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80' }
];

export const RecipeEditorView: React.FC<RecipeEditorViewProps> = ({ recipeId, onBack, onSaved }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState(15);
  const [cookTime, setCookTime] = useState(30);
  const [servings, setServings] = useState(4);
  const [isPublic, setIsPublic] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [method, setMethod] = useState('');
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);

  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
    { item: 'Chicken breast', amount: 500, unit: 'g', category: 'Meat & Poultry', macro_type: 'protein', calories: 200, protein: 40, carbohydrates: 0, fat: 4 },
    { item: 'Potato fries / wedges', amount: 400, unit: 'g', category: 'Produce', macro_type: 'carbohydrates', calories: 150, protein: 3, carbohydrates: 30, fat: 1 }
  ]);

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (recipeId) {
      setLoading(true);
      api.getRecipe(recipeId)
        .then(res => {
          const r = res.recipe;
          setTitle(r.title);
          setDescription(r.description || '');
          setPrepTime(r.prep_time_minutes || 0);
          setCookTime(r.cook_time_minutes || 0);
          setServings(r.servings || 4);
          setIsPublic(Boolean(r.is_public));
          setImageUrl(r.image_url || '');
          setMethod(r.method || '');
          setCalories(r.calories || 0);
          setProtein(r.protein || 0);
          setCarbs(r.carbohydrates || 0);
          setFat(r.fat || 0);
          if (r.ingredients && r.ingredients.length > 0) {
            setIngredients(r.ingredients);
          }
        })
        .catch(err => setError(err.message || 'Failed to load recipe.'))
        .finally(() => setLoading(false));
    }
  }, [recipeId]);

  const handleAddIngredient = () => {
    setIngredients(prev => [
      ...prev,
      { item: '', amount: 100, unit: 'g', category: 'Produce', macro_type: '', calories: 0, protein: 0, carbohydrates: 0, fat: 0 }
    ]);
  };

  // Dynamic UK Government CoFID nutrient lookup
  const triggerNutrientLookup = async (index: number, itemName: string, amount: number, unit: string) => {
    if (!itemName || itemName.trim().length < 2) {
      setIngredients(prev => {
        const copy = [...prev];
        if (copy[index]) {
          copy[index] = { ...copy[index], matched_cofid: undefined } as any;
        }
        return copy;
      });
      return;
    }

    try {
      const res = await api.lookupNutrients(itemName, amount || 100, unit || 'g');
      if (res && res.found) {
        setIngredients(prev => {
          const copy = [...prev];
          const curr = copy[index];
          if (!curr) return prev;
          copy[index] = {
            ...curr,
            calories: res.calories,
            protein: res.protein,
            carbohydrates: res.carbohydrates,
            fat: res.fat,
            category: res.category || curr.category,
            macro_type: res.macro_type || curr.macro_type,
            matched_cofid: res.matchedFood
          } as any;
          return copy;
        });
      } else {
        setIngredients(prev => {
          const copy = [...prev];
          const curr = copy[index];
          if (!curr) return prev;
          copy[index] = {
            ...curr,
            matched_cofid: 'not_found'
          } as any;
          return copy;
        });
      }
    } catch {
      // Ignore network error
    }
  };

  const handleUpdateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    setIngredients(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });

    // If changing item name, amount, or unit, trigger dynamic UK Gov CoFID lookup
    if (field === 'item' || field === 'amount' || field === 'unit') {
      const targetIng = ingredients[index];
      const itemToLookup = field === 'item' ? String(value) : targetIng.item;
      const amountToLookup = field === 'amount' ? Number(value) : targetIng.amount;
      const unitToLookup = field === 'unit' ? String(value) : targetIng.unit;
      triggerNutrientLookup(index, itemToLookup, amountToLookup, unitToLookup);
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  // Automatically recalculate recipe macros per serving whenever ingredients or servings change
  useEffect(() => {
    let totCal = 0, totPro = 0, totCarb = 0, totFat = 0;
    ingredients.forEach(i => {
      totCal += Number(i.calories) || 0;
      totPro += Number(i.protein) || 0;
      totCarb += Number(i.carbohydrates) || 0;
      totFat += Number(i.fat) || 0;
    });
    const s = Math.max(Number(servings) || 4, 1);
    setCalories(Math.round(totCal / s));
    setProtein(Math.round((totPro / s) * 10) / 10);
    setCarbs(Math.round((totCarb / s) * 10) / 10);
    setFat(Math.round((totFat / s) * 10) / 10);
  }, [ingredients, servings]);

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError('');
    try {
      const res = await api.uploadRecipeImage(file);
      setImageUrl(res.imageUrl);
    } catch (err: any) {
      setError(err.message || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  const autoSumMacros = () => {
    let totCal = 0, totPro = 0, totCarb = 0, totFat = 0;
    ingredients.forEach(i => {
      totCal += Number(i.calories) || 0;
      totPro += Number(i.protein) || 0;
      totCarb += Number(i.carbohydrates) || 0;
      totFat += Number(i.fat) || 0;
    });
    const s = Math.max(Number(servings) || 4, 1);
    setCalories(Math.round(totCal / s));
    setProtein(Math.round((totPro / s) * 10) / 10);
    setCarbs(Math.round((totCarb / s) * 10) / 10);
    setFat(Math.round((totFat / s) * 10) / 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Recipe title is required.');
      return;
    }

    setLoading(true);
    setError('');

    const payload: Partial<Recipe> = {
      title: title.trim(),
      description: description.trim(),
      prep_time_minutes: Number(prepTime) || 0,
      cook_time_minutes: Number(cookTime) || 0,
      servings: Number(servings) || 4,
      is_public: isPublic,
      image_url: imageUrl,
      method: method.trim(),
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbohydrates: Number(carbs) || 0,
      fat: Number(fat) || 0,
      ingredients: ingredients.filter(i => i.item.trim().length > 0)
    };

    try {
      if (recipeId) {
        await api.updateRecipe(recipeId, payload);
        onSaved(recipeId);
      } else {
        const res = await api.createRecipe(payload);
        onSaved(res.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save recipe.');
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={onBack} className="btn btn-outline btn-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 style={{ fontSize: '1.8rem', margin: 0 }}>
          {recipeId ? 'Edit Recipe' : 'Create Wholesome Recipe'}
        </h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Basic Details</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              Make Public (visible to other family meal planners)
            </label>
          </div>

          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Recipe Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Herb-Roasted Chicken with Crispy Potato Wedges"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description & Background</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A hearty family dish cooked from scratch..."
                className="form-textarea"
                style={{ minHeight: '80px' }}
              />
            </div>

            <div className="grid-3" style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Prep Time (mins)</label>
                <input
                  type="number"
                  min="0"
                  value={prepTime}
                  onChange={(e) => setPrepTime(Number(e.target.value))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cook Time (mins)</label>
                <input
                  type="number"
                  min="0"
                  value={cookTime}
                  onChange={(e) => setCookTime(Number(e.target.value))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Servings</label>
                <input
                  type="number"
                  min="1"
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value))}
                  className="form-input"
                />
              </div>
            </div>

            {/* Photo / Image section */}
            <div className="form-group">
              <label className="form-label">Recipe Photo (Wholesome food only, no people)</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... or upload below"
                  className="form-input"
                  style={{ flex: 1, minWidth: '240px' }}
                />

                <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                  <Upload size={16} />
                  <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Quick Image Presets */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Presets:</span>
                {PRESET_IMAGES.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImageUrl(p.url)}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.78rem', padding: '3px 8px', border: '1px solid var(--border-color)' }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {imageUrl && (
                <div style={{ marginTop: '12px', width: '120px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <img src={imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ingredients Builder Section */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <div>
              <h3 style={{ margin: '0 0 2px 0', fontSize: '1.15rem' }}>Ingredients Section</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Pick food items, measures (volume/weight), categories, and macro nutrients.
              </p>
            </div>
            <button type="button" onClick={handleAddIngredient} className="btn btn-secondary btn-sm">
              <Plus size={16} /> Add Ingredient
            </button>
          </div>

          <div className="card-body">
            <div style={{ marginBottom: '10px', fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>🇬🇧 UK Government CoFID Integration:</span>
              <span>Macro-nutrients automatically fill when you enter food items (e.g. chicken breast, potatoes, oats). You can overwrite any value anytime.</span>
            </div>

            {ingredients.map((ing, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  marginBottom: '12px',
                  padding: '10px',
                  background: 'var(--bg-card-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)'
                }}
              >
                {/* Top Row: Food Item, Amount, Unit, Category, Delete */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2.5fr 1fr 1fr 1.8fr 36px',
                    gap: '8px',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <input
                      type="text"
                      placeholder="Food item (e.g. Chicken breast)"
                      value={ing.item}
                      onChange={(e) => handleUpdateIngredient(index, 'item', e.target.value)}
                      className="form-input"
                      style={{ padding: '6px 10px', fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="any"
                      placeholder="Amount"
                      value={ing.amount}
                      onChange={(e) => handleUpdateIngredient(index, 'amount', Number(e.target.value))}
                      className="form-input"
                      style={{ padding: '6px 10px' }}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Unit (g, ml, cup)"
                      value={ing.unit}
                      onChange={(e) => handleUpdateIngredient(index, 'unit', e.target.value)}
                      className="form-input"
                      style={{ padding: '6px 10px' }}
                    />
                  </div>
                  <div>
                    <select
                      value={ing.category}
                      onChange={(e) => handleUpdateIngredient(index, 'category', e.target.value)}
                      className="form-select"
                      style={{ padding: '6px 10px' }}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(index)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--macro-protein)', padding: '6px' }}
                    title="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Bottom Row: Dynamic & Editable Macronutrients */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '4px', borderTop: '1px dashed var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    {(ing as any).matched_cofid === 'not_found' ? (
                      <span style={{ color: 'var(--amber-text)', fontWeight: 600 }}>
                        ⚠️ UK CoFID: Not found (enter values manually or leave blank)
                      </span>
                    ) : (ing as any).matched_cofid ? (
                      <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>
                        ✓ UK Gov CoFID: {(ing as any).matched_cofid}
                      </span>
                    ) : (
                      <span>Enter item name for auto-fill</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--macro-cal)', fontWeight: 600 }}>Cal:</span>
                      <input
                        type="number"
                        placeholder="kcal"
                        title="Calories"
                        value={ing.calories || ''}
                        onChange={(e) => handleUpdateIngredient(index, 'calories', Number(e.target.value))}
                        className="form-input"
                        style={{ width: '68px', padding: '3px 6px', fontSize: '0.8rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--macro-protein)', fontWeight: 600 }}>Pro:</span>
                      <input
                        type="number"
                        step="any"
                        placeholder="g"
                        title="Protein (g)"
                        value={ing.protein || ''}
                        onChange={(e) => handleUpdateIngredient(index, 'protein', Number(e.target.value))}
                        className="form-input"
                        style={{ width: '60px', padding: '3px 6px', fontSize: '0.8rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--macro-carbs)', fontWeight: 600 }}>Carb:</span>
                      <input
                        type="number"
                        step="any"
                        placeholder="g"
                        title="Carbs (g)"
                        value={ing.carbohydrates || ''}
                        onChange={(e) => handleUpdateIngredient(index, 'carbohydrates', Number(e.target.value))}
                        className="form-input"
                        style={{ width: '60px', padding: '3px 6px', fontSize: '0.8rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--macro-fat)', fontWeight: 600 }}>Fat:</span>
                      <input
                        type="number"
                        step="any"
                        placeholder="g"
                        title="Fat (g)"
                        value={ing.fat || ''}
                        onChange={(e) => handleUpdateIngredient(index, 'fat', Number(e.target.value))}
                        className="form-input"
                        style={{ width: '60px', padding: '3px 6px', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddIngredient}
              className="btn btn-outline btn-sm"
              style={{ marginTop: '8px' }}
            >
              <Plus size={14} /> Add Another Ingredient
            </button>
          </div>
        </div>

        {/* Method Section */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <div>
              <h3 style={{ margin: '0 0 2px 0', fontSize: '1.15rem' }}>Method Section (Cooking Instructions)</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Supply instructions in plain text. Use a <strong>blank line (press Enter twice)</strong> to split each cooking step!
              </p>
            </div>
          </div>

          <div className="card-body">
            <textarea
              required
              rows={9}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              placeholder="Step 1: Preheat the oven to 200°C. Line a tray with baking paper.&#10;&#10;Step 2: Season the chicken with herbs and olive oil.&#10;&#10;Step 3: Roast for 35 minutes until golden brown."
              className="form-textarea"
              style={{ fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* Nutritional Macronutrients Section */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <div>
              <h3 style={{ margin: '0 0 2px 0', fontSize: '1.15rem' }}>Macronutrient Values (Per Serving)</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Track the amount of protein, carbohydrates, fat, and calories per portion.
              </p>
            </div>
            <button
              type="button"
              onClick={autoSumMacros}
              className="btn btn-outline btn-sm"
              title="Calculate estimated sum from ingredients"
            >
              <Sparkles size={14} /> Calculate from Ingredients
            </button>
          </div>

          <div className="card-body">
            <div className="grid-4">
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--macro-cal)' }}>Calories (kcal)</label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(Number(e.target.value))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--macro-protein)' }}>Protein (g)</label>
                <input
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(Number(e.target.value))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--macro-carbs)' }}>Carbohydrates (g)</label>
                <input
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(Number(e.target.value))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--macro-fat)' }}>Fat (g)</label>
                <input
                  type="number"
                  value={fat}
                  onChange={(e) => setFat(Number(e.target.value))}
                  className="form-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" onClick={onBack} className="btn btn-outline">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg">
            {loading ? 'Saving Recipe...' : recipeId ? 'Update Recipe' : 'Save Recipe'}
          </button>
        </div>
      </form>
    </div>
  );
};

