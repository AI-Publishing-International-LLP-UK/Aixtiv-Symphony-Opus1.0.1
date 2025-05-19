/**
 * Mock implementation of winston for testing
 * Prevents actual logging to files or console during tests
 */

// Create mock transport class
class Transport {
  constructor(options = {}) {
    this.options = options;
  }
}

// Create mock format functions
const format = {
  combine: (...args) => ({ formats: args }),
  timestamp: (options = {}) => ({ timestamp: true, options }),
  printf: (templateFn) => ({ printf: true, templateFn }),
  colorize: (options = {}) => ({ colorize: true, options }),
  json: () => ({ json: true }),
  simple: () => ({ simple: true }),
  prettyPrint: () => ({ prettyPrint: true }),
};

// Create mock transports
const transports = {
  Console: Transport,
  File: Transport,
};

// Create mock log functions
const createLoggerMock = () => {
  // Create basic logger object with common methods
  const logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    http: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn()
  };
  
  return logger;
};

// Create winston mock API
const winston = {
  format,
  transports,
  createLogger: jest.fn().mockImplementation((options = {}) => createLoggerMock()),
  addColors: jest.fn(),
  loggers: {
    add: jest.fn(),
    get: jest.fn()
  }
};

module.exports = winston;

