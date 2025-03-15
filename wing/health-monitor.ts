import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { BackupMetadata, RollbackStatus, SystemComponent, ComponentHealth } from './config';

/**
 * Health monitor system to check component health before and after rollbacks
 * Includes mechanisms for:
 * - Pre-rollback health assessment to establish baseline
 * - Post-rollback verification
 * - Recovery procedures for failed rollbacks
 * - Integration with system metrics and monitoring
 * - Health report generation and logging
 */
export class HealthMonitor extends EventEmitter {
  private components: Map<string, SystemComponent>;
  private healthStatus: Map<string, ComponentHealth>;
  private metricsHistory: Record<string, any>[];
  private lastRollbackId: string | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private recoveryAttemptCount: Map<string, number>;
  private readonly maxRecoveryAttempts = 3;
  private readonly logDir: string;
  private readonly metricsDir: string;
  private isMonitoring: boolean = false;

  /**
   * Creates a new health monitor instance
   * @param components List of system components to monitor
   * @param options Configuration options
   */
  constructor(
    components: SystemComponent[] = [],
    options: {
      logDir?: string;
      metricsDir?: string;
      healthCheckIntervalMs?: number;
    } = {}
  ) {
    super();
    this.components = new Map();
    this.healthStatus = new Map();
    this.metricsHistory = [];
    this.recoveryAttemptCount = new Map();
    this.logDir = options.logDir || path.join(process.cwd(), 'logs', 'health');
    this.metricsDir = options.metricsDir || path.join(process.cwd(), 'data', 'metrics');
    
    // Initialize components
    this.registerComponents(components);
    
    // Create necessary directories
    this.initializeDirectories();
  }

  /**
   * Initialize required directories for logs and metrics
   */
  private initializeDirectories(): void {
    try {
      fs.mkdirSync(this.logDir, { recursive: true });
      fs.mkdirSync(this.metricsDir, { recursive: true });
    } catch (error) {
      console.error(`Failed to create health monitor directories: ${error.message}`);
      throw error;
    }
  }

  /**
   * Register components to be monitored
   * @param components List of system components
   */
  public registerComponents(components: SystemComponent[]): void {
    for (const component of components) {
      this.components.set(component.id, component);
      this.healthStatus.set(component.id, {
        status: 'unknown',
        lastChecked: 0,
        metrics: {},
        errorCount: 0,
        details: 'Not yet checked'
      });
      this.recoveryAttemptCount.set(component.id, 0);
    }
  }

