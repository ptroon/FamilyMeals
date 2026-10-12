import React, { useState, useEffect } from 'react';
import { MealPlan, MealPlanDay, MealPlanDayRecipe, Recipe } from '../../types/index.js';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { MacroPill } from '../components/MacroPill.js';
import { MacroSummaryBar } from '../components/MacroSummaryBar.js';
import { ClonePlanModal } from '../components/ClonePlanModal.js';
import { CloneMealModal } from '../components/CloneMealModal.js';
import { ShareModal } from '../components/ShareModal.js';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingCart,
  Share2,
  Copy,
  Calendar,
  Save,
  MessageSquare,
  Sparkles,
  ChefHat
} from 'lucide-react';

interface MealPlanEditorViewProps {
  planId?: string; // If undefined, creating new
  onBack: () => void;
  onSaved: (id: string) => void;
  onOpenShoppingList: (id: string) => void;
}

// Generate array of YYYY-MM-DD date strings between start and end inclusive
function getDatesInRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(startStr + 'T00:00:00Z');
  const end = new Date(endStr + 'T00:00:00Z');

  while (curr <= end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export const MealPlanEditorView: React.FC<MealPlanEditorViewProps> = ({
  planId,
  onBack,
  onSaved,
  onOpenShoppingList
}) => {
  const { user } = useAuth();

  // Default dates: today through 6 days later
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 6);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const [currentPlanId, setCurrentPlanId] = useState<string | undefined>(planId);
  const [shareToken, setShareToken] = useState<string>('');
  const [copiedInlineLink, setCopiedInlineLink] = useState(false);

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(nextWeekStr);
  const [name, setName] = useState(`Meal Plan for ${todayStr} to ${nextWeekStr}`);
  const [isPublic, setIsPublic] = useState(true);
  const [notes, setNotes] = useState('');
  const [days, setDays] = useState<MealPlanDay[]>([]);

  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingList, setGeneratingList] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [showClonePlan, setShowClonePlan] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [activeCloneMealDayIdx, setActiveCloneMealDayIdx] = useState<number | null>(null);

  // Load available recipes for dropdown selection
  useEffect(() => {
    api.getRecipes()
      .then(res => setAvailableRecipes(res.recipes))
      .catch(console.error);
  }, []);

  // Load existing meal plan or initialize empty days
  useEffect(() => {
    setCurrentPlanId(planId);
    if (planId) {
      setLoading(true);
      api.getMealPlan(planId)
        .then(res => {
          const p = res.mealPlan;
          setCurrentPlanId(p.id);
          setShareToken(p.share_token || p.id);
          setName(p.name);
          setStartDate(p.start_date);
          setEndDate(p.end_date);
          setIsPublic(Boolean(p.is_public));
          setNotes(p.notes || '');
          setDays(p.days || []);
        })
        .catch(err => setError(err.message || 'Failed to load meal plan.'))
        .finally(() => setLoading(false));
    } else {
      setShareToken('');
      // Initialize blank schedule slots for the range
      rebuildDays(startDate, endDate);
    }
  }, [planId]);

  const rebuildDays = (start: string, end: string) => {
    const rangeDates = getDatesInRange(start, end);
    const newDays: MealPlanDay[] = [];

    rangeDates.forEach((date) => {
      // Default slots: breakfast, lunch, dinner
      ['breakfast', 'lunch', 'dinner'].forEach((slot) => {
        newDays.push({
          id: `temp-${date}-${slot}-${Math.random()}`,
          meal_plan_id: planId || '',
          date,
          slot: slot as any,
          meal_name: slot.charAt(0).toUpperCase() + slot.slice(1),
          is_blank: false,
          blank_reason: '',
          recipes: []
        });
      });
    });

    setDays(newDays);
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    const defaultName = `Meal Plan for ${val} to ${endDate}`;
    setName(defaultName);
    if (!planId) rebuildDays(val, endDate);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    const defaultName = `Meal Plan for ${startDate} to ${val}`;
    setName(defaultName);
    if (!planId) rebuildDays(startDate, val);
  };

  // Add a recipe to a day slot
  const handleAddRecipeToSlot = (dayIdx: number, recipeId: string) => {
    const rec = availableRecipes.find(r => r.id === recipeId);
    if (!rec) return;

    setDays(prev => {
      const copy = [...prev];
      const targetDay = { ...copy[dayIdx] };
      targetDay.is_blank = false;
      targetDay.blank_reason = '';

      targetDay.recipes = [
        ...targetDay.recipes,
        {
          recipe_id: rec.id,
          recipe: rec,
          servings: rec.servings || 4,
          calories: rec.calories || 0,
          protein: rec.protein || 0,
          carbohydrates: rec.carbohydrates || 0,
          fat: rec.fat || 0
        }
      ];

      copy[dayIdx] = targetDay;
      return copy;
    });
  };

  // Add custom ad-hoc macronutrient component (e.g. 200g chicken breast or 150g fries)
  const handleAddCustomComponent = (dayIdx: number, itemName: string, macroType: string) => {
    if (!itemName.trim()) return;

    let cal = 150, pro = 0, carb = 0, fat = 0;
    if (macroType === 'protein') {
      cal = 200; pro = 35; fat = 3;
    } else if (macroType === 'carbs') {
      cal = 220; carb = 45; pro = 4;
    } else if (macroType === 'fat') {
      cal = 120; fat = 14;
    }

    setDays(prev => {
      const copy = [...prev];
      const targetDay = { ...copy[dayIdx] };
      targetDay.is_blank = false;
      targetDay.blank_reason = '';

      targetDay.recipes = [
        ...targetDay.recipes,
        {
          custom_item_name: itemName.trim(),
          servings: 1,
          calories: cal,
          protein: pro,
          carbohydrates: carb,
          fat: fat,
          custom_ingredients: [{
            item: itemName.trim(),
            amount: 1,
            unit: 'portion',
            category: macroType === 'protein' ? 'Meat & Poultry' : 'Produce',
            calories: cal,
            protein: pro,
            carbohydrates: carb,
            fat: fat
          }]
        }
      ];

      copy[dayIdx] = targetDay;
      return copy;
    });
  };

  // Remove recipe or component from slot
  const handleRemoveRecipeFromSlot = (dayIdx: number, recipeIdx: number) => {
    setDays(prev => {
      const copy = [...prev];
      const targetDay = { ...copy[dayIdx] };
      targetDay.recipes = targetDay.recipes.filter((_, idx) => idx !== recipeIdx);
      copy[dayIdx] = targetDay;
      return copy;
    });
  };

  // Toggle slot as blank with comment reason
  const handleToggleBlankSlot = (dayIdx: number, isBlank: boolean) => {
    setDays(prev => {
      const copy = [...prev];
      const targetDay = { ...copy[dayIdx] };
      targetDay.is_blank = isBlank;
      if (isBlank) {
        targetDay.blank_reason = targetDay.blank_reason || "Eating out with family";
      } else {
        targetDay.blank_reason = '';
      }
      copy[dayIdx] = targetDay;
      return copy;
    });
  };

  const handleUpdateBlankReason = (dayIdx: number, reason: string) => {
    setDays(prev => {
      const copy = [...prev];
      copy[dayIdx] = { ...copy[dayIdx], blank_reason: reason };
      return copy;
    });
  };

  // Calculate daily totals across slots for a date
  const getDayMacroTotals = (dateStr: string) => {
    let cal = 0, pro = 0, carb = 0, fat = 0;
    days.filter(d => d.date === dateStr && !d.is_blank).forEach(d => {
      d.recipes.forEach(r => {
        cal += Number(r.calories) || 0;
        pro += Number(r.protein) || 0;
        carb += Number(r.carbohydrates) || 0;
        fat += Number(r.fat) || 0;
      });
    });
    return { cal, pro, carb, fat };
  };

  // Count total scheduled meals
  const totalMealsCount = days.reduce((acc, d) => acc + (d.is_blank ? 0 : d.recipes.length), 0);

  // Save Meal Plan
  const handleSave = async (): Promise<string | null> => {
    setLoading(true);
    setError('');
    setSuccessMsg('');

    const payload: Partial<MealPlan> = {
      name: name.trim(),
      start_date: startDate,
      end_date: endDate,
      is_public: isPublic,
      notes: notes.trim(),
      days: days.map(d => ({
        ...d,
        recipes: d.recipes.map(r => ({
          recipe_id: r.recipe_id,
          custom_item_name: r.custom_item_name || '',
          servings: Number(r.servings) || 1,
          calories: Number(r.calories) || 0,
          protein: Number(r.protein) || 0,
          carbohydrates: Number(r.carbohydrates) || 0,
          fat: Number(r.fat) || 0,
          custom_ingredients: r.custom_ingredients || []
        }))
      }))
    };

    try {
      const targetId = currentPlanId || planId;
      if (targetId) {
        const res = await api.updateMealPlan(targetId, payload);
        const updatedToken = res.share_token || shareToken || targetId;
        setShareToken(updatedToken);
        setSuccessMsg('Meal plan saved and shared link updated!');
        return targetId;
      } else {
        const res = await api.createMealPlan(payload);
        const newToken = res.share_token || res.id;
        setCurrentPlanId(res.id);
        setShareToken(newToken);
        setSuccessMsg('New meal plan created and shared link generated!');
        onSaved(res.id);
        return res.id;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save meal plan.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Open Share Modal (auto-saves new or edited plan first so the link is guaranteed valid & updated)
  const handleOpenShare = async () => {
    const savedId = await handleSave();
    if (savedId) {
      setShowShare(true);
    }
  };

  // Generate Shopping List
  const handleGenerateShoppingList = async () => {
    if (totalMealsCount === 0) {
      setError('Cannot generate shopping list: this meal plan has no meals applied yet.');
      return;
    }

    setGeneratingList(true);
    setError('');

    try {
      const savedId = await handleSave();
      if (!savedId) return;

      await api.generateShoppingList(savedId);
      onOpenShoppingList(savedId);
    } catch (err: any) {
      setError(err.message || 'Failed to generate shopping list.');
    } finally {
      setGeneratingList(false);
    }
  };

  // Group days by date for display
  const uniqueDates = Array.from(new Set(days.map(d => d.date))).sort();

  // Calculate schedule totals and averages
  let scheduleTotalCal = 0;
  let scheduleTotalPro = 0;
  let scheduleTotalCarb = 0;
  let scheduleTotalFat = 0;

  days.forEach(d => {
    if (!d.is_blank && d.recipes) {
      d.recipes.forEach(r => {
        scheduleTotalCal += Number(r.calories) || 0;
        scheduleTotalPro += Number(r.protein) || 0;
        scheduleTotalCarb += Number(r.carbohydrates) || 0;
        scheduleTotalFat += Number(r.fat) || 0;
      });
    }
  });

  scheduleTotalCal = Math.round(scheduleTotalCal);
  scheduleTotalPro = Math.round(scheduleTotalPro);
  scheduleTotalCarb = Math.round(scheduleTotalCarb);
  scheduleTotalFat = Math.round(scheduleTotalFat);

  const dayCount = uniqueDates.length || 1;
  const scheduleAvgCal = Math.round(scheduleTotalCal / dayCount);
  const scheduleAvgPro = Math.round(scheduleTotalPro / dayCount);
  const scheduleAvgCarb = Math.round(scheduleTotalCarb / dayCount);
  const scheduleAvgFat = Math.round(scheduleTotalFat / dayCount);

  if (loading && (currentPlanId || planId) && days.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        <p>Loading meal plan schedule...</p>
      </div>
    );
  }

  const activeId = currentPlanId || planId;
  const activeShareToken = shareToken || activeId || '';
  const fullShareUrl = activeShareToken ? `${window.location.origin}/share/plan/${activeShareToken}` : '';

  return (
    <div>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <button onClick={onBack} className="btn btn-outline btn-sm">
          <ArrowLeft size={16} /> Back to Meal Plans
        </button>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handleOpenShare} disabled={loading} className="btn btn-outline btn-sm">
            <Share2 size={16} /> Share Plan
          </button>

          {activeId && (
            <button onClick={() => setShowClonePlan(true)} className="btn btn-outline btn-sm">
              <Copy size={16} /> Clone Plan
            </button>
          )}

          <button
            onClick={handleGenerateShoppingList}
            disabled={generatingList || totalMealsCount === 0}
            className="btn btn-secondary btn-sm"
            title={totalMealsCount === 0 ? 'Add meals before generating shopping list' : 'Create synchronized shopping list'}
          >
            <ShoppingCart size={16} />
            <span>{generatingList ? 'Aggregating...' : 'Generate Shopping List'}</span>
          </button>

          <button
            onClick={() => handleSave()}
            disabled={loading}
            className="btn btn-primary btn-sm"
          >
            <Save size={16} />
            <span>{loading ? 'Saving...' : 'Save Plan'}</span>
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {/* Plan Header Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div className="grid-3" style={{ alignItems: 'end', marginBottom: '14px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Plan Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              Make Public (generate short-link for family viewing)
            </label>

            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <strong>{totalMealsCount}</strong> meal items scheduled across <strong>{uniqueDates.length}</strong> day{uniqueDates.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Live Shareable Link Bar */}
          {fullShareUrl && (
            <div style={{
              marginTop: '12px',
              padding: '10px 14px',
              background: 'var(--primary-light)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(194, 89, 63, 0.25)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Share2 size={15} color="var(--primary)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>Shared Link:</span>
                <a
                  href={fullShareUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.85rem', wordBreak: 'break-all', fontWeight: 500 }}
                >
                  {fullShareUrl}
                </a>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                onClick={() => {
                  navigator.clipboard.writeText(fullShareUrl);
                  setCopiedInlineLink(true);
                  setTimeout(() => setCopiedInlineLink(false), 2000);
                }}
              >
                {copiedInlineLink ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          )}

          {/* Schedule Overall Macronutrients Summary */}
          <div style={{
            marginTop: '16px',
            padding: '14px 16px',
            background: 'var(--bg-card-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--primary)' }}>
                  Overall Schedule Macro-Nutrients ({uniqueDates.length} Days Total):
                </span>
              </div>
              <div className="macro-group">
                <MacroPill type="calories" value={scheduleTotalCal} label="Total Cal" />
                <MacroPill type="protein" value={scheduleTotalPro} label="Total Pro" />
                <MacroPill type="carbs" value={scheduleTotalCarb} label="Total Carb" />
                <MacroPill type="fat" value={scheduleTotalFat} label="Total Fat" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border-color)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Daily Average Across Schedule:
              </span>
              <div className="macro-group">
                <MacroPill type="calories" value={scheduleAvgCal} label="Avg Cal/day" size="sm" />
                <MacroPill type="protein" value={scheduleAvgPro} label="Avg Pro/day" size="sm" />
                <MacroPill type="carbs" value={scheduleAvgCarb} label="Avg Carb/day" size="sm" />
                <MacroPill type="fat" value={scheduleAvgFat} label="Avg Fat/day" size="sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Schedule Slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {uniqueDates.map(dateStr => {
          const dateDays = days.filter(d => d.date === dateStr);
          const totals = getDayMacroTotals(dateStr);

          return (
            <div key={dateStr} className="card" style={{ borderLeft: '5px solid var(--primary)' }}>
              {/* Day Header with Daily Total Macros */}
              <div className="card-header" style={{ background: 'var(--bg-card-subtle)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)' }}>
                    {formatDateDisplay(dateStr)}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{dateStr}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>Daily Total:</span>
                  <div className="macro-group">
                    <MacroPill type="calories" value={totals.cal} size="sm" />
                    <MacroPill type="protein" value={totals.pro} size="sm" />
                    <MacroPill type="carbs" value={totals.carb} size="sm" />
                    <MacroPill type="fat" value={totals.fat} size="sm" />
                  </div>
                </div>
              </div>

              {/* Day Slots */}
              <div className="card-body" style={{ padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {dateDays.map(slotDay => {
                    const globalIdx = days.findIndex(d => d.id === slotDay.id);

                    return (
                      <div
                        key={slotDay.id}
                        style={{
                          background: slotDay.is_blank ? 'var(--bg-card-subtle)' : 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        {/* Slot Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {slotDay.slot}
                          </span>

                          <label style={{ fontSize: '0.78rem', color: 'var(--text-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="checkbox"
                              checked={Boolean(slotDay.is_blank)}
                              onChange={(e) => handleToggleBlankSlot(globalIdx, e.target.checked)}
                            />
                            Leave Blank
                          </label>
                        </div>

                        {/* Blank Slot Reason */}
                        {slotDay.is_blank ? (
                          <div style={{ padding: '10px', background: 'var(--bg-card)', borderRadius: '6px', border: '1px dashed var(--border-color)', marginTop: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--amber-text)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                              <MessageSquare size={14} /> Reason for no meal:
                            </div>
                            <input
                              type="text"
                              placeholder="e.g. Eating out at Grandma's, Fasting, Leftovers..."
                              value={slotDay.blank_reason || ''}
                              onChange={(e) => handleUpdateBlankReason(globalIdx, e.target.value)}
                              className="form-input"
                              style={{ fontSize: '0.85rem', padding: '6px 8px' }}
                            />
                          </div>
                        ) : (
                          <>
                            {/* Recipes in this meal */}
                            {slotDay.recipes.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                {slotDay.recipes.map((item, rIdx) => (
                                  <div
                                    key={rIdx}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '8px 10px',
                                      background: 'var(--bg-card-subtle)',
                                      borderRadius: '6px',
                                      fontSize: '0.88rem'
                                    }}
                                  >
                                    <div>
                                      <strong>{item.recipe?.title || item.custom_item_name}</strong>
                                      <div className="macro-group" style={{ marginTop: '2px' }}>
                                        <MacroPill type="calories" value={item.calories} size="sm" />
                                        <MacroPill type="protein" value={item.protein} size="sm" />
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveRecipeFromSlot(globalIdx, rIdx)}
                                      className="btn btn-ghost btn-sm"
                                      style={{ color: 'var(--macro-protein)', padding: '4px' }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p style={{ color: 'var(--text-light)', fontSize: '0.82rem', fontStyle: 'italic', margin: '8px 0' }}>
                                No items added yet for this {slotDay.slot}.
                              </p>
                            )}

                            {/* Add Controls for this slot */}
                            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {/* Recipe Picker Dropdown */}
                              <select
                                className="form-select"
                                style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddRecipeToSlot(globalIdx, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                              >
                                <option value="" disabled>+ Pick a Recipe...</option>
                                {availableRecipes.map(r => (
                                  <option key={r.id} value={r.id}>{r.title} ({r.calories} kcal)</option>
                                ))}
                              </select>

                              {/* Quick Macro Nutrient Component Picker */}
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const item = prompt('Enter protein component (e.g. 200g Chicken breast or Salmon):');
                                    if (item) handleAddCustomComponent(globalIdx, item, 'protein');
                                  }}
                                  className="btn btn-ghost btn-sm"
                                  style={{ fontSize: '0.75rem', flex: 1, padding: '4px 6px', background: 'var(--macro-protein-bg)', color: 'var(--macro-protein)' }}
                                >
                                  + Meat/Protein
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const item = prompt('Enter carbohydrate component (e.g. 150g Potato fries or Rice):');
                                    if (item) handleAddCustomComponent(globalIdx, item, 'carbs');
                                  }}
                                  className="btn btn-ghost btn-sm"
                                  style={{ fontSize: '0.75rem', flex: 1, padding: '4px 6px', background: 'var(--macro-carbs-bg)', color: 'var(--macro-carbs)' }}
                                >
                                  + Fries/Carbs
                                </button>
                              </div>

                              {/* Clone Meal from another plan */}
                              <button
                                type="button"
                                onClick={() => setActiveCloneMealDayIdx(globalIdx)}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '0.75rem', padding: '4px 6px' }}
                              >
                                <Copy size={12} /> Clone Meal from Another Plan
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clone Plan Modal */}
      {showClonePlan && activeId && (
        <ClonePlanModal
          plan={{ id: activeId, name, start_date: startDate, end_date: endDate } as any}
          onClose={() => setShowClonePlan(false)}
          onCloned={(newId) => {
            setShowClonePlan(false);
            onSaved(newId);
          }}
        />
      )}

      {/* Share Modal */}
      {showShare && activeId && (
        <ShareModal
          plan={{ id: activeId, name, share_token: activeShareToken } as any}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Clone Meal Modal */}
      {activeCloneMealDayIdx !== null && (
        <CloneMealModal
          onClose={() => setActiveCloneMealDayIdx(null)}
          onApplyMeal={(clonedRecipes, mealName) => {
            setDays(prev => {
              const copy = [...prev];
              const targetDay = { ...copy[activeCloneMealDayIdx] };
              targetDay.is_blank = false;
              targetDay.blank_reason = '';
              targetDay.recipes = [...targetDay.recipes, ...clonedRecipes];
              if (mealName) targetDay.meal_name = mealName;
              copy[activeCloneMealDayIdx] = targetDay;
              return copy;
            });
            setActiveCloneMealDayIdx(null);
          }}
        />
      )}
    </div>
  );
};

