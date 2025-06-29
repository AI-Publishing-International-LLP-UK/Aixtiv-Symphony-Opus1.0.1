import { ethers } from 'ethers';
import { BlockchainService, TransactionResult } from './sd20-core';
import {
  SD20ActionVerificationABI,
  SD20AchievementNFTABI,
  SD20ActionVerificationBytecode,
  SD20AchievementNFTBytecode
} from './blockchain-contracts';

/**
 * Implementation of BlockchainService for S2DO (Secure Structured Data Objects)
 * that handles blockchain interactions for action verification and NFT minting.
 */
/**
 * Interface for NFT metadata structure
 */
export interface NFTMetadata {
  name: string;
  description: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  [key: string]: any; // Allow for additional properties
};

/**
 * S2DOBlockchainService - A service for interacting with S2DO blockchain functionality
 * 
 * This service handles:
 * - Storing action verifications
 * - Verifying action records
 * - Minting NFTs for verified actions
 * - Retrieving actions from the blockchain
 */
export class S2DOBlockchainService extends BlockchainService {
  protected provider: ethers.JsonRpcProvider;
  protected wallet: ethers.Wallet;
  protected actionContract: ethers.Contract;
  protected nftContract: ethers.Contract;

  /**
   * Constructor for the S2DOBlockchainService
   * 
   * @param rpcUrl - Ethereum RPC URL
   * @param privateKey - Private key for transactions
   * @param actionContractAddress - Address of the action contract
   * @param nftContractAddress - Address of the NFT contract
   */
  constructor(
    rpcUrl: string,
    privateKey: string,
    actionContractAddress: string,
    nftContractAddress: string
  ) {
    super(); // Call parent class constructor
    
    // Initialize provider and wallet
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    
    // Initialize contracts
    this.actionContract = new ethers.Contract(
      actionContractAddress,
      SD20ActionVerificationABI,
      this.wallet
    );
    
    this.nftContract = new ethers.Contract(
      nftContractAddress,
      SD20AchievementNFTABI,
      this.wallet
    );

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Creates a test instance of S2DOBlockchainService with mocked dependencies
   * 
   * This factory method is designed for testing purposes only. It allows creating
   * an instance of S2DOBlockchainService with mocked dependencies (provider, wallet,
   * contracts) to enable isolated testing without actual blockchain interactions.
   * 
   * @param mockProvider - Mock for the JsonRpcProvider
   * @param mockWallet - Mock for the Wallet
   * @param mockActionContract - Mock for the action contract
   * @param mockNftContract - Mock for the NFT contract
   * @returns A configured S2DOBlockchainService instance for testing
   */
  public static testInstance(
    mockProvider: any,
    mockWallet: any,
    mockActionContract: any,
    mockNftContract: any
  ): S2DOBlockchainService {
    // Create an instance with placeholder values
    const instance = new S2DOBlockchainService(
      'http://mock-rpc-url',
      '0x0000000000000000000000000000000000000000000000000000000000000001', // Valid placeholder private key format
      '0x0000000000000000000000000000000000000001', // Mock contract address
      '0x0000000000000000000000000000000000000002'  // Mock contract address
    );
    
    // Replace the real dependencies with mocks
    instance.provider = mockProvider;
    instance.wallet = mockWallet || {
      provider: mockProvider
    } as any;
    instance.actionContract = mockActionContract;
    instance.nftContract = mockNftContract;
    
    // Return the configured instance
    return instance;
  }

  /**
   * Set up event listeners for blockchain events
   */
  private setupEventListeners(): void {
    this.actionContract.on('ActionVerified', (actionId, verifier) => {
      console.log(`Action ${actionId} verified by ${verifier}`);
    });
    
    this.actionContract.on('ActionCompleted', (actionId) => {
      console.log(`Action ${actionId} completed`);
    });
    
    this.nftContract.on('Transfer', (from, to, tokenId) => {
      console.log(`NFT ${tokenId} transferred from ${from} to ${to}`);
    });
  }

  /**
   * Remove all event listeners
   */
  public removeEventListeners(): void {
    this.actionContract.removeAllListeners();
    this.nftContract.removeAllListeners();
  }

  /**
   * Store and verify an action on the blockchain
   * 
   * @param actionId Unique identifier for the action
   * @param actionHash Hash of the action data
   * @param initiatorAddress Address of the action initiator
   * @param verifierAddresses Addresses of entities that will verify the action
   * @returns The transaction hash
   */
  public async storeActionVerification(
    actionId: string,
    actionHash: string,
    initiatorAddress: string,
    verifierAddresses: string[]
  ): Promise<string> {
    // Check if the action already exists
    const exists = await this.actionContract.verifyActionHash(actionId, actionHash);
    if (exists) {
      throw new Error(`Action with ID ${actionId} already exists`);
    }

    // Record the action on the blockchain
    const actionType = `S2DO:${new Date().getTime()}`;
    
    const tx = await this.actionContract.recordAction(
      actionId,
      actionType,
      actionHash,
      initiatorAddress
    );
    
    const receipt = await tx.wait();
    
    // Add verifiers for the action
    for (const verifier of verifierAddresses) {
      const verifyTx = await this.actionContract.verifyAction(
        actionId,
        verifier
      );
      await verifyTx.wait();
    }
    
    // Mark the action as complete
    const completeTx = await this.actionContract.completeAction(actionId);
    await completeTx.wait();
    
    return receipt.hash;
  }

  /**
   * Verify if an action record exists with the given hash
   * 
   * @param actionId The ID of the action to verify
   * @param actionHash The hash of the action data
   * @returns True if the action exists with the given hash
   */
  public async verifyActionRecord(actionId: string, actionHash: string): Promise<boolean> {
    try {
      return await this.actionContract.verifyActionHash(actionId, actionHash);
    } catch (error) {
      console.error(`Error verifying action record: ${error}`);
      return false;
    }
  }

  /**
   * Mint a new NFT for an achievement or verification
   * 
   * @param metadata Metadata for the NFT
   * @param ownerAddress Address of the NFT owner
   * @param contributorAddresses Addresses of contributors to the achievement
   * @returns The transaction result with token ID
   */
  public async mintNFT(
    metadata: { [key: string]: any },
    ownerAddress: string,
    contributorAddresses: string[]
  ): Promise<TransactionResult> {
    try {
      const metadataURI = this.createMetadataURI(metadata);
      
      const tx = await this.nftContract.mintAchievement(
        ownerAddress,
        metadataURI,
        contributorAddresses
      );
      
      const receipt = await tx.wait();
      
      // Find the Transfer event to get the token ID
      const transferEvent = receipt.logs.find((log: any) => {
        try {
          const parsedLog = this.nftContract.interface.parseLog(log);
          return parsedLog && parsedLog.name === 'Transfer';
        } catch (e) {
          return false;
        }
      });
      
      let tokenId = '0';
      if (transferEvent) {
        const parsedLog = this.nftContract.interface.parseLog(transferEvent);
        tokenId = parsedLog.args.tokenId.toString();
      }
      
      return {
        transactionHash: receipt.hash,
        tokenId: tokenId
      };
    } catch (error) {
      console.error(`Error minting NFT: ${error}`);
      throw error;
    }
  }

  /**
   * Get all actions recorded on the blockchain
   * 
   * @returns Array of action records
   */
  public async getAllActions(): Promise<any[]> {
    try {
      const actions = await this.actionContract.getAllActions();
      return actions.map((action: any) => ({
        id: action.id,
        type: action.actionType,
        hash: action.actionHash,
        initiator: action.initiator,
        timestamp: new Date(Number(action.timestamp) * 1000),
        status: this.getStatusFromCode(action.status),
        verifiers: action.verifiers
      }));
    } catch (error) {
      console.error(`Error getting all actions: ${error}`);
      return [];
    }
  }

  /**
   * Get detailed information about a specific action
   * 
   * @param actionId The ID of the action to retrieve
   * @returns The action details or null if not found
   */
  public async getAction(actionId: string): Promise<any | null> {
    try {
      const action = await this.actionContract.getAction(actionId);
      
      if (!action.id) {
        return null;
      }
      
      return {
        id: action.id,
        type: action.actionType,
        hash: action.actionHash,
        initiator: action.initiator,
        timestamp: new Date(Number(action.timestamp) * 1000),
        status: this.getStatusFromCode(action.status),
        verifiers: action.verifiers
      };
    } catch (error) {
      console.error(`Error getting action: ${error}`);
      return null;
    }
  }

  /**
   * Create a metadata URI for an NFT
   * 
   * @param metadata The metadata to encode
   * @returns A URI string representing the metadata
   */
  private createMetadataURI(metadata: { [key: string]: any }): string {
    // In a real implementation, this might upload to IPFS or Arweave
    // For this example, we'll just use a data URI
    const json = JSON.stringify(metadata);
    const encoded = Buffer.from(json).toString('base64');
    return `data:application/json;base64,${encoded}`;
  }

  /**
   * Convert a numeric status code to a readable string
   * 
   * @param statusCode The numeric status code
   * @returns A readable status string
   */
  private getStatusFromCode(statusCode: number): string {
    const statuses = [
      'Pending',
      'In Progress',
      'Verified',
      'Completed',
      'Rejected'
    ];
    
    return statuses[statusCode] || 'Unknown';
  }

  /**
   * Deploy new contracts to the blockchain
   * 
   * @returns The addresses of the deployed contracts
   */
  public async deployContracts(): Promise<{ actionContract: string, nftContract: string }> {
    // Deploy action verification contract
    const actionContractFactory = new ethers.ContractFactory(
      SD20ActionVerificationABI,
      SD20ActionVerificationBytecode,
      this.wallet
    );
    
    const actionContract = await actionContractFactory.deploy();
    await actionContract.waitForDeployment();
    
    // Deploy NFT contract
    const nftContractFactory = new ethers.ContractFactory(
      SD20AchievementNFTABI,
      SD20AchievementNFTBytecode,
      this.wallet
    );
    
    const nftContract = await nftContractFactory.deploy("S2DO Achievement", "S2DO");
    await nftContract.waitForDeployment();
    
    const actionContractAddress = await actionContract.getAddress();
    const nftContractAddress = await nftContract.getAddress();
    
    return {
      actionContract: actionContractAddress,
      nftContract: nftContractAddress
    };
  }
}

