// Blockchain Integration with AIXTIV Symphony
// This module connects the blockchain functionality with all other AIXTIV components
// including Dream Commander, Q4D-Lenz, Bid Suite, and the Flight Memory System

const {
  BlockchainManager,
  QRAuthSystem,
  FlightVerificationSystem,
  AgentRegistrySystem,
  GiftShopNFTSystem,
} = require('./comprehensive-blockchain-system');

const admin = require('firebase-admin');
const functions = require('firebase-functions');
const express = require('express');

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Create Express app for Symphony Integration API
const app = express();
app.use(express.json());

// Initialize blockchain systems
const blockchainManager = new BlockchainManager();
const qrAuthSystem = new QRAuthSystem(blockchainManager);
const flightVerificationSystem = new FlightVerificationSystem(
  blockchainManager
);
const agentRegistrySystem = new AgentRegistrySystem(blockchainManager);
const giftShopNFTSystem = new GiftShopNFTSystem(blockchainManager);

/**
 * AIXTIV Symphony Blockchain Integration Service
 * Provides functionality to connect blockchain verification with other AIXTIV services
 */
class SymphonyBlockchainService {
  constructor() {
    this.blockchainManager = blockchainManager;
    this.serviceWallet = null;

    // Initialize service wallet if environment variable is available
    if (process.env.BLOCKCHAIN_SERVICE_PRIVATE_KEY) {
      this.serviceWallet = this.blockchainManager.connectWallet(
        process.env.BLOCKCHAIN_SERVICE_PRIVATE_KEY
      );
    }
  }

