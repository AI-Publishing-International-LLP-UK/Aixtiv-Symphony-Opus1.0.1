/**
 * Database Client
 * 
 * This file exports the Firestore client for database operations.
 */

import { firestore, FirestoreClient } from './prisma/firestore-client';

// Export the Firestore client
export const db = firestore;
export type DBClient = FirestoreClient;

// Log that we're using Firestore
console.log('Using Firestore client for database operations');

// Export as default for simpler imports
export default db;
