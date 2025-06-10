/**
 * SallyPort Verification Module
 * Provides token validation and security verification for the ASOOS platform
 */

const jwt = require('jsonwebtoken');
const logger = require('../../services/common/logger');
const sallyport = require('../../services/sallyport/sallyport-client');

/**
 * Result of a token verification operation
 * @typedef {Object} VerificationResult
 * @property {boolean} valid - Whether the token is valid
 * @property {string} [userId] - User ID from the token
 * @property {string[]} [roles] - User roles from the token
 * @property {string[]} [permissions] - User permissions from the token
 * @property {string} [error] - Error message if verification failed
 */

/**
 * Verifies a JWT token for authentication
 * @param {string} token - JWT token to verify
 * @param {Object} options - Verification options
 * @param {string} [options.issuer] - Expected token issuer
 * @param {string[]} [options.algorithms] - Allowed algorithms for verification
 * @returns {Promise<VerificationResult>} Result of verification
 */
async function verifyToken(token, options = {}) {
  try {
    // Get JWT secret from environment or secret manager
    const jwtSecret = process.env.JWT_SECRET || await getJwtSecret();
    
    if (!token) {
      return { 
        valid: false, 
        error: 'Token is required' 
      };
    }
    
    // Default options
    const verifyOptions = {
      issuer: options.issuer || 'aixtiv-symphony',
      algorithms: options.algorithms || ['RS256', 'HS256']
    };
    
    // Try to use existing sallyport service if available
    try {
      const session = await sallyport.getUserSession(token);
      
      if (!session.valid) {
        return {
          valid: false,
          error: session.message || 'Invalid token'
        };
      }
      
      return {
        valid: true,
        userId: session.userUuid,
        roles: session.role ? [session.role] : [],
        permissions: session.permissions || []
      };
    } catch (serviceError) {
      logger.warn(`SallyPort service unavailable, falling back to local verification: ${serviceError.message}`);
      
      // Fall back to local verification if service is unavailable
      const decoded = jwt.verify(token, jwtSecret, verifyOptions);
      
      return {
        valid: true,
        userId: decoded.sub,
        roles: decoded.roles || [],
        permissions: decoded.permissions || []
      };
    }
  } catch (error) {
    logger.error(`Token verification failed: ${error.message}`);
    
    return { 
      valid: false, 
      error: error.message 
    };
  }
}

/**
 * Fetches JWT secret from Google Secret Manager
 * @returns {Promise<string>} JWT secret
 */
async function getJwtSecret() {
  try {
    // This would normally call Secret Manager
    // For now, return a placeholder
    return 'placeholder-jwt-secret';
  } catch (error) {
    logger.error(`Failed to retrieve JWT secret: ${error.message}`);
    throw new Error('Failed to retrieve authentication configuration');
  }
}

/**
 * Creates middleware function for Fastify
 * @returns {Function} Fastify middleware function
 */
function createMiddleware() {
  return async function sallyPortMiddleware(request, reply) {
    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'AUTH_HEADER_MISSING',
            message: 'Missing or invalid authorization header'
          }
        });
      }
      
      const token = authHeader.substring(7);
      const result = await verifyToken(token);
      
      if (!result.valid) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: result.error || 'Invalid token'
          }
        });
      }
      
      // Attach user info to request
      request.user = {
        id: result.userId,
        roles: result.roles || [],
        permissions: result.permissions || []
      };
      
    } catch (error) {
      logger.error(`SallyPort middleware error: ${error.message}`);
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication service error'
        }
      });
    }
  };
}

module.exports = {
  verifyToken,
  createMiddleware
};
