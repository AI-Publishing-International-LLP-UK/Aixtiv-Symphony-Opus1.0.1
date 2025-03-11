// BlockchainApprovalService for S2DO Governance Framework
import { ethers } from 'ethers';

// Types for blockchain integration
interface BlockchainConfig {
  rpcUrl: string;
  chainId: number;
  contractAddress: string;
  privateKey?: string;
  gasLimit?: number;
  gasPrice?: string;
}

interface ApprovalRequest {
  id: string;
  requester: string;
  actionType: string;
  scope: string;
  context: string;
  content: string;
  metadata: Record<string, any>;
  governanceModelId: string;
  culturalContext?: string;
}

interface ApprovalResult {
  id: string;
  approved: boolean;
  transactionHash?: string;
  timestamp: number;
  approver: string;
  reason?: string;
  attestationId?: string;
  culturalSensitivityScore?: number;
}

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
function createContentHash(content: string): string {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(content));
}

// BlockchainApprovalService implementation
class BlockchainApprovalService {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private config: BlockchainConfig;
  
  constructor(config: BlockchainConfig) {
    this.config = config;
    
    // Initialize provider
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    
    // Initialize wallet
    if (config.privateKey) {
      this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    } else {
      throw new Error("Private key is required for blockchain transactions");
    }
    
    // Initialize contract
    this.contract = new ethers.Contract(
      config.contractAddress,
      approvalContractAbi,
      this.wallet
    );
  }
  
  // Request approval for an action
  public async requestApproval(request: ApprovalRequest): Promise<string> {
    try {
      // Prepare data for blockchain
      const contentHash = createContentHash(request.content);
      const metadataHash = createContentHash(JSON.stringify(request.metadata));
      
      // Prepare transaction options
      const txOptions: ethers.Overrides = {};
      if (this.config.gasLimit) txOptions.gasLimit = this.config.gasLimit;
      if (this.config.gasPrice) txOptions.gasPrice = ethers.utils.parseUnits(this.config.gasPrice, "gwei");
      
      // Call contract method
      const tx = await this.contract.requestApproval(
        request.id,
        request.requester,
        request.actionType,
        request.scope,
        contentHash,
        metadataHash,
        request.governanceModelId,
        txOptions
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Process events to get attestation ID
      const event = receipt.events?.find(e => e.event === "ApprovalRequested");
      
      if (!event) {
        throw new Error("Approval request event not found in transaction receipt");
      }
      
      // Return attestation ID
      return receipt.transactionHash;
    } catch (error) {
      console.error("Error in requestApproval:", error);
      throw new Error(`Failed to request approval: ${error.message}`);
    }
  }
  
  // Approve a request
  public async approveRequest(requestId: string, approver: string): Promise<ApprovalResult> {
    try {
      // Prepare transaction options
      const txOptions: ethers.Overrides = {};
      if (this.config.gasLimit) txOptions.gasLimit = this.config.gasLimit;
      if (this.config.gasPrice) txOptions.gasPrice = ethers.utils.parseUnits(this.config.gasPrice, "gwei");
      
      // Call contract method
      const tx = await this.contract.approveRequest(requestId, approver, txOptions);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Process events
      const event = receipt.events?.find(e => e.event === "ApprovalGranted");
      
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
    } catch (error) {
      console.error("Error in approveRequest:", error);
      throw new Error(`Failed to approve request: ${error.message}`);
    }
  }
  
  // Reject a request
  public async rejectRequest(requestId: string, approver: string, reason: string): Promise<ApprovalResult> {
    try {
      // Prepare transaction options
      const txOptions: ethers.Overrides = {};
      if (this.config.gasLimit) txOptions.gasLimit = this.config.gasLimit;
      if (this.config.gasPrice) txOptions.gasPrice = ethers.utils.parseUnits(this.config.gasPrice, "gwei");
      
      // Call contract method
      const tx = await this.contract.rejectRequest(requestId, approver, reason, txOptions);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Process events
      const event = receipt.events?.find(e => e.event === "ApprovalRejected");
      
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
    } catch (error) {
      console.error("Error in rejectRequest:", error);
      throw new Error(`Failed to reject request: ${error.message}`);
    }
  }
  
  // Get approval status
  public async getApprovalStatus(requestId: string): Promise<{
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approver: string;
    timestamp: number;
  }> {
    try {
      // Call contract method
      const [statusCode, approver, timestamp] = await this.contract.getApprovalStatus(requestId);
      
      // Map status code to readable status
      let status: 'PENDING' | 'APPROVED' | 'REJECTED';
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
    } catch (error) {
      console.error("Error in getApprovalStatus:", error);
      throw new Error(`Failed to get approval status: ${error.message}`);
    }
  }
}

// Agent communication system integration
interface AgentCommunication {
  agentId: string;
  recipientId: string;
  content: string;
  context: string;
  metadata: Record<string, any>;
  governanceModelId: string;
}

// S2DO Agent Communication Service with Blockchain Integration
class S2DOAgentCommunicationService {
  private blockchainService: BlockchainApprovalService;
  private pendingApprovals: Map<string, AgentCommunication> = new Map();
  
