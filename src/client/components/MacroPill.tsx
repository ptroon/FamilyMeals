import React from 'react';

interface MacroPillProps {
  type: 'protein' | 'carbs' | 'fat' | 'calories';
  value: number;
  label?: string;
  size?: 'sm' | 'md';
}

export const MacroPill: React.FC<MacroPillProps> = ({ type, value, label, size = 'md' }) => {
  const rounded = Math.round(value * 10) / 10;

  let unit = 'g';
  let defaultLabel = 'Protein';

  switch (type) {
    case 'protein':
      unit = 'g';
      defaultLabel = 'Protein';
      break;
    case 'carbs':
      unit = 'g';
      defaultLabel = 'Carbs';
      break;
    case 'fat':
      unit = 'g';
      defaultLabel = 'Fat';
      break;
    case 'calories':
      unit = 'kcal';
      defaultLabel = 'Cal';
      break;
  }

  const displayLabel = label || defaultLabel;

  return (
    <span className={`macro-pill ${type}`} style={{ fontSize: size === 'sm' ? '0.75rem' : '0.82rem' }}>
      <span style={{ opacity: 0.85 }}>{displayLabel}:</span>
      <strong>{rounded}{unit}</strong>
    </span>
  );
};

