"use strict";
/**
 * Authentication middleware for Aixtiv Symphony Integration Gateway
 *
 * This module provides authentication functionality including token generation,
 * validation, and middleware for protecting routes.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.authenticateToken = authenticateToken;
exports.requireRoles = requireRoles;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const uuid_1 = require("uuid");
// Load environment variables
dotenv_1.default.config();
// JWT secret key (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'aixtiv-symphony-integration-gateway-secret';
// Token expiration time
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION || '24h';
/**
 * Generate a JWT token for a user
 * @param userInfo User information to include in the token
 * @returns JWT token string
 */
function generateToken(userInfo) {
    return jsonwebtoken_1.default.sign(userInfo, JWT_SECRET, {
        expiresIn: TOKEN_EXPIRATION,
        jwtid: (0, uuid_1.v4)(),
    });
}
/**
 * Verify a JWT token
 * @param token JWT token to verify
 * @returns User information from the token or null if invalid
 */
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (error) {
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
function authenticateToken(req, res, next) {
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
function requireRoles(roles) {
    return (req, res, next) => {
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
exports.default = {
    authenticateToken,
    generateToken,
    verifyToken,
    requireRoles
};
//# sourceMappingURL=auth.js.map