/**
 * Stripe Integration Monitoring Configuration
 * 
 * Comprehensive monitoring for:
 * - Key rotation tracking
 * - Health checks
 * - Critical event alerting
 * - Telemetry metrics
 * - Audit logging
 * - Integration with Aixtiv Symphony monitoring
 * 
 * All components maintain zero-drift model and region-specific (us-west1) requirements.
 */

import { CloudMonitoringClient } from '@google-cloud/monitoring';
import { LoggingClient } from '@google-cloud/logging';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { PubSubClient } from '@google-cloud/pubsub';
import { SecretsVault } from '../../../../integration/gateway/secrets-vault';
import { StripeService } from '../core/stripe-service';
import { REGION } from '../config/stripe-config';
import { 
  MonitoringService, 
  AlertPolicy, 
  MetricDescriptor, 
  UptimeCheck 
} from '../../../../core/monitoring/monitoring-service';
import { 
  AuditService, 
  AuditLevel, 
  AuditEvent 
} from '../../../../core/audit/audit-service';
import { 
  TelemetryService, 
  MetricType 
} from '../../../../core/telemetry/telemetry-service';
import { SymphonyMonitoringClient } from '../../../../core-protocols/symphony-monitoring';

/**
 * Monitoring configuration for Stripe integration
 */
export interface StripeMonitoringConfig {
  // General configuration
  enabled: boolean;
  environment: 'development' | 'production';
  region: string;
  projectId: string;
  zeroMode: 'zero-drift' | 'minimal-drift' | 'adaptive';
  
  // Key rotation monitoring
  keyRotation: {
    checkIntervalMs: number;
    warningThresholdDays: number;
    criticalThresholdDays: number;
    alertChannels: string[];
  };
  
  // Health check configuration
  healthCheck: {
    intervalMs: number;
    timeoutMs: number;
    failureThreshold: number;
    successThreshold: number;
    endpoints: string[];
  };
  
  // Alerting configuration
  alerting: {
    enabled: boolean;
    notificationChannels: string[];
    severityLevels: {
      info: string[];
      warning: string[];
      critical: string[];
    };
  };
  
  // Telemetry configuration
  telemetry: {
    enabled: boolean;
    sampleRate: number;
    batchSize: number;
    flushIntervalMs: number;
    customMetrics: string[];
  };
  
  // Audit logging configuration
  auditLogging: {
    enabled: boolean;
    logName: string;
    logLevel: AuditLevel;
    retention: number; // in days
  };
  
  // Symphony integration
  symphonyIntegration: {
    enabled: boolean;
    orchestratorUrl: string;
    metricPrefix: string;
    bonded: boolean;
  };
}

/**
 * Default monitoring configuration with secure defaults
 */
export const DEFAULT_MONITORING_CONFIG: StripeMonitoringConfig = {
  enabled: true,
  environment: 'development',
  region: REGION,
  projectId: process.env.GCP_PROJECT || 'api-for-warp-drive',
  zeroMode: 'zero-drift',
  
  keyRotation: {
    checkIntervalMs: 24 * 60 * 60 * 1000, // Daily check
    warningThresholdDays: 75, // Warn at 75 days (out of 90-day rotation period)
    criticalThresholdDays: 85, // Critical at 85 days
    alertChannels: ['email', 'slack', 'pagerduty']
  },
  
  healthCheck: {
    intervalMs: 5 * 60 * 1000, // Every 5 minutes
    timeoutMs: 30 * 1000, // 30 seconds timeout
    failureThreshold: 3, // Alert after 3 consecutive failures
    successThreshold: 2, // Require 2 successes to clear an alert
    endpoints: [
      '/api/health/stripe',
      '/api/health/stripe/webhook'
    ]
  },
  
  alerting: {
    enabled: true,
    notificationChannels: [
      'projects/api-for-warp-drive/notificationChannels/stripe-alerts-email',
      'projects/api-for-warp-drive/notificationChannels/stripe-alerts-slack'
    ],
    severityLevels: {
      info: ['key.rotation.scheduled', 'webhook.received', 'config.updated'],
      warning: ['key.rotation.delayed', 'webhook.validation.failure', 'rate.limit.approaching'],
      critical: ['key.rotation.failed', 'key.expired', 'webhook.authentication.failure', 'service.unavailable']
    }
  },
  
  telemetry: {
    enabled: true,
    sampleRate: 1.0, // 100% sampling
    batchSize: 100,
    flushIntervalMs: 60 * 1000, // 1 minute
    customMetrics: [
      'stripe.payment.success.count',
      'stripe.payment.failure.count',
      'stripe.webhook.processing.time',
      'stripe.key.age.days',
      'stripe.api.latency'
    ]
  },
  
  auditLogging: {
    enabled: true,
    logName: 'stripe-integration-audit',
    logLevel: AuditLevel.INFO,
    retention: 365 // 1 year retention
  },
  
  symphonyIntegration: {
    enabled: true,
    orchestratorUrl: 'https://us-west1-api-for-warp-drive.cloudfunctions.net/symphony-orchestrator',
    metricPrefix: 'asoos.stripe',
    bonded: true
  }
};

