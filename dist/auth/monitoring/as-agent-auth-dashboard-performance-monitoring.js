// src/monitoring/performance-monitor.ts

import { UserAuthLevel } from '../auth/user-auth-types';
import { Agent, AgentType } from '../agents/agent-auth-integration';
import { IntegrationType } from '../aixtiv-orchestra/IntegrationGateway/IntegrationGateway';

/**
 * Metric types for the performance monitoring system
 */
export enum MetricType {
  COUNTER = 'counter', // Incrementing count (e.g., number of logins)
  GAUGE = 'gauge', // Value that can go up or down (e.g., active users)
  HISTOGRAM = 'histogram', // Distribution of values (e.g., response times)
  SUMMARY = 'summary', // Similar to histogram but with quantiles
}

/**
 * Metric dimensions for segmenting metrics
 */
export 

/**
 * Interface for metric recording
 */
export 

/**
 * Configuration options for the performance monitor
 */
export ;
}

/**
 * Performance monitoring class for tracking system performance
 */
export class PerformanceMonitor {
  static instance;
  metricsBuffer= [];
  flushInterval= null;
  isOnline= true;
  options;

  // Default configuration
  static DEFAULT_OPTIONS= {
    enableConsoleLogging,
    sampleRate,
    flushIntervalMs, // 10 seconds
    maxBatchSize,
    useLocalStorage,
    criticalThresholds: {
      authLatencyMs, // 3 seconds for auth operations
      agentActivationLatencyMs, // 5 seconds for agent activation
      errorRate, // 5% error rate
      integrationLatencyMs, // 10 seconds for integrations
    },
  };