  /**
   * Creates a test instance of S2DOBlockchainService with mocked dependencies
   * 
   * This factory method is designed for testing purposes only. It allows creating
   * an instance of S2DOBlockchainService with mocked dependencies (provider, wallet,
   * contracts) to enable isolated testing without actual blockchain interactions.
   * 
   * @param mockProvider - Optional mock for the JsonRpcProvider
   * @param mockWallet - Optional mock for the Wallet
   * @param mockActionContract - Optional mock for the action contract
   * @param mockNftContract - Optional mock for the NFT contract
   * @returns A configured S2DOBlockchainService instance for testing
   */
  static testInstance(
    mockProvider?: Partial<ethers.JsonRpcProvider>,
    mockWallet?: Partial<ethers.Wallet>,
    mockActionContract?: Partial<ethers.Contract>,
    mockNftContract?: Partial<ethers.Contract>
  ): S2DOBlockchainService {
    // Create instance with dummy values
    const instance = new S2DOBlockchainService(
      'http://dummy-rpc-url.test',
      '0x0000000000000000000000000000000000000000000000000000000000000001', // Valid dummy private key
      '0x0000000000000000000000000000000000000001', // Dummy contract address
      '0x0000000000000000000000000000000000000002'  // Dummy contract address
    );
    
    // Override with mocks if provided
    if (mockProvider) {
      instance.provider = mockProvider as ethers.JsonRpcProvider;
    }
    
    if (mockWallet) {
      instance.wallet = mockWallet as ethers.Wallet;
    }
    
    if (mockActionContract) {
      instance.actionContract = mockActionContract as ethers.Contract;
    }
    
    if (mockNftContract) {
      instance.nftContract = mockNftContract as ethers.Contract;
    }
    
    return instance;
  }

