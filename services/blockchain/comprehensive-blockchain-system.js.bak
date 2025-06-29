// Comprehensive Blockchain System for AIXTIV
// This module provides advanced blockchain functionality for the entire AIXTIV ecosystem
// including secure authentication, immutable record-keeping, smart contracts for rewards,
// and integration with the Flight Memory System

const { ethers } = require('ethers');
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const crypto = require('crypto');
const QRCode = require('qrcode');
const express = require('express');

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();

// Configure blockchain network connections
class BlockchainManager {
  constructor(config) {
    this.config = config || {
      mainProvider: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
      testProvider: 'https://goerli.infura.io/v3/YOUR_INFURA_KEY',
      privateChain: 'http://localhost:8545',
      networkId: process.env.NODE_ENV === 'production' ? 1 : 5,
      usePrivate: process.env.USE_PRIVATE_CHAIN === 'true'
    };
    
    this.provider = this._initProvider();
    this.contractAddresses = {
      flightVerification: '0x1234567890123456789012345678901234567890',
      deliverableAuthorization: '0x0987654321098765432109876543210987654321',
      rewardDistribution: '0x5678901234567890123456789012345678901234',
      agentRegistry: '0x4321098765432109876543210987654321098765'
    };
    
    this.contracts = {};
    this._initContracts();
  }
  
  _initProvider() {
    if (this.config.usePrivate) {
      return new ethers.providers.JsonRpcProvider(this.config.privateChain);
    } else if (this.config.networkId === 1) {
      return new ethers.providers.JsonRpcProvider(this.config.mainProvider);
    } else {
      return new ethers.providers.JsonRpcProvider(this.config.testProvider);
    }
  }
  
  _initContracts() {
    // ABI definitions would be imported from separate files in production
    const flightVerificationABI = require('./abis/FlightVerification.json');
    const deliverableAuthorizationABI = require('./abis/DeliverableAuthorization.json');
    const rewardDistributionABI = require('./abis/RewardDistribution.json');
    const agentRegistryABI = require('./abis/AgentRegistry.json');
    
    this.contracts.flightVerification = new ethers.Contract(
      this.contractAddresses.flightVerification,
      flightVerificationABI,
      this.provider
    );
    
    this.contracts.deliverableAuthorization = new ethers.Contract(
      this.contractAddresses.deliverableAuthorization,
      deliverableAuthorizationABI,
      this.provider
    );
    
    this.contracts.rewardDistribution = new ethers.Contract(
      this.contractAddresses.rewardDistribution,
      rewardDistributionABI,
      this.provider
    );
    
    this.contracts.agentRegistry = new ethers.Contract(
      this.contractAddresses.agentRegistry,
      agentRegistryABI,
      this.provider
    );
  }
  
  // Connect with wallet for transaction signing
  connectWallet(privateKey) {
    const wallet = new ethers.Wallet(privateKey, this.provider);
    
    // Connect contracts with wallet signer
    this.contracts.flightVerification = this.contracts.flightVerification.connect(wallet);
    this.contracts.deliverableAuthorization = this.contracts.deliverableAuthorization.connect(wallet);
    this.contracts.rewardDistribution = this.contracts.rewardDistribution.connect(wallet);
    this.contracts.agentRegistry = this.contracts.agentRegistry.connect(wallet);
    
    return wallet;
  }
}

// QR Code Generation and Verification System
class QRAuthSystem {
  constructor(blockchainManager) {
    this.blockchain = blockchainManager;
    this.secretKey = process.env.QR_AUTH_SECRET || 'aixtiv-symphony-default-key';
  }
  
  // Generate QR code for deliverable authorization
  async generateAuthorizationQR(deliverableId, ownerId, expiryMinutes = 10) {
    const expiry = Date.now() + (expiryMinutes * 60 * 1000);
    const payload = {
      deliverableId,
      ownerId,
      expiry,
      nonce: crypto.randomBytes(16).toString('hex')
    };
    
    // Sign the payload with our secret
    const signature = this._signPayload(payload);
    payload.signature = signature;
    
    // Generate QR code
    const qrData = JSON.stringify(payload);
    const qrImage = await QRCode.toDataURL(qrData);
    
    // Store the authorization request in Firestore
    await db.collection('authorizationRequests').doc(deliverableId).set({
      payload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending',
      qrImage
    });
    
    return {
      qrImage,
      expiresAt: new Date(expiry).toISOString(),
      authId: deliverableId
    };
  }
  