  /**
   * Start continuous health monitoring
   * @param intervalMs Interval between health checks in milliseconds
   */
  public startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkAllComponentsHealth();
        this.collectSystemMetrics();
        this.logHealthStatus();
      } catch (error) {
        console.error(`Error during health check cycle: ${error.message}`);
        this.logError('health-check-cycle', error);
      }
    }, intervalMs);

    this.emit('monitoring:started', {
      timestamp: Date.now(),
      interval: intervalMs,
      componentCount: this.components.size
    });
  }

  /**
   * Stop continuous health monitoring
   */
  public stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.isMonitoring = false;
      this.emit('monitoring:stopped', { timestamp: Date.now() });
    }
  }

  /**
   * Check health of all registered components
   */
  public async checkAllComponentsHealth(): Promise<Map<string, ComponentHealth>> {
    const checkPromises = Array.from(this.components.entries()).map(
      async ([id, component]) => {
        try {
          const health = await this.checkComponentHealth(id);
          return [id, health] as [string, ComponentHealth];
        } catch (error) {
          console.error(`Failed to check health for component ${id}: ${error.message}`);
          const currentHealth = this.healthStatus.get(id);
          if (currentHealth) {
            currentHealth.status = 'error';
            currentHealth.lastChecked = Date.now();
            currentHealth.details = `Health check failed: ${error.message}`;
            currentHealth.errorCount += 1;
            this.healthStatus.set(id, currentHealth);
          }
          return [id, this.healthStatus.get(id)] as [string, ComponentHealth];
        }
      }
    );

    const results = await Promise.all(checkPromises);
    return new Map(results);
  }

  /**
   * Check health of a specific component
   * @param componentId ID of the component to check
   */
  public async checkComponentHealth(componentId: string): Promise<ComponentHealth> {
    const component = this.components.get(componentId);
    if (!component) {
      throw new Error(`Component ${componentId} not registered with health monitor`);
    }

    const currentHealth = this.healthStatus.get(componentId) || {
      status: 'unknown',
      lastChecked: 0,
      metrics: {},
      errorCount: 0,
      details: ''
    };

    try {
      // Execute the component's health check
      const healthCheckResult = await component.healthCheck();
      
      // Update the component's health status
      const newHealth: ComponentHealth = {
        status: healthCheckResult.healthy ? 'healthy' : 'unhealthy',
        lastChecked: Date.now(),
        metrics: healthCheckResult.metrics || {},
        errorCount: healthCheckResult.healthy ? 0 : (currentHealth.errorCount + 1),
        details: healthCheckResult.details || ''
      };

      // Emit event if health status changed
      if (currentHealth.status !== newHealth.status) {
        this.emit('health:changed', {
          componentId,
          previousStatus: currentHealth.status,
          newStatus: newHealth.status,
          timestamp: newHealth.lastChecked,
          details: newHealth.details
        });
      }

      this.healthStatus.set(componentId, newHealth);
      return newHealth;
    } catch (error) {
      // Update health status on error
      const errorHealth: ComponentHealth = {
        status: 'error',
        lastChecked: Date.now(),
        metrics: currentHealth.metrics,
        errorCount: currentHealth.errorCount + 1,
        details: `Health check failed: ${error.message}`
      };

      this.healthStatus.set(componentId, errorHealth);
      this.logError(`health-check-${componentId}`, error);
      
      // Emit health error event
      this.emit('health:error', {
        componentId,
        timestamp: errorHealth.lastChecked,
        error: error.message,
        errorCount: errorHealth.errorCount
      });
      
      return errorHealth;
    }
  }

  /**
   * Collect and record system-wide metrics
   */
  private collectSystemMetrics(): void {
    try {
      // Basic system metrics
      const systemMetrics = {
        timestamp: Date.now(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptimeSeconds: process.uptime(),
        components: Object.fromEntries(
          Array.from(this.healthStatus.entries()).map(([id, health]) => [
            id,
            {
              status: health.status,
              errorCount: health.errorCount,
              metrics: health.metrics
            }
          ])
        )
      };

      // Add to metrics history (with circular buffer behavior)
      this.metricsHistory.push(systemMetrics);
      if (this.metricsHistory.length > 100) {
        this.metricsHistory.shift();
      }

      // Save metrics to file
      const metricsFilePath = path.join(
        this.metricsDir,
        `metrics-${new Date().toISOString().split('T')[0]}.json`
      );

      fs.writeFileSync(
        metricsFilePath,
        JSON.stringify(systemMetrics, null, 2)
      );
    } catch (error) {
      console.error(`Failed to collect system metrics: ${error.message}`);
      this.logError('collect-metrics', error);
    }
  }

  /**
   * Log the current health status of all components
   */
  private logHealthStatus(): void {
    try {
      const statusLog = {
        timestamp: Date.now(),
        overallStatus: this.getOverallSystemHealth(),
        components: Object.fromEntries(this.healthStatus.entries())
      };

      const logFilePath = path.join(
        this.logDir,
        `health-${new Date().toISOString().split('T')[0]}.log`
      );

      fs.appendFileSync(
        logFilePath,
        JSON.stringify(statusLog) + '\n'
      );
    } catch (error) {
      console.error(`Failed to log health status: ${error.message}`);
    }
  }

  /**
   * Log an error that occurred during health monitoring
   * @param context The context where the error occurred
   * @param error The error object
   */
  private logError(context: string, error: Error): void {
    try {
      const errorLog = {
        timestamp: Date.now(),
        context,
        message: error.message,
        stack: error.stack
      };

      const errorLogPath = path.join(
        this.logDir,
        `errors-${new Date().toISOString().split('T')[0]}.log`
      );

      fs.appendFileSync(
        errorLogPath,
        JSON.stringify(errorLog) + '\n'
      );
    } catch (logError) {
      console.error(`Failed to log error: ${logError.message}`);
    }
  }

  /**
   * Assess system health before rollback to establish baseline
   * @returns Promise resolving to pre-rollback health assessment
   */
  public async assessHealthBeforeRollback(): Promise<Record<string, ComponentHealth>> {
    const preRollbackHealth = await this.checkAllComponentsHealth();
    
    const assessment: Record<string, ComponentHealth> = {};
    for (const [id, health] of preRollbackHealth.entries()) {
      assessment[id] = { ...health };
    }

    // Log the pre-rollback health assessment
    const assessmentPath = path.join(
      this.logDir,
      `pre-rollback-${Date.now()}.json`
    );

    fs.writeFileSync(
      assessmentPath,
      JSON.stringify({
        timestamp: Date.now(),
        assessment,
        overallHealth: this.getOverallSystemHealth()
      }, null, 2)
    );

    return assessment;
  }

  /**
   * Evaluate system health after rollback and compare with pre-rollback state
   * @param rollbackId ID of the rollback operation
   * @param preRollbackHealth Health status before rollback
   * @returns Promise resolving to post-rollback assessment result
   */
  public async assessHealthAfterRollback(
    rollbackId: string,
    preRollbackHealth: Record<string, ComponentHealth>
  ): Promise<{
    successful: boolean;
    degradedComponents: string[];
    assessment: Record<string, any>;
  }> {
    this.lastRollbackId = rollbackId;
    
    // Wait briefly for system to stabilize after rollback
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check current health of all components
    await this.checkAllComponentsHealth();
    
    const degradedComponents: string[] = [];
    const assessment: Record<string, any> = {};
    
    // Compare current health with pre-rollback health
    for (const [id, component] of this.components.entries()) {
      const currentHealth = this.healthStatus.get(id);
      const previousHealth = preRollbackHealth[id];
      
      if (!currentHealth) {
        continue;
      }
      
      const comparison = {
        componentId: id,
        name: component.name,
        previousStatus: previousHealth?.status || 'unknown',
        currentStatus: currentHealth.status,
        healthy: currentHealth.status === 'healthy',
        degraded: previousHealth?.status === 'healthy' && currentHealth.status !== 'healthy',
        metrics: currentHealth.metrics,
        details: currentHealth.details
      };
      
      assessment[id] = comparison;
      
      if (comparison.degraded) {
        degradedComponents.push(id);
      }
    }
    
    // Log the assessment
    const assessmentPath = path.join(
      this.logDir,
      `post-rollback-${rollbackId}-${Date.now()}.json`
    );
    
    fs.writeFileSync(
      assessmentPath,
      JSON.stringify({
        rollbackId,
        timestamp: Date.now(),
        successful: degradedComponents.length === 0,
        degradedComponents,
        assessment,
        overallHealth: this.getOverallSystemHealth()
      }, null, 2)
    );
    
    // Emit assessment event
    this.emit('rollback:assessed', {
      rollbackId,
      timestamp: Date.now(),
      successful: degradedComponents.length === 0,
      degradedComponents,
      overallHealth: this.getOverallSystemHealth()
    });
    
    return {
      successful: degradedComponents.length === 0,
      degradedComponents,
      assessment
    };
  }

  /**
   * Get the overall health status of the system
   * @returns Overall system health assessment
   */
  public getOverallSystemHealth(): 'healthy' | 'degraded' | 'critical' | 'unknown' {
    if (this.healthStatus.size === 0) {
      return 'unknown';
    }
    
    let healthyCount = 0;
    let criticalCount = 0;
    
    for (const health of this.healthStatus.values()) {
      if (health.status === 'healthy') {
        healthyCount++;
      } else if (health.status === 'error' || health.errorCount > 2) {
        criticalCount++;
      }
    }
    
    const totalComponents = this.healthStatus.size;
    
    if (healthyCount === totalComponents) {
      return 'healthy';
    } else if (criticalCount > 0) {
      return 'critical';
    } else {
      return 'degraded';
    }
  }

  /**
   * Perform recovery procedures for failed rollbacks
   * @param rollbackId ID of the failed rollback
   * @param degradedComponents List of components that are degraded after rollback
   * @returns Promise resolving to recovery result
   */
  public async performRecoveryProcedures(
    rollbackId: string,
    degradedComponents: string[]
  ): Promise<{
    successful: boolean;
    recoveredComponents: string[];
    failedComponents