  /**
   * Stores a verification of an action on the blockchain
   * 
   * @param actionId - Unique identifier for the action
   * @param actionHash - Hash of the action data
   * @param initiatorAddress - Address of the action initiator
   * @param verifierAddresses - Addresses of entities verifying the action
   * @returns Promise resolving to the transaction hash
   * @throws Error if action already exists or transaction fails
   */
  async storeActionVerification(
    actionId: string,
    actionHash: string,
    initiatorAddress: string,
    verifierAddresses: string[]
  ): Promise<string> {
    // First check if action already exists
    const exists = await this.actionContract.verifyActionHash(actionId, actionHash);
    if (exists) {
      throw new Error(`Action with ID ${actionId} already exists`);
    }

    // Record the action
    const timestamp = Math.floor(Date.now() / 1000);
    const actionName = `S2DO:${actionId}:${timestamp}`;
    
    const recordTx = await this.actionContract.recordAction(
      actionId,
      actionName,
      actionHash,
      initiatorAddress
    );
    
    const recordReceipt = await recordTx.wait();
    
    // Add verifiers
    for (const verifier of verifierAddresses) {
      const verifyTx = await this.actionContract.verifyAction(actionId, verifier);
      await verifyTx.wait();
    }
    
    // Complete the action
    const completeTx = await this.actionContract.completeAction(actionId);
    await completeTx.wait();
    
    // Return the transaction hash of the record action
    return recordReceipt.hash;
  }

