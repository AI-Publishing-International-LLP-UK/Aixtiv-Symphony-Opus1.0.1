import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

// Import rollback components
import { BackupManager, BackupMetadata, BackupComponent, RestoreResult } from './backup-manager';
import { VisionLakeBackup } from './vision-lake-backup';
import { AuthBackup } from './auth-backup';
import { AgentBackup } from './agent-backup';
import { SquadronBackup } from './squadron-backup';
import { HealthMonitor, HealthStatus, SystemComponent } from './health-monitor';
import { getRollbackConfig, RollbackConfig, RollbackMetadata } from './config';

// Re-export all rollback components
export * from './backup-manager';
export * from './vision-lake-backup';
export * from './auth-backup';
export * from './agent-backup';
export * from './squadron-backup';
export * from './health-monitor';
export * from './config';
/**
 * Rollback status enum
 */
export enum RollbackStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RECOVERY_IN_PROGRESS = 'recovery_in_progress',
  RECOVERY_FAILED = 'recovery_failed',
  CANCELLED = 'cancelled'
}

/**
 * Authentication session interface
 */
export interface AuthSession {
  id: string;
  userId: string;
  username: string;
  createdAt: number;
  expiresAt: number;
  roles: string[];
  permissions: string[];
  ip: string;
  userAgent: string;
  isActive: boolean;
  lastAccessedAt: number;
}

/**
 * Authentication token interface
 */
export interface AuthToken {
  token: string;
  userId: string;
  expiresAt: number;
  issuedAt: number;
  scope: string[];
}

/**
 * Admin credentials interface
 */
interface AdminCredentials {
  username: string;
  passwordHash: string;
  salt: string;
  lastChanged: number;
  permissions: string[];
}
/**
 * Authentication result interface
 */
interface AuthResult {
  success: boolean;
  message?: string;
  token?: string;
}

/**
 * Main Rollback System class
 * Central manager for the emergency rollback system
 */
