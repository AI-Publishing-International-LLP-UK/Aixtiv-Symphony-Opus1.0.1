#!/usr/bin/env node

/**
 * Self-Updating Integration Gateway Manager
 * 
 * Automatically monitors and updates integration gateway configurations
 * based on environment changes, credential updates, and system status.
 */

'use strict';

const fs = require('fs').promises;
const path = require('path');
const { execSync, exec } = require('child_process');
const axios = require('axios');
const crypto = require('crypto');
const winston = require('winston');
const chokidar = require('chokidar');
const dotenv = require('dotenv');
const cron = require('node-cron');

// Load environment variables
dotenv.config();

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'integration-gateway-manager.log' })
  ]
});

// Configuration
const config = {
  integrationDir: process.env.INTEGRATION_DIR || 'as/asoos/integration-gateway',
  credentialsFile: process.env.CREDENTIALS_FILE || './secure-credentials.json',
  envFile: process.env.ENV_FILE || './.env',
  updateInterval: parseInt(process.env.INTEGRATION_GATEWAY_UPDATE_INTERVAL || '3600000', 10), // 1 hour by default
  autoUpdate: process.env.INTEGRATION_GATEWAY_AUTO_UPDATE === 'true',
  notifyUpdates: process.env.INTEGRATION_GATEWAY_NOTIFY_UPDATES === 'true',
  configScriptPath: process.env.CONFIG_SCRIPT_PATH || './day1-integration-gateway-config.sh',
  validationScriptPath: process.env.VALIDATION_SCRIPT_PATH || './day1-integration-gateway-validation.sh',
  // Endpoint configurations
  endpoints: {
    dreamCommander: process.env.DREAM_COMMANDER_ENDPOINT || 'https://api.dreamcommand.live',
    visionLake: process.env.VISION_LAKE_ENDPOINT || 'https://api.visionlake.live',
    serpew: process.env.SERPEW_ENDPOINT || 'https://api.serpew.live/v1',
    hobmdiho: process.env.HOBMDIHO_ENDPOINT || 'https://api.hobmdiho.live/v2'
  },
  // Notification settings
  notifications: {
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_NOTIFICATION_CHANNEL || '#integration-gateway'
    },
    email: {
      enabled: process.env.EMAIL_NOTIFICATIONS === 'true',
      recipient: process.env.NOTIFICATION_EMAIL || 'admin@coaching2100.com'
    }
  }
};

/**
 * Integration Gateway Manager
 * Handles automatic updates and monitoring of integration configurations
 */
class IntegrationGatewayManager {
  constructor() {
    this.lastUpdateTime = null;
    this.configHashes = {};
    this.watchers = {};
    this.healthCheckStatus = {};
    this.updateSchedule = null;
  }

