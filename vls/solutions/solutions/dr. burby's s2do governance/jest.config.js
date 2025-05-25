module.exports = {
  // Specify the test environment
  testEnvironment: 'node',
  
  // Transform TypeScript files with ts-jest
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  
  // File extensions to consider for tests
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Test pattern matching
  testMatch: ['**/__tests__/**/*.test.ts'],
  
  // Coverage reporting configuration
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
  ],
  
  // Root directory where Jest should scan for tests
  roots: ['<rootDir>'],
  
  // Mock setup
  setupFiles: [],
  
  // Module name mapping for handling imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  
  // Indicates whether each individual test should be reported during the run
  verbose: true,

  // Use fake timers
  fakeTimers: {
    enableGlobally: true,
  }
};

