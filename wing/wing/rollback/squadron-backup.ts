import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { EventEmitter } from 'events';

// Promisify fs functions
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const access = promisify(fs.access);

/**
 * Squadron backup metadata
 */
export interface SquadronBackupMetadata {
  id: string;
  timestamp: number;
  size: number;
  squadronIds: string[];
  compressed: boolean;
  encrypted: boolean;
  checksum: string;
  version: string;
  tags: string[];
}

/**
 * Squadron backup options
 */
export interface SquadronBackupOptions {
  compress?: boolean;
  encrypt?: boolean;
  encryptionKey?: string;
  tags?: string[];
}

/**
 * Squadron restore options
 */
export interface SquadronRestoreOptions {
  backupId: string;
  decryptionKey?: string;
  validateAfterRestore?: boolean;
  targetSquadronIds?: string[];
}

/**
 * Squadron verification result
 */
export interface SquadronVerificationResult {
  valid: boolean;
  metadata?: SquadronBackupMetadata;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Squadron backup configuration
 */
export interface SquadronBackupConfig {
  backupPath: string;
  squadronApiUrl?: string;
  apiKey?: string;
}

/**
 * Squadron data structure
 */
export interface SquadronData {
  id: string;
  name: string;
  pilots: {
    id: string;
    role: string;
    capabilities: string[];
  }[];
  configuration: Record<string, any>;
  integrations: Record<string, any>;
  status: string;
  version: string;
}

/**
 * Squadron backup class for handling squadron configuration backups
 * and restores within the Wing rollback system.
 */
export class SquadronBackup extends EventEmitter {
  private readonly backupPath: string;
  private readonly squadronApiUrl: string;
  private readonly apiKey: string;
  private readonly metadataPath: string;
  private backupMetadata: Map<string, SquadronBackupMetadata> = new Map();
  private maxRetries = 3;
  private retryDelayMs = 1000;

  /**
   * Create a new SquadronBackup instance
   * @param config Configuration for the squadron backup
   */
  constructor(config: SquadronBackupConfig) {
    super();
    this.backupPath = config.backupPath;
    this.squadronApiUrl = config.squadronApiUrl || process.env.SQUADRON_API_URL || 'http://localhost:3000/api/squadrons';
    this.apiKey = config.apiKey || process.env.SQUADRON_API_KEY || '';
    this.metadataPath = path.join(this.backupPath, 'metadata.json');
    
    // Ensure backup directory exists
    this.ensureBackupDirectory();
    
    // Load existing backup metadata
    this.loadBackupMetadata();
  }

  /**
   * Ensure the backup directory exists
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await access(this.backupPath, fs.constants.F_OK);
    } catch (error) {
      // Directory doesn't exist, create it
      await mkdir(this.backupPath, { recursive: true });
      console.log(`Created squadron backup directory: ${this.backupPath}`);
    }
  }

  /**
   * Load backup metadata from disk
   */
  private async loadBackupMetadata(): Promise<void> {
    try {
      await access(this.metadataPath, fs.constants.F_OK);
      const data = await readFile(this.metadataPath, 'utf-8');
      const metadataArray: SquadronBackupMetadata[] = JSON.parse(data);
      
      // Clear existing metadata and rebuild
      this.backupMetadata.clear();
      metadataArray.forEach(metadata => {
        this.backupMetadata.set(metadata.id, metadata);
      });
      
      console.log(`Loaded ${this.backupMetadata.size} squadron backup metadata entries`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Metadata file doesn't exist yet, initialize empty
        await this.saveBackupMetadata();
      } else {
        console.error('Error loading squadron backup metadata:', error);
      }
    }
  }

