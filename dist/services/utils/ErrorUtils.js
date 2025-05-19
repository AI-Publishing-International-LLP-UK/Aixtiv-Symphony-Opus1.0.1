/**
 * Error utilities for handling unknown error types in JavaScript
 */

/**
 * Checks if an object is an Error
 * @param {unknown} error - The object to check
 * @returns {boolean} True if the object is an Error instance
 */
function isError(error) {
  return error instanceof Error;
}

/**
 * Gets a safe error message from an unknown error
 * @param {unknown} error - The unknown error object
 * @returns {string} A string message from the error
 */
function getErrorMessage(error) {
  if (isError(error)) {
    return error.message;
  }
  
  // If it's not an Error but has a message property
  if (error !== null && 
      typeof error === 'object' && 
      'message' in error && 
      typeof error.message === 'string') {
    return error.message;
  }
  
  // Fallback to string representation
  return String(error);
}

/**
 * Creates a structured error object from an unknown error
 * Safe to use in logging or serialization
 * @param {unknown} error - The unknown error object
 * @returns {object} A structured object with error properties
 */
function formatError(error) {
  if (isError(error)) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  
  // If it's a plain object, try to maintain its structure
  if (error !== null && typeof error === 'object') {
    try {
      // Attempt to create a safe copy that can be stringified
      return JSON.parse(JSON.stringify(error));
    } catch {
      // If JSON serialization fails, return a basic object
      return { message: String(error) };
    }
  }
  
  // For primitive values
  return { message: String(error) };
}

/**
 * Wraps an async function to catch any errors and format them properly
 * @param {Function} fn - The async function to wrap
 * @param {Function} [errorHandler] - Optional error handler function
 * @returns {Function} A wrapped function that handles errors
 */
function withErrorHandling(fn, errorHandler) {
  return async function(...args) {
    try {
      return await fn(...args);
    } catch (error) {
      if (errorHandler) {
        errorHandler(error);
      }
      throw error;
    }
  };
}

module.exports = {
  isError,
  getErrorMessage,
  formatError,
  withErrorHandling
};