/**
 * Stripe Monitoring Service
 * 
 * Manages comprehensive monitoring for the Stripe integration
 */
export class StripeMonitoringService {
  private config: StripeMonitoringConfig;
  private monitoringClient: CloudMonitoringClient;
  private loggingClient: LoggingClient;
  private secretManagerClient: SecretManagerServiceClient;
  private pubSubClient: PubSubClient;
  private monitoringService: MonitoringService;
  private auditService: AuditService;
  private telemetryService: TelemetryService;
  private symphonyMonitoring: SymphonyMonitoringClient;
  private stripeService?: StripeService;
  private secretsVault?: SecretsVault;
  
  constructor(
    config: Partial<StripeMonitoringConfig> = {},
    clients?: {
      monitoringClient?: CloudMonitoringClient;
      loggingClient?: LoggingClient;
      secretManagerClient?: SecretManagerServiceClient;
      pubSubClient?: PubSubClient;
      monitoringService?: MonitoringService;
      auditService?: AuditService;
      telemetryService?: TelemetryService;
      symphonyMonitoring?: SymphonyMonitoringClient;
    }
  ) {
    // Merge with defaults
    this.config = {
      ...DEFAULT_MONITORING_CONFIG,
      ...config,
      // Ensure region is always us-west1
      region: REGION,
      // Nested merge for complex objects
      keyRotation: {
        ...DEFAULT_MONITORING_CONFIG.keyRotation,
        ...(config.keyRotation || {})
      },
      healthCheck: {
        ...DEFAULT_MONITORING_CONFIG.healthCheck,
        ...(config.healthCheck || {})
      },
      alerting: {
        ...DEFAULT_MONITORING_CONFIG.alerting,
        ...(config.alerting || {}),
        severityLevels: {
          ...DEFAULT_MONITORING_CONFIG.alerting.severityLevels,
          ...(config.alerting?.severityLevels || {})
        }
      },
      telemetry: {
        ...DEFAULT_MONITORING_CONFIG.telemetry,
        ...(config.telemetry || {})
      },
      auditLogging: {
        ...DEFAULT_MONITORING_CONFIG.auditLogging,
        ...(config.auditLogging || {})
      },
      symphonyIntegration: {
        ...DEFAULT_MONITORING_CONFIG.symphonyIntegration,
        ...(config.symphonyIntegration || {})
      }
    };
    
    // Initialize clients
    this.monitoringClient = clients?.monitoringClient || new CloudMonitoringClient({
      projectId: this.config.projectId
    });
    
    this.loggingClient = clients?.loggingClient || new LoggingClient({
      projectId: this.config.projectId
    });
    
    this.secretManagerClient = clients?.secretManagerClient || new SecretManagerServiceClient({
      projectId: this.config.projectId
    });
    
    this.pubSubClient = clients?.pubSubClient || new PubSubClient({
      projectId: this.config.projectId
    });
    
    // Initialize services
    this.monitoringService = clients?.monitoringService || new MonitoringService(
      this.monitoringClient, 
      {
        projectId: this.config.projectId,
        region: this.config.region,
        environment: this.config.environment
      }
    );
    
    this.auditService = clients?.auditService || new AuditService(
      this.loggingClient,
      {
        logName: this.config.auditLogging.logName,
        logLevel: this.config.auditLogging.logLevel,
        projectId: this.config.projectId
      }
    );
    
    this.telemetryService = clients?.telemetryService || new TelemetryService({
      enabled: this.config.telemetry.enabled,
      sampleRate: this.config.telemetry.sampleRate,
      batchSize: this.config.telemetry.batchSize,
      flushIntervalMs: this.config.telemetry.flushIntervalMs,
      prefix: 'stripe'
    });
    
    this.symphonyMonitoring = clients?.symphonyMonitoring || new SymphonyMonitoringClient({
      orchestratorUrl: this.config.symphonyIntegration.orchestratorUrl,
      metricPrefix: this.config.symphonyIntegration.metricPrefix,
      bonded: this.config.symphonyIntegration.bonded,
      region: this.config.region,
      zeroMode: this.config.zeroMode
    });
  }
  
