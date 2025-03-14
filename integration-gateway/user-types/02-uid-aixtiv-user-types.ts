/**
 * AIXTIV SYMPHONY™ User Type System
 * © 2025 AI Publishing International LLP
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * This is proprietary software of AI Publishing International LLP.
 * All rights reserved. No part of this software may be reproduced,
 * modified, or distributed without prior written permission.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * User Type Enum - The comprehensive user classification system for AIXTIV SYMPHONY
 * Designed for Firestore document-based storage and blockchain integration
 */
export enum UserType {
  // -------------------- TRACK IDENTIFIERS --------------------
  CORPORATE = 'C',
  ORGANIZATIONAL = 'O',
  ACADEMIC = 'A',
  COMMUNITY = 'CM',

  // -------------------- POSITION IDENTIFIERS --------------------
  LEADER = 'L',
  MEMBER = 'M',
  STUDENT = 'S',
  EDUCATOR = 'E',
  FACULTY = 'F',
  INDIVIDUAL = 'I',

  // -------------------- LEVEL IDENTIFIERS --------------------
  ENTERPRISE = 'E',
  TEAM = 'T',
  GROUP = 'G',
  DEPARTMENT = 'D',
  CLASS = 'C',
  LEVEL_INDIVIDUAL = 'I',

  // -------------------- SPECIALIZED ROLE IDENTIFIERS --------------------
  VISIONARY_VOICE = 'VV',
  CO_PILOT = 'CP',
  PILOT = 'PI',
  
  // -------------------- PAYMENT TERM IDENTIFIERS --------------------
  MONTHLY_SUBSCRIBER = 'M',
  QUARTERLY_SUBSCRIBER = 'Q',
  ANNUAL_SUBSCRIBER = 'A',
  ENTERPRISE_LICENSE = 'EL',
  
  // -------------------- COMPLETE USER TYPES --------------------
  // Corporate Track - Enterprise Level
  CORPORATE_ENTERPRISE_LEADER = 'C-L-E',
  CORPORATE_ENTERPRISE_MEMBER = 'C-M-E',
  
  // Corporate Track - Team Level
  CORPORATE_TEAM_LEADER = 'C-L-T',
  CORPORATE_TEAM_MEMBER = 'C-M-T',
  
  // Corporate Track - Group Level
  CORPORATE_GROUP_LEADER = 'C-L-G',
  CORPORATE_GROUP_MEMBER = 'C-M-G',
  
  // Organizational Track
  ORGANIZATIONAL_ENTERPRISE_LEADER = 'O-L-E',
  ORGANIZATIONAL_DEPARTMENT_LEADER = 'O-L-D',
  ORGANIZATIONAL_TEAM_MEMBER = 'O-M-T',
  
  // Academic Track
  ACADEMIC_FACULTY = 'A-F-C',
  ACADEMIC_EDUCATOR = 'A-E-C',
  ACADEMIC_STUDENT = 'A-S-C',
  
  // Community Track
  COMMUNITY_LEADER = 'CM-L-I',
  COMMUNITY_MEMBER = 'CM-M-I'
}

/**
 * Solution Codes - Enum for solutions available in the AIXTIV SYMPHONY system
 */
export enum CoreSolution {
  DREAM_COMMANDER = 'DC',
  LENZ_ANALYST = 'LA',
  WISH_GRANTER = 'WG',
  MEMORIA_ANTHOLOGY = 'MA',
  BRAND_DIAGNOSTIC = 'BD',
  BRAND_BUILDER = 'BB',
  CUSTOMER_DELIGHT = 'CD',
  BID_SUITE = 'BS'
}

/**
 * Pilot Types - Specialized agents in the AIXTIV SYMPHONY ecosystem
 */
export enum PilotType {
  // R1 Core Squadron
  DR_LUCY_R1_CORE_01 = 'DLR1C01',
  DR_LUCY_R1_CORE_02 = 'DLR1C02',
  DR_LUCY_R1_CORE_03 = 'DLR1C03',
  
  // Specialized Agent Pilots
  DR_CLAUDE_PILOT = 'DCP',      // Workflow Delegation & Quality Control
  DR_ROARK_PILOT = 'DRP',       // Visionary Leadership
  DR_MEMORIA_PILOT = 'DMP',     // AI Automated Publishing
  
