/**
 * S2DO Blockchain Integration
 *
 * This module implements the blockchain integration for the S2DO system,
 * providing secure verification, immutable records, and NFT generation.
 *
 * Project ID: api-for-warp-drive
 * Organization: coaching2100.com
 */

import { ethers, Contract, ContractFactory } from 'ethers';
import { BlockchainService } from './sd20-core';
import {
  SD20RegistryABI,
  SD20ActionVerificationABI,
  SD20AchievementNFTABI,
  SD20FactoryABI,
  SD20RegistryBytecode,
  SD20ActionVerificationBytecode,
  SD20AchievementNFTBytecode,
  SD20FactoryBytecode,
} from './blockchain-contracts';

/**
 * Implementation of the Blockchain Service for S2DO system
 */
export class S2DOBlockchainService implements BlockchainService {
  provider;
  wallet;
  actionContract;
  nftContract;
  eventListeners= new Map();

  /**
   * Create a new S2DO Blockchain Service instance
   * @param rpcUrl URL for the RPC provider
   * @param privateKey Private key for transaction signing
   * @param actionContractAddress Address of the action verification contract
   * @param nftContractAddress Address of the achievement NFT contract
   */
  constructor(
    rpcUrl,
    privateKey,
    actionContractAddress,
    nftContractAddress) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    // Initialize contract instances
    this.actionContract = new Contract(
      actionContractAddress,
      SD20ActionVerificationABI,
      this.wallet
    );

    this.nftContract = new Contract(
      nftContractAddress,
      SD20AchievementNFTABI,
      this.wallet
    );

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Update contract addresses (useful after deployment)
   * @param actionContractAddress New action contract address
   * @param nftContractAddress New NFT contract address
   */
  updateContractAddresses(
    actionContractAddress,
    nftContractAddress){
    // Remove old event listeners
    this.removeEventListeners();

    // Update contract instances
    this.actionContract = new Contract(
      actionContractAddress,
      SD20ActionVerificationABI,
      this.wallet
    );

    this.nftContract = new Contract(
      nftContractAddress,
      SD20AchievementNFTABI,
      this.wallet
    );

    // Set up new event listeners
    this.setupEventListeners();
  }

  /**
   * Set up blockchain event listeners
   */
  setupEventListeners(){
    // Listen for ActionVerified events
    this.actionContract.on(
      'ActionVerified',
      (actionId, verifierId, timestamp, event) => {
        console.log(`Action verified on blockchain: ${actionId}`);
        this.triggerEventListeners('ActionVerified', {
          actionId,
          verifierId,
          timestamp,
          transactionHash,
          blockNumber,
        });
      }
    );

    // Listen for ActionCompleted events
    this.actionContract.on('ActionCompleted', (actionId, timestamp, event) => {
      console.log(`Action completed on blockchain: ${actionId}`);
      this.triggerEventListeners('ActionCompleted', {
        actionId,
        timestamp,
        transactionHash,
        blockNumber,
      });
    });

    // Listen for AchievementMinted events
    this.nftContract.on(
      'AchievementMinted',
      (tokenId, actionId, actionType, initiatorId, event) => {
        console.log(
          `Achievement NFT minted=${tokenId}, actionId=${actionId}`
        );
        this.triggerEventListeners('AchievementMinted', {
          tokenId,
          transactionHash,
          blockNumber,
        });
      }
    );

    // Listen for RoyaltyPaid events
    this.nftContract.on('RoyaltyPaid', (tokenId, recipient, amount, event) => {
      console.log(
        `Royalty paid=${tokenId}, recipient=${recipient}, amount=${amount}`
      );
      this.triggerEventListeners('RoyaltyPaid', {
        tokenId,
        amount,
        transactionHash,
        blockNumber,
      });
    });
  }

  /**
   * Remove all event listeners
   */
  removeEventListeners(){
    this.actionContract.removeAllListeners();
    this.nftContract.removeAllListeners();
  }

  /**
   * Register an event listener
   * @param eventName Name of the event to listen for
   * @param listener Function to call when the event is triggered
   */
  listenForEvents(eventName, listener){
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }

