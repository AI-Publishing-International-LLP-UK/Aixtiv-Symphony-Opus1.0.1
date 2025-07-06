/**
 * Enhanced Authentication Middleware
 * 
 * Integrates OAuth2, OIDC, and SAML hardening with Sally Port Security Framework
 * Implements Diamond/Emerald/Ruby/Sapphire tier-based authentication
 * 
 * © 2025 ASOOS Integration Gateway
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const geoip = require('geoip-lite');
const rateLimit = require('express-rate-limit');
const { 
  MEMBERSHIP_TIERS, 
  OAUTH2_CONFIG, 
  OIDC_CONFIG, 
  SAML_CONFIG, 
  SecurityUtils,
  CredentialRotationManager 
} = require('../security/oauth2-oidc-saml-config');

class EnhancedAuthMiddleware {
  constructor(options = {}) {
    this.redisClient = options.redisClient;
    this.firestoreClient = options.firestoreClient;
    this.sallyPortEnabled = options.sallyPortEnabled || true;
    this.encryptionKey = options.encryptionKey || process.env.AUTH_ENCRYPTION_KEY;
    
    // Initialize rate limiters by tier
    this.rateLimiters = this.initializeRateLimiters();
    
    // Initialize security contexts
    this.securityContexts = new Map();
  }

  /**
   * Initialize tier-specific rate limiters
   */
  initializeRateLimiters() {
    const limiters = {};
    
    Object.keys(MEMBERSHIP_TIERS).forEach(tier => {
      const tierConfig = MEMBERSHIP_TIERS[tier];
      limiters[tier] = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: tierConfig.level === 1 ? 1000 : // Diamond: 1000 requests
             tierConfig.level === 2 ? 500 :  // Emerald: 500 requests
             tierConfig.level === 3 ? 200 :  // Ruby: 200 requests
             100, // Sapphire: 100 requests
        message: {
          error: 'Rate limit exceeded',
          tier: tier,
          resetTime: new Date(Date.now() + 15 * 60 * 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
      });
    });
    
    return limiters;
  }

  /**
   * Main authentication middleware
   */
  authenticate = async (req, res, next) => {
    try {
      // Step 1: Extract and validate authentication method
      const authResult = await this.extractAuthMethod(req);
      if (!authResult.success) {
        return this.sendAuthError(res, authResult.error, 401);
      }

      // Step 2: Validate token based on method
      const tokenResult = await this.validateToken(authResult.method, authResult.token, req);
      if (!tokenResult.success) {
        return this.sendAuthError(res, tokenResult.error, 401);
      }

      // Step 3: Extract user and tier information
      const userInfo = await this.extractUserInfo(tokenResult.payload);
      if (!userInfo.tier) {
        userInfo.tier = 'SAPPHIRE'; // Default tier
      }

      // Step 4: Apply tier-specific rate limiting
      const rateLimitResult = await this.applyRateLimit(req, res, userInfo.tier);
      if (!rateLimitResult) {
        return; // Rate limit response already sent
      }

      // Step 5: Validate access restrictions
      const accessResult = await this.validateAccessRestrictions(req, userInfo);
      if (!accessResult.success) {
        return this.sendAuthError(res, accessResult.error, 403);
      }

      // Step 6: Check MFA requirements
      const mfaResult = await this.checkMFARequirements(userInfo, req);
      if (!mfaResult.success) {
        return this.sendMFAChallenge(res, mfaResult.challenge);
      }

      // Step 7: Validate session and continuity
      const sessionResult = await this.validateSession(userInfo, req);
      if (!sessionResult.success) {
        return this.sendAuthError(res, sessionResult.error, 401);
      }

      // Step 8: Update security context
      await this.updateSecurityContext(userInfo, req);

      // Step 9: Attach user info to request
      req.user = {
        ...userInfo,
        securityContext: this.securityContexts.get(userInfo.sub)
      };

      // Step 10: Set security headers
      this.setSecurityHeaders(res, userInfo.tier);

      next();

    } catch (error) {
      console.error('Authentication middleware error:', error);
      return this.sendAuthError(res, 'Internal authentication error', 500);
    }
  };

  /**
   * Extract authentication method and token
   */
  async extractAuthMethod(req) {
    // OAuth2/OIDC Bearer Token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return {
        success: true,
        method: 'bearer',
        token: authHeader.split(' ')[1]
      };
    }

    // SAML Assertion (from POST body or session)
    if (req.body && req.body.SAMLResponse) {
      return {
        success: true,
        method: 'saml',
        token: req.body.SAMLResponse
      };
    }

    // Session-based authentication (Sally Port)
    if (req.cookies && req.cookies.sallyPortSession) {
      return {
        success: true,
        method: 'sallyport',
        token: req.cookies.sallyPortSession
      };
    }

    // Client certificate authentication
    if (req.client && req.client.authorized) {
      return {
        success: true,
        method: 'certificate',
        token: req.client.getPeerCertificate()
      };
    }

    return {
      success: false,
      error: 'No valid authentication method found'
    };
  }

  /**
   * Validate token based on authentication method
   */
  async validateToken(method, token, req) {
    switch (method) {
      case 'bearer':
        return this.validateBearerToken(token);
      case 'saml':
        return this.validateSAMLAssertion(token);
      case 'sallyport':
        return this.validateSallyPortSession(token);
      case 'certificate':
        return this.validateClientCertificate(token);
      default:
        return {
          success: false,
          error: 'Unsupported authentication method'
        };
    }
  }

  /**
   * Validate OAuth2/OIDC Bearer Token
   */
  async validateBearerToken(token) {
    try {
      // Verify JWT signature and claims
      const payload = jwt.verify(token, this.getJWTPublicKey(), {
        issuer: OIDC_CONFIG.provider.issuer,
        audience: process.env.CLIENT_ID,
        algorithms: OIDC_CONFIG.provider.idTokenSigningAlgValuesSupported
      });

      // Check token revocation
      const isRevoked = await this.checkTokenRevocation(token);
      if (isRevoked) {
        return {
          success: false,
          error: 'Token has been revoked'
        };
      }

      // Validate token scope and permissions
      const scopeValid = this.validateTokenScope(payload.scope, payload.membership_tier);
      if (!scopeValid) {
        return {
          success: false,
          error: 'Insufficient token scope'
        };
      }

      return {
        success: true,
        payload: payload
      };

    } catch (error) {
      return {
        success: false,
        error: `Token validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate SAML Assertion
   */
  async validateSAMLAssertion(assertion) {
    try {
      // Decode and parse SAML assertion
      const decodedAssertion = Buffer.from(assertion, 'base64').toString('utf8');
      const parsedAssertion = await this.parseSAMLAssertion(decodedAssertion);

      // Validate signature
      const signatureValid = await this.validateSAMLSignature(parsedAssertion);
      if (!signatureValid) {
        return {
          success: false,
          error: 'Invalid SAML assertion signature'
        };
      }

      // Validate assertion timing
      const timingValid = this.validateSAMLTiming(parsedAssertion);
      if (!timingValid) {
        return {
          success: false,
          error: 'SAML assertion expired or not yet valid'
        };
      }

      // Extract user attributes
      const userAttributes = this.extractSAMLAttributes(parsedAssertion);

      return {
        success: true,
        payload: userAttributes
      };

    } catch (error) {
      return {
        success: false,
        error: `SAML validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate Sally Port Session
   */
  async validateSallyPortSession(sessionId) {
    try {
      // Retrieve session from secure storage
      const sessionData = await this.getSessionData(sessionId);
      if (!sessionData) {
        return {
          success: false,
          error: 'Session not found or expired'
        };
      }

      // Validate session integrity
      const integrityValid = this.validateSessionIntegrity(sessionData);
      if (!integrityValid) {
        return {
          success: false,
          error: 'Session integrity validation failed'
        };
      }

      // Check if verification is complete
      if (!sessionData.ceUuid || !sessionData.blockchainReceipt) {
        return {
          success: false,
          error: 'Session verification incomplete'
        };
      }

      return {
        success: true,
        payload: {
          sub: sessionData.ceUuid,
          session_id: sessionId,
          verifications: sessionData.verificationStatus,
          region: sessionData.regionData?.region,
          pilot_id: sessionData.pilotId,
          membership_tier: sessionData.membershipTier || 'SAPPHIRE'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Sally Port session validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate Client Certificate
   */
  async validateClientCertificate(certificate) {
    try {
      // Extract certificate information
      const certInfo = {
        subject: certificate.subject,
        issuer: certificate.issuer,
        fingerprint: certificate.fingerprint,
        serialNumber: certificate.serialNumber,
        validFrom: certificate.valid_from,
        validTo: certificate.valid_to
      };

      // Validate certificate against known CAs
      const caValid = await this.validateCertificateAuthority(certInfo);
      if (!caValid) {
        return {
          success: false,
          error: 'Certificate authority not trusted'
        };
      }

      // Check certificate revocation
      const revoked = await this.checkCertificateRevocation(certInfo);
      if (revoked) {
        return {
          success: false,
          error: 'Certificate has been revoked'
        };
      }

      // Map certificate to user
      const userMapping = await this.mapCertificateToUser(certInfo);
      if (!userMapping) {
        return {
          success: false,
          error: 'Certificate not mapped to any user'
        };
      }

      return {
        success: true,
        payload: userMapping
      };

    } catch (error) {
      return {
        success: false,
        error: `Certificate validation failed: ${error.message}`
      };
    }
  }

  /**
   * Extract user information from validated payload
   */
  async extractUserInfo(payload) {
    const baseInfo = {
      sub: payload.sub,
      name: payload.name,
      email: payload.email,
      tier: payload.membership_tier || 'SAPPHIRE',
      ceUuid: payload.ce_uuid || payload.sub,
      pilotId: payload.pilot_id,
      region: payload.region,
      verifications: payload.verifications || []
    };

    // Enrich with additional user data from Firestore
    if (this.firestoreClient) {
      try {
        const userDoc = await this.firestoreClient
          .collection('users')
          .doc(baseInfo.sub)
          .get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          return {
            ...baseInfo,
            ...userData,
            tier: userData.membershipTier || baseInfo.tier
          };
        }
      } catch (error) {
        console.warn('Failed to enrich user data from Firestore:', error);
      }
    }

    return baseInfo;
  }

  /**
   * Apply tier-specific rate limiting
   */
  async applyRateLimit(req, res, tier) {
    const limiter = this.rateLimiters[tier] || this.rateLimiters.SAPPHIRE;
    
    return new Promise((resolve) => {
      limiter(req, res, (err) => {
        if (err) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * Validate access restrictions (IP, Geo, etc.)
   */
  async validateAccessRestrictions(req, userInfo) {
    const tier = userInfo.tier;
    const tierConfig = MEMBERSHIP_TIERS[tier];

    // IP Address validation
    if (tierConfig.ipRestrictions) {
      const ipAllowed = SecurityUtils.isIPAllowed(req.ip, tier);
      if (!ipAllowed) {
        return {
          success: false,
          error: 'Access denied: IP address not whitelisted'
        };
      }
    }

    // Geographic restrictions
    if (tierConfig.geoRestrictions) {
      const geo = geoip.lookup(req.ip);
      const country = geo ? geo.country : 'UNKNOWN';
      const geoAllowed = SecurityUtils.isGeoAllowed(country, tier);
      if (!geoAllowed) {
        return {
          success: false,
          error: 'Access denied: Geographic restriction'
        };
      }
    }

    // Time-based restrictions (if configured)
    const timeAllowed = this.validateAccessTime(tier);
    if (!timeAllowed) {
      return {
        success: false,
        error: 'Access denied: Outside allowed time window'
      };
    }

    return { success: true };
  }

  /**
   * Check MFA requirements
   */
  async checkMFARequirements(userInfo, req) {
    const tier = userInfo.tier;
    const tierConfig = MEMBERSHIP_TIERS[tier];
    const mfaConfig = OIDC_CONFIG.mfaConfiguration.tierRequirements[tier];

    if (!tierConfig.requireMFA) {
      return { success: true };
    }

    // Get last authentication time
    const lastAuth = await this.getLastAuthTime(userInfo.sub);
    const requiresMFA = SecurityUtils.requiresMFA(tier, lastAuth);

    if (!requiresMFA) {
      return { success: true };
    }

    // Check if MFA was provided in this request
    const mfaProvided = this.extractMFAFromRequest(req);
    if (!mfaProvided) {
      return {
        success: false,
        challenge: {
          type: 'mfa_required',
          methods: mfaConfig.requiredMethods,
          challenge_id: crypto.randomUUID()
        }
      };
    }

    // Validate provided MFA
    const mfaValid = await this.validateMFA(mfaProvided, userInfo);
    if (!mfaValid) {
      return {
        success: false,
        challenge: {
          type: 'mfa_invalid',
          methods: mfaConfig.requiredMethods,
          challenge_id: crypto.randomUUID()
        }
      };
    }

    return { success: true };
  }

  /**
   * Validate session continuity and security
   */
  async validateSession(userInfo, req) {
    const tier = userInfo.tier;
    const tierConfig = MEMBERSHIP_TIERS[tier];

    // Check maximum concurrent sessions
    const activeSessions = await this.getActiveSessions(userInfo.sub);
    if (activeSessions.length >= tierConfig.maxSessions) {
      return {
        success: false,
        error: 'Maximum concurrent sessions exceeded'
      };
    }

    // Check session timeout
    const sessionAge = this.getSessionAge(userInfo);
    if (sessionAge > tierConfig.sessionTimeout * 1000) {
      return {
        success: false,
        error: 'Session expired'
      };
    }

    // Device consistency check
    const deviceConsistent = await this.checkDeviceConsistency(userInfo, req);
    if (!deviceConsistent) {
      return {
        success: false,
        error: 'Device inconsistency detected'
      };
    }

    return { success: true };
  }

  /**
   * Update security context for continuous monitoring
   */
  async updateSecurityContext(userInfo, req) {
    const contextId = userInfo.sub;
    const existingContext = this.securityContexts.get(contextId) || {};

    const updatedContext = {
      ...existingContext,
      lastActivity: Date.now(),
      lastIP: req.ip,
      userAgent: req.headers['user-agent'],
      deviceFingerprint: req.headers['device-fingerprint'],
      riskScore: await this.calculateRiskScore(userInfo, req),
      tier: userInfo.tier,
      sessionCount: (existingContext.sessionCount || 0) + 1,
      accessPattern: await this.updateAccessPattern(existingContext.accessPattern, req)
    };

    this.securityContexts.set(contextId, updatedContext);

    // Persist to storage if configured
    if (this.redisClient) {
      await this.redisClient.setex(
        `security_context:${contextId}`,
        3600, // 1 hour TTL
        JSON.stringify(updatedContext)
      );
    }
  }

  /**
   * Set tier-specific security headers
   */
  setSecurityHeaders(res, tier) {
    const tierConfig = MEMBERSHIP_TIERS[tier];

    // Basic security headers
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Auth-Tier': tier,
      'X-Session-Timeout': tierConfig.sessionTimeout.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, private'
    });

    // Tier-specific headers
    if (tierConfig.level <= 2) { // Diamond and Emerald
      res.set({
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'"
      });
    }
  }

  /**
   * Send authentication error response
   */
  sendAuthError(res, message, statusCode = 401) {
    res.status(statusCode).json({
      error: 'Authentication failed',
      message: message,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID()
    });
  }

  /**
   * Send MFA challenge response
   */
  sendMFAChallenge(res, challenge) {
    res.status(401).json({
      error: 'Multi-factor authentication required',
      challenge: challenge,
      timestamp: new Date().toISOString()
    });
  }

  // Utility methods (implementation details)
  getJWTPublicKey() {
    // Implementation would retrieve public key for JWT verification
    return process.env.JWT_PUBLIC_KEY;
  }

  async checkTokenRevocation(token) {
    // Implementation would check token against revocation list
    return false;
  }

  validateTokenScope(scope, tier) {
    // Implementation would validate scope against tier permissions
    return true;
  }

  async getSessionData(sessionId) {
    // Implementation would retrieve session from secure storage
    return null;
  }

  validateSessionIntegrity(sessionData) {
    // Implementation would validate session data integrity
    return true;
  }

  async getLastAuthTime(userId) {
    // Implementation would retrieve last authentication time
    return Date.now() - 1000;
  }

  extractMFAFromRequest(req) {
    // Implementation would extract MFA data from request
    return null;
  }

  async validateMFA(mfaData, userInfo) {
    // Implementation would validate MFA data
    return true;
  }

  async getActiveSessions(userId) {
    // Implementation would retrieve active sessions
    return [];
  }

  getSessionAge(userInfo) {
    // Implementation would calculate session age
    return 0;
  }

  async checkDeviceConsistency(userInfo, req) {
    // Implementation would check device consistency
    return true;
  }

  async calculateRiskScore(userInfo, req) {
    // Implementation would calculate risk score
    return 0;
  }

  async updateAccessPattern(existingPattern, req) {
    // Implementation would update access pattern
    return existingPattern || {};
  }

  validateAccessTime(tier) {
    // Implementation would validate access time restrictions
    return true;
  }
}

module.exports = EnhancedAuthMiddleware;