  /**
   * Initialize the Integration Gateway Manager
   */
  async initialize() {
    try {
      logger.info('Initializing Integration Gateway Manager');
      
      // Check if integration directory exists
      await this.checkDirectoryExists(config.integrationDir);
      
      // Check if credentials file exists
      await this.checkFileExists(config.credentialsFile);
      
      // Load initial configuration hashes
      await this.calculateConfigHashes();
      
      // Set up file watchers if auto-update is enabled
      if (config.autoUpdate) {
        this.setupFileWatchers();
        this.setupUpdateSchedule();
      }
      
      // Perform initial health checks
      await this.performHealthChecks();
      
      logger.info('Integration Gateway Manager initialized successfully');
      return true;
    } catch (error) {
      logger.error(`Initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a directory exists
   * @param {string} dir Directory path
   */
  async checkDirectoryExists(dir) {
    try {
      const stats = await fs.stat(dir);
      
      if (!stats.isDirectory()) {
        throw new Error(`${dir} exists but is not a directory`);
      }
      
      logger.info(`Directory found: ${dir}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(`Directory ${dir} not found, creating it`);
        await fs.mkdir(dir, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  /**
   * Check if a file exists
   * @param {string} file File path
   */
  async checkFileExists(file) {
    try {
      await fs.access(file, fs.constants.R_OK);
      logger.info(`File found: ${file}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.error(`Required file ${file} not found`);
        throw new Error(`Required file ${file} not found`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Calculate hashes for all configuration files
   */
  async calculateConfigHashes() {
    logger.info('Calculating configuration file hashes');
    
    // Get all configuration files
    const files = await this.getConfigFiles();
    
    // Calculate hash for each file
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const hash = crypto.createHash('md5').update(content).digest('hex');
        this.configHashes[file] = hash;
      } catch (error) {
        logger.warn(`Could not calculate hash for ${file}: ${error.message}`);
      }
    }
    
    logger.info(`Calculated hashes for ${Object.keys(this.configHashes).length} files`);
  }

  /**
   * Get all configuration files
   * @returns {Promise<Array<string>>} List of configuration file paths
   */
  async getConfigFiles() {
    const files = [];
    
    // Get all JSON files in the config directory
    const configDir = path.join(config.integrationDir, 'config');
    try {
      const configFiles = await fs.readdir(configDir);
      
      for (const file of configFiles) {
        if (file.endsWith('.json') || file.endsWith('.js') || file.endsWith('.env')) {
          files.push(path.join(configDir, file));
        }
      }
    } catch (error) {
      logger.warn(`Could not read config directory: ${error.message}`);
    }
    
    // Get environment file
    if (config.envFile) {
      files.push(config.envFile);
    }
    
    // Get credentials file
    files.push(config.credentialsFile);
    
    return files;
  }

  /**
   * Set up file watchers for automatic updates
   */
  setupFileWatchers() {
    logger.info('Setting up file watchers for automatic updates');
    
    // Watch .env file for changes
    this.watchers.env = chokidar.watch(config.envFile, {
      persistent: true,
      ignoreInitial: true
    });
    
    this.watchers.env.on('change', () => {
      logger.info(`Environment file ${config.envFile} changed, triggering update`);
      this.updateConfigurations();
    });
    
    // Watch credentials file for changes
    this.watchers.credentials = chokidar.watch(config.credentialsFile, {
      persistent: true,
      ignoreInitial: true
    });
    
    this.watchers.credentials.on('change', () => {
      logger.info(`Credentials file ${config.credentialsFile} changed, triggering update`);
      this.updateConfigurations();
    });
    
    logger.info('File watchers set up successfully');
  }

  /**
   * Set up scheduled updates
   */
  setupUpdateSchedule() {
    logger.info(`Setting up scheduled updates every ${config.updateInterval / 60000} minutes`);
    
    // Schedule updates using node-cron
    // Run every hour by default
    this.updateSchedule = cron.schedule('0 * * * *', () => {
      logger.info('Scheduled update triggered');
      this.updateConfigurations();
    });
    
    logger.info('Update schedule set up successfully');
  }

  /**
   * Update integration gateway configurations
   */
  async updateConfigurations() {
    logger.info('Updating integration gateway configurations');
    
    try {
      // Reload environment variables
      dotenv.config();
      
      // Run the configuration script
      logger.info(`Running configuration script: ${config.configScriptPath}`);
      execSync(`bash ${config.configScriptPath}`, { stdio: 'inherit' });
      
      // Validate the configuration
      logger.info(`Running validation script: ${config.validationScriptPath}`);
      execSync(`bash ${config.validationScriptPath}`, { stdio: 'inherit' });
      
      // Update configuration hashes
      await this.calculateConfigHashes();
      
      // Update timestamp
      this.lastUpdateTime = new Date();
      
      // Send notification if enabled
      if (config.notifyUpdates) {
        this.sendUpdateNotification('Integration gateway configurations updated successfully');
      }
      
      logger.info('Configurations updated successfully');
      return true;
    } catch (error) {
      logger.error(`Configuration update failed: ${error.message}`);
      
      // Send notification for failure
      if (config.notifyUpdates) {
        this.sendUpdateNotification(`Configuration update failed: ${error.message}`, true);
      }
      
      throw error;
    }
  }

  /**
   * Perform health checks on all integration endpoints
   */
  async performHealthChecks() {
    logger.info('Performing health checks on integration endpoints');
    
    const results = {};
    
    // Check each endpoint
    for (const [name, url] of Object.entries(config.endpoints)) {
      try {
        logger.info(`Checking endpoint: ${name} (${url})`);
        
        // Add a health check path if not already present
        const healthUrl = url.endsWith('/') ? `${url}health` : `${url}/health`;
        
        const response = await axios.get(healthUrl, {
          timeout: 5000,
          validateStatus: null // Accept any status code
        });
        
        if (response.status >= 200 && response.status < 300) {
          results[name] = {
            status: 'healthy',
            statusCode: response.status,
            responseTime: response.headers['x-response-time'] || 'unknown'
          };
        } else {
          results[name] = {
            status: 'unhealthy',
            statusCode: response.status,
            message: `Unexpected status code: ${response.status}`
          };
        }
      } catch (error) {
        results[name] = {
          status: 'error',
          message: error.message
        };
      }
    }
    
    // Update health check status
    this.healthCheckStatus = {
      timestamp: new Date(),
      results
    };
    
    // Log results
    const healthyCount = Object.values(results).filter(r => r.status === 'healthy').length;
    const totalCount = Object.keys(results).length;
    
    logger.info(`Health check complete: ${healthyCount}/${totalCount} endpoints healthy`);
    
    // Send notification if any endpoints are unhealthy
    if (healthyCount < totalCount && config.notifyUpdates) {
      const unhealthyEndpoints = Object.entries(results)
        .filter(([_, result]) => result.status !== 'healthy')
        .map(([name, _]) => name)
        .join(', ');
      
      this.sendUpdateNotification(`Health check detected unhealthy endpoints: ${unhealthyEndpoints}`, true);
    }
    
    return this.healthCheckStatus;
  }

  /**
   * Send a notification about updates or issues
   * @param {string} message The notification message
   * @param {boolean} isError Whether this is an error notification
   */
  async sendUpdateNotification(message, isError = false) {
    logger.info(`Sending notification: ${message}`);
    
    // Send Slack notification if configured
    if (config.notifications.slack.webhookUrl) {
      try {
        await axios.post(config.notifications.slack.webhookUrl, {
          channel: config.notifications.slack.channel,
          username: 'Integration Gateway',
          icon_emoji: isError ? ':warning:' : ':white_check_mark:',
          text: `${isError ? ':warning: *ERROR*' : ':white_check_mark: *INFO*'}: ${message}`
        });
      } catch (error) {
        logger.error(`Failed to send Slack notification: ${error.message}`);
      }
    }
    
    // Additional notification methods could be added here (email, etc.)
  }

  /**
   * Get the current status of the Integration Gateway Manager
   * @returns {Object} Current status
   */
  getStatus() {
    return {
      initialized: this.lastUpdateTime !== null,
      lastUpdateTime: this.lastUpdateTime,
      monitoredFiles: Object.keys(this.configHashes).length,
      autoUpdateEnabled: config.autoUpdate,
      notificationsEnabled: config.notifyUpdates,
      healthStatus: this.healthCheckStatus
    };
  }

  /**
   * Shut down the Integration Gateway Manager
   */
  shutdown() {
    logger.info('Shutting down Integration Gateway Manager');
    
    // Close file watchers
    if (this.watchers.env) {
      this.watchers.env.close();
    }
    
    if (this.watchers.credentials) {
      this.watchers.credentials.close();
    }
    
    // Stop update schedule
    if (this.updateSchedule) {
      this.updateSchedule.stop();
    }
    
    logger.info('Integration Gateway Manager shut down successfully');
  }
}

// Export the Integration Gateway Manager class
module.exports = IntegrationGatewayManager;

/**
 * Execute when run directly
 */
if (require.main === module) {
  // Create an instance of the manager
  const manager = new IntegrationGatewayManager();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];
  
  // Handle commands
  switch (command) {
    case 'start':
      manager.initialize()
        .then(() => {
          console.log('Integration Gateway Manager started successfully');
        })
        .catch(error => {
          console.error('Failed to start Integration Gateway Manager:', error);
          process.exit(1);
        });
      break;
      
    case 'update':
      manager.initialize()
        .then(() => manager.updateConfigurations())
        .then(() => {
          console.log('Integration Gateway configurations updated successfully');
          process.exit(0);
        })
        .catch(error => {
          console.error('Failed to update configurations:', error);
          process.exit(1);
        });
      break;
      
    case 'status':
      manager.initialize()
        .then(() => {
          console.log('Current status:', JSON.stringify(manager.getStatus(), null, 2));
          process.exit(0);
        })
        .catch(error => {
          console.error('Failed to get status:', error);
          process.exit(1);
        });
      break;
      
    case 'check-health':
      manager.initialize()
        .then(() => manager.performHealthChecks())
        .then(result => {
          console.log('Health check results:', JSON.stringify(result, null, 2));
          process.exit(0);
        })
        .catch(error => {
          console.error('Failed to perform health checks:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log(`
Integration Gateway Manager

Usage:
  node integration-gateway-manager.js [command]

Commands:
  start         Start the Integration Gateway Manager
  update        Update all configurations immediately
  status        Show current status
  check-health  Perform health checks on all endpoints
`);
      break;
  }
}
