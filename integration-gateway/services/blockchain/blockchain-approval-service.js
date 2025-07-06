"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// BlockchainApprovalService for S2DO Governance Framework
const ethers_1 = require("ethers");
// Smart contract ABI (abbreviated for this example)
const approvalContractAbi = [
    "function requestApproval(string requestId, string requester, string actionType, string scope, string contentHash, string metadataHash, string governanceModelId) public returns (string)",
    "function approveRequest(string requestId, string approver) public returns (bool)",
    "function rejectRequest(string requestId, string approver, string reason) public returns (bool)",
    "function getApprovalStatus(string requestId) public view returns (uint8, string, uint256)",
    "event ApprovalRequested(string indexed requestId, string requester, uint256 timestamp)",
    "event ApprovalGranted(string indexed requestId, string approver, uint256 timestamp)",
    "event ApprovalRejected(string indexed requestId, string approver, string reason, uint256 timestamp)"
];
// Content hash utility
function createContentHash(content) {
    return ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.toUtf8Bytes(content));
}
// BlockchainApprovalService implementation
class BlockchainApprovalService {
    constructor(config) {
        this.config = config;
        // Initialize provider
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(config.rpcUrl);
        // Initialize wallet
        if (config.privateKey) {
            this.wallet = new ethers_1.ethers.Wallet(config.privateKey, this.provider);
        }
        else {
            throw new Error("Private key is required for blockchain transactions");
        }
        // Initialize contract
        this.contract = new ethers_1.ethers.Contract(config.contractAddress, approvalContractAbi, this.wallet);
    }
    // Request approval for an action
    requestApproval(request) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Prepare data for blockchain
                const contentHash = createContentHash(request.content);
                const metadataHash = createContentHash(JSON.stringify(request.metadata));
                // Prepare transaction options
                const txOptions = {};
                if (this.config.gasLimit)
                    txOptions.gasLimit = this.config.gasLimit;
                if (this.config.gasPrice)
                    txOptions.gasPrice = ethers_1.ethers.utils.parseUnits(this.config.gasPrice, "gwei");
                // Call contract method
                const tx = yield this.contract.requestApproval(request.id, request.requester, request.actionType, request.scope, contentHash, metadataHash, request.governanceModelId, txOptions);
                // Wait for transaction to be mined
                const receipt = yield tx.wait();
                // Process events to get attestation ID
                const event = (_a = receipt.events) === null || _a === void 0 ? void 0 : _a.find(e => e.event === "ApprovalRequested");
                if (!event) {
                    throw new Error("Approval request event not found in transaction receipt");
                }
                // Return attestation ID
                return receipt.transactionHash;
            }
            catch (error) {
                console.error("Error in requestApproval:", error);
                throw new Error(`Failed to request approval: ${error.message}`);
            }
        });
    }
    // Approve a request
    approveRequest(requestId, approver) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Prepare transaction options
                const txOptions = {};
                if (this.config.gasLimit)
                    txOptions.gasLimit = this.config.gasLimit;
                if (this.config.gasPrice)
                    txOptions.gasPrice = ethers_1.ethers.utils.parseUnits(this.config.gasPrice, "gwei");
                // Call contract method
                const tx = yield this.contract.approveRequest(requestId, approver, txOptions);
                // Wait for transaction to be mined
                const receipt = yield tx.wait();
                // Process events
                const event = (_a = receipt.events) === null || _a === void 0 ? void 0 : _a.find(e => e.event === "ApprovalGranted");
                if (!event) {
                    throw new Error("Approval granted event not found in transaction receipt");
                }
                // Return approval result
                return {
                    id: requestId,
                    approved: true,
                    transactionHash: receipt.transactionHash,
                    timestamp: Date.now(),
                    approver,
                    attestationId: receipt.transactionHash
                };
            }
            catch (error) {
                console.error("Error in approveRequest:", error);
                throw new Error(`Failed to approve request: ${error.message}`);
            }
        });
    }
    // Reject a request
    rejectRequest(requestId, approver, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Prepare transaction options
                const txOptions = {};
                if (this.config.gasLimit)
                    txOptions.gasLimit = this.config.gasLimit;
                if (this.config.gasPrice)
                    txOptions.gasPrice = ethers_1.ethers.utils.parseUnits(this.config.gasPrice, "gwei");
                // Call contract method
                const tx = yield this.contract.rejectRequest(requestId, approver, reason, txOptions);
                // Wait for transaction to be mined
                const receipt = yield tx.wait();
                // Process events
                const event = (_a = receipt.events) === null || _a === void 0 ? void 0 : _a.find(e => e.event === "ApprovalRejected");
                if (!event) {
                    throw new Error("Approval rejected event not found in transaction receipt");
                }
                // Return rejection result
                return {
                    id: requestId,
                    approved: false,
                    transactionHash: receipt.transactionHash,
                    timestamp: Date.now(),
                    approver,
                    reason
                };
            }
            catch (error) {
                console.error("Error in rejectRequest:", error);
                throw new Error(`Failed to reject request: ${error.message}`);
            }
        });
    }
    // Get approval status
    getApprovalStatus(requestId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Call contract method
                const [statusCode, approver, timestamp] = yield this.contract.getApprovalStatus(requestId);
                // Map status code to readable status
                let status;
                switch (statusCode) {
                    case 0:
                        status = 'PENDING';
                        break;
                    case 1:
                        status = 'APPROVED';
                        break;
                    case 2:
                        status = 'REJECTED';
                        break;
                    default:
                        throw new Error(`Unknown status code: ${statusCode}`);
                }
                return {
                    status,
                    approver,
                    timestamp: timestamp.toNumber()
                };
            }
            catch (error) {
                console.error("Error in getApprovalStatus:", error);
                throw new Error(`Failed to get approval status: ${error.message}`);
            }
        });
    }
}
// S2DO Agent Communication Service with Blockchain Integration
class S2DOAgentCommunicationService {
    constructor(blockchainConfig) {
        this.pendingApprovals = new Map();
        this.blockchainService = new BlockchainApprovalService(blockchainConfig);
    }
    // Send a communication with blockchain approval
    sendCommunication(communication) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Generate communication ID
                const communicationId = `comm-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
                // Create approval request
                const approvalRequest = {
                    id: communicationId,
                    requester: communication.agentId,
                    actionType: "COMMUNICATION",
                    scope: communication.recipientId,
                    context: communication.context,
                    content: communication.content,
                    metadata: communication.metadata,
                    governanceModelId: communication.governanceModelId
                };
                // Request approval
                const transactionHash = yield this.blockchainService.requestApproval(approvalRequest);
                // Store pending approval
                this.pendingApprovals.set(communicationId, communication);
                // Return result
                return {
                    success: true,
                    communicationId,
                    transactionHash
                };
            }
            catch (error) {
                console.error("Error in sendCommunication:", error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    }
    // Check communication approval status
    checkCommunicationStatus(communicationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get approval status from blockchain
                const approvalStatus = yield this.blockchainService.getApprovalStatus(communicationId);
                return {
                    communicationId,
                    status: approvalStatus.status,
                    approver: approvalStatus.approver,
                    timestamp: approvalStatus.timestamp
                };
            }
            catch (error) {
                console.error("Error in checkCommunicationStatus:", error);
                throw new Error(`Failed to check communication status: ${error.message}`);
            }
        });
    }
    // Execute a communication after approval
    executeCommunication(communicationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if communication exists in pending approvals
                if (!this.pendingApprovals.has(communicationId)) {
                    throw new Error(`Communication with ID ${communicationId} not found`);
                }
                // Get communication details
                const communication = this.pendingApprovals.get(communicationId);
                // Check approval status
                const status = yield this.checkCommunicationStatus(communicationId);
                if (status.status !== 'APPROVED') {
                    throw new Error(`Communication ${communicationId} is not approved (status: ${status.status})`);
                }
                // Execute communication (in a real system, this would send the message to the recipient)
                console.log(`Executing communication from ${communication.agentId} to ${communication.recipientId}`);
                console.log(`Content: ${communication.content}`);
                // Remove from pending approvals
                this.pendingApprovals.delete(communicationId);
                return {
                    success: true
                };
            }
            catch (error) {
                console.error("Error in executeCommunication:", error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    }
    // Proactive communication initiation based on governance model
    initiateProactiveCommunication(agentId_1, recipientId_1, content_1, context_1, governanceModelId_1) {
        return __awaiter(this, arguments, void 0, function* (agentId, recipientId, content, context, governanceModelId, metadata = {}) {
            // Create communication request
            const communication = {
                agentId,
                recipientId,
                content,
                context,
                metadata,
                governanceModelId
            };
            // Send for approval
            return this.sendCommunication(communication);
        });
    }
}
// Usage example for Step 2: Integrating BlockchainApprovalService
function implementStep2() {
    // Example blockchain configuration
    const blockchainConfig = {
        rpcUrl: "https://eth-goerli.alchemyapi.io/v2/your-api-key",
        chainId: 5, // Goerli testnet
        contractAddress: "0x1234567890123456789012345678901234567890",
        privateKey: "your-private-key", // In production, use secure key management
        gasLimit: 3000000,
        gasPrice: "50" // 50 Gwei
    };
    // Create communication service
    const communicationService = new S2DOAgentCommunicationService(blockchainConfig);
    // Example: Initiate proactive communication
    function sendProactiveCommunication() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield communicationService.initiateProactiveCommunication("agent-001", "user-123", "Hello! Based on your recent activity, I thought you might be interested in our new feature.", "FEATURE_ANNOUNCEMENT", "gov-model-individual-001", {
                priority: "MEDIUM",
                category: "PRODUCT_UPDATE",
                timestamp: Date.now()
            });
            console.log("Proactive communication initiated:", result);
            if (result.success && result.communicationId) {
                // Wait for approval (in a real system, this would be event-driven)
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    const status = yield communicationService.checkCommunicationStatus(result.communicationId);
                    console.log("Communication status:", status);
                    if (status.status === 'APPROVED') {
                        const executionResult = yield communicationService.executeCommunication(result.communicationId);
                        console.log("Execution result:", executionResult);
                    }
                }), 60000); // Check after 1 minute
            }
        });
    }
    // Return the communication service for further use
    return {
        communicationService,
        sendProactiveCommunication
    };
}
