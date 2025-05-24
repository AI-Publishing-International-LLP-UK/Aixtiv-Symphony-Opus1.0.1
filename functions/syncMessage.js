/**
 * Aixtiv CLI Owner-Subscriber V1-V2 Immersive System
 * Firebase Cloud Functions - Message Synchronization
 * 
 * This file contains functions for synchronizing user messages with Firestore.
 * 
 * @module functions/syncMessage
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

const { https } = require('firebase-functions/v1');
const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');
const db = admin.firestore();

/**
 * Synchronizes user messages with Firestore
 * 
 * @function syncMessage
 * @param {Object} data - The function payload
 * @param {string} data.userId - The user ID
 * @param {string} data.message - The message content
 * @param {Object} context - The function context
 * @returns {Object} Response with status and timestamp
 */
exports.syncMessage = https.onCall(async (data, context) => {
  const { userId, message } = data;
  const timestamp = new Date().toISOString();
  await db.collection('messages').add({
    userId,
    text: message,
    sender: 'user',
    timestamp
  });
  return { status: 'success', timestamp };
});