  /**
   * Save backup metadata to disk
   */
  private async saveBackupMetadata(): Promise<void> {
    try {
      const metadataArray = Array.from(this.backupMetadata.values());
      await writeFile(this.metadataPath, JSON.stringify(metadataArray, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving squadron backup metadata:', error);
      throw new Error(`Failed to save squadron backup metadata: ${error.message}`);
    }
  }

  /**
   * Fetch squadron configurations from the API
   * @returns Promise resolving to array of squadron data
   */
  private async fetchSquadronData(): Promise<SquadronData[]> {
    try {
      // In a real implementation, this would make an API call to fetch squadron data
      // For now, we'll simulate this
      
      const response = await this.withRetry(async () => {
        // Simulate API call
        return {
          success: true,
          data: [
            {
              id: 'squadron-1',
              name: 'R1 Core Squadron',
              pilots: [
                { id: 'lucy', role: 'lead', capabilities: ['reasoning', 'planning'] },
                { id: 'claude', role: 'member', capabilities: ['analysis', 'research'] },
                { id: 'roark', role: 'member', capabilities: ['architecture', 'systems'] }
              ],
              configuration: {
                flightPlan: {
                  maxFlights: 10,
                  recoveryOptions: true
                },
                security: {
                  encryption: true,
                  accessControl: 'strict'
                }
              },
              integrations: {
                dreamCommander: true,
                visionLake: true,
                wishVision: false
              },
              status: 'active',
              version: '2.1.0'
            },
            {
              id: 'squadron-2',
              name: 'R2 Deploy Squadron',
              pilots: [
                { id: 'grant', role: 'lead', capabilities: ['deployment', 'optimization'] },
                { id: 'memoria', role: 'member', capabilities: ['memory', 'recall'] },
                { id: 'circuit', role: 'member', capabilities: ['routing', 'networking'] }
              ],
              configuration: {
                flightPlan: {
                  maxFlights: 15,
                  recoveryOptions: true
                },
                deployment: {
                  strategies: ['canary', 'blue-green'],
                  rollbackEnabled: true
                }
              },
              integrations: {
                dreamCommander: true,
                visionLake: true,
                wishVision: true
              },
              status: 'active',
              version: '2.0.5'
            }
          ]
        };
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching squadron data:', error);
      throw new Error(`Failed to fetch squadron data: ${error.message}`);
    }
  }

  /**
   * Create a backup of squadron configurations
   * @param options Backup options
   * @returns Promise resolving to backup metadata
   */
  public async createBackup(options: SquadronBackupOptions = {}): Promise<SquadronBackupMetadata> {
    console.log('Creating squadron backup...');
    
    try {
      // Generate backup ID
      const backupId = `squadron-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      
      // Create backup directory
      const backupDir = path.join(this.backupPath, backupId);
      await mkdir(backupDir, { recursive: true });
      
      // Fetch squadron data
      const squadronData = await this.fetchSquadronData();
      const squadronIds = squadronData.map(s => s.id);
      
      // Serialize data to JSON
      let dataContent = JSON.stringify(squadronData, null, 2);
      let finalContent = dataContent;
      
      // Compress if requested
      const compress = options.compress ?? true;
      if (compress) {
        finalContent = zlib.gzipSync(dataContent).toString('base64');
      }
      
      // Encrypt if requested
      const encrypt = options.encrypt ?? false;
      if (encrypt) {
        if (!options.encryptionKey) {
          throw new Error('Encryption key is required for encrypted backups');
        }
        
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(options.encryptionKey, 'salt', 32);
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(finalContent, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Store initialization vector with the encrypted content
        finalContent = JSON.stringify({
          iv: iv.toString('hex'),
          content: encrypted
        });
      }
      
      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(finalContent).digest('hex');
      
      // Write to file
      const backupFilePath = path.join(backupDir, 'squadron-data.json');
      await writeFile(backupFilePath, finalContent);
      
      // Get file size
      const fileStats = await stat(backupFilePath);
      
      // Create metadata
      const metadata: SquadronBackupMetadata = {
        id: backupId,
        timestamp: Date.now(),
        size: fileStats.size,
        squadronIds: squadronIds,
        compressed: compress,
        encrypted: encrypt,
        checksum: checksum,
        version: '1.0',
        tags: options.tags || ['automated']
      };
      
      // Save metadata
      this.backupMetadata.set(backupId, metadata);
      await this.saveBackupMetadata();
      
      // Emit event
      this.emit('backup:created', {
        backupId,
        timestamp: metadata.timestamp,
        squadronCount: squadronIds.length,
        size: metadata.size
      });
      
      console.log(`Squadron backup created: ${backupId}`);
      return metadata;
    } catch (error) {
      console.error('Error creating squadron backup:', error);
      throw new Error(`Squadron backup creation failed: ${error.message}`);
    }
  }

  /**
   * List all available squadron backups
   * @returns Array of backup metadata
   */
  public async listBackups(): Promise<SquadronBackupMetadata[]> {
    return Array.from(this.backupMetadata.values())
      .sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
  }

  /**
   * Get backup metadata by ID
   * @param backupId Backup ID to retrieve
   * @returns Backup metadata or undefined if not found
   */
  public getBackup(backupId: string): SquadronBackupMetadata | undefined {
    return this.backupMetadata.get(backupId);
  }

  /**
   * Restore squadron configurations from a backup
   * @param options Restore options
   * @returns Promise resolving to restore result
   */
  public async restore(options: SquadronRestoreOptions): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    details?: Record<string, any>;
  }> {
    console.log(`Restoring squadron backup: ${options.backupId}`);
    
    try {
      // Get backup metadata
      const metadata = this.backupMetadata.get(options.backupId);
      if (!metadata) {
        throw new Error(`Backup not found: ${options.backupId}`);
      }
      
      // Path to backup file
      const backupDir = path.join(this.backupPath, options.backupId);
      const backupFilePath = path.join(backupDir, 'squadron-data.json');
      
      // Check if backup file exists
      await access(backupFilePath, fs.constants.F_OK);
      
      // Read backup file
      let fileData = await readFile(backupFilePath, 'utf-8');
      
      // Decrypt if encrypted
      if (metadata.encrypted) {
        if (!options.decryptionKey) {
          throw new Error('Decryption key is required for encrypted backups');
        }
        
        const encryptedData = JSON.parse(fileData);
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(options.decryptionKey, 'salt', 32);
        const iv = Buffer.from(encryptedData.iv, 'hex');
        
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedData.content, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        fileData = decrypted;
      }
      
      // Decompress if compressed
      if (metadata.compressed) {
        const compressedBuffer = Buffer.from(fileData, 'base64');
        fileData = zlib.gunzipSync(compressedBuffer).toString();
      }
      
      // Parse squadron data
      const squadronData: SquadronData[] = JSON.parse(fileData);
      
      // Filter squadrons if target IDs are specified
      let squadronsToRestore = squadronData;
      if (options.targetSquadronIds && options.targetSquadronIds.length > 0) {
        squadronsToRestore = squadronData.filter(s => options.targetSquadronIds!.includes(s.id));
        if (squadronsToRestore.length === 0) {
          throw new Error('No matching squadrons found in backup');
        }
      }
      
      // Perform restoration to API
      const restoredSquadrons = await this.restoreSquadronConfigurations(squadronsToRestore);
      
      // Verify restoration if requested
      if (options.validateAfterRestore) {
        await this.verifyRestoredSquadrons(restoredSquadrons);
      }
      
      // Emit event
      this.emit('backup:restored', {
        backupId: options.backupId,
        timestamp: Date.now(),
        squadronsRestored: restoredSquadrons.length,
        metadata: metadata
      });
      
      return {
        success: true,
        message: `Successfully restored ${restoredSquadrons.length} squadron configurations`,
        details: {
          squadronIds: restoredSqu

