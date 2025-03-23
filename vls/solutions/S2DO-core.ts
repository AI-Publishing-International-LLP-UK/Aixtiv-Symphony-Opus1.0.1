// SD20 System Core
// A next-generation blockchain-based verification system for agent-human collaboration

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

/**
 * Action types that can be executed in the SD20 system
 * Using the human-friendly S2DO:Stem:Action format
 */
export type SD20Action = `S2DO:${StemVerb}:${string}`;

/**
 * Core action verbs (stems) for the SD20 system
 */
export enum StemVerb {
  // Creation and Initiation
  CREATE = 'Create',
  START = 'Start',
  INITIATE = 'Initiate',
  DESIGN = 'Design',
  BUILD = 'Build',
  
  // Review and Approval
  REVIEW = 'Review',
  APPROVE = 'Approve',
  VERIFY = 'Verify',
  VALIDATE = 'Validate',
  CONFIRM = 'Confirm',
  
  // Management
  UPDATE = 'Update',
  MANAGE = 'Manage',
  MONITOR = 'Monitor',
  OPTIMIZE = 'Optimize',
  ANALYZE = 'Analyze',
  
  // Completion
  COMPLETE = 'Complete',
  DELIVER = 'Deliver',
  PUBLISH = 'Publish',
  RELEASE = 'Release',
  DEPLOY = 'Deploy',
  
  // Financial
  AUTHORIZE = 'Authorize',
  FUND = 'Fund',
  PAY = 'Pay',
  INVOICE = 'Invoice',
  BUDGET = 'Budget'
}

/**
 * Common domains where actions take place
 */
export enum ActionDomain {
  CONTENT = 'Content',
  PROJECT = 'Project',
  FINANCE = 'Finance',
  SYSTEM = 'System',
  LEGAL = 'Legal',
  CREATIVE = 'Creative',
  GOVERNANCE = 'Governance',
  OPERATIONS = 'Operations',
  PERSONNEL = 'Personnel',
  CUSTOMER = 'Customer'
}

/**
 * Represents a participant in the SD20 system
 */
export interface Participant {
  id: string;
  name: string;
  walletAddress?: string;
  roles: string[];
  isAgent: boolean;
  publicKey: string;
}

/**
 * Reference to supporting materials or context
 */
export interface Reference {
  id: string;
  type: 'document' | 'image' | 'video' | 'link' | 'data';
  uri: string;
  hash: string; // SHA-256 hash of the content
}

/**
 * Metadata for SD20 actions
 */
export interface ActionMetadata {
  createdAt: number; // Timestamp
  expiresAt?: number; // Optional expiration
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  domain: ActionDomain;
  customFields?: Record<string, any>;
}

/**
 * Verification requirements for an action
 */
export interface VerificationRequirement {
  type: 'single' | 'multi' | 'sequential' | 'majority';
  requiredRoles?: string[];
  requiredParticipants?: string[];
  minimumApprovals?: number;
  timeConstraint?: number; // Max time in ms to complete verification
}

/**
 * Verification record of participant approval
 */
export interface VerificationRecord {
  participantId: string;
  timestamp: number;
  signature: string; // Cryptographic signature
  notes?: string;
  ipAddress?: string;
  deviceInfo?: string;
}

/**
 * Main SD20 Action Request object
 */
export interface SD20ActionRequest {
  id: string;
  action: SD20Action;
  initiator: Participant;
  description: string;
  metadata: ActionMetadata;
  parameters: Record<string, any>;
  references?: Reference[];
  verificationRequirement: VerificationRequirement;
  qrCodeData?: string;
  blockchainTxId?: string;
}

/**
 * Represents the complete record of an SD20 action
 */
export interface SD20ActionRecord extends SD20ActionRequest {
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'completed';
  verifications: VerificationRecord[];
  completedAt?: number;
  result?: any;
  childActions?: string[]; // IDs of actions triggered by this one
  parentAction?: string; // ID of the action that triggered this one
  nftTokenId?: string; // If an NFT was generated
}

/**
 * Core service class for the SD20 system
 */
