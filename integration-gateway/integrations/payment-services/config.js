/**
 * @fileoverview Main configuration for the payment services integration gateway
 * Orchestrates all payment-related service configurations including Stripe, Xero, and PandaDoc
 * 
 * @copyright Aixtiv Symphony Orchestrating Operating System
 * @version 1.0.1
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

// Import service-specific configurations
const stripeConfig = require('./stripe/config/stripe.config');
const xeroConfig = require('./xero/config/xero.config');
const pandadocConfig = require('./pandadoc/config/pandadoc.config');

/**
 * Central configuration object for all payment services
 */
const config = {
  environment: process.env.NODE_ENV || 'development',
  region: process.env.GCP_REGION || 'us-west1',
  zone: process.env.GCP_ZONE || 'us-west1-b',
  
  // Service configurations
  stripe: stripeConfig,
  xero: xeroConfig,
  pandadoc: pandadocConfig,
  
  // Common security settings
  security: {
    encryptionKey: process.env.PAYMENT_GATEWAY_ENCRYPTION_KEY,
    tokenVerificationSecret: process.env.TOKEN_VERIFICATION_SECRET,
    sallyportAuthEndpoint: process.env.SALLYPORT_AUTH_ENDPOINT,
  },
  
  // FMS Integration for auditing and logging
  fms: {
    apiEndpoint: process.env.FMS_API_ENDPOINT,
    auditLogEnabled: process.env.FMS_AUDIT_LOG_ENABLED === 'true',
    retryAttempts: 3,
    retryDelay: 1000, // milliseconds
  },
  
  // Logging and monitoring
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    monitoringEnabled: process.env.MONITORING_ENABLED === 'true',
    alertEmail: process.env.ALERT_EMAIL,
  },
  
  // Integration endpoints
  endpoints: {
    ecommerce: {
      orderWebhook: '/api/ecommerce/webhook/order',
      productEntitlements: '/api/ecommerce/entitlements',
    },
    userManagement: {
      userProfileEndpoint: '/api/users/profile',
      roleVerificationEndpoint: '/api/users/verify-role',
    },
  }
};

module.exports = config;

