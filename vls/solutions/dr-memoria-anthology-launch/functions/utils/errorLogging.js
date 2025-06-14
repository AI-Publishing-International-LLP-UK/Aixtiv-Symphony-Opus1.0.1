const winston = require('winston');
const { format } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${message}${stack ? '\n' + stack : ''}`;
});

// Create a logger with multiple transports
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    colorize(),
    logFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),

    // File transport for errors
    new winston.transports.File({
      filename: process.env.LOG_DIRECTORY
        ? `${process.env.LOG_DIRECTORY}/error.log`
        : './logs/error.log',
      level: 'error',
    }),

    // File transport for combined logs
    new winston.transports.File({
      filename: process.env.LOG_DIRECTORY
        ? `${process.env.LOG_DIRECTORY}/combined.log`
        : './logs/combined.log',
    }),
  ],
});

// Custom error handling class
class DrMemoriaError extends Error {
  constructor(
    message,
    code = 'INTERNAL_ERROR',
    details = {},
    httpStatus = null
  ) {
    super(message);
    this.name = 'DrMemoriaError';
    this.code = code;
    this.details = details;
    this.httpStatus = httpStatus;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  // Log the error with additional context
  log() {
    logger.error(this.message, {
      code: this.code,
      details: this.details,
      stack: this.stack,
    });
    return this;
  }

  // Convert to a standardized error response
  toResponse() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

// Error handling middleware for Firebase Functions
function errorHandler(fn) {
  return async (data, context) => {
    try {
      return await fn(data, context);
    } catch (error) {
      // Log the original error
      logger.error('Unhandled function error', {
        error: error,
        data,
        context,
      });

      // Transform to Dr. Memoria Error if not already
      const drError =
        error instanceof DrMemoriaError
          ? error
          : new DrMemoriaError(error.message, 'UNHANDLED_ERROR', {
              originalError: error.toString(),
            });

      // Log the error
      drError.log();

      // Throw as Firebase Functions error
      // Map error code to Firebase error type
      let fbErrorType = 'unknown';

      // Map specific error types to Firebase error types
      switch (drError.code) {
        case ERROR_TYPES.AUTHENTICATION_ERROR:
        case ERROR_TYPES.TOKEN_EXPIRED:
        case ERROR_TYPES.UNAUTHORIZED_ACCESS:
          fbErrorType = 'unauthenticated';
          break;
        case ERROR_TYPES.PERMISSION_DENIED:
          fbErrorType = 'permission-denied';
          break;
        case ERROR_TYPES.VALIDATION_ERROR:
        case ERROR_TYPES.INVALID_INPUT_FORMAT:
        case ERROR_TYPES.MISSING_REQUIRED_FIELD:
        case ERROR_TYPES.AI_CONTRIBUTION_EXCEEDED:
        case ERROR_TYPES.HARMFUL_CONTENT_DETECTED:
        case ERROR_TYPES.POLITICAL_CONTENT_DETECTED:
          fbErrorType = 'invalid-argument';
          break;
        case ERROR_TYPES.RESOURCE_NOT_FOUND:
          fbErrorType = 'not-found';
          break;
        case ERROR_TYPES.RESOURCE_ALREADY_EXISTS:
          fbErrorType = 'already-exists';
          break;
        case ERROR_TYPES.API_RATE_LIMIT_EXCEEDED:
          fbErrorType = 'resource-exhausted';
          break;
        case ERROR_TYPES.INTERNAL_ERROR:
        case ERROR_TYPES.DATABASE_ERROR:
        case ERROR_TYPES.CONTENT_PROCESSING_ERROR:
        case ERROR_TYPES.CERTIFICATION_ERROR:
          fbErrorType = 'internal';
          break;
        case ERROR_TYPES.EXTERNAL_SERVICE_ERROR:
        case ERROR_TYPES.BLOCKCHAIN_ERROR:
        case ERROR_TYPES.PLATFORM_CONNECTION_ERROR:
          fbErrorType = 'unavailable';
          break;
        default:
          fbErrorType = 'unknown';
      }

      throw new functions.https.HttpsError(
        fbErrorType,
        drError.message,
        drError.details
      );
    }
  };
}

// Error types
const ERROR_TYPES = {
  // Authentication and Authorization
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',

  // Data Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT_FORMAT: 'INVALID_INPUT_FORMAT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource Management
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',

  // Content Processing
  CONTENT_PROCESSING_ERROR: 'CONTENT_PROCESSING_ERROR',
  CONTENT_TOO_LARGE: 'CONTENT_TOO_LARGE',
  CONTENT_FORMAT_UNSUPPORTED: 'CONTENT_FORMAT_UNSUPPORTED',
  AI_CONTRIBUTION_EXCEEDED: 'AI_CONTRIBUTION_EXCEEDED',
  HARMFUL_CONTENT_DETECTED: 'HARMFUL_CONTENT_DETECTED',
  POLITICAL_CONTENT_DETECTED: 'POLITICAL_CONTENT_DETECTED',

  // Blockchain Integration
  BLOCKCHAIN_ERROR: 'BLOCKCHAIN_ERROR',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  CONTRACT_EXECUTION_ERROR: 'CONTRACT_EXECUTION_ERROR',
  WALLET_CONNECTION_ERROR: 'WALLET_CONNECTION_ERROR',

  // Certification
  CERTIFICATION_ERROR: 'CERTIFICATION_ERROR',
  CERTIFICATION_VERIFICATION_FAILED: 'CERTIFICATION_VERIFICATION_FAILED',
  QR_CODE_GENERATION_ERROR: 'QR_CODE_GENERATION_ERROR',

  // Publishing
  PUBLISHING_ERROR: 'PUBLISHING_ERROR',
  PLATFORM_CONNECTION_ERROR: 'PLATFORM_CONNECTION_ERROR',
  CONTENT_REJECTION_ERROR: 'CONTENT_REJECTION_ERROR',

  // External Services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  API_RATE_LIMIT_EXCEEDED: 'API_RATE_LIMIT_EXCEEDED',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
};

// Error category mapping for HTTP status codes
const ERROR_CATEGORIES = {
  AUTHENTICATION: {
    statusCode: 401,
    codes: [
      ERROR_TYPES.AUTHENTICATION_ERROR,
      ERROR_TYPES.TOKEN_EXPIRED,
      ERROR_TYPES.UNAUTHORIZED_ACCESS,
    ],
  },
  AUTHORIZATION: {
    statusCode: 403,
    codes: [ERROR_TYPES.PERMISSION_DENIED],
  },
  VALIDATION: {
    statusCode: 400,
    codes: [
      ERROR_TYPES.VALIDATION_ERROR,
      ERROR_TYPES.INVALID_INPUT_FORMAT,
      ERROR_TYPES.MISSING_REQUIRED_FIELD,
      ERROR_TYPES.CONTENT_TOO_LARGE,
      ERROR_TYPES.CONTENT_FORMAT_UNSUPPORTED,
      ERROR_TYPES.AI_CONTRIBUTION_EXCEEDED,
      ERROR_TYPES.HARMFUL_CONTENT_DETECTED,
      ERROR_TYPES.POLITICAL_CONTENT_DETECTED,
    ],
  },
  NOT_FOUND: {
    statusCode: 404,
    codes: [ERROR_TYPES.RESOURCE_NOT_FOUND],
  },
  CONFLICT: {
    statusCode: 409,
    codes: [ERROR_TYPES.RESOURCE_ALREADY_EXISTS, ERROR_TYPES.RESOURCE_LOCKED],
  },
  EXTERNAL: {
    statusCode: 502,
    codes: [
      ERROR_TYPES.EXTERNAL_SERVICE_ERROR,
      ERROR_TYPES.API_RATE_LIMIT_EXCEEDED,
      ERROR_TYPES.EXTERNAL_API_ERROR,
      ERROR_TYPES.BLOCKCHAIN_ERROR,
      ERROR_TYPES.TRANSACTION_FAILED,
      ERROR_TYPES.CONTRACT_EXECUTION_ERROR,
      ERROR_TYPES.WALLET_CONNECTION_ERROR,
      ERROR_TYPES.PLATFORM_CONNECTION_ERROR,
    ],
  },
  INTERNAL: {
    statusCode: 500,
    codes: [
      ERROR_TYPES.INTERNAL_ERROR,
      ERROR_TYPES.DATABASE_ERROR,
      ERROR_TYPES.NETWORK_ERROR,
      ERROR_TYPES.TIMEOUT_ERROR,
      ERROR_TYPES.CONTENT_PROCESSING_ERROR,
      ERROR_TYPES.CERTIFICATION_ERROR,
      ERROR_TYPES.CERTIFICATION_VERIFICATION_FAILED,
      ERROR_TYPES.QR_CODE_GENERATION_ERROR,
      ERROR_TYPES.PUBLISHING_ERROR,
      ERROR_TYPES.CONTENT_REJECTION_ERROR,
    ],
  },
};

// Helper function to get the appropriate HTTP status code for an error type
function getStatusCodeForErrorType(errorType) {
  for (const category in ERROR_CATEGORIES) {
    if (ERROR_CATEGORIES[category].codes.includes(errorType)) {
      return ERROR_CATEGORIES[category].statusCode;
    }
  }
  return 500; // Default to internal server error
}

// Enhanced error handler with proper status code mapping
function httpErrorHandler(fn) {
  return async (req, res) => {
    try {
      return await fn(req, res);
    } catch (error) {
      // Log the original error
      logger.error('Unhandled HTTP error', {
        error: error,
        path: req.path,
        method: req.method,
      });

      // Transform to Dr. Memoria Error if not already
      const drError =
        error instanceof DrMemoriaError
          ? error
          : new DrMemoriaError(error.message, 'INTERNAL_ERROR', {
              originalError: error.toString(),
            });

      // Log the error
      drError.log();

      // Get appropriate status code
      const statusCode = getStatusCodeForErrorType(drError.code);

      // Send formatted response
      return res.status(statusCode).json(drError.toResponse());
    }
  };
}

module.exports = {
  logger,
  DrMemoriaError,
  errorHandler,
  httpErrorHandler,
  ERROR_TYPES,
  getStatusCodeForErrorType,
};
