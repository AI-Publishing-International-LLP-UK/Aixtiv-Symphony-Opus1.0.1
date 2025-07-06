/**
 * AIXTIV SYMPHONY™ Blockchain Integration
 * © 2025 AI Publishing International LLP
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * This is proprietary software of AI Publishing International LLP.
 * All rights reserved. No part of this software may be reproduced,
 * modified, or distributed without prior written permission.
 */

import { ethers } from 'ethers';
import * as IPFS from 'ipfs-http-client';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, addDoc, query, where, Timestamp, getDocs } from 'firebase/firestore';
import { ActivityLoggerService } from '../core';
import * as CryptoJS from 'crypto-js';

// Initialize Firestore
const db = getFirestore();

// Initialize IPFS (using Infura in this example)
const ipfs = IPFS.create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: `Basic ${Buffer.from(
      process.env.INFURA_IPFS_PROJECT_ID + ':' + process.env.INFURA_IPFS_PROJECT_SECRET
    ).toString('base64')}`
  }
});

/**
 * AIXTIV Smart Contract Interfaces
 */
const AIXTIVNFTContractABI = [
  // ERC-721 standard functions
  'function balanceOf(address owner) external view returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function safeTransferFrom(address from, address to, uint256 tokenId) external',
  'function transferFrom(address from, address to, uint256 tokenId) external',
  'function approve(address to, uint256 tokenId) external',
  'function getApproved(uint256 tokenId) external view returns (address)',
  'function setApprovalForAll(address operator, bool approved) external',
  'function isApprovedForAll(address owner, address operator) external view returns (bool)',
  
  // Metadata extension
  'function name() external view returns (string memory)',
  'function symbol() external view returns (string memory)',
  'function tokenURI(uint256 tokenId) external view returns (string memory)',
  
  // AIXTIV custom functions
  'function mintAgent(address to, string memory tokenURI, string memory agentType) external returns (uint256)',
  'function mintSolution(address to, string memory tokenURI, string memory solutionCode) external returns (uint256)',
  'function verifyOwnership(address owner, uint256 tokenId) external view returns (bool)',
  'function getAgentType(uint256 tokenId) external view returns (string memory)',
  'function getSolutionCode(uint256 tokenId) external view returns (string memory)',
  'function getTokenMetadata(uint256 tokenId) external view returns (string memory agentType, string memory solutionCode, uint256 createdAt)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
  'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)',
  'event AgentMinted(uint256 indexed tokenId, address indexed owner, string agentType)',
  'event SolutionMinted(uint256 indexed tokenId, address indexed owner, string solutionCode)'
];

const AIXTIVVerificationContractABI = [
  // Verification functions
  'function verifyUser(address userAddress, bytes32 userCodeHash) external returns (bool)',
  'function verifyOrganization(address orgAddress, bytes32 orgIdHash) external returns (bool)',
  'function isUserVerified(address userAddress) external view returns (bool)',
  'function isOrganizationVerified(address orgAddress) external view returns (bool)',
  'function getUserVerificationData(address userAddress) external view returns (bytes32 userCodeHash, uint256 verifiedAt, bool status)',
  'function getOrganizationVerificationData(address orgAddress) external view returns (bytes32 orgIdHash, uint256 verifiedAt, bool status)',
  
  // Events
  'event UserVerified(address indexed userAddress, bytes32 indexed userCodeHash, bool status)',
  'event OrganizationVerified(address indexed orgAddress, bytes32 indexed orgIdHash, bool status)'
];

const AIXTIVSubscriptionContractABI = [
  // Subscription functions
  'function createSubscription(address subscriber, string memory solutionCode, uint256 duration) external returns (uint256)',
  'function renewSubscription(uint256 subscriptionId, uint256 additionalDuration) external',
  'function cancelSubscription(uint256 subscriptionId) external',
  'function getSubscription(uint256 subscriptionId) external view returns (address subscriber, string memory solutionCode, uint256 startTime, uint256 endTime, bool active)',
  'function isSubscriptionActive(address subscriber, string memory solutionCode) external view returns (bool)',
  'function getSubscriptionsBySubscriber(address subscriber) external view returns (uint256[] memory)',
  'function getSubscriptionsBySolution(string memory solutionCode) external view returns (uint256[] memory)',
  
  // Events
  'event SubscriptionCreated(uint256 indexed subscriptionId, address indexed subscriber, string solutionCode, uint256 startTime, uint256 endTime)',
  'event SubscriptionRenewed(uint256 indexed subscriptionId, uint256 newEndTime)',
  'event SubscriptionCanceled(uint256 indexed subscriptionId, uint256 canceledAt)'
];

