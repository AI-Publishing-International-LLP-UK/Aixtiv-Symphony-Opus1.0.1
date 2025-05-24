/**
 * @fileoverview Payment Services Integration Gateway Entry Point
 * Initializes and mounts payment processing and subscription management routes.
 * 
 * @copyright Aixtiv Symphony Orchestrating Operating System
 * @version 1.0.1
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

// Import route handlers
const paymentRoutes = require('./api/payment.routes');
const subscriptionRoutes = require('./api/subscription.routes');

// Import middleware
const { errorHandler, notFoundHandler } = require('../middleware/error');
const { setSecurityHeaders } = require('../middleware/security');
const { logRequest } = require('../middleware/logging');

// Import services
const PaymentService = require('./stripe/services/PaymentIntentService');
const SubscriptionService = require('./stripe/services/SubscriptionService');

// Create metrics registry if OpenTelemetry is available
let metricsRegistry = null;
try {
  const { metrics } = require('../monitoring/opentelemetry');
  metricsRegistry = metrics.getMetricsRegistry();
} catch (error) {
  console.warn('OpenTelemetry metrics not available:', error.message);
}

// Initialize services with metrics
const paymentService = new PaymentService({ metricsRegistry });
const subscriptionService = new SubscriptionService({ metricsRegistry });

/**
 * Initializes the payment services integration
 * @param {Object} options - Configuration options
 * @returns {Object} - Express router and services
 */
function initializePaymentServices(options = {}) {
  const router = express.Router();
  
  // Apply global middleware
  router.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://js.stripe.com"],
        frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
        connectSrc: ["'self'", "https://api.stripe.com"],
        imgSrc: ["'self'", "https://stripe.com", "https://*.stripe.com", "data:"],
      },
    },
  }));
  
  router.use(cors({
    origin: options.corsOrigins || [
      'https://asoos-2100-com.firebaseapp.com', 
      'https://asoos.aixtiv.io',
      /\.aixtiv\.io$/,
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));
  
  router.use(compression());
  
  // Setup request logging
  if (process.env.NODE_ENV === 'production') {
    // Create a write stream for access logs
    const accessLogStream = fs.createWriteStream(
      path.join(process.cwd(), 'logs', 'payment-services-access.log'),
      { flags: 'a' }
    );
    router.use(morgan('combined', { stream: accessLogStream }));
  } else {
    router.use(morgan('dev'));
  }
  
  // Parse JSON bodies
  router.use(express.json({ limit: '1mb' }));
  
  // Parse URL-encoded bodies
  router.use(express.urlencoded({ extended: true, limit: '1mb' }));
  
  // Set security headers
  router.use(setSecurityHeaders);
  
  // Log all requests
  router.use(logRequest);
  
  // Mount route handlers
  router.use('/api/payments', paymentRoutes);
  router.use('/api/subscriptions', subscriptionRoutes);
  
  // Health check endpoint
  router.get('/health', async (req, res) => {
    try {
      // Check Stripe connection
      const stripeHealth = await paymentService.healthCheck();
      
      if (stripeHealth.status === 'healthy') {
        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            stripe: stripeHealth
          },
          environment: process.env.NODE_ENV,
          version: '1.0.1'
        });
      } else {
        res.status(503).json({
          status: 'degraded',
          timestamp: new Date().toISOString(),
          services: {
            stripe: stripeHealth
          },
          environment: process.env.NODE_ENV,
          version: '1.0.1'
        });
      }
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        environment: process.env.NODE_ENV,
        version: '1.0.1'
      });
    }
  });
  
  // Handle 404 errors
  router.use(notFoundHandler);
  
  // Handle all other errors
  router.use(errorHandler);
  
  return {
    router,
    services: {
      paymentService,
      subscriptionService
    }
  };
}

/**
 * Initialize the webhook handlers for external services
 * @returns {Object} - Webhook handlers
 */
function initializeWebhooks() {
  const express = require('express');
  const stripeWebhookHandler = require('./stripe/webhooks/StripeWebhookHandler');
  
  const webhookRouter = express.Router();
  
  // Initialize Stripe webhook handler
  const stripeHandler = new stripeWebhookHandler({ metricsRegistry });
  
  // Mount webhook endpoints
  webhookRouter.post('/stripe', (req, res) => stripeHandler.handleWebhook(req, res));
  
  return {
    router: webhookRouter,
    handlers: {
      stripe: stripeHandler
    }
  };
}

// Export the initialization functions and services
module.exports = {
  initializePaymentServices,
  initializeWebhooks,
  PaymentService,
  SubscriptionService,
  
  // Factory function to create a complete payment gateway router
  createPaymentGateway: (options) => {
    const { router } = initializePaymentServices(options);
    const webhooks = initializeWebhooks();
    
    // Mount webhooks under the main router
    router.use('/webhooks', webhooks.router);
    
    return router;
  }
};

