/**
 * Authentication middleware for Aixtiv Symphony Integration Gateway
 * 
 * This module provides authentication functionality including token generation,
 * validation, and middleware for protecting routes.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// JWT secret key (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'aixtiv-symphony-integration-gateway-secret';

// Token expiration time
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION || '24h';

/**
 * User information interface
 */
export interface UserInfo {
  id: string;
  username: string;
  roles?: string[];
  [key: string]: any; // Allow additional properties
}

/**
 * Extended Request interface with user property
 */
export interface AuthRequest extends Request {
  user?: UserInfo;
  body: any;
  headers: {
    authorization?: string;
    [key: string]: string | string[] | undefined;
  };
}

/**
 * Generate a JWT token for a user
 * @param userInfo User information to include in the token
 * @returns JWT token string
 */
export function generateToken(userInfo: UserInfo): string {
  return jwt.sign(userInfo, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION,
    jwtid: uuidv4(),
  });
}

/**
 * Verify a JWT token
 * @param token JWT token to verify
 * @returns User information from the token or null if invalid
 */
export function verifyToken(token: string): UserInfo | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserInfo;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware to authenticate requests using JWT
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 * @returns void
 */
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  // Get token from authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // Bearer TOKEN format

  // If no token, return unauthorized
  if (!token) {
    res.status(401).json({
      error: 'unauthorized',
      error_description: 'Authentication token is required'
    });
    return;
  }

  // Verify token
  const userInfo = verifyToken(token);
  if (!userInfo) {
    res.status(401).json({
      error: 'unauthorized',
      error_description: 'Invalid or expired token'
    });
    return;
  }

  // Set user info in request object
  req.user = userInfo;
  next();
}

/**
 * Middleware to check if user has required roles
 * @param roles Array of required roles
 * @returns Middleware function
 */
export function requireRoles(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // First authenticate the token
    authenticateToken(req, res, () => {
      // Check if user has required roles
      const userRoles = req.user?.roles || [];
      const hasRequiredRole = roles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        res.status(403).json({
          error: 'forbidden',
          error_description: 'Insufficient permissions'
        });
        return;
      }

      next();
    });
  };
}

export default {
  authenticateToken,
  generateToken,
  verifyToken,
  requireRoles
};