  /**
   * Verifies if an action record exists on the blockchain
   * 
   * @param actionId - Unique identifier for the action
   * @param actionHash - Hash of the action data
   * @returns Promise resolving to a boolean indicating if the action exists
   */
  async verifyActionRecord(actionId: string, actionHash: string): Promise<boolean> {
    try {
      return await this.actionContract.verifyActionHash(actionId, actionHash);
    } catch (error) {
      console.error(`Error verifying action record: ${error}`);
      return false;
    }
  }

  /**
   * Mints an NFT for a verified action
   * 
   * @param metadata - Metadata for the NFT (name, description, etc.)
   * @param ownerAddress - Address that will own the NFT
   * @param contributorAddresses - Addresses of contributors to the NFT
   * @returns Promise resolving to the token ID and transaction hash
   */
  async mintNFT(
    metadata: NFTMetadata,
    ownerAddress: string,
    contributorAddresses: string[]
  ): Promise<TransactionResult> {
    try {
      // Convert metadata to JSON string
      const metadataURI = JSON.stringify(metadata);
      
      // Mint the NFT
      const mintTx = await this.nftContract.mintNFT(
        metadataURI,
        ownerAddress,
        contributorAddresses
      );
      
      const receipt = await mintTx.wait();
      
      // Get token ID from events
      // In ethers v6, events are accessed differently
      const event = receipt.logs.find((log: ethers.Log) => 
        this.nftContract.interface.parseLog({
          topics: log.topics,
          data: log.data
        })?.name === 'Transfer'
      );
      
      if (!event) {
        throw new Error('Transfer event not found in transaction receipt');
      }
      
      const parsedLog = this.nftContract.interface.parseLog({
        topics: event.topics,
        data: event.data
      });
      
      const tokenId = Number(parsedLog?.args?.tokenId || 0);
      
      return {
        tokenId,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error(`Error minting NFT: ${error}`);
      throw error;
    }
  }

  /**
   * Gets all actions from the blockchain
   * 
   * @returns Promise resolving to an array of actions
   */
  async getAllActions(): Promise<any[]> {
    try {
      return await this.actionContract.getAllActions();
    } catch (error) {
      console.error(`Error getting all actions: ${error}`);
      return [];
    }
  }

  /**
   * Gets details for a specific action from the blockchain
   * 
   * @param actionId - Unique identifier for the action
   * @returns Promise resolving to the action details
   */
  async getAction(actionId: string): Promise<any> {
    try {
      // Call the contract's getAction method to retrieve action details
      const action = await this.actionContract.getAction(actionId);
      return action;
    } catch (error) {
      console.error(`Error getting action ${actionId}: ${error}`);
      return null;
    }
  }


  /**
   * Registers event listeners for blockchain events
   * 
   * @param eventName - Name of the event to listen for
   * @param callback - Callback function to execute when event is triggered
   */
  registerEventListener(eventName: string, callback: (event: any) => void): void {
    this.actionContract.on(eventName, (...args) => {
      // In ethers v6, event arguments are passed directly
      callback(args[args.length - 1]);
    });
  }

  /**
   * Removes all event listeners
   */
  removeEventListeners(): void {
    this.actionContract.removeAllListeners();
  }
}

