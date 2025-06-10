#!/usr/bin/env node

/**
 * Aixtiv Symphony Opus - Firestore Schema Seed Script
 * 
 * This script initializes the Firestore database with seed data for ASOOS.
 * It creates initial user and copilot data required for the application.
 * 
 * @module scripts/firestore/schema_seed
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

/**
 * Initialize Firebase Admin SDK if not already initialized
 * @returns {FirebaseFirestore.Firestore} Firestore database instance
 */
function initializeFirebase() {
  if (!admin.apps.length) {
    // Look for service account key in standard locations
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
      path.resolve(__dirname, '../../service-account-key.json');
    
    try {
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        // Fall back to application default credentials
        admin.initializeApp();
      }
    } catch (error) {
      console.warn('Using application default credentials:', error.message);
      admin.initializeApp();
    }
  }
  
  return admin.firestore();
}

/**
 * Seed the Firestore database with initial data
 * @async
 * @returns {Promise<void>}
 */
async function seedFirestore() {
  try {
    const db = initializeFirebase();
    console.log('Firebase initialized, seeding database...');
    
    // Create batch for atomic operations
    const batch = db.batch();
    
    // Prepare user document
    const userRef = db.collection('users').doc('00001');
    batch.set(userRef, {
      name: 'Mr. Phillip Corey Roark',
      email: 'pr@coaching2100.com',
      role: 'CEO / Principal',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Prepare copilot document
    const copilotRef = db.collection('copilots').doc('0001');
    batch.set(copilotRef, {
      name: 'QB Lucy',
      status: 'Active',
      assignedTo: '00001',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Commit the batch
    await batch.commit();
    console.log('✅ Firestore seeded successfully!');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error seeding Firestore:', error);
    return { success: false, error };
  }
}

// Execute if script is run directly
if (require.main === module) {
  seedFirestore()
    .then(result => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = {
  seedFirestore
};
