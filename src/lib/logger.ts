/**
 * Logger module for Aixtiv Symphony Integration Gateway
 * 
 * This module provides a configured Winston logger with different settings for
 * development and production environments.
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment settings
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug');
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
const SERVICE_NAME = process.env.SERVICE_NAME || 'integration-gateway';

// Create logs directory if it doesn't exist (for production file transport)
if (NODE_ENV === 'production' && !fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Format for development console output (colorized and simplified)
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaString = Object.keys(meta).length > 0 
      ? `\n${JSON.stringify(meta, null, 2)}`
      : '';
    return `${timestamp} ${level}: ${message}${metaString}`;
  })
);

// Format for production (JSON with timestamps)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Define transports based on environment
const transports: winston.transport[] = [];

// Always add console transport with environment-specific format
transports.push(
  new winston.transports.Console({
    format: NODE_ENV === 'production' ? productionFormat : developmentFormat
  })
);

// Add file transports in production
if (NODE_ENV === 'production') {
  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: productionFormat
    })
  );
  
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: productionFormat
    })
  );
  
  // Specific Claude OAuth2 log file
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'claude-oauth2.log'),
      format: productionFormat,
      // Custom log filter to only include Claude OAuth2 related logs
      level: 'info'
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { 
    service: SERVICE_NAME,
    environment: NODE_ENV
  },
  transports
});

// Add child logger factory method
logger.child = (childMeta: Record<string, any>) => {
  return winston.createLogger({
    level: LOG_LEVEL,
    defaultMeta: { 
      ...logger.defaultMeta,
      ...childMeta
    },
    transports
  });
};

// Create child loggers for specific components
export const claudeAuthLogger = logger.child({ component: 'claude-oauth2' });
export const serverLogger = logger.child({ component: 'server' });
export const agentLogger = logger.child({ component: 'agent-manager' });

// Export the logger
export default logger;
