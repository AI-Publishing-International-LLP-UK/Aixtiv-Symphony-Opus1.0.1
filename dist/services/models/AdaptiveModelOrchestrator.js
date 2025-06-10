/**
 * Adaptive Model Orchestration Layer
 * 
 * An enhanced orchestration system for managing interactions with multiple LLM providers that builds on the
 * existing ModelOrchestrationLayer with additional capabilities:
 * 
 * 1. Performance prediction based on historic model performance data
 * 2. Adaptive learning system that improves model selection over time
 * 3. Business impact tracking for calculating cost savings and ROI
 * 4. Dynamic circuit breakers to handle failures gracefully
 * 5. Enhanced model selection using ML-based optimization
 */

import { ModelOrchestrationLayer } from './ModelOrchestrationLayer';
import { MetricsCollector } from '../metrics/MetricsCollector';
import { ErrorUtils } from '../../utils/ErrorUtils';
import { performance } from 'perf_hooks';
import { Logger } from '../../utils/logger';

// Interfaces for type safety










/**
 * Performance Predictor Class
 * 
 * Predicts model performance based on request features and historical data
 */
class PerformancePredictor {
  modelStats= new Map();
  logger;
  featureHistory: {features, result: any}[] = [];
  maxHistoryEntries = 1000;

  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Update model statistics with latest performance data
   */
  updateModelStats(
    provider,
    model,
    latency,
    isSuccess,
    cost){
    const key = `${provider}:${model}`;
    let stats = this.modelStats.get(key);

    if (!stats) {
      stats = {
        provider,
        model,
        latency,
        errorRate,
        successCount,
        failureCount,
        averageCost,
        lastUpdated,
        reliability,
        features,
        capabilities: []
      };
      this.modelStats.set(key, stats);
    }

    // Update latency history (keep last 100 entries)
    stats.latency.push(latency);
    if (stats.latency.length > 100) {
      stats.latency.shift();
    }

    // Update success/failure counts and error rate
    if (isSuccess) {
      stats.successCount += 1;
    } else {
      stats.failureCount += 1;
    }
    
    const totalRequests = stats.successCount + stats.failureCount;
    stats.errorRate = totalRequests > 0 ? stats.failureCount / totalRequests ;
    stats.reliability = 1 - stats.errorRate;

    // Update average cost
    stats.averageCost = ((stats.averageCost * (totalRequests - 1)) + cost) / totalRequests;
    stats.lastUpdated = Date.now();

    this.modelStats.set(key, stats);
  }

  /**
   * Predict model performance for a given request
   */
  predictPerformance(
    models: { provider, model: string }[],
    features){
    try {
      const predictions= [];

      for (const { provider, model } of models) {
        const key = `${provider}:${model}`;
        const stats = this.modelStats.get(key);

        if (!stats || stats.latency.length === 0) {
          // If no history, make a default prediction with low confidence
          predictions.push({
            provider,
            model,
            predictedLatency, // default 1s latency
            predictedCost,    // default cost estimate
            predictedReliability, // default reliability
            confidence: 0.1         // low confidence
          });
          continue;
        }

        // Calculate predicted latency based on similar past requests
        const recentLatencies = stats.latency.slice(-20);
        const avgLatency = recentLatencies.reduce((sum, val) => sum + val, 0) / recentLatencies.length;

        // Apply adjustments based on features
        let adjustedLatency = avgLatency;
        
        // Adjust based on prompt length (longer prompts may take more time)
        if (features.promptLength > 1000) {
          adjustedLatency *= 1.2;
        }

        // Adjust based on complexity
        if (features.complexity > 0.7) {
          adjustedLatency *= 1.3;
        }

        // Adjust based on time of day (peak hours might affect performance)
        const hour = features.timeOfDay;
        if (hour >= 9 && hour  ({
        provider,
        model,
        predictedLatency,
        predictedCost,
        predictedReliability,
        confidence: 0.1
      }));
    }
  }

  /**
   * Record request features and result for training
   */
  recordFeatureResult(features, result){
    this.featureHistory.push({ features, result });
    
    // Limit history size
    if (this.featureHistory.length > this.maxHistoryEntries) {
      this.featureHistory.shift();
    }
  }

  /**
   * Train the predictor on historical data
   */
  async train(){
    // In a real implementation, this would train the ML model
    // For now, we'll just log that training occurred
    this.logger.info(`Training performance predictor on ${this.featureHistory.length} examples`);
    
    // Remove old entries to keep the model focused on recent data
    if (this.featureHistory.length > this.maxHistoryEntries / 2) {
      this.featureHistory = this.featureHistory.slice(-this.maxHistoryEntries / 2);
    }
  }
}

/**
 * Routing Optimizer Class
 * 
 * Uses reinforcement learning techniques to optimize model selection over time
 */
class RoutingOptimizer {
  logger;
  rewardHistory= new Map();
  weightedScores= new Map();
  explorationRate= 0.2; // Exploration vs exploitation balance
  learningRate= 0.1;
  
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Optimize model selection based on historical performance
   */
  selectOptimalModel(
    candidates,
    taskType,
    explorationEnabled= true
  ){
    try {
      if (candidates.length === 0) {
        throw new Error('No candidate models provided for optimization');
      }

      if (candidates.length === 1) {
        return candidates[0];
      }

      // Random exploration (with probability explorationRate)
      if (explorationEnabled && Math.random()  {
        const key = `${model.provider}:${model.model}:${taskType}`;
        let weightedScore = this.weightedScores.get(key) || 0.5; // Default score
        
        // Adjust score based on predictions
        // Convert metrics to 0-1 range for easier comparison
        const latencyScore = Math.max(0, 1 - (model.predictedLatency / 5000)); // Assumes 5s is worst case
        const costScore = Math.max(0, 1 - (model.predictedCost / 0.1)); // Assumes $0.10 is worst case
        const reliabilityScore = model.predictedReliability;
        
        // Combine scores with confidence-weighted sum
        const predictedScore = (
          (0.4 * reliabilityScore) + 
          (0.3 * latencyScore) + 
          (0.3 * costScore)
        ) * model.confidence;
        
        // Combine historical score with predicted score
        const combinedScore = (0.7 * weightedScore) + (0.3 * predictedScore);
        
        return { model, score: combinedScore };
      });

      // Select the model with the highest score
      return scores.sort((a, b) => b.score - a.score)[0].model;
    } catch (error) {
      this.logger.error(`Error selecting optimal model: ${ErrorUtils.formatError(error)}`);
      // In case of error, return the first candidate or the one with highest reliability
      return candidates.sort((a, b) => b.predictedReliability - a.predictedReliability)[0];
    }
  }

