/**
 * Blockchain Authorization Service
 *
 * Provides secure blockchain-based authorization for Co-Pilot deliverables
 * and implements QR code generation for owner-subscriber approval.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const QRCode = require('qrcode');

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Import utility functions
const { getDocumentById, updateDocument, createDocument } = require('./utils');

/**
 * BlockchainAuthorizationService
 *
 * Service to handle blockchain-based authorization for Co-Pilot deliverables
 */
class BlockchainAuthorizationService {
  constructor() {
    this.transactions = db.collection('blockchainTransactions');
    this.authorizations = db.collection('authorizations');
    this.deliverables = db.collection('deliverables');
  }

  /**
   * Generate a QR code for a deliverable
   *
   * @param {string} deliverableId - ID of the deliverable
   * @param {string} ownerSubscriberId - ID of the owner-subscriber
   * @returns {Promise<Object>} - QR code data and image
   */
  async generateAuthorizationQR(deliverableId, ownerSubscriberId) {
    try {
      // Get the deliverable to verify it exists
      const deliverable = await getDocumentById('deliverables', deliverableId);

      if (!deliverable) {
        throw new Error(`Deliverable ${deliverableId} not found`);
      }

      // Verify owner matches
      if (deliverable.ownerSubscriberId !== ownerSubscriberId) {
        throw new Error('Unauthorized: Owner ID mismatch');
      }

      // Create authorization data
      const timestamp = new Date().toISOString();
      const authData = {
        deliverableId,
        ownerSubscriberId,
        timestamp,
        type: 'deliverable_authorization',
      };

      // Generate hash for the authorization
      const dataString = JSON.stringify(authData);
      const hash = this._generateHash(dataString);

      // Create the QR data object
      const qrData = {
        ...authData,
        hash,
      };

      // Generate QR code image
      const qrCodeImage = await this._generateQRCodeImage(
        JSON.stringify(qrData)
      );

      // Store authorization data in Firestore
      const authorizationId = await createDocument(
        'authorizationRequests',
        null,
        {
          deliverableId,
          ownerSubscriberId,
          qrData,
          hash,
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours expiration
          ),
        }
      );

      // Update deliverable with authorization request
      await updateDocument('deliverables', deliverableId, {
        authorizationRequestId: authorizationId,
        authorizationHash: hash,
        authorizationStatus: 'pending',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        authorizationId,
        qrData,
        qrCodeImage,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      };
    } catch (error) {
      console.error('Error generating authorization QR:', error);
      throw error;
    }
  }

