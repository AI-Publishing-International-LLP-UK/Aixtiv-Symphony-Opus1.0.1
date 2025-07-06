// src/interfaces/blockchain/BlockchainServiceContracts.ts

/**
 * Supported blockchain networks
 */
export enum BlockchainNetwork {
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
  BINANCE = 'binance',
  SOLANA = 'solana',
  AVALANCHE = 'avalanche',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism'
}

/**
 * Transaction status enum
 */
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  DROPPED = 'dropped'
}

/**
 * Transaction receipt interface
 */
export interface TransactionReceipt {
  hash: string;
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  status: TransactionStatus;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  logs: TransactionLog[];
  events?: Record<string, any>;
}

/**
 * Transaction log interface
 */
export interface TransactionLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

/**
 * Smart contract event interface
 */
export interface ContractEvent {
  name: string;
  signature: string;
  address: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  returnValues: Record<string, any>;
  event: string;
  raw: {
    data: string;
    topics: string[];
  };
}

/**
 * Balance interface
 */
export interface TokenBalance {
  token: string;
  symbol: string;
  decimals: number;
  balance: string;
  formatted: string;
  usdValue?: string;
}

/**
 * Contract method parameter
 */
export interface ContractMethodParam {
  name: string;
  type: string;
  value: any;
}

/**
 * Contract function call options
 */
export interface ContractCallOptions {
  from?: string;
  gasLimit?: string | number;
  gasPrice?: string | number;
  value?: string | number;
  nonce?: number;
}

/**
 * Blockchain account interface
 */
export interface BlockchainAccount {
  address: string;
  privateKey?: string;
  publicKey?: string;
  network: BlockchainNetwork;
}

/**
 * Main blockchain service interface
 */
export interface BlockchainService {
  /**
   * Connect to a blockchain network
   */
  connect(network: BlockchainNetwork, options?: Record<string, any>): Promise<boolean>;
  
  /**
   * Disconnect from a blockchain network
   */
  disconnect(network: BlockchainNetwork): Promise<void>;
  
  /**
   * Check if connected to a network
   */
  isConnected(network: BlockchainNetwork): boolean;
  
  /**
   * Get the current network ID
   */
  getNetworkId(network: BlockchainNetwork): Promise<string>;
  
  /**
   * Get the current block number
   */
  getBlockNumber(network: BlockchainNetwork): Promise<number>;
  
  /**
   * Get transaction by hash
   */
  getTransaction(
    network: BlockchainNetwork,
    txHash: string
  ): Promise<TransactionReceipt | null>;
  
  /**
   * Send a transaction
   */
  sendTransaction(
    network: BlockchainNetwork,
    txData: {
      from: string;
      to: string;
      value: string | number;
      data?: string;
      gasLimit?: string | number;
      gasPrice?: string | number;
      nonce?: number;
    }
  ): Promise<string>;
  
  /**
   * Get the balance of an address
   */
  getBalance(
    network: BlockchainNetwork,
    address: string,
    tokenAddress?: string
  ): Promise<TokenBalance>;
  
  /**
   * Get token balances for an address
   */
  getTokenBalances(
    network: BlockchainNetwork,
    address: string,
    tokenAddresses?: string[]
  ): Promise<TokenBalance[]>;
  
  /**
   * Call a smart contract function (read-only)
   */
  callContractFunction(
    network: BlockchainNetwork,
    contractAddress: string,
    abi: any,
    functionName: string,
    params: any[],
    options?: ContractCallOptions
  ): Promise<any>;
  
  /**
   * Send a transaction to a smart contract function (state-changing)
   */
  sendContractTransaction(
    network: BlockchainNetwork,
    contractAddress: string,
    abi: any,
    functionName: string,
    params: any[],
    options: ContractCallOptions
  ): Promise<string>;
  
  /**
   * Deploy a smart contract
   */
  deployContract(
    network: BlockchainNetwork,
    abi: any,
    bytecode: string,
    constructorParams: any[],
    options: ContractCallOptions
  ): Promise<{ address: string; transactionHash: string }>;
  
  /**
   * Listen for contract events
   */
  subscribeToContractEvents(
    network: BlockchainNetwork,
    contractAddress: string,
    abi: any,
    eventName: string,
    callback: (event: ContractEvent) => void,
    filter?: Record<string, any>
  ): Promise<{ unsubscribe: () => void }>;
  
  /**
   * Get past events from a contract
   */
  getPastEvents(
    network: BlockchainNetwork,
    contractAddress: string,
    abi: any,
    eventName: string,
    options: {
      fromBlock?: number | 'earliest';
      toBlock?: number | 'latest';
      filter?: Record<string, any>;
    }
  ): Promise<ContractEvent[]>;
  
  /**
   * Create a new account
   */
  createAccount(network: BlockchainNetwork): Promise<BlockchainAccount>;
  
