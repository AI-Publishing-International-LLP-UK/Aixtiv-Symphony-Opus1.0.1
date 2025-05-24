/**
 * @fileoverview Xero accounting integration configuration for ASOOS.
 * Provides OAuth2 settings, API configuration, and integration parameters.
 * 
 * @copyright Aixtiv Symphony Orchestrating Operating System
 * @version 1.0.1
 */

/**
 * Xero API configuration
 * All sensitive credentials are loaded from environment variables.
 */
const xeroConfig = {
  /**
   * OAuth2 Configuration
   */
  oauth: {
    clientId: process.env.XERO_CLIENT_ID,
    clientSecret: process.env.XERO_CLIENT_SECRET,
    redirectUri: process.env.XERO_REDIRECT_URI,
    scopes: (process.env.XERO_SCOPES || '').split(','),
    // Token storage configuration
    tokenStorage: {
      type: 'firestore',
      collection: 'xero_tokens',
    },
    // Authorization URL
    authorizationUrl: 'https://login.xero.com/identity/connect/authorize',
    // Token URL
    tokenUrl: 'https://identity.xero.com/connect/token',
  },
  
  /**
   * Tenant Configuration
   */
  tenant: {
    id: process.env.XERO_TENANT_ID,
    // Auto-detect tenant if not specified
    autoDetect: !process.env.XERO_TENANT_ID,
  },
  
  /**
   * Invoice Configuration
   */
  invoices: {
    // Default due days
    defaultDueDays: 30,
    // Auto-create draft invoices for all payments
    autoCreateDrafts: true,
    // Auto-approve invoices
    autoApproveInvoices: false,
    // Default line item description template
    defaultLineItemDescription: 'ASOOS Symphony Subscription',
    // Default tax type
    defaultTaxType: 'OUTPUT',
    // Invoice number prefix
    invoiceNumberPrefix: 'ASOOS-',
    // Contact sync settings
    contactSync: {
      enabled: true,
      // Fields to sync from ASOOS to Xero
      fieldsToSync: ['name', 'email', 'phone', 'address'],
      // Create contacts if they don't exist
      createIfNotExist: true,
    },
  },
  
  /**
   * Payment Reconciliation
   */
  reconciliation: {
    // Auto-reconcile payments from Stripe
    autoReconcile: true,
    // Payment account code in Xero
    paymentAccountCode: '090',
    // Revenue account code in Xero
    revenueAccountCode: '200',
    // Stripe to Xero payment method mapping
    paymentMethodMap: {
      'card': 'CREDITCARD',
      'us_bank_account': 'DIRECTDEBIT',
      'default': 'ELECTRONIC'
    },
  },
  
  /**
   * Webhook Configuration
   */
  webhooks: {
    // Endpoint for Xero webhooks
    endpoint: '/api/webhooks/xero',
    // Events to subscribe to
    eventTypes: [
      'INVOICE_UPDATED',
      'CONTACT_UPDATED',
      'PAYMENT_UPDATED'
    ],
    // Validate webhook signatures
    validateSignature: true,
  },
  
  /**
   * Error Handling
   */
  errorHandling: {
    // Log detailed error information
    logDetailedErrors: process.env.NODE_ENV !== 'production',
    // Retry failed API calls
    enableRetries: true,
    // Maximum number of retries
    maxRetries: 3,
    // Initial backoff delay in milliseconds
    initialBackoff: 1000,
  },
  
  /**
   * API Rate Limiting
   */
  rateLimiting: {
    // Maximum requests per minute
    maxRequestsPerMinute: 60,
    // Enable rate limit handling
    enableRateLimitHandling: true,
  }
};

module.exports = xeroConfig;

