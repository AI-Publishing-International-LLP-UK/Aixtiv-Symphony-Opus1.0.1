import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

// Health status types
export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  CRITICAL = 'CRITICAL',
  UNKNOWN = 'UNKNOWN'
}

// Component types for health checking
export enum ComponentType {
  AGENT = 'AGENT',
  VISION_LAKE = 'VISION_LAKE',
  AUTHENTICATION = 'AUTHENTICATION',
  DATABASE = 'DATABASE',
  INTEGRATION = 'INTEGRATION',
  API = 'API',
  FILE_SYSTEM = 'FILE_SYSTEM',
  CACHE = 'CACHE',
  MESSAGING = 'MESSAGING',
  MONITORING = 'MONITORING'
}

// Health check result interface
export interface HealthCheckResult {
  component: ComponentType;
  status: HealthStatus;
  details: string;
  timestamp: number;
  metrics?: Record<string, number>;
  latency?: number;
}

// System health report interface
export interface SystemHealthReport {
  timestamp: number;
  overallStatus: HealthStatus;
  components: HealthCheckResult[];
  systemMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
  };
  recommendations?: string[];
}

// Rollback health context
export interface RollbackHealthContext {
  rollbackId: string;
  initiatedAt: number;
  completedAt?: number;
  targetBackupId: string;
  components: string[];
  preRollbackHealth?: SystemHealthReport;
  postRollbackHealth?: SystemHealthReport;
}

/**
 * Health Monitor for WING system
 * 
 * Monitors system health before and after rollbacks
 * Verifies component functionality
 * Provides health reports
 * Detects failed rollbacks and trigger recovery actions
 * Links with existing health monitoring systems
 */
export class HealthMonitor extends EventEmitter {
  private static instance: HealthMonitor;
  private healthChecks: Map<ComponentType, () => Promise<HealthCheckResult>>;
  private lastHealthReport?: SystemHealthReport;
  private monitoringInterval?: NodeJS.Timeout;
  private rollbackCheckInterval?: NodeJS.Timeout;
  private rollbackInProgress: boolean = false;
  private rollbackContext?: RollbackHealthContext;
  private healthLogPath: string;
  private recoveryHandlers: Map<ComponentType, (result: HealthCheckResult) => Promise<boolean>>;
  private readonly monitoringFrequency: number = 60000; // 1 

