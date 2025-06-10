/**
 * Jest configuration for Integration Gateway tests
 * This config ensures compatibility with CommonJS modules
 */

module.exports = {
  // Use Node.js environment for tests
  testEnvironment: 'node',
  
  // Specify test file pattern
  testMatch: ['**/test/**/*.test.js'],
  
  // Specify transformation patterns
  transformIgnorePatterns: [
    '/node_modules/(?!chai|sinon).+\\.js$'
  ],
  
  // Reset mocks between tests
  clearMocks: true,
  
  // Show verbose test output
  verbose: true,
  
  // Set test timeout
  testTimeout: 10000,
  
  // Ensure compatibility with CommonJS
  moduleFileExtensions: ['js', 'json', 'node'],
  
  // Stop watching for changes after tests run
  watchman: false
};

