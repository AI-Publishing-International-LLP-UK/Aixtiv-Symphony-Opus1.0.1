// src/monitoring/performance-monitor.ts

import { UserAuthLevel } from '../auth/user-auth-types';
import { Agent, AgentType } from '../agents/agent-auth-integration';
import { IntegrationType } from '../aixtiv-orchestra/IntegrationGateway/IntegrationGateway';

/**
 * Metric types for the performance monitoring system
 */
export enum MetricType {
  COUNTER = 'counter',      // Incrementing count (e.g., number of logins)
  GAUGE = 'gauge',          // Value that can go up or down (e.g., active users)
  HISTOGRAM = 'histogram',  // Distribution of values (e.g., response times)
  SUMMARY = 'summary'       // Similar to histogram but with quantiles
}

/**
 * Metric dimensions for segmenting metrics
 */
export interface MetricDimensions {
  userId?: string;
  userLevel?: UserAuthLevel;
  agentId?: string;
  agentType?: AgentType;
  integrationType?: IntegrationType;
  actionType?: string;
  errorType?: string;
  browser?: string;
  device?: string;
  region?: string;
  environment: 'development' | 'staging' | 'production';
}

/**
 * Interface for metric recording
 */
export interface MetricRecord {
  name: string;
  type: MetricType;
  value: number;
  timestamp: number;
  dimensions: MetricDimensions;
}

/**
 * Configuration options for the performance monitor
 */
export interface PerformanceMonitorOptions {
  enableConsoleLogging: boolean;
  sampleRate: number;           // 0-1 value for what percentage of events to record
  flushIntervalMs: number;      // How often to send batched metrics
  maxBatchSize: number;         // Maximum batch size before forcing a flush
  endpoint?: string;            // Custom endpoint for metrics
  useLocalStorage: boolean;     // Whether to cache in localStorage if offline
  criticalThresholds: {         // Thresholds for triggering alerts
    authLatencyMs: number;
    agentActivationLatencyMs: number;
    errorRate: number;
    integrationLatencyMs: number;
  }
}

