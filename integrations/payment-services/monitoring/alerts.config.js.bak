/**
 * @fileoverview Alert configuration for payment services integration.
 * Defines alert thresholds, notification channels, and escalation policies.
 * 
 * @copyright Aixtiv Symphony Orchestrating Operating System
 * @version 1.0.1
 */

/**
 * Alert configuration for payment services
 */
const alertsConfig = {
  /**
   * General Configuration
   */
  enabled: process.env.MONITORING_ENABLED === 'true',
  environment: process.env.NODE_ENV || 'development',
  
  /**
   * Notification Channels
   */
  channels: {
    // Email notifications
    email: {
      enabled: true,
      recipients: [
        process.env.ALERT_EMAIL || 'alerts@asoos-2100-com.firebaseapp.com',
        'operations@asoos-2100-com.firebaseapp.com',
      ],
      throttleInterval: 300, // seconds
    },
    
    // Slack notifications
    slack: {
      enabled: process.env.SLACK_ALERTS_ENABLED === 'true',
      webhook: process.env.SLACK_WEBHOOK_URL,
      channel: '#payment-alerts',
      username: 'Payment Gateway Alert',
      throttleInterval: 300, // seconds
    },
    
    // PagerDuty notifications for critical alerts
    pagerDuty: {
      enabled: process.env.PAGERDUTY_ENABLED === 'true',
      serviceKey: process.env.PAGERDUTY_SERVICE_KEY,
      throttleInterval: 600, // seconds
    },
    
    // SMS notifications for critical alerts
    sms: {
      enabled: process.env.SMS_ALERTS_ENABLED === 'true',
      recipients: (process.env.SMS_RECIPIENTS || '').split(','),
      throttleInterval: 1800, // seconds
    },
  },
  
  /**
   * Alert Definitions
   */
  alerts: {
    /**
     * Payment Processing Alerts
     */
    paymentProcessing: {
      // High error rate in payment processing
      highErrorRate: {
        metric: 'payment_services.transaction.error_rate',
        condition: 'value >= 0.05', // 5% error rate
        duration: '5m',
        severity: 'critical',
        description: 'Payment processing error rate is above 5% for 5 minutes',
        channels: ['email', 'slack', 'pagerDuty'],
        runbook: 'https://docs.asoos-2100-com.firebaseapp.com/runbooks/payment-error-rate',
      },
      
      // Spike in payment failures
      paymentFailureSpike: {
        metric: 'payment_services.stripe.payment_intent.failed',
        condition: 'value >= 10',
        duration: '5m',
        severity: 'warning',
        description: 'Spike in payment failures detected (10+ in 5 minutes)',
        channels: ['email', 'slack'],
        runbook: 'https://docs.asoos-2100-com.firebaseapp.com/runbooks/payment-failure-spike',
      },
      
      // Payment processing latency
      highPaymentLatency: {
        metric: 'payment_services.transaction.latency',
        condition: 'value >= 5000', // 5 seconds
        duration: '5m',
        severity: 'warning',
        description: 'Payment processing latency is above 5 seconds for 5 minutes',
        channels: ['email', 'slack'],
        runbook: 'https://docs.asoos-2100-com.firebaseapp.com/runbooks/payment-latency',
      },
      
      // No payment transactions
      noPaymentTransactions: {
        metric: 'payment_services.transaction.count',
        condition: 'value == 0',
        duration: '30m',
        severity: 'warning',
        description: 'No payment transactions processed in the last 30 minutes',
        channels: ['email', 'slack'],
        runbook: 'https://docs.asoos-2100-com.firebaseapp.com/runbooks/no-payment-transactions',
      },
    },
    
    /**
     * Stripe Integration Alerts
     */
    stripeIntegration: {
      // Stripe API error rate
      stripeApiErrorRate: {
        metric: 'payment_services.stripe.api.error_rate',
        condition: 'value >= 0.1', // 10% error rate
        duration: '5m',
        severity: 'critical',
        description: 'Stripe API error rate is above 10% for 5 minutes',
        channels: ['email', 'slack', 'pagerDuty'],
        runbook: 'https://docs.asoos-2100-com.firebaseapp.com/runbooks/stripe-api-error-rate',
      },
      
      // Webhook processing failures
      webhookFailures: {
        metric: 'payment_services.stripe.webhook.failures',
        condition: 'value >= 5',
        duration: '5m',
        severity: 'critical',
        description: 'Multiple Stripe webhook processing failures detected',
        channels: ['email', 'slack', 'pagerDuty'],
        runbook: 'https://docs.asoos-2100-com.firebaseapp.com/runbooks/stripe-webhook-failures',
      },
      
      // High webhook processing latency
      webhookLatency: {
        metric: 'payment_services.stripe.webhook.latency',
        condition: 'value >= 2000', // 2 seconds
        duration: '5m',
        severity: 'warning',
        description: 'Stripe webhook processing latency is high',
        channels: ['email', 'slack'],
        runbook: 'https://docs.asoos-2100-com.firebaseapp.com/runbooks/stripe-webhook-latency',
      },
    },
    
    /**
     * Xero Integration Alerts
     */
    xeroIntegration: {
      // Xero API error rate
      xeroApiErrorRate: {
        metric: 'payment_services.xero.api.error_rate',
        condition: 'value >= 0.1', // 10% error rate
        duration: '5m',
        severity: 'critical',
        description: 'Xero API error rate is above 10% for 5 minutes',
        channels: ['email', 'slack'],
        runbook: 'https://docs.asoos-2100-com.firebaseapp.com/runbooks/xero-api-error-rate',
      },
      
      // OAuth token expiration
      xeroOAuthExpiration: {
        metric: 'payment_services.xero.oauth.expiration',
        condition: 'value <= 3600', // 1 hour
        duration: '5m',
        severity: 'warning',
        description: 'Xero OAuth token is about to expire',
        channels: ['email', 'slack'],
        runbook: 'https://docs.asoos-2100-com.firebaseapp.com/runbooks/xero-oauth-expiration',
      },
      
      // Reconciliation failures
      reconciliationFailures: {
        metric: 'payment_services.xero.reconciliation.failures',
        condition: 'value >= 3',
        duration: '1h',
        severity: 'critical',
        description: 'Multiple Xero payment reconciliation failures detected',
        channels: ['email', 'slack', 'pagerDuty'],
        runbook: 'https://docs.asoos-2100-com.firebaseapp.com/runbooks/xero-reconciliation-failures',
      },
    },
    
    /**
     * PandaDoc Integration Alerts
     */
    pandadocIntegration: {
      // PandaDoc API error rate
      pandadocApiErrorRate: {
        metric: 'payment_services.pandadoc.api.error_rate',
        condition: 'value >= 0.1', // 10% error rate
        duration: '5m',
        severity: 'warning',
        description: 'PandaDoc API error rate is above 10% for 5 minutes',
        channels: ['email', 'slack'],
        runbook: 'https://docs.asoos-2100-com.firebaseapp.com/runbooks/pandadoc-api-error-rate',
      },
      
      // Document creation failures
      documentCreationFailures: {
        metric: 'payment_services.pandadoc.document.creation_failures',
        condition: 'value >= 3',
        duration: '15m',
        severity: 'warning',
        description: 'Multiple PandaDoc document creation failures detected',
        channels: ['email', 'slack'],
        runbook: 'https://docs.asoos-2100-com.firebaseapp.com/runbooks/pandadoc-document-creation-failures',
      },
      
      // Low document completion rate
      lowDocumentCompletionRate: {
        metric: 'payment_services.pandadoc.document.completion_rate',
        condition: 'value <= 0.5', // 50% completion rate
        duration: '24h',
        severity: 'warning',
        description: 'PandaDoc document completion rate is below 50% over 24 hours',
        channels: ['email'],
        runbook: 'https://docs.asoos-2100-com.firebaseapp.com/runbooks/pandadoc-document-completion-rate',
      },
    },
    
    /**
     * System Health Alerts
     */
    systemHealth: {
      // High memory usage
      highMemoryUsage: {
        metric: 'payment_services.health.memory_usage',
        condition: 'value >= 85', // 85% memory usage
        duration: '5m',
        severity: 'warning',
        description: 'Payment services memory usage is above 85% for 5 minutes',
        channels: ['email', 'slack'],
        runbook: 'https://docs.asoos-2100-com.firebaseapp.com/runbooks/high-memory-usage',
      },
      
      // High CPU usage
      highCpuUsage: {
        metric: 'payment_services.health.cpu_usage',
        condition: 'value >= 90', // 90% CPU usage
        duration: '5m',
        severity: 'warning',
        description: 'Payment services CPU usage is above 90% for 5 minutes',
        channels: ['email', 'slack'],
        runbook: 'https://docs.asoos-2100-com.firebaseapp.com/runbooks/high-cpu-usage',
      },
      
      // Service availability
      serviceAvailability: {
        metric: 'payment_services.health.uptime',
        condition: 'value < 99.9', // 99.9% availability
        duration: '5m',
        severity: 'critical',
        description: 'Payment services availability is below 99.9%',
        channels: ['email', 'slack', 'pagerDuty'],
        runbook: 'https://docs.asoos-2100-com.firebaseapp.com/runbooks/service-availability',
      },
    },
  },
  
  /**
   * Escalation Policies
   */
  escalation: {
    // Time before escalating alerts (in minutes)
    delays: {
      warning: 15,
      critical: 5,
    },
    
    // Escalation paths for unacknowledged alerts
    paths: {
      // Level 1: Primary on-call engineer
      level1: {
        channels: ['email', 'slack', 'sms'],
        timeout: 15, // minutes
      },
      
      // Level 2: Secondary on-call engineer
      level2: {
        channels: ['email', 'slack', 'sms', 'pagerDuty'],
        timeout: 15, // minutes
      },
      
      // Level 3: Engineering manager
      level3: {
        channels: ['email', 'slack', 'sms', 'pagerDuty'],
        timeout: 30, // minutes
      },
      
      // Level 4: Director of Engineering
      level4: {
        channels: ['email', 'slack', 'sms', 'pagerDuty'],
      },
    },
  },
  
  /**
   * Maintenance Windows
   */
  maintenanceWindows: {
    // Suppress alerts during maintenance
    suppressDuringMaintenance: true,
    // Default maintenance window duration (in minutes)
    defaultDuration: 60,
    // Channels to notify about maintenance windows
    notificationChannels: ['email', 'slack'],
  },
};

module.exports = alertsConfig;

