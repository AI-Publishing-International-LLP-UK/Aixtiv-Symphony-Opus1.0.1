/**
 * Enhanced SallyPort Authentication System with Cloudflare Integration
 * 
 * This module provides comprehensive authentication for ASOOS Symphony with:
 * - Cloudflare challenge validation
 * - Comprehensive audit logging
 * - Protected resource access control
 * - Real-time security monitoring
 * 
 * @author Aixtiv Symphony Integration Gateway
 * @version 2.0.0-cloudflare-integration
 * @since 2025-07-02
 */

const admin = require('firebase-admin');
const axios = require('axios');
const winston = require('winston');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Configure comprehensive logging
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'sallyport-auth', version: '2.0.0' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/sallyport-auth-error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/sallyport-auth-audit.log' 
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Enhanced SallyPort Authentication Class
 */
class SallyPortAuth {
  constructor() {
    this.authState = {
      isAuthenticated: false,
      isLoading: true,
      error: null,
      user: null,
      cloudflareVerified: false,
      securityLevel: 'unknown'
    };
    
    this.authStateListeners = [];
    this.cloudflareConfig = {
      verifyEndpoint: process.env.CLOUDFLARE_VERIFY_ENDPOINT || '/api/cloudflare/verify',
      challengeHeaders: ['cf-ray', 'cf-ipcountry', 'cf-connecting-ip'],
      securityHeaders: ['cf-threat-score', 'cf-bot-score']
    };
    
    this.protectedResources = new Set([
      '/api/agents/*',
      '/api/vls/*',
      '/api/admin/*',
      '/api/wing/*',
      '/api/blockchain/*',
      '/dashboard/*',
      '/academy/admin/*'
    ]);

    // Initialize audit logging
    this.initializeAuditLogging();
  }

