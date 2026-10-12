import React, { useState } from 'react';
import { MealPlan } from '../../types/index.js';
import { api } from '../api.js';
import { X, Copy, Calendar } from 'lucide-react';

interface ClonePlanModalProps {
  plan: MealPlan;
  onClose: () => void;
  onCloned: (newPlanId: string) => void;
}

export const ClonePlanModal: React.FC<ClonePlanModalProps> = ({ plan, onClose, onCloned }) => {
  // Default new start date is today or next Monday
  const todayStr = new Date().toISOString().split('T')[0];
  const [newStartDate, setNewStartDate] = useState(todayStr);
  const [newName, setNewName] = useState(`Copy of ${plan.name}`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStartDate) {
      setError('Please select a new start date.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.cloneMealPlan(plan.id, {
        new_start_date: newStartDate,
        new_name: newName
      });
      onCloned(res.id);
    } catch (err: any) {
      setError(err.message || 'Failed to clone meal plan.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Copy size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Clone Meal Plan</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Clone <strong>"{plan.name}"</strong> to a new date schedule. All recipes, meals, and macronutrient targets will be automatically copied.
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">New Start Date</label>
              <input
                type="date"
                required
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Plan Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Leave blank to use default name"
                className="form-input"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Cloning Plan...' : 'Clone Meal Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