/**
 * Performance monitoring class for tracking system performance
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metricsBuffer: MetricRecord[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private isOnline: boolean = true;
  private options: PerformanceMonitorOptions;
  
  // Default configuration
  private static DEFAULT_OPTIONS: PerformanceMonitorOptions = {
    enableConsoleLogging: false,
    sampleRate: 1.0,
    flushIntervalMs: 10000,  // 10 seconds
    maxBatchSize: 100,
    useLocalStorage: true,
    criticalThresholds: {
      authLatencyMs: 3000,         // 3 seconds for auth operations
      agentActivationLatencyMs: 5000, // 5 seconds for agent activation
      errorRate: 0.05,             // 5% error rate
      integrationLatencyMs: 10000  // 10 seconds for integrations
    }
  };
  
  private constructor(options?: Partial<PerformanceMonitorOptions>) {
    this.options = { ...PerformanceMonitor.DEFAULT_OPTIONS, ...options };
    
    // Initialize flush interval
    this.startFlushInterval();
    
    // Monitor online status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnlineStatus(true));
      window.addEventListener('offline', () => this.handleOnlineStatus(false));
      this.isOnline = navigator.onLine;
      
      // Attempt to send any metrics stored in localStorage
      if (this.options.useLocalStorage && this.isOnline) {
        this.flushLocalStorageMetrics();
      }
    }
    
    // Add performance observer for navigation timings
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const navigationObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.recordHistogram('page_load_time', navEntry.domContentLoadedEventEnd - navEntry.startTime, {
                environment: process.env.NODE_ENV as any || 'development'
              });
            }
          }
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        
        // Observe resource timing
        const resourceObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            const resourceEntry = entry as PerformanceResourceTiming;
            if (resourceEntry.name.includes('auth') || resourceEntry.name.includes('agent')) {
              this.recordHistogram('resource_load_time', resourceEntry.duration, {
                environment: process.env.NODE_ENV as any || 'development',
                actionType: resourceEntry.name.includes('auth') ? 'auth' : 'agent'
              });
            }
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.error('Error setting up PerformanceObserver:', error);
      }
    }
  }
  
  /**
   * Get the singleton instance of the PerformanceMonitor
   */
  public static getInstance(options?: Partial<PerformanceMonitorOptions>): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(options);
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * Handle online/offline status changes
   */
  private handleOnlineStatus(isOnline: boolean): void {
    this.isOnline = isOnline;
    
    if (isOnline && this.options.useLocalStorage) {
      // Try to send cached metrics when back online
      this.flushLocalStorageMetrics();
    }
  }
  
  /**
   * Start the flush interval
   */
  private startFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.options.flushIntervalMs);
  }
  
  /**
   * Flush metrics to the backend
   */
  private async flush(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;
    
    // Clone and clear buffer
    const metricsToSend = [...this.metricsBuffer];
    this.metricsBuffer = [];
    
    if (!this.isOnline) {
      // Store in localStorage if offline
      if (this.options.useLocalStorage) {
        this.storeMetricsInLocalStorage(metricsToSend);
      }
      return;
    }
    
    try {
      const endpoint = this.options.endpoint || '/api/metrics';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ metrics: metricsToSend })
      });
      
      if (!response.ok) {
        throw new Error(`Error sending metrics: ${response.statusText}`);
      }
      
      if (this.options.enableConsoleLogging) {
        console.log(`Sent ${metricsToSend.length} metrics to server`);
      }
    } catch (error) {
      console.error('Error flushing metrics:', error);
      
      // Store failed metrics in localStorage
      if (this.options.useLocalStorage) {
        this.storeMetricsInLocalStorage(metricsToSend);
      }
    }
  }
  
  /**
   * Store metrics in localStorage when offline
   */
  private storeMetricsInLocalStorage(metrics: MetricRecord[]): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      // Get existing metrics
      const existingMetricsStr = localStorage.getItem('aixtiv_cached_metrics');
      let existingMetrics: MetricRecord[] = [];
      
      if (existingMetricsStr) {
        existingMetrics = JSON.parse(existingMetricsStr);
      }
      
      // Add new metrics
      const allMetrics = [...existingMetrics, ...metrics];
      
      // Store with limit to prevent localStorage overflow
      const maxItems = 1000;
      const trimmedMetrics = allMetrics.slice(-maxItems);
      
      localStorage.setItem('aixtiv_cached_metrics', JSON.stringify(trimmedMetrics));
    } catch (error) {
      console.error('Error storing metrics in localStorage:', error);
    }
  }
  
  /**
   * Flush metrics from localStorage
   */
  private flushLocalStorageMetrics(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const metricsStr = localStorage.getItem('aixtiv_cached_metrics');
      if (!metricsStr) return;
      
      const metrics: MetricRecord[] = JSON.parse(metricsStr);
      if (metrics.length === 0) return;
      
      // Clear localStorage
      localStorage.removeItem('aixtiv_cached_metrics');
      
      // Add to buffer for next flush
      this.metricsBuffer.push(...metrics);
      
      // Flush immediately if we have a lot
      if (this.metricsBuffer.length >= this.options.maxBatchSize) {
        this.flush();
      }
    } catch (error) {
      console.error('Error flushing localStorage metrics:', error);
    }
  }
  
  /**
   * Should this event be sampled based on sample rate
   */
  private shouldSample(): boolean {
    return Math.random() < this.options.sampleRate;
  }
  
  /**
   * Record a counter metric
   */
  public recordCount(name: string, value: number = 1, dimensions: Partial<MetricDimensions> = {}): void {
    if (!this.shouldSample()) return;
    
    const metric: MetricRecord = {
      name,
      type: MetricType.COUNTER,
      value,
      timestamp: Date.now(),
      dimensions: {
        environment: process.env.NODE_ENV as any || 'development',
        ...dimensions
      }
    };
    
    this.metricsBuffer.push(metric);
    
    if (this.options.enableConsoleLogging) {
      console.log(`Metric [${name}]: ${value}`, dimensions);
    }
    
    // Check if we should flush due to buffer size
    if (this.metricsBuffer.length >= this.options.maxBatchSize) {
      this.flush();
    }
  }
  
  /**
   * Record a gauge metric
   */
  public recordGauge(name: string, value: number, dimensions: Partial<MetricDimensions> = {}): void {
    if (!this.shouldSample()) return;
    
    const metric: MetricRecord = {
      name,
      type: MetricType.GAUGE,
      value,
      timestamp: Date.now(),
      dimensions: {
        environment: process.env.NODE_ENV as any || 'development',
        ...dimensions
      }
    };
    
    this.metricsBuffer.push(metric);
    
    // Check thresholds for gauges
    this.checkThresholds(name, value, dimensions);
    
    if (this.options.enableConsoleLogging) {
      console.log(`Metric [${name}]: ${value}`, dimensions);
    }
    
    // Check if we should flush due to buffer size
    if (this.metricsBuffer.length >= this.options.maxBatchSize) {
      this.flush();
    }
  }
  
  /**
   * Record a histogram metric
   */
  public recordHistogram(name: string, value: number, dimensions: Partial<MetricDimensions> = {}): void {
    if (!this.shouldSample()) return;
    
    const metric: MetricRecord = {
      name,
      type: MetricType.HISTOGRAM,
      value,
      timestamp: Date.now(),
      dimensions: {
        environment: process.env.NODE_ENV as any || 'development',
        ...dimensions
      }
    };
    
    this.metricsBuffer.push(metric);
    
    // Check thresholds for latencies
    this.checkThresholds(name, value, dimensions);
    
    if (this.options.enableConsoleLogging) {
      console.log(`Metric [${name}]: ${value}`, dimensions);
    }
    
    // Check if we should flush due to buffer size
    if (this.metricsBuffer.length >= this.options.maxBatchSize) {
      this.flush();
    }
  }
  
  /**
   * Check if a metric exceeds critical thresholds
   */
  private checkThresholds(name: string, value: number, dimensions: Partial<MetricDimensions>): void {
    // Check auth latency
    if (name === 'auth_latency' && value > this.options.criticalThresholds.authLatencyMs) {
      this.reportCriticalIssue('High Authentication Latency', {
        value,
        threshold: this.options.criticalThresholds.authLatencyMs,
        dimensions
      });
    }
    
    // Check agent activation latency
    if (name === 'agent_activation_latency' && value > this.options.criticalThresholds.agentActivationLatencyMs) {
      this.reportCriticalIssue('High Agent Activation Latency', {
        value,
        threshold: this.options.criticalThresholds.agentActivationLatencyMs,
        dimensions
      });
    }
    
    // Check integration latency
    if (name === 'integration_latency' && value > this.options.criticalThresholds.integrationLatencyMs) {
      this.reportCriticalIssue('High Integration Latency', {
        value,
        threshold: this.options.criticalThresholds.integrationLatencyMs,
        dimensions
      });
    }
    
    // Check error rate
    if (name === 'error_rate' && value > this.options.criticalThresholds.errorRate) {
      this.reportCriticalIssue('High Error Rate', {
        value,
        threshold: this.options.criticalThresholds.errorRate,
        dimensions
      });
    }
  }
  
  /**
   * Report a critical issue for immediate attention
   */
  private reportCriticalIssue(title: string, details: any): void {
    console.warn(`CRITICAL ISSUE: ${title}`, details);
    
    // In a real implementation, you would send to an alerting system
    // and potentially trigger on-call notifications
    
    // Example: Send to alerting endpoint
    if (this.isOnline) {
      fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          details,
          timestamp: Date.now(),
          level: 'critical'
        })
      }).catch(err => console.error('Error sending alert:', err));
    }
  }
  
  /**
   * Record authentication performance metrics
   */
  public recordAuthPerformance(
    action: 'login' | 'register' | 'upgrade' | 'silent_auth' | 'sallyport',
    latencyMs: number, 
    success: boolean,
    userId?: string,
    userLevel?: UserAuthLevel,
    errorType?: string
  ): void {
    // Record the latency
    this.recordHistogram('auth_latency', latencyMs, {
      actionType: action,
      userId,
      userLevel,
      errorType: success ? undefined : errorType
    });
    
    // Record success/failure count
    this.recordCount(`auth_${success ? 'success' : 'failure'}`, 1, {
      actionType: action,
      userId,
      userLevel,
      errorType: success ? undefined : errorType
    });
    
    // If tracking a specific user, record their last activity
    if (userId) {
      this.recordGauge('user_last_activity', Date.now(), {
        userId,
        userLevel,
        actionType: action
      });
    }
  }
  
  /**
   * Record agent activation performance metrics
   */
  public recordAgentActivation(
    agentId: string,
    agentType: AgentType,
    latencyMs: number,
    success: boolean,
    userId?: string,
    userLevel?: UserAuthLevel,
    errorType?: string
  ): void {
    // Record the latency
    this.recordHistogram('agent_activation_latency', latencyMs, {
      agentId,
      agentType,
      userId,
      userLevel,
      errorType: success ? undefined : errorType
    });
    
    // Record success/failure count
    this.recordCount(`agent_activation_${success ? 'success' : 'failure'}`, 1, {
      agentId,
      agentType,
      userId,
      userLevel,
      errorType: success ? undefined : errorType
    });
  }
  
  /**
   * Record integration performance metrics
   */
  public recordIntegrationPerformance(
    integrationType: IntegrationType,
    action: string,
    latencyMs: number,
    success: boolean,
    userId?: string,
    userLevel?: UserAuthLevel,
    errorType?: string
  ): void {
    // Record the latency
    this.recordHistogram('integration_latency', latencyMs, {
      integrationType,
      actionType: action,
      userId,
      userLevel,
      errorType: success ? undefined : errorType
    });
    
    // Record success/failure count
    this.recordCount(`integration_${success ? 'success' : 'failure'}`, 1, {
      integrationType,
      actionType: action,
      userId,
      userLevel,
      errorType: success ? undefined : errorType
    });
  }
  
  /**
   * Record error metrics
   */
  public recordError(
    errorType: string,
    message: string,
    userId?: string,
    userLevel?: UserAuthLevel,
    agentId?: string,
    integrationType?: IntegrationType
  ): void {
    this.recordCount('error', 1, {
      errorType,
      userId,
      userLevel,
      agentId,
      integrationType
    });
    
    if (this.options.enableConsoleLogging) {
      console.error(`Error [${errorType}]: ${message}`, {
        userId,
        userLevel,
        agentId,
        integrationType
      });
    }
  }
  
  /**
   * Force flush metrics immediately
   */
  public forceFlush(): Promise<void> {
    return this.flush();
  }
}

