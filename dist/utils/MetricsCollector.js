/**
 * Metrics Collector
 * Collects and reports metrics
 */

const logger = require('../services/common/logger');

/**
 * @typedef {Object} MetricsCollectorOptions
 * @property {Object} logger - Logger instance
 * @property {string} serviceName - Service name
 * @property {number} [collectionInterval] - Collection interval in milliseconds
 */

/**
 * MetricsCollector class for collecting and reporting metrics
 */
class MetricsCollector {
  /**
   * @param {MetricsCollectorOptions} options - Metrics collector options
   */
  constructor(options) {
    this.logger = options.logger || logger;
    this.serviceName = options.serviceName;
    this.collectionInterval = options.collectionInterval || 60000; // Default: 1 minute
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
    this.collectionIntervalId = null;
  }
  
  /**
   * Start metrics collection
   */
  startCollection() {
    // Start periodic metrics collection
    this.collectionIntervalId = setInterval(() => {
      this.reportMetrics();
    }, this.collectionInterval);
    
    this.logger.info(`Metrics collection started for ${this.serviceName}`);
  }
  
  /**
   * Stop metrics collection
   */
  stopCollection() {
    if (this.collectionIntervalId) {
      clearInterval(this.collectionIntervalId);
      this.collectionIntervalId = null;
    }
    
    this.logger.info(`Metrics collection stopped for ${this.serviceName}`);
  }
  
  /**
   * Increment counter
   * @param {string} name - Counter name
   * @param {number} [value=1] - Increment value
   */
  incrementCounter(name, value = 1) {
    const currentValue = this.counters.get(name) || 0;
    this.counters.set(name, currentValue + value);
  }
  
  /**
   * Set gauge value
   * @param {string} name - Gauge name
   * @param {number} value - Gauge value
   */
  setGauge(name, value) {
    this.gauges.set(name, value);
  }
  
  /**
   * Observe histogram value
   * @param {string} name - Histogram name
   * @param {number} value - Observed value
   */
  observeHistogram(name, value) {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, []);
    }
    
    const values = this.histograms.get(name);
    values.push(value);
    
    // Keep only last 1000 observations to prevent memory issues
    if (values.length > 1000) {
      values.shift();
    }
  }
  
  /**
   * Report metrics
   * @returns {Promise<void>}
   */
  async reportMetrics() {
    try {
      // Create metrics payload
      const metrics = {
        timestamp: new Date().toISOString(),
        service: this.serviceName,
        counters: Object.fromEntries(this.counters),
        gauges: Object.fromEntries(this.gauges),
        histograms: Object.fromEntries(
          Array.from(this.histograms.entries()).map(([name, values]) => {
            // Calculate histogram statistics
            return [name, this.calculateHistogramStats(values)];
          })
        )
      };
      
      // Write to monitoring service
      await this.writeToMonitoring(metrics);
      
      this.logger.debug('Metrics reported successfully');
    } catch (error) {
      this.logger.error(`Error reporting metrics: ${error.message}`, { error });
    }
  }
  
  /**
   * Calculate histogram statistics
   * @param {number[]} values - Histogram values
   * @returns {Object} Histogram statistics
   */
  calculateHistogramStats(values) {
    if (values.length === 0) {
      return { count: 0 };
    }
    
    // Sort values for percentile calculation
    const sorted = [...values].sort((a, b) => a - b);
    
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
  
  /**
   * Write metrics to monitoring service
   * @param {Object} metrics - Metrics data
   * @returns {Promise<void>}
   */
  async writeToMonitoring(metrics) {
    // In a real implementation, this would write to a monitoring service
    // For example, using Cloud Monitoring or another monitoring service
    
    // For now, we'll just log the metrics
    this.logger.debug('Metrics report', { metrics });
  }
}

module.exports = MetricsCollector;

