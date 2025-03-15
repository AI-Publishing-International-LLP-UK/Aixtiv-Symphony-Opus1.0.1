import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';
import cron from 'node-cron';
import { createHash } from 'crypto';
import { logger } from '../utils/logger';

/**
 * Interface for backup configuration options
 */
export interface BackupConfig {
  /** Directory where backups are stored */
  backupDir: string;
  /** How many days to keep daily backups */
  retentionDays: number;
  /** How many weeks to keep weekly backups */
  weeklyRetention: number;
  /** How many months to keep monthly backups */
  monthlyRetention: number;
  /** Cron schedule for daily backups */
  dailySchedule: string;
  /** Cron schedule for weekly backups */
  weeklySchedule: string;
  /** Cron schedule for monthly backups */
  monthlySchedule: string;
  /** Whether to compress backups */
  compress: boolean;
  /** Maximum backup size in MB (0 for unlimited) */
  maxBackupSizeMB: number;
}

/**
 * Interface for backup metadata
 */
export interface BackupMetadata {
  /** Unique identifier for the backup */
  id: string;
  /** Timestamp when backup was created */
  timestamp: number;
  /** Type of backup (daily, weekly, monthly) */
  type: 'daily' | 'weekly' | 'monthly' | 'manual';
  /** Size of backup in bytes */
  sizeBytes: number;
  /** Hash of backup content for verification */
  contentHash: string;
  /** List of components included in backup */
  components: string[];
  /** Whether backup was verified */
  verified: boolean;
  /** Whether backup is currently locked (being used) */
  locked: boolean;
  /** Optional additional metadata */
  additionalInfo?: Record<string, any>;
  /** Path to backup file or directory */
  path: string;
}

/**
 * Interface for backup results
 */
export interface BackupResult {
  /** Whether backup was successful */
  success: boolean;
  /** Backup metadata if successful */
  metadata?: BackupMetadata;
  /** Error message if unsuccessful */
  error?: string;
  /** Components that failed to backup */
  failedComponents?: string[];
  /** Duration of backup process in ms */
  durationMs: number;
}

/**
 * Interface for restore options
 */
export interface RestoreOptions {
  /** Backup ID to restore from */
  backupId: string;
  /** Components to restore (empty for all) */
  components?: string[];
  /** Whether to validate backup before restoring */
  validateBeforeRestore: boolean;
  /** Whether to create a pre-restore backup */
  createPreRestoreBackup: boolean;
  /** Admin credentials for authorization */
  adminCredentials: {
    username: string;
    token: string;
  };
}

/**
 * Interface for restore results
 */
export interface RestoreResult {
  /** Whether restore was successful */
  success: boolean;
  /** ID of the restored backup */
  backupId: string;
  /** Pre-restore backup ID if created */
  preRestoreBackupId?: string;
  /** Error message if unsuccessful */
  error?: string;
  /** Components that failed to restore */
  failedComponents?: string[];
  /** Duration of restore process in ms */
  durationMs: number;
}

/**
 * Component for backing up specific system parts
 */
export interface BackupComponent {
  /** Unique name of the component */
  name: string;
  /** Function to back up this component */
  backup: () => Promise<{data: any; sizeBytes: number}>;
  /** Function to restore this component */
  restore: (data: any) => Promise<boolean>;
  /** Function to verify backup data */
  verify: (data: any) => Promise<boolean>;
  /** Priority order for backup/restore (lower runs first) */
  priority: number;
}

/**
 * Manager for system backups and restore operations
 */
export class BackupManager extends EventEmitter {
  private config: BackupConfig;
  private components: Map<string, BackupComponent> = new Map();
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private activeBackups: Set<string> = new Set();
  private backupMetadata: Map<string, BackupMetadata> = new Map();
  private isInitialized = false;

