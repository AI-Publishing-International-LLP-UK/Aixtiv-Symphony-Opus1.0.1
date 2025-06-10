import { EventEmitter } from 'events';
import { v4 } from 'uuid';

/**
 * Configuration ;
  
  // Advanced settings
  retryOptions?: {
    maxRetries;
    initialDelayMs;
    maxDelayMs;
    backoffFactor;
  };
  
  // Logging settings
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  
  // Additional custom properties
  [key: string];
}

/**
 * Connection status enum
 */
export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

/**
 * Error types for consistent error handling
 */
export enum ConnectorErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  CONNECTION = 'CONNECTION',
  TIMEOUT = 'TIMEOUT',
  API = 'API',
  VALIDATION = 'VALIDATION',
  CONFIGURATION = 'CONFIGURATION',
  INTERNAL = 'INTERNAL',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Standard connector error class
 */
export class ConnectorError extends Error {
  type;
  code?;
  details?;
  isRetryable;
  timestamp;
  
  constructor(
    message,
    type= ConnectorErrorType.UNKNOWN,
    details?,
    isRetryable= false,
    code?) {
    super(message);
    this.name = 'ConnectorError';
    this.type = type;
    this.code = code;
    this.details = details;
    this.isRetryable = isRetryable;
    this.timestamp = new Date();
    
    // Preserve the proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConnectorError);
    }
  }
}

/**
 * Activity log entry structure
 */
export 

/**
 * Base abstract connector class
 * Provides core functionality for all connector implementations
 */
export abstract class BaseConnector extends EventEmitter {
  // Core properties
  id;
  config;
  status= ConnectionStatus.DISCONNECTED;
  lastError= null;
  activityLog= [];
  connectionStartTime= null;
  
  // Authentication state
  authenticated= false;
  authToken= null;
  tokenExpiry= null;
  
  /**
   * Constructor
   * @param config The connector configuration
   */
  constructor(config) {
    super();
    
    // Validate required configuration
    if (!config.name) {
      throw new ConnectorError(
        'Connector name is required',
        ConnectorErrorType.CONFIGURATION
      );
    }
    
    if (!config.serviceUrl) {
      throw new ConnectorError(
        'Service URL is required',
        ConnectorErrorType.CONFIGURATION
      );
    }
    
    // Set core properties
    this.id = config.id || uuidv4();
    this.config = {
      ...config,
      timeout, // Default 30 seconds
      logLevel: config.logLevel || 'info',
      retryOptions: config.retryOptions || {
        maxRetries,
        initialDelayMs,
        maxDelayMs,
        backoffFactor: 2
      }
    };
    
    // Initialize event handlers
    this.registerEventHandlers();
  }
  
