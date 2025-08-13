/**
 * Firebase Admin SDK Shim
 */

console.warn('[@asoos/firebase-shim] Firebase Admin shim is active. Replace with Cloudflare services.');

const adminApp = {
  initializeApp: () => ({ name: '[DEPRECATED-ADMIN]' }),
  credential: {
    cert: () => ({ type: '[DEPRECATED-CERT]' }),
    applicationDefault: () => ({ type: '[DEPRECATED-DEFAULT]' })
  },
  auth: () => ({
    verifyIdToken: () => Promise.reject(new Error('Firebase Admin Auth deprecated')),
    createCustomToken: () => Promise.reject(new Error('Firebase Admin Auth deprecated'))
  }),
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        get: () => Promise.reject(new Error('Firebase Admin Firestore deprecated')),
        set: () => Promise.reject(new Error('Firebase Admin Firestore deprecated'))
      })
    })
  })
};

module.exports = {
  initializeApp: adminApp.initializeApp,
  credential: adminApp.credential,
  auth: adminApp.auth,
  firestore: adminApp.firestore,
  default: adminApp
};
