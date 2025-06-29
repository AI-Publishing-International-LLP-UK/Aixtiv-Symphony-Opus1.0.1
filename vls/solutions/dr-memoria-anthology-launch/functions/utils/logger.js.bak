/**
 * Dr. Memoria Integration Gateway - Logger Utility
 *
 * A sophisticated logging utility that handles different log levels,
 * structured logging, and context tracking across different gateway tiers.
 *
 * Features:
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR, FATAL)
 * - Structured logging with JSON output
 * - Context propagation across gateway tiers
 * - Performance tracking and timing
 * - Configurable outputs (console, file, external services)
 * - Correlation ID tracking for request tracing
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Log Levels with numeric values for comparison
 */
const LogLevel = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  FATAL: 50,

  // Helper to convert string to level
  fromString(level) {
    const upperLevel = level?.toUpperCase();
    return this[upperLevel] || this.INFO;
  },
};

/**
 * Gateway Tiers in the system
 */
const GatewayTier = {
  OWNER_SUBSCRIBER: 'owner_subscriber',
  TEAM: 'team',
  GROUP: 'group',
  PRACTITIONER: 'practitioner',
  ENTERPRISE: 'enterprise',
  SYSTEM: 'system', // For system-level logs
};

/**
 * Logger class for the Dr. Memoria integration gateway system
 */
class Logger {
  /**
   * Create a new Logger instance
   * @param {Object} options - Configuration options
   * @param {string} options.name - Logger name/component
   * @param {string} options.level - Minimum log level (default: INFO)
   * @param {boolean} options.console - Enable console output (default: true)
   * @param {boolean} options.file - Enable file output (default: false)
   * @param {string} options.filePath - Log file path (default: './logs')
   * @param {boolean} options.json - Output logs as JSON (default: true)
   * @param {string} options.tier - Gateway tier (default: SYSTEM)
   */
  constructor(options = {}) {
    this.name = options.name || 'unknown-component';
    this.minLevel = LogLevel.fromString(options.level) || LogLevel.INFO;
    this.enableConsole = options.console !== false;
    this.enableFile = options.file === true;
    this.filePath = options.filePath || './logs';
    this.jsonOutput = options.json !== false;
    this.tier = options.tier || GatewayTier.SYSTEM;

    // Initialize correlation ID for this logger instance
    this.correlationId = options.correlationId || this._generateCorrelationId();

    // Context tracking storage
    this.context = options.context || {};

    // Make sure log directory exists if file logging is enabled
    if (this.enableFile) {
      try {
        fs.mkdirSync(this.filePath, { recursive: true });
      } catch (error) {
        console.error(`Failed to create log directory: ${error.message}`);
        this.enableFile = false;
      }
    }
  }

  /**
   * Generate a unique correlation ID
   * @returns {string} Unique correlation ID
   * @private
   */
  _generateCorrelationId() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Check if a log level should be logged
   * @param {number} level - Log level to check
   * @returns {boolean} True if the level should be logged
   * @private
   */
  _shouldLog(level) {
    return level >= this.minLevel;
  }

  /**
   * Format a log message into a structured object
   * @param {number} level - Log level
   * @param {string} levelName - Log level name
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   * @returns {Object} Formatted log object
   * @private
   */
  _formatLog(level, levelName, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logObj = {
      timestamp,
      level: levelName,
      message,
      component: this.name,
      correlation_id: this.correlationId,
      tier: this.tier,
      ...this.context,
      ...data,
    };

    return logObj;
  }