export class SD20Service {
  private actions: Map<string, SD20ActionRecord> = new Map();
  private participants: Map<string, Participant> = new Map();
  
  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly qrCodeService: QRCodeService,
    private readonly notificationService: NotificationService
  ) {}
  
  /**
   * Create a new SD20 action request
   */
  async createActionRequest(
    action: SD20Action,
    initiator: Participant,
    description: string,
    parameters: Record<string, any>,
    metadata: Partial<ActionMetadata>,
    verificationRequirement: VerificationRequirement,
    references?: Reference[]
  ): Promise<SD20ActionRequest> {
    // Create the action ID
    const id = uuidv4();
    
    // Ensure the initiator is registered
    if (!this.participants.has(initiator.id)) {
      this.participants.set(initiator.id, initiator);
    }
    
    // Complete the metadata
    const fullMetadata: ActionMetadata = {
      createdAt: Date.now(),
      priority: 'medium',
      tags: [],
      domain: ActionDomain.OPERATIONS,
      ...metadata
    };
    
    // Create the action request
    const actionRequest: SD20ActionRequest = {
      id,
      action,
      initiator,
      description,
      metadata: fullMetadata,
      parameters,
      references,
      verificationRequirement
    };
    
    // Generate QR code if this action requires scanning
    if (actionRequest.verificationRequirement.type !== 'single' || 
        initiator.isAgent) {
      actionRequest.qrCodeData = await this.qrCodeService.generateQRCode({
        actionId: id,
        action: actionRequest.action,
        timestamp: actionRequest.metadata.createdAt,
        initiatorId: initiator.id,
        verificationUrl: `https://sd20.ai/verify/${id}`
      });
    }
    
    // Record the action
    const actionRecord: SD20ActionRecord = {
      ...actionRequest,
      status: 'pending',
      verifications: []
    };
    
    this.actions.set(id, actionRecord);
    
    // Notify required verifiers
    await this.notifyVerifiers(actionRecord);
    
    return actionRequest;
  }
  
  /**
   * Verify an action (approve or reject)
   */
  async verifyAction(
    actionId: string,
    participantId: string,
    approved: boolean,
    signature: string,
    notes?: string
  ): Promise<SD20ActionRecord> {
    const action = this.actions.get(actionId);
    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }
    
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }
    
    // Verify that this participant is authorized
    this.verifyParticipantAuthorization(action, participant);
    
    // Add verification record
    const verificationRecord: VerificationRecord = {
      participantId,
      timestamp: Date.now(),
      signature,
      notes,
      deviceInfo: 'Web Browser', // Would capture real device info
      ipAddress: '127.0.0.1' // Would capture real IP
    };
    
    action.verifications.push(verificationRecord);
    
    // Check if verification requirements are met
    const allRequirementsMet = this.checkVerificationRequirements(action);
    
    if (approved && allRequirementsMet) {
      // All requirements met and approved
      action.status = 'approved';
      action.completedAt = Date.now();
      
      // Execute blockchain verification if needed
      if (action.metadata.domain === ActionDomain.FINANCE || 
          action.metadata.priority === 'critical') {
        action.blockchainTxId = await this.recordOnBlockchain(action);
      }
      
      // Generate NFT for significant actions if needed
      if (this.shouldGenerateNFT(action)) {
        action.nftTokenId = await this.generateNFT(action);
      }
      
      // Execute any resulting actions
      await this.executeResultingActions(action);
    } else if (!approved) {
      // Explicitly rejected
      action.status = 'rejected';
      action.completedAt = Date.now();
    }
    
    // Update the action record
    this.actions.set(actionId, action);
    
    return action;
  }
  
  /**
   * Verify that a participant is authorized to verify this action
   */
  private verifyParticipantAuthorization(
    action: SD20ActionRecord,
    participant: Participant
  ): void {
    const req = action.verificationRequirement;
    
    // Check required roles
    if (req.requiredRoles && req.requiredRoles.length > 0) {
      const hasRequiredRole = participant.roles.some(role => 
        req.requiredRoles.includes(role)
      );
      
      if (!hasRequiredRole) {
        throw new Error('Participant does not have required role');
      }
    }
    
    // Check specific required participants
    if (req.requiredParticipants && req.requiredParticipants.length > 0) {
      if (!req.requiredParticipants.includes(participant.id)) {
        throw new Error('Participant is not in the required participants list');
      }
    }
    
    // Check sequential requirements
    if (req.type === 'sequential') {
      // In sequential approval, check if it's this participant's turn
      // Implementation depends on the specific rules for sequencing
    }
  }
  
  /**
   * Check if all verification requirements have been met
   */
  private checkVerificationRequirements(action: SD20ActionRecord): boolean {
    const req = action.verificationRequirement;
    const verifications = action.verifications;
    
    // Check minimum approvals
    if (req.minimumApprovals && verifications.length < req.minimumApprovals) {
      return false;
    }
    
    // Check for specific required participants
    if (req.requiredParticipants && req.requiredParticipants.length > 0) {
      const verifiedParticipantIds = new Set(
        verifications.map(v => v.participantId)
      );
      
      for (const requiredId of req.requiredParticipants) {
        if (!verifiedParticipantIds.has(requiredId)) {
          return false;
        }
      }
    }
    
    // All checks passed
    return true;
  }
  
  /**
   * Record an action on the blockchain
   */
  private async recordOnBlockchain(action: SD20ActionRecord): Promise<string> {
    // Create a hash of the action data
    const actionData = JSON.stringify({
      id: action.id,
      action: action.action,
      initiatorId: action.initiator.id,
      description: action.description,
      parameters: action.parameters,
      createdAt: action.metadata.createdAt,
      completedAt: action.completedAt,
      verifications: action.verifications.map(v => ({
        participantId: v.participantId,
        timestamp: v.timestamp,
        signature: v.signature
      }))
    });
    
    const actionHash = crypto
      .createHash('sha256')
      .update(actionData)
      .digest('hex');
    
    // Store on blockchain
    return this.blockchainService.storeActionVerification(
      action.id,
      actionHash,
      action.initiator.walletAddress,
      action.verifications.map(v => v.participantId)
    );
  }
  
  /**
   * Determine if an NFT should be generated for this action
   */
  private shouldGenerateNFT(action: SD20ActionRecord): boolean {
    // Generate NFTs for completed significant milestones
    if (action.action.startsWith('S2DO:Complete:')) {
      return true;
    }
    
    // Generate NFTs for creative content
    if (action.metadata.domain === ActionDomain.CREATIVE &&
        action.action.startsWith('S2DO:Publish:')) {
      return true;
    }
    
    // Generate NFTs for major financial transactions
    if (action.metadata.domain === ActionDomain.FINANCE &&
        action.parameters.amount > 10000) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Generate an NFT for a completed action
   */
  private async generateNFT(action: SD20ActionRecord): Promise<string> {
    // Extract all contributors from the action
    const contributors = [
      action.initiator,
      ...action.verifications.map(v => this.participants.get(v.participantId))
    ].filter(Boolean);
    
    // Create NFT metadata
    const metadata = {
      name: `${action.action} - ${new Date(action.completedAt).toISOString().split('T')[0]}`,
      description: action.description,
      image: '', // Would generate an image based on the action
      attributes: [
        { trait_type: 'Action', value: action.action },
        { trait_type: 'Domain', value: action.metadata.domain },
        { trait_type: 'Completion Date', value: new Date(action.completedAt).toISOString().split('T')[0] },
        ...action.metadata.tags.map(tag => ({ trait_type: 'Tag', value: tag }))
      ],
      contributors: contributors.map(c => ({
        id: c.id,
        name: c.name,
        role: c.roles[0]
      }))
    };
    
    // Generate the NFT
    return this.blockchainService.mintNFT(
      metadata,
      action.initiator.walletAddress,
      contributors.map(c => c.walletAddress).filter(Boolean)
    );
  }
  
  /**
   * Execute any resulting actions that should be triggered
   */
  private async executeResultingActions(action: SD20ActionRecord): Promise<void> {
    // This would implement any business logic for triggering follow-up actions
    // For example, if a project milestone is completed, it might trigger payment actions
  }
  
  /**
   * Notify required verifiers that an action needs their attention
   */
  private async notifyVerifiers(action: SD20ActionRecord): Promise<void> {
    const req = action.verificationRequirement;
    const participantsToNotify: Participant[] = [];
    
    // Determine which participants to notify
    if (req.requiredParticipants && req.requiredParticipants.length > 0) {
      for (const participantId of req.requiredParticipants) {
        const participant = this.participants.get(participantId);
        if (participant) {
          participantsToNotify.push(participant);
        }
      }
    } else if (req.requiredRoles && req.requiredRoles.length > 0) {
      // Notify all participants with the required roles
      for (const participant of this.participants.values()) {
        if (participant.roles.some(role => req.requiredRoles.includes(role))) {
          participantsToNotify.push(participant);
        }
      }
    }
    
    // Send notifications
    for (const participant of participantsToNotify) {
      await this.notificationService.sendActionNotification(
        participant,
        action,
        `Action requires your verification: ${action.action}`
      );
    }
  }
  
  /**
   * Get an action by ID
   */
  getAction(actionId: string): SD20ActionRecord | undefined {
    return this.actions.get(actionId);
  }
  
  /**
   * Query actions based on filters
   */
  queryActions(filters: {
    status?: SD20ActionRecord['status'];
    initiatorId?: string;
    domain?: ActionDomain;
    startDate?: number;
    endDate?: number;
    action?: string;
  }): SD20ActionRecord[] {
    return Array.from(this.actions.values()).filter(action => {
      if (filters.status && action.status !== filters.status) return false;
      if (filters.initiatorId && action.initiator.id !== filters.initiatorId) return false;
      if (filters.domain && action.metadata.domain !== filters.domain) return false;
      if (filters.action && !action.action.includes(filters.action)) return false;
      if (filters.startDate && action.metadata.createdAt < filters.startDate) return false;
      if (filters.endDate && action.metadata.createdAt > filters.endDate) return false;
      return true;
    });
  }
}

/**
 * Interface for blockchain service
 */
export interface BlockchainService {
  storeActionVerification(
    actionId: string,
    actionHash: string,
    initiatorAddress: string,
    verifierAddresses: string[]
  ): Promise<string>;
  
  mintNFT(
    metadata: any,
    ownerAddress: string,
    contributorAddresses: string[]
  ): Promise<string>;
  
  verifyActionRecord(
    actionId: string,
    actionHash: string
  ): Promise<boolean>;
}

/**
 * Interface for QR code service
 */
export interface QRCodeService {
  generateQRCode(data: any): Promise<string>;
  verifyQRCode(qrCodeData: string): Promise<any>;
}

/**
 * Interface for notification service
 */
export interface NotificationService {
  sendActionNotification(
    participant: Participant,
    action: SD20ActionRecord,
    message: string
  ): Promise<void>;
}