  /**
   * Initialize the monitoring service with Stripe service and vault
   */
  setServices(stripeService: StripeService, secretsVault: SecretsVault): void {
    this.stripeService = stripeService;
    this.secretsVault = secretsVault;
  }
  
  /**
   * Initialize all monitoring components
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log('Stripe monitoring is disabled');
      return;
    }
    
    console.log(`Initializing Stripe monitoring (${this.config.environment}, ${this.config.region})`);
    
    try {
      // 1. Set up metric descriptors
      await this.setupMetricDescriptors();
      
      // 2. Create alert policies
      await this.setupAlertPolicies();
      
      // 3. Configure uptime checks
      await this.setupUptimeChecks();
      
      // 4. Initialize Symphony integration
      if (this.config.symphonyIntegration.enabled) {
        await this.symphonyMonitoring.initialize();
      }
      
      // 5. Set up key rotation monitoring
      this.startKeyRotationMonitoring();
      
      // 6. Log initialization event
      await this.auditService.logEvent({
        type: 'monitoring.initialized',
        resource: 'stripe-integration',
        timestamp: new Date(),
        metadata: {
          environment: this.config.environment,
          region: this.config.region,
          zeroMode: this.config.zeroMode
        }
      });
      
      console.log('Stripe monitoring initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Stripe monitoring:', error);
      
      // Even in failure, log the error
      await this.auditService.logEvent({
        type: 'monitoring.initialization.failed',
        resource: 'stripe-integration',
        timestamp: new Date(),
        metadata: {
          error: (error as Error).message
        },
        level: AuditLevel.ERROR
      });
      
      // In zero-drift mode, we don't want to throw errors that could stop the service
      if (this.config.zeroMode !== 'zero-drift') {
        throw error;
      }
    }
  }
  
  /**
   * Set up custom metric descriptors for Stripe monitoring
   */
  private async setupMetricDescriptors(): Promise<void> {
    const metricDescriptors: MetricDescriptor[] = [
      {
        type: 'custom.googleapis.com/stripe/key_age_days',
        metricKind: 'GAUGE',
        valueType: 'DOUBLE',
        description: 'Age of the Stripe API key in days',
        labels: [
          { key: 'environment', description: 'Environment (development/production)' },
          { key: 'key_type', description: 'Key type (test/live)' }
        ],
        displayName: 'Stripe API Key Age'
      },
      {
        type: 'custom.googleapis.com/stripe/webhook_processing_time',
        metricKind: 'GAUGE',
        valueType: 'DOUBLE',
        description: 'Time taken to process Stripe webhooks in milliseconds',
        labels: [
          { key: 'event_type', description: 'Stripe event type' },
          { key: 'environment', description: 'Environment (development/production)' }
        ],
        displayName: 'Stripe Webhook Processing Time'
      },
      {
        type: 'custom.googleapis.com/stripe/payment_success_count',
        metricKind: 'CUMULATIVE',
        valueType: 'INT64',
        description: 'Count of successful Stripe payments',
        labels: [
          { key: 'environment', description: 'Environment (development/production)' },
          { key: 'payment_method', description: 'Payment method used' }
        ],
        displayName: 'Stripe Successful Payments Count'
      },
      {
        type: 'custom.googleapis.com/stripe/payment_failure_count',
        metricKind: 'CUMULATIVE',
        valueType: 'INT64',
        description: 'Count of failed Stripe payments',
        labels: [
          { key: 'environment', description: 'Environment (development/production)' },
          { key: 'payment_method', description: 'Payment method used' },
          { key: 'failure_reason', description: 'Reason for payment failure' }
        ],
        displayName: 'Stripe Failed Payments Count'
      },
      {
        type: 'custom.googleapis.com/stripe/api_latency',
        metricKind: 'GAUGE',
        valueType: 'DOUBLE',
        description: 'Latency of Stripe API calls in milliseconds',
        labels: [
          { key: 'operation', description: 'API operation performed' },
          { key: 'environment', description: 'Environment (development/production)' }
        ],
        displayName: 'Stripe API Latency'
      }
    ];
    
    // Create all metric descriptors
    for (const descriptor of metricDescriptors) {
      await this.monitoringService.createMetricDescriptor(descriptor);
    }
  }
  
