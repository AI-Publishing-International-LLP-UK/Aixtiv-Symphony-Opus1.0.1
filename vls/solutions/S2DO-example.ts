// SD20 Implementation Example
// Demonstrates how to implement and use the SD20 system

import { 
  SD20Service, 
  StemVerb, 
  ActionDomain,
  Participant,
  SD20ActionRequest
} from './sd20-core';
import { SD20BlockchainService } from './sd20-blockchain';
import { SD20ServiceFactory } from './sd20-services';

// Configuration
const config = {
  blockchain: {
    rpcUrl: 'https://ethereum-rpc.example.com',
    privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    actionVerificationContractAddress: '0xabc123def456abc123def456abc123def456abc1',
    actionVerificationContractAbi: [], // Would contain the actual ABI
    nftContractAddress: '0xdef456abc123def456abc123def456abc123def456',
    nftContractAbi: [] // Would contain the actual ABI
  },
  qrCode: {
    secretKey: 'very-secure-secret-key-for-qr-codes'
  },
  notification: {
    emailApiKey: 'email-service-api-key',
    fromEmail: 'notifications@sd20.ai',
    pushApiKey: 'push-notification-service-api-key'
  }
};

/**
 * Sample implementation of SD20 for a publishing workflow
 */
class PublishingWorkflow {
  private sd20Service: SD20Service;
  private participants: Map<string, Participant> = new Map();
  
  constructor(sd20Service: SD20Service) {
    this.sd20Service = sd20Service;
    
    // Initialize participants
    this.setupParticipants();
  }
  
  /**
   * Set up sample participants
   */
  private setupParticipants() {
    // Add an AI agent
    const aiAgent: Participant = {
      id: 'agent-1',
      name: 'Content Assistant AI',
      walletAddress: '0x0000000000000000000000000000000000000000',
      roles: ['content-creator', 'agent'],
      isAgent: true,
      publicKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    };
    this.participants.set(aiAgent.id, aiAgent);
    
    // Add human editor
    const editor: Participant = {
      id: 'user-1',
      name: 'Jane Editor',
      walletAddress: '0x1111111111111111111111111111111111111111',
      roles: ['editor', 'content-approver'],
      isAgent: false,
      publicKey: '0x2345678901abcdef2345678901abcdef2345678901abcdef2345678901abcdef'
    };
    this.participants.set(editor.id, editor);
    
    // Add publishing manager
    const manager: Participant = {
      id: 'user-2',
      name: 'John Manager',
      walletAddress: '0x2222222222222222222222222222222222222222',
      roles: ['manager', 'final-approver'],
      isAgent: false,
      publicKey: '0x3456789012abcdef3456789012abcdef3456789012abcdef3456789012abcdef'
    };
    this.participants.set(manager.id, manager);
  }
  
  /**
   * Initiate content creation process
   */
  async initiateContentCreation(
    title: string,
    contentType: string,
    keywords: string[],
    targetLength: number
  ): Promise<SD20ActionRequest> {
    const agent = this.participants.get('agent-1');
    
    // Create action request
    return this.sd20Service.createActionRequest(
      `S2DO:${StemVerb.CREATE}:Content`,
      agent,
      `Create new ${contentType} content: ${title}`,
      {
        title,
        contentType,
        keywords,
        targetLength
      },
      {
        domain: ActionDomain.CONTENT,
        priority: 'medium',
        tags: ['content-creation', contentType, ...keywords]
      },
      {
        type: 'single',
        requiredRoles: ['content-creator']
      }
    );
  }
  
  /**
   * Submit content for review
   */
  async submitContentForReview(
    contentId: string,
    content: string,
    summary: string
  ): Promise<SD20ActionRequest> {
    const agent = this.participants.get('agent-1');
    
    // Create action request
    return this.sd20Service.createActionRequest(
      `S2DO:${StemVerb.REVIEW}:Content`,
      agent,
      `Content ready for editorial review: ${contentId}`,
      {
        contentId,
        content,
        summary,
        wordCount: content.split(' ').length
      },
      {
        domain: ActionDomain.CONTENT,
        priority: 'medium',
        tags: ['content-review', contentId]
      },
      {
        type: 'single',
        requiredRoles: ['editor']
      }
    );
  }
  
