/**
 * @fileoverview PandaDoc contract management configuration for ASOOS.
 * Provides API settings, template configuration, and document workflow parameters.
 * 
 * @copyright Aixtiv Symphony Orchestrating Operating System
 * @version 1.0.1
 */

/**
 * PandaDoc API configuration
 * All sensitive credentials are loaded from environment variables.
 */
const pandadocConfig = {
  /**
   * API Configuration
   */
  api: {
    key: process.env.PANDADOC_API_KEY,
    clientId: process.env.PANDADOC_CLIENT_ID,
    clientSecret: process.env.PANDADOC_CLIENT_SECRET,
    baseUrl: process.env.PANDADOC_API_URL || 'https://api.pandadoc.com/v1',
    // Authorization mode: 'api_key' or 'oauth2'
    authMode: 'api_key',
  },
  
  /**
   * OAuth2 Configuration (if using OAuth2)
   */
  oauth: {
    redirectUri: process.env.PANDADOC_REDIRECT_URI,
    scopes: ['read.document', 'write.document', 'read.template', 'write.template'],
    // Token storage configuration
    tokenStorage: {
      type: 'firestore',
      collection: 'pandadoc_tokens',
    },
  },
  
  /**
   * Document Templates
   */
  templates: {
    // Map of template IDs for different document types
    subscription: {
      monthly: process.env.PANDADOC_TEMPLATE_SUBSCRIPTION_MONTHLY,
      annual: process.env.PANDADOC_TEMPLATE_SUBSCRIPTION_ANNUAL,
      enterprise: process.env.PANDADOC_TEMPLATE_SUBSCRIPTION_ENTERPRISE,
    },
    serviceAgreement: process.env.PANDADOC_TEMPLATE_SERVICE_AGREEMENT,
    nda: process.env.PANDADOC_TEMPLATE_NDA,
    customProduct: process.env.PANDADOC_TEMPLATE_CUSTOM_PRODUCT,
  },
  
  /**
   * Document Workflow
   */
  workflow: {
    // Default expiration time for documents (in days)
    defaultExpirationDays: 30,
    // Send email to signers automatically
    sendEmailToSigners: true,
    // Document naming convention
    documentNameTemplate: 'ASOOS - {{documentType}} - {{customerName}} - {{date}}',
    // Default document status
    defaultStatus: 'draft',
    // Require all signers to complete in order
    enforceSigningOrder: true,
  },
  
  /**
   * Webhook Configuration
   */
  webhooks: {
    // Webhook secret for signature validation
    secret: process.env.PANDADOC_WEBHOOK_SECRET,
    // Webhook endpoint
    endpoint: '/api/webhooks/pandadoc',
    // Events to subscribe to
    eventTypes: [
      'document_state_changed',
      'document_completed',
      'document_declined',
      'recipient_completed',
      'document_deleted'
    ],
    // Validate webhook signatures
    validateSignature: true,
  },
  
  /**
   * Signature Validation
   */
  signatureValidation: {
    // Enable signature validation
    enabled: true,
    // Verify signature certificate chain
    verifyCertificateChain: true,
    // Store validation results
    storeValidationResults: true,
  },
  
  /**
   * Document Storage
   */
  storage: {
    // Store completed documents
    storeCompletedDocuments: true,
    // Storage provider: 'firebase', 'gcs', or 'none'
    provider: 'firebase',
    // Path template for document storage
    pathTemplate: 'documents/{{customerUuid}}/{{documentType}}/{{documentId}}',
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
  }
};

module.exports = pandadocConfig;

