import { ethers } from 'ethers';
import { S2DOBlockchainService } from '../src/s2do-blockchain-integration';

/**
 * Test utilities for S2DOBlockchainService testing
 * 
 * This file provides helpers to create mocks and test instances
 * of S2DOBlockchainService without direct ethers dependencies.
 */

/**
 * Creates a mock ethers Contract with predefined behaviors
 * 
 * @param customMethods Optional methods to override default behaviors
 * @returns A mock Contract object ready for testing
 */
export function createMockContract(customMethods = {}) {
  const defaultMethods = {
    on: jest.fn(),
    removeAllListeners: jest.fn(),
    verifyActionHash: jest.fn().mockResolvedValue(false),
    recordAction: jest.fn().mockReturnValue({
      wait: jest.fn().mockResolvedValue({
        transactionHash: 'mockTxHash',
        events: [],
        logs: []
      })
    }),
    verifyAction: jest.fn().mockReturnValue({
      wait: jest.fn().mockResolvedValue({})
    }),
    completeAction: jest.fn().mockReturnValue({
      wait: jest.fn().mockResolvedValue({})
    }),
    mintNFT: jest.fn().mockReturnValue({
      wait: jest.fn().mockResolvedValue({
        transactionHash: 'mockTxHash',
        logs: [{
          topics: ['0xTopic1', '0xTopic2'],
          data: '0xData'
        }]
      })
    }),
    getAllActions: jest.fn().mockResolvedValue([
      { id: 'action1', hash: 'hash1' },
      { id: 'action2', hash: 'hash2' }
    ]),
    getAction: jest.fn().mockResolvedValue({
      id: 'action1',
      hash: 'hash1',
      status: 'completed'
    }),
    interface: {
      parseLog: jest.fn().mockReturnValue({ 
        name: 'Transfer', 
        args: { tokenId: 123 } 
      })
    }
  };
  
  return {
    ...defaultMethods,
    ...customMethods
  };
}

/**
 * Creates a mock JsonRpcProvider
 * 
 * @param customMethods Optional methods to override defaults
 * @returns A mock JsonRpcProvider object
 */
export function createMockProvider(customMethods = {}) {
  const defaultMethods = {
    getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }),
    getBlock: jest.fn().mockResolvedValue({
      timestamp: Math.floor(Date.now() / 1000)
    }),
    getLogs: jest.fn().mockResolvedValue([])
  };
  
  return {
    ...defaultMethods,
    ...customMethods
  };
}

/**
 * Creates a mock Wallet
 * 
 * @param customMethods Optional methods to override defaults
 * @returns A mock Wallet object
 */
export function createMockWallet(customMethods = {}) {
  const defaultMethods = {
    address: '0xMockWalletAddress',
    connect: jest.fn().mockReturnThis(),
    signMessage: jest.fn().mockResolvedValue('0xMockSignature'),
    provider: createMockProvider()
  };
  
  return {
    ...defaultMethods,
    ...customMethods
  };
}

/**
 * Creates a test instance of S2DOBlockchainService with mocked dependencies
 * 
 * @param options Optional configuration to customize the mock behavior
 * @returns A configured S2DOBlockchainService instance for testing
 */
export function createTestS2DOBlockchainService(options: {
  mockProvider?: Partial<ethers.JsonRpcProvider>,
  mockWallet?: Partial<ethers.Wallet>,
  mockActionContract?: Partial<ethers.Contract>,
  mockNftContract?: Partial<ethers.Contract>
} = {}) {
  // Create default mocks if not provided
  const mockProvider = options.mockProvider || createMockProvider();
  const mockWallet = options.mockWallet || createMockWallet();
  const mockActionContract = options.mockActionContract || createMockContract();
  const mockNftContract = options.mockNftContract || createMockContract();
  
  // Create service instance with dummy values
  const service = new S2DOBlockchainService(
    'http://dummy-rpc-url.test',
    '0x0000000000000000000000000000000000000000000000000000000000000001',
    '0xMockActionContractAddress',
    '0xMockNftContractAddress'
  );
  
  // Replace with mocks
  (service as any).provider = mockProvider;
  (service as any).wallet = mockWallet;
  (service as any).actionContract = mockActionContract;
  (service as any).nftContract = mockNftContract;
  
  return {
    service,
    mockProvider,
    mockWallet,
    mockActionContract,
    mockNftContract
  };
}

/**
 * Creates mock transaction receipt events
 * 
 * @param options Options for customizing the events
 * @returns Mock events that can be used in test assertions
 */
export function createMockEvents(options: {
  eventName?: string,
  tokenId?: number,
  address?: string,
  extraArgs?: Record<string, any>
} = {}) {
  const {
    eventName = 'Transfer',
    tokenId = 123,
    address = '0xMockContractAddress',
    extraArgs = {}
  } = options;
  
  return {
    eventName,
    parsedLog: {
      name: eventName,
      args: {
        tokenId,
        ...extraArgs
      },
      address
    },
    rawLogs: [{
      topics: [
        ethers.id(`${eventName}(address,address,uint256)`),
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0x000000000000000000000000a1a2a3a4a5a6a7a8a9a0b1b2b3b4b5b6b7b8b9b0',
        '0x000000000000000000000000000000000000000000000000000000000000007b'
      ],
      data: '0x',
      address
    }]
  };
}

/**
 * Helper utility to setup blockchain transaction mocks
 * 
 * @param mockContract The mock contract to configure
 * @param methodName Name of the contract method to mock
 * @param mockReturn What the method should return
 * @param mockWait Optional mock for the wait() method on the transaction
 */
export function setupContractMethodMock(
  mockContract: any,
  methodName: string,
  mockReturn: any,
  mockWait?: any
) {
  if (mockWait) {
    mockContract[methodName] = jest.fn().mockReturnValue({
      wait: jest.fn().mockResolvedValue(mockWait)
    });
  } else {
    mockContract[methodName] = jest.fn().mockResolvedValue(mockReturn);
  }
}

/**
 * Resets all mocks - convenient utility for beforeEach()
 * 
 * @param mocks Array of mock objects to reset
 */
export function resetAllMocks(...mocks: any[]) {
  // First, use Jest's built-in method to clear all mocks
  jest.clearAllMocks();
  
  // Then reset each mock object recursively
  mocks.forEach(mock => {
    if (mock && typeof mock === 'object') {
      // Handle each property in the mock object
      Object.keys(mock).forEach(key => {
        const value = mock[key];
        
        // If value is a Jest mock function, reset it
        if (typeof value === 'function' && typeof value.mockReset === 'function') {
          value.mockReset();
        }
        
        // If the property is a nested object with mocks, process it recursively
        // but avoid circular references
        if (
          value && 
          typeof value === 'object' && 
          value !== mock && 
          !Array.isArray(value)
        ) {
          // Recursively reset nested mock functions
          resetNestedMocks(value);
        }
      });
    }
  });
}

/**
 * Helper function to reset nested mock functions
 * @param obj Object potentially containing mock functions
 * @param visited Set of already visited objects to prevent circular reference issues
 */
function resetNestedMocks(obj: any, visited: Set<any> = new Set()) {
  // Prevent circular references
  if (visited.has(obj)) return;
  visited.add(obj);
  
  // Process each property
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    // Reset if it's a mock function
    if (typeof value === 'function' && typeof value.mockReset === 'function') {
      value.mockReset();
    }
    
    // Recursively process nested objects
    if (
      value && 
      typeof value === 'object' && 
      value !== obj && 
      !Array.isArray(value) &&
      !visited.has(value)
    ) {
      resetNestedMocks(value, visited);
    }
  });
}