  // Operational Agents
  PROFESSOR_LEE_PILOT = 'PLP',  // Lenz and Dream Commander Operations
  DR_MATCH_PILOT = 'DMaP',      // Marketing & Communications
  
  // Relationship and Historical Agents
  DR_CYPRIOT_PILOT = 'DCyP',    // Human-AI Relationships
  DR_MARIA_HISTORICAL_01 = 'DMH01',  // Internationalization
  DR_MARIA_HISTORICAL_02 = 'DMH02',  // Personalization
  DR_MARIA_HISTORICAL_03 = 'DMH03',  // Global Cultural Adaptation
  
  // Governance and Compliance Agents
  DR_BURBY_PILOT = 'DBP'        // CFO/GC, Risk Management
}

/**
 * Integration Type - Available integrations for the AIXTIV SYMPHONY system
 */
export enum IntegrationType {
  MATCH_LINKEDIN_APP = 'ML-A',
  MEMORIA_LINKEDIN_APP = 'MM-A',
  GOOGLE_WORKSPACE = 'GW-A',
  BLOCKCHAIN_VALIDATOR = 'BC-V'
}

/**
 * Security Option - Security features available in the system
 */
export enum SecurityOption {
  SINGLE_SIGN_ON = 'SSO',
  MULTI_FACTOR_AUTH = 'MFA',
  BIOMETRIC_AUTH = 'BA',
  BLOCKCHAIN_VERIFICATION = 'BCV'
}

/**
 * Firebase/Firestore User Model Interface
 * Structured for NoSQL document storage
 */
export interface AIXTIVUser {
  id: string;
  userCode: string;
  track: UserType; // C, O, A, CM
  position: UserType; // L, M, S, E, F, I
  level: UserType; // E, T, G, D, C, I
  entityId: string;
  specializedRoles: UserType[];
  paymentTerm: UserType;
  solutions: CoreSolution[];
  integrations: IntegrationType[];
  securityOptions: SecurityOption[];
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLogin?: Timestamp;
  blockchainAddress?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  userMetadata: Record<string, any>;
}

/**
 * Metadata for user types - provides additional context and capabilities for each user type
 */
export const UserTypeMetadata: Record<string, {
  baseCapabilities: string[];
  eligibleSpecializedRoles: UserType[];
  availablePaymentTiers: UserType[];
  availableSolutions: CoreSolution[];
  maxIntegrations: number;
  securityLevel: 'basic' | 'enhanced' | 'maximum';
  blockchainEnabled: boolean;
}> = {
  [UserType.CORPORATE_ENTERPRISE_LEADER]: {
    baseCapabilities: ['Dream Commander', 'Bid Suite', 'LENZ Analyst', 'Strategic Planning', 'Team Management'],
    eligibleSpecializedRoles: [UserType.VISIONARY_VOICE, UserType.CO_PILOT],
    availablePaymentTiers: [UserType.QUARTERLY_SUBSCRIBER, UserType.ANNUAL_SUBSCRIBER, UserType.ENTERPRISE_LICENSE],
    availableSolutions: [CoreSolution.DREAM_COMMANDER, CoreSolution.LENZ_ANALYST, CoreSolution.BID_SUITE, 
                         CoreSolution.MEMORIA_ANTHOLOGY, CoreSolution.BRAND_DIAGNOSTIC],
    maxIntegrations: 10,
    securityLevel: 'maximum',
    blockchainEnabled: true
  },
  [UserType.CORPORATE_TEAM_MEMBER]: {
    baseCapabilities: ['Task Management', 'Content Development', 'Reporting'],
    eligibleSpecializedRoles: [UserType.PILOT],
    availablePaymentTiers: [UserType.MONTHLY_SUBSCRIBER, UserType.QUARTERLY_SUBSCRIBER],
    availableSolutions: [CoreSolution.WISH_GRANTER, CoreSolution.CUSTOMER_DELIGHT],
    maxIntegrations: 3,
    securityLevel: 'enhanced',
    blockchainEnabled: true
  },
  [UserType.ACADEMIC_STUDENT]: {
    baseCapabilities: ['Learning Path', 'Content Access', 'Project Collaboration'],
    eligibleSpecializedRoles: [],
    availablePaymentTiers: [UserType.MONTHLY_SUBSCRIBER, UserType.QUARTERLY_SUBSCRIBER],
    availableSolutions: [CoreSolution.LENZ_ANALYST, CoreSolution.WISH_GRANTER],
    maxIntegrations: 2,
    securityLevel: 'basic',
    blockchainEnabled: false
  }
  // Additional user type metadata entries would follow the same pattern
};