  /**
   * Set up alert policies for critical events
   */
  private async setupAlertPolicies(): Promise<void> {
    const alertPolicies: AlertPolicy[] = [
      {
        displayName: 'Stripe API Key Rotation Warning',
        conditions: [{
          displayName: 'Stripe API Key approaching rotation threshold',
          filter: `metric.type="custom.googleapis.com/stripe/key_age_days" AND resource.type="global" AND metric.labels.environment="${this.config.environment}"`,
          comparison: 'COMPARISON_GT',
          thresholdValue: this.config.keyRotation.warningThresholdDays,
          duration: { seconds: 0 },
          trigger: { count: 1 }
        }],
        alertStrategy: {
          notificationChannels: this.config.alerting.notificationChannels,
          autoClose: '7d'
        },
        documentation: {
          content: 'The Stripe API key is approaching its rotation threshold. Consider rotating the key soon.',
          mimeType: 'text/markdown'
        },
        severity: 'WARNING'
      },
      {
        displayName: 'Stripe API Key Rotation Critical',
        conditions: [{
          displayName: 'Stripe API Key past critical rotation threshold',
          filter: `metric.type="custom.googleapis.com/stripe/key_age_days" AND resource.type="global" AND metric.labels.environment="${this.config.environment}"`,
          comparison: 'COMPARISON_GT',
          thresholdValue: this.config.keyRotation.criticalThresholdDays,
          duration: { seconds: 0 },
          trigger: { count: 1 }
        }],
        alertStrategy: {
          notificationChannels: this.config.alerting.notificationChannels,
          autoClose: '1d'
        },
        documentation: {
          content: 'The Stripe API key is past its critical rotation threshold. Rotate the key immediately.',
          mimeType: 'text/markdown'
        },
        severity: 'CRITICAL'
      },
      {
        displayName: 'Stripe Webhook Processing Time',
        conditions: [{
          displayName: 'Webhook processing time too high',
          filter: `metric.type="custom.googleapis.com/stripe/webhook_processing_time" AND resource.type="global" AND metric.labels.environment="${this.config.environment}"`,
          comparison: 'COMPARISON_GT',
          thresholdValue: 5000, // 5 seconds
          duration: { seconds: 300 }, // 5 minutes
          trigger: { count: 3 }
        }],
        alertStrategy: {
          notificationChannels: this.config.alerting.notificationChannels,
          autoClose: '1d'
        },
        documentation: {
          content: 'Stripe webhook processing time is consistently high. Check for performance issues.',
          mimeType: 'text/markdown'
        },
        severity: 'WARNING'
      },
      {
        displayName: 'Stripe Payment Failures',
        conditions: [{
          displayName: 'High rate of payment failures',
          filter: `metric.type="custom.googleapis.com/stripe/payment_failure_count" AND resource.type="global" AND metric.labels.environment="${this.config.environment}"`,
          comparison: 'COMPARISON_GT',
          thresholdValue: 10, // 10 failures in the window
          duration: { seconds: 300 }, // 5 minutes
          trigger: { count: 1 }
        }],
        alertStrategy: {
          notificationChannels: this.config.alerting.notificationChannels,
          autoClose: '1d'
        },
        documentation: {
          content: 'There is a high rate of payment failures. Check Stripe Dashboard for details.',
          mimeType: 'text/markdown'
        },
        severity: 'WARNING'
      }
    ];
    
    // Create all alert policies
    for (const policy of alertPolicies) {
      await this.monitoringService.createAlertPolicy(policy);
    }
  }
  