  /**
   * Default configuration options
   */
  private static DEFAULT_CONFIG: BackupConfig = {
    backupDir: path.join(process.cwd(), 'backups'),
    retentionDays: 7,
    weeklyRetention: 4,
    monthlyRetention: 6,
    dailySchedule: '0 2 * * *', // 2 AM every day
    weeklySchedule: '0 3 * * 0', // 3 AM every Sunday
    monthlySchedule: '0 4 1 * *', // 4 AM on the first day of each month
    compress: true,
    maxBackupSizeMB: 1000, // 1GB max backup size
  };

  /**
   * Creates a new backup manager instance
   * @param config Backup configuration options
   */
  constructor(config?: Partial<BackupConfig>) {
    super();
    this.config = { ...BackupManager.DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the backup manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure backup directory exists
      await fs.mkdir(this.config.backupDir, { recursive: true });
      
      // Load existing backup metadata
      await this.loadBackupMetadata();
      
      // Start scheduled jobs
      this.scheduleBackups();
      
      this.isInitialized = true;
      logger.info('Backup manager initialized successfully');
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize backup manager', { error });
      throw new Error(`Backup manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Register a component for backup
   * @param component The component to register
   */
  public registerComponent(component: BackupComponent): void {
    if (this.components.has(component.name)) {
      logger.warn(`Component ${component.name} already registered for backup`);
      return;
    }
    
    this.components.set(component.name, component);
    logger.info(`Registered component for backup: ${component.name}`);
    this.emit('componentRegistered', component.name);
  }

  /**
   * Unregister a component from backup
   * @param componentName The name of the component to unregister
   */
  public unregisterComponent(componentName: string): void {
    if (!this.components.has(componentName)) {
      logger.warn(`Component ${componentName} not registered for backup`);
      return;
    }
    
    this.components.delete(componentName);
    logger.info(`Unregistered component from backup: ${componentName}`);
    this.emit('componentUnregistered', componentName);
  }

  /**
   * Schedule backup jobs according to configuration
   */
  private scheduleBackups(): void {
    // Cancel any existing jobs
    for (const job of this.scheduledJobs.values()) {
      job.stop();
    }
    this.scheduledJobs.clear();

    // Schedule daily backups
    const dailyJob = cron.schedule(this.config.dailySchedule, async () => {
      try {
        await this.createBackup('daily');
        await this.enforceRetentionPolicy();
      } catch (error) {
        logger.error('Scheduled daily backup failed', { error });
        this.emit('backupFailed', { type: 'daily', error });
      }
    });
    this.scheduledJobs.set('daily', dailyJob);

    // Schedule weekly backups
    const weeklyJob = cron.schedule(this.config.weeklySchedule, async () => {
      try {
        await this.createBackup('weekly');
        await this.enforceRetentionPolicy();
      } catch (error) {
        logger.error('Scheduled weekly backup failed', { error });
        this.emit('backupFailed', { type: 'weekly', error });
      }
    });
    this.scheduledJobs.set('weekly', weeklyJob);

    // Schedule monthly backups
    const monthlyJob = cron.schedule(this.config.monthlySchedule, async () => {
      try {
        await this.createBackup('monthly');
        await this.enforceRetentionPolicy();
      } catch (error) {
        logger.error('Scheduled monthly backup failed', { error });
        this.emit('backupFailed', { type: 'monthly', error });
      }
    });
    this.scheduledJobs.set('monthly', monthlyJob);

    logger.info('Backup schedules configured');
  }

  /**
   * Create a new backup
   * @param type Type of backup to create
   * @param components Optional components to include (defaults to all)
   * @param additionalInfo Optional additional metadata
   * @returns Result of the backup operation
   */
  public async createBackup(
    type: 'daily' | 'weekly' | 'monthly' | 'manual', 
    components?: string[],
    additionalInfo?: Record<string, any>
  ): Promise<BackupResult> {
    const startTime = Date.now();
    const backupId = `backup-${type}-${startTime}-${Math.random().toString(36).substring(2, 7)}`;
    
    this.activeBackups.add(backupId);
    this.emit('backupStarted', { id: backupId, type });
    
    try {
      logger.info(`Starting ${type} backup with ID: ${backupId}`);
      
      // Determine which components to backup
      const componentsToBackup = components 
        ? Array.from(this.components.values()).filter(c => components.includes(c.name))
        : Array.from(this.components.values());
      
      if (componentsToBackup.length === 0) {
        throw new Error('No components to backup');
      }
      
      // Sort components by priority
      componentsToBackup.sort((a, b) => a.priority - b.priority);
      
      // Create backup directory
      const backupDir = path.join(this.config.backupDir, backupId);
      await fs.mkdir(backupDir, { recursive: true });
      
      // Back up each component
      const backupData: Record<string, any> = {};
      const componentNames: string[] = [];
      const failedComponents: string[] = [];
      let totalSizeBytes = 0;
      
      for (const component of componentsToBackup) {
        try {
          logger.debug(`Backing up component: ${component.name}`);
          const { data, sizeBytes } = await component.backup();
          
          backupData[component.name] = data;
          componentNames.push(component.name);
          totalSizeBytes += sizeBytes;
          
          // Check for size limits
          if (this.config.maxBackupSizeMB > 0 && 
              totalSizeBytes > this.config.maxBackupSizeMB * 1024 * 1024) {
            throw new Error(`Backup size exceeds maximum allowed (${this.config.maxBackupSizeMB} MB)`);
          }
          
          logger.debug(`Component ${component.name} backed up successfully, size: ${sizeBytes} bytes`);
        } catch (error) {
          logger.error(`Failed to backup component: ${component.name}`, { error });
          failedComponents.push(component.name);
        }
      }
      
      if (componentNames.length === 0) {
        throw new Error('All components failed to backup');
      }
      
      // Save backup data
      const backupFilePath = path.join(backupDir, 'backup.json');
      const backupContent = JSON.stringify(backupData, null, 2);
      await fs.writeFile(backupFilePath, backupContent, 'utf8');
      
      // Calculate hash for verification
      const contentHash = createHash('sha256').update(backupContent).digest('hex');
      
      // Create metadata
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp: startTime,
        type,
        sizeBytes: totalSizeBytes,
        contentHash,
        components: componentNames,
        verified: false,
        locked: false,
        additionalInfo,
        path: backupDir
      };
      
      // Save metadata
      await this.saveBackupMetadata(metadata);
      
      // Verify the backup
      const verified = await this.verifyBackup(backupId);
      metadata.verified = verified;
      await this.saveBackupMetadata(metadata);
      
      // Log completion
      const duration = Date.now() - startTime;
      logger.info(`Backup ${backupId} completed in ${duration}ms, size: ${totalSizeBytes} bytes`);
      
      const result: BackupResult = {
        success: true,
        metadata,
        durationMs: duration,
      };
      
      if (failedComponents.length > 0) {
        result.failedComponents = failedComponents;
      }
      
      this.emit('backupCompleted', result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Backup ${backupId} failed`, { error });
      
      const result: BackupResult = {
        success: false,
        error: error.message,
        durationMs: duration
      };
      
      this.emit('backupFailed', { id: backupId, error: error.message });
      return result;
    } finally {
      this.activeBackups.delete(backupId);
    }
  }

