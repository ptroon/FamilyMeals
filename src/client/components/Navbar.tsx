import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import {
  UtensilsCrossed,
  CalendarDays,
  ShoppingCart,
  ChefHat,
  Shield,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Menu,
  X
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, id?: string) => void;
  onOpenAuthModal: (mode: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenAuthModal }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (view: string) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="nav-wrapper">
        <a href="#home" onClick={(e) => { e.preventDefault(); handleNav('plans'); }} className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UtensilsCrossed size={26} color="var(--primary)" />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span>FamilyMeals</span>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--primary)',
              background: 'var(--primary-light)',
              padding: '1px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(194, 89, 63, 0.25)',
              letterSpacing: '0.02em',
              verticalAlign: 'middle'
            }}>
              v0.4
            </span>
          </div>
        </a>

        {/* Desktop Nav Links */}
        <nav className="nav-links" style={{ display: 'flex' }}>
          <button
            onClick={() => handleNav('plans')}
            className={`btn btn-ghost nav-link ${currentView === 'plans' ? 'active' : ''}`}
          >
            <CalendarDays size={18} />
            <span>Meal Plans</span>
          </button>

          <button
            onClick={() => handleNav('recipes')}
            className={`btn btn-ghost nav-link ${currentView === 'recipes' ? 'active' : ''}`}
          >
            <ChefHat size={18} />
            <span>Recipes</span>
          </button>

          {user && (
            <button
              onClick={() => handleNav('profile')}
              className={`btn btn-ghost nav-link ${currentView === 'profile' ? 'active' : ''}`}
            >
              <UserIcon size={18} />
              <span>Family Contacts</span>
            </button>
          )}

          {user?.role === 'admin' && (
            <button
              onClick={() => handleNav('admin')}
              className={`btn btn-ghost nav-link ${currentView === 'admin' ? 'active' : ''}`}
            >
              <Shield size={18} />
              <span>Admin</span>
            </button>
          )}
        </nav>

        {/* Action Controls & Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-sm"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            style={{ borderRadius: 'var(--radius-full)', padding: '8px' }}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} color="#fbbf24" />}
          </button>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)' }} className="hide-on-mobile">
                {user.name}
              </span>
              <button
                onClick={logout}
                className="btn btn-outline btn-sm"
                title="Log Out"
              >
                <LogOut size={16} />
                <span className="hide-on-mobile">Logout</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onOpenAuthModal('login')}
                className="btn btn-outline btn-sm"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuthModal('register')}
                className="btn btn-primary btn-sm"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

