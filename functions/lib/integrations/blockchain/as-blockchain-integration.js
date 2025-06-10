"use strict";
/**
 * AIXTIV SYMPHONY™ Blockchain Integration
 * © 2025 AI Publishing International LLP
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This is proprietary software of AI Publishing International LLP.
 * All rights reserved. No part of this software may be reproduced,
 * modified, or distributed without prior written permission.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.S2DOBlockchainSecurityManager = exports.BlockchainIntegrationManager = void 0;
const ethers_1 = require("ethers");
const IPFS = require("ipfs-http-client");
const firestore_1 = require("firebase/firestore");
const core_1 = require("../core");
const CryptoJS = require("crypto-js");
// Initialize Firestore
const db = (0, firestore_1.getFirestore)();
// Initialize IPFS (using Infura in this example)
const ipfs = IPFS.create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: `Basic ${Buffer.from(process.env.INFURA_IPFS_PROJECT_ID +
            ':' +
            process.env.INFURA_IPFS_PROJECT_SECRET).toString('base64')}`,
    },
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
    'event SolutionMinted(uint256 indexed tokenId, address indexed owner, string solutionCode)',
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
    'event OrganizationVerified(address indexed orgAddress, bytes32 indexed orgIdHash, bool status)',
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
    'event SubscriptionCanceled(uint256 indexed subscriptionId, uint256 canceledAt)',
];
/**
 * AIXTIV Blockchain Integration Manager
 * Handles interactions with the blockchain for the AIXTIV SYMPHONY system
 */
