import React, { useState, useEffect } from 'react';
import { MealPlan } from '../../types/index.js';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { ClonePlanModal } from '../components/ClonePlanModal.js';
import { ShareModal } from '../components/ShareModal.js';
import {
  CalendarDays,
  Plus,
  Copy,
  ShoppingCart,
  Share2,
  Trash2,
  Calendar,
  Globe,
  Lock,
  Utensils
} from 'lucide-react';

interface MealPlansViewProps {
  onSelectPlan: (id: string) => void;
  onNewPlan: () => void;
  onOpenShoppingList: (planId: string) => void;
}

export const MealPlansView: React.FC<MealPlansViewProps> = ({
  onSelectPlan,
  onNewPlan,
  onOpenShoppingList
}) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'my'>('all');
  const [planToClone, setPlanToClone] = useState<MealPlan | null>(null);
  const [planToShare, setPlanToShare] = useState<MealPlan | null>(null);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await api.getMealPlans({ filter });
      setPlans(res.mealPlans);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [filter]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.deleteMealPlan(id);
      loadPlans();
    } catch (err: any) {
      alert(err.message || 'Failed to delete meal plan.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Family Meal Plans</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Schedule meals for the week, track macronutrients, and generate synchronized shopping lists.
          </p>
        </div>

        {user && (
          <button onClick={onNewPlan} className="btn btn-primary">
            <Plus size={18} />
            <span>New Meal Plan</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      {user && (
        <div style={{ display: 'flex', marginBottom: '20px' }}>
          <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <button
              onClick={() => setFilter('all')}
              className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 0 }}
            >
              All Plans
            </button>
            <button
              onClick={() => setFilter('my')}
              className={`btn btn-sm ${filter === 'my' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 0 }}
            >
              My Plans
            </button>
          </div>
        </div>
      )}

      {/* Plan Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading family meal plans...
        </div>
      ) : plans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <CalendarDays size={48} color="var(--primary)" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
          <h3 style={{ marginBottom: '8px' }}>No meal plans yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
            Plan a week of family meals to take the stress out of daily dinner decisions.
          </p>
          {user && (
            <button onClick={onNewPlan} className="btn btn-primary">
              <Plus size={18} /> Create Your First Meal Plan
            </button>
          )}
        </div>
      ) : (
        <div className="grid-2">
          {plans.map(plan => {
            const isOwnerOrAdmin = user && (user.id === plan.user_id || user.role === 'admin');

            return (
              <div key={plan.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} color="var(--primary)" />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {plan.start_date} to {plan.end_date}
                    </span>
                  </div>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.78rem',
                    color: 'var(--text-light)',
                    background: 'var(--bg-card-subtle)',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    {plan.is_public ? <><Globe size={12} /> Public</> : <><Lock size={12} /> Private</>}
                  </span>
                </div>

                <div className="card-body" style={{ flex: 1 }}>
                  <h3
                    style={{ fontSize: '1.25rem', marginBottom: '8px', cursor: 'pointer' }}
                    onClick={() => onSelectPlan(plan.id)}
                  >
                    {plan.name}
                  </h3>

                  {plan.notes && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '14px' }}>
                      {plan.notes}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Utensils size={14} /> {plan.total_meals_count || 0} scheduled meals
                    </span>
                    <span>Created by {plan.author_name || 'Family Planner'}</span>
                  </div>
                </div>

                <div className="card-footer" style={{ flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => onSelectPlan(plan.id)}
                      className="btn btn-outline btn-sm"
                    >
                      View & Edit Plan
                    </button>

                    <button
                      onClick={() => onOpenShoppingList(plan.id)}
                      className="btn btn-secondary btn-sm"
                      title="View or generate shopping list"
                    >
                      <ShoppingCart size={15} /> Shopping List
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {user && (
                      <button
                        onClick={() => setPlanToClone(plan)}
                        className="btn btn-ghost btn-sm"
                        title="Clone this plan to a new date schedule"
                      >
                        <Copy size={15} /> Clone
                      </button>
                    )}

                    <button
                      onClick={() => setPlanToShare(plan)}
                      className="btn btn-ghost btn-sm"
                      title="Share link with family"
                    >
                      <Share2 size={15} /> Share
                    </button>

                    {isOwnerOrAdmin && (
                      <button
                        onClick={() => handleDelete(plan.id, plan.name)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--macro-protein)' }}
                        title="Delete meal plan"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clone Plan Modal */}
      {planToClone && (
        <ClonePlanModal
          plan={planToClone}
          onClose={() => setPlanToClone(null)}
          onCloned={(newId) => {
            setPlanToClone(null);
            loadPlans();
            onSelectPlan(newId);
          }}
        />
      )}

      {/* Share Plan Modal */}
      {planToShare && (
        <ShareModal
          plan={planToShare}
          onClose={() => setPlanToShare(null)}
        />
      )}
    </div>
  );
};

