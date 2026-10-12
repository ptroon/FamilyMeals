import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { User } from '../../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-family-meals-jwt-token-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    const row = db.prepare('SELECT id, email, name, role, saved_emails, distribution_lists, created_at FROM users WHERE id = ?').get(payload.id) as any;

    if (!row) {
      res.status(401).json({ error: 'User not found or token expired.' });
      return;
    }

    req.user = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      saved_emails: JSON.parse(row.saved_emails || '[]'),
      distribution_lists: JSON.parse(row.distribution_lists || '[]'),
      created_at: row.created_at
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function optionalAuthenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    const row = db.prepare('SELECT id, email, name, role, saved_emails, distribution_lists, created_at FROM users WHERE id = ?').get(payload.id) as any;
    if (row) {
      req.user = {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        saved_emails: JSON.parse(row.saved_emails || '[]'),
        distribution_lists: JSON.parse(row.distribution_lists || '[]'),
        created_at: row.created_at
      };
    }
  } catch (err) {
    // Ignore invalid token in optional auth
  }

  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access required.' });
    return;
  }
  next();
}