class BlockchainIntegrationManager {
    constructor(rpcUrl = process.env.ETHEREUM_RPC_URL || '', privateKey = process.env.AIXTIV_PRIVATE_KEY || '', nftContractAddress = process.env.AIXTIV_NFT_CONTRACT_ADDRESS || '', verificationContractAddress = process.env
        .AIXTIV_VERIFICATION_CONTRACT_ADDRESS || '', subscriptionContractAddress = process.env
        .AIXTIV_SUBSCRIPTION_CONTRACT_ADDRESS || '') {
        // Initialize provider and wallet
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers_1.ethers.Wallet(privateKey, this.provider);
        // Initialize contracts
        this.nftContract = new ethers_1.ethers.Contract(nftContractAddress, AIXTIVNFTContractABI, this.wallet);
        this.verificationContract = new ethers_1.ethers.Contract(verificationContractAddress, AIXTIVVerificationContractABI, this.wallet);
        this.subscriptionContract = new ethers_1.ethers.Contract(subscriptionContractAddress, AIXTIVSubscriptionContractABI, this.wallet);
    }
    /**
     * Create a blockchain wallet for a user
     */
    createUserWallet() {
        const wallet = ethers_1.ethers.Wallet.createRandom();
        return {
            address: wallet.address,
            privateKey: wallet.privateKey,
        };
    }
    /**
     * Verify a user on the blockchain
     */
    async verifyUser(userAddress, userCode, userId) {
        try {
            // Create hash of the user code
            const userCodeHash = ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.toUtf8Bytes(userCode));
            // Call verification contract
            const tx = await this.verificationContract.verifyUser(userAddress, userCodeHash);
            const receipt = await tx.wait();
            // Get event data
            const verifiedEvent = receipt.events.find((e) => e.event === 'UserVerified');
            const verificationStatus = verifiedEvent.args.status;
            // Create verification record in Firestore
            await this.createVerificationRecord('user', userId, userAddress, userCodeHash, receipt.transactionHash, verificationStatus);
            return {
                transactionId: receipt.transactionHash,
                status: verificationStatus,
            };
        }
        catch (error) {
            console.error('Error verifying user on blockchain:', error);
            throw error;
        }
    }
    /**
     * Verify an organization on the blockchain
     */
    async verifyOrganization(orgAddress, orgId) {
        try {
            // Create hash of the organization ID
            const orgIdHash = ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.toUtf8Bytes(orgId));
            // Call verification contract
            const tx = await this.verificationContract.verifyOrganization(orgAddress, orgIdHash);
            const receipt = await tx.wait();
            // Get event data
            const verifiedEvent = receipt.events.find((e) => e.event === 'OrganizationVerified');
            const verificationStatus = verifiedEvent.args.status;
            // Create verification record in Firestore
            await this.createVerificationRecord('organization', orgId, orgAddress, orgIdHash, receipt.transactionHash, verificationStatus);
            return {
                transactionId: receipt.transactionHash,
                status: verificationStatus,
            };
        }
        catch (error) {
            console.error('Error verifying organization on blockchain:', error);
            throw error;
        }
    }
    /**
     * Check if a user is verified on the blockchain
     */
    async isUserVerified(userAddress) {
        try {
            return await this.verificationContract.isUserVerified(userAddress);
        }
        catch (error) {
            console.error('Error checking user verification status:', error);
            throw error;
        }
    }
    /**
     * Check if an organization is verified on the blockchain
     */
    async isOrganizationVerified(orgAddress) {
        try {
            return await this.verificationContract.isOrganizationVerified(orgAddress);
        }
        catch (error) {
            console.error('Error checking organization verification status:', error);
            throw error;
        }
    }
    /**
     * Mint an agent NFT
     */
    async mintAgentNFT(ownerAddress, agentId, agentType, metadata) {
        try {
            // Upload metadata to IPFS
            const metadataUri = await this.uploadMetadataToIPFS(metadata);
            // Mint the NFT
            const tx = await this.nftContract.mintAgent(ownerAddress, metadataUri, agentType);
            const receipt = await tx.wait();
            // Get the token ID from the AgentMinted event
            const mintedEvent = receipt.events.find((e) => e.event === 'AgentMinted');
            const tokenId = mintedEvent.args.tokenId.toString();
            // Create NFT record in Firestore
            await this.createNFTRecord('agent', agentId, tokenId, ownerAddress, metadataUri, receipt.transactionHash, { agentType });
            return {
                tokenId,
                transactionId: receipt.transactionHash,
            };
        }
        catch (error) {
            console.error('Error minting agent NFT:', error);
            throw error;
        }
    }
    /**
     * Mint a solution NFT
     */
    async mintSolutionNFT(ownerAddress, solutionId, solutionCode, metadata) {
        try {
            // Upload metadata to IPFS
            const metadataUri = await this.uploadMetadataToIPFS(metadata);
            // Mint the NFT
            const tx = await this.nftContract.mintSolution(ownerAddress, metadataUri, solutionCode);
            const receipt = await tx.wait();
            // Get the token ID from the SolutionMinted event
            const mintedEvent = receipt.events.find((e) => e.event === 'SolutionMinted');
            const tokenId = mintedEvent.args.tokenId.toString();
            // Create NFT record in Firestore
            await this.createNFTRecord('solution', solutionId, tokenId, ownerAddress, metadataUri, receipt.transactionHash, { solutionCode });
            return {
                tokenId,
                transactionId: receipt.transactionHash,
            };
        }
        catch (error) {
            console.error('Error minting solution NFT:', error);
            throw error;
        }
    }
    /**
     * Transfer an NFT to a new owner
     */
    async transferNFT(tokenId, fromAddress, toAddress) {
        try {
            // Transfer the NFT
            const tx = await this.nftContract.transferFrom(fromAddress, toAddress, tokenId);
            const receipt = await tx.wait();
            // Update NFT record in Firestore
            await this.updateNFTOwner(tokenId, toAddress, receipt.transactionHash);
            return {
                transactionId: receipt.transactionHash,
            };
        }
        catch (error) {
            console.error('Error transferring NFT:', error);
            throw error;
        }
    }
    /**
     * Get owner of an NFT
     */
    async getNFTOwner(tokenId) {
        try {
            return await this.nftContract.ownerOf(tokenId);
        }
        catch (error) {
            console.error('Error getting NFT owner:', error);
            throw error;
        }
    }
    /**
     * Create a subscription on the blockchain
     */
    async createSubscription(subscriberAddress, solutionCode, durationInDays, subscriberId, solutionId) {
        try {
            // Convert days to seconds
            const durationInSeconds = durationInDays * 24 * 60 * 60;
            // Create subscription on blockchain
            const tx = await this.subscriptionContract.createSubscription(subscriberAddress, solutionCode, durationInSeconds);
            const receipt = await tx.wait();
            // Get the subscription ID from the SubscriptionCreated event
            const subscriptionEvent = receipt.events.find((e) => e.event === 'SubscriptionCreated');
            const subscriptionId = subscriptionEvent.args.subscriptionId.toString();
            const startTime = subscriptionEvent.args.startTime.toNumber();
            const endTime = subscriptionEvent.args.endTime.toNumber();
            // Create subscription record in Firestore
            await this.createSubscriptionRecord(subscriptionId, subscriberId, solutionId, solutionCode, startTime, endTime, receipt.transactionHash);
            return {
                subscriptionId,
                transactionId: receipt.transactionHash,
            };
        }
        catch (error) {
            console.error('Error creating subscription on blockchain:', error);
            throw error;
        }
    }
    /**
     * Renew a subscription on the blockchain
     */
    async renewSubscription(subscriptionId, additionalDays) {
        try {
            // Convert days to seconds
            const additionalSeconds = additionalDays * 24 * 60 * 60;
            // Renew subscription on blockchain
            const tx = await this.subscriptionContract.renewSubscription(subscriptionId, additionalSeconds);
            const receipt = await tx.wait();
            // Get the new end time from the SubscriptionRenewed event
            const renewedEvent = receipt.events.find((e) => e.event === 'SubscriptionRenewed');
            const newEndTime = renewedEvent.args.newEndTime.toNumber();
            // Update subscription record in Firestore
            await this.updateSubscriptionRecord(subscriptionId, newEndTime, receipt.transactionHash);
            return {
                transactionId: receipt.transactionHash,
                newEndTime,
            };
        }
        catch (error) {
            console.error('Error renewing subscription on blockchain:', error);
            throw error;
        }
    }
    /**
     * Cancel a subscription on the blockchain
     */
    async cancelSubscription(subscriptionId) {
        try {
            // Cancel subscription on blockchain
            const tx = await this.subscriptionContract.cancelSubscription(subscriptionId);
            const receipt = await tx.wait();
            // Get the canceled time from the SubscriptionCanceled event
            const canceledEvent = receipt.events.find((e) => e.event === 'SubscriptionCanceled');
            const canceledAt = canceledEvent.args.canceledAt.toNumber();
            // Update subscription record in Firestore
            await this.cancelSubscriptionRecord(subscriptionId, canceledAt, receipt.transactionHash);
            return {
                transactionId: receipt.transactionHash,
            };
        }
        catch (error) {
            console.error('Error canceling subscription on blockchain:', error);
            throw error;
        }
    }
    /**
     * Check if a subscription is active
     */
    async isSubscriptionActive(subscriberAddress, solutionCode) {
        try {
            return await this.subscriptionContract.isSubscriptionActive(subscriberAddress, solutionCode);
        }
        catch (error) {
            console.error('Error checking subscription status:', error);
            throw error;
        }
    }
    /**
     * Get subscription details
     */
    async getSubscription(subscriptionId) {
        try {
            const subscription = await this.subscriptionContract.getSubscription(subscriptionId);
            return {
                subscriber: subscription.subscriber,
                solutionCode: subscription.solutionCode,
                startTime: subscription.startTime.toNumber(),
                endTime: subscription.endTime.toNumber(),
                active: subscription.active,
            };
        }
        catch (error) {
            console.error('Error getting subscription details:', error);
            throw error;
        }
    }
    /**
     * Get all subscriptions for a subscriber
     */
    async getSubscriptionsBySubscriber(subscriberAddress) {
        try {
            const subscriptionIds = await this.subscriptionContract.getSubscriptionsBySubscriber(subscriberAddress);
            return subscriptionIds.map((id) => id.toString());
        }
        catch (error) {
            console.error('Error getting subscriptions by subscriber:', error);
            throw error;
        }
    }
    /**
     * Upload metadata to IPFS
     */
    async uploadMetadataToIPFS(metadata) {
        try {
            // Convert metadata to JSON string
            const metadataJson = JSON.stringify(metadata);
            // Add to IPFS
            const { cid } = await ipfs.add(Buffer.from(metadataJson));
            // Return IPFS URI
            return `ipfs://${cid.toString()}`;
        }
        catch (error) {
            console.error('Error uploading metadata to IPFS:', error);
            throw error;
        }
    }
    /**
     * Create verification record in Firestore
     */
    async createVerificationRecord(recordType, recordId, blockchainAddress, verificationHash, transactionId, verificationStatus) {
        try {
            // Create verification record
            const verificationData = {
                id: `verification_${recordType}_${recordId}`,
                recordType,
                recordId,
                blockchainAddress,
                transactionId,
                timestamp: firestore_1.Timestamp.now(),
                verificationHash: verificationHash.substring(2), // Remove '0x' prefix
                verificationStatus,
                blockchainNetwork: 'ethereum',
                metadata: {},
            };
            // Add to Firestore
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'blockchainRecords', verificationData.id), verificationData);
            // Log activity
            await core_1.ActivityLoggerService.logActivity('blockchain', 'verification', `VERIFY_${recordType.toUpperCase()}`, recordType, recordId, verificationStatus ? 'success' : 'failure', { transactionId, blockchainAddress });
            // Update the user or organization record with verification status
            if (recordType === 'user') {
                await (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 'users', recordId), {
                    blockchainAddress,
                    verificationStatus: verificationStatus ? 'verified' : 'rejected',
                    'userMetadata.blockchainVerification': {
                        transactionId,
                        timestamp: firestore_1.Timestamp.now(),
                        status: verificationStatus,
                    },
                    updatedAt: firestore_1.Timestamp.now(),
                });
            }
            else {
                await (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 'organizations', recordId), {
                    'blockchainVerification.address': blockchainAddress,
                    'blockchainVerification.transactionId': transactionId,
                    'blockchainVerification.verificationStatus': verificationStatus,
                    updatedAt: firestore_1.Timestamp.now(),
                });
            }
        }
        catch (error) {
            console.error('Error creating verification record:', error);
            throw error;
        }
    }
    /**
     * Create NFT record in Firestore
     */
    async createNFTRecord(tokenType, linkedRecordId, tokenId, ownerAddress, metadataUri, transactionId, additionalData = {}) {
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
                metadata: Object.assign({ uri: metadataUri }, additionalData),
                mintedAt: firestore_1.Timestamp.now(),
                transferHistory: [
                    {
                        fromAddress: '0x0000000000000000000000000000000000000000',
                        toAddress: ownerAddress,
                        transactionId,
                        timestamp: firestore_1.Timestamp.now(),
                    },
                ],
            };
            // Add to Firestore
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'nftTokens', nftData.id), nftData);
            // Log activity
            await core_1.ActivityLoggerService.logActivity('blockchain', 'nft', `MINT_${tokenType.toUpperCase()}_NFT`, tokenType, linkedRecordId, 'success', { tokenId, transactionId, ownerAddress });
            // Update the agent or solution record with NFT reference
            if (tokenType === 'agent') {
                await (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 'agents', linkedRecordId), {
                    'metadata.nftTokenId': tokenId,
                    'metadata.nftContractAddress': this.nftContract.address,
                    'metadata.nftTransactionId': transactionId,
                    updatedAt: firestore_1.Timestamp.now(),
                });
            }
            else {
                await (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 'solutions', linkedRecordId), {
                    'metadata.nftTokenId': tokenId,
                    'metadata.nftContractAddress': this.nftContract.address,
                    'metadata.nftTransactionId': transactionId,
                    updatedAt: firestore_1.Timestamp.now(),
                });
            }
        }
        catch (error) {
            console.error('Error creating NFT record:', error);
            throw error;
        }
    }
    /**
     * Update NFT owner in Firestore
     */
    async updateNFTOwner(tokenId, newOwnerAddress, transactionId) {
        try {
            // Query for the NFT record
            const nftQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'nftTokens'), (0, firestore_1.where)('tokenId', '==', tokenId), (0, firestore_1.where)('contractAddress', '==', this.nftContract.address));
            const querySnapshot = await (0, firestore_1.getDocs)(nftQuery);
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
                timestamp: firestore_1.Timestamp.now(),
            };
            // Update NFT record
            await (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 'nftTokens', nftDoc.id), {
                ownerAddress: newOwnerAddress,
                transferHistory: [...nftData.transferHistory, transferEvent],
                updatedAt: firestore_1.Timestamp.now(),
            });
            // Log activity
            await core_1.ActivityLoggerService.logActivity('blockchain', 'nft', 'TRANSFER_NFT', nftData.tokenType, nftData.linkedRecordId, 'success', {
                tokenId,
                fromAddress: nftData.ownerAddress,
                toAddress: newOwnerAddress,
                transactionId,
            });
            // Update the linked record if needed (for ownership tracking)
            if (nftData.tokenType === 'agent') {
                // Determine new owner type and ID based on address
                const { ownerType, ownerId } = await this.resolveAddressToOwner(newOwnerAddress);
                // Update agent owner
                if (ownerType && ownerId) {
                    await (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 'agents', nftData.linkedRecordId), {
                        ownerType,
                        ownerId,
                        'metadata.ownershipTransferred': true,
                        'metadata.previousOwner': {
                            ownerAddress: nftData.ownerAddress,
                        },
                        updatedAt: firestore_1.Timestamp.now(),
                    });
                }
            }
        }
        catch (error) {
            console.error('Error updating NFT owner:', error);
            throw error;
        }
    }
    /**
     * Create subscription record in Firestore
     */
    async createSubscriptionRecord(subscriptionId, subscriberId, solutionId, solutionCode, startTime, endTime, transactionId) {
        try {
            // Get solution details
            const solutionDoc = await (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'solutions', solutionId));
            if (!solutionDoc.exists()) {
                throw new Error('Solution not found');
            }
            const solution = solutionDoc.data();
            // Determine subscriber type and create subscription record
            const subscriberDoc = await (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'users', subscriberId));
            const subscriberType = subscriberDoc.exists() ? 'user' : 'organization';
            const subscriptionData = {
                id: `sub_${subscriptionId}`,
                blockchainSubscriptionId: subscriptionId,
                solutionId,
                subscriberType,
                subscriberId,
                subscriptionTier: 'standard', // Default tier, could be dynamic
                status: 'active',
                startDate: firestore_1.Timestamp.fromMillis(startTime * 1000),
                endDate: firestore_1.Timestamp.fromMillis(endTime * 1000),
                billingCycle: 'monthly', // Default cycle, could be dynamic
                paymentStatus: 'paid',
                settings: {},
                metadata: {
                    blockchainTransactionId: transactionId,
                    solutionCode,
                    solutionName: solution.name,
                },
                createdAt: firestore_1.Timestamp.now(),
                updatedAt: firestore_1.Timestamp.now(),
            };
            // Add to Firestore
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'subscriptions', subscriptionData.id), subscriptionData);
            // Log activity
            await core_1.ActivityLoggerService.logActivity('blockchain', 'subscription', 'CREATE_SUBSCRIPTION', 'solution', solutionId, 'success', {
                subscriptionId,
                subscriberId,
                subscriberType,
                startTime,
                endTime,
                transactionId,
            });
            // Update user or organization with the subscription
            const fieldToUpdate = 'solutions';
            if (subscriberType === 'user') {
                const user = subscriberDoc.data();
                if (!user.solutions.includes(solutionCode)) {
                    await (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 'users', subscriberId), {
                        solutions: [...user.solutions, solutionCode],
                        updatedAt: firestore_1.Timestamp.now(),
                    });
                }
            }
            else {
                const orgDoc = await (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'organizations', subscriberId));
                if (orgDoc.exists()) {
                    const organization = orgDoc.data();
                    const orgSolutions = organization.solutions || [];
                    if (!orgSolutions.includes(solutionCode)) {
                        await (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 'organizations', subscriberId), {
                            solutions: [...orgSolutions, solutionCode],
                            updatedAt: firestore_1.Timestamp.now(),
                        });
                    }
                }
            }
        }
        catch (error) {
            console.error('Error creating subscription record:', error);
            throw error;
        }
    }
    /**
     * Update subscription record in Firestore
     */
    async updateSubscriptionRecord(subscriptionId, newEndTime, transactionId) {
        try {
            // Query for the subscription record
            const subscriptionQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'subscriptions'), (0, firestore_1.where)('blockchainSubscriptionId', '==', subscriptionId));
            const querySnapshot = await (0, firestore_1.getDocs)(subscriptionQuery);
            if (querySnapshot.empty) {
                throw new Error('Subscription record not found');
            }
            const subscriptionDoc = querySnapshot.docs[0];
            // Update subscription record
            await (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 'subscriptions', subscriptionDoc.id), {
                endDate: firestore_1.Timestamp.fromMillis(newEndTime * 1000),
                'metadata.renewalTransactionId': transactionId,
                'metadata.lastRenewalDate': firestore_1.Timestamp.now(),
                updatedAt: firestore_1.Timestamp.now(),
            });
            // Log activity
            await core_1.ActivityLoggerService.logActivity('blockchain', 'subscription', 'RENEW_SUBSCRIPTION', 'subscription', subscriptionDoc.id, 'success', { subscriptionId, newEndTime, transactionId });
        }
        catch (error) {
            console.error('Error updating subscription record:', error);
            throw error;
        }
    }
    /**
     * Cancel subscription record in Firestore
     */
    async cancelSubscriptionRecord(subscriptionId, canceledAt, transactionId) {
        try {
            // Query for the subscription record
            const subscriptionQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'subscriptions'), (0, firestore_1.where)('blockchainSubscriptionId', '==', subscriptionId));
            const querySnapshot = await (0, firestore_1.getDocs)(subscriptionQuery);
            if (querySnapshot.empty) {
                throw new Error('Subscription record not found');
            }
            const subscriptionDoc = querySnapshot.docs[0];
            const subscription = subscriptionDoc.data();
            // Update subscription record
            await (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 'subscriptions', subscriptionDoc.id), {
                status: 'canceled',
                endDate: firestore_1.Timestamp.fromMillis(canceledAt * 1000),
                'metadata.cancelTransactionId': transactionId,
                'metadata.canceledAt': firestore_1.Timestamp.fromMillis(canceledAt * 1000),
                updatedAt: firestore_1.Timestamp.now(),
            });
            // Log activity
            await core_1.ActivityLoggerService.logActivity('blockchain', 'subscription', 'CANCEL_SUBSCRIPTION', 'subscription', subscriptionDoc.id, 'success', { subscriptionId, canceledAt, transactionId });
            // Update user or organization solutions array if needed
            // This might be a business decision whether to remove the solution or keep it with canceled status
        }
        catch (error) {
            console.error('Error canceling subscription record:', error);
            throw error;
        }
    }
    /**
     * Resolve blockchain address to owner type and ID
     */
    async resolveAddressToOwner(address) {
        try {
            // Check if address belongs to a user
            const userQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'users'), (0, firestore_1.where)('blockchainAddress', '==', address));
            let querySnapshot = await (0, firestore_1.getDocs)(userQuery);
            if (!querySnapshot.empty) {
                return {
                    ownerType: 'user',
                    ownerId: querySnapshot.docs[0].id,
                };
            }
            // Check if address belongs to an organization
            const orgQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'organizations'), (0, firestore_1.where)('blockchainVerification.address', '==', address));
            querySnapshot = await (0, firestore_1.getDocs)(orgQuery);
            if (!querySnapshot.empty) {
                return {
                    ownerType: 'organization',
                    ownerId: querySnapshot.docs[0].id,
                };
            }
            // Not found
            return { ownerType: '', ownerId: '' };
        }
        catch (error) {
            console.error('Error resolving address to owner:', error);
            throw error;
        }
    }
}
exports.BlockchainIntegrationManager = BlockchainIntegrationManager;
/**
 * S2DO Blockchain Security Manager
 * Handles secure storage and verification of S2DO objects using blockchain
 */
