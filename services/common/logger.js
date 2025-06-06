/**
 * Logger utility for MCP Authorization Service
 * Uses Winston for structured logging
 */

const winston = require('winston');

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'mcp-authorization-service',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add file transport for production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: '/var/log/mcp-auth-error.log',
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 5
  }));
  
  logger.add(new winston.transports.File({
    filename: '/var/log/mcp-auth-combined.log',
    maxsize: 10485760, // 10MB
    maxFiles: 5
  }));
}

// Add Google Cloud Logging for production
if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_CLOUD_PROJECT) {
  try {
    const { LoggingWinston } = require('@google-cloud/logging-winston');
    const cloudLogging = new LoggingWinston({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    logger.add(cloudLogging);
  } catch (error) {
    console.warn('Failed to initialize Google Cloud Logging:', error.message);
  }
}

module.exports = logger;