/**
 * Blockchain verification schema for user authentication
 */
export interface BlockchainUserVerification {
  userAddress: string;
  userCodeHash: string;
  timestamp: number;
  transactionId: string;
  verificationStatus: boolean;
  verificationProof: string;
}

/**
 * Parses a user type code into its component parts
 * @param code The full user type code (e.g., "C-L-E-8765-45921-VV-Q")
 */
export function parseUserTypeCode(code: string): {
  track: string;
  position: string;
  level: string;
  entityId?: string;
  userId?: string;
  specializedRoles?: string[];
  paymentTier?: string;
} {
  const parts = code.split('-');
  
  return {
    track: parts[0],
    position: parts[1],
    level: parts[2],
    entityId: parts.length > 3 ? parts[3] : undefined,
    userId: parts.length > 4 ? parts[4] : undefined,
    specializedRoles: parts.length > 5 ? [parts[5]] : [],
    paymentTier: parts.length > 6 ? parts[6] : undefined
  };
}

/**
 * Generates a complete user type code from components
 * @param baseType The base user type (e.g., UserType.CORPORATE_ENTERPRISE_LEADER)
 * @param options Additional options to include in the code
 */
export function generateUserTypeCode(
  baseType: UserType,
  options: {
    entityId?: string;
    userId?: string;
    specializedRoles?: UserType[];
    paymentTier?: UserType;
  }
): string {
  const baseParts = baseType.split('-');
  let code = `${baseParts[0]}-${baseParts[1]}-${baseParts[2]}`;
  
  if (options.entityId) {
    code += `-${options.entityId}`;
  }
  
  if (options.userId) {
    code += `-${options.userId}`;
  }
  
  if (options.specializedRoles && options.specializedRoles.length > 0) {
    code += `-${options.specializedRoles[0]}`;
  }
  
  if (options.paymentTier) {
    code += `-${options.paymentTier}`;
  }
  
  return code;
}

/**
 * Adds a user to Firestore with blockchain verification
 * @param userData The user data to add
 */
export async function addUserWithBlockchainVerification(userData: Omit<AIXTIVUser, 'id' | 'createdAt' | 'updatedAt' | 'verificationStatus'>): Promise<string> {
  // Implementation would interact with Firebase/Firestore and blockchain
  // This is a placeholder for the actual implementation
  
  // Generate blockchain verification
  const blockchainVerification = await generateBlockchainVerification(userData);
  
  // Store user in Firestore
  // const userRef = await addDoc(collection(firestore, 'users'), {
  //   ...userData,
  //   createdAt: serverTimestamp(),
  //   updatedAt: serverTimestamp(),
  //   verificationStatus: 'pending',
  //   blockchainAddress: blockchainVerification.userAddress
  // });
  
  // Return the user ID
  return 'user-id-placeholder';
}

/**
 * Generates blockchain verification for a user
 * @param userData The user data to verify
 */
async function generateBlockchainVerification(userData: any): Promise<BlockchainUserVerification> {
  // Implementation would interact with blockchain
  // This is a placeholder for the actual implementation
  
  return {
    userAddress: '0x' + Math.random().toString(16).substring(2, 42),
    userCodeHash: 'hash-placeholder',
    timestamp: Date.now(),
    transactionId: 'tx-placeholder',
    verificationStatus: false,
    verificationProof: 'proof-placeholder'
  };
}

/**
 * Exports all user type system components
 */
export default {
  UserType,
  CoreSolution,
  PilotType,
  IntegrationType,
  SecurityOption,
  UserTypeMetadata,
  parseUserTypeCode,
  generateUserTypeCode,
  addUserWithBlockchainVerification
};