  constructor(blockchainConfig: BlockchainConfig) {
    this.blockchainService = new BlockchainApprovalService(blockchainConfig);
  }
  
  // Send a communication with blockchain approval
  public async sendCommunication(communication: AgentCommunication): Promise<{
    success: boolean;
    communicationId?: string;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      // Generate communication ID
      const communicationId = `comm-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      // Create approval request
      const approvalRequest: ApprovalRequest = {
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
      const transactionHash = await this.blockchainService.requestApproval(approvalRequest);
      
      // Store pending approval
      this.pendingApprovals.set(communicationId, communication);
      
      // Return result
      return {
        success: true,
        communicationId,
        transactionHash
      };
    } catch (error) {
      console.error("Error in sendCommunication:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Check communication approval status
  public async checkCommunicationStatus(communicationId: string): Promise<{
    communicationId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approver?: string;
    timestamp?: number;
  }> {
    try {
      // Get approval status from blockchain
      const approvalStatus = await this.blockchainService.getApprovalStatus(communicationId);
      
      return {
        communicationId,
        status: approvalStatus.status,
        approver: approvalStatus.approver,
        timestamp: approvalStatus.timestamp
      };
    } catch (error) {
      console.error("Error in checkCommunicationStatus:", error);
      throw new Error(`Failed to check communication status: ${error.message}`);
    }
  }
  
  // Execute a communication after approval
  public async executeCommunication(communicationId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Check if communication exists in pending approvals
      if (!this.pendingApprovals.has(communicationId)) {
        throw new Error(`Communication with ID ${communicationId} not found`);
      }
      
      // Get communication details
      const communication = this.pendingApprovals.get(communicationId)!;
      
      // Check approval status
      const status = await this.checkCommunicationStatus(communicationId);
      
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
    } catch (error) {
      console.error("Error in executeCommunication:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Proactive communication initiation based on governance model
  public async initiateProactiveCommunication(
    agentId: string,
    recipientId: string,
    content: string,
    context: string,
    governanceModelId: string,
    metadata: Record<string, any> = {}
  ): Promise<{
    success: boolean;
    communicationId?: string;
    transactionHash?: string;
    error?: string;
  }> {
    // Create communication request
    const communication: AgentCommunication = {
      agentId,
      recipientId,
      content,
      context,
      metadata,
      governanceModelId
    };
    
    // Send for approval
    return this.sendCommunication(communication);
  }
}

// Usage example for Step 2: Integrating BlockchainApprovalService
function implementStep2() {
  // Example blockchain configuration
  const blockchainConfig: BlockchainConfig = {
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
  async function sendProactiveCommunication() {
    const result = await communicationService.initiateProactiveCommunication(
      "agent-001",
      "user-123",
      "Hello! Based on your recent activity, I thought you might be interested in our new feature.",
      "FEATURE_ANNOUNCEMENT",
      "gov-model-individual-001",
      {
        priority: "MEDIUM",
        category: "PRODUCT_UPDATE",
        timestamp: Date.now()
      }
    );
    
    console.log("Proactive communication initiated:", result);
    
    if (result.success && result.communicationId) {
      // Wait for approval (in a real system, this would be event-driven)
      setTimeout(async () => {
        const status = await communicationService.checkCommunicationStatus(result.communicationId!);
        console.log("Communication status:", status);
        
        if (status.status === 'APPROVED') {
          const executionResult = await communicationService.executeCommunication(result.communicationId!);
          console.log("Execution result:", executionResult);
        }
      }, 60000); // Check after 1 minute
    }
  }
  
  // Return the communication service for further use
  return {
    communicationService,
    sendProactiveCommunication
  };
}