  /**
   * Verify a backup's integrity
   * @param backupId ID of the backup to verify
   * @returns Whether the backup is valid
   */
  public async verifyBackup(backupId: string): Promise<boolean> {
    logger.info(`Verifying backup: ${backupId}`);
    
    try {
      const metadata = this.backupMetadata.get(backupId);
      if (!metadata) {
        throw new Error(`Backup ${backupId} not found`);
      }
      
      // Read backup file
      const backupFilePath = path.join(metadata.path, 'backup.json');
      const backupContent = await fs.readFile(backupFilePath, 'utf8');
      
      // Verify hash
      const contentHash = createHash('sha256').update(backupContent).digest('hex');
      if (contentHash !== metadata.contentHash) {
        logger.error(`Backup ${backupId} content hash mismatch`);
        return false;
      }
      
      // Parse backup data
      const backupData = JSON.parse(backupContent);
      
      // Verify each component
      for (const componentName of metadata.components) {
        const component = this.components.get(componentName);
        if (!component) {
          logger.warn(`Component ${componentName} not registered, skipping verification`);
          continue;
        }
        
        const componentData = backupData[componentName];
        if (!componentData) {
          logger.error(`Component ${componentName} data missing from backup ${backupId}`);
          return false;
        }
        const isValid = await component.verify(componentData);
        if (!isValid) {
          logger.error(`Component ${componentName} verification failed for backup ${backupId}`);
          return false;
        }
      }
      
      // Update metadata to mark as verified
      metadata.verified = true;
      await this.saveBackupMetadata(metadata);
      
      logger.info(`Backup ${backupId} verified successfully`);
      this.emit('backupVerified', backupId);
      return true;
    } catch (error) {
      logger.error(`Failed to verify backup ${backupId}`, { error });
      this.emit('backupVerificationFailed', { id: backupId, error: error.message });
      return false;
    }
  }