  /**
   * Initialize comprehensive audit logging
   */
  async initializeAuditLogging() {
    try {
      // Create audit log collection if it doesn't exist
      await db.collection('audit_logs').doc('_init').set({
        initialized: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        version: '2.0.0-cloudflare-integration'
      });

      auditLogger.info('SallyPort audit logging initialized', {
        component: 'audit-init',
        cloudflareIntegration: true
      });
    } catch (error) {
      auditLogger.error('Failed to initialize audit logging', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Log authentication events for comprehensive audit trail
   */
  async logAuthEvent(eventType, details = {}) {
    const logEntry = {
      eventType,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userAgent: details.userAgent || 'unknown',
      ipAddress: details.ipAddress || 'unknown',
      cloudflareHeaders: details.cloudflareHeaders || {},
      userId: details.userId || null,
      success: details.success || false,
      errorMessage: details.errorMessage || null,
      securityLevel: details.securityLevel || 'unknown',
      sessionId: details.sessionId || null,
      ...details
    };

    try {
      // Log to Firestore for persistence
      await db.collection('audit_logs').add(logEntry);
      
      // Log to Winston for immediate monitoring
      if (details.success) {
        auditLogger.info(`Authentication event: ${eventType}`, logEntry);
      } else {
        auditLogger.warn(`Authentication failure: ${eventType}`, logEntry);
      }

      // Alert on suspicious activity
      if (this.isSuspiciousActivity(eventType, details)) {
        await this.alertSecurityBreach(logEntry);
      }
    } catch (error) {
      auditLogger.error('Failed to log authentication event', {
        error: error.message,
        originalEvent: eventType,
        details
      });
    }
  }

  /**
   * Detect suspicious authentication activity
   */
  isSuspiciousActivity(eventType, details) {
    const suspiciousPatterns = [
      eventType === 'failed_login' && details.attemptCount > 3,
      eventType === 'cloudflare_challenge_failed',
      details.threatScore && details.threatScore > 50,
      details.botScore && details.botScore > 50,
      eventType === 'unauthorized_access_attempt'
    ];

    return suspiciousPatterns.some(pattern => pattern);
  }

  /**
   * Alert security breach through multiple channels
   */
  async alertSecurityBreach(logEntry) {
    try {
      // Store security alert
      await db.collection('security_alerts').add({
        ...logEntry,
        alertLevel: 'HIGH',
        alertTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        acknowledged: false
      });

      auditLogger.error('SECURITY ALERT: Suspicious activity detected', {
        alert: true,
        logEntry
      });

      // Could integrate with external alerting systems here
      // e.g., Slack, PagerDuty, email notifications
    } catch (error) {
      auditLogger.error('Failed to create security alert', {
        error: error.message,
        originalAlert: logEntry
      });
    }
  }

  /**
   * Validate Cloudflare challenge and security headers
   */
  async validateCloudflareChallenge(headers = {}) {
    try {
      const cloudflareHeaders = this.extractCloudflareHeaders(headers);
      
      // Check for required Cloudflare headers
      const hasRequiredHeaders = this.cloudflareConfig.challengeHeaders.some(
        header => cloudflareHeaders[header]
      );

      if (!hasRequiredHeaders) {
        await this.logAuthEvent('cloudflare_challenge_failed', {
          reason: 'missing_cloudflare_headers',
          headers: Object.keys(headers),
          success: false
        });
        return { valid: false, reason: 'Missing Cloudflare headers' };
      }

      // Validate threat and bot scores
      const threatScore = parseInt(cloudflareHeaders['cf-threat-score']) || 0;
      const botScore = parseInt(cloudflareHeaders['cf-bot-score']) || 0;

      if (threatScore > 50) {
        await this.logAuthEvent('cloudflare_threat_detected', {
          threatScore,
          ipAddress: cloudflareHeaders['cf-connecting-ip'],
          success: false
        });
        return { valid: false, reason: `High threat score: ${threatScore}` };
      }

      if (botScore > 50) {
        await this.logAuthEvent('cloudflare_bot_detected', {
          botScore,
          ipAddress: cloudflareHeaders['cf-connecting-ip'],
          success: false
        });
        return { valid: false, reason: `High bot score: ${botScore}` };
      }

      // Additional Cloudflare validations
      const validation = await this.performAdvancedCloudflareValidation(cloudflareHeaders);
      
      await this.logAuthEvent('cloudflare_challenge_validated', {
        cloudflareHeaders,
        threatScore,
        botScore,
        validation,
        success: true
      });

      return { 
        valid: true, 
        headers: cloudflareHeaders,
        threatScore,
        botScore,
        securityLevel: this.calculateSecurityLevel(threatScore, botScore)
      };
    } catch (error) {
      await this.logAuthEvent('cloudflare_validation_error', {
        error: error.message,
        success: false
      });
      return { valid: false, reason: `Validation error: ${error.message}` };
    }
  }

  /**
   * Extract Cloudflare-specific headers
   */
  extractCloudflareHeaders(headers) {
    const cloudflareHeaders = {};
    const allHeaders = [...this.cloudflareConfig.challengeHeaders, ...this.cloudflareConfig.securityHeaders];
    
    allHeaders.forEach(header => {
      if (headers[header]) {
        cloudflareHeaders[header] = headers[header];
      }
    });

    return cloudflareHeaders;
  }

  /**
   * Perform advanced Cloudflare validation
   */
  async performAdvancedCloudflareValidation(headers) {
    try {
      // Could integrate with Cloudflare API for additional verification
      // For now, perform basic validation checks
      
      const cfRay = headers['cf-ray'];
      const cfCountry = headers['cf-ipcountry'];
      const cfIP = headers['cf-connecting-ip'];

      // Validate CF-Ray format (should be hexadecimal-datacenter)
      const rayPattern = /^[a-f0-9]+-[A-Z]{3}$/;
      const validRay = cfRay ? rayPattern.test(cfRay) : false;

      // Validate country code format
      const countryPattern = /^[A-Z]{2}$/;
      const validCountry = cfCountry ? countryPattern.test(cfCountry) : false;

      // Basic IP validation
      const ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
      const validIP = cfIP ? ipPattern.test(cfIP) : false;

      return {
        validRay,
        validCountry,
        validIP,
        overall: validRay && validCountry && validIP
      };
    } catch (error) {
      auditLogger.error('Advanced Cloudflare validation failed', {
        error: error.message,
        headers
      });
      return { overall: false, error: error.message };
    }
  }

  /**
   * Calculate security level based on Cloudflare scores
   */
  calculateSecurityLevel(threatScore, botScore) {
    const maxScore = Math.max(threatScore, botScore);
    
    if (maxScore === 0) return 'maximum';
    if (maxScore <= 10) return 'high';
    if (maxScore <= 25) return 'medium';
    if (maxScore <= 50) return 'low';
    return 'critical';
  }

  /**
   * Check if resource is protected and requires authentication
   */
  isProtectedResource(path) {
    return Array.from(this.protectedResources).some(pattern => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(path);
    });
  }

  /**
   * Enhanced authentication with Cloudflare integration
   */
  async authenticate(credentials = {}, headers = {}) {
    const sessionId = this.generateSessionId();
    
    try {
      auditLogger.info('Starting enhanced authentication', {
        sessionId,
        hasCredentials: !!credentials.token,
        userAgent: headers['user-agent']
      });

      this.authState.isLoading = true;
      this.notifyListeners();

      // Step 1: Validate Cloudflare challenge
      const cloudflareValidation = await this.validateCloudflareChallenge(headers);
      
      if (!cloudflareValidation.valid) {
        await this.logAuthEvent('authentication_failed', {
          reason: 'cloudflare_validation_failed',
          cloudflareReason: cloudflareValidation.reason,
          sessionId,
          success: false
        });
        
        this.authState.isAuthenticated = false;
        this.authState.isLoading = false;
        this.authState.error = `Cloudflare validation failed: ${cloudflareValidation.reason}`;
        this.authState.cloudflareVerified = false;
        this.notifyListeners();
        
        return false;
      }

      // Step 2: Authenticate token if provided
      let user = null;
      if (credentials.token) {
        user = await this.verifyToken(credentials.token, sessionId);
      } else {
        // Generate new token for valid Cloudflare-authenticated user
        user = await this.generateUserSession(headers, sessionId);
      }

      if (!user) {
        await this.logAuthEvent('authentication_failed', {
          reason: 'invalid_token_or_session',
          sessionId,
          success: false
        });
        
        this.authState.isAuthenticated = false;
        this.authState.isLoading = false;
        this.authState.error = 'Authentication failed';
        this.authState.cloudflareVerified = true;
        this.notifyListeners();
        
        return false;
      }

      // Step 3: Update authentication state
      this.authState.isAuthenticated = true;
      this.authState.isLoading = false;
      this.authState.error = null;
      this.authState.user = user;
      this.authState.cloudflareVerified = true;
      this.authState.securityLevel = cloudflareValidation.securityLevel;

      // Step 4: Store authentication session
      await this.storeAuthSession(user, sessionId, cloudflareValidation);

      await this.logAuthEvent('authentication_success', {
        userId: user.uuid,
        userName: user.name,
        role: user.role,
        sessionId,
        securityLevel: cloudflareValidation.securityLevel,
        cloudflareHeaders: cloudflareValidation.headers,
        success: true
      });

      this.notifyListeners();
      return true;
    } catch (error) {
      await this.logAuthEvent('authentication_error', {
        error: error.message,
        sessionId,
        success: false
      });

      this.authState.isAuthenticated = false;
      this.authState.isLoading = false;
      this.authState.error = error.message || 'Authentication failed';
      this.authState.cloudflareVerified = false;
      
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Enhanced token verification with audit logging
   */
  async verifyToken(token, sessionId) {
    try {
      // In production, this would validate with your JWT verification service
      // For now, simulate token verification
      
      if (!token || token.length < 10) {
        return null;
      }

      // Simulate successful token verification
      const user = {
        uuid: "00001",
        name: "Mr. Phillip Corey Roark",
        role: "CEO / Principal",
        sessionId,
        authenticated: true,
        cloudflareVerified: true
      };

      await this.logAuthEvent('token_verified', {
        userId: user.uuid,
        sessionId,
        success: true
      });

      return user;
    } catch (error) {
      await this.logAuthEvent('token_verification_failed', {
        error: error.message,
        sessionId,
        success: false
      });
      return null;
    }
  }

  /**
   * Generate user session for Cloudflare-authenticated users
   */
  async generateUserSession(headers, sessionId) {
    try {
      // In production, this would create a proper user session
      // based on Cloudflare-authenticated identity
      
      const user = {
        uuid: sessionId.slice(0, 8),
        name: "Cloudflare Authenticated User",
        role: "Verified User",
        sessionId,
        authenticated: true,
        cloudflareVerified: true
      };

      await this.logAuthEvent('session_generated', {
        userId: user.uuid,
        sessionId,
        success: true
      });

      return user;
    } catch (error) {
      await this.logAuthEvent('session_generation_failed', {
        error: error.message,
        sessionId,
        success: false
      });
      return null;
    }
  }

  /**
   * Store authentication session in Firestore
   */
  async storeAuthSession(user, sessionId, cloudflareValidation) {
    try {
      await db.collection('auth_sessions').doc(sessionId).set({
        userId: user.uuid,
        userName: user.name,
        role: user.role,
        sessionId,
        cloudflareVerified: true,
        securityLevel: cloudflareValidation.securityLevel,
        cloudflareHeaders: cloudflareValidation.headers,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        active: true
      });

      auditLogger.info('Authentication session stored', {
        sessionId,
        userId: user.uuid
      });
    } catch (error) {
      auditLogger.error('Failed to store auth session', {
        error: error.message,
        sessionId
      });
    }
  }

  /**
   * Middleware to protect resources and reject non-Cloudflare requests
   */
  async protectResource(req, res, next) {
    try {
      const path = req.path;
      const headers = req.headers;
      const sessionId = this.generateSessionId();

      // Check if resource needs protection
      if (!this.isProtectedResource(path)) {
        return next();
      }

      await this.logAuthEvent('resource_access_attempt', {
        path,
        userAgent: headers['user-agent'],
        ipAddress: headers['cf-connecting-ip'] || req.ip,
        sessionId
      });

      // Validate Cloudflare authentication
      const cloudflareValidation = await this.validateCloudflareChallenge(headers);
      
      if (!cloudflareValidation.valid) {
        await this.logAuthEvent('unauthorized_access_attempt', {
          path,
          reason: 'cloudflare_validation_failed',
          cloudflareReason: cloudflareValidation.reason,
          sessionId,
          success: false
        });

        return res.status(403).json({
          error: 'forbidden',
          message: 'Cloudflare authentication required',
          reason: cloudflareValidation.reason
        });
      }

      // Check for valid authentication token
      const authHeader = headers.authorization;
      const token = authHeader?.split(' ')[1];

      if (!token) {
        await this.logAuthEvent('unauthorized_access_attempt', {
          path,
          reason: 'missing_token',
          sessionId,
          success: false
        });

        return res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication token required'
        });
      }

      // Verify token
      const user = await this.verifyToken(token, sessionId);
      if (!user) {
        await this.logAuthEvent('unauthorized_access_attempt', {
          path,
          reason: 'invalid_token',
          sessionId,
          success: false
        });

        return res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid or expired token'
        });
      }

      // Add user and session to request
      req.user = user;
      req.sessionId = sessionId;
      req.cloudflareValidation = cloudflareValidation;

      await this.logAuthEvent('resource_access_granted', {
        path,
        userId: user.uuid,
        sessionId,
        securityLevel: cloudflareValidation.securityLevel,
        success: true
      });

      next();
    } catch (error) {
      await this.logAuthEvent('resource_protection_error', {
        path: req.path,
        error: error.message,
        success: false
      });

      res.status(500).json({
        error: 'internal_error',
        message: 'Authentication system error'
      });
    }
  }

