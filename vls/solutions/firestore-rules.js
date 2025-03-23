/**
 * AIXTIV SYMPHONY™ Firestore Schema and Rules
 * © 2025 AI Publishing International LLP
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * This file defines the Firestore schema and security rules for the AIXTIV SYMPHONY system.
 */

// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profiles - accessible by the user and admins
    match /users/{userId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && (request.auth.uid == userId || hasAdminRole());
      allow update: if request.auth != null && (request.auth.uid == userId || hasAdminRole());
      allow delete: if request.auth != null && hasAdminRole();
    }
    
    // Organizations - readable by members, manageable by admins
    match /organizations/{orgId} {
      allow create: if request.auth != null && hasAdminRole();
      allow read: if request.auth != null && (isOrgMember(orgId) || hasAdminRole());
      allow update: if request.auth != null && (isOrgAdmin(orgId) || hasAdminRole());
      allow delete: if request.auth != null && hasAdminRole();
      
      // Organization members - readable by all org members
      match /members/{memberId} {
        allow read: if request.auth != null && (isOrgMember(orgId) || hasAdminRole());
        allow write: if request.auth != null && (isOrgAdmin(orgId) || hasAdminRole());
      }
    }
    
    // Teams - readable by members, manageable by team leaders and admins
    match /teams/{teamId} {
      allow create: if request.auth != null && (hasAdminRole() || isOrgAdmin(resource.data.organizationId));
      allow read: if request.auth != null && (isTeamMember(teamId) || hasAdminRole());
      allow update: if request.auth != null && (isTeamLeader(teamId) || hasAdminRole());
      allow delete: if request.auth != null && hasAdminRole();
      
      // Team members - readable by all team members
      match /members/{memberId} {
        allow read: if request.auth != null && (isTeamMember(teamId) || hasAdminRole());
        allow write: if request.auth != null && (isTeamLeader(teamId) || hasAdminRole());
      }
    }
    
    // Solutions - readable by all authenticated users
    match /solutions/{solutionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && hasAdminRole();
    }
    
    // Subscriptions - readable by subscribers and admins
    match /subscriptions/{subscriptionId} {
      allow read: if request.auth != null && (isSubscriber(resource.data) || hasAdminRole());
      allow write: if request.auth != null && hasAdminRole();
    }
    
    // Agents - readable and manageable based on access rights
    match /agents/{agentId} {
      allow read: if request.auth != null && (canAccessAgent(agentId) || hasAdminRole());
      allow create: if request.auth != null && (hasValidSubscription() || hasAdminRole());
      allow update: if request.auth != null && (canConfigureAgent(agentId) || hasAdminRole());
      allow delete: if request.auth != null && (isAgentOwner(resource.data) || hasAdminRole());
      
      // Agent access controls
      match /access/{accessId} {
        allow read: if request.auth != null && (canAccessAgent(agentId) || hasAdminRole());
        allow write: if request.auth != null && (canAdminAgent(agentId) || hasAdminRole());
      }
    }
    
    // Integration gateways
    match /integrationGateways/{gatewayId} {
      allow read: if request.auth != null && (isGatewayOwner(resource.data) || hasAdminRole());
      allow write: if request.auth != null && (isGatewayOwner(resource.data) || hasAdminRole());
      
      // Gateway endpoints
      match /endpoints/{endpointId} {
        allow read: if request.auth != null && (isGatewayOwner(get(/databases/$(database)/documents/integrationGateways/$(gatewayId)).data) || hasAdminRole());
        allow write: if request.auth != null && (isGatewayOwner(get(/databases/$(database)/documents/integrationGateways/$(gatewayId)).data) || hasAdminRole());
      }
    }
    
    // API keys
    match /integrationApiKeys/{apiKeyId} {
      allow read: if request.auth != null && (isApiKeyOwner(resource.data) || hasAdminRole());
      allow write: if request.auth != null && hasAdminRole();
    }
    
    // Integration connections
    match /integrationConnections/{connectionId} {
      allow read: if request.auth != null && (isConnectionOwner(resource.data) || hasAdminRole());
      allow write: if request.auth != null && (isConnectionOwner(resource.data) || hasAdminRole());
    }
    
    // Conversations
    match /conversations/{conversationId} {
      allow read: if request.auth != null && (isConversationParticipant(conversationId) || hasAdminRole());
      allow create: if request.auth != null;
      allow update: if request.auth != null && (isConversationParticipant(conversationId) || hasAdminRole());
      allow delete: if request.auth != null && (isConversationOwner(conversationId) || hasAdminRole());
      
      // Conversation participants
      match /participants/{participantId} {
        allow read: if request.auth != null && (isConversationParticipant(conversationId) || hasAdminRole());
        allow write: if request.auth != null && (isConversationOwner(conversationId) || hasAdminRole());
      }
      
      // Conversation messages
      match /messages/{messageId} {
        allow read: if request.auth != null && (isConversationParticipant(conversationId) || hasAdminRole());
        allow create: if request.auth != null && isConversationParticipant(conversationId);
        allow update: if request.auth != null && (isMessageAuthor(conversationId, messageId) || hasAdminRole());
        allow delete: if request.auth != null && (isMessageAuthor(conversationId, messageId) || isConversationOwner(conversationId) || hasAdminRole());
      }
    }
    
    // Activity logs
    match /activityLogs/{logId} {
      allow read: if request.auth != null && (request.auth.uid == resource.data.actorId || hasAdminRole());
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && hasAdminRole();
    }
    
    // Performance metrics
    match /performanceMetrics/{metricId} {
      allow read: if request.auth != null && hasAdminRole();
      allow write: if request.auth != null && hasAdminRole();
    }
    
    // Blockchain records
    match /blockchainRecords/{recordId} {
      allow read: if request.auth != null && (isRecordOwner(resource.data) || hasAdminRole());
      allow write: if request.auth != null && hasAdminRole();
    }
    
    // NFT tokens
    match /nftTokens/{tokenId} {
      allow read: if request.auth != null && (isTokenOwner(resource.data) || hasAdminRole());
      allow write: if request.auth != null && hasAdminRole();
    }
    
    // Vector stores
    match /vectorStores/{storeId} {
      allow read: if request.auth != null && (isStoreOwner(resource.data) || hasAdminRole());
      allow write: if request.auth != null && (isStoreOwner(resource.data) || hasAdminRole());
    }
    
    // S2DO objects
    match /s2doObjects/{objectId} {
      allow read: if request.auth != null && (canAccessS2DOObject(resource.data) || hasAdminRole());
      allow write: if request.auth != null && (isS2DOObjectOwner(resource.data) || hasAdminRole());
    }
    
    // Rays compute jobs
    match /raysComputeJobs/{jobId} {
      allow read: if request.auth != null && (isJobRequester(resource.data) || hasAdminRole());
      allow create: if request.auth != null && hasValidSubscription();
      allow update: if request.auth != null && (isJobRequester(resource.data) || hasAdminRole());
      allow delete: if request.auth != null && hasAdminRole();
    }
    
    // Helper functions
    function hasAdminRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.specializedRoles.hasAny(['VV', 'CP']);
    }
    
    function isOrgMember(orgId) {
      return exists(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid));
    }
    
    function isOrgAdmin(orgId) {
      return get(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isTeamMember(teamId) {
      return exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
    }
    
    function isTeamLeader(teamId) {
      return get(/databases/$(database)/documents/teams/$(teamId)).data.leaderId == request.auth.uid;
    }
    
    function isSubscriber(subscriptionData) {
      return (subscriptionData.subscriberType == 'user' && subscriptionData.subscriberId == request.auth.uid) ||
             (subscriptionData.subscriberType == 'organization' && isOrgMember(subscriptionData.subscriberId)) ||
             (subscriptionData.subscriberType == 'team' && isTeamMember(subscriptionData.subscriberId));
    }
    
    function hasValidSubscription() {
      return exists(/databases/$(database)/documents/subscriptions/).where('subscriberType', '==', 'user').where('subscriberId', '==', request.auth.uid).where('status', '==', 'active').limit(1);
    }
    
    function canAccessAgent(agentId) {
      return exists(/databases/$(database)/documents/agents/$(agentId)/access).where('accessId', '==', request.auth.uid).where('status', '==', 'active').limit(1);
    }
    
    function canConfigureAgent(agentId) {
      let access = get(/databases/$(database)/documents/agents/$(agentId)/access).where('accessId', '==', request.auth.uid).where('status', '==', 'active').limit(1);
      return access.size() > 0 && access.docs[0].data.permissionLevel.hasAny(['configure', 'admin']);
    }
    
    function canAdminAgent(agentId) {
      let access = get(/databases/$(database)/documents/agents/$(agentId)/access).where('accessId', '==', request.auth.uid).where('status', '==', 'active').limit(1);
      return access.size() > 0 && access.docs[0].data.permissionLevel == 'admin';
    }
    
    function isAgentOwner(agentData) {
      return (agentData.ownerType == 'user' && agentData.ownerId == request.auth.uid) ||
             (agentData.ownerType == 'organization' && isOrgAdmin(agentData.ownerId)) ||
             (agentData.ownerType == 'team' && isTeamLeader(agentData.ownerId));
    }
    
    function isGatewayOwner(gatewayData) {
      return (gatewayData.ownerType == 'user' && gatewayData.ownerId == request.auth.uid) ||
             (gatewayData.ownerType == 'organization' && isOrgAdmin(gatewayData.ownerId)) ||
             (gatewayData.ownerType == 'team' && isTeamLeader(gatewayData.ownerId));
    }
    
    function isApiKeyOwner(apiKeyData) {
      return (apiKeyData.issuedToType == 'user' && apiKeyData.issuedToId == request.auth.uid) ||
             (apiKeyData.issuedToType == 'organization' && isOrgAdmin(apiKeyData.issuedToId)) ||
             (apiKeyData.issuedToType == 'team' && isTeamLeader(apiKeyData.issuedToId));
    }
    
    function isConnectionOwner(connectionData) {
      return isGatewayOwner(get(/databases/$(database)/documents/integrationGateways/$(connectionData.gatewayId)).data);
    }
    
    function isConversationParticipant(conversationId) {
      return exists(/databases/$(database)/documents/conversations/$(conversationId)/participants).where('participantType', '==', 'user').where('participantId', '==', request.auth.uid).where('status', '==', 'active').limit(1);
    }
    
    function isConversationOwner(conversationId) {
      let conversation = get(/databases/$(database)/documents/conversations/$(conversationId));
      return conversation.data.initiatorType == 'user' && conversation.data.initiatorId == request.auth.uid;
    }
    
    function isMessageAuthor(conversationId, messageId) {
      let message = get(/databases/$(database)/documents/conversations/$(conversationId)/messages/$(messageId));
      return message.data.senderType == 'user' && message.data.senderId == request.auth.uid;
    }
    
    function isRecordOwner(recordData) {
      return (recordData.recordType == 'user' && recordData.recordId == request.auth.uid) ||
             (recordData.recordType == 'organization' && isOrgAdmin(recordData.recordId)) ||
             (recordData.recordType == 'agent' && isAgentOwner(get(/databases/$(database)/documents/agents/$(recordData.recordId)).data));
    }
    
    function isTokenOwner(tokenData) {
      let userBlockchainAddress = get(/databases/$(database)/documents/users/$(request.auth.uid)).data.blockchainAddress;
      return userBlockchainAddress != null && userBlockchainAddress == tokenData.ownerAddress;
    }
    
    function isStoreOwner(storeData) {
      return (storeData.ownerType == 'user' && storeData.ownerId == request.auth.uid) ||
             (storeData.ownerType == 'organization' && isOrgAdmin(storeData.ownerId)) ||
             (storeData.ownerType == 'agent' && isAgentOwner(get(/databases/$(database)/documents/agents/$(storeData.ownerId)).data));
    }
    
    function canAccessS2DOObject(objectData) {
      return objectData.permissions.publicAccess == true || 
             objectData.permissions.authorizedUsers.hasAny([request.auth.uid]) ||
             (objectData.ownerType == 'user' && objectData.ownerId == request.auth.uid) ||
             (objectData.ownerType == 'organization' && isOrgMember(objectData.ownerId)) ||
             (objectData.ownerType == 'agent' && canAccessAgent(objectData.ownerId));
    }
    
    function isS2DOObjectOwner(objectData) {
      return (objectData.ownerType == 'user' && objectData.ownerId == request.auth.uid) ||
             (objectData.ownerType == 'organization' && isOrgAdmin(objectData.ownerId)) ||
             (objectData.ownerType == 'agent' && isAgentOwner(get(/databases/$(database)/documents/agents/$(objectData.ownerId)).data));
    }
    
    function isJobRequester(jobData) {
      return (jobData.requesterType == 'user' && jobData.requesterId == request.auth.uid) ||
             (jobData.requesterType == 'organization' && isOrgAdmin(jobData.requesterId)) ||
             (jobData.requesterType == 'agent' && isAgentOwner(get(/databases/$(database)/documents/agents/$(jobData.requesterId)).data));
    }
  }
}

