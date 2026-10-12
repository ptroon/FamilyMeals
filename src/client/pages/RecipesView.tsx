import React, { useState, useEffect } from 'react';
import { Recipe } from '../../types/index.js';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { MacroPill } from '../components/MacroPill.js';
import { ChefHat, Plus, Search, Clock, Users, Sparkles, Globe, Lock } from 'lucide-react';

interface RecipesViewProps {
  onSelectRecipe: (id: string) => void;
  onNewRecipe: () => void;
  onOpenAiAssistant: () => void;
}

export const RecipesView: React.FC<RecipesViewProps> = ({
  onSelectRecipe,
  onNewRecipe,
  onOpenAiAssistant
}) => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'my'>('all');

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const res = await api.getRecipes({ q: search, filter });
      setRecipes(res.recipes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes();
  }, [search, filter]);

  return (
    <div>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Family Recipes</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Wholesome, home-cooked meals with ingredient measures and macronutrient tracking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {user && (
            <button onClick={onOpenAiAssistant} className="btn btn-secondary">
              <Sparkles size={18} />
              <span>AI Recipe Assistant</span>
            </button>
          )}

          {user && (
            <button onClick={onNewRecipe} className="btn btn-primary">
              <Plus size={18} />
              <span>Create Recipe</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-light)' }} />
          <input
            type="text"
            placeholder="Search recipes by name, ingredient, or method..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '38px' }}
          />
        </div>

        {user && (
          <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <button
              onClick={() => setFilter('all')}
              className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 0 }}
            >
              All Recipes
            </button>
            <button
              onClick={() => setFilter('my')}
              className={`btn btn-sm ${filter === 'my' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 0 }}
            >
              My Recipes
            </button>
          </div>
        )}
      </div>

      {/* Recipe Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading delicious family recipes...
        </div>
      ) : recipes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <ChefHat size={48} color="var(--primary)" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
          <h3 style={{ marginBottom: '8px' }}>No recipes found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
            {search ? 'Try clearing your search filters.' : 'Get started by creating your family’s first wholesome recipe!'}
          </p>
          {user && (
            <button onClick={onNewRecipe} className="btn btn-primary">
              <Plus size={18} /> Create Recipe
            </button>
          )}
        </div>
      ) : (
        <div className="grid-3">
          {recipes.map(recipe => (
            <div
              key={recipe.id}
              className="card"
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
              onClick={() => onSelectRecipe(recipe.id)}
            >
              {/* Recipe Image (Food only, no people) */}
              <div style={{ position: 'relative', height: '190px', background: 'var(--bg-card-subtle)', overflow: 'hidden' }}>
                <img
                  src={recipe.image_url || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80'}
                  alt={recipe.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                />
                <span style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(0, 0, 0, 0.65)',
                  color: '#fff',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {recipe.is_public ? <><Globe size={12} /> Public</> : <><Lock size={12} /> Private</>}
                </span>
              </div>

              <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{recipe.title}</h3>
                <p style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.88rem',
                  marginBottom: '16px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {recipe.description || 'Wholesome family recipe made with love and fresh ingredients.'}
                </p>

                {/* Timing & Servings */}
                <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '14px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} /> {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} mins
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={14} /> {recipe.servings} servings
                  </span>
                </div>

                {/* Macro Nutrients */}
                <div style={{ marginTop: 'auto' }}>
                  <div className="macro-group">
                    <MacroPill type="calories" value={recipe.calories} size="sm" />
                    <MacroPill type="protein" value={recipe.protein} size="sm" />
                    <MacroPill type="carbs" value={recipe.carbohydrates} size="sm" />
                    <MacroPill type="fat" value={recipe.fat} size="sm" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