  // Connect Dream Commander activity with blockchain verification
  async verifyDreamCommanderPrompt(promptId, ownerId, prompt, result) {
    try {
      // Generate a hash of the prompt and result for verification
      const promptHash = this._generateContentHash(prompt);
      const resultHash = this._generateContentHash(result);

      // Record on blockchain
      const tx =
        await this.blockchainManager.contracts.flightVerification.recordActionWithHashes(
          'dreamcommander_prompt',
          promptId,
          ownerId,
          promptHash,
          resultHash,
          Date.now()
        );

      const receipt = await tx.wait();

      return {
        success: true,
        promptId,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        promptHash,
        resultHash,
      };
    } catch (error) {
      console.error('Dream Commander verification error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Connect Q4D-Lenz actions with blockchain verification
  async verifyQ4DLenzAction(actionId, agentId, ownerId, perspective, action) {
    try {
      // Generate hash of the perspective and action
      const perspectiveHash = this._generateContentHash(
        JSON.stringify(perspective)
      );
      const actionHash = this._generateContentHash(JSON.stringify(action));

      // Record on blockchain
      const tx =
        await this.blockchainManager.contracts.flightVerification.recordActionWithHashes(
          'q4dlenz_action',
          actionId,
          `${agentId}:${ownerId}`,
          perspectiveHash,
          actionHash,
          Date.now()
        );

      const receipt = await tx.wait();

      return {
        success: true,
        actionId,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        perspectiveHash,
        actionHash,
      };
    } catch (error) {
      console.error('Q4D-Lenz action verification error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Connect Bid Suite submission with blockchain verification
  async verifyBidSubmission(bidId, ownerId, submissionData) {
    try {
      // Generate hash of the submission data
      const submissionHash = this._generateContentHash(
        JSON.stringify(submissionData)
      );

      // Record on blockchain
      const tx =
        await this.blockchainManager.contracts.deliverableAuthorization.recordSubmission(
          bidId,
          ownerId,
          submissionHash,
          Date.now()
        );

      const receipt = await tx.wait();

      // Record in Firestore
      await db
        .collection('bidSubmissions')
        .doc(bidId)
        .update({
          blockchainVerification: {
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber,
            submissionHash,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          },
        });

      return {
        success: true,
        bidId,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        submissionHash,
      };
    } catch (error) {
      console.error('Bid submission verification error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Record Dr. Memoria's content publication on blockchain
  async recordContentPublication(
    contentId,
    authorAgentId,
    contentType,
    metadata
  ) {
    try {
      // Generate content metadata hash
      const metadataHash = this._generateContentHash(JSON.stringify(metadata));

      // Record on blockchain
      const tx =
        await this.blockchainManager.contracts.agentRegistry.recordAgentContent(
          contentId,
          authorAgentId,
          contentType,
          metadataHash,
          Date.now()
        );

      const receipt = await tx.wait();

      return {
        success: true,
        contentId,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        metadataHash,
      };
    } catch (error) {
      console.error('Content publication recording error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Connect with Flight Memory System
  async finalizeFlight(flightId, rewards) {
    try {
      // Verify flight on blockchain
      const tx =
        await this.blockchainManager.contracts.flightVerification.finalizeFlight(
          flightId,
          rewards.pilotId,
          rewards.pilotPoints,
          rewards.groundCrewIds,
          rewards.groundCrewPoints,
          rewards.ownerId,
          rewards.ownerPoints,
          Date.now()
        );

      const receipt = await tx.wait();

      // Update memory allocations based on rewards
      await this._updateMemoryAllocations(rewards);

      return {
        success: true,
        flightId,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      console.error('Flight finalization error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update memory allocations based on reward points
  async _updateMemoryAllocations(rewards) {
    try {
      // Update pilot memory allocation
      if (rewards.pilotId && rewards.pilotPoints) {
        await this._updateAgentMemory(rewards.pilotId, rewards.pilotPoints);
      }

      // Update ground crew memory allocations
      if (rewards.groundCrewIds && rewards.groundCrewPoints) {
        for (let i = 0; i < rewards.groundCrewIds.length; i++) {
          if (rewards.groundCrewIds[i] && rewards.groundCrewPoints[i]) {
            await this._updateAgentMemory(
              rewards.groundCrewIds[i],
              rewards.groundCrewPoints[i]
            );
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Memory allocation update error:', error);
      return false;
    }
  }

  // Update individual agent memory allocation
  async _updateAgentMemory(agentId, pointsEarned) {
    try {
      // Get current agent data
      const agentRef = db.collection('agents').doc(agentId);
      const agentDoc = await agentRef.get();

      if (!agentDoc.exists) {
        console.warn(`Agent ${agentId} not found for memory update`);
        return false;
      }

      const agentData = agentDoc.data();

      // Calculate new memory allocation
      // Base memory + bonus based on performance
      // Memory units are in tokens or context length
      const currentMemory = agentData.memoryAllocation || 4000;
      let memoryBonus = 0;

      // Perfect flight (5.0) gets bigger bonus
      if (pointsEarned >= 100) {
        memoryBonus = 1000;
      } else if (pointsEarned >= 75) {
        memoryBonus = 500;
      } else if (pointsEarned >= 50) {
        memoryBonus = 200;
      } else if (pointsEarned >= 25) {
        memoryBonus = 100;
      }

      // Limit total memory to maximum allowed
      const newMemory = Math.min(currentMemory + memoryBonus, 16000);

      // Update agent memory allocation
      await agentRef.update({
        memoryAllocation: newMemory,
        totalRewardPoints: admin.firestore.FieldValue.increment(pointsEarned),
        memoryHistory: admin.firestore.FieldValue.arrayUnion({
          previousMemory: currentMemory,
          newMemory,
          pointsEarned,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        }),
      });

      return true;
    } catch (error) {
      console.error(`Error updating agent ${agentId} memory:`, error);
      return false;
    }
  }

  // Generate a cryptographic hash of content for verification
  _generateContentHash(content) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

// Initialize the Symphony Blockchain Service
const symphonyBlockchainService = new SymphonyBlockchainService();

// API Routes for Symphony Blockchain Integration
// Verify Dream Commander Prompt
app.post('/api/verify/dreamcommander', async (req, res) => {
  try {
    const { promptId, ownerId, prompt, result } = req.body;

    if (!promptId || !ownerId || !prompt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const verificationResult =
      await symphonyBlockchainService.verifyDreamCommanderPrompt(
        promptId,
        ownerId,
        prompt,
        result || ''
      );

    res.json(verificationResult);
  } catch (error) {
    console.error('Dream Commander verification API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify Q4D-Lenz Action
app.post('/api/verify/q4dlenz', async (req, res) => {
  try {
    const { actionId, agentId, ownerId, perspective, action } = req.body;

    if (!actionId || !agentId || !ownerId || !perspective || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const verificationResult =
      await symphonyBlockchainService.verifyQ4DLenzAction(
        actionId,
        agentId,
        ownerId,
        perspective,
        action
      );

    res.json(verificationResult);
  } catch (error) {
    console.error('Q4D-Lenz verification API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify Bid Submission
app.post('/api/verify/bid', async (req, res) => {
  try {
    const { bidId, ownerId, submissionData } = req.body;

    if (!bidId || !ownerId || !submissionData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const verificationResult =
      await symphonyBlockchainService.verifyBidSubmission(
        bidId,
        ownerId,
        submissionData
      );

    res.json(verificationResult);
  } catch (error) {
    console.error('Bid verification API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record Dr. Memoria Content Publication
app.post('/api/verify/content', async (req, res) => {
  try {
    const { contentId, authorAgentId, contentType, metadata } = req.body;

    if (!contentId || !authorAgentId || !contentType || !metadata) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const verificationResult =
      await symphonyBlockchainService.recordContentPublication(
        contentId,
        authorAgentId,
        contentType,
        metadata
      );

    res.json(verificationResult);
  } catch (error) {
    console.error('Content publication verification API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Finalize Flight and Distribute Rewards
app.post('/api/flights/:flightId/finalize', async (req, res) => {
  try {
    const { flightId } = req.params;
    const rewards = req.body;

    if (!flightId || !rewards || !rewards.pilotId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await symphonyBlockchainService.finalizeFlight(
      flightId,
      rewards
    );
    res.json(result);
  } catch (error) {
    console.error('Flight finalization API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Integration with Gift Shop for NFT agents
app.post('/api/giftshop/purchase-agent', async (req, res) => {
  try {
    const { userId, agentType, attributes, paymentInfo } = req.body;

    if (!userId || !agentType || !attributes || !paymentInfo) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Process payment (would integrate with payment gateway in production)
    const paymentResult = await processPayment(paymentInfo);

    if (!paymentResult.success) {
      return res
        .status(400)
        .json({ error: 'Payment failed', details: paymentResult.error });
    }

    // Mint agent NFT
    const nftResult = await giftShopNFTSystem.mintAgentNFT(
      userId,
      agentType,
      attributes
    );

    if (!nftResult.success) {
      // Refund payment since NFT minting failed
      await refundPayment(paymentInfo.transactionId);
      return res
        .status(500)
        .json({ error: 'NFT minting failed', details: nftResult.error });
    }

    // Register agent in the system
    const agentResult = await agentRegistrySystem.registerAgent(
      nftResult.tokenId,
      agentType,
      attributes.expertise || [],
      attributes.squadronId || 'gift-shop'
    );

    // Create record of purchase
    await db.collection('giftShopPurchases').add({
      userId,
      agentType,
      tokenId: nftResult.tokenId,
      paymentInfo: {
        amount: paymentInfo.amount,
        currency: paymentInfo.currency,
        transactionId: paymentInfo.transactionId,
      },
      purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      purchase: {
        tokenId: nftResult.tokenId,
        agentType,
        transactionHash: nftResult.transactionHash,
      },
    });
  } catch (error) {
    console.error('Gift Shop purchase API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Placeholder function for payment processing
// Would be replaced with actual payment gateway integration
async function processPayment(paymentInfo) {
  try {
    // Simulate payment processing
    console.log('Processing payment:', paymentInfo);

    // Record payment attempt in Firestore
    const paymentRef = await db.collection('payments').add({
      ...paymentInfo,
      status: 'processing',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // In production, this would integrate with Stripe, PayPal, etc.
    // For now, we'll simulate a successful payment
    await paymentRef.update({
      status: 'completed',
      transactionId: `sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      transactionId: paymentRef.id,
    };
  } catch (error) {
    console.error('Payment processing error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Placeholder function for payment refunds
async function refundPayment(transactionId) {
  try {
    console.log('Refunding payment:', transactionId);

    // In production, this would integrate with the payment gateway's refund API
    await db.collection('payments').doc(transactionId).update({
      status: 'refunded',
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Payment refund error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Blockchain Smart Contract Event Listeners
// These functions respond to events emitted by our blockchain smart contracts

/**
 * Listener for Perfect Flight events from blockchain
 * When a perfect flight is recorded on the blockchain, update system accordingly
 */
exports.onPerfectFlightEvent = functions
  .region('us-west1')
  .pubsub.topic('blockchain-events-perfect-flight')
  .onPublish(async message => {
    try {
      const eventData = message.json;

      if (!eventData || !eventData.flightId) {
        console.error('Invalid Perfect Flight event data');
        return null;
      }

      console.log(
        `Processing Perfect Flight event for flight ${eventData.flightId}`
      );

      // Update Flight record
      const flightRef = db.collection('flights').doc(eventData.flightId);
      const flightDoc = await flightRef.get();

      if (!flightDoc.exists) {
        console.error(`Flight ${eventData.flightId} not found`);
        return null;
      }

      await flightRef.update({
        perfectFlightVerified: true,
        blockchainVerification: {
          eventBlockNumber: eventData.blockNumber,
          eventTransactionHash: eventData.transactionHash,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        },
      });

      // Update rewards and memory allocations
      const pilotId = flightDoc.data().pilotId;

      if (pilotId) {
        // Update pilot profile
        await db
          .collection('agents')
          .doc(pilotId)
          .update({
            perfectFlightCount: admin.firestore.FieldValue.increment(1),
            perfectFlightRewardPoints: admin.firestore.FieldValue.increment(50),
            totalRewardPoints: admin.firestore.FieldValue.increment(50),
            // Increase memory allocation for perfect flights
            memoryAllocation: admin.firestore.FieldValue.increment(1000),
          });
      }

      // Notify owner of perfect flight (could trigger email/push notification)
      const ownerId = flightDoc.data().ownerId;
      if (ownerId) {
        await db.collection('notifications').add({
          userId: ownerId,
          type: 'perfect-flight',
          flightId: eventData.flightId,
          pilotId,
          message: `Perfect flight completed! Your Co-Pilot has earned additional resources.`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      console.log(
        `Perfect Flight event for ${eventData.flightId} processed successfully`
      );
      return null;
    } catch (error) {
      console.error('Error processing Perfect Flight event:', error);
      return null;
    }
  });

/**
 * Listener for Agent NFT Transfer events
 * When an agent NFT is transferred, update ownership records
 */
exports.onAgentNFTTransferEvent = functions
  .region('us-west1')
  .pubsub.topic('blockchain-events-nft-transfer')
  .onPublish(async message => {
    try {
      const eventData = message.json;

      if (!eventData || !eventData.tokenId || !eventData.to) {
        console.error('Invalid NFT Transfer event data');
        return null;
      }

      console.log(
        `Processing NFT Transfer event for token ${eventData.tokenId}`
      );

      // Update NFT ownership in Firestore
      const nftRef = db
        .collection('nftMetadata')
        .doc(eventData.tokenId.toString());
      const nftDoc = await nftRef.get();

      if (!nftDoc.exists) {
        console.error(`NFT ${eventData.tokenId} not found`);
        return null;
      }

      await nftRef.update({
        userId: eventData.to,
        transferHistory: admin.firestore.FieldValue.arrayUnion({
          from: eventData.from,
          to: eventData.to,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          blockNumber: eventData.blockNumber,
          transactionHash: eventData.transactionHash,
        }),
      });

      // Update agent ownership
      const agentRef = db
        .collection('agents')
        .doc(eventData.tokenId.toString());
      const agentDoc = await agentRef.get();

      if (agentDoc.exists) {
        await agentRef.update({
          ownerId: eventData.to,
          ownershipHistory: admin.firestore.FieldValue.arrayUnion({
            previousOwner: eventData.from,
            newOwner: eventData.to,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          }),
        });
      }

      // Notify new owner
      await db.collection('notifications').add({
        userId: eventData.to,
        type: 'nft-received',
        tokenId: eventData.tokenId.toString(),
        message: `You've received a new AI Agent NFT! Check your Gift Shop to activate it.`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `NFT Transfer event for token ${eventData.tokenId} processed successfully`
      );
      return null;
    } catch (error) {
      console.error('Error processing NFT Transfer event:', error);
      return null;
    }
  });

// Export the blockchain integration API as a Firebase function
exports.symphonyBlockchainAPI = functions
  .region('us-west1')
  .https.onRequest(app);

// Export the service for use in other modules
module.exports = {
  SymphonyBlockchainService,
  symphonyBlockchainService,
  symphonyBlockchainAPI: exports.symphonyBlockchainAPI,
  onPerfectFlightEvent: exports.onPerfectFlightEvent,
  onAgentNFTTransferEvent: exports.onAgentNFTTransferEvent,
};