  // Verify QR code from mobile scan
  async verifyAuthorizationQR(scannedData) {
    try {
      const payload = JSON.parse(scannedData);
      
      // Check if expired
      if (payload.expiry < Date.now()) {
        return { 
          valid: false, 
          reason: 'QR code has expired' 
        };
      }
      
      // Verify signature
      const originalSignature = payload.signature;
      delete payload.signature;
      const newSignature = this._signPayload(payload);
      
      if (originalSignature !== newSignature) {
        return { 
          valid: false, 
          reason: 'Invalid signature' 
        };
      }
      
      // Check if already processed
      const authRequest = await db.collection('authorizationRequests')
        .doc(payload.deliverableId)
        .get();
      
      if (!authRequest.exists) {
        return {
          valid: false,
          reason: 'Authorization request not found'
        };
      }
      
      if (authRequest.data().status !== 'pending') {
        return {
          valid: false,
          reason: `Authorization already ${authRequest.data().status}`
        };
      }
      
      return {
        valid: true,
        deliverableId: payload.deliverableId,
        ownerId: payload.ownerId
      };
    } catch (error) {
      console.error('QR verification error:', error);
      return { 
        valid: false, 
        reason: 'Invalid QR code format' 
      };
    }
  }
  
  // Process owner authorization through blockchain
  async processAuthorization(deliverableId, approved, ownerWallet) {
    try {
      // Update status in Firestore
      await db.collection('authorizationRequests').doc(deliverableId).update({
        status: approved ? 'approved' : 'rejected',
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Record on blockchain for immutability
      const tx = await this.blockchain.contracts.deliverableAuthorization.recordAuthorization(
        deliverableId,
        approved,
        Date.now()
      );
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      // If approved, trigger reward distribution
      if (approved) {
        await this._triggerRewards(deliverableId);
      }
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Authorization processing error:', error);
      
      // Still update Firestore even if blockchain fails
      await db.collection('authorizationRequests').doc(deliverableId).update({
        status: 'error',
        error: error.message,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  // Private method to trigger reward distribution
  async _triggerRewards(deliverableId) {
    // Get deliverable data from Firestore
    const deliverableRef = await db.collection('deliverables').doc(deliverableId).get();
    const deliverableData = deliverableRef.data();
    
    if (!deliverableData) {
      throw new Error('Deliverable not found');
    }
    
    // Determine reward points based on quality and difficulty
    const basePoints = deliverableData.difficulty || 1;
    const qualityMultiplier = deliverableData.qualityScore ? 
      (deliverableData.qualityScore / 5) : 1;
    
    // Calculate rewards for each participant
    const pilotPoints = basePoints * qualityMultiplier * 3; // Pilot gets triple
    const groundCrewPoints = basePoints * qualityMultiplier;
    const ownerPoints = basePoints * 0.5; // Owner gets smaller reward for approval
    
    // Record rewards on blockchain
    const tx = await this.blockchain.contracts.rewardDistribution.distributeRewards(
      deliverableId,
      deliverableData.pilotId,
      pilotPoints,
      deliverableData.groundCrewIds || [],
      Array(deliverableData.groundCrewIds?.length || 0).fill(groundCrewPoints),
      deliverableData.ownerId,
      ownerPoints
    );
    
    // Wait for confirmation
    await tx.wait();
    
    // Update rewards in Firestore
    await db.collection('rewards').add({
      deliverableId,
      pilotId: deliverableData.pilotId,
      pilotPoints,
      groundCrewIds: deliverableData.groundCrewIds || [],
      groundCrewPoints: Array(deliverableData.groundCrewIds?.length || 0).fill(groundCrewPoints),
      ownerId: deliverableData.ownerId,
      ownerPoints,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  // Sign payload for security
  _signPayload(payload) {
    const data = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(data)
      .digest('hex');
  }
}

// Flight verification system for the 2-hour work sessions
class FlightVerificationSystem {
  constructor(blockchainManager) {
    this.blockchain = blockchainManager;
  }
  
  // Start a new flight (2-hour work session)
  async startFlight(pilotId, mission, expectedDeliverables) {
    try {
      // Create flight record in Firestore
      const flightRef = await db.collection('flights').add({
        pilotId,
        mission,
        expectedDeliverables,
        startTime: admin.firestore.FieldValue.serverTimestamp(),
        status: 'in-progress',
        groundCrew: {},
        checkpoints: {
          takeoff: {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'completed'
          }
        }
      });
      
      // Register flight start on blockchain
      const tx = await this.blockchain.contracts.flightVerification.startFlight(
        flightRef.id,
        pilotId,
        Date.now(),
        JSON.stringify(expectedDeliverables)
      );
      
      // Wait for blockchain confirmation
      const receipt = await tx.wait();
      
      // Update Firestore with blockchain transaction info
      await flightRef.update({
        blockchainTx: {
          startTxHash: receipt.transactionHash,
          startBlockNumber: receipt.blockNumber
        }
      });
      
      return {
        success: true,
        flightId: flightRef.id,
        startTime: new Date().toISOString(),
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Flight start error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  // Record checkpoint during flight (e.g., mid-flight update, approach)
  async recordCheckpoint(flightId, checkpointName, checkpointData) {
    try {
      // Update Firestore with checkpoint data
      await db.collection('flights').doc(flightId).update({
        [`checkpoints.${checkpointName}`]: {
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          data: checkpointData,
          status: 'completed'
        }
      });
      
      // Record checkpoint on blockchain
      const tx = await this.blockchain.contracts.flightVerification.recordCheckpoint(
        flightId,
        checkpointName,
        Date.now(),
        JSON.stringify(checkpointData)
      );
      
      const receipt = await tx.wait();
      
      return {
        success: true,
        checkpointName,
        timestamp: new Date().toISOString(),
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Checkpoint recording error:', error);
      
      // Still update Firestore even if blockchain fails
      await db.collection('flights').doc(flightId).update({
        [`checkpoints.${checkpointName}`]: {
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          data: checkpointData,
          status: 'error',
          error: error.message
        }
      });
      
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  // Complete a flight with results and rating
  async completeFlight(flightId, deliverables, rating, notes) {
    try {
      // Get flight data from Firestore
      const flightRef = db.collection('flights').doc(flightId);
      const flightDoc = await flightRef.get();
      
      if (!flightDoc.exists) {
        throw new Error('Flight not found');
      }
      
      const flightData = flightDoc.data();
      
      // Calculate flight duration
      const startTime = flightData.startTime.toDate();
      const endTime = new Date();
      const durationMinutes = Math.floor((endTime - startTime) / (1000 * 60));
      
      // Perfect flight criteria: 120 minutes (2 hours) ±5 minutes and 5.0 rating
      const isPerfectFlight = (
        durationMinutes >= 115 && 
        durationMinutes <= 125 && 
        rating === 5.0
      );
      
      // Calculate reward points
      const rewardPoints = isPerfectFlight ? 100 : Math.floor(rating * 15);
      
      // Update flight record in Firestore
      await flightRef.update({
        status: 'completed',
        endTime: admin.firestore.FieldValue.serverTimestamp(),
        deliverables,
        rating,
        notes,
        durationMinutes,
        isPerfectFlight,
        rewardPoints,
        checkpoints: {
          ...flightData.checkpoints,
          landing: {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'completed'
          }
        }
      });
      
      // Record flight completion on blockchain
      const tx = await this.blockchain.contracts.flightVerification.completeFlight(
        flightId,
        Date.now(),
        JSON.stringify(deliverables),
        rating,
        isPerfectFlight,
        rewardPoints
      );
      
      const receipt = await tx.wait();
      
      // Update Firestore with blockchain transaction info
      await flightRef.update({
        blockchainTx: {
          ...flightData.blockchainTx,
          completeTxHash: receipt.transactionHash,
          completeBlockNumber: receipt.blockNumber
        }
      });
      
      // If perfect flight, distribute extra rewards
      if (isPerfectFlight) {
        await this._distributePerfectFlightRewards(flightId, flightData.pilotId);
      }
      
      return {
        success: true,
        flightId,
        endTime: endTime.toISOString(),
        durationMinutes,
        rating,
        isPerfectFlight,
        rewardPoints,
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Flight completion error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  // Private method for distributing perfect flight rewards
  async _distributePerfectFlightRewards(flightId, pilotId) {
    try {
      // Get flight data from Firestore
      const flightDoc = await db.collection('flights').doc(flightId).get();
      const flightData = flightDoc.data();
      
      // Get ground crew IDs
      const groundCrewIds = Object.keys(flightData.groundCrew || {});
      
      // Distribute rewards via blockchain
      const tx = await this.blockchain.contracts.rewardDistribution.distributePerfectFlightRewards(
        flightId,
        pilotId,
        50, // Pilot bonus points
        groundCrewIds,
        groundCrewIds.map(() => 20), // 20 points for each ground crew member
        flightData.ownerId,
        30 // Owner bonus points
      );
      
      await tx.wait();
      
      // Record in Firestore
      await db.collection('perfectFlightRewards').add({
        flightId,
        pilotId,
        pilotBonus: 50,
        groundCrewIds,
        groundCrewBonus: 20,
        ownerId: flightData.ownerId,
        ownerBonus: 30,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Perfect flight reward distribution error:', error);
      return false;
    }
  }
}

// Agent Registry System
class AgentRegistrySystem {
  constructor(blockchainManager) {
    this.blockchain = blockchainManager;
  }
  
  // Register a new agent on the blockchain
  async registerAgent(agentId, agentType, capabilities, squadronId) {
    try {
      // Check if agent already exists in Firestore
      const agentRef = db.collection('agents').doc(agentId);
      const agentDoc = await agentRef.get();
      
      if (agentDoc.exists) {
        throw new Error('Agent already registered');
      }
      
      // Create agent in Firestore
      await agentRef.set({
        agentId,
        agentType,
        capabilities,
        squadronId,
        status: 'active',
        registrationDate: admin.firestore.FieldValue.serverTimestamp(),
        flightCount: 0,
        totalRewardPoints: 0
      });
      
      // Register agent on blockchain
      const tx = await this.blockchain.contracts.agentRegistry.registerAgent(
        agentId,
        agentType,
        JSON.stringify(capabilities),
        squadronId
      );
      
      const receipt = await tx.wait();
      
      // Update Firestore with blockchain transaction info
      await agentRef.update({
        blockchainTx: {
          registerTxHash: receipt.transactionHash,
          registerBlockNumber: receipt.blockNumber
        }
      });
      
      return {
        success: true,
        agentId,
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Agent registration error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  // Update agent capabilities or status
  async updateAgent(agentId, updates) {
    try {
      // Check if agent exists in Firestore
      const agentRef = db.collection('agents').doc(agentId);
      const agentDoc = await agentRef.get();
      
      if (!agentDoc.exists) {
        throw new Error('Agent not found');
      }
      
      // Update agent in Firestore
      await agentRef.update({
        ...updates,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Update agent on blockchain
      const tx = await this.blockchain.contracts.agentRegistry.updateAgent(
        agentId,
        updates.capabilities ? JSON.stringify(updates.capabilities) : '',
        updates.status || '',
        Date.now()
      );
      
      const receipt = await tx.wait();
      
      return {
        success: true,
        agentId,
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Agent update error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  // Get agent details from blockchain (verification purposes)
  async verifyAgentOnChain(agentId) {
    try {
      // Get agent data from blockchain
      const agentData = await this.blockchain.contracts.agentRegistry.getAgent(agentId);
      
      // Compare with Firestore data
      const agentDoc = await db.collection('agents').doc(agentId).get();
      
      if (!agentDoc.exists) {
        return {
          verified: false,
          error: 'Agent not found in database'
        };
      }
      
      const firestoreData = agentDoc.data();
      
      // Parse blockchain agent capabilities
      const blockchainCapabilities = JSON.parse(agentData.capabilities);
      
      // Check if data matches
      const isMatch = (
        agentData.agentType === firestoreData.agentType &&
        JSON.stringify(blockchainCapabilities) === JSON.stringify(firestoreData.capabilities) &&
        agentData.squadronId === firestoreData.squadronId &&
        agentData.status === firestoreData.status
      );
      
      return {
        verified: isMatch,
        blockchainData: {
          agentType: agentData.agentType,
          capabilities: blockchainCapabilities,
          squadronId: agentData.squadronId,
          status: agentData.status,
          registrationTimestamp: agentData.registrationTimestamp.toNumber()
        },
        firestoreData: {
          agentType: firestoreData.agentType,
          capabilities: firestoreData.capabilities,
          squadronId: firestoreData.squadronId,
          status: firestoreData.status,
          registrationDate: firestoreData.registrationDate.toDate().getTime()
        }
      };
    } catch (error) {
      console.error('Agent verification error:', error);
      return { 
        verified: false, 
        error: error.message 
      };
    }
  }
}

// GiftShop NFT System for agent purchases
class GiftShopNFTSystem {
  constructor(blockchainManager) {
    this.blockchain = blockchainManager;
    this.nftContractAddress = '0x1234567890abcdef1234567890abcdef12345678';
    this.nftContractABI = require('./abis/AIXTIVAgentNFT.json');
    
    // Initialize NFT contract
    this.nftContract = new ethers.Contract(
      this.nftContractAddress,
      this.nftContractABI,
      this.blockchain.provider
    );
  }
  
  // Mint an agent NFT for a user
  async mintAgentNFT(userId, agentType, attributes) {
    try {
      // Generate unique token ID based on user and agent
      const tokenId = ethers.utils.solidityKeccak256(
        ['address', 'string', 'uint256'],
        [userId, agentType, Date.now()]
      );
      
      // Create metadata
      const metadata = {
        name: `AIXTIV ${agentType} Agent`,
        description: `A specialized AI agent with expertise in ${attributes.expertise.join(', ')}`,
        image: `https://aixtiv.io/nft-assets/${agentType.toLowerCase().replace(' ', '-')}.png`,
        attributes: [
          {
            trait_type: 'Agent Type',
            value: agentType
          },
          {
            trait_type: 'Expertise Level',
            value: attributes.level
          },
          {
            trait_type: 'Memory Allocation',
            value: attributes.memoryAllocation
          },
          ...attributes.expertise.map(exp => ({
            trait_type: 'Expertise',
            value: exp
          }))
        ]
      };
      
      // Store metadata in Firestore
      await db.collection('nftMetadata').doc(tokenId.toString()).set({
        tokenId: tokenId.toString(),
        userId,
        agentType,
        metadata,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Mint NFT on blockchain
      const tx = await this.nftContract.mintAgent(
        userId,
        tokenId,
        JSON.stringify(metadata)
      );
      
      const receipt = await tx.wait();
      
      // Update Firestore with transaction info
      await db.collection('nftMetadata').doc(tokenId.toString()).update({
        blockchainTx: {
          mintTxHash: receipt.transactionHash,
          mintBlockNumber: receipt.blockNumber
        },
        status: 'minted'
      });
      
      return {
        success: true,
        tokenId: tokenId.toString(),
        metadata,
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('NFT minting error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  // Transfer agent NFT to another user (e.g., reselling in Gift Shop)
  async transferAgentNFT(tokenId, fromUserId, toUserId) {
    try {
      // Verify ownership
      const owner = await this.nftContract.ownerOf(tokenId);
      
      if (owner.toLowerCase() !== fromUserId.toLowerCase()) {
        throw new Error('Sender is not the owner of this NFT');
      }
      
      // Transfer NFT on blockchain
      const tx = await this.nftContract.transferFrom(
        fromUserId,
        toUserId,
        tokenId
      );
      
      const receipt = await tx.wait();
      
      // Update ownership in Firestore
      await db.collection('nftMetadata').doc(tokenId.toString()).update({
        userId: toUserId,
        transferHistory: admin.firestore.FieldValue.arrayUnion({
          fromUserId,
          toUserId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          transactionHash: receipt.transactionHash
        })
      });
      
      return {
        success: true,
        tokenId,
        newOwner: toUserId,
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('NFT transfer error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  // Get all agent NFTs owned by a user
  async getUserAgentNFTs(userId) {
    try {
      // Query Firestore for user's NFTs
      const nftsSnapshot = await db.collection('nftMetadata')
        .where('userId', '==', userId)
        .get();
      
      const nfts = [];
      nftsSnapshot.forEach(doc => {
        nfts.push(doc.data());
      });
      
      // Verify on blockchain
      const verifiedNfts = await Promise.all(nfts.map(async (nft) => {
        try {
          const owner = await this.nftContract.ownerOf(nft.tokenId);
          return {
            ...nft,
            verified: owner.toLowerCase() === userId.toLowerCase()
          };
        } catch (error) {
          return {
            ...nft,
            verified: false,
            error: error.message
          };
        }
      }));
      
      return verifiedNfts;
    } catch (error) {
      console.error('Get user NFTs error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
}

// AIXTIV Blockchain API Endpoints
const blockchainApp = express();
blockchainApp.use(express.json());

// Initialize blockchain manager and systems
const blockchainManager = new BlockchainManager();
const qrAuthSystem = new QRAuthSystem(blockchainManager);
const flightVerificationSystem = new FlightVerificationSystem(blockchainManager);
const agentRegistrySystem = new AgentRegistrySystem(blockchainManager);
const giftShopNFTSystem = new GiftShopNFTSystem(blockchainManager);

// API endpoint to generate QR code for deliverable authorization
blockchainApp.post('/api/generate-auth-qr', async (req, res) => {
  try {
    const { deliverableId, ownerId, expiryMinutes } = req.body;
    
    if (!deliverableId || !ownerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await qrAuthSystem.generateAuthorizationQR(
      deliverableId, 
      ownerId, 
      expiryMinutes || 10
    );
    
    res.json(result);
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to verify QR code
blockchainApp.post('/api/verify-auth-qr', async (req, res) => {
  try {
    const { scannedData } = req.body;
    
    if (!scannedData) {
      return res.status(400).json({ error: 'Missing QR data' });
    }
    
    const result = await qrAuthSystem.verifyAuthorizationQR(scannedData);
    res.json(result);
  } catch (error) {
    console.error('QR verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to process authorization
blockchainApp.post('/api/process-authorization', async (req, res) => {
  try {
    const { deliverableId, approved, ownerWalletAddress } = req.body;
    
    if (!deliverableId || approved === undefined || !ownerWalletAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await qrAuthSystem.processAuthorization(
      deliverableId,
      approved,
      ownerWalletAddress
    );
    
    res.json(result);
  } catch (error) {
    console.error('Authorization processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to start a flight
blockchainApp.post('/api/flights/start', async (req, res) => {
  try {
    const { pilotId, mission, expectedDeliverables } = req.body;
    
    if (!pilotId || !mission) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await flightVerificationSystem.startFlight(
      pilotId,
      mission,
      expectedDeliverables || []
    );
    
    res.json(result);
  } catch (error) {
    console.error('Flight start error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to record flight checkpoint
blockchainApp.post('/api/flights/:flightId/checkpoint', async (req, res) => {
  try {
    const { flightId } = req.params;
    const { checkpointName, checkpointData } = req.body;
    
    if (!flightId || !checkpointName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await flightVerificationSystem.recordCheckpoint(
      flightId,
      checkpointName,
      checkpointData || {}
    );
    
    res.json(result);
  } catch (error) {
    console.error('Checkpoint recording error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to complete a flight
blockchainApp.post('/api/flights/:flightId/complete', async (req, res) => {
  try {
    const { flightId } = req.params;
    const { deliverables, rating, notes } = req.body;
    
    if (!flightId || !deliverables || rating === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await flightVerificationSystem.completeFlight(
      flightId,
      deliverables,
      rating,
      notes || ''
    );
    
    res.json(result);
  } catch (error) {
    console.error('Flight completion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to register a new agent
blockchainApp.post('/api/agents/register', async (req, res) => {
  try {
    const { agentId, agentType, capabilities, squadronId } = req.body;
    
    if (!agentId || !agentType || !squadronId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await agentRegistrySystem.registerAgent(
      agentId,
      agentType,
      capabilities || [],
      squadronId
    );
    
    res.json(result);
  } catch (error) {
    console.error('Agent registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to update an agent
blockchainApp.put('/api/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const updates = req.body;
    
    if (!agentId || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await agentRegistrySystem.updateAgent(agentId, updates);
    res.json(result);
  } catch (error) {
    console.error('Agent update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to verify an agent on the blockchain
blockchainApp.get('/api/agents/:agentId/verify', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      return res.status(400).json({ error: 'Missing agent ID' });
    }
    
    const result = await agentRegistrySystem.verifyAgentOnChain(agentId);
    res.json(result);
  } catch (error) {
    console.error('Agent verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoints for Gift Shop NFT system
// Mint a new agent NFT
blockchainApp.post('/api/nft/mint', async (req, res) => {
  try {
    const { userId, agentType, attributes } = req.body;
    
    if (!userId || !agentType || !attributes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await giftShopNFTSystem.mintAgentNFT(userId, agentType, attributes);
    res.json(result);
  } catch (error) {
    console.error('NFT minting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Transfer an agent NFT
blockchainApp.post('/api/nft/transfer', async (req, res) => {
  try {
    const { tokenId, fromUserId, toUserId } = req.body;
    
    if (!tokenId || !fromUserId || !toUserId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await giftShopNFTSystem.transferAgentNFT(tokenId, fromUserId, toUserId);
    res.json(result);
  } catch (error) {
    console.error('NFT transfer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all NFTs owned by a user
blockchainApp.get('/api/nft/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    const result = await giftShopNFTSystem.getUserAgentNFTs(userId);
    res.json(result);
  } catch (error) {
    console.error('Get user NFTs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export the blockchain API as a Firebase function
exports.blockchainAPI = functions.region('us-west1').https.onRequest(blockchainApp);

// Firestore triggers for blockchain sync
// Sync new deliverables to blockchain
exports.onNewDeliverable = functions.region('us-west1')
  .firestore.document('deliverables/{deliverableId}')
  .onCreate(async (snapshot, context) => {
    try {
      const deliverableData = snapshot.data();
      const deliverableId = context.params.deliverableId;
      
      // Connect wallet for transaction signing
      const serviceWallet = blockchainManager.connectWallet(
        process.env.BLOCKCHAIN_SERVICE_PRIVATE_KEY
      );
      
      // Record deliverable on blockchain
      const tx = await blockchainManager.contracts.deliverableAuthorization.createDeliverable(
        deliverableId,
        deliverableData.pilotId,
        deliverableData.ownerId,
        deliverableData.title || '',
        Date.now()
      );
      
      const receipt = await tx.wait();
      
      // Update Firestore with blockchain transaction info
      await snapshot.ref.update({
        blockchainTx: {
          createTxHash: receipt.transactionHash,
          createBlockNumber: receipt.blockNumber
        }
      });
      
      console.log(`Deliverable ${deliverableId} synced to blockchain successfully`);
      return null;
    } catch (error) {
      console.error(`Error syncing deliverable to blockchain: ${error}`);
      return null;
    }
  });

// Sync agent reward points updates
exports.onRewardPointsUpdate = functions.region('us-west1')
  .firestore.document('agents/{agentId}')
  .onUpdate(async (change, context) => {
    try {
      const beforeData = change.before.data();
      const afterData = change.after.data();
      const agentId = context.params.agentId;
      
      // Check if reward points have changed
      if (beforeData.totalRewardPoints === afterData.totalRewardPoints) {
        // No change in reward points, skip processing
        return null;
      }
      
      // Calculate point change
      const pointsDelta = afterData.totalRewardPoints - beforeData.totalRewardPoints;
      
      // Connect wallet for transaction signing
      const serviceWallet = blockchainManager.connectWallet(
        process.env.BLOCKCHAIN_SERVICE_PRIVATE_KEY
      );
      
      // Record reward points update on blockchain
      const tx = await blockchainManager.contracts.rewardDistribution.recordRewardPointsChange(
        agentId,
        pointsDelta,
        afterData.totalRewardPoints,
        Date.now()
      );
      
      const receipt = await tx.wait();
      
      // Update Firestore with blockchain transaction info
      const rewardUpdates = afterData.rewardUpdates || [];
      rewardUpdates.push({
        pointsDelta,
        newTotal: afterData.totalRewardPoints,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        blockchainTx: {
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber
        }
      });
      
      await change.after.ref.update({
        rewardUpdates
      });
      
      console.log(`Agent ${agentId} reward points update synced to blockchain successfully`);
      return null;
    } catch (error) {
      console.error(`Error syncing reward points to blockchain: ${error}`);
      return null;
    }
  });

// Function to verify blockchain data integrity periodically
exports.verifyBlockchainIntegrity = functions.region('us-west1')
  .pubsub.schedule('every 24 hours')
  .onRun(async (context) => {
    try {
      console.log('Starting blockchain data integrity verification');
      
      // 1. Verify a sample of recent flights
      const recentFlights = await db.collection('flights')
        .orderBy('startTime', 'desc')
        .limit(50)
        .get();
      
      let flightVerificationResults = {
        verified: 0,
        discrepancies: 0,
        errors: 0
      };
      
      for (const flightDoc of recentFlights.docs) {
        try {
          const flightId = flightDoc.id;
          const flightData = flightDoc.data();
          
          // Get flight data from blockchain
          const blockchainFlightData = await blockchainManager.contracts.flightVerification.getFlight(flightId);
          
          // Check if data matches
          if (
            blockchainFlightData.pilotId === flightData.pilotId &&
            blockchainFlightData.status === flightData.status
          ) {
            flightVerificationResults.verified++;
          } else {
            flightVerificationResults.discrepancies++;
            
            // Log discrepancy for investigation
            console.warn(`Discrepancy found for flight ${flightId}`, {
              blockchain: {
                pilotId: blockchainFlightData.pilotId,
                status: blockchainFlightData.status
              },
              firestore: {
                pilotId: flightData.pilotId,
                status: flightData.status
              }
            });
          }
        } catch (error) {
          flightVerificationResults.errors++;
          console.error(`Error verifying flight: ${error}`);
        }
      }
      
      // 2. Verify a sample of agent registrations
      const recentAgents = await db.collection('agents')
        .orderBy('registrationDate', 'desc')
        .limit(50)
        .get();
      
      let agentVerificationResults = {
        verified: 0,
        discrepancies: 0,
        errors: 0
      };
      
      for (const agentDoc of recentAgents.docs) {
        try {
          const agentId = agentDoc.id;
          const verificationResult = await agentRegistrySystem.verifyAgentOnChain(agentId);
          
          if (verificationResult.verified) {
            agentVerificationResults.verified++;
          } else if (verificationResult.error) {
            agentVerificationResults.errors++;
          } else {
            agentVerificationResults.discrepancies++;
            
            // Log discrepancy for investigation
            console.warn(`Discrepancy found for agent ${agentId}`, {
              blockchain: verificationResult.blockchainData,
              firestore: verificationResult.firestoreData
            });
          }
        } catch (error) {
          agentVerificationResults.errors++;
          console.error(`Error verifying agent: ${error}`);
        }
      }
      
      // Save verification results to Firestore
      await db.collection('systemAudits').add({
        type: 'blockchainIntegrity',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        flights: flightVerificationResults,
        agents: agentVerificationResults
      });
      
      console.log('Blockchain integrity verification completed', {
        flightVerificationResults,
        agentVerificationResults
      });
      
      return null;
    } catch (error) {
      console.error(`Error in blockchain integrity verification: ${error}`);
      return null;
    }
  });

module.exports = {
  BlockchainManager,
  QRAuthSystem,
  FlightVerificationSystem,
  AgentRegistrySystem,
  GiftShopNFTSystem,
  blockchainAPI: exports.blockchainAPI,
  onNewDeliverable: exports.onNewDeliverable,
  onRewardPointsUpdate: exports.onRewardPointsUpdate,
  verifyBlockchainIntegrity: exports.verifyBlockchainIntegrity
};