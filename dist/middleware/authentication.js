/**
 * Authentication Middleware for Aixtiv Symphony
 * Production implementation for request authentication
 */

const logger = require('../services/common/logger');
const sallyport = require('../services/sallyport/sallyport-client');
const sallyPortVerifier = require('../auth/security/sallyport-verifier');

/**
 * Authenticate incoming requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function authenticateRequest(req, res, next) {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header missing',
      });
    }

    // Parse token from header
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization format',
      });
    }

    const token = parts[1];

    // Verify token with SallyPort
    const verificationResult = await sallyPortVerifier.verifyToken(token);
    
    // Check if verification was successful
    if (!verificationResult.valid) {
      return res.status(401).json({
        success: false,
        message: verificationResult.error || 'Invalid or expired session',
      });
    }

    // Attach user to request
    req.user = {
      uuid: verificationResult.userId,
      email: verificationResult.email || 'unknown',
      role: verificationResult.roles && verificationResult.roles.length > 0 
        ? verificationResult.roles[0] 
        : 'user',
      permissions: verificationResult.permissions || [],
    };

    // Continue to next middleware or route handler
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
}

/**
 * Authorize user for specific permissions
 * @param {Array<string>} requiredPermissions - Permissions required for the route
 */
function authorizePermissions(requiredPermissions) {
  return async (req, res, next) => {
    try {
      // Ensure request is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // If no permissions required, continue
      if (!requiredPermissions || requiredPermissions.length === 0) {
        return next();
      }

      // Check if user has all required permissions
      const userPermissions = req.user.permissions || [];
      const hasAllPermissions = requiredPermissions.every(permission =>
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        logger.warn(
          `User ${req.user.uuid} lacks required permissions: ${requiredPermissions.join(', ')}`
        );
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
      }

      // User has all required permissions
      next();
    } catch (error) {
      logger.error(`Authorization error: ${error.message}`);
      return res.status(403).json({
        success: false,
        message: 'Authorization failed',
      });
    }
  };
}

/**
 * Create Fastify compatible authentication hook
 * @returns {Function} Fastify preHandler hook function
 */
function createFastifyAuthHook() {
  return async function(request, reply) {
    try {
      // Convert to Express-like objects for compatibility
      const req = {
        headers: request.headers,
        user: null
      };
      
      const res = {
        status: (code) => ({
          json: (data) => {
            reply.code(code).send(data);
            return reply;
          }
        })
      };
      
      // Use existing authenticate function
      await new Promise((resolve, reject) => {
        authenticateRequest(req, res, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      
      // Transfer user to Fastify request
      if (req.user) {
        request.user = req.user;
      }
      
    } catch (error) {
      logger.error(`Fastify authentication error: ${error.message}`);
      reply.code(401).send({
        success: false,
        message: 'Authentication failed'
      });
    }
  };
}

module.exports = {
  authenticateRequest,
  authorizePermissions,
  createFastifyAuthHook
};
