/**
 * @fileoverview Monitoring configuration for payment services integration.
 * Defines metrics, data collection, and monitoring endpoints for Stripe, Xero, and PandaDoc integrations.
 * 
 * @copyright Aixtiv Symphony Orchestrating Operating System
 * @version 1.0.1
 */

/**
 * OpenTelemetry and monitoring configuration for payment services
 */
const monitoringConfig = {
  /**
   * General Configuration
   */
  enabled: process.env.MONITORING_ENABLED === 'true',
  environment: process.env.NODE_ENV || 'development',
  region: process.env.GCP_REGION || 'us-west1',
  
  /**
   * Service Metadata
   */
  service: {
    name: 'payment-services-gateway',
    namespace: 'asoos',
    version: '1.0.1',
    instanceId: process.env.INSTANCE_ID || 'default',
  },

  /**
   * OpenTelemetry Configuration
   */
  openTelemetry: {
    // Google Cloud Trace exporter configuration
    tracing: {
      enabled: true,
      exporter: 'gcp',
      samplingRate: 1.0, // Sample 100% of requests in development, adjust for production
      gcpProjectId: process.env.GCP_PROJECT_ID,
    },
    
    // Google Cloud Monitoring (Metrics) exporter configuration
    metrics: {
      enabled: true,
      exporter: 'gcp',
      interval: 60000, // Export every 60 seconds
      gcpProjectId: process.env.GCP_PROJECT_ID,
    },
  },
  
  /**
   * Metric Definitions
   */
  metrics: {
    // Payment Processing Metrics
    payments: {
      transactionCount: {
        name: 'payment_services.transaction.count',
        description: 'Count of payment transactions processed',
        unit: '1',
        type: 'counter',
      },
      transactionValue: {
        name: 'payment_services.transaction.value',
        description: 'Value of payment transactions processed',
        unit: 'USD',
        type: 'counter',
      },
      transactionLatency: {
        name: 'payment_services.transaction.latency',
        description: 'Latency of payment transaction processing',
        unit: 'ms',
        type: 'histogram',
        buckets: [100, 250, 500, 1000, 2500, 5000, 10000],
      },
      errorRate: {
        name: 'payment_services.transaction.error_rate',
        description: 'Rate of errors in payment processing',
        unit: '1',
        type: 'gauge',
      },
      successRate: {
        name: 'payment_services.transaction.success_rate',
        description: 'Rate of successful payment processing',
        unit: '1',
        type: 'gauge',
      },
    },
    
    // Stripe-specific Metrics
    stripe: {
      webhookLatency: {
        name: 'payment_services.stripe.webhook.latency',
        description: 'Latency of Stripe webhook processing',
        unit: 'ms',
        type: 'histogram',
        buckets: [50, 100, 250, 500, 1000, 2500, 5000],
      },
      apiCallCount: {
        name: 'payment_services.stripe.api.call_count',
        description: 'Count of Stripe API calls',
        unit: '1',
        type: 'counter',
      },
      paymentIntentCreated: {
        name: 'payment_services.stripe.payment_intent.created',
        description: 'Count of payment intents created',
        unit: '1',
        type: 'counter',
      },
      paymentIntentSucceeded: {
        name: 'payment_services.stripe.payment_intent.succeeded',
        description: 'Count of payment intents succeeded',
        unit: '1',
        type: 'counter',
      },
      paymentIntentFailed: {
        name: 'payment_services.stripe.payment_intent.failed',
        description: 'Count of payment intents failed',
        unit: '1',
        type: 'counter',
      },
    },
    
    // Xero-specific Metrics
    xero: {
      invoiceCount: {
        name: 'payment_services.xero.invoice.count',
        description: 'Count of invoices created in Xero',
        unit: '1',
        type: 'counter',
      },
      apiCallCount: {
        name: 'payment_services.xero.api.call_count',
        description: 'Count of Xero API calls',
        unit: '1',
        type: 'counter',
      },
      syncLatency: {
        name: 'payment_services.xero.sync.latency',
        description: 'Latency of Xero data synchronization',
        unit: 'ms',
        type: 'histogram',
        buckets: [100, 250, 500, 1000, 2500, 5000, 10000],
      },
      reconciliationSuccess: {
        name: 'payment_services.xero.reconciliation.success_rate',
        description: 'Rate of successful payment reconciliations',
        unit: '1',
        type: 'gauge',
      },
    },
    
    // PandaDoc-specific Metrics
    pandadoc: {
      documentCount: {
        name: 'payment_services.pandadoc.document.count',
        description: 'Count of documents created in PandaDoc',
        unit: '1',
        type: 'counter',
      },
      apiCallCount: {
        name: 'payment_services.pandadoc.api.call_count',
        description: 'Count of PandaDoc API calls',
        unit: '1',
        type: 'counter',
      },
      documentCompletionRate: {
        name: 'payment_services.pandadoc.document.completion_rate',
        description: 'Rate of document completion',
        unit: '1',
        type: 'gauge',
      },
      signingLatency: {
        name: 'payment_services.pandadoc.signing.latency',
        description: 'Time from document creation to signing completion',
        unit: 'ms',
        type: 'histogram',
        buckets: [60000, 300000, 900000, 3600000, 86400000], // 1min, 5min, 15min, 1hr, 24hr
      },
    },
    
    // Health and Performance Metrics
    health: {
      uptime: {
        name: 'payment_services.health.uptime',
        description: 'Uptime of payment services',
        unit: 'ms',
        type: 'counter',
      },
      memoryUsage: {
        name: 'payment_services.health.memory_usage',
        description: 'Memory usage of payment services',
        unit: 'bytes',
        type: 'gauge',
      },
      cpuUsage: {
        name: 'payment_services.health.cpu_usage',
        description: 'CPU usage of payment services',
        unit: 'percent',
        type: 'gauge',
      },
      activeConnections: {
        name: 'payment_services.health.active_connections',
        description: 'Number of active connections to payment services',
        unit: '1',
        type: 'gauge',
      },
    },
  },
  
  /**
   * Dashboards
   */
  dashboards: {
    // Dashboard configuration for Cloud Monitoring
    paymentsDashboard: {
      name: 'Payment Services Overview',
      refreshInterval: 300, // seconds
      charts: [
        {
          title: 'Transaction Volume',
          metrics: ['payment_services.transaction.count'],
          type: 'line',
          duration: '1h',
        },
        {
          title: 'Transaction Value',
          metrics: ['payment_services.transaction.value'],
          type: 'line',
          duration: '1h',
        },
        {
          title: 'Error Rates',
          metrics: ['payment_services.transaction.error_rate'],
          type: 'line',
          duration: '1h',
          threshold: 0.05, // 5% error rate threshold
        },
        {
          title: 'API Latency',
          metrics: [
            'payment_services.transaction.latency',
            'payment_services.stripe.webhook.latency',
            'payment_services.xero.sync.latency'
          ],
          type: 'heatmap',
          duration: '1h',
        },
      ],
    },
  },
  
  /**
   * Health Check Endpoints
   */
  healthChecks: {
    stripe: {
      path: '/health/stripe',
      timeout: 5000, // ms
      interval: 60000, // ms
    },
    xero: {
      path: '/health/xero',
      timeout: 5000, // ms
      interval: 60000, // ms
    },
    pandadoc: {
      path: '/health/pandadoc',
      timeout: 5000, // ms
      interval: 60000, // ms
    },
    overall: {
      path: '/health',
      timeout: 5000, // ms
      interval: 30000, // ms
    },
  },
};

module.exports = monitoringConfig;