  /**
   * Update model scores based on execution results (reinforcement learning)
   */
  updateFromResult(
    provider,
    model,
    taskType,
    success,
    latency,
    cost){
    try {
      const key = `${provider}:${model}:${taskType}`;
      
      // Calculate reward (combine success, latency, and cost factors)
      // Success is the most important factor
      const successFactor = success ? 1.0 ;
      
      // Latency factor (lower is better)
      // Normalize to 0-1 range, with anything over 5s being 0
      const latencyFactor = Math.max(0, 1 - (latency / 5000));
      
      // Cost factor (lower is better)
      // Normalize to 0-1 range, with anything over $0.10 being 0
      const costFactor = Math.max(0, 1 - (cost / 0.1));
      
      // Combined reward (weighted sum)
      const reward = (0.6 * successFactor) + (0.2 * latencyFactor) + (0.2 * costFactor);
      
      // Store reward in history
      let rewards = this.rewardHistory.get(key) || [];
      rewards.push(reward);
      
      // Keep only the last 100 rewards
      if (rewards.length > 100) {
        rewards = rewards.slice(-100);
      }
      this.rewardHistory.set(key, rewards);
      
      // Update weighted score
      const currentScore = this.weightedScores.get(key) || 0.5;
      const newScore = currentScore + (this.learningRate * (reward - currentScore));
      this.weightedScores.set(key, newScore);
      
      this.logger.debug(`Updated model score for ${key} to ${newScore} (reward: ${reward})`);
    } catch (error) {
      this.logger.error(`Error updating model scores: ${ErrorUtils.formatError(error)}`);
    }
  }

  /**
   * Adjust exploration rate over time (decreases data is collected)
   */
  adjustExplorationRate(){
    // Decrease exploration rate get more data, but keep a minimum
    const totalDataPoints = Array.from(this.rewardHistory.values())
      .reduce((sum, rewards) => sum + rewards.length, 0);
    
    this.explorationRate = Math.max(0.05, 0.3 - (totalDataPoints / 10000) * 0.25);
    this.logger.debug(`Adjusted exploration rate to ${this.explorationRate}`);
  }
}

/**
 * Business Value Tracker Class
 * 
 * Tracks business impact metrics like cost savings and ROI
 */
class BusinessValueTracker {
  logger;
  metrics;
  costBaseline= new Map(); // Baseline costs per task type
  defaultCost= 0.03; // Default cost estimate if no baseline
  requestSuccessHistory= []; // Recent success/failure
  responseTimeHistory= []; // Recent response times
  costSavingsHistory= []; // Recent cost savings
  
  constructor(logger) {
    this.logger = logger;
    this.metrics = {
      totalCostSavings,
      successRate,
      averageResponseTime,
      uptime,
      failoverSuccessRate,
      serviceLevelAgreementCompliance: 1.0
    };
    
    // Initialize histories with empty arrays
    this.requestSuccessHistory = [];
    this.responseTimeHistory = [];
    this.costSavingsHistory = [];
  }

