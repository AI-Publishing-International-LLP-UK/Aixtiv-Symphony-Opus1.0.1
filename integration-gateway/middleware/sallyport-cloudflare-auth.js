/**
 * Enhanced SallyPort-Cloudflare Authentication Middleware
 * 
 * This middleware integrates SallyPort authentication with Cloudflare challenge validation
 * to provide comprehensive security for the Integration Gateway.
 * 
 * Features:
 * - Cloudflare challenge validation
 * - SallyPort authentication verification
 * - Comprehensive audit logging
 * - Protected resource enforcement
 * - Real-time security monitoring
 * 
 * @author Aixtiv Symphony Integration Gateway
 * @version 2.0.0-cloudflare-integration
 * @since 2025-07-02
 */

const express = require('express');
const winston = require('winston');
const admin = require('firebase-admin');
const sallyPortAuth = require('../src/components/asoos-sallyport-auth');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Configure middleware logging
const middlewareLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'sallyport-cloudflare-middleware', version: '2.0.0' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/middleware-error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/middleware-audit.log' 
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
 * Enhanced SallyPort-Cloudflare Authentication Middleware Class
 */
class SallyPortCloudflareMiddleware {
  constructor() {
    this.config = this.loadConfiguration();
    this.requestCount = 0;
    this.blockedRequests = 0;
    this.authenticatedRequests = 0;
    
    // Initialize performance monitoring
    this.initializePerformanceMonitoring();
  }

  /**
   * Load configuration from JSON file
   */
  loadConfiguration() {
    try {
      const config = require('/Users/as/asoos/config/cloudflare/sallyport-integration.json');
      middlewareLogger.info('Configuration loaded successfully', {
        version: config.sallyport?.version || 'unknown'
      });
      return config;
    } catch (error) {
      middlewareLogger.error('Failed to load configuration', {
        error: error.message
      });
      // Return default configuration
      return {
        sallyport: {
          enabled: true,
          security_mode: 'strict',
          cloudflare_bridge: true,
          protected_resources: [
            '/api/agents/*',
            '/api/vls/*',
            '/api/admin/*',
            '/api/wing/*',
            '/api/blockchain/*',
            '/dashboard/*',
            '/academy/admin/*'
          ]
        },
        cloudflare: {
          challenge_validation: {
            required_headers: ['cf-ray', 'cf-ipcountry', 'cf-connecting-ip'],
            security_headers: ['cf-threat-score', 'cf-bot-score']
          }
        }
      };
    }
  }

  /**
   * Initialize performance monitoring
   */
  async initializePerformanceMonitoring() {
    try {
      // Create monitoring collection if it doesn't exist
      await db.collection('middleware_monitoring').doc('_init').set({
        initialized: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        version: '2.0.0-cloudflare-integration'
      });

      middlewareLogger.info('Performance monitoring initialized');
    } catch (error) {
      middlewareLogger.error('Failed to initialize performance monitoring', {
        error: error.message
      });
    }
  }

  /**
   * Log performance metrics
   */
  async logPerformanceMetrics(req, startTime, result) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const metrics = {
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'] || 'unknown',
      ipAddress: req.headers['cf-connecting-ip'] || req.ip,
      responseTime,
      result: result.success ? 'success' : 'blocked',
      reason: result.reason || null,
      cloudflareVerified: result.cloudflareVerified || false,
      sessionId: req.sessionId || null,
      requestCount: ++this.requestCount
    };

