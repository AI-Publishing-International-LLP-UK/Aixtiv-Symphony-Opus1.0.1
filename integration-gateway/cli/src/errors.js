const winston = require('winston');

// Configure winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Base error class for all custom errors
class GoDaddyError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp
        };
    }
}

// API-related errors
class APIError extends GoDaddyError {
    constructor(message, statusCode, response) {
        super(message, 'API_ERROR', { statusCode, response });
        this.statusCode = statusCode;
        this.response = response;
    }

    static isRetryable(statusCode) {
        return [429, 500, 502, 503, 504].includes(statusCode);
    }
}

// Validation errors
class ValidationError extends GoDaddyError {
    constructor(message, invalidFields = {}) {
        super(message, 'VALIDATION_ERROR', { invalidFields });
        this.invalidFields = invalidFields;
    }
}

// Configuration errors
class ConfigurationError extends GoDaddyError {
    constructor(message, missingConfig = []) {
        super(message, 'CONFIG_ERROR', { missingConfig });
        this.missingConfig = missingConfig;
    }
}

// Rate limiting utility class
class RateLimiter {
    constructor(maxRequests = 50, timeWindow = 60000) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.requests = [];
    }

    async checkLimit() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        
        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = this.requests[0];
            const waitTime = this.timeWindow - (now - oldestRequest);
            throw new APIError('Rate limit exceeded', 429, { waitTime });
        }
        
        this.requests.push(now);
    }
}

// Error recovery strategies
const ErrorRecovery = {
    async retryWithBackoff(operation, maxRetries = 3, initialDelay = 1000) {
        let lastError;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (error instanceof APIError && APIError.isRetryable(error.statusCode)) {
                    const delay = initialDelay * Math.pow(2, attempt);
                    logger.warn(`Retry attempt ${attempt + 1}/${maxRetries}. Waiting ${delay}ms.`, {
                        error: error.toJSON()
                    });
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                
                throw error;
            }
        }
        
        throw lastError;
    },

    async withRateLimit(operation, rateLimiter) {
        await rateLimiter.checkLimit();
        return operation();
    }
};

// Error reporting utility
class ErrorReporter {
    static async reportError(error) {
        if (!(error instanceof GoDaddyError)) {
            error = new GoDaddyError(error.message, 'UNKNOWN_ERROR', {
                originalError: error.toString()
            });
        }

        logger.error('Error occurred', {
            error: error.toJSON(),
            stack: error.stack
        });

        // Add additional reporting methods here (e.g., error monitoring service)
    }

    static async handleError(error, context = {}) {
        await this.reportError(error);

        if (error instanceof APIError && error.statusCode === 429) {
            return {
                success: false,
                retryAfter: error.details.waitTime,
                message: 'Rate limit exceeded. Please try again later.'
            };
        }

        if (error instanceof ValidationError) {
            return {
                success: false,
                validationErrors: error.invalidFields,
                message: 'Validation failed. Please check your input.'
            };
        }

        if (error instanceof ConfigurationError) {
            return {
                success: false,
                missingConfig: error.missingConfig,
                message: 'Configuration error. Please check your settings.'
            };
        }

        return {
            success: false,
            message: 'An unexpected error occurred. Please try again later.',
            error: error.message
        };
    }
}

module.exports = {
    GoDaddyError,
    APIError,
    ValidationError,
    ConfigurationError,
    RateLimiter,
    ErrorRecovery,
    ErrorReporter,
    logger
};

