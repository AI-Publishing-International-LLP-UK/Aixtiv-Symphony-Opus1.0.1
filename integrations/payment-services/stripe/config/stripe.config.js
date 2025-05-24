/**
 * @fileoverview Stripe payment gateway configuration for ASOOS.
 * Provides configuration for API keys, webhook settings, and integration parameters.
 * 
 * @copyright Aixtiv Symphony Orchestrating Operating System
 * @version 1.0.1
 */

/**
 * Stripe API configuration
 * All sensitive credentials are loaded from environment variables.
 */
const stripeConfig = {
  /**
   * API Configuration
   */
  apiKey: process.env.STRIPE_SECRET_KEY,
  publicKey: process.env.STRIPE_PUBLIC_KEY,
  apiVersion: process.env.STRIPE_API_VERSION || '2025-01-01',
  
  /**
   * Webhook Configuration
   */
  webhooks: {
    secret: process.env.STRIPE_WEBHOOK_SECRET,
    eventTypes: [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'invoice.paid',
      'invoice.payment_failed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'checkout.session.completed'
    ],
    endpoint: '/api/webhooks/stripe',
    validateSignature: true,
  },
  
  /**
   * Product Configuration
   */
  products: {
    // Maps ASOOS product SKUs to Stripe product IDs
    skuMap: {
      // To be populated dynamically from database
    },
    // Default currency for payments
    defaultCurrency: 'USD',
  },
  
  /**
   * Subscription Configuration
   */
  subscriptions: {
    // Trial period in days
    defaultTrialPeriod: 14,
    // Grace period for failed payments in days
    paymentGracePeriod: 3,
    // Prorating enabled for subscription changes
    prorationEnabled: true,
  },
  
  /**
   * Payment Processing
   */
  payments: {
    // Supported payment methods
    supportedPaymentMethods: ['card', 'us_bank_account'],
    // Automatic payment recovery for failed payments
    automaticRecoveryEnabled: true,
    // Number of retry attempts for failed payments
    recoveryAttempts: 3,
    // Statement descriptor shown on customer's card statement
    statementDescriptor: 'AIXTIV SYMPHONY',
    // Statement descriptor suffix (max 22 chars)
    statementDescriptorSuffix: 'ASOOS',
  },
  
  /**
   * Integration Settings
   */
  integration: {
    // Send receipt emails from Stripe
    sendReceiptEmails: true,
    // Stripe Connect settings for marketplace functionality
    connect: {
      enabled: false,
      accountType: 'standard',
    },
    // Save payment method for future use
    savePaymentMethod: true,
  },
  
  /**
   * Error Handling
   */
  errorHandling: {
    // Log detailed error information
    logDetailedErrors: process.env.NODE_ENV !== 'production',
    // Enable automatic retries for API calls
    enableRetries: true,
    // Maximum number of retries
    maxRetries: 3,
    // Initial backoff delay in milliseconds
    initialBackoff: 500,
  }
};

module.exports = stripeConfig;

