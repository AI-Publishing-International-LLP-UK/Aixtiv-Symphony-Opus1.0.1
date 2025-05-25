import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Singleton pattern to ensure Firebase is only initialized once
let firebaseAdminApp;

/**
 * Initializes Firebase Admin SDK with appropriate credentials based on environment
 * @returns Firebase Admin app instance
 */
function initializeFirebaseAdmin() {
  const apps = getApps();
  
  // Return existing app if already initialized to prevent multiple initializations
  if (apps.length > 0) {
    return apps[0];
  }

  // In production environments (like Cloud Functions, App Engine, etc.)
  // Firebase Admin SDK will use the default GCP credentials
  if (process.env.NODE_ENV === 'production') {
    // Use the application default credentials in production
    return initializeApp({
      projectId: 'api-for-warp-drive',
    });
  } else {
    // In local development, we may need explicit credentials
    // Check for credentials path, otherwise try ADC
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    
    if (serviceAccountPath) {
      try {
        // If a service account file path is provided, use that
        const serviceAccount = require(serviceAccountPath);
        return initializeApp({
          credential: cert(serviceAccount),
          projectId: 'api-for-warp-drive',
        });
      } catch (error) {
        console.error('Error initializing Firebase Admin with service account:', error);
        throw error;
      }
    } else {
      // Try Application Default Credentials for local development
      console.warn('No service account path provided, trying application default credentials for local development');
      return initializeApp({
        projectId: 'api-for-warp-drive',
      });
    }
  }
}

// Initialize the app
if (!firebaseAdminApp) {
  firebaseAdminApp = initializeFirebaseAdmin();
}

// Export the initialized Firebase Admin services
export const adminFirestore = getFirestore(firebaseAdminApp);
export const adminAuth = getAuth(firebaseAdminApp);
export const adminStorage = getStorage(firebaseAdminApp);

export default {
  firestore: adminFirestore,
  auth: adminAuth,
  storage: adminStorage,
};

