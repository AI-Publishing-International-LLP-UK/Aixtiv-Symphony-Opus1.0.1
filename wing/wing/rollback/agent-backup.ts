import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import * as zlib from 'zlib';
import * as util from 'util';

// Promisify fs functions
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);

/**
 * Interface for agent state object
 */
export interface AgentState {
  id: string;
  pilot: {
    id: string;
    name: string;
    role: string;
    type: string;
    agency: 'R1' | 'R2' | 'R3';
    specialization?: string;
  };
  status: 'active' | 'inactive' | 'training' | 'maintenance';
  capabilities: string[];
  memory: {
    shortTerm: Record<string, any>;
    longTerm: Record<string, any>;
  };
  connections: {
    visionLake?: boolean;
    dreamCommander?: boolean;
    wishVision?: boolean;
    towerBlockchain?: boolean;
  };
  lastActivity: number;
  flightHours: number;
  version: string;
  configHash: string;
  metrics: Record<string, any>;
  [key: string]: any;
}

/**
 * Backup options interface
 */
export interface AgentBackupOptions {
  compress?: boolean;
  includeMetrics?: boolean;
  includeShortTermMemory?: boolean;
  backupId?: string;
  tags?: string[];
}

/**
 * Restore options interface
 */
export interface AgentRestoreOptions {
  backupId: string;
  validateAfterRestore?: boolean;
  targetAgentIds?: string[];
  resetConnections?: boolean;
  preserveFlightHours?: boolean;
}

/**
 * Backup metadata interface
 */
export interface AgentBackupMetadata {
  id: string;
  timestamp: number;
  agentCount: number;
  agentIds: string[];
  compressed: boolean;
  size: number;
  tags: string[];
  hash: string;
  version: string;
  description?: string;
}

/**
 * Health check result interface
 */
export interface AgentHealthCheckResult {
  healthy: boolean;
  agentsChecked: number;
  healthyAgents: number;
  unhealthyAgents: string[];
  details: Record<string, any>;
  timestamp: number;
}

/**
 * Restore result interface
 */
export interface AgentRestoreResult {
  success: boolean;
  backupId: string;
  timestamp: number;
  restoredAgents: string[];
  failedAgents: string[];
  validationResult?: AgentHealthCheckResult;
  error?: string;
}

/**
 * Verify result interface
 */
export interface AgentVerifyResult {
  valid: boolean;
  backupId: string;
  issues: string[];
  agentCount: number;
  timestamp: number;
}

/**
 * AgentBackup class for the WING system
 * Handles backup and restore of agent states
 */
export class AgentBackup extends EventEmitter {
  private backupPath: string;
  private metadataPath: string;
  private apiClient: any;
  private apiKey: string;
  private apiBaseUrl: string;

  /**
   * Create a new AgentBackup instance
   * @param backupPath Path to store agent backups
   * @param apiBaseUrl Base URL for the agent API
   * @param apiKey API key for authentication
   */
  constructor(backupPath: string, apiBaseUrl: string, apiKey: string) {
    super();
    this.backupPath = backupPath;
    this.metadataPath = path.join(backupPath, 'metadata');
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;

    // Ensure backup directories exist
    this.ensureDirectories();
  }

