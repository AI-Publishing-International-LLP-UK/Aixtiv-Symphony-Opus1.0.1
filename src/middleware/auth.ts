import { Request, Response, NextFunction } from 'express';
import jwt = require('jsonwebtoken');
import { JWT_SECRET } from '../config';

export interface AuthRequest extends Request {
  user?: { id: string; username: string };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const generateToken = (user: { id: string; username: string }): string => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
};

