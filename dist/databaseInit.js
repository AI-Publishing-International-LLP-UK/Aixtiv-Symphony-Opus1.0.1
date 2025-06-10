/**
 * Database Initialization Module
 * 
 * Handles initialization of database connections for Firebase, Firestore, and Pinecone.
 */

import admin from 'firebase-admin';
import { PineconeClient } from '@pinecone-database/pinecone';
import { logger } from './utils/logger';

export async function initializeFirebase() {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }

    const firestore = admin.firestore();
    logger.info('Firebase and Firestore initialized successfully');
    return firestore;
  } catch (error) {
    logger.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

export async function initializePinecone() {
  try {
    const pinecone = new PineconeClient();
    await pinecone.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT
    });

    logger.info('Pinecone initialized successfully');
    return pinecone;
  } catch (error) {
    logger.error('Failed to initialize Pinecone:', error);
    throw error;
  }
}

export async function initializeDatabases() {
  const firestore = await initializeFirebase();
  const pinecone = await initializePinecone();

  return {
    firestore,
    pinecone
  };
}

/**
 * Note: This configuration properly uses NoSQL databases (Firestore, Pinecone, and Firebase)
 * instead of PostgreSQL. The Redis instance is retained for caching purposes,
 * which is still useful with NoSQL architectures.
 */
