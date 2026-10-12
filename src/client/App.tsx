import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { Navbar } from './components/Navbar.js';
import { AuthModal } from './components/AuthModal.js';
import { AiAssistantModal } from './components/AiAssistantModal.js';

import { MealPlansView } from './pages/MealPlansView.js';
import { MealPlanEditorView } from './pages/MealPlanEditorView.js';
import { ShoppingListView } from './pages/ShoppingListView.js';
import { RecipesView } from './pages/RecipesView.js';
import { RecipeDetailView } from './pages/RecipeDetailView.js';
import { RecipeEditorView } from './pages/RecipeEditorView.js';
import { AdminView } from './pages/AdminView.js';
import { ProfileView } from './pages/ProfileView.js';
import { PublicMealPlanView } from './pages/PublicMealPlanView.js';
import { PublicShoppingListView } from './pages/PublicShoppingListView.js';
import { Recipe } from '../types/index.js';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('UI error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ maxWidth: '580px', margin: '40px auto', padding: '32px', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--macro-protein)', marginBottom: '12px' }}>Something went wrong</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.92rem' }}>
            {this.state.error?.message || 'An unexpected display error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onReset();
            }}
            className="btn btn-primary"
          >
            Return to Family Meal Plans
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const MainApp: React.FC = () => {
  const { user } = useAuth();

  // Navigation router state
  const [currentView, setCurrentView] = useState<string>('plans');
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | undefined>();

  // Public routing tokens
  const [publicPlanToken, setPublicPlanToken] = useState<string | null>(null);
  const [publicListToken, setPublicListToken] = useState<string | null>(null);

  // Modals state
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiParsedRecipe, setAiParsedRecipe] = useState<Partial<Recipe> | null>(null);

  // Check URL pathname for direct share links and hash for route persistence on refresh
  useEffect(() => {
    const path = window.location.pathname;
    const planMatch = path.match(/^\/share\/plan\/([a-zA-Z0-9_-]+)/);
    if (planMatch) {
      setPublicPlanToken(planMatch[1]);
      return;
    }
    const listMatch = path.match(/^\/share\/list\/([a-zA-Z0-9_-]+)/);
    if (listMatch) {
      setPublicListToken(listMatch[1]);
      return;
    }

    const parseHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (!hash) return;
      const [viewPart, queryPart] = hash.split('?');
      const params = new URLSearchParams(queryPart || '');
      const id = params.get('id') || undefined;

      const validViews = ['plans', 'plan-edit', 'shopping-list', 'recipes', 'recipe-detail', 'recipe-edit', 'admin', 'profile'];
      if (validViews.includes(viewPart)) {
        setCurrentView(viewPart);
        if (viewPart === 'plan-edit' || viewPart === 'shopping-list') {
          setSelectedPlanId(id);
        } else if (viewPart === 'recipe-detail' || viewPart === 'recipe-edit') {
          setSelectedRecipeId(id);
        }
      }
    };

    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  // Public views (no navbar needed)
  if (publicPlanToken) {
    return (
      <div className="app-container">
        <main className="main-content">
          <PublicMealPlanView
            token={publicPlanToken}
            onOpenShoppingList={(listToken) => setPublicListToken(listToken)}
          />
        </main>
      </div>
    );
  }

  if (publicListToken) {
    return (
      <div className="app-container">
        <main className="main-content">
          <PublicShoppingListView token={publicListToken} />
        </main>
      </div>
    );
  }

  // Navigation handlers
  const navigateTo = (view: string, id?: string) => {
    setCurrentView(view);
    if (view === 'plan-edit' || view === 'shopping-list') {
      setSelectedPlanId(id);
    }
    if (view === 'recipe-detail' || view === 'recipe-edit') {
      setSelectedRecipeId(id);
    }
    const hash = id ? `#${view}?id=${id}` : `#${view}`;
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      <Navbar
        currentView={currentView}
        onNavigate={(view) => navigateTo(view)}
        onOpenAuthModal={(mode) => setAuthModalMode(mode)}
      />

      <main className="main-content">
        <ErrorBoundary onReset={() => navigateTo('plans')}>
          {currentView === 'plans' && (
            <MealPlansView
              onSelectPlan={(id) => navigateTo('plan-edit', id)}
              onNewPlan={() => navigateTo('plan-edit', undefined)}
              onOpenShoppingList={(id) => navigateTo('shopping-list', id)}
            />
          )}

          {currentView === 'plan-edit' && (
            <MealPlanEditorView
              planId={selectedPlanId}
              onBack={() => navigateTo('plans')}
              onSaved={(savedId) => {
                setSelectedPlanId(savedId);
                navigateTo('plan-edit', savedId);
              }}
              onOpenShoppingList={(id) => navigateTo('shopping-list', id)}
            />
          )}

          {currentView === 'shopping-list' && selectedPlanId && (
            <ShoppingListView
              planId={selectedPlanId}
              onBack={() => navigateTo('plan-edit', selectedPlanId)}
            />
          )}

          {currentView === 'recipes' && (
            <RecipesView
              onSelectRecipe={(id) => navigateTo('recipe-detail', id)}
              onNewRecipe={() => navigateTo('recipe-edit', undefined)}
              onOpenAiAssistant={() => setShowAiModal(true)}
            />
          )}

          {currentView === 'recipe-detail' && selectedRecipeId && (
            <RecipeDetailView
              recipeId={selectedRecipeId}
              onBack={() => navigateTo('recipes')}
              onEdit={(id) => navigateTo('recipe-edit', id)}
            />
          )}

          {currentView === 'recipe-edit' && (
            <RecipeEditorView
              recipeId={selectedRecipeId}
              onBack={() => navigateTo('recipes')}
              onSaved={(savedId) => navigateTo('recipe-detail', savedId)}
            />
          )}

          {currentView === 'admin' && (
            <AdminView />
          )}

          {currentView === 'profile' && (
            <ProfileView />
          )}
        </ErrorBoundary>
      </main>

      {/* Homely Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)', padding: '24px 20px', textAlign: 'center', marginTop: 'auto' }} className="no-print">
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          FamilyMeals &bull; Wholesome family cooking from scratch with balanced macro nutrition.
        </p>
      </footer>

      {/* Auth Modal */}
      {authModalMode && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => setAuthModalMode(null)}
        />
      )}

      {/* AI Assistant Modal */}
      {showAiModal && (
        <AiAssistantModal
          onClose={() => setShowAiModal(false)}
          onParsedRecipe={(parsed) => {
            setAiParsedRecipe(parsed);
            navigateTo('recipe-edit', undefined);
          }}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
};
export default App;

