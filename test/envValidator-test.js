const assert = require('assert');
const Module = require('module');

// Stub modules that are not installed
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'chalk') {
    return new Proxy({}, { get: () => (str) => str });
  }
  if (request === 'firebase-admin') {
    return {
      apps: [],
      initializeApp: () => {},
      credential: { cert: () => ({}), applicationDefault: () => ({}) },
      firestore: () => ({ collection: () => ({ add: async () => {} }) })
    };
  }
  return originalLoad(request, parent, isMain);
};

const { validateEnvironment } = require('../lib/utils/envValidator');

function setSampleEnv() {
  process.env.ANTHROPIC_API_KEY = 'sk-1234567890123456789012345678901234567';
  process.env.CLAUDE_API_ENDPOINT = 'https://api.anthropic.com';
  process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: 'my-project', apiKey: 'abcd1234' });
  process.env.AGENT_TRACKING_DB = 'us-west1/my-db';
  process.env.SALLYPORT_AUTH_TOKEN = 'abcdefghijklmnopqrstuvwxyz123456';
}

function clearSampleEnv() {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.CLAUDE_API_ENDPOINT;
  delete process.env.FIREBASE_CONFIG;
  delete process.env.AGENT_TRACKING_DB;
  delete process.env.SALLYPORT_AUTH_TOKEN;
}

function run() {
  setSampleEnv();
  const result = validateEnvironment(false);
  assert.strictEqual(result.isValid, true, 'Environment should be valid with sample vars');
  clearSampleEnv();
  console.log('envValidator test passed');
}

run();
