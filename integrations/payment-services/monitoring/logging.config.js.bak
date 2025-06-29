/**
 * @fileoverview Logging configuration for payment services integration.
 * Defines logging structure, transport mechanisms, and security filtering for sensitive data.
 * 
 * @copyright Aixtiv Symphony Orchestrating Operating System
 * @version 1.0.1
 */

/**
 * Logging configuration for payment services
 */
const loggingConfig = {
  /**
   * General Configuration
   */
  level: process.env.LOG_LEVEL || 'info',
  format: 'json',
  colorize: process.env.NODE_ENV === 'development',
  timestamp: true,
  
  /**
   * Log Storage Configuration
   */
  storage: {
    // Google Cloud Logging configuration
    cloudLogging: {
      enabled: true,
      projectId: process.env.GCP_PROJECT_ID,
      logName: 'payment-services',
      resourceType: 'cloud_function',
      labels: {
        environment: process.env.NODE_ENV || 'development',
        service: 'payment-services-gateway',
        version: '1.0.1',
      },
    },
    
    // File-based logging (for development/backup)
    file: {
      enabled: process.env.NODE_ENV === 'development',
      filename: 'logs/payment-services-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    },
    
    // Console logging (for development)
    console: {
      enabled: true,
      level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
    },
  },
  
  /**
   * Transaction Logging
   */
  transactions: {
    // Enable detailed transaction logging
    enabled: true,
    // Log to separate transaction log
    separateLog: true,
    // Transaction log name
    logName: 'payment-services-transactions',
    // Log structure templates
    templates: {
      // Payment transaction template
      payment: {
        transaction_id: '',
        timestamp: '',
        service: '',
        payment_method: '',
        amount: 0,
        currency: '',
        status: '',
        customer_id: '',
        product_id: '',
        subscription_id: '',
        metadata: {},
      },
      // Invoice transaction template
      invoice: {
        invoice_id: '',
        timestamp: '',
        service: '',
        amount: 0,
        currency: '',
        status: '',
        customer_id: '',
        payment_id: '',
        items: [],
        metadata: {},
      },
      // Document transaction template
      document: {
        document_id: '',
        timestamp: '',
        service: '',
        document_type: '',
        status: '',
        customer_id: '',
        transaction_id: '',
        metadata: {},
      },
    },
  },
  
  /**
   * Error Logging
   */
  errors: {
    // Capture stack traces
    captureStackTrace: true,
    // Error correlation ID format
    correlationIdFormat: 'uuid',
    // Include request information in error logs
    includeRequest: true,
    // Log request bodies for errors
    logRequestBody: false,
    // Log response bodies for errors
    logResponseBody: false,
    // Error notification threshold (based on error count/minute)
    notificationThreshold: 10,
  },
  
  /**
   * Sensitive Data Handling
   */
  sensitiveData: {
    // Fields to redact from logs
    redactFields: [
      'card_number',
      'cvv',
      'expiry',
      'password',
      'api_key',
      'secret',
      'token',
      'authorization',
      'stripe_secret_key',
      'xero_client_secret',
      'pandadoc_api_key',
      'pandadoc_client_secret',
      'encryption_key',
      'verification_secret',
    ],
    // Redaction pattern (what to replace sensitive data with)
    redactionPattern: '[REDACTED]',
    // Enable PII detection and redaction
    enablePiiRedaction: true,
    // PII types to detect and redact
    piiTypes: ['EMAIL', 'PHONE_NUMBER', 'CREDIT_CARD_NUMBER', 'SSN'],
  },
  
  /**
   * Audit Logging
   */
  audit: {
    // Enable audit logging
    enabled: true,
    // Audit log name
    logName: 'payment-services-audit',
    // Events to audit log
    events: [
      'payment.created',
      'payment.succeeded',
      'payment.failed',
      'invoice.created',
      'invoice.paid',
      'document.created',
      'document.signed',
      'user.authenticated',
      'auth.failed',
      'customer.created',
      'customer.updated',
    ],
    // Include user information in audit logs
    includeUser: true,
    // Include IP address in audit logs
    includeIp: true,
    // Include user agent in audit logs
    includeUserAgent: true,
  },
  
  /**
   * FMS Integration (Flight Memory System)
   */
  fms: {
    // Enable FMS integration
    enabled: process.env.FMS_AUDIT_LOG_ENABLED === 'true',
    // FMS API endpoint
    apiEndpoint: process.env.FMS_API_ENDPOINT,
    // FMS API key
    apiKey: process.env.FMS_API_KEY,
    // Events to log to FMS
    events: [
      'payment.created',
      'payment.succeeded',
      'payment.failed',
      'invoice.created',
      'invoice.paid',
      'document.created',
      'document.signed',
    ],
    // Retry configuration for FMS logging
    retry: {
      attempts: 3,
      delay: 1000, // ms
      backoff: 2, // exponential backoff factor
    },
  },
  
  /**
   * Context Enrichment
   */
  context: {
    // Add trace ID to logs (for OpenTelemetry integration)
    includeTraceId: true,
    // Add request ID to logs
    includeRequestId: true,
    // Add correlation ID to logs
    includeCorrelationId: true,
    // Add custom dimensions based on context
    customDimensions: {
      customer_tier: true,
      subscription_plan: true,
      payment_provider: true,
    },
  },
};

module.exports = loggingConfig;