  /**
   * Verify and process a QR code authorization
   *
   * @param {string} qrData - QR code data from scan
   * @param {string} ownerSubscriberId - ID of the owner-subscriber
   * @returns {Promise<Object>} - Authorization result
   */
  async processAuthorization(qrData, ownerSubscriberId) {
    try {
      // Parse QR data
      const data = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;

      // Verify the hash
      const { hash, ...authData } = data;
      const calculatedHash = this._generateHash(JSON.stringify(authData));

      if (calculatedHash !== hash) {
        throw new Error('Invalid authorization: Hash mismatch');
      }

      // Verify the owner-subscriber ID
      if (authData.ownerSubscriberId !== ownerSubscriberId) {
        throw new Error('Unauthorized: Owner ID mismatch');
      }

      // Check if the authorization has expired
      const authRequest = await db
        .collection('authorizationRequests')
        .where('hash', '==', hash)
        .limit(1)
        .get()
        .then(snapshot => {
          if (snapshot.empty) return null;
          const doc = snapshot.docs[0];
          return { id: doc.id, ...doc.data() };
        });

      if (!authRequest) {
        throw new Error('Authorization request not found');
      }

      if (authRequest.expiresAt.toDate() < new Date()) {
        throw new Error('Authorization expired');
      }

      // Record the authorization on the blockchain
      const transaction = await this._recordOnBlockchain(authData);

      // Create the authorization record
      const authorizationData = {
        deliverableId: authData.deliverableId,
        ownerSubscriberId,
        hash,
        qrData: data,
        blockchainTransactionId: transaction.id,
        blockchainHash: transaction.hash,
        authorizedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'authorized',
      };

      const authorizationId = await createDocument(
        'authorizations',
        null,
        authorizationData
      );

      // Update the deliverable with authorization data
      await updateDocument('deliverables', authData.deliverableId, {
        authorized: true,
        authorizationId,
        blockchainTransactionId: transaction.id,
        authorizationStatus: 'authorized',
        authorizedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update the authorization request
      await updateDocument('authorizationRequests', authRequest.id, {
        status: 'processed',
        authorizationId,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        deliverableId: authData.deliverableId,
        authorizationId,
        transactionId: transaction.id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error processing authorization:', error);
      throw error;
    }
  }

  /**
   * Generate a cryptographic hash for data
   *
   * @param {string} data - Data to hash
   * @returns {string} - Hash result
   * @private
   */
  _generateHash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate a QR code image from data
   *
   * @param {string} data - Data to encode in QR
   * @returns {Promise<string>} - Data URL for QR code image
   * @private
   */
  async _generateQRCodeImage(data) {
    try {
      // Generate QR code as data URL
      return await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch (error) {
      console.error('Error generating QR code image:', error);
      throw error;
    }
  }

  /**
   * Record transaction on blockchain
   *
   * @param {Object} data - Transaction data
   * @returns {Promise<Object>} - Blockchain transaction result
   * @private
   */
  async _recordOnBlockchain(data) {
    try {
      // In a real implementation, this would interact with an actual blockchain
      // For now, we'll simulate by storing in Firestore

      const timestamp = new Date().toISOString();
      const transactionData = {
        ...data,
        timestamp,
        type: 'authorization',
      };

      const hash = this._generateHash(JSON.stringify(transactionData));

      const transaction = {
        data: transactionData,
        hash,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        verified: true,
      };

      const docRef = await this.transactions.add(transaction);

      return {
        id: docRef.id,
        hash,
        timestamp,
      };
    } catch (error) {
      console.error('Error recording on blockchain:', error);
      throw error;
    }
  }

  /**
   * Verify a blockchain transaction
   *
   * @param {string} transactionId - ID of the transaction
   * @returns {Promise<Object>} - Verification result
   */
  async verifyTransaction(transactionId) {
    try {
      const transaction = await getDocumentById(
        'blockchainTransactions',
        transactionId
      );

      if (!transaction) {
        return {
          verified: false,
          error: 'Transaction not found',
        };
      }

      // Verify the hash
      const calculatedHash = this._generateHash(
        JSON.stringify(transaction.data)
      );
      const hashMatch = calculatedHash === transaction.hash;

      return {
        verified: hashMatch,
        transaction: hashMatch ? transaction : null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error verifying transaction:', error);
      throw error;
    }
  }
}

// Create Express API for blockchain authorization
const express = require('express');
const cors = require('cors');
const {
  authenticateUser,
  handleHttpError,
  createHttpError,
} = require('./utils');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Initialize the authorization service
const authService = new BlockchainAuthorizationService();

/**
 * Generate QR code for authorization
 * POST /api/blockchain/authorize/generate
 */
app.post('/authorize/generate', authenticateUser, async (req, res) => {
  try {
    const { deliverableId, ownerSubscriberId } = req.body;

    if (!deliverableId || !ownerSubscriberId) {
      throw createHttpError(
        'Deliverable ID and owner-subscriber ID are required',
        400
      );
    }

    const qrResult = await authService.generateAuthorizationQR(
      deliverableId,
      ownerSubscriberId
    );

    res.status(200).json({
      authorizationId: qrResult.authorizationId,
      qrCodeImage: qrResult.qrCodeImage,
      expiresAt: qrResult.expiresAt,
    });
  } catch (error) {
    handleHttpError(error, res);
  }
});

/**
 * Process authorization from QR code
 * POST /api/blockchain/authorize/process
 */
app.post('/authorize/process', authenticateUser, async (req, res) => {
  try {
    const { qrData, ownerSubscriberId } = req.body;

    if (!qrData || !ownerSubscriberId) {
      throw createHttpError(
        'QR data and owner-subscriber ID are required',
        400
      );
    }

    const result = await authService.processAuthorization(
      qrData,
      ownerSubscriberId
    );

    res.status(200).json(result);
  } catch (error) {
    handleHttpError(error, res);
  }
});

/**
 * Verify a blockchain transaction
 * GET /api/blockchain/verify/:transactionId
 */
app.get('/verify/:transactionId', authenticateUser, async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      throw createHttpError('Transaction ID is required', 400);
    }

    const result = await authService.verifyTransaction(transactionId);

    res.status(200).json(result);
  } catch (error) {
    handleHttpError(error, res);
  }
});

// Export the blockchain authorization API
const blockchainAuth = functions.https.onRequest(app);

module.exports = {
  BlockchainAuthorizationService,
  blockchainAuth,
};
