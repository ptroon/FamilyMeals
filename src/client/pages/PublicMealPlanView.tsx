import React, { useState, useEffect } from 'react';
import { MealPlan } from '../../types/index.js';
import { api } from '../api.js';
import { MacroPill } from '../components/MacroPill.js';
import { MethodViewer } from '../components/MethodViewer.js';
import {
  CalendarDays,
  ShoppingCart,
  Printer,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  Utensils
} from 'lucide-react';

interface PublicMealPlanViewProps {
  token: string;
  onOpenShoppingList?: (token: string) => void;
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export const PublicMealPlanView: React.FC<PublicMealPlanViewProps> = ({ token, onOpenShoppingList }) => {
  const [plan, setPlan] = useState<MealPlan & { shopping_share_token?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getSharedPlan(token)
      .then(res => setPlan(res.mealPlan))
      .catch(err => setError(err.message || 'Could not load public meal plan.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0' }}>Loading shared family meal plan...</div>;
  }

  if (error || !plan) {
    return (
      <div className="card" style={{ padding: '36px', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
        <h3 style={{ color: 'var(--macro-protein)', marginBottom: '8px' }}>Meal Plan Unavailable</h3>
        <p style={{ color: 'var(--text-muted)' }}>{error || 'The link may have expired or is private.'}</p>
      </div>
    );
  }

  const days = plan.days || [];
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

  // Helper for daily total macros
  const getDayMacroTotals = (dateStr: string) => {
    const daySlots = days.filter(d => d.date === dateStr);
    let cal = 0, pro = 0, carb = 0, fat = 0;
    daySlots.forEach(slot => {
      if (!slot.is_blank && slot.recipes) {
        slot.recipes.forEach(r => {
          cal += Number(r.calories) || 0;
          pro += Number(r.protein) || 0;
          carb += Number(r.carbohydrates) || 0;
          fat += Number(r.fat) || 0;
        });
      }
    });
    return {
      cal: Math.round(cal),
      pro: Math.round(pro),
      carb: Math.round(carb),
      fat: Math.round(fat)
    };
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div className="card" style={{ marginBottom: '24px', background: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
        <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--primary)' }}>
              Public Family View (Read-Only)
            </span>
            <h1 style={{ fontSize: '1.8rem', margin: '4px 0 6px 0' }}>{plan.name}</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Schedule: <strong>{plan.start_date}</strong> to <strong>{plan.end_date}</strong> &bull; Shared by {plan.author_name || 'Family Planner'}
            </p>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => window.print()} className="btn btn-outline btn-sm">
              <Printer size={16} /> Print Schedule
            </button>
          </div>
        </div>

        {/* Schedule Overall Macronutrients Summary */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-color)',
          background: 'rgba(255, 255, 255, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--primary)' }}>
              Overall Schedule Macro-Nutrients ({uniqueDates.length} Days Total):
            </span>
            <div className="macro-group">
              <MacroPill type="calories" value={scheduleTotalCal} label="Total Cal" />
              <MacroPill type="protein" value={scheduleTotalPro} label="Total Pro" />
              <MacroPill type="carbs" value={scheduleTotalCarb} label="Total Carb" />
              <MacroPill type="fat" value={scheduleTotalFat} label="Total Fat" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '6px', borderTop: '1px dashed var(--border-color)' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
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

      {/* Daily Schedule List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {uniqueDates.map(dateStr => {
          const dateDays = days.filter(d => d.date === dateStr);
          const totals = getDayMacroTotals(dateStr);

          return (
            <div key={dateStr} className="card" style={{ overflow: 'hidden' }}>
              <div className="card-header" style={{ background: 'var(--bg-card-subtle)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary)' }}>
                    {formatDateDisplay(dateStr)}
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{dateStr}</span>
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

              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {dateDays.map(slotDay => (
                    <div
                      key={slotDay.id}
                      style={{
                        padding: '12px 16px',
                        background: slotDay.is_blank ? 'var(--bg-card-subtle)' : 'var(--bg-card)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {slotDay.slot}
                        </span>
                      </div>

                      {slotDay.is_blank ? (
                        <div style={{ fontStyle: 'italic', color: 'var(--amber-text)', fontSize: '0.9rem' }}>
                          No meal scheduled: {slotDay.blank_reason || 'Eating out'}
                        </div>
                      ) : slotDay.recipes.length === 0 ? (
                        <div style={{ color: 'var(--text-light)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                          No recipes scheduled.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {slotDay.recipes.map((item, idx) => {
                            const isExpanded = expandedRecipeId === `${slotDay.id}-${idx}`;

                            return (
                              <div
                                key={idx}
                                style={{
                                  background: 'var(--bg-card-subtle)',
                                  borderRadius: '6px',
                                  padding: '12px',
                                  border: '1px solid var(--border-color)'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                  <div>
                                    <h4 style={{ margin: 0, fontSize: '1.05rem' }}>
                                      {item.recipe?.title || item.custom_item_name}
                                    </h4>
                                    <div className="macro-group" style={{ marginTop: '4px' }}>
                                      <MacroPill type="calories" value={item.calories} size="sm" />
                                      <MacroPill type="protein" value={item.protein} size="sm" />
                                      <MacroPill type="carbs" value={item.carbohydrates} size="sm" />
                                      <MacroPill type="fat" value={item.fat} size="sm" />
                                    </div>
                                  </div>

                                  {item.recipe && (
                                    <button
                                      onClick={() => setExpandedRecipeId(isExpanded ? null : `${slotDay.id}-${idx}`)}
                                      className="btn btn-ghost btn-sm"
                                      style={{ fontSize: '0.8rem' }}
                                    >
                                      {isExpanded ? <><ChevronUp size={16} /> Hide Method</> : <><ChevronDown size={16} /> View Cooking Method</>}
                                    </button>
                                  )}
                                </div>

                                {/* Expanded Method instructions & ingredients */}
                                {isExpanded && item.recipe && (
                                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                                    {item.recipe.image_url && (
                                      <img
                                        src={item.recipe.image_url}
                                        alt={item.recipe.title}
                                        style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '6px', marginBottom: '12px' }}
                                      />
                                    )}

                                    <h5 style={{ margin: '0 0 8px 0', fontSize: '0.92rem' }}>Method Steps:</h5>
                                    <MethodViewer methodText={item.recipe.method} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