  /**
   * Write a log entry to enabled outputs
   * @param {number} level - Log level
   * @param {string} levelName - Log level name
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   * @private
   */
  _write(level, levelName, message, data = {}) {
    if (!this._shouldLog(level)) {
      return;
    }

    const logObj = this._formatLog(level, levelName, message, data);

    // Console output
    if (this.enableConsole) {
      if (this.jsonOutput) {
        console.log(JSON.stringify(logObj));
      } else {
        let logFn = console.log;

        // Use appropriate console method based on level
        if (level >= LogLevel.ERROR) {
          logFn = console.error;
        } else if (level === LogLevel.WARN) {
          logFn = console.warn;
        } else if (level === LogLevel.DEBUG) {
          logFn = console.debug;
        }

        logFn(
          `[${logObj.timestamp}] [${logObj.level}] [${logObj.component}] [${logObj.tier}] [${logObj.correlation_id}] ${logObj.message}`
        );
      }
    }

    // File output
    if (this.enableFile) {
      const logFile = path.join(
        this.filePath,
        `${this.name}-${new Date().toISOString().split('T')[0]}.log`
      );
      const logLine = this.jsonOutput
        ? JSON.stringify(logObj)
        : `[${logObj.timestamp}] [${logObj.level}] [${logObj.component}] [${logObj.tier}] [${logObj.correlation_id}] ${logObj.message}`;

      fs.appendFileSync(logFile, logLine + '\n');
    }
  }

  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   * @returns {Logger} this instance for chaining
   */
  debug(message, data = {}) {
    this._write(LogLevel.DEBUG, 'DEBUG', message, data);
    return this;
  }

  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   * @returns {Logger} this instance for chaining
   */
  info(message, data = {}) {
    this._write(LogLevel.INFO, 'INFO', message, data);
    return this;
  }

  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   * @returns {Logger} this instance for chaining
   */
  warn(message, data = {}) {
    this._write(LogLevel.WARN, 'WARN', message, data);
    return this;
  }

  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {Error|Object} error - Error object or additional data
   * @returns {Logger} this instance for chaining
   */
  error(message, error = {}) {
    const errorData =
      error instanceof Error
        ? {
            error_name: error.name,
            error_message: error.message,
            error_stack: error.stack,
          }
        : error;

    this._write(LogLevel.ERROR, 'ERROR', message, errorData);
    return this;
  }

  /**
   * Log a fatal error message
   * @param {string} message - Log message
   * @param {Error|Object} error - Error object or additional data
   * @returns {Logger} this instance for chaining
   */
  fatal(message, error = {}) {
    const errorData =
      error instanceof Error
        ? {
            error_name: error.name,
            error_message: error.message,
            error_stack: error.stack,
          }
        : error;

    this._write(LogLevel.FATAL, 'FATAL', message, errorData);
    return this;
  }

  /**
   * Add context data to the logger
   * @param {Object} contextData - Context data to add
   * @returns {Logger} this instance for chaining
   */
  withContext(contextData) {
    this.context = {
      ...this.context,
      ...contextData,
    };
    return this;
  }

  /**
   * Clear all context data
   * @returns {Logger} this instance for chaining
   */
  clearContext() {
    this.context = {};
    return this;
  }

  /**
   * Create a child logger with inherited settings and additional context
   * @param {Object} childOptions - Child logger options
   * @returns {Logger} New child logger instance
   */
  child(childOptions = {}) {
    return new Logger({
      name: childOptions.name || this.name,
      level: childOptions.level || this.minLevel,
      console:
        childOptions.console !== undefined
          ? childOptions.console
          : this.enableConsole,
      file:
        childOptions.file !== undefined ? childOptions.file : this.enableFile,
      filePath: childOptions.filePath || this.filePath,
      json:
        childOptions.json !== undefined ? childOptions.json : this.jsonOutput,
      tier: childOptions.tier || this.tier,
      correlationId: this.correlationId, // Propagate the correlation ID
      context: {
        ...this.context,
        ...(childOptions.context || {}),
      },
    });
  }

  /**
   * Create a new logger for a specific gateway tier
   * @param {string} tier - Gateway tier
   * @param {Object} additionalContext - Additional context for the tier
   * @returns {Logger} New logger instance for the tier
   */
  forTier(tier, additionalContext = {}) {
    return this.child({
      tier,
      context: {
        ...additionalContext,
        tier_transition: `${this.tier} -> ${tier}`,
      },
    });
  }

  /**
   * Time an async operation and log its duration
   * @param {string} label - Operation label
   * @param {Function} fn - Async function to time
   * @param {Object} additionalData - Additional data to log
   * @returns {Promise<any>} Result of the async function
   */
  async time(label, fn, additionalData = {}) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(`${label} completed in ${duration}ms`, {
        operation: label,
        duration_ms: duration,
        ...additionalData,
      });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${label} failed after ${duration}ms`, {
        operation: label,
        duration_ms: duration,
        error,
        ...additionalData,
      });
      throw error;
    }
  }
}

/**
 * Factory function to create a logger instance
 * @param {Object} options - Logger options
 * @returns {Logger} New logger instance
 */
function createLogger(options = {}) {
  return new Logger(options);
}

// Default system logger
const systemLogger = createLogger({
  name: 'system',
  tier: GatewayTier.SYSTEM,
});

module.exports = {
  createLogger,
  systemLogger,
  LogLevel,
  GatewayTier,
  Logger,
};