/**
 * AIXTIV Blockchain Integration Manager
 * Handles interactions with the blockchain for the AIXTIV SYMPHONY system
 */
export class BlockchainIntegrationManager {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private nftContract: ethers.Contract;
  private verificationContract: ethers.Contract;
  private subscriptionContract: ethers.Contract;
  
  constructor(
    rpcUrl: string = process.env.ETHEREUM_RPC_URL || '',
    privateKey: string = process.env.AIXTIV_PRIVATE_KEY || '',
    nftContractAddress: string = process.env.AIXTIV_NFT_CONTRACT_ADDRESS || '',
    verificationContractAddress: string = process.env.AIXTIV_VERIFICATION_CONTRACT_ADDRESS || '',
    subscriptionContractAddress: string = process.env.AIXTIV_SUBSCRIPTION_CONTRACT_ADDRESS || ''
  ) {
    // Initialize provider and wallet
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    
    // Initialize contracts
    this.nftContract = new ethers.Contract(nftContractAddress, AIXTIVNFTContractABI, this.wallet);
    this.verificationContract = new ethers.Contract(verificationContractAddress, AIXTIVVerificationContractABI, this.wallet);
    this.subscriptionContract = new ethers.Contract(subscriptionContractAddress, AIXTIVSubscriptionContractABI, this.wallet);
  }
  
  /**
   * Create a blockchain wallet for a user
   */
  public createUserWallet(): { address: string; privateKey: string } {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  }
  
