/**
 * @fileoverview Payment Services Gateway Configuration
 * Provides centralized configuration for the payment services integration,
 * including environment settings, dependencies, security, and monitoring.
 * 
 * @copyright Aixtiv Symphony Orchestrating Operating System
 * @version 1.0.1
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file if present
dotenv.config({
  path: path.resolve(process.cwd(), '.env')
});

/**
 * Service configuration object
 * Centralizes all configuration settings for the payment services gateway
 */
const serviceConfig = {
  /**
   * Core Service Configuration
   */
  service: {
    name: process.env.SERVICE_NAME || 'payment-services-gateway',
    version: process.env.SERVICE_VERSION || '1.0.1',
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 8080,
    host: process.env.HOST || '0.0.0.0',
    baseUrl: process.env.BASE_URL || 'https://api.asoos-2100-com.firebaseapp.com/payment',
  },

  /**
   * Cloud Provider Configuration
   */
  cloud: {
    provider: 'gcp',
    projectId: process.env.GCP_PROJECT_ID,
    region: process.env.GCP_REGION || 'us-west1',
    zone: process.env.GCP_ZONE || 'us-west1-b',
    
    // Resource configuration
    resources: {
      cpu: process.env.CPU_LIMIT || '1000m',
      memory: process.env.MEMORY_LIMIT || '512Mi',
      minInstances: parseInt(process.env.MIN_INSTANCES, 10) || 1,
      maxInstances: parseInt(process.env.MAX_INSTANCES, 10) || 10,
      concurrency: parseInt(process.env.CONCURRENCY, 10) || 80,
      timeout: parseInt(process.env.TIMEOUT_SECONDS, 10) || 300,
    },
    
    // Database configuration
    database: {
      type: 'firestore',
      instance: `${process.env.GCP_PROJECT_ID}:${process.env.GCP_REGION}:asoos-payment-db`,
      collections: {
        customers: 'customers',
        subscriptions: 'subscriptions',
        payments: 'payments',
        invoices: 'invoices',
        refunds: 'refunds',
        disputes: 'disputes',
        products: 'products',
        prices: 'prices',
        webhookEvents: 'webhook_events',
        auditLogs: 'audit_logs',
      }
    },
    
    // Cache configuration
    cache: {
      type: 'redis',
      instance: 'payment-services-cache',
      ttl: 3600, // 1 hour
    }
  },
  
  /**
   * Security Configuration
   */
  security: {
    // Authentication
    auth: {
      type: 'sallyport',
      endpoint: process.env.SALLYPORT_AUTH_ENDPOINT,
      verificationSecret: process.env.TOKEN_VERIFICATION_SECRET,
    },
    
    // Encryption
    encryption: {
      key: process.env.PAYMENT_GATEWAY_ENCRYPTION_KEY,
      algorithm: 'aes-256-gcm',
    },
    
    // CORS configuration
    cors: {
      origins: [
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
    },
    
    // Content Security Policy
    csp: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://js.stripe.com"],
        frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
        connectSrc: ["'self'", "https://api.stripe.com"],
        imgSrc: ["'self'", "https://stripe.com", "https://*.stripe.com", "data:"],
      }
    },
    
    // Rate limiting
    rateLimit: {
      standard: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
      },
      webhook: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 60, // Limit each IP to 60 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false,
        message: 'Too many webhook requests from this IP, please try again after 1 minute'
      }
    }
  },
  
  /**
   * External Services Configuration
   */
  externalServices: {
    // Stripe configuration
    stripe: {
      publicKey: process.env.STRIPE_PUBLIC_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      apiVersion: process.env.STRIPE_API_VERSION || '2025-01-01',
      products: {
        defaultCurrency: 'USD'
      },
      subscriptions: {
        defaultTrialPeriod: 14,
        paymentGracePeriod: 3,
        prorationEnabled: true
      },
      payments: {
        supportedPaymentMethods: ['card', 'us_bank_account'],
        automaticRecoveryEnabled: true,
        recoveryAttempts: 3,
        statementDescriptor: 'AIXTIV SYMPHONY',
        statementDescriptorSuffix: 'ASOOS'
      },
      webhooks: {
        endpoint: '/api/webhooks/stripe',
        validateSignature: true
      }
    },
    
    // Xero configuration
    xero: {
      clientId: process.env.XERO_CLIENT_ID,
      clientSecret: process.env.XERO_CLIENT_SECRET,
      redirectUri: process.env.XERO_REDIRECT_URI,
      scopes: (process.env.XERO_SCOPES || '').split(','),
      tenantId: process.env.XERO_TENANT_ID,
      invoices: {
        defaultDueDays: 30,
        autoCreateDrafts: true,
        autoApproveInvoices: false
      },
      webhooks: {
        endpoint: '/api/webhooks/xero',
        validateSignature: true
      }
    },
    
    // PandaDoc configuration
    pandadoc: {
      apiKey: process.env.PANDADOC_API_KEY,
      clientId: process.env.PANDADOC_CLIENT_ID,
      clientSecret: process.env.PANDADOC_CLIENT_SECRET,
      apiUrl: process.env.PANDADOC_API_URL || 'https://api.pandadoc.com/v1',
      webhooks: {
        endpoint: '/api/webhooks/pandadoc',
        validateSignature: true
      }
    },
    
    // FMS (Flight Memory System) configuration
    fms: {
      apiEndpoint: process.env.FMS_API_ENDPOINT,
      apiKey: process.env.FMS_API_KEY,
      auditLogEnabled: process.env.FMS_AUDIT_LOG_ENABLED === 'true',
      retryAttempts: 3,
      retryDelay: 1000 // milliseconds
    }
  },
  
  /**
   * Monitoring Configuration
   */
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    logLevel: process.env.LOG_LEVEL || 'info',
    alertEmail: process.env.ALERT_EMAIL,
    openTelemetry: {
      enabled: true,
      serviceName: 'payment-services-gateway',
      exporter: 'gcp'
    },
    healthCheck: {
      path: '/health',
      interval: 30, // seconds
      timeout: 5, // seconds
      unhealthyThreshold: 3
    },
    metrics: {
      path: '/metrics',
      collectDefaultMetrics: true,
      prefix: 'payment_services_'
    },
    logging: {
      format: process.env.NODE_ENV === 'production' ? 'json' : 'dev',
      colorize: process.env.NODE_ENV !== 'production',
      logToFile: process.env.NODE_ENV === 'production',
      logFilePath: 'logs/payment-services.log',
      sensitiveFields: [
        'card_number',
        'cvv',
        'expiry',
        'password',
        'api_key',
        'secret',
        'token',
        'authorization'
      ]
    },
    alerting: {
      channels: {
        email: [process.env.ALERT_EMAIL],
        slack: process.env.SLACK_WEBHOOK_URL ? [process.env.SLACK_WEBHOOK_URL] : []
      },
      thresholds: {
        errorRate: 0.05, // 5%
        highLatency: 5000, // 5 seconds
        lowAvailability: 0.99 // 99%
      }
    }
  },
  
  /**
   * Feature Flags
   */
  features: {
    stripeEnabled: true,
    xeroEnabled: process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET ? true : false,
    pandadocEnabled: process.env.PANDADOC_API_KEY ? true : false,
    webhooksEnabled: true,
    refundsEnabled: true,
    disputesEnabled: true,
    subscriptionsEnabled: true,
    fmsIntegrationEnabled: process.env.FMS_API_ENDPOINT && process.env.FMS_API_KEY ? true : false,
    automaticReconciliationEnabled: process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET ? true : false,
    multiCurrencyEnabled: true,
    taxCalculationEnabled: false // Future feature
  }
};

module.exports = serviceConfig;