  /**
   * Restore from a backup
   * @param options Restore options
   * @returns Result of the restore operation
   */
  public async restore(options: RestoreOptions): Promise<RestoreResult> {
    const startTime = Date.now();
    
    logger.info(`Starting restore from backup ${options.backupId}`);
    this.emit('restoreStarted', options.backupId);
    
    try {
      // Verify admin credentials
      if (!await this.verifyAdminCredentials(options.adminCredentials)) {
        throw new Error('Unauthorized: Invalid admin credentials for restore operation');
      }
      
      // Get backup metadata
      const metadata = this.backupMetadata.get(options.backupId);
      if (!metadata) {
        throw new Error(`Backup ${options.backupId} not found`);
      }
      
      // Check if backup is locked
      if (metadata.locked) {
        throw new Error(`Backup ${options.backupId} is currently in use by another operation`);
      }
      
      // Lock the backup
      metadata.locked = true;
      await this.saveBackupMetadata(metadata);
      
      // Validate backup before restore if requested
      if (options.validateBeforeRestore) {
        logger.info(`Validating backup ${options.backupId} before restore`);
        const isValid = await this.verifyBackup(options.backupId);
        if (!isValid) {
          throw new Error(`Backup ${options.backupId} validation failed, restore aborted`);
        }
      }
      
      // Create pre-restore backup if requested
      let preRestoreBackupId: string | undefined;
      if (options.createPreRestoreBackup) {
        logger.info('Creating pre-restore backup');
        const preRestoreResult = await this.createBackup('manual', undefined, {
          reason: 'pre-restore-backup',
          restoreTargetId: options.backupId,
        });
        
        if (!preRestoreResult.success) {
          throw new Error(`Failed to create pre-restore backup: ${preRestoreResult.error}`);
        }
        
        preRestoreBackupId = preRestoreResult.metadata?.id;
        logger.info(`Created pre-restore backup: ${preRestoreBackupId}`);
      }
      
      // Read backup file
      const backupFilePath = path.join(metadata.path, 'backup.json');
      const backupContent = await fs.readFile(backupFilePath, 'utf8');
      const backupData = JSON.parse(backupContent);
      
      // Determine components to restore
      const componentsToRestore = options.components && options.components.length > 0
        ? metadata.components.filter(c => options.components?.includes(c))
        : metadata.components;
      
      if (componentsToRestore.length === 0) {
        throw new Error('No valid components specified for restore');
      }
      
      // Sort components by priority (reverse order from backup)
      const componentInstances = componentsToRestore
        .map(name => this.components.get(name))
        .filter(Boolean) as BackupComponent[];
      
      componentInstances.sort((a, b) => b.priority - a.priority);
      
      // Restore each component
      const failedComponents: string[] = [];
      for (const component of componentInstances) {
        try {
          logger.info(`Restoring component: ${component.name}`);
          const componentData = backupData[component.name];
          
          if (!componentData) {
            logger.error(`Component ${component.name} data missing from backup`);
            failedComponents.push(component.name);
            continue;
          }
          
          const success = await component.restore(componentData);
          if (!success) {
            logger.error(`Failed to restore component: ${component.name}`);
            failedComponents.push(component.name);
          } else {
            logger.info(`Component ${component.name} restored successfully`);
          }
        } catch (error) {
          logger.error(`Error restoring component ${component.name}`, { error });
          failedComponents.push(component.name);
        }
      }
      
      // Check if restore was successful
      const success = failedComponents.length === 0;
      
      // Unlock the backup
      metadata.locked = false;
      await this.saveBackupMetadata(metadata);
      
      const duration = Date.now() - startTime;
      const result: RestoreResult = {
        success,
        backupId: options.backupId,
        durationMs: duration,
      };
      
      if (preRestoreBackupId) {
        result.preRestoreBackupId = preRestoreBackupId;
      }
      
      if (failedComponents.length > 0) {
        result.failedComponents = failedComponents;
        result.error = `Failed to restore components: ${failedComponents.join(', ')}`;
      }
      
      if (success) {
        logger.info(`Restore from backup ${options.backupId} completed successfully in ${duration}ms`);
        this.emit('restoreCompleted', result);
      } else {
        logger.error(`Restore from backup ${options.backupId} completed with errors in ${duration}ms`);
        this.emit('restoreFailed', result);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Restore from backup ${options.backupId} failed`, { error });
      
      // Unlock the backup if it was locked
      const metadata = this.backupMetadata.get(options.backupId);
      if (metadata?.locked) {
        metadata.locked = false;
        await this.saveBackupMetadata(metadata);
      }
      
      const result: RestoreResult = {
        success: false,
        backupId: options.backupId,
        error: error.message,
        durationMs: duration,
      };
      
      this.emit('restoreFailed', result);
      return result;
    }
  }
  
  /**
   * Enforce backup retention policies
   * Removes old backups according to configured retention periods
   */
  public async enforceRetentionPolicy(): Promise<void> {
    logger.info('Enforcing backup retention policy');
    
    try {
      // Get all backups ordered by timestamp
      const backups = Array.from(this.backupMetadata.values())
        .sort((a, b) => b.timestamp - a.timestamp);
      
      if (backups.length === 0) {
        logger.debug('No backups to process for retention policy');
        return;
      }
      
      const now = Date.now();
      const msPerDay = 24 * 60 * 60 * 1000;
      
      // Process daily backups
      const dailyBackups = backups.filter(b => b.type === 'daily');
      const dailyCutoff = now - (this.config.retentionDays * msPerDay);
      
      // Process weekly backups
      const weeklyBackups = backups.filter(b => b.type === 'weekly');
      const weeklyCutoff = now - (this.config.weeklyRetention * 7 * msPerDay);
      
      // Process monthly backups
      const monthlyBackups = backups.filter(b => b.type === 'monthly');
      const monthlyCutoff = now - (this.config.monthlyRetention * 30 * msPerDay);
      
      // Collect backups to remove
      const backupsToRemove: BackupMetadata[] = [
        ...dailyBackups.filter(b => b.timestamp < dailyCutoff),
        ...weeklyBackups.filter(b => b.timestamp < weeklyCutoff),
        ...monthlyBackups.filter(b => b.timestamp < monthlyCutoff),
      ];
      
      // Remove backups that exceed retention period
      for (const backup of backupsToRemove) {
        // Skip locked backups
        if (backup.locked) {
          logger.warn(`Skipping removal of locked backup: ${backup.id}`);
          continue;
        }
        
        await this.removeBackup(backup.id);
      }
      
      logger.info(`Retention policy enforcement completed. Removed ${backupsToRemove.length} backups`);
    } catch (error) {
      logger.error('Failed to enforce retention policy', { error });
      this.emit('retentionPolicyFailed', error.message);
      throw error;
    }
  }
  
  /**
   * Remove a backup
   * @param backupId ID of the backup to remove
   */
  private async removeBackup(backupId: string): Promise<void> {
    logger.info(`Removing backup: ${backupId}`);
    
    try {
      const metadata = this.backupMetadata.get(backupId);
      if (!metadata) {
        logger.warn(`Backup ${backupId} not found, nothing to remove`);
        return;
      }
      
      // Check if backup is locked
      if (metadata.locked) {
        throw new Error(`Cannot remove locked backup: ${backupId}`);
      }
      
      // Remove backup files
      await fs.rm(metadata.path, { recursive: true, force: true });
      
      // Remove from metadata map
      this.backupMetadata.delete(backupId);
      
      // Save updated metadata list
      await this.saveBackupMetadataList();
      
      logger.info(`Backup ${backupId} removed successfully`);
      this.emit('backupRemoved', backupId);
    } catch (error) {
      logger.error(`Failed to remove backup ${backupId}`, { error });
      throw error;
    }
  }
  
  /**
   * Load backup metadata from storage
   */
  private async loadBackupMetadata(): Promise<void> {
    const metadataFilePath = path.join(this.config.backupDir, 'metadata.json');
    
    try {
      // Check if metadata file exists
      try {
        await fs.access(metadataFilePath);
      } catch {
        // Create empty metadata file if it doesn't exist
        await fs.writeFile(metadataFilePath, JSON.stringify([]), 'utf8');
        return;
      }
      
      // Read metadata file
      const content = await fs.readFile(metadataFilePath, 'utf8');
      const metadataList = JSON.parse(content) as BackupMetadata[];
      
      // Clear existing metadata
      this.backupMetadata.clear();
      
      // Load metadata into map
      for (const metadata of metadataList) {
        this.backupMetadata.set(metadata.id, metadata);
      }
      
      logger.info(`Loaded metadata for ${metadataList.length} backups`);
    } catch (error) {
      logger.error('Failed to load backup metadata', { error });
      throw error;
    }
  }
  
  /**
   * Save backup metadata to storage
   * @param metadata Metadata to save
   */
  private async saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
    // Update in memory
    this.backupMetadata.set(metadata.id, metadata);
    
    // Save to disk
    await this.saveBackupMetadataList();
  }
  
  /**
   * Save all backup metadata to storage
   */
  private async saveBackupMetadataList(): Promise<void> {
    const metadataFilePath = path.join(this.config.backupDir, 'metadata.json');
    const metadataList = Array.from(this.backupMetadata.values());
    
    try {
      // Ensure backup directory exists
      await fs.mkdir(path.dirname(metadataFilePath), { recursive: true });
      
      // Write metadata to file
      await fs.writeFile(metadataFilePath, JSON.stringify(metadataList, null, 2), 'utf8');
      
      logger.debug(`Saved backup metadata list with ${metadataList.length} entries`);
    } catch (error) {
      logger.error('Failed to save backup metadata list', { error });
      throw new Error(`Failed to save backup metadata: ${error.message}`);
    }
  }
  
  /**
   * Verify admin credentials for authorized operations
   * @param credentials Admin credentials to verify
   * @returns Whether the credentials are valid
   */
  private async verifyAdminCredentials(credentials: { username: string; token: string }): Promise<boolean> {
    if (!credentials || !credentials.username || !credentials.token) {
      logger.warn('Missing admin credentials for verification');
      return false;
    }
    
    try {
      // In a real-world scenario, this would validate against secure credential storage
      // This is a simplified example - in production, use proper authentication system
      
      // Hash the provided token for comparison
      const tokenHash = createHash('sha256').update(credentials.token).digest('hex');
      
      // Get the stored admin credentials from a secure source
      // For this example, we'll use environment variables or hardcoded values for demonstration
      const validUsername = process.env.ADMIN_USERNAME || 'admin';
      const validTokenHash = process.env.ADMIN_TOKEN_HASH || '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'; // 'password' hashed
      
      // Verify credentials match
      const isValid = credentials.username === validUsername && tokenHash === validTokenHash;
      
      if (!isValid) {
        logger.warn(`Invalid admin credentials provided by ${credentials.username}`);
      }
      
      return isValid;
    } catch (error) {
      logger.error('Error verifying admin credentials', { error });
      return false;
    }
  }