  /**
   * Verify a user on the blockchain
   */
  public async verifyUser(
    userAddress: string,
    userCode: string,
    userId: string
  ): Promise<{ transactionId: string; status: boolean }> {
    try {
      // Create hash of the user code
      const userCodeHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(userCode));
      
      // Call verification contract
      const tx = await this.verificationContract.verifyUser(userAddress, userCodeHash);
      const receipt = await tx.wait();
      
      // Get event data
      const verifiedEvent = receipt.events.find((e: any) => e.event === 'UserVerified');
      const verificationStatus = verifiedEvent.args.status;
      
      // Create verification record in Firestore
      await this.createVerificationRecord(
        'user',
        userId,
        userAddress,
        userCodeHash,
        receipt.transactionHash,
        verificationStatus
      );
      
      return {
        transactionId: receipt.transactionHash,
        status: verificationStatus
      };
    } catch (error) {
      console.error('Error verifying user on blockchain:', error);
      throw error;
    }
  }
  
  /**
   * Verify an organization on the blockchain
   */
  public async verifyOrganization(
    orgAddress: string,
    orgId: string
  ): Promise<{ transactionId: string; status: boolean }> {
    try {
      // Create hash of the organization ID
      const orgIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(orgId));
      
      // Call verification contract
      const tx = await this.verificationContract.verifyOrganization(orgAddress, orgIdHash);
      const receipt = await tx.wait();
      
      // Get event data
      const verifiedEvent = receipt.events.find((e: any) => e.event === 'OrganizationVerified');
      const verificationStatus = verifiedEvent.args.status;
      
      // Create verification record in Firestore
      await this.createVerificationRecord(
        'organization',
        orgId,
        orgAddress,
        orgIdHash,
        receipt.transactionHash,
        verificationStatus
      );
      
      return {
        transactionId: receipt.transactionHash,
        status: verificationStatus
      };
    } catch (error) {
      console.error('Error verifying organization on blockchain:', error);
      throw error;
    }
  }
  
  /**
   * Check if a user is verified on the blockchain
   */
  public async isUserVerified(userAddress: string): Promise<boolean> {
    try {
      return await this.verificationContract.isUserVerified(userAddress);
    } catch (error) {
      console.error('Error checking user verification status:', error);
      throw error;
    }
  }
  
  /**
   * Check if an organization is verified on the blockchain
   */
  public async isOrganizationVerified(orgAddress: string): Promise<boolean> {
    try {
      return await this.verificationContract.isOrganizationVerified(orgAddress);
    } catch (error) {
      console.error('Error checking organization verification status:', error);
      throw error;
    }
  }
  
  /**
   * Mint an agent NFT
   */
  public async mintAgentNFT(
    ownerAddress: string,
    agentId: string,
    agentType: string,
    metadata: any
  ): Promise<{ tokenId: string; transactionId: string }> {
    try {
      // Upload metadata to IPFS
      const metadataUri = await this.uploadMetadataToIPFS(metadata);
      
      // Mint the NFT
      const tx = await this.nftContract.mintAgent(ownerAddress, metadataUri, agentType);
      const receipt = await tx.wait();
      
      // Get the token ID from the AgentMinted event
      const mintedEvent = receipt.events.find((e: any) => e.event === 'AgentMinted');
      const tokenId = mintedEvent.args.tokenId.toString();
      
      // Create NFT record in Firestore
      await this.createNFTRecord(
        'agent',
        agentId,
        tokenId,
        ownerAddress,
        metadataUri,
        receipt.transactionHash,
        { agentType }
      );
      
      return {
        tokenId,
        transactionId: receipt.transactionHash
      };
    } catch (error) {
      console.error('Error minting agent NFT:', error);
      throw error;
    }
  }
  
  /**
   * Mint a solution NFT
   */
  public async mintSolutionNFT(
    ownerAddress: string,
    solutionId: string,
    solutionCode: string,
    metadata: any
  ): Promise<{ tokenId: string; transactionId: string }> {
    try {
      // Upload metadata to IPFS
      const metadataUri = await this.uploadMetadataToIPFS(metadata);
      
      // Mint the NFT
      const tx = await this.nftContract.mintSolution(ownerAddress, metadataUri, solutionCode);
      const receipt = await tx.wait();
      
      // Get the token ID from the SolutionMinted event
      const mintedEvent = receipt.events.find((e: any) => e.event === 'SolutionMinted');
      const tokenId = mintedEvent.args.tokenId.toString();
      
      // Create NFT record in Firestore
      await this.createNFTRecord(
        'solution',
        solutionId,
        tokenId,
        ownerAddress,
        metadataUri,
        receipt.transactionHash,
        { solutionCode }
      );
      
      return {
        tokenId,
        transactionId: receipt.transactionHash
      };
    } catch (error) {
      console.error('Error minting solution NFT:', error);
      throw error;
    }
  }
  
  /**
   * Transfer an NFT to a new owner
   */
  public async transferNFT(
    tokenId: string,
    fromAddress: string,
    toAddress: string
  ): Promise<{ transactionId: string }> {
    try {
      // Transfer the NFT
      const tx = await this.nftContract.transferFrom(fromAddress, toAddress, tokenId);
      const receipt = await tx.wait();
      
      // Update NFT record in Firestore
      await this.updateNFTOwner(tokenId, toAddress, receipt.transactionHash);
      
      return {
        transactionId: receipt.transactionHash
      };
    } catch (error) {
      console.error('Error transferring NFT:', error);
      throw error;
    }
  }
  
  /**
   * Get owner of an NFT
   */
  public async getNFTOwner(tokenId: string): Promise<string> {
    try {
      return await this.nftContract.ownerOf(tokenId);
    } catch (error) {
      console.error('Error getting NFT owner:', error);
      throw error;
    }
  }
  
  /**
   * Create a subscription on the blockchain
   */
  public async createSubscription(
    subscriberAddress: string,
    solutionCode: string,
    durationInDays: number,
    subscriberId: string,
    solutionId: string
  ): Promise<{ subscriptionId: string; transactionId: string }> {
    try {
      // Convert days to seconds
      const durationInSeconds = durationInDays * 24 * 60 * 60;
      
      // Create subscription on blockchain
      const tx = await this.subscriptionContract.createSubscription(
        subscriberAddress,
        solutionCode,
        durationInSeconds
      );
      const receipt = await tx.wait();
      
      // Get the subscription ID from the SubscriptionCreated event
      const subscriptionEvent = receipt.events.find((e: any) => e.event === 'SubscriptionCreated');
      const subscriptionId = subscriptionEvent.args.subscriptionId.toString();
      const startTime = subscriptionEvent.args.startTime.toNumber();
      const endTime = subscriptionEvent.args.endTime.toNumber();
      
      // Create subscription record in Firestore
      await this.createSubscriptionRecord(
        subscriptionId,
        subscriberId,
        solutionId,
        solutionCode,
        startTime,
        endTime,
        receipt.transactionHash
      );
      
      return {
        subscriptionId,
        transactionId: receipt.transactionHash
      };
    } catch (error) {
      console.error('Error creating subscription on blockchain:', error);
      throw error;
    }
  }
  
  /**
   * Renew a subscription on the blockchain
   */
  public async renewSubscription(
    subscriptionId: string,
    additionalDays: number
  ): Promise<{ transactionId: string; newEndTime: number }> {
    try {
      // Convert days to seconds
      const additionalSeconds = additionalDays * 24 * 60 * 60;
      
      // Renew subscription on blockchain
      const tx = await this.subscriptionContract.renewSubscription(
        subscriptionId,
        additionalSeconds
      );
      const receipt = await tx.wait();
      
      // Get the new end time from the SubscriptionRenewed event
      const renewedEvent = receipt.events.find((e: any) => e.event === 'SubscriptionRenewed');
      const newEndTime = renewedEvent.args.newEndTime.toNumber();
      
      // Update subscription record in Firestore
      await this.updateSubscriptionRecord(
        subscriptionId,
        newEndTime,
        receipt.transactionHash
      );
      
      return {
        transactionId: receipt.transactionHash,
        newEndTime
      };
    } catch (error) {
      console.error('Error renewing subscription on blockchain:', error);
      throw error;
    }
  }
  
  /**
   * Cancel a subscription on the blockchain
   */
  public async cancelSubscription(
    subscriptionId: string
  ): Promise<{ transactionId: string }> {
    try {
      // Cancel subscription on blockchain
      const tx = await this.subscriptionContract.cancelSubscription(subscriptionId);
      const receipt = await tx.wait();
      
      // Get the canceled time from the SubscriptionCanceled event
      const canceledEvent = receipt.events.find((e: any) => e.event === 'SubscriptionCanceled');
      const canceledAt = canceledEvent.args.canceledAt.toNumber();
      
      // Update subscription record in Firestore
      await this.cancelSubscriptionRecord(
        subscriptionId,
        canceledAt,
        receipt.transactionHash
      );
      
      return {
        transactionId: receipt.transactionHash
      };
    } catch (error) {
      console.error('Error canceling subscription on blockchain:', error);
      throw error;
    }
  }
  
  /**
   * Check if a subscription is active
   */
  public async isSubscriptionActive(
    subscriberAddress: string,
    solutionCode: string
  ): Promise<boolean> {
    try {
      return await this.subscriptionContract.isSubscriptionActive(
        subscriberAddress,
        solutionCode
      );
    } catch (error) {
      console.error('Error checking subscription status:', error);
      throw error;
    }
  }
  
  /**
   * Get subscription details
   */
  public async getSubscription(subscriptionId: string): Promise<any> {
    try {
      const subscription = await this.subscriptionContract.getSubscription(subscriptionId);
      
      return {
        subscriber: subscription.subscriber,
        solutionCode: subscription.solutionCode,
        startTime: subscription.startTime.toNumber(),
        endTime: subscription.endTime.toNumber(),
        active: subscription.active
      };
    } catch (error) {
      console.error('Error getting subscription details:', error);
      throw error;
    }
  }
  
  /**
   * Get all subscriptions for a subscriber
   */
  public async getSubscriptionsBySubscriber(subscriberAddress: string): Promise<string[]> {
    try {
      const subscriptionIds = await this.subscriptionContract.getSubscriptionsBySubscriber(
        subscriberAddress
      );
      
      return subscriptionIds.map((id: ethers.BigNumber) => id.toString());
    } catch (error) {
      console.error('Error getting subscriptions by subscriber:', error);
      throw error;
    }
  }
  
  /**
   * Upload metadata to IPFS
   */
  private async uploadMetadataToIPFS(metadata: any): Promise<string> {
    try {
      // Convert metadata to JSON string
      const metadataJson = JSON.stringify(metadata);
      
      // Add to IPFS
      const { cid } = await ipfs.add(Buffer.from(metadataJson));
      
      // Return IPFS URI
      return `ipfs://${cid.toString()}`;
    } catch (error) {
      console.error('Error uploading metadata to IPFS:', error);
      throw error;
    }
  }
  
  /**
   * Create verification record in Firestore
   */
  private async createVerificationRecord(
    recordType: 'user' | 'organization',
    recordId: string,
    blockchainAddress: string,
    verificationHash: string,
    transactionId: string,
    verificationStatus: boolean
  ): Promise<void> {
    try {
      // Create verification record
      const verificationData = {
        id: `verification_${recordType}_${recordId}`,
        recordType,
        recordId,
        blockchainAddress,
        transactionId,
        timestamp: Timestamp.now(),
        verificationHash: verificationHash.substring(2), // Remove '0x' prefix
        verificationStatus,
        blockchainNetwork: 'ethereum',
        metadata: {}
      };
      
      // Add to Firestore
      await setDoc(doc(db, 'blockchainRecords', verificationData.id), verificationData);
      
      // Log activity
      await ActivityLoggerService.logActivity(
        'blockchain',
        'verification',
        `VERIFY_${recordType.toUpperCase()}`,
        recordType,
        recordId,
        verificationStatus ? 'success' : 'failure',
        { transactionId, blockchainAddress }
      );
      
      // Update the user or organization record with verification status
      if (recordType === 'user') {
        await updateDoc(doc(db, 'users', recordId), {
          blockchainAddress,
          verificationStatus: verificationStatus ? 'verified' : 'rejected',
          'userMetadata.blockchainVerification': {
            transactionId,
            timestamp: Timestamp.now(),
            status: verificationStatus
          },
          updatedAt: Timestamp.now()
        });
      } else {
        await updateDoc(doc(db, 'organizations', recordId), {
          'blockchainVerification.address': blockchainAddress,
          'blockchainVerification.transactionId': transactionId,
          'blockchainVerification.verificationStatus': verificationStatus,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error creating verification record:', error);
      throw error;
    }
  }
  
  /**
   * Create NFT record in Firestore
   */
  private async createNFTRecord(
    tokenType: 'agent' | 'solution',
    linkedRecordId: string,
    tokenId: string,
    ownerAddress: string,
    metadataUri: string,
    transactionId: string,
    additionalData: any = {}
  ): Promise<void> {
    try {
      // Create NFT record
      const nftData = {
        id: `nft_${tokenId}`,
        tokenId,
        tokenType,
        linkedRecordId,
        ownerAddress,
        contractAddress: this.nftContract.address,
        blockchainNetwork: 'ethereum',
        metadata: {
          uri: metadataUri,
          ...additionalData
        },
        mintedAt: Timestamp.now(),
        transferHistory: [
          {
            fromAddress: '0x0000000000000000000000000000000000000000',
            toAddress: ownerAddress,
            transactionId,
            timestamp: Timestamp.now()
          }
        ]
      };
      
      // Add to Firestore
      await setDoc(doc(db, 'nftTokens', nftData.id), nftData);
      
      // Log activity
      await ActivityLoggerService.logActivity(
        'blockchain',
        'nft',
        `MINT_${tokenType.toUpperCase()}_NFT`,
        tokenType,
        linkedRecordId,
        'success',
        { tokenId, transactionId, ownerAddress }
      );
      
      // Update the agent or solution record with NFT reference
      if (tokenType === 'agent') {
        await updateDoc(doc(db, 'agents', linkedRecordId), {
          'metadata.nftTokenId': tokenId,
          'metadata.nftContractAddress': this.nftContract.address,
          'metadata.nftTransactionId': transactionId,
          updatedAt: Timestamp.now()
        });
      } else {
        await updateDoc(doc(db, 'solutions', linkedRecordId), {
          'metadata.nftTokenId': tokenId,
          'metadata.nftContractAddress': this.nftContract.address,
          'metadata.nftTransactionId': transactionId,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error creating NFT record:', error);
      throw error;
    }
  }
  
  /**
   * Update NFT owner in Firestore
   */
  private async updateNFTOwner(
    tokenId: string,
    newOwnerAddress: string,
    transactionId: string
  ): Promise<void> {
    try {
      // Query for the NFT record
      const nftQuery = query(
        collection(db, 'nftTokens'),
        where('tokenId', '==', tokenId),
        where('contractAddress', '==', this.nftContract.address)
      );
      const querySnapshot = await getDocs(nftQuery);
      
      if (querySnapshot.empty) {
        throw new Error('NFT record not found');
      }
      
      const nftDoc = querySnapshot.docs[0];
      const nftData = nftDoc.data();
      
      // Create transfer event
      const transferEvent = {
        fromAddress: nftData.ownerAddress,
        toAddress: newOwnerAddress,
        transactionId,
        timestamp: Timestamp.now()
      };
      
      // Update NFT record
      await updateDoc(doc(db, 'nftTokens', nftDoc.id), {
        ownerAddress: newOwnerAddress,
        transferHistory: [...nftData.transferHistory, transferEvent],
        updatedAt: Timestamp.now()
      });
      
      // Log activity
      await ActivityLoggerService.logActivity(
        'blockchain',
        'nft',
        'TRANSFER_NFT',
        nftData.tokenType,
        nftData.linkedRecordId,
        'success',
        { tokenId, fromAddress: nftData.ownerAddress, toAddress: newOwnerAddress, transactionId }
      );
      
      // Update the linked record if needed (for ownership tracking)
      if (nftData.tokenType === 'agent') {
        // Determine new owner type and ID based on address
        const { ownerType, ownerId } = await this.resolveAddressToOwner(newOwnerAddress);
        
        // Update agent owner
        if (ownerType && ownerId) {
          await updateDoc(doc(db, 'agents', nftData.linkedRecordId), {
            ownerType,
            ownerId,
            'metadata.ownershipTransferred': true,
            'metadata.previousOwner': {
              ownerAddress: nftData.ownerAddress
            },
            updatedAt: Timestamp.now()
          });
        }
      }
    } catch (error) {
      console.error('Error updating NFT owner:', error);
      throw error;
    }
  }
  
  /**
   * Create subscription record in Firestore
   */
  private async createSubscriptionRecord(
    subscriptionId: string,
    subscriberId: string,
    solutionId: string,
    solutionCode: string,
    startTime: number,
    endTime: number,
    transactionId: string
  ): Promise<void> {
    try {
      // Get solution details
      const solutionDoc = await getDoc(doc(db, 'solutions', solutionId));
      
      if (!solutionDoc.exists()) {
        throw new Error('Solution not found');
      }
      
      const solution = solutionDoc.data();
      
      // Determine subscriber type and create subscription record
      const subscriberDoc = await getDoc(doc(db, 'users', subscriberId));
      const subscriberType = subscriberDoc.exists() ? 'user' : 'organization';
      
      const subscriptionData = {
        id: `sub_${subscriptionId}`,
        blockchainSubscriptionId: subscriptionId,
        solutionId,
        subscriberType,
        subscriberId,
        subscriptionTier: 'standard', // Default tier, could be dynamic
        status: 'active',
        startDate: Timestamp.fromMillis(startTime * 1000),
        endDate: Timestamp.fromMillis(endTime * 1000),
        billingCycle: 'monthly', // Default cycle, could be dynamic
        paymentStatus: 'paid',
        settings: {},
        metadata: {
          blockchainTransactionId: transactionId,
          solutionCode,
          solutionName: solution.name
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      // Add to Firestore
      await setDoc(doc(db, 'subscriptions', subscriptionData.id), subscriptionData);
      
      // Log activity
      await ActivityLoggerService.logActivity(
        'blockchain',
        'subscription',
        'CREATE_SUBSCRIPTION',
        'solution',
        solutionId,
        'success',
        {
          subscriptionId,
          subscriberId,
          subscriberType,
          startTime,
          endTime,
          transactionId
        }
      );
      
      // Update user or organization with the subscription
      const fieldToUpdate = 'solutions';
      
      if (subscriberType === 'user') {
        const user = subscriberDoc.data();
        
        if (!user.solutions.includes(solutionCode)) {
          await updateDoc(doc(db, 'users', subscriberId), {
            solutions: [...user.solutions, solutionCode],
            updatedAt: Timestamp.now()
          });
        }
      } else {
        const orgDoc = await getDoc(doc(db, 'organizations', subscriberId));
        
        if (orgDoc.exists()) {
          const organization = orgDoc.data();
          const orgSolutions = organization.solutions || [];
          
          if (!orgSolutions.includes(solutionCode)) {
            await updateDoc(doc(db, 'organizations', subscriberId), {
              solutions: [...orgSolutions, solutionCode],
              updatedAt: Timestamp.now()
            });
          }
        }
      }
    } catch (error) {
      console.error('Error creating subscription record:', error);
      throw error;
    }
  }
  
  /**
   * Update subscription record in Firestore
   */
  private async updateSubscriptionRecord(
    subscriptionId: string,
    newEndTime: number,
    transactionId: string
  ): Promise<void> {
    try {
      // Query for the subscription record
      const subscriptionQuery = query(
        collection(db, 'subscriptions'),
        where('blockchainSubscriptionId', '==', subscriptionId)
      );
      const querySnapshot = await getDocs(subscriptionQuery);
      
      if (querySnapshot.empty) {
        throw new Error('Subscription record not found');
      }
      
      const subscriptionDoc = querySnapshot.docs[0];
      
      // Update subscription record
      await updateDoc(doc(db, 'subscriptions', subscriptionDoc.id), {
        endDate: Timestamp.fromMillis(newEndTime * 1000),
        'metadata.renewalTransactionId': transactionId,
        'metadata.lastRenewalDate': Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      // Log activity
      await ActivityLoggerService.logActivity(
        'blockchain',
        'subscription',
        'RENEW_SUBSCRIPTION',
        'subscription',
        subscriptionDoc.id,
        'success',
        { subscriptionId, newEndTime, transactionId }
      );
    } catch (error) {
      console.error('Error updating subscription record:', error);
      throw error;
    }
  }
  
  /**
   * Cancel subscription record in Firestore
   */
  private async cancelSubscriptionRecord(
    subscriptionId: string,
    canceledAt: number,
    transactionId: string
  ): Promise<void> {
    try {
      // Query for the subscription record
      const subscriptionQuery = query(
        collection(db, 'subscriptions'),
        where('blockchainSubscriptionId', '==', subscriptionId)
      );
      const querySnapshot = await getDocs(subscriptionQuery);
      
      if (querySnapshot.empty) {
        throw new Error('Subscription record not found');
      }
      
      const subscriptionDoc = querySnapshot.docs[0];
      const subscription = subscriptionDoc.data();
      
      // Update subscription record
      await updateDoc(doc(db, 'subscriptions', subscriptionDoc.id), {
        status: 'canceled',
        endDate: Timestamp.fromMillis(canceledAt * 1000),
        'metadata.cancelTransactionId': transactionId,
        'metadata.canceledAt': Timestamp.fromMillis(canceledAt * 1000),
        updatedAt: Timestamp.now()
      });
      
      // Log activity
      await ActivityLoggerService.logActivity(
        'blockchain',
        'subscription',
        'CANCEL_SUBSCRIPTION',
        'subscription',
        subscriptionDoc.id,
        'success',
        { subscriptionId, canceledAt, transactionId }
      );
      
      // Update user or organization solutions array if needed
      // This might be a business decision whether to remove the solution or keep it with canceled status
    } catch (error) {
      console.error('Error canceling subscription record:', error);
      throw error;
    }
  }
  
  /**
   * Resolve blockchain address to owner type and ID
   */
  private async resolveAddressToOwner(
    address: string
  ): Promise<{ ownerType: string; ownerId: string }> {
    try {
      // Check if address belongs to a user
      const userQuery = query(
        collection(db, 'users'),
        where('blockchainAddress', '==', address)
      );
      let querySnapshot = await getDocs(userQuery);
      
      if (!querySnapshot.empty) {
        return {
          ownerType: 'user',
          ownerId: querySnapshot.docs[0].id
        };
      }
      
      // Check if address belongs to an organization
      const orgQuery = query(
        collection(db, 'organizations'),
        where('blockchainVerification.address', '==', address)
      );
      querySnapshot = await getDocs(orgQuery);
      
      if (!querySnapshot.empty) {
        return {
          ownerType: 'organization',
          ownerId: querySnapshot.docs[0].id
        };
      }
      
      // Not found
      return { ownerType: '', ownerId: '' };
    } catch (error) {
      console.error('Error resolving address to owner:', error);
      throw error;
    }
  }
}

/**
 * S2DO Blockchain Security Manager
 * Handles secure storage and verification of S2DO objects using blockchain
 */
export class S2DOBlockchainSecurityManager {
  private integrationManager: BlockchainIntegrationManager;
  
  constructor(blockchainManager: BlockchainIntegrationManager) {
    this.integrationManager = blockchainManager;
  }
  
  /**
   * Create a secure hash of an S2DO object
   */
  public createObjectHash(objectData: any): string {
    // Create a deterministic JSON string (sort keys)
    const sortedJson = this.createSortedJson(objectData);
    
    // Hash the JSON string
    return CryptoJS.SHA256(sortedJson).toString();
  }
  
  /**
   * Verify an S2DO object hash on the blockchain
   */
  public async verifyObjectHash(
    objectId: string,
    objectHash: string
  ): Promise<{ verified: boolean; blockchainRecord?: any }> {
    try {
      // Query for blockchain record with this hash
      const hashQuery = query(
        collection(db, 'blockchainRecords'),
        where('recordType', '==', 's2do'),
        where('verificationHash', '==', objectHash)
      );
      const querySnapshot = await getDocs(hashQuery);
      
      if (querySnapshot.empty) {
        return { verified: false };
      }
      
      const blockchainRecord = querySnapshot.docs[0].data();
      
      // Verify record points to the correct object
      if (blockchainRecord.recordId !== objectId) {
        return { verified: false };
      }
      
      return {
        verified: true,
        blockchainRecord
      };
    } catch (error) {
      console.error('Error verifying object hash:', error);
      throw error;
    }
  }
  
  /**
   * Register an S2DO object on the blockchain
   */
  public async registerObject(
    objectId: string,
    objectData: any,
    ownerAddress: string
  ): Promise<{ transactionId: string; objectHash: string }> {
    try {
      // Create object hash
      const objectHash = this.createObjectHash(objectData);
      
      // Create a simple transaction to record the hash
      // In a real implementation, this would use a specific smart contract
      // For now, we'll simulate by creating a verification record
      
      // Create verification record
      const verificationData = {
        id: `s2do_verification_${objectId}`,
        recordType: 's2do',
        recordId: objectId,
        blockchainAddress: ownerAddress,
        transactionId: `tx_${Date.now().toString(16)}_${objectId.substring(0, 8)}`,
        timestamp: Timestamp.now(),
        verificationHash: objectHash,
        verificationStatus: true,
        blockchainNetwork: 'ethereum',
        metadata: {
          objectType: objectData.objectType || 'generic',
          createdAt: objectData.createdAt || Timestamp.now()
        }
      };
      
      // Add to Firestore
      await setDoc(doc(db, 'blockchainRecords', verificationData.id), verificationData);
      
      // Log activity
      await ActivityLoggerService.logActivity(
        'blockchain',
        's2do',
        'REGISTER_S2DO',
        's2do',
        objectId,
        'success',
        { objectHash, transactionId: verificationData.transactionId }
      );
      
      // Update the S2DO object with verification data
      await updateDoc(doc(db, 's2doObjects', objectId), {
        'metadata.blockchainVerification': {
          hash: objectHash,
          transactionId: verificationData.transactionId,
          timestamp: Timestamp.now(),
          status: true
        },
        updatedAt: Timestamp.now()
      });
      
      return {
        transactionId: verificationData.transactionId,
        objectHash
      };
    } catch (error) {
      console.error('Error registering object on blockchain:', error);
      throw error;
    }
  }
  
  /**
   * Create a sorted JSON string for deterministic hashing
   */
  private createSortedJson(obj: any): string {
    const sortObjectKeys = (obj: any): any => {
      // Handle non-objects
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys);
      }
      
      // Handle Date objects (convert to ISO string)
      if (obj instanceof Date) {
        return obj.toISOString();
      }
      
      // Handle Firestore Timestamp objects
      if (obj instanceof Timestamp) {
        return obj.toDate().toISOString();
      }
      
      // Sort object keys
      return Object.keys(obj)
        .sort()
        .reduce((result: any, key: string) => {
          result[key] = sortObjectKeys(obj[key]);
          return result;
        }, {});
    };
    
    return JSON.stringify(sortObjectKeys(obj));
  }
}

export default {
  BlockchainIntegrationManager,
  S2DOBlockchainSecurityManager
};