class S2DOBlockchainSecurityManager {
    constructor(blockchainManager) {
        this.integrationManager = blockchainManager;
    }
    /**
     * Create a secure hash of an S2DO object
     */
    createObjectHash(objectData) {
        // Create a deterministic JSON string (sort keys)
        const sortedJson = this.createSortedJson(objectData);
        // Hash the JSON string
        return CryptoJS.SHA256(sortedJson).toString();
    }
    /**
     * Verify an S2DO object hash on the blockchain
     */
    async verifyObjectHash(objectId, objectHash) {
        try {
            // Query for blockchain record with this hash
            const hashQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'blockchainRecords'), (0, firestore_1.where)('recordType', '==', 's2do'), (0, firestore_1.where)('verificationHash', '==', objectHash));
            const querySnapshot = await (0, firestore_1.getDocs)(hashQuery);
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
                blockchainRecord,
            };
        }
        catch (error) {
            console.error('Error verifying object hash:', error);
            throw error;
        }
    }
    /**
     * Register an S2DO object on the blockchain
     */
    async registerObject(objectId, objectData, ownerAddress) {
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
                timestamp: firestore_1.Timestamp.now(),
                verificationHash: objectHash,
                verificationStatus: true,
                blockchainNetwork: 'ethereum',
                metadata: {
                    objectType: objectData.objectType || 'generic',
                    createdAt: objectData.createdAt || firestore_1.Timestamp.now(),
                },
            };
            // Add to Firestore
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'blockchainRecords', verificationData.id), verificationData);
            // Log activity
            await core_1.ActivityLoggerService.logActivity('blockchain', 's2do', 'REGISTER_S2DO', 's2do', objectId, 'success', { objectHash, transactionId: verificationData.transactionId });
            // Update the S2DO object with verification data
            await (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 's2doObjects', objectId), {
                'metadata.blockchainVerification': {
                    hash: objectHash,
                    transactionId: verificationData.transactionId,
                    timestamp: firestore_1.Timestamp.now(),
                    status: true,
                },
                updatedAt: firestore_1.Timestamp.now(),
            });
            return {
                transactionId: verificationData.transactionId,
                objectHash,
            };
        }
        catch (error) {
            console.error('Error registering object on blockchain:', error);
            throw error;
        }
    }
    /**
     * Create a sorted JSON string for deterministic hashing
     */
    createSortedJson(obj) {
        const sortObjectKeys = (obj) => {
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
            if (obj instanceof firestore_1.Timestamp) {
                return obj.toDate().toISOString();
            }
            // Sort object keys
            return Object.keys(obj)
                .sort()
                .reduce((result, key) => {
                result[key] = sortObjectKeys(obj[key]);
                return result;
            }, {});
        };
        return JSON.stringify(sortObjectKeys(obj));
    }
}
exports.S2DOBlockchainSecurityManager = S2DOBlockchainSecurityManager;
exports.default = {
    BlockchainIntegrationManager,
    S2DOBlockchainSecurityManager,
};
//# sourceMappingURL=as-blockchain-integration.js.map