  /**
   * Approve content with editorial feedback
   */
  async approveContentWithFeedback(
    actionId: string,
    editorId: string,
    approved: boolean,
    feedback: string
  ): Promise<void> {
    const editor = this.participants.get(editorId);
    
    // Create signature (in a real system, this would use private key)
    const signature = `${editor.id}-${Date.now()}-approved`;
    
    // Verify the action
    await this.sd20Service.verifyAction(
      actionId,
      editorId,
      approved,
      signature,
      feedback
    );
  }
  
  /**
   * Request final publication approval
   */
  async requestPublicationApproval(
    contentId: string,
    contentVersion: string,
    publishDate: string,
    channels: string[]
  ): Promise<SD20ActionRequest> {
    const editor = this.participants.get('user-1');
    
    // Create action request
    return this.sd20Service.createActionRequest(
      `S2DO:${StemVerb.APPROVE}:Publication`,
      editor,
      `Final approval needed for publishing content: ${contentId}`,
      {
        contentId,
        contentVersion,
        publishDate,
        channels
      },
      {
        domain: ActionDomain.CONTENT,
        priority: 'high',
        tags: ['publication-approval', contentId, ...channels]
      },
      {
        type: 'single',
        requiredRoles: ['final-approver']
      }
    );
  }
  
  /**
   * Approve final publication
   */
  async approveFinalPublication(
    actionId: string,
    managerId: string,
    approved: boolean,
    notes?: string
  ): Promise<void> {
    const manager = this.participants.get(managerId);
    
    // Create signature (in a real system, this would use private key)
    const signature = `${manager.id}-${Date.now()}-finalized`;
    
    // Verify the action
    await this.sd20Service.verifyAction(
      actionId,
      managerId,
      approved,
      signature,
      notes
    );
  }
  
  /**
   * Publish approved content
   */
  async publishContent(
    contentId: string,
    publishingDetails: any
  ): Promise<SD20ActionRequest> {
    const manager = this.participants.get('user-2');
    
    // Create action request
    return this.sd20Service.createActionRequest(
      `S2DO:${StemVerb.PUBLISH}:Content`,
      manager,
      `Publishing content: ${contentId}`,
      {
        contentId,
        publishingDetails
      },
      {
        domain: ActionDomain.CONTENT,
        priority: 'high',
        tags: ['content-publishing', contentId]
      },
      {
        type: 'multi',
        requiredParticipants: ['agent-1', 'user-1', 'user-2'],
        minimumApprovals: 3
      }
    );
  }
}

/**
 * Run a sample publishing workflow
 */
