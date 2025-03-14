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
  SD20FactoryBytecode
} from './blockchain-contracts';

/**
 * Implementation of the Blockchain Service for S2DO system
 */
export class S2DOBlockchainService implements BlockchainService {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private actionContract: Contract;
  private nftContract: Contract;
  private eventListeners: Map<string, Function[]> = new Map();
  
  /**
   * Create a new S2DO Blockchain Service instance
   * @param rpcUrl URL for the RPC provider
   * @param privateKey Private key for transaction signing
   * @param actionContractAddress Address of the action verification contract
   * @param nftContractAddress Address of the achievement NFT contract
   */
  constructor(
    rpcUrl: string,
    privateKey: string,
    actionContractAddress: string,
    nftContractAddress: string
  ) {
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
  updateContractAddresses(actionContractAddress: string, nftContractAddress: string): void {
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
  private setupEventListeners(): void {
    // Listen for ActionVerified events
    this.actionContract.on('ActionVerified', (actionId, verifierId, timestamp, event) => {
      console.log(`Action verified on blockchain: ${actionId}`);
      this.triggerEventListeners('ActionVerified', { 
        actionId, 
        verifierId, 
        timestamp: timestamp.toNumber(),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber
      });
    });
    
    // Listen for ActionCompleted events
    this.actionContract.on('ActionCompleted', (actionId, timestamp, event) => {
      console.log(`Action completed on blockchain: ${actionId}`);
      this.triggerEventListeners('ActionCompleted', { 
        actionId, 
        timestamp: timestamp.toNumber(),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber
      });
    });
    
    // Listen for AchievementMinted events
    this.nftContract.on('AchievementMinted', (tokenId, actionId, actionType, initiatorId, event) => {
      console.log(`Achievement NFT minted: tokenId=${tokenId}, actionId=${actionId}`);
      this.triggerEventListeners('AchievementMinted', { 
        tokenId: tokenId.toNumber(), 
        actionId, 
        actionType, 
        initiatorId,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber
      });
    });
    
    // Listen for RoyaltyPaid events
    this.nftContract.on('RoyaltyPaid', (tokenId, recipient, amount, event) => {
      console.log(`Royalty paid: tokenId=${tokenId}, recipient=${recipient}, amount=${amount}`);
      this.triggerEventListeners('RoyaltyPaid', { 
        tokenId: tokenId.toNumber(), 
        recipient, 
        amount: ethers.utils.formatEther(amount),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber
      });
    });
  }
  
  /**
   * Remove all event listeners
   */
  private removeEventListeners(): void {
    this.actionContract.removeAllListeners();
    this.nftContract.removeAllListeners();
  }
  
  /**
   * Register an event listener
   * @param eventName Name of the event to listen for
   * @param listener Function to call when the event is triggered
   */
  listenForEvents(eventName: string, listener: Function): void {
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
  private triggerEventListeners(eventName: string, eventData: any): void {
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
    actionId: string,
    actionHash: string,
    initiatorAddress: string,
    verifierAddresses: string[]
  ): Promise<string> {
    try {
      // First, check if the action is already recorded
      const actionExists = await this.actionContract.verifyActionHash(actionId, actionHash);
      
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
      console.log(`Action recorded on blockchain: ${actionId}, txHash: ${receipt.transactionHash}`);
      
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
      
      console.log(`Action completed on blockchain: ${actionId}, txHash: ${completeReceipt.transactionHash}`);
      
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
    metadata: any,
    ownerAddress: string,
    contributorAddresses: string[]
  ): Promise<string> {
    try {
      console.log(`Minting NFT for ${metadata.name}...`);
      
      // Upload metadata to IPFS (in a real system)
      // For this example, we'll just use a placeholder URI
      const uri = `ipfs://QmPlaceholderHash/${metadata.name.replace(/\s+/g, '-').toLowerCase()}`;
      
      // Prepare royalty shares (equal distribution)
      const contributorShares = [];
      const sharePerContributor = Math.floor(10000 / contributorAddresses.length);
      let remainingShares = 10000;
      
      for (let i = 0; i < contributorAddresses.length; i++) {
        let share = sharePerContributor;
        
        // Assign remaining shares to the last contributor
        if (i === contributorAddresses.length - 1) {
          share = remainingShares;
        } else {
          remainingShares -= share;
        }
        
        contributorShares.push(share);
      }
      
      // Extract action information from metadata
      const actionId = metadata.attributes.find((attr: any) => attr.trait_type === 'Action')?.value || 'Unknown';
      const actionType = actionId;
      const initiatorId = metadata.contributors[0]?.id || 'unknown';
      
      // Get contributor IDs
      const contributorIds = metadata.contributors.map((contributor: any) => contributor.id);
      
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
      const mintEvent = receipt.events?.find(event => event.event === 'AchievementMinted');
      const tokenId = mintEvent?.args?.tokenId?.toString() || '0';
      
      console.log(`NFT minted: tokenId=${tokenId}, txHash: ${receipt.transactionHash}`);
      
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
    actionId: string,
    actionHash: string
  ): Promise<boolean> {
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
  async getAllActions(): Promise<string[]> {
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
  async getAction(actionId: string): Promise<any> {
    try {
      const action = await this.actionContract.getAction(actionId);
      
      return {
        actionType: action.actionType,
        actionHash: action.actionHash,
        initiatorId: action.initiatorId,
        verifierIds: action.verifierIds,
        timestamps: action.timestamps.map((t: ethers.BigNumber) => t.toNumber()),
        isCompleted: action.isCompleted,
        completedAt: action.completedAt.toNumber()
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
  async getAchievement(tokenId: number): Promise<any> {
    try {
      const achievement = await this.nftContract.getAchievement(tokenId);
      
      return {
        actionId: achievement.actionId,
        actionType: achievement.actionType,
        initiatorId: achievement.initiatorId,
        contributorIds: achievement.contributorIds,
        shares: achievement.shares.map((s: ethers.BigNumber) => s.toNumber()),
        createdAt: achievement.createdAt.toNumber()
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
  private generateSignature(actionId: string, signerAddress: string): string {
    // In a real system, this would be signed by the verifier's private key
    // For this example, we'll just use a placeholder signature
    const message = `${actionId}-${signerAddress}-${Date.now()}`;
    return ethers.utils.id(message);
  }
}

/**
 * Factory for deploying S2DO smart contracts
 */
export class S2DOContractFactory {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  
  /**
   * Create a new S2DO Contract Factory
   * @param rpcUrl URL for the RPC provider
   * @param privateKey Private key for contract deployment
   */
  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }
  
  /**
   * Deploy the full SD20 system contracts
   * @param adminAddress Address to grant admin privileges
   */
  async deploySD20System(adminAddress: string): Promise<{
    registry: string;
    actionVerification: string;
    achievementNFT: string;
  }> {
    try {
      console.log('Deploying SD20 system contracts...');
      
      // Option 1: Deploy using factory contract
      // This is the preferred method for production, as it ensures consistency
      
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
      const deployEvent = receipt.events?.find(event => event.event === 'SystemDeployed');
      
      if (!deployEvent) {
        throw new Error('Failed to find SystemDeployed event');
      }
      
      const { registry, actionVerification, achievementNFT } = deployEvent.args;
      
      console.log(`SD20 system deployed: registry=${registry}, actionVerification=${actionVerification}, achievementNFT=${achievementNFT}`);
      
      return {
        registry,
        actionVerification,
        achievementNFT
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
        registry: registryContract.address,
        actionVerification: actionContract.address,
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
export interface SD20RegistryContract {
  registerParticipant(
    id: string,
    name: string,
    wallet: string,
    isAgent: boolean,
    roles: string[]
  ): Promise<void>;
  
  deactivateParticipant(id: string): Promise<void>;
  
  updateParticipantRoles(id: string, roles: string[]): Promise<void>;
  
  hasRole(id: string, role: string): Promise<boolean>;
  
  getParticipant(id: string): Promise<{
    name: string;
    wallet: string;
    isAgent: boolean;
    isActive: boolean;
    roles: string[];
  }>;
  
  getParticipantIdByWallet(wallet: string): Promise<string>;
  
  getAllParticipantIds(): Promise<string[]>;
}

/**
 * Interface for the SD20 Action Verification Contract
 */
export interface ActionVerificationContract {
  recordAction(
    actionId: string,
    actionType: string,
    actionHash: string,
    initiatorId: string
  ): Promise<void>;
  
  verifyAction(
    actionId: string,
    signature: string
  ): Promise<void>;
  
  completeAction(actionId: string): Promise<void>;
  
  getAction(actionId: string): Promise<{
    actionType: string;
    actionHash: string;
    initiatorId: string;
    verifierIds: string[];
    timestamps: number[];
    isCompleted: boolean;
    completedAt: number;
  }>;
  
  getAllActionIds(): Promise<string[]>;
  
  verifyActionHash(actionId: string, hash: string): Promise<boolean>;
}

/**
 * Interface for the SD20 Achievement NFT Contract
 */
export interface AchievementNFTContract {
  mintAchievement(
    to: string,
    uri: string,
    actionId: string,
    actionType: string,
    initiatorId: string,
    contributorIds: string[],
    shares: number[]
  ): Promise<number>;
  
  payRoyalties(tokenId: number): Promise<void>;
  
  getAchievement(tokenId: number): Promise<{
    actionId: string;
    actionType: string;
    initiatorId: string;
    contributorIds: string[];
    shares: number[];
    createdAt: number;
  }>;
  
  getRoyaltyInfo(tokenId: number): Promise<{
    contributors: string[];
    shares: number[];
  }>;
}

// ABIs and bytecode would be imported from separate files
// For brevity, I'm including simplified versions here

/**
 * ABI for the SD20 Registry Contract
 */
const SD20RegistryABI = [
  "function registerParticipant(string id, string name, address wallet, bool isAgent, string[] memory roles) public",
  "function deactivateParticipant(string id) public",
  "function updateParticipantRoles(string id, string[] memory roles) public",
  "function hasRole(string id, string role) public view returns (bool)",
  "function getParticipant(string id) public view returns (string name, address wallet, bool isAgent, bool isActive, string[] memory roles)",
  "function getParticipantIdByWallet(address wallet) public view returns (string)",
  "function getAllParticipantIds() public view returns (string[] memory)",
  "event ParticipantRegistered(string id, string name, address wallet, bool isAgent)",
  "event ParticipantDeactivated(string id)",
  "event ParticipantRolesUpdated(string id, string[] roles)"
];

/**
 * ABI for the SD20 Action Verification Contract
 */
const SD20ActionVerificationABI = [
  "function recordAction(string memory actionId, string memory actionType, string memory actionHash, string memory initiatorId) public",
  "function verifyAction(string memory actionId, string memory signature) public",
  "function completeAction(string memory actionId) public",
  "function getAction(string memory actionId) public view returns (string memory actionType, string memory actionHash, string memory initiatorId, string[] memory verifierIds, uint256[] memory timestamps, bool isCompleted, uint256 completedAt)",
  "function getAllActionIds() public view returns (string[] memory)",
  "function verifyActionHash(string memory actionId, string memory hash) public view returns (bool)",
  "event ActionRecorded(string actionId, string actionType, string actionHash, string initiatorId)",
  "event ActionVerified(string actionId, string verifierId, uint256 timestamp)",
  "event ActionCompleted(string actionId, uint256 timestamp)"
];

/**
 * ABI for the SD20 Achievement NFT Contract
 */
const SD20AchievementNFTABI = [
  "function mintAchievement(address to, string memory uri, string memory actionId, string memory actionType, string memory initiatorId, string[] memory contributorIds, uint256[] memory shares) public returns (uint256)",
  "function payRoyalties(uint256 tokenId) public payable",
  "function getAchievement(uint256 tokenId) public view returns (string memory actionId, string memory actionType, string memory initiatorId, string[] memory contributorIds, uint256[] memory shares, uint256 createdAt)",
  "function getRoyaltyInfo(uint256 tokenId) public view returns (address[] memory contributors, uint256[] memory shares)",
  "event AchievementMinted(uint256 tokenId, string actionId, string actionType, string initiatorId)",
  "event RoyaltyPaid(uint256 tokenId, address recipient, uint256 amount)"
];

/**
 * ABI for the SD20 Factory Contract
 */
const SD20FactoryABI = [
  "function deploySD20System(address admin) public returns (address registry, address actionVerification, address achievementNFT)",
  "event SystemDeployed(address registry, address actionVerification, address achievementNFT)"
];

// Bytecode placeholders (in a real implementation, these would be the actual contract bytecode)
const SD20RegistryBytecode = "0x";
const SD20ActionVerificationBytecode = "0x";
const SD20AchievementNFTBytecode = "0x";
const SD20FactoryBytecode = "0x";

/**
 * Factory function to create a configured blockchain service
 * @param config Configuration options
 */
export function createS2DOBlockchainService(config: {
  rpcUrl: string;
  privateKey: string;
  actionContractAddress: string;
  nftContractAddress: string;
}): S2DOBlockchainService {
  return new S2DOBlockchainService(
    config.rpcUrl,
    config.privateKey,
    config.actionContractAddress,
    config.nftContractAddress
  );
}
