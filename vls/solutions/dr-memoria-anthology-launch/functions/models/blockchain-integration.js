/**
 * Blockchain Integration Model for Dr. Memoria's Anthology
 *
 * This module handles blockchain interactions for content certification,
 * including verification QR code generation and blockchain registration.
 */

const { Web3 } = require('web3');
const { NFTStorage, File } = require('nft.storage');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const functions = require('firebase-functions');
const { logger, ErrorTypes, handleError } = require('../utils/errorLogging');

// NFT Storage client for decentralized storage
const nftStorage = new NFTStorage({
  token: process.env.NFT_STORAGE_KEY || functions.config().nftstorage.key,
});

// Smart contract ABI for content registration
const CONTENT_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: 'string', name: 'contentHash', type: 'string' },
      { internalType: 'string', name: 'metadataURI', type: 'string' },
      {
        internalType: 'uint8',
        name: 'humanContributionPercent',
        type: 'uint8',
      },
    ],
    name: 'registerContent',
    outputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getContentDetails',
    outputs: [
      { internalType: 'string', name: 'contentHash', type: 'string' },
      { internalType: 'string', name: 'metadataURI', type: 'string' },
      {
        internalType: 'uint8',
        name: 'humanContributionPercent',
        type: 'uint8',
      },
      { internalType: 'address', name: 'owner', type: 'address' },
      {
        internalType: 'uint256',
        name: 'registrationTimestamp',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: 'contentHash', type: 'string' }],
    name: 'verifyContent',
    outputs: [{ internalType: 'bool', name: 'isRegistered', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
];

/**
 * BlockchainIntegration class for handling content certification on blockchain
 */
class BlockchainIntegration {
  constructor() {
    // Initialize with default provider, can be updated later
    this.web3 = new Web3(
      process.env.ETHEREUM_RPC_URL || functions.config().ethereum.rpc_url
    );

    // Contract addresses for different networks
    this.contractAddresses = {
      mainnet:
        process.env.CONTENT_REGISTRY_MAINNET ||
        functions.config().ethereum.mainnet_contract,
      polygon:
        process.env.CONTENT_REGISTRY_POLYGON ||
        functions.config().ethereum.polygon_contract,
      // Add more networks as needed
    };

    // Default to polygon for lower gas fees
    this.currentNetwork = 'polygon';
    this.contractAddress = this.contractAddresses[this.currentNetwork];

    // Initialize contract
    this.contentRegistry = new this.web3.eth.Contract(
      CONTENT_REGISTRY_ABI,
      this.contractAddress
    );
  }

  /**
   * Updates the blockchain network to use
   * @param {string} network - Network name ('mainnet', 'polygon', etc.)
   * @param {string} rpcUrl - RPC URL for the network
   * @returns {boolean} - Success status
   */
  updateNetwork(network, rpcUrl) {
    try {
      if (!this.contractAddresses[network]) {
        throw new Error(
          `Contract address not configured for network: ${network}`
        );
      }

      this.web3 = new Web3(rpcUrl);
      this.currentNetwork = network;
      this.contractAddress = this.contractAddresses[network];

      // Reinitialize contract with new address
      this.contentRegistry = new this.web3.eth.Contract(
        CONTENT_REGISTRY_ABI,
        this.contractAddress
      );

      logger.info(`Blockchain network updated to ${network}`);
      return true;
    } catch (error) {
      handleError(
        error,
        ErrorTypes.BLOCKCHAIN_ERROR,
        'Failed to update blockchain network'
      );
      return false;
    }
  }

  /**
   * Generates a hash for content to be stored on blockchain
   * @param {Object} content - Content to hash
   * @returns {string} - Content hash
   */
  generateContentHash(content) {
    try {
      // Create deterministic JSON string
      const contentStr = JSON.stringify(content, Object.keys(content).sort());

      // Generate SHA-256 hash
      return crypto.createHash('sha256').update(contentStr).digest('hex');
    } catch (error) {
      handleError(
        error,
        ErrorTypes.PROCESSING_ERROR,
        'Failed to generate content hash'
      );
      return null;
    }
  }

  /**
   * Stores content metadata on IPFS via NFT.storage
   * @param {Object} content - Content metadata to store
   * @param {Object} creativePassport - Creative passport data
   * @returns {Promise<string>} - IPFS URI for the metadata
   */
  async storeMetadataOnIPFS(content, creativePassport) {
    try {
      // Create metadata object with proper attribution
      const metadata = {
        name: content.title,
        description:
          content.description ||
          "Creative work registered on Dr. Memoria's Anthology",
        image: content.coverImage || null,
        properties: {
          contentType: content.contentType,
          humanContribution: creativePassport.humanContributionPercentage,
          aiContribution: creativePassport.aiContributionPercentage,
          originalityScore: creativePassport.originalityScore,
          dateCreated: content.dateCreated || new Date().toISOString(),
          creator: content.owner,
          contributors: content.contributors || [],
          creativePassport: creativePassport,
        },
      };

      // Store as NFT metadata
      const result = await nftStorage.store(metadata);
      logger.info(`Content metadata stored on IPFS: ${result.url}`);
      return result.url;
    } catch (error) {
      handleError(
        error,
        ErrorTypes.STORAGE_ERROR,
        'Failed to store metadata on IPFS'
      );
      return null;
    }
  }

  /**
   * Registers content on the blockchain
   * @param {Object} content - Content data
   * @param {Object} creativePassport - Creative passport data
   * @param {string} privateKey - Private key for transaction signing
   * @returns {Promise<Object>} - Registration result with transaction details
   */
  async registerOnBlockchain(content, creativePassport, privateKey) {
    try {
      // Generate content hash
      const contentHash = this.generateContentHash(content);
      if (!contentHash) {
        throw new Error('Failed to generate content hash');
      }

      // Store metadata on IPFS
      const metadataURI = await this.storeMetadataOnIPFS(
        content,
        creativePassport
      );
      if (!metadataURI) {
        throw new Error('Failed to store metadata on IPFS');
      }

      // Create account from private key
      const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
      this.web3.eth.accounts.wallet.add(account);

      // Human contribution percentage as integer (0-100)
      const humanContributionPercent = Math.round(
        creativePassport.humanContributionPercentage * 100
      );

      // Prepare transaction
      const gasPrice = await this.web3.eth.getGasPrice();
      const gasEstimate = await this.contentRegistry.methods
        .registerContent(contentHash, metadataURI, humanContributionPercent)
        .estimateGas({ from: account.address });

      // Execute transaction
      const receipt = await this.contentRegistry.methods
        .registerContent(contentHash, metadataURI, humanContributionPercent)
        .send({
          from: account.address,
          gas: Math.round(gasEstimate * 1.2), // Add 20% buffer
          gasPrice,
        });

      // Get token ID from event logs
      const tokenId = receipt.events.ContentRegistered.returnValues.tokenId;

      logger.info(`Content registered on blockchain with token ID: ${tokenId}`);

      return {
        success: true,
        contentHash,
        metadataURI,
        tokenId,
        transactionHash: receipt.transactionHash,
        network: this.currentNetwork,
        blockNumber: receipt.blockNumber,
        timestamp: Math.floor(Date.now() / 1000),
      };
    } catch (error) {
      handleError(
        error,
        ErrorTypes.BLOCKCHAIN_ERROR,
        'Failed to register content on blockchain'
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verifies if content is registered on the blockchain
   * @param {string} contentHash - Hash of the content to verify
   * @returns {Promise<Object>} - Verification result
   */
  async verifyContent(contentHash) {
    try {
      // Check if content is registered
      const isRegistered = await this.contentRegistry.methods
        .verifyContent(contentHash)
        .call();

      if (!isRegistered) {
        return {
          verified: false,
          message: 'Content not found on blockchain',
        };
      }

      // Get content details
      const contentDetails = await this.contentRegistry.methods
        .getContentDetails(contentHash)
        .call();

      return {
        verified: true,
        contentHash: contentHash,
        metadataURI: contentDetails.metadataURI,
        humanContributionPercent: contentDetails.humanContributionPercent,
        owner: contentDetails.owner,
        registrationTimestamp: contentDetails.registrationTimestamp,
        network: this.currentNetwork,
      };
    } catch (error) {
      handleError(
        error,
        ErrorTypes.BLOCKCHAIN_ERROR,
        'Failed to verify content on blockchain'
      );
      return {
        verified: false,
        error: error.message,
      };
    }
  }

  /**
   * Generates a QR code for content verification
   * @param {string} contentHash - Content hash
   * @param {Object} registrationData - Blockchain registration data
   * @returns {Promise<string>} - QR code data URL
   */
  async generateVerificationQR(contentHash, registrationData) {
    try {
      // Create verification URL with content hash and registration data
      const verificationData = {
        contentHash,
        tokenId: registrationData.tokenId,
        network: registrationData.network,
        timestamp: registrationData.timestamp,
        verificationUrl: `https://anthology.aipublishing.com/verify/${contentHash}`,
      };

      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(
        JSON.stringify(verificationData),
        {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 300,
        }
      );

      logger.info(`Verification QR code generated for content: ${contentHash}`);

      return {
        qrDataUrl,
        verificationData,
      };
    } catch (error) {
      handleError(
        error,
        ErrorTypes.PROCESSING_ERROR,
        'Failed to generate verification QR code'
      );
      return null;
    }
  }

  /**
   * Creates a complete blockchain certification for content
   * @param {Object} content - Content data
   * @param {Object} creativePassport - Creative passport with attribution data
   * @param {string} privateKey - Private key for transaction signing
   * @returns {Promise<Object>} - Complete certification with blockchain registration and QR code
   */
  async createBlockchainCertification(content, creativePassport, privateKey) {
    try {
      // Register on blockchain
      const registrationResult = await this.registerOnBlockchain(
        content,
        creativePassport,
        privateKey
      );

      if (!registrationResult.success) {
        throw new Error(
          `Blockchain registration failed: ${registrationResult.error}`
        );
      }

      // Generate verification QR code
      const qrResult = await this.generateVerificationQR(
        registrationResult.contentHash,
        registrationResult
      );

      if (!qrResult) {
        throw new Error('Failed to generate verification QR code');
      }

      // Create certification object
      const certification = {
        contentId: content.id || uuidv4(),
        title: content.title,
        contentHash: registrationResult.contentHash,
        metadataURI: registrationResult.metadataURI,
        tokenId: registrationResult.tokenId,
        transactionHash: registrationResult.transactionHash,
        network: registrationResult.network,
        blockNumber: registrationResult.blockNumber,
        timestamp: registrationResult.timestamp,
        humanContributionPercentage:
          creativePassport.humanContributionPercentage,
        aiContributionPercentage: creativePassport.aiContributionPercentage,
        originalityScore: creativePassport.originalityScore,
        qrCode: qrResult.qrDataUrl,
        verificationUrl: qrResult.verificationData.verificationUrl,
      };

      logger.info(
        `Blockchain certification created for content: ${content.title}`
      );

      return {
        success: true,
        certification,
      };
    } catch (error) {
      handleError(
        error,
        ErrorTypes.BLOCKCHAIN_ERROR,
        'Failed to create blockchain certification'
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new BlockchainIntegration();
