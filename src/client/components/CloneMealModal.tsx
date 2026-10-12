import React, { useState, useEffect } from 'react';
import { MealPlan, MealPlanDayRecipe } from '../../types/index.js';
import { api } from '../api.js';
import { X, Copy, Calendar } from 'lucide-react';

interface CloneMealModalProps {
  onClose: () => void;
  onApplyMeal: (recipes: MealPlanDayRecipe[], mealName?: string) => void;
}

export const CloneMealModal: React.FC<CloneMealModalProps> = ({ onClose, onApplyMeal }) => {
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planDetail, setPlanDetail] = useState<MealPlan | null>(null);
  const [selectedDayId, setSelectedDayId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMealPlans()
      .then(res => {
        setPlans(res.mealPlans);
        if (res.mealPlans.length > 0) {
          setSelectedPlanId(res.mealPlans[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedPlanId) return;
    api.getMealPlan(selectedPlanId)
      .then(res => {
        setPlanDetail(res.mealPlan);
        const nonBlank = res.mealPlan.days?.filter(d => !d.is_blank && d.recipes.length > 0) || [];
        if (nonBlank.length > 0) {
          setSelectedDayId(nonBlank[0].id);
        } else {
          setSelectedDayId('');
        }
      })
      .catch(console.error);
  }, [selectedPlanId]);

  const handleApply = () => {
    if (!planDetail || !selectedDayId) return;
    const day = planDetail.days?.find(d => d.id === selectedDayId);
    if (!day) return;

    onApplyMeal(day.recipes, day.meal_name);
    onClose();
  };

  const eligibleDays = planDetail?.days?.filter(d => !d.is_blank && d.recipes.length > 0) || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Copy size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Clone Meal from Existing Plan</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <p>Loading meal plans...</p>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Select Source Meal Plan</label>
                <select
                  className="form-select"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.start_date} to {p.end_date})
                    </option>
                  ))}
                </select>
              </div>

              {eligibleDays.length > 0 ? (
                <div className="form-group">
                  <label className="form-label">Select Meal to Copy</label>
                  <select
                    className="form-select"
                    value={selectedDayId}
                    onChange={(e) => setSelectedDayId(e.target.value)}
                  >
                    {eligibleDays.map(d => {
                      const recipeNames = d.recipes.map(r => r.recipe?.title || r.custom_item_name).filter(Boolean).join(', ');
                      return (
                        <option key={d.id} value={d.id}>
                          {d.date} - {d.slot.toUpperCase()} ({recipeNames || 'Meal'})
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  This meal plan has no populated meals to clone.
                </p>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApply}
            disabled={!selectedDayId}
          >
            Clone into This Slot
          </button>
        </div>
      </div>
    </div>
  );
};