  /**
   * Create backup directories if they don't exist
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await mkdir(this.backupPath, { recursive: true });
      await mkdir(this.metadataPath, { recursive: true });
      console.log(`Agent backup directories created at ${this.backupPath}`);
    } catch (error) {
      console.error('Failed to create agent backup directories:', error);
      throw error;
    }
  }

  /**
   * Create a backup of all agent states
   * @param options Backup options
   * @returns Promise resolving to backup metadata
   */
  public async createBackup(options: AgentBackupOptions = {}): Promise<AgentBackupMetadata> {
    const startTime = Date.now();
    const backupId = options.backupId || `agent-backup-${startTime}-${crypto.randomBytes(4).toString('hex')}`;
    const backupFilePath = path.join(this.backupPath, `${backupId}.json`);
    const metadataFilePath = path.join(this.metadataPath, `${backupId}.meta.json`);

    this.emit('backup:started', { backupId, timestamp: startTime });
    console.log(`Creating agent backup with ID: ${backupId}`);

    try {
      // Fetch agent states from API or local store
      const agentStates = await this.fetchAgentStates();
      
      if (!agentStates || agentStates.length === 0) {
        throw new Error('No agent states found to backup');
      }

      // Filter agent data based on options
      const processedAgentStates = agentStates.map(agent => this.processAgentForBackup(agent, options));
      
      // Prepare backup data
      let backupData = JSON.stringify(processedAgentStates, null, 2);
      let compressed = false;
      
      // Compress if requested
      if (options.compress) {
        backupData = zlib.gzipSync(backupData).toString('base64');
        compressed = true;
      }
      
      // Write backup to file
      await writeFile(backupFilePath, backupData, 'utf8');
      
      // Calculate file size and hash
      const fileStats = await stat(backupFilePath);
      const fileHash = crypto.createHash('sha256')
        .update(backupData)
        .digest('hex');
      
      // Create metadata
      const metadata: AgentBackupMetadata = {
        id: backupId,
        timestamp: startTime,
        agentCount: agentStates.length,
        agentIds: agentStates.map(agent => agent.id),
        compressed,
        size: fileStats.size,
        tags: options.tags || ['automatic'],
        hash: fileHash,
        version: '1.0',
      };
      
      // Save metadata
      await writeFile(metadataFilePath, JSON.stringify(metadata, null, 2), 'utf8');
      
      const endTime = Date.now();
      console.log(`Agent backup completed in ${endTime - startTime}ms for ${agentStates.length} agents`);
      this.emit('backup:completed', { 
        backupId, 
        timestamp: endTime,
        duration: endTime - startTime,
        agentCount: agentStates.length,
        size: fileStats.size
      });
      
      return metadata;
    } catch (error) {
      console.error(`Agent backup failed: ${error.message}`, error);
      this.emit('backup:failed', { 
        backupId, 
        timestamp: Date.now(),
        error: error.message
      });
      throw new Error(`Agent backup failed: ${error.message}`);
    }
  }

  /**
   * Process agent state for backup (filtering based on options)
   * @param agent Agent state
   * @param options Backup options
   * @returns Processed agent state
   */
  private processAgentForBackup(agent: AgentState, options: AgentBackupOptions): AgentState {
    const processedAgent = { ...agent };
    
    // Optionally exclude metrics
    if (!options.includeMetrics && processedAgent.metrics) {
      delete processedAgent.metrics;
    }
    
    // Optionally exclude short-term memory
    if (!options.includeShortTermMemory && processedAgent.memory?.shortTerm) {
      processedAgent.memory.shortTerm = {};
    }
    
    return processedAgent;
  }

