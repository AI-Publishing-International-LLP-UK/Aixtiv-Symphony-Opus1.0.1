/**
 * @asoos/firebase-shim - Temporary Firebase Compatibility Layer
 * 
 * This shim provides minimal compatibility for Firebase imports during migration.
 * All methods are stubbed to prevent runtime errors while maintaining build compatibility.
 * 
 * WARNING: This is a temporary migration aid. Replace with Cloudflare equivalents ASAP.
 */

console.warn('[@asoos/firebase-shim] Firebase shim is active. Replace with Cloudflare services immediately.');

// Firebase App stub
const firebaseApp = {
  initializeApp: () => ({
    name: '[DEPRECATED]',
    options: {},
    delete: () => Promise.resolve()
  }),
  getApp: () => ({ name: '[DEPRECATED]' }),
  getApps: () => [],
  deleteApp: () => Promise.resolve()
};

// Firebase Auth stub
const firebaseAuth = {
  getAuth: () => ({
    currentUser: null,
    signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase Auth deprecated')),
    createUserWithEmailAndPassword: () => Promise.reject(new Error('Firebase Auth deprecated')),
    signOut: () => Promise.reject(new Error('Firebase Auth deprecated')),
    onAuthStateChanged: () => () => {}
  })
};

// Firebase Firestore stub
const firebaseFirestore = {
  getFirestore: () => ({
    collection: () => ({
      doc: () => ({
        get: () => Promise.reject(new Error('Firestore deprecated')),
        set: () => Promise.reject(new Error('Firestore deprecated')),
        update: () => Promise.reject(new Error('Firestore deprecated')),
        delete: () => Promise.reject(new Error('Firestore deprecated'))
      })
    })
  }),
  collection: () => firebaseFirestore.getFirestore().collection(),
  doc: () => firebaseFirestore.getFirestore().collection().doc(),
  addDoc: () => Promise.reject(new Error('Firestore deprecated')),
  setDoc: () => Promise.reject(new Error('Firestore deprecated')),
  getDoc: () => Promise.reject(new Error('Firestore deprecated')),
  updateDoc: () => Promise.reject(new Error('Firestore deprecated')),
  deleteDoc: () => Promise.reject(new Error('Firestore deprecated'))
};

// Export all Firebase functionality as deprecated stubs
module.exports = {
  // Firebase v9+ exports
  initializeApp: firebaseApp.initializeApp,
  getApp: firebaseApp.getApp,
  getApps: firebaseApp.getApps,
  deleteApp: firebaseApp.deleteApp,
  
  // Auth exports
  getAuth: firebaseAuth.getAuth,
  
  // Firestore exports
  getFirestore: firebaseFirestore.getFirestore,
  collection: firebaseFirestore.collection,
  doc: firebaseFirestore.doc,
  addDoc: firebaseFirestore.addDoc,
  setDoc: firebaseFirestore.setDoc,
  getDoc: firebaseFirestore.getDoc,
  updateDoc: firebaseFirestore.updateDoc,
  deleteDoc: firebaseFirestore.deleteDoc,
  
  // Legacy Firebase exports
  default: {
    initializeApp: firebaseApp.initializeApp,
    app: firebaseApp,
    auth: firebaseAuth,
    firestore: firebaseFirestore
  }
};
