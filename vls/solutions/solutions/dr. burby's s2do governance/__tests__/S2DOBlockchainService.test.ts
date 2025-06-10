jest.mock('../src/sd20-core', () => ({
  BlockchainService: class {}
}));

jest.mock('../src/blockchain-contracts', () => ({
  SD20RegistryABI: [],
  SD20ActionVerificationABI: [],
  SD20AchievementNFTABI: [],
  SD20FactoryABI: [],
  SD20RegistryBytecode: '0x',
  SD20ActionVerificationBytecode: '0x',
  SD20AchievementNFTBytecode: '0x',
  SD20FactoryBytecode: '0x'
}));

import { ethers } from 'ethers';
import { S2DOBlockchainService } from '../src/s2do-blockchain-integration';

describe('S2DOBlockchainService', () => {
  let service: S2DOBlockchainService;
  let mockActionContract: any;
  let mockNftContract: any;
  let mockProvider: any;
  let mockWallet: any;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock provider
    mockProvider = {
      getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }),
      getBlock: jest.fn().mockResolvedValue({
        timestamp: Math.floor(Date.now() / 1000)
      }),
      getLogs: jest.fn().mockResolvedValue([])
    };
    
    // Create mock wallet
    mockWallet = {
      address: '0xMockWalletAddress',
      connect: jest.fn().mockReturnThis(),
      signMessage: jest.fn().mockResolvedValue('0xMockSignature'),
      provider: mockProvider
    };
    
    // Create mock action contract
    mockActionContract = {
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      verifyActionHash: jest.fn().mockResolvedValue(false),
      recordAction: jest.fn().mockReturnValue({
        wait: jest.fn().mockResolvedValue({
          transactionHash: 'mockTxHash',
          hash: 'mockTxHash',
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
      getAllActions: jest.fn().mockResolvedValue([
        { id: 'action1', hash: 'hash1' },
        { id: 'action2', hash: 'hash2' }
      ]),
      getAction: jest.fn().mockResolvedValue({
        id: 'action1',
        hash: 'hash1',
        status: 'completed'
      }),
    };
    
    // Create mock NFT contract
    mockNftContract = {
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      mintNFT: jest.fn().mockReturnValue({
        wait: jest.fn().mockResolvedValue({
          transactionHash: 'mockTxHash',
          hash: 'mockTxHash',
          logs: [{
            topics: ['0xTopic1', '0xTopic2'],
            data: '0xData'
          }]
        })
      }),
      interface: {
        parseLog: jest.fn().mockReturnValue({ 
          name: 'Transfer', 
          args: { tokenId: 123 } 
        })
      }
    };
    
    // Create test service using the static testInstance method
    service = S2DOBlockchainService.testInstance(
      mockProvider,
      mockWallet,
      mockActionContract,
      mockNftContract
    );
  });
  
  describe('storeActionVerification', () => {
    it('should store action verification successfully', async () => {
      // Arrange
      const actionId = 'test-action-id';
      const actionHash = 'test-hash';
      const initiatorAddress = 'initiator-address';
      const verifierAddresses = ['verifier1', 'verifier2'];
      
      // Act
      const result = await service.storeActionVerification(
        actionId,
        actionHash,
        initiatorAddress,
        verifierAddresses
      );
      
      // Assert
      expect(mockActionContract.verifyActionHash).toHaveBeenCalledWith(actionId, actionHash);
      expect(mockActionContract.recordAction).toHaveBeenCalledWith(
        actionId,
        expect.stringContaining('S2DO:'),
        actionHash,
        initiatorAddress
      );
      expect(mockActionContract.verifyAction).toHaveBeenCalledTimes(verifierAddresses.length);
      expect(mockActionContract.completeAction).toHaveBeenCalledWith(actionId);
      expect(result).toBe('mockTxHash');
    });
    
    it('should throw an error if action already exists', async () => {
      // Arrange
      // Arrange
      // Override the mock for this specific test
      mockActionContract.verifyActionHash.mockResolvedValue(true);
      // Act & Assert
      await expect(service.storeActionVerification(
        'test-action-id',
        'test-hash',
        'initiator-address',
        []
      )).rejects.toThrow('already exists');
    });
  });

  describe('verifyActionRecord', () => {
    it('should verify action record successfully', async () => {
      // Arrange
      const actionId = 'test-action-id';
      const actionHash = 'test-hash';
      // Override the global mock for this specific test
      // Override the mock for this specific test
      mockActionContract.verifyActionHash.mockResolvedValue(true);
      // Act
      const result = await service.verifyActionRecord(actionId, actionHash);
      
      // Assert
      expect(mockActionContract.verifyActionHash).toHaveBeenCalledWith(actionId, actionHash);
      expect(result).toBe(true);
    });
  });

  describe('mintNFT', () => {
    it('should mint NFT successfully', async () => {
      // Arrange
      const metadata = { name: 'Test NFT', description: 'Test description' };
      const ownerAddress = 'owner-address';
      const contributorAddresses = ['contributor1', 'contributor2'];
      // Using the mock method defined in the mockContract object
      
      // Act
      const result = await service.mintNFT(metadata, ownerAddress, contributorAddresses);
      
      // Assert
      expect(mockNftContract.mintNFT).toHaveBeenCalledWith(
        expect.any(String),
        ownerAddress,
        contributorAddresses
      );
      expect(result).toEqual({
        tokenId: 123,
        transactionHash: 'mockTxHash'
      });
    });
  });

  describe('getAllActions', () => {
    it('should get all actions successfully', async () => {
      // Arrange
      const mockActions = [
        { id: 'action1', hash: 'hash1' },
        { id: 'action2', hash: 'hash2' }
      ];
      // Using the mock method defined in the mockContract object
      
      // Act
      const result = await service.getAllActions();
      
      // Assert
      expect(mockActionContract.getAllActions).toHaveBeenCalled();
      expect(result).toEqual(mockActions);
    });

    it('should return empty array on error', async () => {
      // Arrange
      const spy = jest.spyOn(mockActionContract, 'getAllActions').mockRejectedValue(new Error('Test error'));
      
      // Act
      const result = await service.getAllActions();
      
      // Assert
      expect(result).toEqual([]);
      // Restore the original implementation
      spy.mockRestore();
    });
  });
  
  describe('getAction', () => {
    it('should get a specific action successfully', async () => {
      // Arrange
      const actionId = 'action1';
      
      // Act
      const result = await service.getAction(actionId);
      
      // Assert
      expect(mockActionContract.getAction).toHaveBeenCalledWith(actionId);
      expect(result).toEqual({
        id: 'action1',
        hash: 'hash1',
        status: 'completed'
      });
    });
    
    it('should return null if getting the action fails', async () => {
      // Arrange
      const spy = jest.spyOn(mockActionContract, 'getAction').mockRejectedValue(new Error('Test error'));
      
      // Act
      const result = await service.getAction('invalid-action');
      
      // Assert
      expect(result).toBeNull();
      spy.mockRestore();
    });
  });
  
  describe('Event Listeners', () => {
    it('should register and remove event listeners', () => {
      // Arrange
      const callback = jest.fn();
      
      // Act
      service.registerEventListener('TestEvent', callback);
      
      // Assert - check registration
      expect(mockActionContract.on).toHaveBeenCalledWith('TestEvent', expect.any(Function));
      
      // Act - test removal
      service.removeEventListeners();
      
      // Assert - check removal
      expect(mockActionContract.removeAllListeners).toHaveBeenCalled();
    });
  });
});

