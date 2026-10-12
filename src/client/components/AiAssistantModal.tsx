import React, { useState } from 'react';
import { api } from '../api.js';
import { Recipe } from '../../types/index.js';
import { X, Sparkles, ChefHat } from 'lucide-react';

interface AiAssistantModalProps {
  onClose: () => void;
  onParsedRecipe: (recipe: Partial<Recipe>) => void;
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
      const res = await api.parseRecipeWithAI(recipeText);
      onParsedRecipe(res.recipe);
      onClose();
    } catch (err: any) {
      setError(err.message || 'AI parsing failed. Ensure Google Gemini API key is set in Admin Settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>AI Recipe Assistant (Google Gemini)</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '14px' }}>
            Paste any unformatted recipe, handwritten notes, or grocery list below. Gemini AI will automatically extract the ingredients, measures, estimated macronutrients, and numbered cooking steps.
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <textarea
              rows={8}
              value={recipeText}
              onChange={(e) => setRecipeText(e.target.value)}
              placeholder="e.g. Lemon Garlic Roasted Salmon: Take 500g salmon and season with 2 cloves minced garlic, 1 tbsp olive oil, and fresh dill. Roast in the oven at 190C for 15 minutes. Serve with 2 cups steamed jasmine rice and 300g broccoli florets."
              className="form-textarea"
            />
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
            Uses Google AI Studio free tier models (e.g. Gemini 2.5 Flash / Pro).
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
            <Sparkles size={16} /> {loading ? 'Extracting Recipe...' : 'Parse & Open in Editor'}
          </button>
        </div>
      </div>
    </div>
  );
};