    this.eventListeners.get(eventName)?.push(listener);
  }

  /**
   * Trigger event listeners for a specific event
   * @param eventName Name of the event
   * @param eventData Data associated with the event
   */
  triggerEventListeners(eventName, eventData){
    const listeners = this.eventListeners.get(eventName) || [];

    for (const listener of listeners) {
      try {
        listener(eventData);
      } catch (error) {
        console.error(`Error in ${eventName} listener:`, error);
      }
    }
  }

  /**
   * Store action verification on the blockchain
   * @param actionId Unique identifier for the action
   * @param actionHash Hash of the action data
   * @param initiatorAddress Ethereum address of the initiator
   * @param verifierAddresses Ethereum addresses of the verifiers
   */
  async storeActionVerification(
    actionId,
    actionHash,
    initiatorAddress,
    verifierAddresses){
    try {
      // First, check if the action is already recorded
      const actionExists = await this.actionContract.verifyActionHash(
        actionId,
        actionHash
      );

      if (actionExists) {
        throw new Error(`Action ${actionId} already exists on the blockchain`);
      }

      console.log(`Recording action ${actionId} on blockchain...`);

      // Determine action type from actionId (in a real system, this would be more robust)
      const actionType = `S2DO:${actionId.substr(0, 5)}:Action`;

      // Record the action
      const tx = await this.actionContract.recordAction(
        actionId,
        actionType,
        actionHash,
        initiatorAddress
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log(
        `Action recorded on blockchain: ${actionId}, txHash: ${receipt.transactionHash}`
      );

      // Verify the action with each verifier
      for (const verifierAddress of verifierAddresses) {
        // Generate a signature (in a real system, this would be provided by the verifier)
        const signature = this.generateSignature(actionId, verifierAddress);

        // Verify the action
        const verifyTx = await this.actionContract.verifyAction(
          actionId,
          signature
        );

        // Wait for transaction to be mined
        await verifyTx.wait();
        console.log(`Action verified by ${verifierAddress}`);
      }

      // Complete the action
      const completeTx = await this.actionContract.completeAction(actionId);
      const completeReceipt = await completeTx.wait();

      console.log(
        `Action completed on blockchain: ${actionId}, txHash: ${completeReceipt.transactionHash}`
      );

      return receipt.transactionHash;
    } catch (error) {
      console.error('Error storing action verification:', error);
      throw error;
    }
  }

  /**
   * Mint an NFT for a completed action
   * @param metadata Metadata for the NFT
   * @param ownerAddress Ethereum address of the NFT owner
   * @param contributorAddresses Ethereum addresses of the contributors
   */
  async mintNFT(
    metadata,
    ownerAddress,
    contributorAddresses){
    try {
      console.log(`Minting NFT for ${metadata.name}...`);

      // Upload metadata to IPFS (in a real system)
      // For this example, we'll just use a placeholder URI
      const uri = `ipfs://QmPlaceholderHash/${metadata.name.replace(/\s+/g, '-').toLowerCase()}`;

      // Prepare royalty shares (equal distribution)
      const contributorShares = [];
      const sharePerContributor = Math.floor(
        10000 / contributorAddresses.length
      );
      let remainingShares = 10000;

      for (let i = 0; i  attr.trait_type === 'Action')
          ?.value || 'Unknown';
      const actionType = actionId;
      const initiatorId = metadata.contributors[0]?.id || 'unknown';

      // Get contributor IDs
      const contributorIds = metadata.contributors.map(
        (contributor=> contributor.id
      );

      // Mint the NFT
      const tx = await this.nftContract.mintAchievement(
        ownerAddress,
        uri,
        actionId,
        actionType,
        initiatorId,
        contributorIds,
        contributorShares
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      // Extract the token ID from the event logs
      const mintEvent = receipt.events?.find(
        event => event.event === 'AchievementMinted'
      );
      const tokenId = mintEvent?.args?.tokenId?.toString() || '0';

      console.log(
        `NFT minted=${tokenId}, txHash: ${receipt.transactionHash}`
      );

      return tokenId;
    } catch (error) {
      console.error('Error minting NFT:', error);
      throw error;
    }
  }

  /**
   * Verify an action record on the blockchain
   * @param actionId Unique identifier for the action
   * @param actionHash Hash of the action data
   */
  async verifyActionRecord(
    actionId,
    actionHash){
    try {
      return await this.actionContract.verifyActionHash(actionId, actionHash);
    } catch (error) {
      console.error('Error verifying action record:', error);
      return false;
    }
  }

  /**
   * Get all actions from the blockchain
   */
  async getAllActions(){
    try {
      return await this.actionContract.getAllActionIds();
    } catch (error) {
      console.error('Error getting all actions:', error);
      return [];
    }
  }

  /**
   * Get action details from the blockchain
   * @param actionId Unique identifier for the action
   */
  async getAction(actionId){
    try {
      const action = await this.actionContract.getAction(actionId);

      return {
        actionType,
        actionHash,
        initiatorId,
        verifierIds,
        timestamps: action.timestamps.map((t=>
          t.toNumber()
        ),
        isCompleted,
        completedAt,
      };
    } catch (error) {
      console.error(`Error getting action ${actionId}:`, error);
      return null;
    }
  }

  /**
   * Get achievement NFT details from the blockchain
   * @param tokenId Token ID of the achievement NFT
   */
  async getAchievement(tokenId){
    try {
      const achievement = await this.nftContract.getAchievement(tokenId);

      return {
        actionId,
        actionType,
        initiatorId,
        contributorIds,
        shares: achievement.shares.map((s=> s.toNumber()),
        createdAt,
      };
    } catch (error) {
      console.error(`Error getting achievement ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Generate a signature for action verification
   * @param actionId Action ID to sign
   * @param signerAddress Address of the signer
   */
  generateSignature(actionId, signerAddress){
    // In a real system, this would be signed by the verifier's key
    // For this example, we'll just use a placeholder signature
    const message = `${actionId}-${signerAddress}-${Date.now()}`;
    return ethers.utils.id(message);
  }
}

/**
 * Factory for deploying S2DO smart contracts
 */
export class S2DOContractFactory {
  provider;
  wallet;

  /**
   * Create a new S2DO Contract Factory
   * @param rpcUrl URL for the RPC provider
   * @param privateKey Private key for contract deployment
   */
  constructor(rpcUrl, privateKey) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Deploy the full SD20 system contracts
   * @param adminAddress Address to grant admin privileges
   */
  async deploySD20System(adminAddress){
    registry;
    actionVerification;
    achievementNFT;
  }> {
    try {
      console.log('Deploying SD20 system contracts...');

      // Option 1: Deploy using factory contract
      // This is the preferred method for production, ensures consistency

      // Deploy the factory contract first
      const factoryFactory = new ContractFactory(
        SD20FactoryABI,
        SD20FactoryBytecode,
        this.wallet
      );

      const factoryContract = await factoryFactory.deploy();
      await factoryContract.deployed();

      console.log(`Factory contract deployed at ${factoryContract.address}`);

      // Use factory to deploy the system
      const tx = await factoryContract.deploySD20System(adminAddress);
      const receipt = await tx.wait();

      // Extract contract addresses from event
      const deployEvent = receipt.events?.find(
        event => event.event === 'SystemDeployed'
      );

      if (!deployEvent) {
        throw new Error('Failed to find SystemDeployed event');
      }

      const { registry, actionVerification, achievementNFT } = deployEvent.args;

      console.log(
        `SD20 system deployed=${registry}, actionVerification=${actionVerification}, achievementNFT=${achievementNFT}`
      );

      return {
        registry,
        actionVerification,
        achievementNFT,
      };

      /* Option 2: Deploy contracts individually
      // This is useful for development and testing
      
      // Deploy registry contract
      const registryFactory = new ContractFactory(
        SD20RegistryABI,
        SD20RegistryBytecode,
        this.wallet
      );
      
      const registryContract = await registryFactory.deploy();
      await registryContract.deployed();
      
      console.log(`Registry contract deployed at ${registryContract.address}`);
      
      // Grant admin role
      const adminRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('ADMIN_ROLE'));
      await registryContract.grantRole(adminRole, adminAddress);
      
      // Deploy action verification contract
      const actionFactory = new ContractFactory(
        SD20ActionVerificationABI,
        SD20ActionVerificationBytecode,
        this.wallet
      );
      
      const actionContract = await actionFactory.deploy(registryContract.address);
      await actionContract.deployed();
      
      console.log(`Action verification contract deployed at ${actionContract.address}`);
      
      // Grant admin role
      await actionContract.grantRole(ethers.constants.HashZero, adminAddress); // DEFAULT_ADMIN_ROLE
      
      // Deploy achievement NFT contract
      const nftFactory = new ContractFactory(
        SD20AchievementNFTABI,
        SD20AchievementNFTBytecode,
        this.wallet
      );
      
      const nftContract = await nftFactory.deploy(registryContract.address);
      await nftContract.deployed();
      
      console.log(`Achievement NFT contract deployed at ${nftContract.address}`);
      
      // Grant minter role
      const minterRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE'));
      await nftContract.grantRole(minterRole, adminAddress);
      
      return {
        registry,
        actionVerification,
        achievementNFT: nftContract.address
      };
      */
    } catch (error) {
      console.error('Error deploying SD20 system:', error);
      throw error;
    }
  }
}

/**
 * Interface for the SD20 Registry Contract
 */
export >;

  getParticipantIdByWallet(wallet);

  getAllParticipantIds();
}

/**
 * Interface for the SD20 Action Verification Contract
 */
export >;

  getAllActionIds();

  verifyActionHash(actionId, hash);
}

/**
 * Interface for the SD20 Achievement NFT Contract
 */
export >;

  getRoyaltyInfo(tokenId){
    contributors;
    shares;
  }>;
}

// ABIs and bytecode would be imported from separate files
// For brevity, I'm including simplified versions here

/**
 * ABI for the SD20 Registry Contract
 */
const SD20RegistryABI = [
  'function registerParticipant(string id, string name, address wallet, bool isAgent, string[] memory roles) public',
  'function deactivateParticipant(string id) public',
  'function updateParticipantRoles(string id, string[] memory roles) public',
  'function hasRole(string id, string role) view returns (bool)',
  'function getParticipant(string id) view returns (string name, address wallet, bool isAgent, bool isActive, string[] memory roles)',
  'function getParticipantIdByWallet(address wallet) view returns (string)',
  'function getAllParticipantIds() view returns (string[] memory)',
  'event ParticipantRegistered(string id, string name, address wallet, bool isAgent)',
  'event ParticipantDeactivated(string id)',
  'event ParticipantRolesUpdated(string id, string[] roles)',
];

/**
 * ABI for the SD20 Action Verification Contract
 */
const SD20ActionVerificationABI = [
  'function recordAction(string memory actionId, string memory actionType, string memory actionHash, string memory initiatorId) public',
  'function verifyAction(string memory actionId, string memory signature) public',
  'function completeAction(string memory actionId) public',
  'function getAction(string memory actionId) view returns (string memory actionType, string memory actionHash, string memory initiatorId, string[] memory verifierIds, uint256[] memory timestamps, bool isCompleted, uint256 completedAt)',
  'function getAllActionIds() view returns (string[] memory)',
  'function verifyActionHash(string memory actionId, string memory hash) view returns (bool)',
  'event ActionRecorded(string actionId, string actionType, string actionHash, string initiatorId)',
  'event ActionVerified(string actionId, string verifierId, uint256 timestamp)',
  'event ActionCompleted(string actionId, uint256 timestamp)',
];

/**
 * ABI for the SD20 Achievement NFT Contract
 */
const SD20AchievementNFTABI = [
  'function mintAchievement(address to, string memory uri, string memory actionId, string memory actionType, string memory initiatorId, string[] memory contributorIds, uint256[] memory shares) returns (uint256)',
  'function payRoyalties(uint256 tokenId) payable',
  'function getAchievement(uint256 tokenId) view returns (string memory actionId, string memory actionType, string memory initiatorId, string[] memory contributorIds, uint256[] memory shares, uint256 createdAt)',
  'function getRoyaltyInfo(uint256 tokenId) view returns (address[] memory contributors, uint256[] memory shares)',
  'event AchievementMinted(uint256 tokenId, string actionId, string actionType, string initiatorId)',
  'event RoyaltyPaid(uint256 tokenId, address recipient, uint256 amount)',
];

/**
 * ABI for the SD20 Factory Contract
 */
const SD20FactoryABI = [
  'function deploySD20System(address admin) returns (address registry, address actionVerification, address achievementNFT)',
  'event SystemDeployed(address registry, address actionVerification, address achievementNFT)',
];

// Bytecode placeholders (in a real implementation, these would be the actual contract bytecode)
const SD20RegistryBytecode = '0x';
const SD20ActionVerificationBytecode = '0x';
const SD20AchievementNFTBytecode = '0x';
const SD20FactoryBytecode = '0x';

/**
 * Factory function to create a configured blockchain service
 * @param config Configuration options
 */
export function createS2DOBlockchainService(config: {
  rpcUrl;
  privateKey;
  actionContractAddress;
  nftContractAddress;
}){
  return new S2DOBlockchainService(
    config.rpcUrl,
    config.privateKey,
    config.actionContractAddress,
    config.nftContractAddress
  );
}