    try {
      await db.collection('middleware_monitoring').add(metrics);
      
      if (result.success) {
        this.authenticatedRequests++;
      } else {
        this.blockedRequests++;
      }

      middlewareLogger.info('Request processed', metrics);
    } catch (error) {
      middlewareLogger.error('Failed to log performance metrics', {
        error: error.message,
        metrics
      });
    }
  }

  /**
   * Main authentication middleware function
   */
  authenticate() {
    return async (req, res, next) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();
      
      try {
        // Add request ID for tracking
        req.requestId = requestId;
        
        middlewareLogger.info('Processing authentication request', {
          requestId,
          method: req.method,
          path: req.path,
          userAgent: req.headers['user-agent'],
          cloudflareHeaders: this.extractCloudflareHeaders(req.headers)
        });

        // Step 1: Check if SallyPort is enabled
        if (!this.config.sallyport?.enabled) {
          middlewareLogger.warn('SallyPort authentication disabled, allowing request');
          await this.logPerformanceMetrics(req, startTime, { 
            success: true, 
            reason: 'sallyport_disabled' 
          });
          return next();
        }

        // Step 2: Check if resource needs protection
        if (!this.isProtectedResource(req.path)) {
          middlewareLogger.debug('Resource not protected, allowing request', {
            path: req.path,
            requestId
          });
          await this.logPerformanceMetrics(req, startTime, { 
            success: true, 
            reason: 'unprotected_resource' 
          });
          return next();
        }

        // Step 3: Use SallyPort's enhanced protection
        await sallyPortAuth.protectResource(req, res, (error) => {
          if (error) {
            middlewareLogger.error('SallyPort protection failed', {
              error: error.message,
              requestId,
              path: req.path
            });
            
            this.logPerformanceMetrics(req, startTime, { 
              success: false, 
              reason: 'sallyport_protection_error',
              error: error.message
            });
            
            return res.status(500).json({
              error: 'authentication_error',
              message: 'Authentication system error',
              requestId
            });
          }
          
          // If we reach here, authentication was successful
          middlewareLogger.info('Authentication successful', {
            requestId,
            userId: req.user?.uuid,
            path: req.path,
            securityLevel: req.cloudflareValidation?.securityLevel
          });
          
          this.logPerformanceMetrics(req, startTime, { 
            success: true, 
            reason: 'authenticated',
            cloudflareVerified: true
          });
          
          next();
        });

      } catch (error) {
        middlewareLogger.error('Middleware error', {
          error: error.message,
          stack: error.stack,
          requestId,
          path: req.path
        });

        await this.logPerformanceMetrics(req, startTime, { 
          success: false, 
          reason: 'middleware_error',
          error: error.message
        });

        res.status(500).json({
          error: 'internal_error',
          message: 'Authentication middleware error',
          requestId
        });
      }
    };
  }

  /**
   * Extract Cloudflare headers from request
   */
  extractCloudflareHeaders(headers) {
    const cloudflareHeaders = {};
    const cfHeaders = [
      'cf-ray',
      'cf-ipcountry', 
      'cf-connecting-ip',
      'cf-threat-score',
      'cf-bot-score',
      'cf-visitor'
    ];
    
    cfHeaders.forEach(header => {
      if (headers[header]) {
        cloudflareHeaders[header] = headers[header];
      }
    });

    return cloudflareHeaders;
  }

  /**
   * Check if resource requires protection
   */
  isProtectedResource(path) {
    const protectedResources = this.config.sallyport?.protected_resources || [];
    
    return protectedResources.some(pattern => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(path);
    });
  }

  /**
   * Health check middleware
   */
  healthCheck() {
    return (req, res) => {
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0-cloudflare-integration',
        sallyport: {
          enabled: this.config.sallyport?.enabled || false,
          cloudflare_bridge: this.config.sallyport?.cloudflare_bridge || false
        },
        metrics: {
          totalRequests: this.requestCount,
          authenticatedRequests: this.authenticatedRequests,
          blockedRequests: this.blockedRequests,
          successRate: this.requestCount > 0 ? 
            ((this.authenticatedRequests / this.requestCount) * 100).toFixed(2) + '%' : '0%'
        }
      };

      middlewareLogger.info('Health check requested', healthStatus);
      res.status(200).json(healthStatus);
    };
  }

  /**
   * Metrics endpoint middleware
   */
  metrics() {
    return async (req, res) => {
      try {
        // Get recent metrics from Firestore
        const metricsSnapshot = await db.collection('middleware_monitoring')
          .orderBy('timestamp', 'desc')
          .limit(100)
          .get();

        const metrics = [];
        metricsSnapshot.forEach(doc => {
          metrics.push({
            id: doc.id,
            ...doc.data()
          });
        });

        const response = {
          status: 'success',
          timestamp: new Date().toISOString(),
          summary: {
            totalRequests: this.requestCount,
            authenticatedRequests: this.authenticatedRequests,
            blockedRequests: this.blockedRequests,
            successRate: this.requestCount > 0 ? 
              ((this.authenticatedRequests / this.requestCount) * 100).toFixed(2) + '%' : '0%'
          },
          recentMetrics: metrics
        };

        res.status(200).json(response);
      } catch (error) {
        middlewareLogger.error('Failed to retrieve metrics', {
          error: error.message
        });

        res.status(500).json({
          error: 'metrics_error',
          message: 'Failed to retrieve metrics'
        });
      }
    };
  }

  /**
   * CORS middleware with Cloudflare optimization
   */
  cors() {
    return (req, res, next) => {
      // Allow requests from Cloudflare-verified origins
      const cloudflareCountry = req.headers['cf-ipcountry'];
      const origin = req.headers.origin;

      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, cf-ray, cf-ipcountry');
      res.header('Access-Control-Expose-Headers', 'cf-ray, cf-ipcountry');

      if (cloudflareCountry) {
        res.header('X-Cloudflare-Country', cloudflareCountry);
      }

      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      next();
    };
  }

  /**
   * Rate limiting middleware
   */
  rateLimit() {
    const rateLimitMap = new Map();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 100;

    return (req, res, next) => {
      const clientId = req.headers['cf-connecting-ip'] || req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old entries
      if (rateLimitMap.has(clientId)) {
        const requests = rateLimitMap.get(clientId);
        rateLimitMap.set(clientId, requests.filter(timestamp => timestamp > windowStart));
      } else {
        rateLimitMap.set(clientId, []);
      }

      const requests = rateLimitMap.get(clientId);
      
      if (requests.length >= maxRequests) {
        middlewareLogger.warn('Rate limit exceeded', {
          clientId,
          requestCount: requests.length,
          path: req.path
        });

        return res.status(429).json({
          error: 'rate_limit_exceeded',
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      requests.push(now);
      next();
    };
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create singleton instance
const sallyPortCloudflareMiddleware = new SallyPortCloudflareMiddleware();

// Export middleware functions
module.exports = {
  authenticate: sallyPortCloudflareMiddleware.authenticate.bind(sallyPortCloudflareMiddleware),
  healthCheck: sallyPortCloudflareMiddleware.healthCheck.bind(sallyPortCloudflareMiddleware),
  metrics: sallyPortCloudflareMiddleware.metrics.bind(sallyPortCloudflareMiddleware),
  cors: sallyPortCloudflareMiddleware.cors.bind(sallyPortCloudflareMiddleware),
  rateLimit: sallyPortCloudflareMiddleware.rateLimit.bind(sallyPortCloudflareMiddleware),
  instance: sallyPortCloudflareMiddleware
};
