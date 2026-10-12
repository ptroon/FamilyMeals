import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api.js';
import { X, Lock, Mail, User as UserIcon, Check, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  initialMode: 'login' | 'register';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialMode, onClose }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const { login } = useAuth();

  useEffect(() => {
    api.getGoogleClientId()
      .then(res => setGoogleClientId(res.clientId))
      .catch(() => {});
  }, []);

  // Password validation checks: min 8 chars, at least 1 number, at least 1 special char
  const hasMinLen = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
  const isPasswordValid = hasMinLen && hasNumber && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register' && !isPasswordValid) {
      setError('Password must be at least 8 characters long, include at least 1 number, and at least 1 special character.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login({ email, password });
        login(res.token, res.user);
        onClose();
      } else {
        const res = await api.register({ email, password, name });
        login(res.token, res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');

    // If Google Client ID is configured, trigger Google Sign-In prompt
    if (googleClientId && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            try {
              const res = await api.loginWithGoogle(response.credential);
              login(res.token, res.user);
              onClose();
            } catch (err: any) {
              setError(err.message || 'Google SSO failed.');
            } finally {
              setGoogleLoading(false);
            }
          }
        });
        (window as any).google.accounts.id.prompt();
      } catch (err: any) {
        setError('Could not initialize Google Sign-In: ' + err.message);
        setGoogleLoading(false);
      }
    } else {
      // Fallback prompt for user or token input
      const googleToken = prompt('Enter your Google ID Token or test Google email address:');
      if (!googleToken) {
        setGoogleLoading(false);
        return;
      }
      try {
        const res = await api.loginWithGoogle(googleToken.trim());
        login(res.token, res.user);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Google login failed.');
      } finally {
        setGoogleLoading(false);
      }
    }
  };

  // Load Google GIS script dynamically if clientId is set
  useEffect(() => {
    if (googleClientId && !document.getElementById('google-gsi-client')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [googleClientId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Family Account'}
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            {/* Google SSO Button */}
            <div style={{ marginBottom: '18px' }}>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="btn btn-outline"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-card)'
                }}
              >
                {/* Google Colorful Logo SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{googleLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '18px 0 6px', color: 'var(--text-light)', fontSize: '0.82rem' }}>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
                <span>or continue with email</span>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
              </div>
            </div>

            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name / Family Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Miller Family or Sarah"
                  className="form-input"
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: mode === 'register' ? '12px' : '18px' }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
              />
            </div>

            {/* Password Complexity Checklist for Registration */}
            {mode === 'register' && (
              <div style={{ background: 'var(--bg-card-subtle)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--text-muted)' }}>Password Requirements:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ color: hasMinLen ? 'var(--secondary)' : 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {hasMinLen ? <Check size={13} /> : '•'} At least 8 characters
                  </span>
                  <span style={{ color: hasNumber ? 'var(--secondary)' : 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {hasNumber ? <Check size={13} /> : '•'} At least 1 number (0-9)
                  </span>
                  <span style={{ color: hasSpecial ? 'var(--secondary)' : 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {hasSpecial ? <Check size={13} /> : '•'} At least 1 special character (!@#$%^&*)
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
            >
              {mode === 'login' ? "Don't have an account? Register" : 'Already registered? Sign In'}
            </button>

            <button
              type="submit"
              disabled={loading || (mode === 'register' && !isPasswordValid)}
              className="btn btn-primary"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