// Firestore Schema TypeScript Definitions
/*
// users/{userId}
interface User {
  id: string;                     // UID from Firebase Auth
  userCode: string;               // Generated user type code (e.g., "C-L-E-8765-45921-VV-Q")
  track: string;                  // C, O, A, CM (Corporate, Organizational, Academic, Community)
  position: string;               // L, M, S, E, F, I (Leader, Member, Student, Educator, Faculty, Individual)
  level: string;                  // E, T, G, D, C, I (Enterprise, Team, Group, Department, Class, Individual)
  entityId: string;               // Reference to organization, team, or other entity
  specializedRoles: string[];     // VV, CP, PI (Visionary Voice, Co-Pilot, Pilot)
  paymentTerm: string;            // M, Q, A, EL (Monthly, Quarterly, Annual, Enterprise License)
  solutions: string[];            // Solution codes (DC, LA, WG, etc.)
  integrations: string[];         // Integration types (ML-A, MM-A, etc.)
  securityOptions: string[];      // SSO, MFA, BA, BCV
  email: string;                  // User email
  displayName: string;            // Display name
  photoURL?: string;              // Profile image URL
  createdAt: Timestamp;           // Creation timestamp
  updatedAt: Timestamp;           // Last update timestamp
  lastLogin?: Timestamp;          // Last login timestamp
  blockchainAddress?: string;     // User's blockchain address
  verificationStatus: 'pending' | 'verified' | 'rejected';
  userMetadata: Record<string, any>; // Additional metadata
}

// organizations/{organizationId}
interface Organization {
  id: string;
  name: string;
  trackType: string;              // C, O, A, CM
  description?: string;
  website?: string;
  logoURL?: string;
  industry?: string;
  size?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
  };
  status: 'active' | 'inactive' | 'suspended';
  settings: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  blockchainVerification?: {
    address: string;
    verificationStatus: boolean;
    transactionId?: string;
  };
}

// organizations/{organizationId}/members/{userId}
interface OrganizationMember {
  userId: string;
  organizationId: string;
  role: string;                   // Role within the organization
  permissions: string[];
  joinedAt: Timestamp;
  status: 'active' | 'inactive';
  metadata: Record<string, any>;
}

// teams/{teamId}
interface Team {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  leaderId?: string;              // Reference to team leader user ID
  status: 'active' | 'inactive';
  settings: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// teams/{teamId}/members/{userId}
interface TeamMember {
  userId: string;
  teamId: string;
  role: string;
  joinedAt: Timestamp;
  status: 'active' | 'inactive';
}

// solutions/{solutionId}
interface Solution {
  id: string;
  solutionCode: string;          // DC, LA, WG, etc.
  name: string;
  description: string;
  features: string[];
  status: 'active' | 'beta' | 'deprecated';
  version: string;
  pricingModel: {
    tiers: {
      name: string;
      price: number;
      billingCycle: 'monthly' | 'quarterly' | 'annual';
      features: string[];
    }[];
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// subscriptions/{subscriptionId}
interface Subscription {
  id: string;
  solutionId: string;
  subscriberType: 'user' | 'organization' | 'team';
  subscriberId: string;
  subscriptionTier: string;
  status: 'active' | 'inactive' | 'expired';
  startDate: Timestamp;
  endDate?: Timestamp;
  billingCycle: 'monthly' | 'quarterly' | 'annual' | 'enterprise';
  paymentStatus: 'paid' | 'pending' | 'failed';
  settings: Record<string, any>;
  nftToken?: string;             // NFT representing the subscription
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// agents/{agentId}
interface Agent {
  id: string;
  agentTypeId: string;            // DR_MATCH, DR_MEMORIA, etc.
  ownerType: 'user' | 'organization' | 'team';
  ownerId: string;
  name: string;
  nickname?: string;
  status: 'active' | 'inactive';
  performanceProfile: 'standard' | 'high_performance' | 'ultra_performance';
  appearanceSettings: {
    avatar?: string;
    color?: string;
    theme?: string;
    customizations?: Record<string, any>;
  };
  communicationSettings: {
    language?: string;
    tone?: string;
    responseLength?: 'concise' | 'standard' | 'detailed';
    adapters?: string[];
  };
  culturalAdaptationSettings: {
    region?: string;
    contextualReferences?: boolean;
    localExamples?: boolean;
    languageAdaptation?: boolean;
  };
  metadata: Record<string, any>;
  vectorStoreId?: string;         // Reference to Pinecone vector store
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// agents/{agentId}/access/{accessId}
interface AgentAccess {
  agentId: string;
  accessType: 'user' | 'organization' | 'team';
  accessId: string;
  permissionLevel: 'read' | 'use' | 'configure' | 'admin';
  grantedAt: Timestamp;
  grantedBy: string;              // User ID who granted access
  expiresAt?: Timestamp;
  status: 'active' | 'revoked';
}

// integrationGateways/{gatewayId}
interface IntegrationGateway {
  id: string;
  gatewayType: 'owner' | 'enterprise' | 'owner_subscriber';
  name: string;
  description?: string;
  ownerType: 'user' | 'organization' | 'team';
  ownerId: string;
  securityTier: number;           // 1: Basic, 2: Enterprise, 3: Owner-Subscriber, 4: Advanced
  status: 'active' | 'inactive';
  encryptionKeyId?: string;
  authenticationSettings: {
    apiKeyRequired?: boolean;
    jwtRequired?: boolean;
    allowedOrigins?: string[];
    blockchainVerificationRequired?: boolean;
  };
  rateLimitSettings: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// integrationGateways/{gatewayId}/endpoints/{endpointId}
interface IntegrationEndpoint {
  id: string;
  gatewayId: string;
  endpointPath: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description?: string;
  requiresAuthentication: boolean;
  requiredPermissions: string[];
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  status: 'active' | 'inactive';
  rateLimit?: number;
  functionName?: string;          // Cloud Function name
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// integrationApiKeys/{apiKeyId}
interface IntegrationApiKey {
  id: string;
  gatewayId: string;
  keyName: string;
  keyPrefix: string;              // First 8 chars of API key
  keyHash: string;                // Hashed API key (not the actual key)
  issuedToType: 'user' | 'organization' | 'team' | 'service';
  issuedToId: string;
  issuedBy: string;               // User ID who issued the key
  permissions: string[];
  status: 'active' | 'revoked';
  issuedAt: Timestamp;
  expiresAt?: Timestamp;
  lastUsedAt?: Timestamp;
}

// integrationConnections/{connectionId}
interface IntegrationConnection {
  id: string;
  gatewayId: string;
  connectionType: string;         // LINKEDIN, SALESFORCE, etc.
  displayName: string;
  config: Record<string, any>;
  authCredentials?: {             // Encrypted credentials
    encrypted: string;
    iv: string;
  };
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// conversations/{conversationId}
interface Conversation {
  id: string;
  title?: string;
  initiatorType: 'user' | 'agent';
  initiatorId: string;
  conversationType: 'standard' | 'agent_team' | 'multi_user';
  status: 'active' | 'archived' | 'deleted';
  metadata: Record<string, any>;
  pineconeNamespace?: string;     // For vectorized conversation history
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// conversations/{conversationId}/participants/{participantId}
interface ConversationParticipant {
  conversationId: string;
  participantType: 'user' | 'agent';
  participantId: string;
  joinedAt: Timestamp;
  leftAt?: Timestamp;
  status: 'active' | 'removed';
}

// conversations/{conversationId}/messages/{messageId}
interface Message {
  id: string;
  conversationId: string;
  senderType: 'user' | 'agent';
  senderId: string;
  content: string;
  contentType: 'text' | 'image' | 'document' | 'audio' | 'rich';
  parentMessageId?: string;
  metadata: Record<string, any>;
  vectorId?: string;              // For retrieval from Pinecone
  sentAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;
}

// activityLogs/{logId}
interface ActivityLog {
  id: string;
  actorType: 'user' | 'agent' | 'system';
  actorId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  status: 'success' | 'failure' | 'warning';
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  performedAt: Timestamp;
}

// performanceMetrics/{metricId}
interface PerformanceMetric {
  id: string;
  metricType: string;
  subjectType: 'agent' | 'gateway' | 'endpoint';
  subjectId: string;
  value: number;
  unit?: string;
  capturedAt: Timestamp;
  metadata: Record<string, any>;
}

// blockchainRecords/{recordId}
interface BlockchainRecord {
  id: string;
  recordType: 'user' | 'agent' | 'subscription' | 'content';
  recordId: string;
  blockchainAddress: string;
  transactionId: string;
  timestamp: Timestamp;
  verificationHash: string;
  verificationStatus: boolean;
  blockchainNetwork: string;      // e.g., 'ethereum', 'polygon'
  blockNumber?: number;
  metadata: Record<string, any>;
}

// nftTokens/{tokenId}
interface NFTToken {
  id: string;
  tokenId: string;               // Token ID on blockchain
  tokenType: 'subscription' | 'agent' | 'content';
  linkedRecordId: string;        // ID of the record this NFT represents
  ownerAddress: string;          // Blockchain address of token owner
  contractAddress: string;       // NFT contract address
  blockchainNetwork: string;     // e.g., 'ethereum', 'polygon'
  metadata: {
    name: string;
    description: string;
    image: string;
    attributes: {
      trait_type: string;
      value: string;
    }[];
  };
  mintedAt: Timestamp;
  transferHistory: {
    fromAddress: string;
    toAddress: string;
    transactionId: string;
    timestamp: Timestamp;
  }[];
}

// vectorStores/{storeId}
interface VectorStore {
  id: string;
  name: string;
  ownerType: 'user' | 'organization' | 'agent';
  ownerId: string;
  indexName: string;             // Pinecone index name
  namespace: string;             // Pinecone namespace
  dimensions: number;            // Vector dimensions
  status: 'active' | 'inactive';
  metadata: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// s2doObjects/{objectId}
interface S2DOObject {
  id: string;
  ownerType: 'user' | 'organization' | 'agent';
  ownerId: string;
  objectType: string;            // Type of S2DO object
  status: 'active' | 'archived' | 'deleted';
  storageUrl: string;            // URL to the S2DO storage
  encryptionStatus: boolean;     // Whether the object is encrypted
  permissions: {
    publicAccess: boolean;
    authorizedUsers: string[];
    authorizedOrganizations: string[];
  };
  metadata: Record<string, any>;
  blockchainVerification?: {
    transactionId: string;
    blockchainAddress: string;
    verificationStatus: boolean;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// raysComputeJobs/{jobId}
interface RaysComputeJob {
  id: string;
  jobType: string;               // Type of computation
  status: 'pending' | 'running' | 'completed' | 'failed';
  requesterId: string;
  requesterType: 'user' | 'organization' | 'agent';
  parameters: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  progress: number;              // 0-100 percentage
  result?: {
    storageUrl?: string;         // URL to result data
    summary?: string;            // Brief result summary
    metrics?: Record<string, any>;
  };
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}