async function runPublishingWorkflowExample() {
  try {
    // Initialize services
    const blockchainService = new SD20BlockchainService(
      config.blockchain.rpcUrl,
      config.blockchain.privateKey,
      config.blockchain.actionVerificationContractAddress,
      config.blockchain.actionVerificationContractAbi,
      config.blockchain.nftContractAddress,
      config.blockchain.nftContractAbi
    );
    
    const qrCodeService = SD20ServiceFactory.createQRCodeService(
      config.qrCode.secretKey
    );
    
    const notificationService = SD20ServiceFactory.createNotificationService(
      config.notification.emailApiKey,
      config.notification.fromEmail,
      config.notification.pushApiKey
    );
    
    // Create SD20 service
    const sd20Service = new SD20Service(
      blockchainService,
      qrCodeService,
      notificationService
    );
    
    // Create publishing workflow
    const publishingWorkflow = new PublishingWorkflow(sd20Service);
    
    // Step 1: Initiate content creation
    console.log('Step 1: Initiating content creation');
    const contentCreationAction = await publishingWorkflow.initiateContentCreation(
      'The Future of Blockchain in Publishing',
      'article',
      ['blockchain', 'publishing', 'technology'],
      1500
    );
    console.log('Content creation initiated:', contentCreationAction.id);
    
    // Simulate content creation (in a real system, the AI would create content)
    console.log('AI Agent creating content...');
    const content = `
# The Future of Blockchain in Publishing

Blockchain technology is revolutionizing the publishing industry by providing
transparent verification of authorship, automated royalty distribution, and
protection against unauthorized content use.

...more content would go here...
    `;
    
    // Step 2: Submit content for review
    console.log('\nStep 2: Submitting content for review');
    const reviewAction = await publishingWorkflow.submitContentForReview(
      contentCreationAction.id,
      content,
      'An exploration of how blockchain is changing publishing'
    );
    console.log('Content submitted for review:', reviewAction.id);
    
    // Step 3: Editor approves content with feedback
    console.log('\nStep 3: Editor approves content with feedback');
    await publishingWorkflow.approveContentWithFeedback(
      reviewAction.id,
      'user-1',
      true,
      'Good content overall. Please add more examples in section 3.'
    );
    console.log('Content approved by editor');
    
    // Step 4: Request final publication approval
    console.log('\nStep 4: Requesting final publication approval');
    const approvalAction = await publishingWorkflow.requestPublicationApproval(
      contentCreationAction.id,
      'v1.1',
      '2025-03-15',
      ['blog', 'newsletter', 'social']
    );
    console.log('Publication approval requested:', approvalAction.id);
    
    // Step 5: Manager approves final publication
    console.log('\nStep 5: Manager approves final publication');
    await publishingWorkflow.approveFinalPublication(
      approvalAction.id,
      'user-2',
      true,
      'Approved for publication on all channels'
    );
    console.log('Publication approved by manager');
    
    // Step 6: Publish content
    console.log('\nStep 6: Publishing content');
    const publishAction = await publishingWorkflow.publishContent(
      contentCreationAction.id,
      {
        channels: ['blog', 'newsletter', 'social'],
        publishDate: '2025-03-15T10:00:00Z',
        featuredImage: 'blockchain-publishing.jpg'
      }
    );
    console.log('Content published:', publishAction.id);
    
    // Show success message
    console.log('\nPublishing workflow completed successfully!');
    console.log('An NFT will be minted for all contributors to this publication.');
    
  } catch (error) {
    console.error('Error in publishing workflow:', error);
  }
}

// Run the example
runPublishingWorkflowExample().catch(console.error);

/**
 * Example of how to integrate SD20 with Firebase for a real implementation
 */
export async function setupSD20WithFirebase() {
  // This would be called during your application initialization
  
  const blockchainService = new SD20BlockchainService(
    config.blockchain.rpcUrl,
    config.blockchain.privateKey,
    config.blockchain.actionVerificationContractAddress,
    config.blockchain.actionVerificationContractAbi,
    config.blockchain.nftContractAddress,
    config.blockchain.nftContractAbi
  );
  
  const qrCodeService = SD20ServiceFactory.createQRCodeService(
    config.qrCode.secretKey
  );
  
  const notificationService = SD20ServiceFactory.createNotificationService(
    config.notification.emailApiKey,
    config.notification.fromEmail,
    config.notification.pushApiKey
  );
  
  // Create SD20 service
  const sd20Service = new SD20Service(
    blockchainService,
    qrCodeService,
    notificationService
  );
  
  // Register Firebase functions for SD20 actions
  
  // 1. Function to create action requests
  // This would be called from your application code
  // firebase.functions().httpsCallable('createSD20Action')({
  //   action: 'S2DO:Create:Content',
  //   description: 'Create new blog post',
  //   parameters: {...},
  //   metadata: {...},
  //   verificationRequirement: {...}
  // });
  
  // 2. Function to handle action verification
  // This would be triggered when a user scans a QR code
  // firebase.functions().httpsCallable('verifySD20Action')({
  //   actionId: 'action-123',
  //   approved: true,
  //   notes: 'Looks good!'
  // });
  
  // 3. Function to query actions
  // This would be used to display pending actions for a user
  // firebase.functions().httpsCallable('querySD20Actions')({
  //   status: 'pending',
  //   domain: 'Content'
  // });
  
  return sd20Service;
}