  /**
   * Set up uptime checks for health monitoring
   */
  private async setupUptimeChecks(): Promise<void> {
    const uptimeChecks: UptimeCheck[] = [];
    
    // Create uptime checks for each endpoint
    for (const endpoint of this.config.healthCheck.endpoints) {
      const checkName = `stripe-${endpoint.replace(/\//g, '-').replace(/^-/, '')}`;
      
      uptimeChecks.push({
        displayName: `Stripe ${checkName} Health Check`,
        httpCheck: {
          path: endpoint,
          port: 443,
          useSsl: true,
          validateSsl: true
        },
        period: { seconds: this.config.healthCheck.intervalMs / 1000 },
        timeout: { seconds: this.config.healthCheck.timeoutMs / 1000 },
        contentMatchers: [{ content: '"status":"healthy"', matcher: 'CONTAINS_STRING' }],
        selectedRegions: ['us-west1'],
        alertPolicy: {
          displayName: `Stripe ${checkName} Availability`,
          conditions: [{
            displayName: `Stripe ${checkName} is down`,
            filter: `metric.type="monitoring.googleapis.com/uptime_check/check_passed" AND resource.type="uptime_url" AND metric.labels.check_id="${checkName}"`,
            comparison: 'COMPARISON_EQ',
            thresholdValue: 0,
            duration: { seconds: 60 },
            trigger: { count: this.config.healthCheck.failureThreshold }
          }],
          alertStrategy: {
            notificationChannels: this.config.alerting.notificationChannels,
            autoClose: '1d'
          },
          documentation: {
            content: `The Stripe ${checkName} endpoint is not responding properly. Check the service status.`,
            mimeType: 'text/markdown'
          },
          severity: 'CRITICAL'
        }
      });
    }
    
    // Create all uptime checks
    for (const check of uptimeChecks) {
      await this.monitoringService.createUptimeCheck(check);
    }
  }
  
  /**
   * Start monitoring key rotation
   */
  private startKeyRotationMonitoring(): void {
    // Set interval to check key age
    setInterval(async () => {
      try {
        await this.checkKeyRotation();
      } catch (error) {
        console.error('Error checking key rotation:', error);
        
        // Log error but don't throw to maintain zero-drift
        await this.auditService.logEvent({
          type: 'key.rotation.check.failed',
          resource: 'stripe-key-rotation',
          timestamp: new Date(),
          metadata: {
            error: (error as Error).message
          },
          level: AuditLevel.ERROR
        });
      }
    }, this.config.keyRotation.checkIntervalMs);
    
    // Also check immediately on startup
    this.checkKeyRotation().catch(error => {
      console.error('Initial key rotation check failed:', error);
    });
  }
  
  /**
   * Check if key rotation is needed
   */
  private async checkKeyRotation(): Promise<void> {
    if (!this.stripeService) {
      console.warn('Stripe service not set, skipping key rotation check');
      return;
    }
    
    // Get the current configuration with key information
    const config = this.stripeService.getConfiguration();
    const secretRef = (this.stripeService as any).secretRef;
    
    if (!secretRef) {
      console.warn('No API key reference found, skipping key rotation check');
      return;
    }
    
    // Determine key age
    const metadata = secretRef.metadata || {};
    const createdAt = metadata.createdAt ? new Date(metadata.createdAt) : null;
    
    if (!createdAt) {
      console.warn('Could not determine key age, missing creation timestamp');
      return;
    }
    
    const now = new Date();
    const ageMs = now.getTime() - createdAt.getTime();
    const ageDays = ageMs / (24 * 60 * 60 * 1000);
    
    // Record the key age metric
    this.telemetryService.recordMetric(
      'key_age_days',
      ageDays,
      {
        environment: config.environment,
        key_type: secretRef.keyType,
        region: config.region
      },
      MetricType.GAUGE
    );
    
    // Send to Symphony monitoring
    if (this.config.symphonyIntegration.enabled) {
      await this.symphonyMonitoring.recordMetric(
        'stripe.key.age.days',
        ageDays,
        {
          environment: config.environment,
          keyType: secretRef.keyType,
          region: config.region
        }
      );
    }
    
    // Check thresholds
    if (ageDays >= this.config.keyRotation.criticalThresholdDays) {
      // Critical threshold exceeded
      await this.auditService.logEvent({
        type: 'key.rotation.critical',
        resource: 'stripe-api-key',
        timestamp: now,
        metadata: {
          keyType: secretRef.keyType,
          ageDays,
          environment: config.environment
        },
        level: AuditLevel.CRITICAL
      });
      
      // Alert through PubSub for immediate action
      await this.publishKeyRotationAlert({
        severity: 'CRITICAL',
        keyType: secretRef.keyType,
        ageDays,
        environment: config.environment,
        message: `Stripe API key (${secretRef.keyType}) is ${ageDays.toFixed(1)} days old and must be rotated immediately.`
      });
    } else if (ageDays >= this.config.keyRotation.warningThresholdDays) {
      // Warning threshold exceeded
      await this.auditService.logEvent({
        type: 'key.rotation.warning',
        resource: 'stripe-api-key',
        timestamp: now,
        metadata: {
          keyType: secretRef.keyType,
          ageDays,
          environment: config.environment
        },
        level: AuditLevel.WARNING
      });
      
      // Alert through PubSub
      await this.publishKeyRotationAlert({
        severity: 'WARNING',
        keyType: secretRef.keyType,
        ageDays,
        environment: config.environment,
        message: `Stripe API key (${secretRef.keyType}) is ${ageDays.toFixed(1)} days old and should be rotated soon.`
      });
    }
  }
  