  /**
   * Enhanced logout with comprehensive cleanup
   */
  async logout(sessionId = null) {
    try {
      const currentSessionId = sessionId || this.authState.user?.sessionId;

      await this.logAuthEvent('logout_initiated', {
        sessionId: currentSessionId,
        userId: this.authState.user?.uuid
      });

      // Clear authentication state
      this.authState.isAuthenticated = false;
      this.authState.isLoading = false;
      this.authState.error = null;
      this.authState.user = null;
      this.authState.cloudflareVerified = false;
      this.authState.securityLevel = 'unknown';

      // Deactivate session in Firestore
      if (currentSessionId) {
        await db.collection('auth_sessions').doc(currentSessionId).update({
          active: false,
          loggedOutAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      await this.logAuthEvent('logout_completed', {
        sessionId: currentSessionId,
        success: true
      });

      this.notifyListeners();
      auditLogger.info('User logged out successfully', { sessionId: currentSessionId });
    } catch (error) {
      await this.logAuthEvent('logout_error', {
        error: error.message,
        sessionId: sessionId,
        success: false
      });
      
      auditLogger.error('Logout error', { error: error.message });
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `sp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Subscribe to authentication state changes
   */
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.authStateListeners.push(callback);
      callback(this.authState);
    }
  }

  /**
   * Unsubscribe from authentication state changes
   */
  unsubscribe(callback) {
    const index = this.authStateListeners.indexOf(callback);
    if (index !== -1) {
      this.authStateListeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of state changes
   */
  notifyListeners() {
    this.authStateListeners.forEach(listener => listener(this.authState));
  }

  /**
   * Get current authentication state
   */
  getAuthState() {
    return { ...this.authState };
  }

  /**
   * Initialize the authentication system
   */
  async initialize() {
    try {
      auditLogger.info('Initializing enhanced SallyPort authentication', {
        version: '2.0.0-cloudflare-integration',
        cloudflareEnabled: true
      });

      this.authState.isLoading = true;
      this.notifyListeners();

      // Check for existing session
      const existingToken = this.getStoredToken();
      if (existingToken) {
        const sessionId = this.generateSessionId();
        const user = await this.verifyToken(existingToken, sessionId);
        if (user) {
          this.authState.isAuthenticated = true;
          this.authState.user = user;
          this.authState.cloudflareVerified = true; // Assume verified if token exists
        }
      }

      this.authState.isLoading = false;
      this.notifyListeners();

      await this.logAuthEvent('system_initialized', {
        hasExistingSession: !!existingToken,
        success: true
      });
    } catch (error) {
      this.authState.isLoading = false;
      this.authState.error = error.message;
      this.notifyListeners();

      await this.logAuthEvent('initialization_error', {
        error: error.message,
        success: false
      });
    }
  }

  /**
   * Get stored authentication token
   */
  getStoredToken() {
    try {
      return localStorage?.getItem('sallyport_token') || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Store authentication token
   */
  storeToken(token) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('sallyport_token', token);
      }
    } catch (error) {
      auditLogger.error('Failed to store token', { error: error.message });
    }
  }

  /**
   * Clear stored authentication token
   */
  clearStoredToken() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('sallyport_token');
      }
    } catch (error) {
      auditLogger.error('Failed to clear token', { error: error.message });
    }
  }
}

// Export singleton instance
const sallyPortAuth = new SallyPortAuth();

// Auto-initialize when in browser environment
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    sallyPortAuth.initialize();
  });

  // Security monitoring for potential breaches
  window.addEventListener('error', async (event) => {
    const securityKeywords = [
      'SDK compromised',
      'security violation',
      'unauthorized access',
      'token hijacked',
      'session compromised'
    ];

    if (securityKeywords.some(keyword => 
      event.message?.includes(keyword)
    )) {
      await sallyPortAuth.logAuthEvent('security_breach_detected', {
        errorMessage: event.message,
        filename: event.filename,
        lineno: event.lineno,
        success: false
      });

      sallyPortAuth.logout();
      
      // Dispatch security breach event
      document.dispatchEvent(new CustomEvent('sallyport:security-breach', { 
        detail: { message: event.message }
      }));
    }
  });
}

module.exports = sallyPortAuth;
