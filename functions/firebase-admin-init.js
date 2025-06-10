const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Initialize Secret Manager
const secretClient = new SecretManagerServiceClient();

/**
 * Initialize Firebase Admin SDK with proper configuration
 * Supports both local development and cloud deployment
 */
class FirebaseAdminInitializer {
  constructor() {
    this.isInitialized = false;
    this.projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'api-for-warp-drive';
    this.serviceAccount = null;
  }

  /**
   * Get service account from Google Secret Manager
   */
  async getServiceAccount() {
    try {
      const secretName = `projects/${this.projectId}/secrets/firebase-service-account/versions/latest`;
      const [version] = await secretClient.accessSecretVersion({ name: secretName });
      return JSON.parse(version.payload.data.toString());
    } catch (error) {
      console.warn('Could not load service account from Secret Manager:', error.message);
      return null;
    }
  }

  /**
   * Initialize Firebase Admin SDK
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('Firebase Admin SDK already initialized');
      return admin;
    }

    try {
      let credential;
      
      // Check if running in Google Cloud environment
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCLOUD_PROJECT) {
        console.log('Initializing with Application Default Credentials');
        credential = admin.credential.applicationDefault();
      } else {
        // Try to get service account from Secret Manager
        this.serviceAccount = await this.getServiceAccount();
        
        if (this.serviceAccount) {
          console.log('Initializing with service account from Secret Manager');
          credential = admin.credential.cert(this.serviceAccount);
        } else {
          console.log('Initializing with Application Default Credentials (fallback)');
          credential = admin.credential.applicationDefault();
        }
      }

      // Initialize Firebase Admin
      admin.initializeApp({
        credential: credential,
        projectId: this.projectId,
        storageBucket: `${this.projectId}.appspot.com`,
        databaseURL: `https://${this.projectId}-default-rtdb.firebaseio.com`
      });

      // Test the connection
      const db = getFirestore();
      await db.settings({ ignoreUndefinedProperties: true });
      
      this.isInitialized = true;
      console.log(`Firebase Admin SDK initialized successfully for project: ${this.projectId}`);
      
      return admin;
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
      throw new Error(`Firebase initialization failed: ${error.message}`);
    }
  }

  /**
   * Get Firestore instance
   */
  getFirestore() {
    if (!this.isInitialized) {
      throw new Error('Firebase Admin SDK not initialized. Call initialize() first.');
    }
    return getFirestore();
  }

  /**
   * Get Auth instance
   */
  getAuth() {
    if (!this.isInitialized) {
      throw new Error('Firebase Admin SDK not initialized. Call initialize() first.');
    }
    return getAuth();
  }

  /**
   * Get Storage instance
   */
  getStorage() {
    if (!this.isInitialized) {
      throw new Error('Firebase Admin SDK not initialized. Call initialize() first.');
    }
    return getStorage();
  }

  /**
   * Health check for Firebase services
   */
  async healthCheck() {
    try {
      const db = this.getFirestore();
      const testDoc = db.collection('_health').doc('test');
      await testDoc.set({ timestamp: admin.firestore.FieldValue.serverTimestamp() });
      await testDoc.delete();
      
      return {
        status: 'healthy',
        projectId: this.projectId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        projectId: this.projectId,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const firebaseInit = new FirebaseAdminInitializer();

// Export both the initializer and convenience functions
module.exports = {
  firebaseInit,
  
  // Initialize Firebase (async)
  initialize: () => firebaseInit.initialize(),
  
  // Get services (sync - requires initialization)
  getFirestore: () => firebaseInit.getFirestore(),
  getAuth: () => firebaseInit.getAuth(),
  getStorage: () => firebaseInit.getStorage(),
  
  // Health check
  healthCheck: () => firebaseInit.healthCheck(),
  
  // Direct access to admin SDK
  admin: admin,
  
  // Project configuration
  getProjectId: () => firebaseInit.projectId
};

