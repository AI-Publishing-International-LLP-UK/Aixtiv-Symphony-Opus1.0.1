import { ethers } from 'ethers';

/**
 * Interface for blockchain transaction result
 */
export interface TransactionResult {
  transactionHash: string;
  tokenId?: number;
}

/**
 * Interface for NFT metadata
 */
export interface NFTMetadata {
  name: string;
  description: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  [key: string]: any;
}

/**
 * Base class for blockchain service implementations
 * Provides standardized interface for interacting with blockchain networks
 */
export abstract class BlockchainService {
  /**
   * Store action verification on the blockchain
   * @param actionId Unique identifier for the action
   * @param actionHash Hash of the action data
   * @param initiatorAddress Address of the action initiator
   * @param verifierAddresses Addresses of action verifiers
   */
  abstract storeActionVerification(
    actionId: string,
    actionHash: string,
    initiatorAddress: string,
    verifierAddresses: string[]
  ): Promise<string>;

  /**
   * Verify if an action record exists and matches the given hash
   * @param actionId Unique identifier for the action
   * @param actionHash Hash of the action data
   */
  abstract verifyActionRecord(
    actionId: string,
    actionHash: string
  ): Promise<boolean>;

  /**
   * Mint an NFT with the given metadata
   * @param metadata NFT metadata
   * @param ownerAddress Address that will own the minted NFT
   * @param contributorAddresses Addresses of contributors to the NFT
   */
  abstract mintNFT(
    metadata: NFTMetadata,
    ownerAddress: string,
    contributorAddresses: string[]
  ): Promise<TransactionResult>;

  /**
   * Get all stored actions from the blockchain
   */
  abstract getAllActions(): Promise<any[]>;

  /**
   * Get details for a specific action
   * @param actionId Unique identifier for the action
   */
  abstract getAction(actionId: string): Promise<any>;

  /**
   * Utility method to format an address to checksum format
   * @param address Ethereum address
   */
  protected formatAddress(address: string): string {
    try {
      return ethers.getAddress(address);
    } catch (error) {
      throw new Error(`Invalid Ethereum address: ${address}`);
    }
  }
}

