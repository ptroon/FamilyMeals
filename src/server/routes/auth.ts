import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db/database.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { DistributionList } from '../../types/index.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-family-meals-jwt-token-key-2026';

// Password complexity requirement: min 8 chars, at least 1 number, at least 1 special char
export function validatePassword(pwd: string): string | null {
  if (!pwd || pwd.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[0-9]/.test(pwd)) {
    return 'Password must contain at least 1 number (0-9).';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd)) {
    return 'Password must contain at least 1 special character (e.g. !@#$%^&*).';
  }
  return null;
}

// Get Google Client ID for frontend Google SSO
router.get('/google-client-id', (req, res): void => {
  const setting = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('google_client_id') as { value: string } | undefined;
  const clientId = setting?.value || process.env.GOOGLE_CLIENT_ID || '';
  res.json({ clientId });
});

// Register
router.post('/register', (req, res): void => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Please provide email, password, and name.' });
      return;
    }

    const pwdError = validatePassword(password);
    if (pwdError) {
      res.status(400).json({ error: pwdError });
      return;
    }

    // Check if registrations are allowed
    const setting = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('allow_registrations') as { value: string } | undefined;
    if (setting && setting.value === 'false') {
      res.status(403).json({ error: 'New user registrations are currently disabled by the administrator.' });
      return;
    }

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists.' });
      return;
    }

    const id = crypto.randomUUID();
    // High-work-factor bcrypt hashing (12 rounds) - passwords never stored in plain text
    const passwordHash = bcrypt.hashSync(password, 12);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, status, saved_emails, distribution_lists, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'user', 'pending', '[]', '[]', ?, ?)
    `).run(id, email.toLowerCase().trim(), passwordHash, name.trim(), now, now);

    res.json({
      message: 'Registration successful! Your account has been registered and is pending administrator approval before you can log in.',
      pending: true
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// Login
router.post('/login', (req, res): void => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Please enter both email and password.' });
      return;
    }

    const row = db.prepare('SELECT id, email, password_hash, name, role, status, saved_emails, distribution_lists, created_at FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
    if (!row) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const match = bcrypt.compareSync(password, row.password_hash);
    if (!match) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (row.status === 'pending') {
      res.status(403).json({ error: 'Your account is pending administrator approval before you can access the system. Please contact your family admin.' });
      return;
    }

    if (row.status === 'rejected') {
      res.status(403).json({ error: 'Your account registration was rejected by an administrator.' });
      return;
    }

    const token = jwt.sign({ id: row.id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        status: row.status || 'approved',
        saved_emails: JSON.parse(row.saved_emails || '[]'),
        distribution_lists: JSON.parse(row.distribution_lists || '[]'),
        created_at: row.created_at
      },
      token
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// Google SSO Authentication
router.post('/google', async (req, res): Promise<void> => {
  try {
    const { credential } = req.body;
    if (!credential) {
      res.status(400).json({ error: 'Google credential token is required.' });
      return;
    }

    // Verify token with Google's public tokeninfo endpoint
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!googleRes.ok) {
      res.status(401).json({ error: 'Invalid Google authentication token.' });
      return;
    }

    const googlePayload = await googleRes.json() as any;
    const email = (googlePayload.email || '').toLowerCase().trim();
    const name = googlePayload.name || googlePayload.given_name || 'Google User';

    if (!email) {
      res.status(400).json({ error: 'No email returned by Google account.' });
      return;
    }

    let user = db.prepare('SELECT id, email, name, role, status, saved_emails, distribution_lists, created_at FROM users WHERE email = ?').get(email) as any;

    if (!user) {
      // Check if registrations are allowed
      const setting = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('allow_registrations') as { value: string } | undefined;
      if (setting && setting.value === 'false') {
        res.status(403).json({ error: 'New user registrations are currently disabled by the administrator.' });
        return;
      }

      // Create new user account with status = 'pending'
      const id = crypto.randomUUID();
      const randomSecret = crypto.randomBytes(32).toString('hex');
      const passwordHash = bcrypt.hashSync(randomSecret, 12);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, status, saved_emails, distribution_lists, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'user', 'pending', '[]', '[]', ?, ?)
      `).run(id, email, passwordHash, name, now, now);

      res.status(403).json({
        error: 'Registration via Google successful! Your account is currently pending administrator approval before you can access the application.'
      });
      return;
    }

    if (user.status === 'pending') {
      res.status(403).json({ error: 'Your account is pending administrator approval before you can access the system. Please contact your family admin.' });
      return;
    }

    if (user.status === 'rejected') {
      res.status(403).json({ error: 'Your account registration was rejected by an administrator.' });
      return;
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status || 'approved',
        saved_emails: JSON.parse(user.saved_emails || '[]'),
        distribution_lists: JSON.parse(user.distribution_lists || '[]'),
        created_at: user.created_at
      },
      token
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Google SSO failed.' });
  }
});

// Current User Profile
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  res.json({ user: req.user });
});

// Update Profile & Saved Contacts & Distribution Lists
router.patch('/profile', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { name, saved_emails, distribution_lists, new_password, current_password } = req.body;
    const userId = req.user!.id;
    const now = new Date().toISOString();

    if (new_password) {
      const pwdError = validatePassword(new_password);
      if (pwdError) {
        res.status(400).json({ error: pwdError });
        return;
      }

      if (!current_password) {
        res.status(400).json({ error: 'Current password is required to change password.' });
        return;
      }
      const userRow = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;
      if (!bcrypt.compareSync(current_password, userRow.password_hash)) {
        res.status(400).json({ error: 'Current password does not match.' });
        return;
      }
      const newHash = bcrypt.hashSync(new_password, 12);
      db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, userId);
    }

    if (name) {
      db.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?').run(name.trim(), now, userId);
    }

    if (Array.isArray(saved_emails)) {
      const sanitizedEmails = saved_emails
        .map((e: string) => e.trim().toLowerCase())
        .filter((e: string) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      db.prepare('UPDATE users SET saved_emails = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(sanitizedEmails), now, userId);
    }

    if (Array.isArray(distribution_lists)) {
      const sanitizedDLs: DistributionList[] = distribution_lists.map((dl: any) => ({
        id: dl.id || crypto.randomUUID(),
        name: (dl.name || 'Family DL').trim(),
        emails: Array.isArray(dl.emails)
          ? dl.emails.map((e: string) => e.trim().toLowerCase()).filter((e: string) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
          : []
      }));
      db.prepare('UPDATE users SET distribution_lists = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(sanitizedDLs), now, userId);
    }

    const updated = db.prepare('SELECT id, email, name, role, saved_emails, distribution_lists, created_at FROM users WHERE id = ?').get(userId) as any;

    res.json({
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        saved_emails: JSON.parse(updated.saved_emails || '[]'),
        distribution_lists: JSON.parse(updated.distribution_lists || '[]'),
        created_at: updated.created_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Profile update failed.' });
  }
});

export default router;