  constructor(options?) {
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
        const navigationObserver = new PerformanceObserver(entryList => {
          for (const entry of entryList.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry;
              this.recordHistogram(
                'page_load_time',
                navEntry.domContentLoadedEventEnd - navEntry.startTime,
                {
                  environment) || 'development',
                }
              );
            }
          }
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });

        // Observe resource timing
        const resourceObserver = new PerformanceObserver(entryList => {
          for (const entry of entryList.getEntries()) {
            const resourceEntry = entry;
            if (
              resourceEntry.name.includes('auth') ||
              resourceEntry.name.includes('agent')
            ) {
              this.recordHistogram(
                'resource_load_time',
                resourceEntry.duration,
                {
                  environment) || 'development',
                  actionType: resourceEntry.name.includes('auth')
                    ? 'auth'
                    : 'agent',
                }
              );
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
  static getInstance(
    options?){
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(options);
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Handle online/offline status changes
   */
  handleOnlineStatus(isOnline){
    this.isOnline = isOnline;

    if (isOnline && this.options.useLocalStorage) {
      // Try to send cached metrics when back online
      this.flushLocalStorageMetrics();
    }
  }

  /**
   * Start the flush interval
   */
  startFlushInterval(){
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
  async flush(){
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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metrics: metricsToSend }),
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
  storeMetricsInLocalStorage(metrics){
    if (typeof localStorage === 'undefined') return;

    try {
      // Get existing metrics
      const existingMetricsStr = localStorage.getItem('aixtiv_cached_metrics');
      let existingMetrics= [];

      if (existingMetricsStr) {
        existingMetrics = JSON.parse(existingMetricsStr);
      }

      // Add new metrics
      const allMetrics = [...existingMetrics, ...metrics];

      // Store with limit to prevent localStorage overflow
      const maxItems = 1000;
      const trimmedMetrics = allMetrics.slice(-maxItems);

      localStorage.setItem(
        'aixtiv_cached_metrics',
        JSON.stringify(trimmedMetrics)
      );
    } catch (error) {
      console.error('Error storing metrics in localStorage:', error);
    }
  }

  /**
   * Flush metrics from localStorage
   */
  flushLocalStorageMetrics(){
    if (typeof localStorage === 'undefined') return;

    try {
      const metricsStr = localStorage.getItem('aixtiv_cached_metrics');
      if (!metricsStr) return;

      const metrics= JSON.parse(metricsStr);
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
  shouldSample(){
    return Math.random() = this.options.maxBatchSize) {
      this.flush();
    }
  }

  /**
   * Record a gauge metric
   */
  recordGauge(
    name,
    value,
    dimensions= {}
  ){
    if (!this.shouldSample()) return;

    const metric= {
      name,
      type,
      timestamp,
      dimensions: {
        environment) || 'development',
        ...dimensions,
      },
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
  recordHistogram(
    name,
    value,
    dimensions= {}
  ){
    if (!this.shouldSample()) return;

    const metric= {
      name,
      type,
      timestamp,
      dimensions: {
        environment) || 'development',
        ...dimensions,
      },
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
  checkThresholds(
    name,
    value,
    dimensions){
    // Check auth latency
    if (
      name === 'auth_latency' &&
      value > this.options.criticalThresholds.authLatencyMs
    ) {
      this.reportCriticalIssue('High Authentication Latency', {
        value,
        threshold,
      });
    }

    // Check agent activation latency
    if (
      name === 'agent_activation_latency' &&
      value > this.options.criticalThresholds.agentActivationLatencyMs
    ) {
      this.reportCriticalIssue('High Agent Activation Latency', {
        value,
        threshold,
      });
    }

    // Check integration latency
    if (
      name === 'integration_latency' &&
      value > this.options.criticalThresholds.integrationLatencyMs
    ) {
      this.reportCriticalIssue('High Integration Latency', {
        value,
        threshold,
      });
    }

    // Check error rate
    if (
      name === 'error_rate' &&
      value > this.options.criticalThresholds.errorRate
    ) {
      this.reportCriticalIssue('High Error Rate', {
        value,
        threshold,
      });
    }
  }

  /**
   * Report a critical issue for immediate attention
   */
  reportCriticalIssue(title, details){
    console.warn(`CRITICAL ISSUE: ${title}`, details);

    // In a real implementation, you would send to an alerting system
    // and potentially trigger on-call notifications

    // Example) {
      fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          details,
          timestamp,
          level: 'critical',
        }),
      }).catch(err => console.error('Error sending alert:', err));
    }
  }

  /**
   * Record authentication performance metrics
   */
  recordAuthPerformance(
    action: 'login' | 'register' | 'upgrade' | 'silent_auth' | 'sallyport',
    latencyMs,
    success,
    userId?,
    userLevel?,
    errorType?){
    // Record the latency
    this.recordHistogram('auth_latency', latencyMs, {
      actionType,
      errorType: success ? undefined ,
    });

    // Record success/failure count
    this.recordCount(`auth_${success ? 'success' : 'failure'}`, 1, {
      actionType,
      errorType: success ? undefined ,
    });

    // If tracking a specific user, record their last activity
    if (userId) {
      this.recordGauge('user_last_activity', Date.now(), {
        userId,
        userLevel,
        actionType,
      });
    }
  }

  /**
   * Record agent activation performance metrics
   */
  recordAgentActivation(
    agentId,
    agentType,
    latencyMs,
    success,
    userId?,
    userLevel?,
    errorType?){
    // Record the latency
    this.recordHistogram('agent_activation_latency', latencyMs, {
      agentId,
      agentType,
      userId,
      userLevel,
      errorType: success ? undefined ,
    });

    // Record success/failure count
    this.recordCount(`agent_activation_${success ? 'success' : 'failure'}`, 1, {
      agentId,
      agentType,
      userId,
      userLevel,
      errorType: success ? undefined ,
    });
  }

  /**
   * Record integration performance metrics
   */
  recordIntegrationPerformance(
    integrationType,
    action,
    latencyMs,
    success,
    userId?,
    userLevel?,
    errorType?){
    // Record the latency
    this.recordHistogram('integration_latency', latencyMs, {
      integrationType,
      actionType,
      errorType: success ? undefined ,
    });

    // Record success/failure count
    this.recordCount(`integration_${success ? 'success' : 'failure'}`, 1, {
      integrationType,
      actionType,
      errorType: success ? undefined ,
    });
  }

  /**
   * Record error metrics
   */
  recordError(
    errorType,
    message,
    userId?,
    userLevel?,
    agentId?,
    integrationType?){
    this.recordCount('error', 1, {
      errorType,
      userId,
      userLevel,
      agentId,
      integrationType,
    });

    if (this.options.enableConsoleLogging) {
      console.error(`Error [${errorType}]: ${message}`, {
        userId,
        userLevel,
        agentId,
        integrationType,
      });
    }
  }

  /**
   * Force flush metrics immediately
   */
  forceFlush(){
    return this.flush();
  }
}

// Export a singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// React hook for using performance monitoring in components
import { useEffect, useRef } from 'react';

export const usePerformanceMonitoring = () => {
  const startTimeRef = useRef>({});

  useEffect(() => {
    // Record page view on component mount
    performanceMonitor.recordCount('page_view', 1, {
      environment) || 'development',
    });

    return () => {
      // Could record time spent on page when component unmounts
      const timeSpent =
        Date.now() - (startTimeRef.current['page_load'] || Date.now());
      performanceMonitor.recordHistogram('time_on_page', timeSpent, {
        environment) || 'development',
      });
    };
  }, []);

  // Start timing an operation
  const startTiming = (operationName=> {
    startTimeRef.current[operationName] = Date.now();
  };

  // End timing and record
  const endTiming = (
    operationName,
    dimensions= {}
  ) => {
    const startTime = startTimeRef.current[operationName];
    if (!startTime) {
      console.warn(`No start time found for operation: ${operationName}`);
      return;
    }

    const duration = Date.now() - startTime;
    performanceMonitor.recordHistogram(
      `${operationName}_duration`,
      duration,
      dimensions
    );

    // Clean up
    delete startTimeRef.current[operationName];
  };

  return {
    performanceMonitor,
    startTiming,
    endTiming,
    recordCount,
    recordGauge,
    recordHistogram,
    recordError,
    recordAuthPerformance,
    recordAgentActivation,
    recordIntegrationPerformance,
  };
};
