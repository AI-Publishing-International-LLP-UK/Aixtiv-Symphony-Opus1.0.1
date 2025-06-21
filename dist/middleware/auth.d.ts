/**
 * Authentication middleware for Aixtiv Symphony Integration Gateway
 *
 * This module provides authentication functionality including token generation,
 * validation, and middleware for protecting routes.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * User information interface
 */
export interface UserInfo {
    id: string;
    username: string;
    roles?: string[];
    [key: string]: any;
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
export declare function generateToken(userInfo: UserInfo): string;
/**
 * Verify a JWT token
 * @param token JWT token to verify
 * @returns User information from the token or null if invalid
 */
export declare function verifyToken(token: string): UserInfo | null;
/**
 * Middleware to authenticate requests using JWT
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 * @returns void
 */
export declare function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void;
/**
 * Middleware to check if user has required roles
 * @param roles Array of required roles
 * @returns Middleware function
 */
export declare function requireRoles(roles: string[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
declare const _default: {
    authenticateToken: typeof authenticateToken;
    generateToken: typeof generateToken;
    verifyToken: typeof verifyToken;
    requireRoles: typeof requireRoles;
};
export default _default;
