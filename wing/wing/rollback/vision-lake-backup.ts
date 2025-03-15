import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import zlib from 'zlib';
import crypto from 'crypto';
import axios from 'axios';
import { BackupComponent, BackupMetadata, BackupOptions, RestoreOptions } from './types';

/**
 * VisionLakeBackup class implements BackupComponent interface for Vision Lake data
 * Handles backup, restore, verification, and management of Vision Lake data
 */
export class VisionLakeBackup implements BackupComponent {
  private baseBackupPath: string;
  private visionLakeApiUrl: string;
  private apiKey: string;
  private lastFullBackupTimestamp: number = 0;
  private incrementalThreshold: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private retryCount: number = 3;
  private retryDelay: number = 5000; // 5 seconds

  /**
   * @param options Configuration options for Vision Lake Backup
   */
  constructor(options: {
    backupPath: string;
    visionLakeApiUrl: string;
    apiKey: string;
    incrementalThreshold?: number;
    retryCount?: number;
    retryDelay?: number;
  }) {
    this.baseBackupPath = options.backupPath;
    this.visionLakeApiUrl = options.visionLakeApiUrl;
    this.apiKey = options.apiKey;
    
    if (options.incrementalThreshold) {
      this.incrementalThreshold = options.incrementalThreshold;
    }
    
    if (options.retryCount) {
      this.retryCount = options.retryCount;
    }
    
    if (options.retryDelay) {
      this.retryDelay = options.retryDelay;
    }
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.baseBackupPath)) {
      fs.mkdirSync(this.baseBackupPath, { recursive: true });
    }
  }

  /**
   * Create a backup of Vision Lake data
   * Supports both full and incremental backups
   */
  public async createBackup(options: BackupOptions): Promise<BackupMetadata> {
    const timestamp = Date.now();
    const backupId = `vl-${timestamp}-${crypto.randomBytes(4).toString('hex')}`;
    const isIncremental = this.shouldUseIncrementalBackup(timestamp);
    
    try {
      // Create backup directory
      const backupDir = path.join(this.baseBackupPath, backupId);
      fs.mkdirSync(backupDir, { recursive: true });
      
      // Get Vision Lake data
      let data: any;
      if (isIncremental) {
        data = await this.fetchIncrementalData();
      } else {
        data = await this.fetchFullData();
        this.lastFullBackupTimestamp = timestamp;
      }
      
      // Process and save data
      const { compressedSize, hash } = await this.processAndSaveData(data, backupDir, options.compress ?? true);
      
      // Create and return metadata
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        size: compressedSize,
        hash,
        type: isIncremental ? 'incremental' : 'full',
        component: 'vision-lake',
        path: backupDir,
        dependencies: isIncremental ? [this.getLatestFullBackupId()] : [],
        tags: [...(options.tags || []), isIncremental ? 'incremental' : 'full']
      };
      
      // Save metadata
      await this.saveMetadata(metadata, backupDir);
      
      console.log(`Vision Lake ${isIncremental ? 'incremental' : 'full'} backup created: ${backupId}`);
      return metadata;
    } catch (error) {
      console.error(`Error creating Vision Lake backup: ${error.message}`);
      throw new Error(`Failed to create Vision Lake backup: ${error.message}`);
    }
  }

  /**
   * Restore Vision Lake data from a backup
   */
  public async restore(options: RestoreOptions): Promise<boolean> {
    try {
      // Find the backup to restore
      const backupDir = options.backupId 
        ? path.join(this.baseBackupPath, options.backupId) 
        : this.findBackupByTimestamp(options.timestamp);
      
      if (!backupDir || !fs.existsSync(backupDir)) {
        throw new Error(`Backup not found: ${options.backupId || options.timestamp}`);
      }
      
      // Load metadata
      const metadata = await this.loadMetadata(backupDir);
      
      // For incremental backups, we need to restore the full backup first
      if (metadata.type === 'incremental' && metadata.dependencies.length > 0) {
        const fullBackupId = metadata.dependencies[0];
        await this.restore({ backupId: fullBackupId, validateAfterRestore: false });
      }
      
      // Load backup data
      const data = await this.loadBackupData(backupDir, metadata);
      
      // Restore data to Vision Lake
      await this.withRetry(() => this.restoreToVisionLake(data));
      
      // Validate restoration if requested
      if (options.validateAfterRestore) {
        const isValid = await this.validateRestore(data);
        if (!isValid) {
          throw new Error('Vision Lake data restore validation failed');
        }
      }
      
      console.log(`Vision Lake restore successful from backup: ${metadata.id}`);
      return true;
    } catch (error) {
      console.error(`Error restoring Vision Lake data: ${error.message}`);
      throw new Error(`Failed to restore Vision Lake data: ${error.message}`);
    }
  }

  /**
   * Verify a backup to ensure it can be restored
   */
  public async verifyBackup(backupId: string): Promise<boolean> {
    try {
      const backupDir = path.join(this.baseBackupPath, backupId);
      
      if (!fs.existsSync(backupDir)) {
        throw new Error(`Backup not found: ${backupId}`);
      }
      
      // Load metadata
      const metadata = await this.loadMetadata(backupDir);
      
      // Check if the backup file exists
      const backupFilePath = path.join(backupDir, 'data.json' + (metadata.compress ? '.gz' : ''));
      if (!fs.existsSync(backupFilePath)) {
        throw new Error(`Backup data file not found: ${backupFilePath}`);
      }
      
      // For incremental backups, verify dependencies
      if (metadata.type === 'incremental' && metadata.dependencies.length > 0) {
        for (const depId of metadata.dependencies) {
          const depExists = await this.verifyBackup(depId);
          if (!depExists) {
            throw new Error(`Dependency backup not found or invalid: ${depId}`);
          }
        }
      }
      
      // Validate data integrity
      const data = await this.loadBackupData(backupDir, metadata);
      const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
      
      if (hash !== metadata.hash) {
        throw new Error(`Backup data integrity check failed. Hash mismatch: ${hash} != ${metadata.hash}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Error verifying backup ${backupId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete a backup and its files
   */
  public async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const backupDir = path.join(this.baseBackupPath, backupId);
      
      if (!fs.existsSync(backupDir)) {
        console.warn(`Backup not found for deletion: ${backupId}`);
        return false;
      }
      
      // Load metadata to check if it's a full backup with dependent incrementals
      const metadata = await this.loadMetadata(backupDir);
      
      // Check if this is a full backup that has dependent incrementals
      if (metadata.type === 'full') {
        const incrementals = await this.findDependentIncrementals(backupId);
        if (incrementals.length > 0) {
          throw new Error(`Cannot delete full backup ${backupId} as it has ${incrementals.length} dependent incremental backups`);
        }
      }
      
      // Delete the backup directory
      fs.rmdirSync(backupDir, { recursive: true });
      console.log(`Backup ${backupId} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`Error deleting backup ${backupId}: ${error.message}`);
      return false;
    }
  }

  /**
   * List all available backups
   */
  public async listBackups(): Promise<BackupMetadata[]> {
    try {
      const backupList: BackupMetadata[] = [];
      const dirs = fs.readdirSync(this.baseBackupPath);
      
      for (const dir of dirs) {
        const backupDir = path.join(this.baseBackupPath, dir);
        try {
          if (fs.statSync(backupDir).isDirectory()) {
            const metadataPath = path.join(backupDir, 'metadata.json');
            if (fs.existsSync(metadataPath)) {
              const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
              backupList.push(metadata);
            }
          }
        } catch (error) {
          console.warn(`Error reading backup directory ${dir}: ${error.message}`);
        }
      }
      
      // Sort by timestamp, newest first
      return backupList.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error(`Error listing backups: ${error.message}`);
      return [];
    }
  }

  /**
   * Get backup information by ID
   */
  public async getBackupInfo(backupId: string): Promise<BackupMetadata | null> {
    try {
      const backupDir = path.join(this.baseBackupPath, backupId);
      
      if (!fs.existsSync(backupDir)) {
        return null;
      }
      
      return await this.loadMetadata(backupDir);
    } catch (error) {
      console.error(`Error getting backup info for ${backupId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Find the most recent backup before the given timestamp
   */
  public async findBackupByTimestamp(timestamp: number): Promise<string | null> {
    try {
      const backups = await this.listBackups();
      
      // Find the most recent backup before the given timestamp
      const backup = backups
        .filter(b => b.timestamp <= timestamp)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      
      if (!backup) {
        return null;
      }
      
      return path.join(this.baseBackupPath, backup.id);
    } catch (error) {
      console.error(`Error finding backup by timestamp ${timestamp}: ${error.message}`);
      return null;
    }
  }

  // *** Private implementation methods ***
  
  /**
   * Determine if an incremental backup should be used
   */
  private shouldUseIncrementalBackup(currentTimestamp: number): boolean {
    // If we've never done a full backup, do one now
    if (this.lastFullBackupTimestamp === 0) {
      return false;
    }
    
    // If it's been too long since the last full backup, do another
    if (currentTimestamp - this.lastFullBackupTimestamp > this.incrementalThreshold) {
      return false;
    }
    
    return true;
  }

  /**
   * Fetch full Vision Lake data
   */
  private async fetchFullData(): Promise<any> {
    return this.withRetry(async () => {
      const response = await axios.get(`${this.visionLakeApiUrl}/export/full`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`Failed to fetch Vision Lake data: HTTP ${response.status}`);
      }
      
      return response.data;
    });
  }

  /**
   * Fetch incremental Vision Lake data (changes since last backup)
   */
  private async fetchIncrementalData(): Promise<any> {
    return this.withRetry(async () => {
      const response = await axios.get(`${this.visionLakeApiUrl}/export/incremental`, {
        params: {
          since: this.lastFullBackupTimestamp
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`Failed to fetch incremental Vision Lake data: HTTP ${response.status}`);
      }
      
      return response.data;
    });
  }

  /**
   * Process and save backup data to disk
   */
  private async processAndSaveData(data: any, backupDir: string, compress: boolean): Promise<{ compressedSize: number, hash: string }> {
    const dataJson = JSON.stringify(data);
    const hash = crypto.createHash('sha256').update(dataJson).digest('hex');
    const filePath = path.join(backupDir, 'data.json');
    
    if (compress) {
      const compressedFilePath = filePath + '.gz';
      const gzip = promisify(zlib.gzip);
      const compressedData = await gzip(Buffer.from(dataJson, 'utf8'));
      fs.writeFileSync(compressedFilePath, compressedData);
      return { compressedSize: compressedData.length, hash };
    } else {
      fs.writeFileSync(filePath, dataJson);
      return { compressedSize: dataJson.length, hash };
    }
  }

  /**
   * Save backup metadata to disk
   */
  private async saveMetadata(metadata: BackupMetadata, backupDir: string): Promise<void> {
    const metadataPath = path.join(backupDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Load backup metadata from disk
   */
  private async loadMetadata(backupDir: string): Promise<BackupMetadata> {
    const metadataPath = path.join(backupDir, 'metadata.json');
    
    if (!fs.existsSync(metadataPath)) {
      throw new Error(`Metadata file not found: ${metadataPath}`);
    }
    
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  }

  /**
   * Load backup data from disk
   */
  private async loadBackupData(backupDir: string, metadata: BackupMetadata): Promise<any> {
    const backupFilePath = path.join(backupDir, 'data.json' + (metadata.compress ? '.gz' : ''));
    
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup data file not found: ${backupFilePath}`);
    }
    
    try {
      if (metadata.compress) {
        const gunzip = promisify(zlib.gunzip);
        const compressedData = fs.readFileSync(backupFilePath);
        const decompressed = await gunzip(compressedData);
        return JSON.parse(decompressed.toString('utf8'));
      } else {
        return JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
      }
    } catch (error) {
      throw new Error(`Failed to load backup data: ${error.message}`);
    }
  }

  /**
   * Restore data to Vision Lake
   */
  private async restoreToVisionLake(data: any): Promise<void> {
    try {
      const response = await axios.post(`${this.visionLakeApiUrl}/import`, data, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`Failed to restore Vision Lake data: HTTP ${response.status}`);
      }
      
      console.log('Vision Lake data restored successfully');
    } catch (error) {
      console.error(`Error restoring data to Vision Lake: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate restoration by comparing with current Vision Lake state
   */
  private async validateRestore(originalData: any): Promise<boolean> {
    try {
      // Fetch current state from Vision Lake
      const response = await axios.get(`${this.visionLakeApiUrl}/export/validate`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`Failed to validate Vision Lake restoration: HTTP ${response.status}`);
      }
      
      const currentData = response.data;
      
      // Compare essential fields (this would need to be customized based on Vision Lake data structure)
      // This is a simplified version - real implementation would need more sophisticated comparison
      const originalKeys = Object.keys(originalData);
      const currentKeys = Object.keys(currentData);
      
      // Verify all required keys exist
      const missingKeys = originalKeys.filter(key => !currentKeys.includes(key));
      if (missingKeys.length > 0) {
        console.error(`Validation failed: Missing keys in restored data: ${missingKeys.join(', ')}`);
        return false;
      }
      
      // Verify critical data sections
      if (originalData.version !== currentData.version) {
        console.error(`Validation failed: Version mismatch - expected ${originalData.version}, got ${currentData.version}`);
        return false;
      }
      
      console.log('Vision Lake restoration validation successful');
      return true;
    } catch (error) {
      console.error(`Error validating Vision Lake restoration: ${error.message}`);
      return false;
    }
  }

  /**
   * Retry an operation with exponential backoff
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.retryDelay;
    
    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`Operation failed (attempt ${attempt}/${this.retryCount}): ${error.message}`);
        
        if (attempt < this.retryCount) {
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
    }
    
    throw lastError || new Error('Operation failed after multiple attempts');
  }

  /**
   * Find incremental backups that depend on a full backup
   */
  private async findDependentIncrementals(fullBackupId: string): Promise<string[]> {
    try {
      const backups = await this.listBackups();
      
      // Find all incremental backups that depend on this full backup
      const dependentBackups = backups
        .filter(b => b.type === 'incremental' && b.dependencies.includes(fullBackupId))
        .map(b => b.id);
      
      return dependentBackups;
    } catch (error) {
      console.error(`Error finding dependent incremental backups: ${error.message}`);
      return [];
    }
  }

  /**
   * Get the ID of the latest full backup
   */
  private getLatestFullBackupId(): string {
    // This would typically look up the latest full backup from disk
    // For this implementation, we're tracking it in memory
    if (this.lastFullBackupTimestamp === 0) {
      throw new Error('No full backup available');
    }
    
    return `vl-${this.lastFullBackupTimestamp}-full`;
  }
}