  /**
   * Track cost savings compared to baseline
   */
  trackCostSavings(taskType, model, provider, actualCost){
    try {
      // Get baseline cost for comparison
      const baselineKey = `${taskType}`;
      let baselineCost = this.costBaseline.get(baselineKey) || this.defaultCost;
      
      // Calculate cost difference (positive means savings)
      const costSavings = baselineCost - actualCost;
      
      // Update total cost savings
      this.metrics.totalCostSavings += costSavings;
      
      // Add to history
      this.costSavingsHistory.push(costSavings);
      if (this.costSavingsHistory.length > 100) {
        this.costSavingsHistory.shift();
      }
      
      // Update baseline with weighted average if we don't have one yet
      if (!this.costBaseline.has(baselineKey)) {
        this.costBaseline.set(baselineKey, actualCost);
      }
      
      return costSavings;
    } catch (error) {
      this.logger.error(`Error tracking cost savings: ${ErrorUtils.formatError(error)}`);
      return 0;
    }
  }

  /**
   * Calculate ROI based on cost savings and implementation cost
   */
  calculateROI(implementationCost){
    if (implementationCost  1000) {
      this.requestSuccessHistory.shift();
    }
    
    // Recalculate success rate
    const successCount = this.requestSuccessHistory.filter(s => s).length;
    this.metrics.successRate = this.requestSuccessHistory.length > 0 
      ? successCount / this.requestSuccessHistory.length 
      ;
  }

  /**
   * Track response time
   */
  trackResponseTime(responseTime){
    // Add to history
    this.responseTimeHistory.push(responseTime);
    
    // Keep only last 1000 responses
    if (this.responseTimeHistory.length > 1000) {
      this.responseTimeHistory.shift();
    }
    
    // Recalculate average response time
    this.metrics.averageResponseTime = this.responseTimeHistory.length > 0
      ? this.responseTimeHistory.reduce((sum, time) => sum + time, 0) / this.responseTimeHistory.length
      ;
  }

  /**
   * Update SLA compliance metric
   */
  updateSLACompliance(responseTime, slaThreshold){
    // SLA compliance is the percentage of requests that meet the threshold
    const meetsThreshold = responseTime = this.failureThreshold) {
      state.isOpen = true;
      this.logger.warn(`Circuit breaker opened for ${provider}:${model} after ${state.failureCount} failures`);
    } else if (state.recoveryAttemptTime !== null) {
      // Failed during recovery attempt
      state.recoveryAttemptTime = null;
      this.logger.warn(`Recovery attempt failed for ${provider}:${model}, circuit remains open`);
    }
  }

  /**
   * Record a success, potentially closing the circuit
   */
  recordSuccess(provider, model){
    const state = this.getState(provider, model);
    
    // Reset failure count
    state.failureCount = 0;
    
    // In half-open state, count consecutive successes
    if (state.isOpen) {
      state.consecutiveSuccesses++;
      
      // Check if we have enough successes to close the circuit
      if (state.consecutiveSuccesses >= this.successesToClose) {
        state.isOpen = false;
        state.recoveryAttemptTime = null;
        this.logger.info(`Circuit breaker closed for ${provider}:${model} after ${state.consecutiveSuccesses} consecutive successes`);
      }
    }
  }

  /**
   * Reset circuit breaker for a provider/model
   */
  reset(provider, model){
    const key = this.getKey(provider, model);
    this.states.delete(key);
    this.logger.info(`Circuit breaker reset for ${provider}:${model}`);
  }

  /**
   * Get status report for all circuit breakers
   */
  getStatus(){ [key: string]: { isOpen, failureCount, lastFailureTime: number } } {
    const status: { [key: string]: { isOpen, failureCount, lastFailureTime: number } } = {};
    
    for (const [key, state] of this.states.entries()) {
      status[key] = {
        isOpen,
        failureCount,
        lastFailureTime: state.lastFailureTime
      };
    }
    
    return status;
  }
}

/**
 * Adaptive Model Orchestrator
 * 
 * Enhanced model orchestration layer that adds ML-driven model selection,
 * automated recovery from failures, and business impact tracking.
 */
export class AdaptiveModelOrchestrator extends ModelOrchestrationLayer {
  performancePredictor;
  routingOptimizer;
  businessValueTracker;
  circuitBreakers;
  metricsCollector;
  cachedResults= new Map();
  cacheTTL= 5 * 60 * 1000; // 5 minutes cache
  
  constructor(
    logger, 
    metricsCollector,
    options?: {
      cacheTTL?,
      circuitBreakerOptions?: {
        failureThreshold?,
        resetTimeout?,
        successesToClose?: number
      }
    }
  ) {
    super(logger);
    
    this.metricsCollector = metricsCollector;
    this.performancePredictor = new PerformancePredictor(logger);
    this.routingOptimizer = new RoutingOptimizer(logger);
    this.businessValueTracker = new BusinessValueTracker(logger);
    this.circuitBreakers = new CircuitBreaker(logger, options?.circuitBreaker

