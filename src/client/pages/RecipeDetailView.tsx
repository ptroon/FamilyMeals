import React, { useState, useEffect } from 'react';
import { Recipe } from '../../types/index.js';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { MacroPill } from '../components/MacroPill.js';
import { MethodViewer } from '../components/MethodViewer.js';
import { ArrowLeft, Clock, Users, Edit3, Trash2, Globe, Lock, ChefHat } from 'lucide-react';

interface RecipeDetailViewProps {
  recipeId: string;
  onBack: () => void;
  onEdit: (recipeId: string) => void;
}

export const RecipeDetailView: React.FC<RecipeDetailViewProps> = ({ recipeId, onBack, onEdit }) => {
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getRecipe(recipeId)
      .then(res => setRecipe(res.recipe))
      .catch(err => setError(err.message || 'Failed to load recipe.'))
      .finally(() => setLoading(false));
  }, [recipeId]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this recipe?')) return;
    setDeleting(true);
    try {
      await api.deleteRecipe(recipeId);
      onBack();
    } catch (err: any) {
      alert(err.message || 'Failed to delete recipe.');
      setDeleting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0' }}>Loading recipe details...</div>;
  }

  if (error || !recipe) {
    return (
      <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
        <p style={{ color: 'var(--macro-protein)', marginBottom: '16px' }}>{error || 'Recipe not found'}</p>
        <button onClick={onBack} className="btn btn-outline">
          <ArrowLeft size={16} /> Back to Recipes
        </button>
      </div>
    );
  }

  const isOwnerOrAdmin = user && (user.id === recipe.user_id || user.role === 'admin');

  return (
    <div>
      {/* Top back button and actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <button onClick={onBack} className="btn btn-outline btn-sm">
          <ArrowLeft size={16} /> Back to Recipes
        </button>

        {isOwnerOrAdmin && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => onEdit(recipe.id)} className="btn btn-primary btn-sm">
              <Edit3 size={15} /> Edit Recipe
            </button>
            <button onClick={handleDelete} disabled={deleting} className="btn btn-outline btn-sm" style={{ color: 'var(--macro-protein)' }}>
              <Trash2 size={15} /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Banner Image */}
        {recipe.image_url && (
          <div style={{ maxHeight: '380px', overflow: 'hidden', background: 'var(--bg-card-subtle)' }}>
            <img
              src={recipe.image_url}
              alt={recipe.title}
              style={{ width: '100%', height: '380px', objectFit: 'cover' }}
            />
          </div>
        )}

        <div className="card-body">
          {/* Title and metadata */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div>
              <h1 style={{ fontSize: '2.2rem', marginBottom: '6px' }}>{recipe.title}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Recipe by <strong>{recipe.author_name || 'Family Chef'}</strong>
              </p>
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-color)',
              fontSize: '0.82rem'
            }}>
              {recipe.is_public ? <><Globe size={14} /> Public Recipe</> : <><Lock size={14} /> Private Recipe</>}
            </span>
          </div>

          {recipe.description && (
            <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
              {recipe.description}
            </p>
          )}

          {/* Quick Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
            background: 'var(--bg-card-subtle)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '28px'
          }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Prep Time</span>
              <strong style={{ fontSize: '1.1rem' }}>{recipe.prep_time_minutes || 0} mins</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Cook Time</span>
              <strong style={{ fontSize: '1.1rem' }}>{recipe.cook_time_minutes || 0} mins</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Servings</span>
              <strong style={{ fontSize: '1.1rem' }}>{recipe.servings} portions</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Nutrients / Serving</span>
              <div className="macro-group" style={{ marginTop: '4px' }}>
                <MacroPill type="calories" value={recipe.calories} size="sm" />
                <MacroPill type="protein" value={recipe.protein} size="sm" />
                <MacroPill type="carbs" value={recipe.carbohydrates} size="sm" />
                <MacroPill type="fat" value={recipe.fat} size="sm" />
              </div>
            </div>
          </div>

          {/* Two-Column Section: Ingredients & Method */}
          <div className="grid-2" style={{ alignItems: 'start', gap: '32px' }}>
            {/* Ingredients Section */}
            <div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', borderBottom: '2px solid var(--border-color)', paddingBottom: '8px' }}>
                Ingredients
              </h2>

              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                <ul style={{ listStyle: 'none' }}>
                  {recipe.ingredients.map((ing, idx) => (
                    <li key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border-color)'
                    }}>
                      <div>
                        <strong>{ing.item}</strong>
                        {ing.category && (
                          <span style={{ marginLeft: '8px', fontSize: '0.78rem', color: 'var(--text-light)', background: 'var(--bg-card-subtle)', padding: '2px 6px', borderRadius: '4px' }}>
                            {ing.category}
                          </span>
                        )}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {ing.amount} {ing.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No ingredients listed for this recipe.</p>
              )}
            </div>

            {/* Method Section */}
            <div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', borderBottom: '2px solid var(--border-color)', paddingBottom: '8px' }}>
                Method & Cooking Steps
              </h2>
              <MethodViewer methodText={recipe.method} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