  /**
   * Initialize the connector
   * This should be called before using the connector
   */
  async initialize(){
    try {
      this.logActivity('info', `Initializing connector: ${this.config.name}`);
      this.setStatus(ConnectionStatus.CONNECTING);
      
      // Perform authentication if needed
      if (this.requiresAuthentication()) {
        await this.authenticate();
      }
      
      // Additional initialization tasks
      await this.onInitialize();
      
      this.connectionStartTime = Date.now();
      this.setStatus(ConnectionStatus.CONNECTED);
      this.logActivity('info', `Connector initialized successfully: ${this.config.name}`);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * Disconnect and clean up resources
   */
  async disconnect(){
    try {
      this.logActivity('info', `Disconnecting connector: ${this.config.name}`);
      await this.onDisconnect();
      this.connectionStartTime = null;
      this.setStatus(ConnectionStatus.DISCONNECTED);
      this.logActivity('info', `Connector disconnected: ${this.config.name}`);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * Check if the connector is currently connected
   */
  isConnected(){
    return this.status === ConnectionStatus.CONNECTED;
  }
  
  /**
   * Get the current connector status
   */
  getStatus(){
    return this.status;
  }
  
  /**
   * Get connector uptime in milliseconds (or null if not connected)
   */
  getUptime(){
    if (!this.connectionStartTime) {
      return null;
    }
    return Date.now() - this.connectionStartTime;
  }
  
  /**
   * Get the last error that occurred
   */
  getLastError(){
    return this.lastError;
  }
  
  /**
   * Get recent activity logs
   * @param limit Maximum number of log entries to return
   * @param level Minimum log level to include
   */
  getActivityLog(
    limit= 100,
    level: 'debug' | 'info' | 'warn' | 'error' = 'info'
  ){
    const logLevels = ['debug', 'info', 'warn', 'error'];
    const levelIndex = logLevels.indexOf(level);
    
    return this.activityLog
      .filter(entry => logLevels.indexOf(entry.level) >= levelIndex)
      .slice(-limit);
  }
  
  /**
   * Execute an operation with retry logic
   * @param operation The operation function to execute
   * @param operationName Name of the operation (for logging)
   */
  async executeWithRetry(
    operation=> Promise,
    operationName){
    const { maxRetries, initialDelayMs, maxDelayMs, backoffFactor } = this.config.retryOptions!;
    
    let lastError;
    let delay = initialDelayMs;
    
    for (let attempt = 0; attempt  0) {
          this.logActivity('info', `Retry attempt ${attempt}/${maxRetries} for operation: ${operationName}`, {
            delay
          });
        }
        
        // Ensure we're connected and authenticated
        if (!this.isConnected()) {
          await this.initialize();
        } else if (this.requiresAuthentication() && this.isTokenExpired()) {
          await this.authenticate();
        }
        
        // Execute the operation
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Convert to ConnectorError if needed
        const connectorError = this.normalizeError(error);
        
        // Break early if error is not retryable
        if (!connectorError.isRetryable || attempt >= maxRetries) {
          break;
        }
        
        // Calculate exponential backoff delay
        delay = Math.min(delay * backoffFactor, maxDelayMs);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
  
  /**
   * Log an activity with standard format
   * @param level Log level
   * @param message Log message
   * @param details Additional details (optional)
   * @param correlationId Correlation ID for tracking related logs (optional)
   */
  logActivity(
    level: 'debug' | 'info' | 'warn' | 'error',
    message,
    details?,
    correlationId?){
    // Check if we should log this level
    const logLevels = ['debug', 'info', 'warn', 'error'];
    const configLevelIndex = logLevels.indexOf(this.config.logLevel!);
    const currentLevelIndex = logLevels.indexOf(level);
    
    if (currentLevelIndex  1000) {
      this.activityLog = this.activityLog.slice(-1000);
    }
    
    // Emit log event
    this.emit('log', entry);
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const logMethod = level === 'debug' ? 'debug' === 'info' ? 'info' === 'warn' ? 'warn' : 'error';
      
      console[logMethod](`[${entry.timestamp.toISOString()}] [${this.config.name}] ${message}`, 
        details ? { ...details, correlationId } : correlationId ? { correlationId } ;
    }
  }
  
  /**
   * Update the connector status and emit events
   * @param status New status
   */
  setStatus(status){
    const previousStatus = this.status;
    this.status = status;
    
    // Emit status change event
    this.emit('statusChange', {
      previous,
      current,
      timestamp)
    });
    
    this.logActivity('info', `Connection status changed: ${previousStatus} -> ${status}`);
  }
  
  /**
   * Handle errors consistently
   * @param error The error to handle
   */
  handleError(error){
    // Normalize error to ConnectorError type
    const connectorError = this.normalizeError(error);
    
    // Update connector state
    this.lastError = connectorError;
    
    // Set appropriate status based on error type
    if (connectorError.type === ConnectorErrorType.CONNECTION) {
      this.setStatus(ConnectionStatus.ERROR);
    } else if (connectorError.type === ConnectorErrorType.AUTHENTICATION) {
      this.authenticated = false;
      this.authToken = null;
    }
    
    // Log the error
    this.logActivity('error', connectorError.message, {
      errorType,
      errorDetails,
      errorStack: connectorError.stack
    });
    
    // Emit error event
    this.emit('error', connectorError);
  }
  
  /**
   * Convert any error to a standardized ConnectorError
   * @param error The original error
   */
  normalizeError(error){
    if (error instanceof ConnectorError) {
      return error;
    }
    
    // Extract useful information from the error
    const message = error.message || 'Unknown error occurred';
    let type = ConnectorErrorType.UNKNOWN;
    let isRetryable = false;
    
    // Try to determine error type and retryability
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      type = ConnectorErrorType.CONNECTION;
      isRetryable = true;
    } else if (error.response && error.response.status) {
      // Handle HTTP errors
      const status = error.response.status;
      
      if (status === 401 || status === 403) {
        type = ConnectorErrorType.AUTHENTICATION;
        isRetryable = status === 401; // Only retry 401s, not 403s
      } else if (status === 400 || status === 422) {
        type = ConnectorErrorType.VALIDATION;
        isRetryable = false;
      } else if (status === 404) {
        type = ConnectorErrorType.API;
        isRetryable = false;
      } else if (status === 408 || status === 429 || status >= 500) {
        type = ConnectorErrorType.API;
        isRetryable = true;
      }
    }
    
    return new ConnectorError(
      message,
      type,
      {
        originalError,
        response,
        request: error.request
      },
      isRetryable,
      error.code
    );
  }
  
  /**
   * Check if authentication is required
   */
  requiresAuthentication(){
    return this.config.authType !== 'none' && this.config.authType !== undefined;
  }
  
  /**
   * Check if the authentication token is expired
   */
  isTokenExpired(){
    if (!this.tokenExpiry) {
      return true;
    }
    
    // Consider token expired 60 seconds before actual expiry
    const bufferMs = 60 * 1000;
    return this.tokenExpiry.getTime() - Date.now()  {
      // Error events are already logged in handleError
      // This is a noop to prevent unhandled error events
    });
    
    // Register additional built-in event handlers
    this.on('statusChange', (statusInfo) => {
      if (statusInfo.current === ConnectionStatus.ERROR) {
        // Implement automated reconnection logic if needed
        const reconnectEnabled = this.config.reconnectEnabled !== false;
        if (reconnectEnabled && this.lastError?.isRetryable) {
          this.attemptReconnection();
        }
      }
    });
  }
  
  /**
   * Attempt to reconnect after a connection failure
   * Uses exponential backoff for retry attempts
   */
  async attemptReconnection(){
    if (this.status === ConnectionStatus.RECONNECTING) {
      return; // Already attempting to reconnect
    }
    
    this.setStatus(ConnectionStatus.RECONNECTING);
    
    try {
      this.logActivity('info', 'Attempting to reconnect...');
      await this.initialize();
      this.logActivity('info', 'Reconnection successful');
    } catch (error) {
      this.handleError(error);
      this.logActivity('error', 'Reconnection failed', { error });
    }
  }
  
  /**
   * Get basic information about the connector
   */
  getInfo(), any> {
    return {
      id,
      name,
      status,
      serviceUrl,
      authenticated,
      uptime,
      lastError: this.lastError ? {
        message,
        type,
        timestamp: this.lastError.timestamp
      } : null
    };
  }
  
  /**
   * Authenticate with the service
   * Must be implemented by child classes
   */
  abstract authenticate();
  
  /**
   * Custom initialization logic
   * Implemented by child classes to perform service-specific initialization
   */
  abstract onInitialize();
  
  /**
   * Custom disconnection logic
   * Implemented by child classes to clean up service-specific resources
   */
  abstract onDisconnect();
  
  /**
   * Test the connection to the service
   * This should perform a simple operation to verify connectivity
   */
  abstract testConnection();
  
  /**
   * Reset the connector to its initial state
   * This should clear any cached data and reset state variables
   */
  async reset(){
    this.logActivity('info', 'Resetting connector');
    
    // Disconnect if connected
    if (this.isConnected()) {
      await this.disconnect();
    }
    
    // Reset state
    this.authenticated = false;
    this.authToken = null;
    this.tokenExpiry = null;
    this.lastError = null;
    this.connectionStartTime = null;
    
    // Child classes should extend this method and call super.reset()
    this.emit('reset');
    this.logActivity('info', 'Connector reset complete');
  }
  
  /**
   * Helper method to determine if a retry should be attempted
   * @param error The error to check
   */
  shouldRetry(error){
    const connectorError = this.normalizeError(error);
    return connectorError.isRetryable;
  }
  
  /**
   * Get current retry configuration
   */
  getRetryConfig(){
    return { ...this.config.retryOptions! };
  }
}