  /**
   * Publish key rotation alert
   */
  private async publishKeyRotationAlert(alert: KeyRotationAlert): Promise<void> {
    const topic = this.pubSubClient.topic('stripe-key-rotation-alerts');
    const messageData = JSON.stringify(alert);
    
    await topic.publish(Buffer.from(messageData));
  }
  
  /**
   * Record webhook metrics
   */
  async recordWebhookMetrics(
    eventType: string,
    processingTimeMs: number,
    success: boolean
  ): Promise<void> {
    this.telemetryService.recordMetric(
      'webhook_processing_time',
      processingTimeMs,
      {
        event_type: eventType,
        environment: this.config.environment,
        success: String(success)
      },
      MetricType.GAUGE
    );
    
    // Send to Symphony monitoring
    if (this.config.symphonyIntegration.enabled) {
      await this.symphonyMonitoring.recordMetric(
        'stripe.webhook.processing.time',
        processingTimeMs,
        {
          eventType,
          environment: this.config.environment,
          success: String(success)
        }
      );
    }
  }
  
  /**
   * Record payment metrics
   */
  async recordPaymentMetrics(
    success: boolean,
    amount: number,
    currency: string,
    paymentMethod: string,
    failureReason?: string
  ): Promise<void> {
    const metricName = success ? 'payment_success_count' : 'payment_failure_count';
    
    this.telemetryService.recordMetric(
      metricName,
      1,
      {
        environment: this.config.environment,
        payment_method: paymentMethod,
        currency,
        ...(failureReason ? { failure_reason: failureReason } : {})
      },
      MetricType.COUNTER
    );
    
    // Send to Symphony monitoring
    if (this.config.symphonyIntegration.enabled) {
      await this.symphonyMonitoring.recordMetric(
        `stripe.${success ? 'payment.success' : 'payment.failure'}.count`,
        1,
        {
          environment: this.config.environment,
          paymentMethod,
          currency,
          ...(failureReason ? { failureReason } : {})
        }
      );
    }
    
    // Record amount as a separate metric
    this.telemetryService.recordMetric(
      'payment_amount',
      amount,
      {
        environment: this.config.environment,
        payment_method: paymentMethod,
        currency,
        status: success ? 'success' : 'failure'
      },
      MetricType.GAUGE
    );
  }
  
  /**
   * Record API latency metrics
   */
  async recordApiLatency(
    operation: string,
    latencyMs: number
  ): Promise<void> {
    this.telemetryService.recordMetric(
      'api_latency',
      latencyMs,
      {
        operation,
        environment: this.config.environment
      },
      MetricType.GAUGE
    );
    
    // Send to Symphony monitoring
    if (this.config.symphonyIntegration.enabled) {
      await this.symphonyMonitoring.recordMetric(
        'stripe.api.latency',
        latencyMs,
        {
          operation,
          environment: this.config.environment
        }
      );
    }
  }
  
  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    await this.telemetryService.flush();
    
    if (this.config.symphonyIntegration.enabled) {
      await this.symphonyMonitoring.shutdown();
    }
  }
}

// Types
interface KeyRotationAlert {
  severity: 'WARNING' | 'CRITICAL';
  keyType: string;
  ageDays: number;
  environment: string;
  message: string;
}

// Default export
export default StripeMonitoringService;

