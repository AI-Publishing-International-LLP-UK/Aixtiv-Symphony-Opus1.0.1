/**
 * Firebase Functions SDK Shim
 */

console.warn('[@asoos/firebase-shim] Firebase Functions shim is active. Replace with Cloudflare Workers.');

const functionsStub = {
  https: {
    onRequest: () => {
      throw new Error('Firebase Functions deprecated - use Cloudflare Workers');
    },
    onCall: () => {
      throw new Error('Firebase Functions deprecated - use Cloudflare Workers');
    }
  },
  firestore: {
    document: () => ({
      onCreate: () => {
        throw new Error('Firebase Functions deprecated - use Cloudflare Workers');
      },
      onUpdate: () => {
        throw new Error('Firebase Functions deprecated - use Cloudflare Workers');
      },
      onDelete: () => {
        throw new Error('Firebase Functions deprecated - use Cloudflare Workers');
      }
    })
  },
  auth: {
    user: () => ({
      onCreate: () => {
        throw new Error('Firebase Functions deprecated - use Cloudflare Workers');
      },
      onDelete: () => {
        throw new Error('Firebase Functions deprecated - use Cloudflare Workers');
      }
    })
  },
  region: () => functionsStub
};

module.exports = functionsStub;
