/**
 * AIXTIV Symphony Academy
 * API Gateway Validation Layer
 * 
 * This module provides middleware functions for validating API requests,
 * handling authentication, and verifying subscription entitlements.
 */

const jwt = require('jsonwebtoken');

// Configuration (would typically be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'aixtiv-symphony-secret-key';
const API_VERSION = 'v1';

/**
 * Validates that the request has the correct API version and format
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateRouteFormat = (req, res, next) => {
  const path = req.path;
  
  // Ensure API version prefix is present
  if (!path.startsWith(`/api/${API_VERSION}/`)) {
    return res.status(400).json({
      error: 'Invalid API route format',
      message: `All API routes must start with /api/${API_VERSION}/`,
      status: 400
    });
  }
  
  // Check for required path parameters
  if (path.includes('/:') && !req.params) {
    return res.status(400).json({
      error: 'Missing required parameters',
      message: 'The request is missing required path parameters',
      status: 400
    });
  }
  
  next();
};

/**
 * Validates authentication token and attaches user info to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateRequest = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Valid bearer token is required',
      status: 401
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify and decode the JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user info to request for downstream handlers
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      subscriptionTier: decoded.subscriptionTier
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid authentication',
      message: 'The provided token is invalid or expired',
      status: 401
    });
  }
};

/**
 * Verifies user has the required subscription entitlements for the requested resource
 * @param {Array|String} requiredEntitlements - Required entitlements for the resource
 * @returns {Function} Middleware function
 */
const verifyEntitlement = (requiredEntitlements) => {
  return (req, res, next) => {
    // Convert single entitlement to array for consistent processing
    const entitlements = Array.isArray(requiredEntitlements) ? 
      requiredEntitlements : [requiredEntitlements];
    
    // Skip entitlement check if no specific entitlements required
    if (entitlements.length === 0) {
      return next();
    }
    
    // Ensure user object is present (authentication middleware should have added it)
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to access this resource',
        status: 401
      });
    }
    
    // Mock subscription tier entitlements mapping
    // In a real implementation, this would come from a database or entitlement service
    const subscriptionEntitlements = {
      'free': ['basic_content', 'public_courses'],
      'premium': ['basic_content', 'public_courses', 'premium_courses', 'crx_basic'],
      'enterprise': ['basic_content', 'public_courses', 'premium_courses', 'crx_basic', 
                    'crx_advanced', 'dream_commander', 'enterprise_wings']
    };
    
    // Get user's entitlements based on subscription tier
    const userEntitlements = subscriptionEntitlements[req.user.subscriptionTier] || [];
    
    // Check if user has all required entitlements
    const hasAllEntitlements = entitlements.every(
      entitlement => userEntitlements.includes(entitlement)
    );
    
    if (!hasAllEntitlements) {
      return res.status(403).json({
        error: 'Subscription required',
        message: 'Your current subscription does not include access to this resource',
        status: 403,
        requiredSubscription: getMinimumRequiredSubscription(entitlements)
      });
    }
    
    next();
  };
};

/**
 * Helper function to determine minimum subscription tier needed for given entitlements
 * @param {Array} requiredEntitlements - List of required entitlements
 * @returns {String} Minimum subscription tier required
 */
const getMinimumRequiredSubscription = (requiredEntitlements) => {
  // Check if any enterprise-only entitlements are required
  const needsEnterprise = requiredEntitlements.some(
    e => ['crx_advanced', 'dream_commander', 'enterprise_wings'].includes(e)
  );
  
  if (needsEnterprise) return 'enterprise';
  
  // Check if any premium entitlements are required
  const needsPremium = requiredEntitlements.some(
    e => ['premium_courses', 'crx_basic'].includes(e)
  );
  
  if (needsPremium) return 'premium';
  
  // Default to free tier
  return 'free';
};

/**
 * Factory function to create route protection middleware
 * @param {Object} options - Configuration options
 * @param {Boolean} options.requireAuth - Whether route requires authentication
 * @param {Array|String} options.entitlements - Required entitlements for the route
 * @returns {Array} Array of middleware functions
 */
const protectRoute = (options = {}) => {
  const middlewares = [validateRouteFormat];
  
  // Add authentication middleware if required
  if (options.requireAuth !== false) {
    middlewares.push(authenticateRequest);
  }
  
  // Add entitlement verification if specified
  if (options.entitlements) {
    middlewares.push(verifyEntitlement(options.entitlements));
  }
  
  return middlewares;
};

module.exports = {
  validateRouteFormat,
  authenticateRequest,
  verifyEntitlement,
  protectRoute
};