// Export a singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// React hook for using performance monitoring in components
import { useEffect, useRef } from 'react';

export const usePerformanceMonitoring = () => {
  const startTimeRef = useRef<Record<string, number>>({});
  
  useEffect(() => {
    // Record page view on component mount
    performanceMonitor.recordCount('page_view', 1, {
      environment: process.env.NODE_ENV as any || 'development'
    });
    
    return () => {
      // Could record time spent on page when component unmounts
      const timeSpent = Date.now() - (startTimeRef.current['page_load'] || Date.now());
      performanceMonitor.recordHistogram('time_on_page', timeSpent, {
        environment: process.env.NODE_ENV as any || 'development'
      });
    };
  }, []);
  
  // Start timing an operation
  const startTiming = (operationName: string) => {
    startTimeRef.current[operationName] = Date.now();
  };
  
  // End timing and record
  const endTiming = (operationName: string, dimensions: Partial<MetricDimensions> = {}) => {
    const startTime = startTimeRef.current[operationName];
    if (!startTime) {
      console.warn(`No start time found for operation: ${operationName}`);
      return;
    }
    
    const duration = Date.now() - startTime;
    performanceMonitor.recordHistogram(`${operationName}_duration`, duration, dimensions);
    
    // Clean up
    delete startTimeRef.current[operationName];
  };
  
  return {
    performanceMonitor,
    startTiming,
    endTiming,
    recordCount: performanceMonitor.recordCount.bind(performanceMonitor),
    recordGauge: performanceMonitor.recordGauge.bind(performanceMonitor),
    recordHistogram: performanceMonitor.recordHistogram.bind(performanceMonitor),
    recordError: performanceMonitor.recordError.bind(performanceMonitor),
    recordAuthPerformance: performanceMonitor.recordAuthPerformance.bind(performanceMonitor),
    recordAgentActivation: performanceMonitor.recordAgentActivation.bind(performanceMonitor),
    recordIntegrationPerformance: performanceMonitor.recordIntegrationPerformance.bind(performanceMonitor)
  };
};
