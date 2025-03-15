/**
 * Rollback System Configuration
 * 
 * This file defines the configuration parameters for the WING emergency rollback system.
 * The system allows for reverting to a previous state in case of critical issues.
 */

import path from 'path';

export interface RollbackConfig {
  /** Number of days to keep backups */
  retentionDays: number;
  
  /** Directory where backup files are stored */
  backupDirectory: string;
  
  /** Schedule for regular backups (cron format) */
  backupSchedule: string;
  
  /** Components that are included in backups */
  components: {
    /** Whether to include Vision Lake data in backups */
    visionLake: boolean;
    
    /** Whether to include authentication data in backups */
    authentication: boolean;
    
    /** Whether to include agent states in backups */
    agents: boolean;
    
    /** Whether to include squadron configurations in backups */
    squadrons: boolean;
  };
  
  /** Verification settings for rollbacks */
  verification: {
    /** Run health checks before rollback */
    preRollbackChecks: boolean;
    
    /** Run health checks after rollback */
    postRollbackChecks: boolean;
    
    /** Timeout for health checks (milliseconds) */
    healthCheckTimeout: number;
  };
  
  /** Authorization requirements for performing rollbacks */
  authorization: {
    /** Required admin role level to execute rollbacks */
    requiredAdminLevel: number;
    
    /** Whether to require 2FA for rollback operations */
    require2FA: boolean;
    
    /** Whether to notify administrators when rollbacks occur */
    notifyAdmins: boolean;
  };
  
  /** Logging configuration for rollback operations */
  logging: {
    /** Log level for rollback operations */
    level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
    
    /** Directory where rollback logs are stored */
    directory: string;
    
    /** Whether to include timestamps in logs */
    includeTimestamps: boolean;
  };
}

/**
 * Default rollback configuration
 */
export const defaultRollbackConfig: RollbackConfig = {
  retentionDays: 7,
  backupDirectory: path.join(process.cwd(), 'backups'),
  backupSchedule: '0 0 * * *', // Daily at midnight
  components: {
    visionLake: true,
    authentication: true,
    agents: true,
    squadrons: true,
  },
  verification: {
    preRollbackChecks: true,
    postRollbackChecks: true,
    healthCheckTimeout: 60000, // 1 minute
  },
  authorization: {
    requiredAdminLevel: 3, // Senior admin level
    require2FA: true,
    notifyAdmins: true,
  },
  logging: {
    level: 'info',
    directory: path.join(process.cwd(), 'logs', 'rollbacks'),
    includeTimestamps: true,
  },
};

/**
 * Rollback metadata interface for tracking rollback operations
 */
export interface RollbackMetadata {
  /** Unique identifier for the rollback operation */
  id: string;
  
  /** Timestamp when the rollback was initiated */
  timestamp: number;
  
  /** Admin username who initiated the rollback */
  initiatedBy: string;
  
  /** Reason for the rollback */
  reason: string;
  
  /** The backup timestamp used for rollback */
  backupTimestamp: number;
  
  /** Components affected by the rollback */
  affectedComponents: Array<'agents' | 'visionLake' | 'authentication' | 'squadrons'>;
  
  /** Current status of the rollback operation */
  status: 'initiated' | 'in-progress' | 'completed' | 'failed';
  
  /** Error message if rollback failed */
  error?: string;
  
  /** Health check status after rollback */
  healthCheckPassed?: boolean;
}

/**
 * Get active rollback configuration
 * Merges provided config with default config
 */
export function getRollbackConfig(overrides?: Partial<RollbackConfig>): RollbackConfig {
  if (!overrides) {
    return defaultRollbackConfig;
  }
  
  return {
    ...defaultRollbackConfig,
    ...overrides,
    components: {
      ...defaultRollbackConfig.components,
      ...overrides.components,
    },
    verification: {
      ...defaultRollbackConfig.verification,
      ...overrides.verification,
    },
    authorization: {
      ...defaultRollbackConfig.authorization,
      ...overrides.authorization,
    },
    logging: {
      ...defaultRollbackConfig.logging,
      ...overrides.logging,
    },
  };
}

