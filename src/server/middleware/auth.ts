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
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    const row = db.prepare('SELECT id, email, name, role, status, saved_emails, distribution_lists, created_at FROM users WHERE id = ?').get(payload.id) as any;

    if (!row) {
      res.status(401).json({ error: 'User not found or token expired.' });
      return;
    }

    if (row.status === 'pending') {
      res.status(403).json({ error: 'Account pending administrator approval.' });
      return;
    }

    if (row.status === 'rejected') {
      res.status(403).json({ error: 'Account registration was rejected.' });
      return;
    }

    req.user = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      status: row.status || 'approved',
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
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    const row = db.prepare('SELECT id, email, name, role, status, saved_emails, distribution_lists, created_at FROM users WHERE id = ?').get(payload.id) as any;
    if (row && row.status !== 'pending' && row.status !== 'rejected') {
      req.user = {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        status: row.status || 'approved',
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

