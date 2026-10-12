import React from 'react';
import { MacroPill } from './MacroPill.js';

interface MacroSummaryBarProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  compact?: boolean;
}

export const MacroSummaryBar: React.FC<MacroSummaryBarProps> = ({
  calories,
  protein,
  carbs,
  fat,
  targetCalories = 2000,
  targetProtein = 120,
  targetCarbs = 220,
  targetFat = 65,
  compact = false
}) => {
  const calPercent = Math.min(Math.round((calories / (targetCalories || 1)) * 100), 100);
  const proPercent = Math.min(Math.round((protein / (targetProtein || 1)) * 100), 100);

  if (compact) {
    return (
      <div className="macro-group">
        <MacroPill type="calories" value={calories} size="sm" />
        <MacroPill type="protein" value={protein} size="sm" />
        <MacroPill type="carbs" value={carbs} size="sm" />
        <MacroPill type="fat" value={fat} size="sm" />
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-card-subtle)',
      padding: '12px 16px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-color)',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Daily Nutrient Totals:</span>
        <div className="macro-group">
          <MacroPill type="calories" value={calories} />
          <MacroPill type="protein" value={protein} />
          <MacroPill type="carbs" value={carbs} />
          <MacroPill type="fat" value={fat} />
        </div>
      </div>

      {/* Visual Macro Balance Bar */}
      <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', background: 'var(--border-color)', marginTop: '8px' }}>
        <div style={{ width: `${proPercent}%`, background: 'var(--macro-protein)', transition: 'width 0.3s ease' }} title={`Protein: ${protein}g / ${targetProtein}g`} />
        <div style={{ width: `${Math.min(Math.round((carbs / (targetCarbs || 1)) * 100), 100)}%`, background: 'var(--macro-carbs)', transition: 'width 0.3s ease' }} title={`Carbs: ${carbs}g / ${targetCarbs}g`} />
        <div style={{ width: `${Math.min(Math.round((fat / (targetFat || 1)) * 100), 100)}%`, background: 'var(--macro-fat)', transition: 'width 0.3s ease' }} title={`Fat: ${fat}g / ${targetFat}g`} />
      </div>
    </div>
  );
};