  /**
   * Import an account from private key
   */
  importAccount(
    network: BlockchainNetwork, 
    privateKey: string
  ): Promise<BlockchainAccount>;
  
  /**
   * Sign a message
   */
  signMessage(
    network: BlockchainNetwork, 
    message: string, 
    privateKey: string
  ): Promise<string>;
  
  /**
   * Verify a signature
   */
  verifySignature(
    network: BlockchainNetwork,
    message: string,
    signature: string,
    address: string
  ): Promise<boolean>;
}

/**
 * Smart contract metadata interface
 */
export interface ContractMetadata {
  name: string;
  address: string;
  network: BlockchainNetwork;
  abi: any;
  bytecode?: string;
  deploymentTransaction?: string;
  deploymentBlock?: number;
  deploymentTimestamp?: number;
  verified?: boolean;
  source?: string;
}

/**
 * Contract registry interface
 */
export interface ContractRegistry {
  /**
   * Register a contract
   */
  registerContract(metadata: ContractMetadata): Promise<void>;
  
  /**
   * Get contract by address
   */
  getContract(
    network: BlockchainNetwork, 
    address: string
  ): Promise<ContractMetadata | null>;
  
  /**
   * Get contracts by name
   */
  getContractsByName(name: string): Promise<ContractMetadata[]>;
  
  /**
   * Get all contracts for a network
   */
  getContractsForNetwork(network: BlockchainNetwork): Promise<ContractMetadata[]>;
  
  /**
   * Remove a contract from the registry
   */
  removeContract(network: BlockchainNetwork, address: string): Promise<boolean>;
}

/**
 * Abstract base class for blockchain services
 */
export abstract class BaseBlockchainService implements BlockchainService {
  protected networks: Map<BlockchainNetwork, any>;
  
  constructor() {
    this.networks = new Map();
  }
  
  abstract connect(network: BlockchainNetwork, options?: Record<string, any>): Promise<boolean>;
  abstract disconnect(network: BlockchainNetwork): Promise<void>;
  
  isConnected(network: BlockchainNetwork): boolean {
    return this.networks.has(network);
  }
  
  abstract getNetworkId(network: BlockchainNetwork): Promise<string>;
  abstract getBlockNumber(network: BlockchainNetwork): Promise<number>;
  abstract getTransaction(network: BlockchainNetwork, txHash: string): Promise<TransactionReceipt | null>;
  abstract sendTransaction(network: BlockchainNetwork, txData: any): Promise<string>;
  abstract getBalance(network: BlockchainNetwork, address: string, tokenAddress?: string): Promise<TokenBalance>;
  abstract getTokenBalances(network: BlockchainNetwork, address: string, tokenAddresses?: string[]): Promise<TokenBalance[]>;
  abstract callContractFunction(network: BlockchainNetwork, contractAddress: string, abi: any, functionName: string, params: any[], options?: ContractCallOptions): Promise<any>;
  abstract sendContractTransaction(network: BlockchainNetwork, contractAddress: string, abi: any, functionName: string, params: any[], options: ContractCallOptions): Promise<string>;
  abstract deployContract(network: BlockchainNetwork, abi: any, bytecode: string, constructorParams: any[], options: ContractCallOptions): Promise<{ address: string; transactionHash: string }>;
  abstract subscribeToContractEvents(network: BlockchainNetwork, contractAddress: string, abi: any, eventName: string, callback: (event: ContractEvent) => void, filter?: Record<string, any>): Promise<{ unsubscribe: () => void }>;
  abstract getPastEvents(network: BlockchainNetwork, contractAddress: string, abi: any, eventName: string, options: any): Promise<ContractEvent[]>;
  abstract createAccount(network: BlockchainNetwork): Promise<BlockchainAccount>;
  abstract importAccount(network: BlockchainNetwork, privateKey: string): Promise<BlockchainAccount>;
  abstract signMessage(network: BlockchainNetwork, message: string, privateKey: string): Promise<string>;
  abstract verifySignature(network: BlockchainNetwork, message: string, signature: string, address: string): Promise<boolean>;
  
  /**
   * Utility method to convert wei to ether
   */
  protected weiToEther(wei: string): string {
    // 1 Ether = 10^18 Wei
    const weiValue = BigInt(wei);
    const etherValue = Number(weiValue) / 1e18;
    return etherValue.toString();
  }
  
  /**
   * Utility method to convert ether to wei
   */
  protected etherToWei(ether: string): string {
    // 1 Ether = 10^18 Wei
    const etherValue = parseFloat(ether);
    const weiValue = BigInt(Math.floor(etherValue * 1e18));
    return weiValue.toString();
  }
}

export default {
  BlockchainNetwork,
  TransactionStatus,
  BaseBlockchainService
};