  /**
   * Restore agent states from backup
   * @param options Restore options
   * @returns Promise resolving to restore result
   */
  public async restore(options: AgentRestoreOptions): Promise<AgentRestoreResult> {
    const startTime = Date.now();
    const { backupId } = options;
    const backupFilePath = path.join(this.backupPath, `${backupId}.json`);
    const metadataFilePath = path.join(this.metadataPath, `${backupId}.meta.json`);

    this.emit('restore:started', { backupId, timestamp: startTime });
    console.log(`Starting agent restore from backup: ${backupId}`);

    try {
      // Check if backup files exist
      if (!fs.existsSync(backupFilePath) || !fs.existsSync(metadataFilePath)) {
        throw new Error(`Backup with ID ${backupId} not found`);
      }
      
      // Read metadata
      const metadata: AgentBackupMetadata = JSON.parse(
        await readFile(metadataFilePath, 'utf8')
      );
      
      // Read backup data
      let backupDataRaw = await readFile(backupFilePath, 'utf8');
      
      // Decompress if needed
      if (metadata.compressed) {
        const buffer = Buffer.from(backupDataRaw, 'base64');
        backupDataRaw = zlib.gunzipSync(buffer).toString('utf8');
      }
      
      // Parse agent states
      const agentStates: AgentState[] = JSON.parse(backupDataRaw);
      
      // Filter agents if targetAgentIds is specified
      const targetAgents = options.targetAgentIds 
        ? agentStates.filter(agent => options.targetAgentIds.includes(agent.id))
        : agentStates;
      
      if (targetAgents.length === 0) {
        throw new Error('No agents found in backup matching the target agent IDs');
      }
      
      // Process agents for restore (handle connections, flight hours, etc.)
      const processedAgents = targetAgents.map(agent => 
        this.processAgentForRestore(agent, options)
      );
      
      // Restore agent states
      const restoreResults = await this.restoreAgentStates(processedAgents);
      
      // Check which agents were successfully restored
      const restoredAgents = restoreResults
        .filter(result => result.success)
        .map(result => result.agentId);
      
      const failedAgents = restoreResults
        .filter(result => !result.success)
        .map(result => result.agentId);
      
      // Validate restored agents if requested
      let validationResult: AgentHealthCheckResult | undefined;
      if (options.validateAfterRestore) {
        validationResult = await this.checkAgentsHealth(restoredAgents);
      }
      
      const endTime = Date.now();
      console.log(`Agent restore completed in ${endTime - startTime}ms. Restored: ${restoredAgents.length}, Failed: ${failedAgents.length}`);
      
      const result: AgentRestoreResult = {
        success: failedAgents.length === 0,
        backupId,
        timestamp: endTime,
        restoredAgents,
        failedAgents,
        validationResult
      };
      
      this.emit('restore:completed', {
        ...result,
        duration: endTime - startTime
      });
      
      return result;
    } catch (error) {
      console.error(`Agent restore failed: ${error.message}`, error);
      this.emit('restore:failed', { 
        backupId, 
        timestamp: Date.now(),
        error: error.message
      });
      
      return {
        success: false,
        backupId,
        timestamp: Date.now(),
        restoredAgents: [],
        failedAgents: options.targetAgentIds || [],
        error: error.message
      };
    }
  }

  /**
   * Process agent state for restore
   * @param agent Agent state
   * @param options Restore options
   * @returns Processed agent state
   */
  private processAgentForRestore(agent: AgentState, options: AgentRestoreOptions): AgentState {
    const processedAgent = { ...agent };
    
    // Reset connections if requested
    if (options.resetConnections) {
      processedAgent.connections = {
        visionLake: false,
        dreamCommander: false,
        wishVision: false,
        towerBlockchain: false
      };
    }
    
    // Preserve flight hours if requested
    if (options.preserveFlightHours) {
      // Try to get current agent state to preserve flight hours
      try {
        const currentAgent = this.getAgentById(agent.id);
        if (currentAgent) {
          processedAgent.flightHours = currentAgent.flightHours;
        }
      } catch (error) {
        console.warn(`Could not retrieve current flight hours for agent ${agent.id}`);
      }
    }
    
    // Update last activity to restore time
    processedAgent.lastActivity = Date.now();
    
    return processedAgent;
  }

  /**
   * Verify a backup
   * @param backupId ID of the backup to verify
   * @returns Promise resolving to verification result
   */
  public async verifyBackup(backupId: string): Promise<AgentVerifyResult> {
    console.log(`Verifying agent backup: ${backupId}`);
    const backupFilePath = path.join(this.backupPath, `${backupId}.json`);
    const metadataFilePath = path.join(this.metadataPath, `${backupId}.meta.json`);
    const issues: string[] = [];

    try {
      // Check if backup files exist
      if (!fs.existsSync(backupFilePath)) {
        issues.push(`Backup file ${backupId}.json not found`);
      }
      
      if (!fs.existsSync(metadataFilePath)) {
        issues.push(`Metadata file ${backupId}.meta.json not found`);
      }
      
      if (issues.length > 0) {
        return {
          valid: false,
          backupId,
          issues,
          agentCount: 0,
          timestamp: Date.now()
        };
      }
      
      // Read metadata
      const metadata: AgentBackupMetadata = JSON.parse(
        await readFile(metadataFilePath, 'utf8')
      );
      
      // Read backup data to verify hash
      let