export class RollbackSystem extends EventEmitter {
  private config: RollbackConfig;
  private backupManager: BackupManager;
  private visionLakeBackup: VisionLakeBackup;
  private authBackup: AuthBackup;
  private agentBackup: AgentBackup;
  private squadronBackup: SquadronBackup;
  private healthMonitor: HealthMonitor;
  private adminCredentials: Map<string, AdminCredentials> = new Map();
  private rollbackHistory: RollbackMetadata[] = [];
  private currentRollback: RollbackMetadata | null = null;
  private activeTokens: Map<string, { username: string, expires: number }> = new Map();
  private isInitialized = false;
  private readonly logDir: string;
  /**
   * Constructor for RollbackSystem
   * @param config Rollback system configuration
   */
  constructor(config?: Partial<RollbackConfig>) {
    super();
    
    // Set configuration using the config.ts helper
    this.config = getRollbackConfig(config);
    
    // Set up log directory
    this.logDir = path.join(this.config.backupDirectory, 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Initialize component instances
    this.backupManager = new BackupManager({
      backupDir: this.config.backupDirectory,
      retentionDays: this.config.retentionDays
    });
    
    this.visionLakeBackup = new VisionLakeBackup({
      backupPath: path.join(this.config.backupDirectory, 'vision-lake'),
      visionLakeApiUrl: process.env.VISION_LAKE_API_URL || 'http://localhost:3000/api/vision-lake',
      apiKey: process.env.VISION_LAKE_API_KEY || 'default-api-key'
    });
    
    this.authBackup = new AuthBackup(
      path.join(this.config.backupDirectory, 'auth'),
      process.env.SESSION_SECRET || 'wing-rollback-default-secret'
    );
    
    this.agentBackup = new AgentBackup(
      path.join(this.config.backupDirectory, 'agents'),
      process.env.AGENT_API_URL || 'http://localhost:3001/api/agents',
      process.env.AGENT_API_KEY || 'default-agent-api-key'
    );
    
    this.squadronBackup = new SquadronBackup({
      backupPath: path.join(this.config.backupDirectory, 'squadrons'),
      squadronApiUrl: process.env.SQUADRON_API_URL,
      apiKey: process.env.SQUADRON_API_KEY
    });
    
    this.healthMonitor = new HealthMonitor([], {
      logDir: this.logDir,
      healthCheckIntervalMs: 60000 // 1 minute
    });
    
    // Load rollback history
    this.loadRollbackHistory();
    
    // Set up admin credentials
    this.setupAdminCredentials();
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    const directories = [
      this.config.backupDirectory,
      this.config.logDirectory,
      path.join(this.config.backupDirectory, 'vision-lake'),
      path.join(this.config.backupDirectory, 'authentication'),
      path.join(this.config.backupDirectory, 'agents'),
      path.join(this.config.backupDirectory, 'metadata')
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Initialize the rollback system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.log('info', 'Initializing rollback system');
      
      // Load admin credentials
      await this.loadAdminCredentials();
      
      // Load existing backups and rollbacks
      await this.loadBackups();
      await this.loadRollbacks();
      
      // Setup scheduled tasks
      this.setupScheduledBackups();
      this.setupHealthChecks();
      
      this.isInitialized = true;
      this.log('info', 'Rollback system initialized successfully');
      this.emit('initialized');
    } catch (error) {
      this.log('error', `Failed to initialize rollback system: ${error.message}`, { error });
      throw new Error(`Rollback system initialization failed: ${error.message}`);
    }
  }

  /**
   * Load admin credentials
   */
  private async loadAdminCredentials(): Promise<void> {
    try {
      if (fs.existsSync(this.config.adminCredentialsFile)) {
        const data = fs.readFileSync(this.config.adminCredentialsFile, 'utf8');
        const credentials = JSON.parse(data);
        
        for (const [username, passwordHash] of Object.entries(credentials)) {
          this.adminCredentials.set(username, passwordHash as string);
        }
        
        this.log('info', `Loaded ${this.adminCredentials.size} admin credentials`);
      } else {
        this.log('warn', 'Admin credentials file not found, using environment variables');
        
        // Use environment variables as fallback
        const adminUsername = process.env.ROLLBACK_ADMIN_USERNAME;
        const adminPasswordHash = process.env.ROLLBACK_ADMIN_PASSWORD_HASH;
        
        if (adminUsername && adminPasswordHash) {
          this.adminCredentials.set(adminUsername, adminPasswordHash);
          this.log('info', 'Loaded admin credentials from environment variables');
        } else {
          this.log('warn', 'No admin credentials available, rollbacks will be unavailable');
        }
      }
    } catch (error) {
      this.log('error', `Failed to load admin credentials: ${error.message}`, { error });
      throw new Error(`Failed to load admin credentials: ${error.message}`);
    }
  }

  /**
   * Load existing backups
   */
  private async loadBackups(): Promise<void> {
    try {
      const metadataDir = path.join(this.config.backupDirectory, 'metadata');
      if (!fs.existsSync(metadataDir)) {
        return;
      }
      
      const files = fs.readdirSync(metadataDir);
      const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.json'));
      
      for (const file of backupFiles) {
        try {
          const data = fs.readFileSync(path.join(metadataDir, file), 'utf8');
          const backup = JSON.parse(data) as BackupMetadata;
          this.backups.set(backup.id, backup);
        } catch (e) {
          this.log('warn', `Failed to load backup metadata file ${file}: ${e.message}`);
        }
      }
      
      this.log('info', `Loaded ${this.backups.size} existing backups`);
    } catch (error) {
      this.log('error', `Failed to load backups: ${error.message}`, { error });
    }
  }

  /**
   * Load existing rollbacks
   */
  private async loadRollbacks(): Promise<void> {
    try {
      const metadataDir = path.join(this.config.backupDirectory, 'metadata');
      if (!fs.existsSync(metadataDir)) {
        return;
      }
      
      const files = fs.readdirSync(metadataDir);
      const rollbackFiles = files.filter(f => f.startsWith('rollback-') && f.endsWith('.json'));
      
      for (const file of rollbackFiles) {
        try {
          const data = fs.readFileSync(path.join(metadataDir, file), 'utf8');
          const rollback = JSON.parse(data) as RollbackMetadata;
          this.rollbacks.set(rollback.id, rollback);
        } catch (e) {
          this.log('warn', `Failed to load rollback metadata file ${file}: ${e.message}`);
        }
      }
      
      this.log('info', `Loaded ${this.rollbacks.size} existing rollbacks`);
    } catch (error) {
      this.log('error', `Failed to load rollbacks: ${error.message}`, { error });
    }
  }

  /**
   * Setup scheduled backups
   */
  private setupScheduledBackups(): void {
    if (this.scheduledBackupInterval) {
      clearInterval(this.scheduledBackupInterval);
    }
    
    this.log('info', `Setting up scheduled backups every ${this.config.backupFrequencyMins} minutes`);
    
    this.scheduledBackupInterval = setInterval(async () => {
      try {
        this.log('info', 'Starting scheduled backup');
        await this.createBackup('system', 'Scheduled backup');
      } catch (error) {
        this.log('error', `Scheduled backup failed: ${error.message}`, { error });
      }
    }, this.config.backupFrequencyMins * 60 * 1000);
  }

  /**
   * Setup health checks
   */
  private setupHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.log('info', `Setting up health checks every ${this.config.healthCheckIntervalSecs} seconds`);
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkSystemHealth();
      } catch (error) {
        this.log('error', `Health check failed: ${error.message}`, { error });
      }
    }, this.config.healthCheckIntervalSecs * 1000);
  }

  /**
   * Create a new backup
   * @param initiatedBy User who initiated the backup
   * @param notes Additional notes about the backup
   */
  public async createBackup(initiatedBy: string, notes: string = ''): Promise<BackupMetadata> {
    const backupId = `backup-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    this.log('info', `Creating backup ${backupId}`);
    
    const backup: BackupMetadata = {
      id: backupId,
      timestamp: Date.now(),
      components: this.config.componentIds,
      size: 0,
      checksums: {},
      createdBy: initiatedBy,
      notes,
      status: 'incomplete'
    };
    
    // Save initial metadata
    this.saveBackupMetadata(backup);
    
    try {
      const componentResults: ComponentBackupResult[] = [];
      
      // Back up each component
      for (const componentId of this.config.componentIds) {
        try {
          const result = await this.backupComponent(componentId, backup.id);
          componentResults.push(result);
          
          if (result.success) {
            backup.checksums[componentId] = result.metadata?.checksum || '';
            backup.size += result.size || 0;
          } else {
            this.log('error', `Failed to back up component ${componentId}: ${result.error}`);
          }
        } catch (error) {
          this.log('error', `Error backing up component ${componentId}: ${error.message}`, { error });
          componentResults.push({
            componentId,
            success: false,
            timestamp: Date.now(),
            error: error.message
          });
        }
      }
      
      // Update backup status
      const allSuccessful = componentResults.every(r => r.success);
      backup.status = allSuccessful ? 'complete' : 'incomplete';
      backup.completedAt = Date.now();
      
      // Save final metadata
      this.saveBack

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { BackupManager } from './backup-manager';
import { VisionLakeBackup } from './vision-lake-backup';
import { AuthBackup } from './auth-backup';
import { HealthMonitor } from './health-monitor';
import { getRollbackConfig, RollbackConfig, RollbackMetadata } from './config';

// Re-export all rollback components
export * from './backup-manager';
export * from './vision-lake-backup';
export * from './auth-backup';
export * from './health-monitor';
export * from './config';

/**
 * Rollback status enum
 */
export enum RollbackStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RECOVERY_IN_PROGRESS = 'recovery_in_progress',
  RECOVERY_FAILED = 'recovery_failed',
  CANCELLED = 'cancelled'
}

interface AdminCredentials {
  username: string;
  passwordHash: string;
  salt: string;
  lastChanged: number;
  permissions: string[];
}

/**
 * Main Rollback System class integrating all components
 */
export class RollbackSystem extends EventEmitter {
  private config: RollbackConfig;
  private backupManager: BackupManager;
  private visionLakeBackup: VisionLakeBackup;
  private authBackup: AuthBackup;
  private healthMonitor: HealthMonitor;
  private rollbackHistory: RollbackMetadata[] = [];
  private currentRollback: RollbackMetadata | null = null;
  private isInitialized: boolean = false;
  private readonly logDir: string;
  private adminCredentials: Map<string, AdminCredentials> = new Map();
  private tokenCache: Map<string, { username: string, expires: number }> = new Map();

  /**
   * Create a new RollbackSystem instance
   * @param config Rollback system configuration
   */
  constructor(config?: Partial<RollbackConfig>) {
    super();
    this.config = getRollbackConfig(config);
    this.logDir = path.join(this.config.backupDirectory, 'logs');
    
    // Ensure logs directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    // Initialize components
    this.backupManager = new BackupManager({
      backupDir: this.config.backupDirectory,
      retentionDays: this.config.retentionDays
    });
    
    this.visionLakeBackup = new VisionLakeBackup({
      backupPath: path.join(this.config.backupDirectory, 'vision-lake'),
      visionLakeApiUrl: process.env.VISION_LAKE_API_URL || 'http://localhost:3000/api/vision-lake',
      apiKey: process.env.VISION_LAKE_API_KEY || 'default-api-key'
    });
    
    this.authBackup = new AuthBackup(
      path.join(this.config.backupDirectory, 'auth'),
      process.env.SESSION_SECRET || 'wing-rollback-default-secret'
    );
    
    this.healthMonitor = new HealthMonitor([], {
      logDir: this.logDir,
      healthCheckIntervalMs: 60000 // 1 minute
    });
    
    // Load rollback history
    this.loadRollbackHistory();
    
    // Setup admin credentials
    this.setupAdminCredentials();
  }

  /**
   * Initialize the rollback system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      this.log('info', 'Initializing rollback system...');
      
      // Register backup components
      this.backupManager.registerComponent({
        name: 'vision-lake',
        backup: async () => {
          const metadata = await this.visionLakeBackup.createBackup({
            compress: true,
            tags: ['automated']
          });
          return {
            data: { backupId: metadata.id },
            sizeBytes: metadata.size
          };
        },
        restore: async (data) => {
          return await this.visionLakeBackup.restore({
            backupId: data.backupId,
            validateAfterRestore: true
          });
        },
        verify: async (data) => {
          return await this.visionLakeBackup.verifyBackup(data.backupId);
        },
        priority: 10
      });
      
      // Initialize health monitoring
      await this.setupHealthMonitoring();
      
      // Start scheduled backups
      await this.backupManager.initialize();
      
      this.isInitialized = true;
      this.log('info', 'Rollback system initialized successfully');
      this.emit('initialized');
    } catch (error) {
      this.log('error', `Failed to initialize rollback system: ${error.message}`);
      throw new Error(`Rollback system initialization failed: ${error.message}`);
    }
  }

  /**
   * Set up health monitoring for system components
   */
  private async setupHealthMonitoring(): Promise<void> {
    // Register components for health monitoring
    const componentList = [
      {
        id: 'vision-lake',
        name: 'Vision Lake',
        healthCheck: async () => {
          try {
            // Implement real health check here
            const isHealthy = await this.visionLakeBackup.checkConnectivity();
            return {
              healthy: isHealthy,
              details: isHealthy ? 'Vision Lake is operational' : 'Failed to connect to Vision Lake',
              metrics: {
                responseTimeMs: 20,
                memoryUsageMB: 120
              }
            };
          } catch (error) {
            return {
              healthy: false,
              details: `Vision Lake health check failed: ${error.message}`,
              metrics: {}
            };
          }
        },
        recoverFunction: async () => {
          // Implement recovery procedure here
          try {
            await this.visionLakeBackup.resetConnection();
            return {
              success: true,
              details: 'Vision Lake connection reset successfully'
            };
          } catch (error) {
            return {
              success: false,
              error: `Vision Lake recovery failed: ${error.message}`,
              details: {}
            };
          }
        }
      },
      {
        id: 'auth-service',
        name: 'Authentication Service',
        healthCheck: async () => {
          // Implement real health check here
          const isHealthy = await this.authBackup.validateConnection();
          return {
            healthy: isHealthy,
            details: isHealthy ? 'Authentication service is operational' : 'Auth service is not responding',
            metrics: {
              activeSessionCount: this.authBackup.getActiveSessionCount(),
              authLatencyMs: 15
            }
          };
        },
        recoverFunction: async () => {
          try {
            await this.authBackup.resetAuthCache();
            return {
              success: true,
              details: 'Auth service cache refreshed'
            };
          } catch (error) {
            return {
              success: false,
              error: `Auth service recovery failed: ${error.message}`,
              details: {}
            };
          }
        }
      }
    ];
    
    this.healthMonitor.registerComponents(componentList);
    this.healthMonitor.startMonitoring();
    
    // Listen for health status changes
    this.healthMonitor.on('health:changed', (event) => {
      if (event.newStatus === 'critical' || event.newStatus === 'error') {
        this.log('warn', `Component ${event.componentId} is in ${event.newStatus} state: ${event.details}`);
      }
    });
  }

  /**
   * Execute an emergency 24-hour rollback
   * @param adminUsername Admin username for authentication
   * @param adminPassword Admin password for authentication
   * @param reason Reason for emergency rollback
   * @returns Promise resolving to rollback result
   */
  public async emergencyRollback(
    adminUsername: string,
    adminPassword: string,
    reason: string
  ): Promise<{
    success: boolean;
    rollbackId: string;
    message?: string;
    error?: string;
  }> {
    this.log('info', `Emergency rollback requested by ${adminUsername}: ${reason}`);
    
    try {
      // Authenticate admin user
      if (!this.authenticateAdmin(adminUsername, adminPassword)) {
        throw new Error('Invalid admin credentials for emergency rollback');
      }
      
      // Find backup from approximately 24 hours ago
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      const backups = await this.backupManager.listBackups();
      
      let targetBackup: any = null;
      let nearestTimeDiff = Infinity;
      
      for (const backup of backups) {
        const timeDiff = Math.abs(backup.timestamp - twentyFourHoursAgo);
        if (timeDiff < nearestTimeDiff) {
          nearestTimeDiff = timeDiff;
          targetBackup = backup;
        }
      }
      
      if (!targetBackup) {
        throw new Error('No suitable backup found for 24-hour rollback');
      }
      
      // Generate rollback ID
      const rollbackId = `emergency-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      
      // Create rollback metadata
      const rollbackMeta: RollbackMetadata = {
        id: rollbackId,
        timestamp: Date.now(),
        initiatedBy: adminUsername,
        reason: reason,
        targetBackupId: targetBackup.id,
        backupTimestamp: targetBackup.timestamp,
        affectedComponents: ['vision-lake', 'auth-service'],
        status: RollbackStatus.PENDING,
        userFacing: true
      };
      
      // Execute rollback
      const result = await this.performRollback(rollbackMeta);
      
      if (result.success) {
        this.log('info', `Emergency rollback ${rollbackId} completed successfully`);
        return {
          success: true,
          rollbackId,
          message: `Successfully rolled back to backup from ${new Date(targetBackup.timestamp).toLocaleString()}`
        };
      } else {
        this.log('error', `Emergency rollback ${rollbackId} failed: ${result.error}`);
        return {
          success: false,
          rollbackId,
          error: result.error
        };
      }
    } catch (error) {
      this.log('error', `Emergency rollback failed: ${error.message}`);
      return {
        success: false,
        rollbackId: `failed-${Date.now()}`,
        error: error.message
      };
    }
  }

  /**
   * Perform the actual rollback operation
   * @param metadata Rollback metadata
   * @returns Rollback result
   */
  private async performRollback(metadata: RollbackMetadata): Promise<{
    success: boolean;
    error?: string;
    details?: Record<string, any>;
  }> {
    // Check if there's already a rollback in progress
    if (this.currentRollback) {
      return {
        success: false,
        error: `Cannot start rollback: another rollback operation is already in progress (${this.currentRollback.id})`
      };
    }

    this.currentRollback = metadata;
    
    try {
      // Update metadata status
      metadata.status = RollbackStatus.IN_PROGRESS;
      this.saveRollbackHistory();
      
      // Run pre-rollback health check
      const preRollbackHealth = await this.healthMonitor.getSystemHealth();
      this.log('info', `Pre-rollback health check: ${preRollbackHealth.overallHealth}`);
      
      // Notify system that rollback is starting
      this.emit('rollback:starting', {
        id: metadata.id,
        timestamp: Date.now(),
        components: metadata.affectedComponents
      });
      
      // Start rollback process for each affected component
      const componentResults: Record<string, any> = {};
      
      for (const component of metadata.affectedComponents) {
        try {
          this.log('info', `Starting rollback for component: ${component}`);
          
          if (component === 'vision-lake') {
            const result = await this.visionLakeBackup.restore({
              backupId: metadata.targetBackupId,
              validateAfterRestore: true
            });
            
            componentResults[component] = {
              success: result.success,
              details: result.details || {}
            };
            
            if (!result.success) {
              throw new Error(`Vision Lake restore failed: ${result.error}`);
            }
          } else if (component === 'auth-service') {
            const result = await this.authBackup.restore(metadata.targetBackupId);
            
            componentResults[component] = {
              success: result.success,
              details: result.details || {}
            };
            
            if (!result.success) {
              throw new Error(`Auth service restore failed: ${result.error}`);
            }
          }
          
          this.log('info', `Rollback for component ${component} completed successfully`);
        } catch (error) {
          this.log('error', `Rollback for component ${component} failed: ${error.message}`);
          componentResults[component] = {
            success: false,
            error: error.message
          };
          
          // Update metadata
          metadata.status = RollbackStatus.FAILED;
          metadata.error = `Component ${component} rollback failed: ${error.message}`;
          this.saveRollbackHistory();
          
          return {
            success: false,
            error: `Rollback failed during ${component} restoration: ${error.message}`,
            details: componentResults
          };
        }
      }
      
      // Run post-rollback health check
      const postRollbackHealth = await this.healthMonitor.getSystemHealth();
      this.log('info', `Post-rollback health check: ${postRollbackHealth.overallHealth}`);
      
      // Check if system is healthy after rollback
      if (postRollbackHealth.overallHealth === 'critical') {
        // System is in critical state after rollback
        metadata.status = RollbackStatus.FAILED;
        metadata.error = 'System is in critical state after rollback';
        this.saveRollbackHistory();
        
        // Start recovery process
        this.log('warn', 'Starting recovery process due to critical system state after rollback');
        const degradedComponents = Object.keys(postRollbackHealth.components)
          .filter(id => postRollbackHealth.components[id].status === 'error' || 
                        postRollbackHealth.components[id].status === 'critical');
        
        const recoveryResult = await this.healthMonitor.performRecoveryProcedures(
          metadata.id,
          degradedComponents
        );
        
        return {
          success: false,
          error: 'System is in critical state after rollback. Recovery procedures were executed.',
          details: {
            components: componentResults,
            health

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

// Import rollback components
import { BackupManager, BackupMetadata, BackupComponent, RestoreResult } from './backup-manager';
import { VisionLakeBackup } from './vision-lake-backup';
import { AuthBackup } from './auth-backup';
import { HealthMonitor, HealthStatus, SystemComponent } from './health-monitor';

/**
 * Rollback configuration interface
 */
export interface RollbackConfig {
  backupDirectory: string;
  retentionDays: number;
  adminUserList: string[];
  encryptionKey: string;
  autoBackupEnabled: boolean;
  backupIntervalHours: number;
  healthCheckIntervalMinutes: number;
  maxConcurrentRestores: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Rollback status enum
 */
export enum RollbackStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RECOVERY_IN_PROGRESS = 'recovery_in_progress',
  RECOVERY_FAILED = 'recovery_failed',
  CANCELLED = 'cancelled'
}

/**
 * Rollback metadata interface
 */
export interface RollbackMetadata {
  id: string;
  timestamp: number;
  targetTimestamp: number;
  initiatedBy: string;
  reason: string;
  status: RollbackStatus;
  components: string[];
  backupId: string;
  completedAt?: number;
  error?: string;
  recoveryAttempted?: boolean;
  recoverySuccessful?: boolean;
  healthBeforeRollback?: Record<string, HealthStatus>;
  healthAfterRollback?: Record<string, HealthStatus>;
}

/**
 * Admin credentials interface
 */
interface AdminCredentials {
  username: string;
  passwordHash: string;
  salt: string;
}

/**
 * Authentication result interface
 */
interface AuthResult {
  success: boolean;
  message?: string;
  token?: string;
}

/**
 * Main Rollback System class
 * Central manager for the emergency rollback system
 */
export class RollbackSystem extends EventEmitter {
  private config: RollbackConfig;
  private backupManager: BackupManager;
  private visionLakeBackup: VisionLakeBackup;
  private authBackup: AuthBackup;
  private healthMonitor: HealthMonitor;
  private adminCredentials: Map<string, AdminCredentials> = new Map();
  private rollbackHistory: RollbackMetadata[] = [];
  private currentRollback: RollbackMetadata | null = null;
  private activeTokens: Map<string, { username: string, expires: number }> = new Map();
  private isInitialized = false;
  private readonly logDir: string;

  /**
   * Constructor for RollbackSystem
   * @param config Rollback system configuration
   */
  constructor(config?: Partial<RollbackConfig>) {
    super();
    
    // Set default configuration and merge with provided config
    this.config = {
      backupDirectory: process.env.BACKUP_DIR || path.join(process.cwd(), 'backups'),
      retentionDays: 30,
      adminUserList: process.env.ADMIN_USERS ? process.env.ADMIN_USERS.split(',') : ['admin'],
      encryptionKey: process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
      autoBackupEnabled: true,
      backupIntervalHours: 6,
      healthCheckIntervalMinutes: 15,
      maxConcurrentRestores: 1,
      logLevel: 'info',
      ...config
    };

    // Set up log directory
    this.logDir = path.join(this.config.backupDirectory, 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Initialize component instances
    this.backupManager = new BackupManager({
      backupDir: this.config.backupDirectory,
      retentionDays: this.config.retentionDays,
      encryptionKey: this.config.encryptionKey,
      backupInterval: this.config.backupIntervalHours * 60 * 60 * 1000
    });

    this.visionLakeBackup = new VisionLakeBackup({
      backupPath: path.join(this.config.backupDirectory, 'vision-lake'),
      apiEndpoint: process.env.VISION_LAKE_API_ENDPOINT || 'http://localhost:3000/api',
      apiKey: process.env.VISION_LAKE_API_KEY || '',
      compressionEnabled: true
    });

    this.authBackup = new AuthBackup({
      backupPath: path.join(this.config.backupDirectory, 'auth'),
      encryptionKey: this.config.encryptionKey,
      sessionSecret: process.env.SESSION_SECRET || 'default-session-secret'
    });

    this.healthMonitor = new HealthMonitor([], {
      logDir: this.logDir,
      checkIntervalMs: this.config.healthCheckIntervalMinutes * 60 * 1000
    });

    // Load rollback history if available
    this.loadRollbackHistory();
    this.setupAdminCredentials();
  }

  /**
   * Initialize the rollback system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.log('info', 'Initializing rollback system...');

      // Initialize and register backup components
      await this.registerBackupComponents();
      
      // Initialize health monitoring
      await this.setupHealthMonitoring();

      // Start scheduled backups if enabled
      if (this.config.autoBackupEnabled) {
        await this.backupManager.startScheduledBackups();
        this.log('info', `Scheduled backups enabled, running every ${this.config.backupIntervalHours} hours`);
      }

      this.isInitialized = true;
      this.log('info', 'Rollback system initialized successfully');
      this.emit('system:initialized');
    } catch (error) {
      this.log('error', `Failed to initialize rollback system: ${error.message}`);
      throw new Error(`Rollback system initialization failed: ${error.message}`);
    }
  }

  /**
  /**
   * Register backup components with the backup manager
   */
  private async registerBackupComponents(): Promise<void> {
    // Register Vision Lake component
    this.backupManager.registerComponent({
      id: 'vision-lake',
      name: 'Vision Lake',
      description: 'Backup and restore Vision Lake data',
      backup: async () => {
        return await this.visionLakeBackup.createBackup({
          includeMetadata: true,
          compress: true,
          tags: ['scheduled']
        });
      },
      restore: async (backupId: string) => {
        return await this.visionLakeBackup.restore(backupId);
      },
      verify: async (backupId: string) => {
        return await this.visionLakeBackup.verifyBackup(backupId);
      },
      priority: 10
    });

    // Register Authentication component
    this.backupManager.registerComponent({
      id: 'auth',
      name: 'Authentication System',
      description: 'Backup and restore authentication sessions and data',
      backup: async () => {
        return await this.authBackup.createBackup();
      },
      restore: async (backupId: string) => {
        return await this.authBackup.restore(backupId);
      },
      verify: async (backupId: string) => {
        return await this.authBackup.verifyBackup(backupId);
      },
      priority: 20
    });

    // Register Agent Backup component
    this.backupManager.registerComponent({
      id: 'agents',
      name: 'Pilot Agents',
      description: 'Backup and restore agent states and configurations',
      backup: async () => {
        return await this.agentBackup.createBackup({
          includeMetadata: true,
          compress: true,
          tags: ['scheduled']
        });
      },
      restore: async (backupId: string) => {
        return await this.agentBackup.restore(backupId);
      },
      verify: async (backupId: string) => {
        return await this.agentBackup.verifyBackup(backupId);
      },
      priority: 30
    });

    // Register Squadron Backup component
    this.backupManager.registerComponent({
      id: 'squadrons',
      name: 'Squadrons',
      description: 'Backup and restore squadron structures and assignments',
      backup: async () => {
        return await this.squadronBackup.createBackup({
          includeMetadata: true,
          compress: true,
          tags: ['scheduled']
        });
      },
      restore: async (backupId: string) => {
        return await this.squadronBackup.restore(backupId);
      },
      verify: async (backupId: string) => {
        return await this.squadronBackup.verifyBackup(backupId);
      },
      priority: 40
    });
  }
  /**
   * Set up health monitoring for system components
   */
  private async setupHealthMonitoring(): Promise<void> {
    // Register core system components for health monitoring
    this.healthMonitor.registerComponents([
      {
        id: 'vision-lake',
        name: 'Vision Lake',
        healthCheck: async () => {
          try {
            const status = await this.visionLakeBackup.checkHealth();
            return {
              healthy: status.healthy,
              details: status.message || 'Vision Lake health check completed',
              metrics: status.metrics || {}
            };
          } catch (error) {
            return {
              healthy: false,
              details: `Vision Lake health check failed: ${error.message}`,
              metrics: {}
            };
          }
        },
        recoverFunction: async () => {
          try {
            const result = await this.visionLakeBackup.performRecovery();
            return {
              success: result.success,
              details: result.message || 'Recovery completed'
            };
          } catch (error) {
            return {
              success: false,
              error: `Recovery failed: ${error.message}`
            };
          }
        }
      },
      {
        id: 'auth-service',
        name: 'Authentication Service',
        healthCheck: async () => {
          try {
            const status = await this.authBackup.checkHealth();
            return {
              healthy: status.healthy,
              details: status.message || 'Auth service health check completed',
              metrics: status.metrics || {}
            };
          } catch (error) {
            return {
              healthy: false,
              details: `Auth service health check failed: ${error.message}`,
              metrics: {}
            };
          }
        },
        recoverFunction: async () => {
          try {
            const result = await this.authBackup.performRecovery();
            return {
              success: result.success,
              details: result.message || 'Recovery completed'
            };
          } catch (error) {
            return {
              success: false,
              error: `Recovery failed: ${error.message}`
            };
          }
        }
      },
      {
        id: 'backup-system',
        name: 'Backup System',
        healthCheck: async () => {
          try {
            const backups = await this.backupManager.listBackups();
            const lastBackup = backups.length > 0 
              ? backups.sort((a, b) => b.timestamp - a.timestamp)[0] 
              : null;
            
            const now = Date.now();
            const backupAge = lastBackup ? (now - lastBackup.timestamp) / (60 * 60 * 1000) : Infinity;
            const healthy = backupAge < (this.config.backupIntervalHours * 2);
            
            return {
              healthy,
              details: healthy 
                ? 'Backup system is operational' 
                : `Last backup is too old (${backupAge.toFixed(1)} hours)`,
              metrics: {
                backupCount: backups.length,
                lastBackupAge: backupAge.toFixed(1),
                totalBackupSize: backups.reduce((sum, b) => sum + (b.sizeBytes || 0), 0)
              }
            };
          } catch (error) {
            return {
              healthy: false,
              details: `Backup system health check failed: ${error.message}`,
              metrics: {}
            };
          }
        }
      },
      {
        id: 'agents',
        name: 'Agent System',
        healthCheck: async () => {
          try {
            const status = await this.agentBackup.checkHealth();
            return {
              healthy: status.healthy,
              details: status.message || 'Agent system health check completed',
              metrics: status.metrics || {}
            };
          } catch (error) {
            return {
              healthy: false,
              details: `Agent system health check failed: ${error.message}`,
              metrics: {}
            };
          }
        },
        recoverFunction: async () => {
          try {
            const result = await this.agentBackup.performRecovery();
            return {
              success: result.success,
              details: result.message || 'Agent recovery completed'
            };
          } catch (error) {
            return {
              success: false,
              error: `Agent recovery failed: ${error.message}`
            };
          }
        }
      },
      {
        id: 'squadrons',
        name: 'Squadron System',
        healthCheck: async () => {
          try {
            const status = await this.squadronBackup.checkHealth();
            return {
              healthy: status.healthy,
              details: status.message || 'Squadron system health check completed',
              metrics: status.metrics || {}
            };
          } catch (error) {
            return {
              healthy: false,
              details: `Squadron system health check failed: ${error.message}`,
              metrics: {}
            };
          }
        },
        recoverFunction: async () => {
          try {
            const result = await this.squadronBackup.performRecovery();
            return {
              success: result.success,
              details: result.message || 'Squadron recovery completed'
            };
          } catch (error) {
            return {
              success: false,
              error: `Squadron recovery failed: ${error.message}`
            };
          }
        }
      }
    ]);

    // Start monitoring
    this.healthMonitor.startMonitoring();
    
    // Listen for health status changes
    this.healthMonitor.on('health:changed', (event) => {
      if (event.newStatus === 'unhealthy' || event.newStatus === 'critical') {
        this.log('warn', `Component ${event.componentId} is now ${event.newStatus}: ${event.details}`);
      }
    });
  }

  /**
   * Execute an emergency 24-hour rollback
   * @param username Admin username
   * @param password Admin password
   * @param reason Reason for the rollback
   * @param targetTime Optional specific target time (defaults to 24 hours ago)
   * @returns Promise resolving to rollback result
   */
  public async emergencyRollback(
    username: string,
    password: string,
    reason: string,
    targetTime?: Date
  ): Promise<{
    success: boolean;
    rollbackId?: string;
    message?: string;
    error?: string;
    status?: RollbackStatus;
  }> {
    if (this.currentRollback && [
      RollbackStatus.IN_PROGRESS,
      RollbackStatus.PENDING,
      RollbackStatus.RECOVERY_IN_PROGRESS
    ].includes(this.currentRollback.status)) {
      return {
        success: false,
        error: 'Another rollback operation is currently in progress',
        status: this.currentRollback.status
      };
    }

    try {
      // Authenticate admin user
      const authResult = this.authenticateAdmin(username, password);
      if (!authResult.success) {
        this.log('warn', `Failed emergency rollback authentication attempt by ${username}`);
        return {
          success: false,
          error: 'Authentication failed: Invalid credentials',
        };
      }

      this.log('info', `Emergency rollback requested by ${username}: ${reason}`);

      // Generate a unique rollback ID
      const rollbackId = `rb-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      
      // Calculate target timestamp (24 hours ago by default)
      const targetTimestamp = targetTime 
        ? targetTime.getTime() 
        : Date.now() - (24 * 60 * 60 * 1000);

      // Capture health status before rollback
      const healthBeforeRollback = await this.healthMonitor.getComponentsHealth();

      // Find the nearest backup to the target time
      const backups = await this.backupManager.listBackups();
      if (backups.length === 0) {
        return {
          success: false,
          error: 'No backups available for rollback',
        };
      }

      // Find nearest backup to target time
      let nearestBackup: BackupMetadata | null = null;
      let smallestTimeDiff = Infinity;

      for (const backup of backups) {
        const timeDiff = Math.abs(backup.timestamp - targetTimestamp);
        if (timeDiff < smallestTimeDiff) {
          smallestTimeDiff = timeDiff;
          nearestBackup = backup;
        }
      }

      if (!nearestBackup) {
        return {
          success: false,
          error: 'Could not find a suitable backup for rollback',
        };
      }

      // Create rollback metadata
      const rollbackMeta: RollbackMetadata = {
        id: rollbackId,
        timestamp: Date.now(),
        targetTimestamp,
        initiatedBy: username,
        reason,
        status: RollbackStatus.PENDING,
        components: ['vision-lake', 'auth', 'agents', 'squadrons'],
        backupId: nearestBackup.id,
        healthBeforeRollback
      };

      // Set current rollback
      this.currentRollback = rollbackMeta;
      this.rollbackHistory.push(rollbackMeta);

      // Log rollback start
      this.log('info', `Starting emergency rollback ${rollbackId} to backup from ${new Date(nearestBackup.timestamp).toISOString()}`);

      // Update status
      rollbackMeta.status = RollbackStatus.IN_PROGRESS;
      this.emit('rollback:started', { id: rollbackId, timestamp: Date.now() });

      // Define component restore order based on dependencies
      // Order should be:
      // 1. Vision Lake (knowledge base needed by agents)
      // 2. Auth (authentication needed for security)
      // 3. Agents (individual agents needed for squadron formation)
      // 4. Squadrons (depends on agents being available)
      const componentOrder = [
        { id: 'vision-lake', name: 'Vision Lake', priority: 10 },
        { id: 'auth', name: 'Authentication', priority: 20 },
        { id: 'agents', name: 'Pilot Agents', priority: 30 },
        { id: 'squadrons', name: 'Squadrons', priority: 40 }
      ];

      // Sort by priority
      componentOrder.sort((a, b) => a.priority - b.priority);

      // Execute rollback for each component in order
      const results: Record<string, any> = {};
      let overallSuccess = true;

      for (const component of componentOrder) {
        try {
          this.log('info', `Rolling back ${component.name} from backup ${nearestBackup.id}`);
          
          let result: any;
          
          switch (component.id) {
            case 'vision-lake':
              result = await this.visionLakeBackup.restore(nearestBackup.id);
              break;
            case 'auth':
              result = await this.authBackup.restore(nearestBackup.id);
              break;
            case 'agents':
              result = await this.agentBackup.restore(nearestBackup.id);
              break;
            case 'squadrons':
              result = await this.squadronBackup.restore(nearestBackup.id);
              break;
            default:
              throw new Error(`Unknown component: ${component.id}`);
          }
          
          results[component.id] = result;
          
          if (!result.success) {
            this.log('error', `Failed to restore ${component.name}: ${result.error || 'Unknown error'}`);
            overallSuccess = false;
            break;
          }
          
          this.log('info', `Successfully restored ${component.name}`);
          
          // Short pause between component restores to ensure system stability
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          this.log('error', `Error restoring ${component.name}: ${error.message}`);
          results[component.id] = { success: false, error: error.message };
          overallSuccess = false;
          break;
        }
      }
      
      // Capture health status after rollback
      const healthAfterRollback = await this.healthMonitor.getComponentsHealth();
      rollbackMeta.healthAfterRollback = healthAfterRollback;
      
      // Check for critical health issues
      const hasIssues = Object.values(healthAfterRollback).some(
        h => h.status === 'critical' || h.status === 'error'
      );
      
      // Update rollback status based on results
      if (overallSuccess && !hasIssues) {
        rollbackMeta.status = RollbackStatus.COMPLETED;
        rollbackMeta.completedAt = Date.now();
        this.log('info', `Emergency rollback ${rollbackId} completed successfully`);
        this.emit('rollback:completed', { 
          id: rollbackId, 
          timestamp: Date.now(),
          success: true 
        });
        
        return {
          success: true,
          rollbackId,
          message: `Successfully rolled back to backup from ${new Date(nearestBackup.timestamp).toLocaleString()}`,
          status: RollbackStatus.COMPLETED
        };
        
      } else if (hasIssues) {
        // Health issues detected, attempt recovery
        rollbackM

      // Log the rollback initiation
      this.log('info', `Initiating emergency rollback to backup from ${new Date(nearestBackup

