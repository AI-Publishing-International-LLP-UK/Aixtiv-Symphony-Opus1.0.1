/**
 * AIXTIV SYMPHONY™ Firestore Schema
 * © 2025 AI Publishing International LLP
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * This document defines the Firestore schema for the AIXTIV SYMPHONY system.
 */

// Example document structure for main collections

/**
 * users/{userId}
 * User profiles and authentication information
 */
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

/**
 * organizations/{organizationId}
 * Enterprise, academic, or community organization details
 */
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

/**
 * organizations/{organizationId}/members/{userId}
 * Organization membership details
 */
interface OrganizationMember {
  userId: string;
  organizationId: string;
  role: string;                   // Role within the organization
  permissions: string[];
  joinedAt: Timestamp;
  status: 'active' | 'inactive';
  metadata: Record<string, any>;
}

/**
 * teams/{teamId}
 * Team details within organizations
 */
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

/**
 * teams/{teamId}/members/{userId}
 * Team membership details
 */
interface TeamMember {
  userId: string;
  teamId: string;
  role: string;
  joinedAt: Timestamp;
  status: 'active' | 'inactive';
}

/**
 * solutions/{solutionId}
 * AIXTIV SYMPHONY solutions
 */
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

/**
 * subscriptions/{subscriptionId}
 * Solution subscriptions
 */
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

/**
 * agents/{agentId}
 * Agent instance details
 */
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

/**
 * agents/{agentId}/access/{accessId}
 * Agent access controls
 */
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

/**
 * integrationGateways/{gatewayId}
 * Integration gateway configurations
 */
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

/**
 * integrationGateways/{gatewayId}/endpoints/{endpointId}
 * Gateway endpoint configurations
 */
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

/**
 * integrationApiKeys/{apiKeyId}
 * API keys for gateway access
 */
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

/**
 * integrationConnections/{connectionId}
 * External service connections
 */
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

/**
 * conversations/{conversationId}
 * Conversation metadata
 */
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

/**
 * conversations/{conversationId}/participants/{participantId}
 * Conversation participants
 */
interface ConversationParticipant {
  conversationId: string;
  participantType: 'user' | 'agent';
  participantId: string;
  joinedAt: Timestamp;
  leftAt?: Timestamp;
  status: 'active' | 'removed';
}

/**
 * conversations/{conversationId}/messages/{messageId}
 * Conversation messages
 */
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

/**
 * activityLogs/{logId}
 * System activity logging
 */
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

/**
 * performanceMetrics/{metricId}
 * System performance tracking
 */
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

/**
 * blockchainRecords/{recordId}
 * Blockchain verification records
 */
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

/**
 * nftTokens/{tokenId}
 * NFT tokens for subscriptions and ownership
 */
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

/**
 * vectorStores/{storeId}
 * Metadata for Pinecone vector stores
 */
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

/**
 * s2doObjects/{objectId}
 * S2DO object metadata
 */
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

/**
 * raysComputeJobs/{jobId}
 * Rays distributed computing job metadata
 */
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

// Firestore rules structure (to be implemented in firestore.rules)
/*
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
    
    // ... additional rules for other collections ...
    
    // Helper functions
    function hasAdminRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.specializedRoles.hasAny(['VISIONARY_VOICE', 'CO_PILOT']);
    }
    
    function isOrgMember(orgId) {
      return exists(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid));
    }
    
    function isOrgAdmin(orgId) {
      return get(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
*/
