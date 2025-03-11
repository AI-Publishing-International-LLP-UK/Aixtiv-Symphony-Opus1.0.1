/**
 * AIXTIV SYMPHONY™ Core Services
 * © 2025 AI Publishing International LLP
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * This is proprietary software of AI Publishing International LLP.
 * All rights reserved. No part of this software may be reproduced,
 * modified, or distributed without prior written permission.
 */

import * as firebase from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  Timestamp,
  serverTimestamp,
  DocumentReference,
  DocumentData,
  WriteBatch,
  writeBatch,
  increment
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import * as PineconeClient from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';
import * as CryptoJS from 'crypto-js';
import { ethers } from 'ethers';

// Initialize Firebase (would use actual config in production)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase if not already initialized
let firebaseApp: firebase.FirebaseApp;
try {
  firebaseApp = firebase.getApp();
} catch {
  firebaseApp = firebase.initializeApp(firebaseConfig);
}

// Initialize services
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const storage = getStorage(firebaseApp);
const functions = getFunctions(firebaseApp);

// Initialize Pinecone
const pinecone = new PineconeClient.PineconeClient({
  apiKey: process.env.PINECONE_API_KEY || '',
  environment: process.env.PINECONE_ENVIRONMENT || ''
});

// Initialize Blockchain Provider (Ethereum example)
const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
const aixtivWallet = new ethers.Wallet(process.env.AIXTIV_PRIVATE_KEY || '', provider);

// Core types and interfaces
import { UserType, CoreSolution, PilotType, IntegrationType, SecurityOption } from './types';

export enum PerformanceProfile {
  STANDARD = 'standard',
  HIGH_PERFORMANCE = 'high-performance',
  ULTRA_PERFORMANCE = 'ultra-performance'
}

export enum SecurityTier {
  BASIC = 1,
  ENTERPRISE = 2,
  OWNER_SUBSCRIBER = 3,
  ADVANCED = 4
}

export enum GatewayType {
  OWNER = 'owner',
  ENTERPRISE = 'enterprise',
  OWNER_SUBSCRIBER = 'owner-subscriber'
}

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

export interface Organization {
  id: string;
  name: string;
  trackType: string;
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

export interface Agent {
  id: string;
  agentTypeId: string;
  ownerType: 'user' | 'organization' | 'team';
  ownerId: string;
  name: string;
  nickname?: string;
  status: 'active' | 'inactive';
  performanceProfile: PerformanceProfile;
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
  vectorStoreId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface IntegrationGateway {
  id: string;
  gatewayType: GatewayType;
  name: string;
  description?: string;
  ownerType: 'user' | 'organization' | 'team';
  ownerId: string;
  securityTier: SecurityTier;
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

// User Service
export class UserService {
  /**
   * Create a new user with Firebase Auth and Firestore
   */
  static async createUser(
    email: string,
    password: string,
    userData: Partial<Omit<AIXTIVUser, 'id' | 'createdAt' | 'updatedAt' | 'verificationStatus'>>
  ): Promise<AIXTIVUser> {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Update display name if provided
      if (userData.displayName) {
        await updateProfile(firebaseUser, {
          displayName: userData.displayName,
          photoURL: userData.photoURL
        });
      }
      
      // Generate blockchain verification
      const blockchainAddress = userData.blockchainAddress || await this.generateBlockchainAddress();
      
      // Create user document in Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const now = serverTimestamp() as Timestamp;
      
      const userDoc: AIXTIVUser = {
        id: firebaseUser.uid,
        userCode: userData.userCode || '',
        track: userData.track || UserType.INDIVIDUAL,
        position: userData.position || UserType.MEMBER,
        level: userData.level || UserType.LEVEL_INDIVIDUAL,
        entityId: userData.entityId || '',
        specializedRoles: userData.specializedRoles || [],
        paymentTerm: userData.paymentTerm || UserType.MONTHLY_SUBSCRIBER,
        solutions: userData.solutions || [],
        integrations: userData.integrations || [],
        securityOptions: userData.securityOptions || [],
        email: email,
        displayName: userData.displayName || email.split('@')[0],
        photoURL: userData.photoURL,
        createdAt: now,
        updatedAt: now,
        blockchainAddress,
        verificationStatus: 'pending',
        userMetadata: userData.userMetadata || {}
      };
      
      await setDoc(userDocRef, userDoc);
      
      // Create blockchain verification record
      await this.createBlockchainVerification('user', firebaseUser.uid, blockchainAddress);
      
      // If user is part of an organization, add them to the organization
      if (userData.entityId && (userData.track === UserType.CORPORATE || userData.track === UserType.ORGANIZATIONAL)) {
        const memberDoc = {
          userId: firebaseUser.uid,
          organizationId: userData.entityId,
          role: userData.position === UserType.LEADER ? 'admin' : 'member',
          permissions: [],
          joinedAt: now,
          status: 'active',
          metadata: {}
        };
        
        await setDoc(
          doc(db, 'organizations', userData.entityId, 'members', firebaseUser.uid),
          memberDoc
        );
      }
      
      // Send email verification
      await sendEmailVerification(firebaseUser);
      
      return {
        ...userDoc,
        // Replace server timestamp with actual Timestamp
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<AIXTIVUser | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', id));
      
      if (!userDoc.exists()) {
        return null;
      }
      
      return userDoc.data() as AIXTIVUser;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }
  
  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<AIXTIVUser | null> {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email)
      );
      
      const querySnapshot = await getDocs(usersQuery);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      return querySnapshot.docs[0].data() as AIXTIVUser;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }
  
  /**
   * Update user profile
   */
  static async updateUser(id: string, data: Partial<AIXTIVUser>): Promise<AIXTIVUser | null> {
    try {
      const userDocRef = doc(db, 'users', id);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        return null;
      }
      
      const updateData: Partial<AIXTIVUser> = {
        ...data,
        updatedAt: serverTimestamp() as Timestamp
      };
      
      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.email; // Email should be updated through Firebase Auth
      
      await updateDoc(userDocRef, updateData);
      
      // If display name is updated, also update it in Firebase Auth
      if (data.displayName) {
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === id) {
          await updateProfile(currentUser, {
            displayName: data.displayName,
            photoURL: data.photoURL
          });
        }
      }
      
      // If specialized roles or track are updated, check for gateway creation
      if (data.specializedRoles || data.track || data.position) {
        await this.ensureUserGateways(id);
      }
      
      // Fetch and return the updated user
      const updatedUserDoc = await getDoc(userDocRef);
      return updatedUserDoc.data() as AIXTIVUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
  
  /**
   * Change user type (track, position, level)
   */
  static async changeUserType(
    userId: string,
    track?: UserType,
    position?: UserType,
    level?: UserType
  ): Promise<AIXTIVUser | null> {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        return null;
      }
      
      const updateData: Partial<AIXTIVUser> = {
        updatedAt: serverTimestamp() as Timestamp
      };
      
      if (track) updateData.track = track;
      if (position) updateData.position = position;
      if (level) updateData.level = level;
      
      // Update the user code if any component changes
      if (track || position || level) {
        const userData = userDoc.data() as AIXTIVUser;
        updateData.userCode = this.generateUserCode(
          track || userData.track,
          position || userData.position,
          level || userData.level,
          userData.entityId,
          userData.id,
          userData.specializedRoles,
          userData.paymentTerm
        );
        
        // Log the type change
        await this.logUserTypeChange(
          userId,
          userData.track,
          userData.position,
          userData.level,
          track || userData.track,
          position || userData.position,
          level || userData.level
        );
      }
      
      await updateDoc(userDocRef, updateData);
      
      // Fetch and return the updated user
      const updatedUserDoc = await getDoc(userDocRef);
      return updatedUserDoc.data() as AIXTIVUser;
    } catch (error) {
      console.error('Error changing user type:', error);
      throw error;
    }
  }
  
  /**
   * Add a specialized role to a user
   */
  static async addSpecializedRole(userId: string, role: UserType): Promise<AIXTIVUser | null> {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        return null;
      }
      
      const userData = userDoc.data() as AIXTIVUser;
      
      // Check if user already has this role
      if (userData.specializedRoles.includes(role)) {
        return userData;
      }
      
      // Add the role
      const updatedRoles = [...userData.specializedRoles, role];
      
      // Update user document
      await updateDoc(userDocRef, {
        specializedRoles: updatedRoles,
        updatedAt: serverTimestamp()
      });
      
      // If adding a Visionary Voice role, ensure appropriate gateways exist
      if (role === UserType.VISIONARY_VOICE) {
        await this.ensureUserGateways(userId);
      }
      
      // Fetch and return the updated user
      const updatedUserDoc = await getDoc(userDocRef);
      return updatedUserDoc.data() as AIXTIVUser;
    } catch (error) {
      console.error('Error adding specialized role:', error);
      throw error;
    }
  }
  
  /**
   * Generate a blockchain address for a user
   */
  private static async generateBlockchainAddress(): Promise<string> {
    // In a real implementation, this would create a secure wallet
    // Here we're just generating a random Ethereum-like address
    const wallet = ethers.Wallet.createRandom();
    return wallet.address;
  }
  
  /**
   * Create blockchain verification for a record
   */
  private static async createBlockchainVerification(
    recordType: string,
    recordId: string,
    blockchainAddress: string
  ): Promise<string> {
    try {
      // Create a verification hash
      const verificationHash = CryptoJS.SHA256(
        `${recordType}:${recordId}:${blockchainAddress}:${Date.now()}`
      ).toString();
      
      // In a real implementation, this would submit a transaction to the blockchain
      // For now, we'll create a record in Firestore
      const blockchainRecord = {
        recordType,
        recordId,
        blockchainAddress,
        transactionId: `tx_${uuidv4().replace(/-/g, '').substring(0, 24)}`,
        timestamp: serverTimestamp(),
        verificationHash,
        verificationStatus: true,
        blockchainNetwork: 'ethereum',
        metadata: {}
      };
      
      const recordRef = await addDoc(collection(db, 'blockchainRecords'), blockchainRecord);
      
      return recordRef.id;
    } catch (error) {
      console.error('Error creating blockchain verification:', error);
      throw error;
    }
  }
  
  /**
   * Log a user type change
   */
  private static async logUserTypeChange(
    userId: string,
    oldTrack: UserType,
    oldPosition: UserType,
    oldLevel: UserType,
    newTrack: UserType,
    newPosition: UserType,
    newLevel: UserType
  ): Promise<void> {
    try {
      const logEntry = {
        actorType: 'system',
        actorId: 'typeChange',
        action: 'USER_TYPE_CHANGED',
        resourceType: 'user',
        resourceId: userId,
        status: 'success',
        details: {
          old: {
            track: oldTrack,
            position: oldPosition,
            level: oldLevel
          },
          new: {
            track: newTrack,
            position: newPosition,
            level: newLevel
          }
        },
        performedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'activityLogs'), logEntry);
    } catch (error) {
      console.error('Error logging user type change:', error);
    }
  }
  
  /**
   * Generate a user code from components
   */
  private static generateUserCode(
    track: UserType,
    position: UserType,
    level: UserType,
    entityId: string,
    userId: string,
    specializedRoles: UserType[],
    paymentTerm: UserType
  ): string {
    let code = `${track}-${position}-${level}`;
    
    if (entityId) {
      code += `-${entityId}`;
    }
    
    if (userId) {
      code += `-${userId}`;
    }
    
    if (specializedRoles && specializedRoles.length > 0) {
      code += `-${specializedRoles[0]}`;
    }
    
    if (paymentTerm) {
      code += `-${paymentTerm}`;
    }
    
    return code;
  }
  
  /**
   * Ensure a user has all required integration gateways
   */
  private static async ensureUserGateways(userId: string): Promise<void> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return;
      }
      
      const userData = userDoc.data() as AIXTIVUser;
      
      // Check if user needs the Owner gateway
      const needsOwnerGateway = userData.specializedRoles.includes(UserType.VISIONARY_VOICE) ||
                                userData.position === UserType.LEADER;
      
      // Check if user needs the Owner-Subscriber gateway
      const needsSubscriberGateway = userData.specializedRoles.includes(UserType.VISIONARY_VOICE) ||
                                     userData.specializedRoles.includes(UserType.CO_PILOT);
      
      if (needsOwnerGateway) {
        // Check if user already has an Owner gateway
        const gatewaysQuery = query(
          collection(db, 'integrationGateways'),
          where('ownerType', '==', 'user'),
          where('ownerId', '==', userId),
          where('gatewayType', '==', GatewayType.OWNER)
        );
        
        const querySnapshot = await getDocs(gatewaysQuery);
        
        if (querySnapshot.empty) {
          // Create Owner gateway
          await IntegrationGatewayService.createGateway({
            gatewayType: GatewayType.OWNER,
            name: `${userData.displayName} Personal Gateway`,
            description: `Personal integration gateway for ${userData.displayName}`,
            ownerType: 'user',
            ownerId: userId,
            securityTier: SecurityTier.BASIC,
            status: 'active',
            authenticationSettings: {
              apiKeyRequired: true,
              jwtRequired: false,
              allowedOrigins: [],
              blockchainVerificationRequired: false
            },
            rateLimitSettings: {
              requestsPerMinute: 60,
              requestsPerHour: 1000,
              requestsPerDay: 10000
            }
          });
        }
      }
      
      if (needsSubscriberGateway) {
        // Check if user already has an Owner-Subscriber gateway
        const gatewaysQuery = query(
          collection(db, 'integrationGateways'),
          where('ownerType', '==', 'user'),
          where('ownerId', '==', userId),
          where('gatewayType', '==', GatewayType.OWNER_SUBSCRIBER)
        );
        
        const querySnapshot = await getDocs(gatewaysQuery);
        
        if (querySnapshot.empty) {
          // Create Owner-Subscriber gateway
          await IntegrationGatewayService.createGateway({
            gatewayType: GatewayType.OWNER_SUBSCRIBER,
            name: `${userData.displayName} Subscriber Gateway`,
            description: `Subscriber integration gateway for ${userData.displayName}`,
            ownerType: 'user',
            ownerId: userId,
            securityTier: SecurityTier.OWNER_SUBSCRIBER,
            status: 'active',
            authenticationSettings: {
              apiKeyRequired: true,
              jwtRequired: true,
              allowedOrigins: [],
              blockchainVerificationRequired: true
            },
            rateLimitSettings: {
              requestsPerMinute: 120,
              requestsPerHour: 2000,
              requestsPerDay: 20000
            }
          });
        }
      }
    } catch (error) {
      console.error('Error ensuring user gateways:', error);
    }
  }
}

// Authentication Service
export class AuthService {
  /**
   * Sign in a user with email and password
   */
  static async signInWithEmail(
    email: string,
    password: string
  ): Promise<{ user: FirebaseUser; aixtivUser: AIXTIVUser }> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Get the AIXTIV user profile
      const aixtivUser = await UserService.getUserById(firebaseUser.uid);
      
      if (!aixtivUser) {
        throw new Error('User profile not found');
      }
      
      // Update last login timestamp
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        lastLogin: serverTimestamp()
      });
      
      // Log activity
      await this.logUserActivity(
        firebaseUser.uid,
        'USER_SIGN_IN',
        'success'
      );
      
      return { user: firebaseUser, aixtivUser };
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }
  
  /**
   * Sign out the current user
   */
  static async signOut(): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // Log activity before signing out
        await this.logUserActivity(
          currentUser.uid,
          'USER_SIGN_OUT',
          'success'
        );
      }
      
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }
  
  /**
   * Reset password for a user
   */
  static async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }
  
  /**
   * Get the current authenticated user
   */
  static async getCurrentUser(): Promise<{ user: FirebaseUser; aixtivUser: AIXTIVUser } | null> {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        async (user) => {
          unsubscribe();
          
          if (!user) {
            resolve(null);
            return;
          }
          
          try {
            const aixtivUser = await UserService.getUserById(user.uid);
            
            if (!aixtivUser) {
              resolve(null);
              return;
            }
            
            resolve({ user, aixtivUser });
          } catch (error) {
            reject(error);
          }
        },
        reject
      );
    });
  }
  
  /**
   * Generate a JWT token for a user
   */
  static async generateToken(userId: string): Promise<string> {
    try {
      // Use Firebase Functions to generate token
      const generateTokenFn = httpsCallable(functions, 'generateUserToken');
      const result = await generateTokenFn({ userId });
      return (result.data as { token: string }).token;
    } catch (error) {
      console.error('Error generating token:', error);
      throw error;
    }
  }
  
  /**
   * Verify a JWT token
   */
  static async verifyToken(token: string): Promise<any> {
    try {
      // Use Firebase Functions to verify token
      const verifyTokenFn = httpsCallable(functions, 'verifyUserToken');
      const result = await verifyTokenFn({ token });
      return result.data;
    } catch (error) {
      console.error('Error verifying token:', error);
      throw error;
    }
  }
  
  /**
   * Log user authentication activity
   */
  private static async logUserActivity(
    userId: string,
    action: string,
    status: 'success' | 'failure'
  ): Promise<void> {
    try {
      const logEntry = {
        actorType: 'user',
        actorId: userId,
        action,
        resourceType: 'auth',
        resourceId: userId,
        status,
        performedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'activityLogs'), logEntry);
    } catch (error) {
      console.error('Error logging user activity:', error);
    }
  }
}

// Organization Service
export class OrganizationService {
  /**
   * Create a new organization
   */
  static async createOrganization(data: Partial<Organization>): Promise<Organization> {
    try {
      // Generate a unique ID if not provided
      const orgId = data.id || uuidv4();
      
      // Set required fields
      const now = serverTimestamp() as Timestamp;
      
      const orgData: Organization = {
        id: orgId,
        name: data.name || 'New Organization',
        trackType: data.trackType || UserType.CORPORATE,
        description: data.description,
        website: data.website,
        logoURL: data.logoURL,
        industry: data.industry,
        size: data.size,
        address: data.address || {},
        contact: data.contact || {},
        status: data.status || 'active',
        settings: data.settings || {},
        createdAt: now,
        updatedAt: now
      };
      
      // Generate blockchain verification if needed
      if (data.blockchainVerification?.address) {
        orgData.blockchainVerification = data.blockchainVerification;
      } else if (data.trackType === UserType.CORPORATE || data.trackType === UserType.ORGANIZATIONAL) {
        // Generate blockchain address for corporate or organizational entities
        const blockchainAddress = await this.generateBlockchainAddress();
        orgData.blockchainVerification = {
          address: blockchainAddress,
          verificationStatus: false
        };
        
        // Create blockchain verification record
        const txId = await UserService['createBlockchainVerification'](
          'organization',
          orgId,
          blockchainAddress
        );
        
        orgData.blockchainVerification.transactionId = txId;
        orgData.blockchainVerification.verificationStatus = true;
      }
      
      // Create the organization document
      const orgDocRef = doc(db, 'organizations', orgId);
      await setDoc(orgDocRef, orgData);
      
      // Create appropriate gateways for the organization
      if (data.trackType === UserType.CORPORATE || data.trackType === UserType.ORGANIZATIONAL) {
        await this.createOrganizationGateways(orgId, data.name || 'New Organization');
      }
      
      return {
        ...orgData,
        // Replace server timestamp with actual Timestamp
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }
  
  /**
   * Get organization by ID
   */
  static async getOrganizationById(id: string): Promise<Organization | null> {
    try {
      const orgDoc = await getDoc(doc(db, 'organizations', id));
      
      if (!orgDoc.exists()) {
        return null;
      }
      
      return orgDoc.data() as Organization;
    } catch (error) {
      console.error('Error getting organization:', error);
      throw error;
    }
  }
  
  /**
   * Add a member to an organization
   */
  static async addMemberToOrganization(
    organizationId: string,
    userId: string,
    role: string = 'member'
  ): Promise<boolean> {
    try {
      // Check if organization exists
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId));
      if (!orgDoc.exists()) {
        throw new Error('Organization not found');
      }
      
      // Check if user exists
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      // Check if user is already a member
      const memberDocRef = doc(db, 'organizations', organizationId, 'members', userId);
      const memberDoc = await getDoc(memberDocRef);
      
      if (memberDoc.exists()) {
        // If already a member, update role if needed
        if (memberDoc.data()?.role !== role) {
          await updateDoc(memberDocRef, {
            role,
            updatedAt: serverTimestamp()
          });
        }
        return true;
      }
      
      // Add member document
      await setDoc(memberDocRef, {
        userId,
        organizationId,
        role,
        permissions: role === 'admin' ? ['manage_members', 'manage_teams', 'manage_settings'] : [],
        joinedAt: serverTimestamp(),
        status: 'active',
        metadata: {}
      });
      
      // Update user's entity ID if not already set
      const userData = userDoc.data();
      if (!userData?.entityId) {
        await updateDoc(doc(db, 'users', userId), {
          entityId: organizationId,
          updatedAt: serverTimestamp()
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error adding member to organization:', error);
      throw error;
    }
  }
  
  /**
   * Get all members of an organization
   */
  static async getOrganizationMembers(organizationId: string): Promise<any[]> {
    try {
      const membersSnapshot = await getDocs(
        collection(db, 'organizations', organizationId, 'members')
      );
      
      const members = [];
      
      for (const memberDoc of membersSnapshot.docs) {
        const memberData = memberDoc.data();
        
        // Get basic user information
        const userDoc = await getDoc(doc(db, 'users', memberData.userId));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          members.push({
            id: memberData.userId,
            organizationId,
            role: memberData.role,
            permissions: memberData.permissions,
            joinedAt: memberData.joinedAt,
            status: memberData.status,
            username: userData.username || userData.displayName,
            email: userData.email,
            firstName: userData.firstName || userData.displayName.split(' ')[0],
            lastName: userData.lastName || userData.displayName.split(' ').slice(1).join(' '),
            photoURL: userData.photoURL
          });
        }
      }
      
      return members;
    } catch (error) {
      console.error('Error getting organization members:', error);
      throw error;
    }
  }
  
  /**
   * Create organization teams
   */
  static async createTeam(
    organizationId: string,
    name: string,
    description?: string,
    leaderId?: string
  ): Promise<any> {
    try {
      // Check if organization exists
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId));
      if (!orgDoc.exists()) {
        throw new Error('Organization not found');
      }
      
      // Create team document
      const teamData = {
        id: uuidv4(),
        organizationId,
        name,
        description: description || '',
        leaderId,
        status: 'active',
        settings: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'teams', teamData.id), teamData);
      
      // If leader is provided, add them to the team
      if (leaderId) {
        await setDoc(doc(db, 'teams', teamData.id, 'members', leaderId), {
          userId: leaderId,
          teamId: teamData.id,
          role: 'leader',
          joinedAt: serverTimestamp(),
          status: 'active'
        });
      }
      
      return {
        ...teamData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }
  
  /**
   * Generate a blockchain address for an organization
   */
  private static async generateBlockchainAddress(): Promise<string> {
    // In a real implementation, this would create a secure wallet
    // Here we're just generating a random Ethereum-like address
    const wallet = ethers.Wallet.createRandom();
    return wallet.address;
  }
  
  /**
   * Create appropriate gateways for an organization
   */
  private static async createOrganizationGateways(
    organizationId: string,
    organizationName: string
  ): Promise<void> {
    try {
      // Create Enterprise gateway
      await IntegrationGatewayService.createGateway({
        gatewayType: GatewayType.ENTERPRISE,
        name: `${organizationName} Enterprise Gateway`,
        description: `Enterprise integration gateway for ${organizationName}`,
        ownerType: 'organization',
        ownerId: organizationId,
        securityTier: SecurityTier.ENTERPRISE,
        status: 'active',
        authenticationSettings: {
          apiKeyRequired: true,
          jwtRequired: true,
          allowedOrigins: [],
          blockchainVerificationRequired: false
        },
        rateLimitSettings: {
          requestsPerMinute: 300,
          requestsPerHour: 5000,
          requestsPerDay: 50000
        }
      });
      
      // Create Owner-Subscriber gateway
      await IntegrationGatewayService.createGateway({
        gatewayType: GatewayType.OWNER_SUBSCRIBER,
        name: `${organizationName} Subscriber Gateway`,
        description: `Subscriber integration gateway for ${organizationName}`,
        ownerType: 'organization',
        ownerId: organizationId,
        securityTier: SecurityTier.OWNER_SUBSCRIBER,
        status: 'active',
        authenticationSettings: {
          apiKeyRequired: true,
          jwtRequired: true,
          allowedOrigins: [],
          blockchainVerificationRequired: true
        },
        rateLimitSettings: {
          requestsPerMinute: 240,
          requestsPerHour: 4000,
          requestsPerDay: 40000
        }
      });
    } catch (error) {
      console.error('Error creating organization gateways:', error);
    }
  }
}

// Agent Service
export class AgentService {
  /**
   * Create a new agent instance
   */
  static async createAgentInstance(data: Partial<Agent>): Promise<Agent> {
    try {
      // Generate a unique ID if not provided
      const agentId = data.id || uuidv4();
      
      // Set required fields
      const now = serverTimestamp() as Timestamp;
      
      const agentData: Agent = {
        id: agentId,
        agentTypeId: data.agentTypeId || PilotType.DR_LUCY_R1_CORE_01,
        ownerType: data.ownerType || 'user',
        ownerId: data.ownerId || '',
        name: data.name || 'New Agent',
        nickname: data.nickname,
        status: data.status || 'active',
        performanceProfile: data.performanceProfile || PerformanceProfile.STANDARD,
        appearanceSettings: data.appearanceSettings || {},
        communicationSettings: data.communicationSettings || {},
        culturalAdaptationSettings: data.culturalAdaptationSettings || {},
        metadata: data.metadata || {},
        createdAt: now,
        updatedAt: now
      };
      
      // Create vector store for agent if needed
      if (data.performanceProfile === PerformanceProfile.HIGH_PERFORMANCE || 
          data.performanceProfile === PerformanceProfile.ULTRA_PERFORMANCE) {
        const vectorStoreId = await this.createAgentVectorStore(agentId, data.name || 'New Agent');
        agentData.vectorStoreId = vectorStoreId;
      }
      
      // Create the agent document
      const agentDocRef = doc(db, 'agents', agentId);
      await setDoc(agentDocRef, agentData);
      
      // If this is a Visionary agent, create an NFT
      if (data.agentTypeId === PilotType.DR_ROARK_PILOT) {
        await this.createAgentNFT(agentId, data.name || 'New Agent', data.ownerType || 'user', data.ownerId || '');
      }
      
      return {
        ...agentData,
        // Replace server timestamp with actual Timestamp
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }
  
  /**
   * Get agent by ID
   */
  static async getAgentById(id: string): Promise<Agent | null> {
    try {
      const agentDoc = await getDoc(doc(db, 'agents', id));
      
      if (!agentDoc.exists()) {
        return null;
      }
      
      return agentDoc.data() as Agent;
    } catch (error) {
      console.error('Error getting agent:', error);
      throw error;
    }
  }
  
  /**
   * Get agents by owner
   */
  static async getAgentsByOwner(ownerType: string, ownerId: string): Promise<Agent[]> {
    try {
      const agentsQuery = query(
        collection(db, 'agents'),
        where('ownerType', '==', ownerType),
        where('ownerId', '==', ownerId)
      );
      
      const querySnapshot = await getDocs(agentsQuery);
      
      return querySnapshot.docs.map(doc => doc.data() as Agent);
    } catch (error) {
      console.error('Error getting agents by owner:', error);
      throw error;
    }
  }
  
  /**
   * Update an agent instance
   */
  static async updateAgentInstance(id: string, data: Partial<Agent>): Promise<Agent | null> {
    try {
      const agentDocRef = doc(db, 'agents', id);
      const agentDoc = await getDoc(agentDocRef);
      
      if (!agentDoc.exists()) {
        return null;
      }
      
      const updateData: Partial<Agent> = {
        ...data,
        updatedAt: serverTimestamp() as Timestamp
      };
      
      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.ownerType;
      delete updateData.ownerId;
      
      await updateDoc(agentDocRef, updateData);
      
      // Fetch and return the updated agent
      const updatedAgentDoc = await getDoc(agentDocRef);
      return updatedAgentDoc.data() as Agent;
    } catch (error) {
      console.error('Error updating agent:', error);
      throw error;
    }
  }
  
  /**
   * Grant access to an agent
   */
  static async grantAgentAccess(
    agentId: string,
    accessType: string,
    accessId: string,
    permissionLevel: string,
    grantedBy: string
  ): Promise<boolean> {
    try {
      // Check if agent exists
      const agentDoc = await getDoc(doc(db, 'agents', agentId));
      if (!agentDoc.exists()) {
        throw new Error('Agent not found');
      }
      
      // Create access document
      const accessData = {
        agentId,
        accessType,
        accessId,
        permissionLevel,
        grantedAt: serverTimestamp(),
        grantedBy,
        status: 'active'
      };
      
      const accessDocId = `${accessType}_${accessId}`;
      await setDoc(doc(db, 'agents', agentId, 'access', accessDocId), accessData);
      
      return true;
    } catch (error) {
      console.error('Error granting agent access:', error);
      throw error;
    }
  }
  
  /**
   * Create a vector store for an agent
   */
  private static async createAgentVectorStore(agentId: string, agentName: string): Promise<string> {
    try {
      // Check if Pinecone is initialized
      await pinecone.init();
      
      // Create a unique namespace for this agent
      const namespace = `agent_${agentId.replace(/-/g, '_')}`;
      
      // Check if index exists, create if needed
      const indexName = 'aixtiv_symphony';
      const indexes = await pinecone.listIndexes();
      
      if (!indexes.includes(indexName)) {
        // Create the index
        await pinecone.createIndex({
          name: indexName,
          dimension: 1536, // For compatibility with common embedding models
          metric: 'cosine'
        });
      }
      
      // Create vector store record in Firestore
      const vectorStoreData = {
        id: uuidv4(),
        name: `${agentName} Vector Store`,
        ownerType: 'agent',
        ownerId: agentId,
        indexName,
        namespace,
        dimensions: 1536,
        status: 'active',
        metadata: {
          agentId
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const vectorStoreRef = doc(db, 'vectorStores', vectorStoreData.id);
      await setDoc(vectorStoreRef, vectorStoreData);
      
      return vectorStoreData.id;
    } catch (error) {
      console.error('Error creating agent vector store:', error);
      throw error;
    }
  }
  
  /**
   * Create an NFT for a Visionary agent
   */
  private static async createAgentNFT(
    agentId: string,
    agentName: string,
    ownerType: string,
    ownerId: string
  ): Promise<string> {
    try {
      // In a real implementation, this would interact with blockchain to mint an NFT
      // For now, we'll create an NFT record in Firestore
      
      // Get owner's blockchain address
      let ownerAddress = '';
      
      if (ownerType === 'user') {
        const userDoc = await getDoc(doc(db, 'users', ownerId));
        if (userDoc.exists()) {
          ownerAddress = userDoc.data().blockchainAddress || '';
        }
      } else if (ownerType === 'organization') {
        const orgDoc = await getDoc(doc(db, 'organizations', ownerId));
        if (orgDoc.exists() && orgDoc.data().blockchainVerification) {
          ownerAddress = orgDoc.data().blockchainVerification.address || '';
        }
      }
      
      if (!ownerAddress) {
        throw new Error('Owner has no blockchain address');
      }
      
      // Create NFT token record
      const tokenId = `${Date.now().toString(16)}_${agentId.substring(0, 8)}`;
      const nftData = {
        id: uuidv4(),
        tokenId,
        tokenType: 'agent',
        linkedRecordId: agentId,
        ownerAddress,
        contractAddress: process.env.NFT_CONTRACT_ADDRESS || '0x0',
        blockchainNetwork: 'ethereum',
        metadata: {
          name: `AIXTIV Agent: ${agentName}`,
          description: `This NFT represents ownership of the ${agentName} agent in the AIXTIV SYMPHONY ecosystem.`,
          image: `https://aixtiv.io/nft/agent/${agentId}.png`,
          attributes: [
            {
              trait_type: 'Agent Type',
              value: 'Visionary'
            },
            {
              trait_type: 'Performance Profile',
              value: 'Ultra'
            },
            {
              trait_type: 'Creation Date',
              value: new Date().toISOString().split('T')[0]
            }
          ]
        },
        mintedAt: serverTimestamp(),
        transferHistory: [
          {
            fromAddress: '0x0000000000000000000000000000000000000000',
            toAddress: ownerAddress,
            transactionId: `tx_${uuidv4().replace(/-/g, '').substring(0, 24)}`,
            timestamp: serverTimestamp()
          }
        ]
      };
      
      await setDoc(doc(db, 'nftTokens', nftData.id), nftData);
      
      // Update agent with NFT reference
      await updateDoc(doc(db, 'agents', agentId), {
        'metadata.nftTokenId': tokenId,
        updatedAt: serverTimestamp()
      });
      
      return nftData.id;
    } catch (error) {
      console.error('Error creating agent NFT:', error);
      throw error;
    }
  }
}

// Integration Gateway Service
export class IntegrationGatewayService {
  /**
   * Create a new integration gateway
   */
  static async createGateway(data: Partial<IntegrationGateway>): Promise<IntegrationGateway> {
    try {
      // Generate a unique ID if not provided
      const gatewayId = data.id || uuidv4();
      
      // Generate a secure encryption key ID if not provided
      const encryptionKeyId = data.encryptionKeyId || uuidv4();
      
      // Set required fields
      const now = serverTimestamp() as Timestamp;
      
      const gatewayData: IntegrationGateway = {
        id: gatewayId,
        gatewayType: data.gatewayType || GatewayType.OWNER,
        name: data.name || 'New Gateway',
        description: data.description,
        ownerType: data.ownerType || 'user',
        ownerId: data.ownerId || '',
        securityTier: data.securityTier || SecurityTier.BASIC,
        status: data.status || 'active',
        encryptionKeyId,
        authenticationSettings: data.authenticationSettings || {
          apiKeyRequired: true,
          jwtRequired: false,
          allowedOrigins: [],
          blockchainVerificationRequired: false
        },
        rateLimitSettings: data.rateLimitSettings || {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          requestsPerDay: 10000
        },
        createdAt: now,
        updatedAt: now
      };
      
      // Create the gateway document
      const gatewayDocRef = doc(db, 'integrationGateways', gatewayId);
      await setDoc(gatewayDocRef, gatewayData);
      
      // Create default endpoints
      await this.createDefaultEndpoints(gatewayId, data.gatewayType || GatewayType.OWNER);
      
      return {
        ...gatewayData,
        // Replace server timestamp with actual Timestamp
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
    } catch (error) {
      console.error('Error creating gateway:', error);
      throw error;
    }
  }
  
  /**
   * Get gateway by ID
   */
  static async getGatewayById(id: string): Promise<IntegrationGateway | null> {
    try {
      const gatewayDoc = await getDoc(doc(db, 'integrationGateways', id));
      
      if (!gatewayDoc.exists()) {
        return null;
      }
      
      return gatewayDoc.data() as IntegrationGateway;
    } catch (error) {
      console.error('Error getting gateway:', error);
      throw error;
    }
  }
  
  /**
   * Get gateways by owner
   */
  static async getGatewaysByOwner(ownerType: string, ownerId: string): Promise<IntegrationGateway[]> {
    try {
      const gatewaysQuery = query(
        collection(db, 'integrationGateways'),
        where('ownerType', '==', ownerType),
        where('ownerId', '==', ownerId)
      );
      
      const querySnapshot = await getDocs(gatewaysQuery);
      
      return querySnapshot.docs.map(doc => doc.data() as IntegrationGateway);
    } catch (error) {
      console.error('Error getting gateways by owner:', error);
      throw error;
    }
  }
  
  /**
   * Create an endpoint for a gateway
   */
  static async createEndpoint(
    gatewayId: string,
    path: string,
    method: string,
    description: string,
    requiresAuth: boolean = true,
    permissions: string[] = [],
    inputSchema: any = null,
    outputSchema: any = null
  ): Promise<any> {
    try {
      // Check if gateway exists
      const gatewayDoc = await getDoc(doc(db, 'integrationGateways', gatewayId));
      if (!gatewayDoc.exists()) {
        throw new Error('Gateway not found');
      }
      
      // Check if endpoint already exists
      const endpointsQuery = query(
        collection(db, 'integrationGateways', gatewayId, 'endpoints'),
        where('endpointPath', '==', path),
        where('method', '==', method)
      );
      
      const querySnapshot = await getDocs(endpointsQuery);
      
      if (!querySnapshot.empty) {
        throw new Error('Endpoint already exists');
      }
      
      // Create endpoint document
      const endpointData = {
        id: uuidv4(),
        gatewayId,
        endpointPath: path,
        method,
        description: description || '',
        requiresAuthentication: requiresAuth,
        requiredPermissions: permissions,
        inputSchema,
        outputSchema,
        status: 'active',
        functionName: this.generateFunctionName(gatewayId, path, method),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(
        doc(db, 'integrationGateways', gatewayId, 'endpoints', endpointData.id),
        endpointData
      );
      
      return {
        ...endpointData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
    } catch (error) {
      console.error('Error creating endpoint:', error);
      throw error;
    }
  }
  
  /**
   * Generate an API key for a gateway
   */
  static async generateApiKey(
    gatewayId: string,
    keyName: string,
    issuedToType: string,
    issuedToId: string,
    issuedBy: string,
    permissions: string[] = [],
    expiresInDays: number = 365
  ): Promise<{ keyId: string; apiKey: string; prefix: string }> {
    try {
      // Check if gateway exists
      const gatewayDoc = await getDoc(doc(db, 'integrationGateways', gatewayId));
      if (!gatewayDoc.exists()) {
        throw new Error('Gateway not found');
      }
      
      // Generate a secure API key
      const rawApiKey = CryptoJS.lib.WordArray.random(32).toString();
      const prefix = rawApiKey.substring(0, 8);
      const apiKey = `axtv_${prefix}.${rawApiKey.substring(8)}`;
      
      // Hash the API key for storage
      const keyHash = CryptoJS.SHA256(apiKey).toString();
      
      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      
      // Store the API key (only the hash)
      const apiKeyData = {
        id: uuidv4(),
        gatewayId,
        keyName,
        keyPrefix: prefix,
        keyHash,
        issuedToType,
        issuedToId,
        issuedBy,
        permissions,
        status: 'active',
        issuedAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt)
      };
      
      await setDoc(doc(db, 'integrationApiKeys', apiKeyData.id), apiKeyData);
      
      return {
        keyId: apiKeyData.id,
        apiKey,
        prefix
      };
    } catch (error) {
      console.error('Error generating API key:', error);
      throw error;
    }
  }
  
  /**
   * Validate an API key
   */
  static async validateApiKey(prefix: string, apiKey: string): Promise<boolean> {
    try {
      // Query for the API key by prefix
      const apiKeysQuery = query(
        collection(db, 'integrationApiKeys'),
        where('keyPrefix', '==', prefix),
        where('status', '==', 'active')
      );
      
      const querySnapshot = await getDocs(apiKeysQuery);
      
      if (querySnapshot.empty) {
        return false;
      }
      
      // Get the stored hash
      const storedHash = querySnapshot.docs[0].data().keyHash;
      
      // Verify the hash
      const calculatedHash = CryptoJS.SHA256(apiKey).toString();
      
      // Check if key has expired
      const expiresAt = querySnapshot.docs[0].data().expiresAt as Timestamp;
      if (expiresAt && expiresAt.toDate() < new Date()) {
        return false;
      }
      
      // Update last used timestamp
      await updateDoc(doc(db, 'integrationApiKeys', querySnapshot.docs[0].id), {
        lastUsedAt: serverTimestamp()
      });
      
      return calculatedHash === storedHash;
    } catch (error) {
      console.error('Error validating API key:', error);
      return false;
    }
  }
  
  /**
   * Create default endpoints for a gateway
   */
  private static async createDefaultEndpoints(
    gatewayId: string,
    gatewayType: GatewayType
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Common endpoints for all gateway types
      const commonEndpoints = [
        {
          path: '/health',
          method: 'GET',
          description: 'Health check endpoint',
          requiresAuth: false,
          permissions: []
        },
        {
          path: '/info',
          method: 'GET',
          description: 'Gateway information',
          requiresAuth: false,
          permissions: []
        }
      ];
      
      // Add common endpoints
      for (const endpoint of commonEndpoints) {
        const endpointData = {
          id: uuidv4(),
          gatewayId,
          endpointPath: endpoint.path,
          method: endpoint.method,
          description: endpoint.description,
          requiresAuthentication: endpoint.requiresAuth,
          requiredPermissions: endpoint.permissions,
          inputSchema: null,
          outputSchema: null,
          status: 'active',
          functionName: this.generateFunctionName(gatewayId, endpoint.path, endpoint.method),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const endpointRef = doc(
          db,
          'integrationGateways',
          gatewayId,
          'endpoints',
          endpointData.id
        );
        
        batch.set(endpointRef, endpointData);
      }
      
      // Gateway-specific endpoints
      if (gatewayType === GatewayType.OWNER) {
        const ownerEndpoints = [
          {
            path: '/profile',
            method: 'GET',
            description: 'Get owner profile',
            requiresAuth: true,
            permissions: ['read_profile']
          },
          {
            path: '/agents',
            method: 'GET',
            description: 'Get owner agents',
            requiresAuth: true,
            permissions: ['read_agents']
          }
        ];
        
        for (const endpoint of ownerEndpoints) {
          const endpointData = {
            id: uuidv4(),
            gatewayId,
            endpointPath: endpoint.path,
            method: endpoint.method,
            description: endpoint.description,
            requiresAuthentication: endpoint.requiresAuth,
            requiredPermissions: endpoint.permissions,
            inputSchema: null,
            outputSchema: null,
            status: 'active',
            functionName: this.generateFunctionName(gatewayId, endpoint.path, endpoint.method),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          const endpointRef = doc(
            db,
            'integrationGateways',
            gatewayId,
            'endpoints',
            endpointData.id
          );
          
          batch.set(endpointRef, endpointData);
        }
      } else if (gatewayType === GatewayType.ENTERPRISE) {
        const enterpriseEndpoints = [
          {
            path: '/organization',
            method: 'GET',
            description: 'Get organization information',
            requiresAuth: true,
            permissions: ['read_organization']
          },
          {
            path: '/members',
            method: 'GET',
            description: 'Get organization members',
            requiresAuth: true,
            permissions: ['read_members']
          },
          {
            path: '/teams',
            method: 'GET',
            description: 'Get organization teams',
            requiresAuth: true,
            permissions: ['read_teams']
          }
        ];
        
        for (const endpoint of enterpriseEndpoints) {
          const endpointData = {
            id: uuidv4(),
            gatewayId,
            endpointPath: endpoint.path,
            method: endpoint.method,
            description: endpoint.description,
            requiresAuthentication: endpoint.requiresAuth,
            requiredPermissions: endpoint.permissions,
            inputSchema: null,
            outputSchema: null,
            status: 'active',
            functionName: this.generateFunctionName(gatewayId, endpoint.path, endpoint.method),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          const endpointRef = doc(
            db,
            'integrationGateways',
            gatewayId,
            'endpoints',
            endpointData.id
          );
          
          batch.set(endpointRef, endpointData);
        }
      } else if (gatewayType === GatewayType.OWNER_SUBSCRIBER) {
        const subscriberEndpoints = [
          {
            path: '/subscribers',
            method: 'GET',
            description: 'Get subscribers list',
            requiresAuth: true,
            permissions: ['read_subscribers']
          },
          {
            path: '/solutions/:solutionCode/access',
            method: 'GET',
            description: 'Get solution access',
            requiresAuth: true,
            permissions: ['access_solution']
          }
        ];
        
        for (const endpoint of subscriberEndpoints) {
          const endpointData = {
            id: uuidv4(),
            gatewayId,
            endpointPath: endpoint.path,
            method: endpoint.method,
            description: endpoint.description,
            requiresAuthentication: endpoint.requiresAuth,
            requiredPermissions: endpoint.permissions,
            inputSchema: null,
            outputSchema: null,
            status: 'active',
            functionName: this.generateFunctionName(gatewayId, endpoint.path, endpoint.method),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          const endpointRef = doc(
            db,
            'integrationGateways',
            gatewayId,
            'endpoints',
            endpointData.id
          );
          
          batch.set(endpointRef, endpointData);
        }
      }
      
      await batch.commit();
    } catch (error) {
      console.error('Error creating default endpoints:', error);
      throw error;
    }
  }
  
  /**
   * Generate a Cloud Function name for an endpoint
   */
  private static generateFunctionName(
    gatewayId: string,
    path: string,
    method: string
  ): string {
    // Create a valid function name from the gateway ID, path, and method
    const shortGatewayId = gatewayId.substring(0, 8);
    const normalizedPath = path
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_/, '')
      .replace(/_$/, '');
    
    return `gateway_${shortGatewayId}_${normalizedPath}_${method.toLowerCase()}`;
  }
}

// Activity Logger Service
export class ActivityLoggerService {
  /**
   * Log an activity
   */
  static async logActivity(
    actorType: string,
    actorId: string,
    action: string,
    resourceType?: string,
    resourceId?: string,
    status: string = 'success',
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const logEntry = {
        id: uuidv4(),
        actorType,
        actorId,
        action,
        resourceType: resourceType || null,
        resourceId: resourceId || null,
        status,
        details: details || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        performedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'activityLogs', logEntry.id), logEntry);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }
  
  /**
   * Get activity logs for a resource
   */
  static async getActivityForResource(
    resourceType: string,
    resourceId: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const logsQuery = query(
        collection(db, 'activityLogs'),
        where('resourceType', '==', resourceType),
        where('resourceId', '==', resourceId),
        // Order by performedAt in descending order (newest first)
        // Note: This requires an index to be created
      );
      
      const querySnapshot = await getDocs(logsQuery);
      
      return querySnapshot.docs
        .map(doc => doc.data())
        .sort((a, b) => {
          // Sort manually by performedAt in descending order
          const timeA = a.performedAt?.toMillis() || 0;
          const timeB = b.performedAt?.toMillis() || 0;
          return timeB - timeA;
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting activity logs:', error);
      throw error;
    }
  }
}

// Conversation Service
export class ConversationService {
  /**
   * Create a new conversation
   */
  static async createConversation(
    title: string,
    initiatorType: string,
    initiatorId: string,
    participants: Array<{ type: string; id: string }>
  ): Promise<any> {
    try {
      // Create conversation document
      const conversationId = uuidv4();
      const now = serverTimestamp();
      
      const conversationData = {
        id: conversationId,
        title: title || null,
        initiatorType,
        initiatorId,
        conversationType: 'standard',
        status: 'active',
        metadata: {},
        createdAt: now,
        updatedAt: now
      };
      
      await setDoc(doc(db, 'conversations', conversationId), conversationData);
      
      // Add participants
      const batch = writeBatch(db);
      
      for (const participant of participants) {
        const participantData = {
          conversationId,
          participantType: participant.type,
          participantId: participant.id,
          joinedAt: now,
          status: 'active'
        };
        
        const participantRef = doc(
          db,
          'conversations',
          conversationId,
          'participants',
          `${participant.type}_${participant.id}`
        );
        
        batch.set(participantRef, participantData);
      }
      
      await batch.commit();
      
      return {
        ...conversationData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        participants
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }
  
  /**
   * Add a message to a conversation
   */
  static async addMessage(
    conversationId: string,
    senderType: string,
    senderId: string,
    content: string,
    contentType: string = 'text',
    parentMessageId?: string
  ): Promise<any> {
    try {
      // Check if conversation exists
      const conversationDoc = await getDoc(doc(db, 'conversations', conversationId));
      if (!conversationDoc.exists()) {
        throw new Error('Conversation not found');
      }
      
      // Verify sender is a participant
      const participantRef = doc(
        db,
        'conversations',
        conversationId,
        'participants',
        `${senderType}_${senderId}`
      );
      
      const participantDoc = await getDoc(participantRef);
      if (!participantDoc.exists() || participantDoc.data().status !== 'active') {
        throw new Error('Sender is not an active participant');
      }
      
      // Create message document
      const messageId = uuidv4();
      const now = serverTimestamp();
      
      const messageData = {
        id: messageId,
        conversationId,
        senderType,
        senderId,
        content,
        contentType,
        parentMessageId: parentMessageId || null,
        metadata: {},
        sentAt: now,
        updatedAt: now
      };
      
      await setDoc(doc(db, 'conversations', conversationId, 'messages', messageId), messageData);
      
      // Update conversation's updatedAt timestamp
      await updateDoc(doc(db, 'conversations', conversationId), {
        updatedAt: now
      });
      
      // If HIGH_PERFORMANCE or ULTRA_PERFORMANCE agent is involved, vectorize the message
      // This would require the agent's vectorStoreId
      if (senderType === 'agent' || conversationDoc.data().metadata.vectorize) {
        await this.vectorizeMessage(messageId, conversationId, content, senderType, senderId);
      }
      
      return {
        ...messageData,
        sentAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }
  
  /**
   * Get conversation messages
   */
  static async getConversationMessages(conversationId: string): Promise<any[]> {
    try {
      const messagesQuery = query(
        collection(db, 'conversations', conversationId, 'messages'),
        where('deletedAt', '==', null)
        // Order by sentAt in ascending order (oldest first)
        // Note: This requires an index to be created
      );
      
      const querySnapshot = await getDocs(messagesQuery);
      
      return querySnapshot.docs
        .map(doc => doc.data())
        .sort((a, b) => {
          // Sort manually by sentAt in ascending order
          const timeA = a.sentAt?.toMillis() || 0;
          const timeB = b.sentAt?.toMillis() || 0;
          return timeA - timeB;
        });
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      throw error;
    }
  }
  
  /**
   * Vectorize a message for retrieval
   */
  private static async vectorizeMessage(
    messageId: string,
    conversationId: string,
    content: string,
    senderType: string,
    senderId: string
  ): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Generate an embedding for the message content
      // 2. Store the embedding in Pinecone
      // 3. Update the message with the vector ID
      
      // For now, we'll create a placeholder record
      const vectorId = `vector_${uuidv4()}`;
      
      // Update the message with the vector ID
      await updateDoc(
        doc(db, 'conversations', conversationId, 'messages', messageId),
        {
          vectorId,
          'metadata.vectorized': true
        }
      );
      
      // If this is a Cloud Function context, we would:
      //   const embed = await embeddingModel.generateEmbedding(content);
      //   const index = pinecone.Index('aixtiv_symphony');
      //   await index.upsert({
      //     namespace: `conversation_${conversationId}`,
      //     vectors: [{
      //       id: vectorId,
      //       values: embed,
      //       metadata: {
      //         messageId,
      //         conversationId,
      //         senderType,
      //         senderId,
      //         timestamp: Date.now()
      //       }
      //     }]
      //   });
    } catch (error) {
      console.error('Error vectorizing message:', error);
    }
  }
}

// Performance Metrics Service
export class PerformanceMetricsService {
  /**
   * Record a performance metric
   */
  static async recordMetric(
    metricType: string,
    subjectType: string,
    subjectId: string,
    value: number,
    unit?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const metricData = {
        id: uuidv4(),
        metricType,
        subjectType,
        subjectId,
        value,
        unit: unit || null,
        capturedAt: serverTimestamp(),
        metadata: metadata || {}
      };
      
      await setDoc(doc(db, 'performanceMetrics', metricData.id), metricData);
    } catch (error) {
      console.error('Error recording metric:', error);
    }
  }
  
  /**
   * Get metrics for a subject
   */
  static async getMetricsForSubject(
    subjectType: string,
    subjectId: string,
    metricType?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<any[]> {
    try {
      let metricsQuery = query(
        collection(db, 'performanceMetrics'),
        where('subjectType', '==', subjectType),
        where('subjectId', '==', subjectId)
      );
      
      if (metricType) {
        metricsQuery = query(metricsQuery, where('metricType', '==', metricType));
      }
      
      // Note: In Firestore, you can't use inequality filters on different fields
      // So we can't filter by both metricType and date range in a single query
      // We'll filter by date range programmatically
      
      const querySnapshot = await getDocs(metricsQuery);
      
      return querySnapshot.docs
        .map(doc => doc.data())
        .filter(metric => {
          if (!startDate && !endDate) return true;
          
          const metricDate = metric.capturedAt?.toDate() || new Date(0);
          
          if (startDate && metricDate < startDate) return false;
          if (endDate && metricDate > endDate) return false;
          
          return true;
        })
        .sort((a, b) => {
          // Sort by capturedAt in descending order (newest first)
          const timeA = a.capturedAt?.toMillis() || 0;
          const timeB = b.capturedAt?.toMillis() || 0;
          return timeB - timeA;
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting metrics:', error);
      throw error;
    }
  }
}

// S2DO Service (Secure Structured Data Objects)
export class S2DOService {
  /**
   * Create a new S2DO object
   */
  static async createS2DOObject(
    ownerType: string,
    ownerId: string,
    objectType: string,
    data: any,
    isPublic: boolean = false,
    encrypt: boolean = true
  ): Promise<string> {
    try {
      // Generate a unique ID
      const objectId = uuidv4();
      
      // Store the data in Firebase Storage
      const storageReference = storageRef(
        storage,
        `s2do/${ownerType}/${ownerId}/${objectType}/${objectId}`
      );
      
      // Encrypt data if required
      let storedData;
      if (encrypt) {
        // Generate an encryption key
        const encryptionKey = CryptoJS.lib.WordArray.random(32).toString();
        
        // Encrypt the data
        const encryptedData = CryptoJS.AES.encrypt(
          JSON.stringify(data),
          encryptionKey
        ).toString();
        
        // Store the encrypted data
        storedData = JSON.stringify({
          encrypted: true,
          data: encryptedData
        });
        
        // Store the encryption key securely
        await setDoc(doc(db, 's2doEncryptionKeys', objectId), {
          key: encryptionKey,
          objectId,
          ownerType,
          ownerId,
          createdAt: serverTimestamp()
        });
      } else {
        // Store unencrypted data
        storedData = JSON.stringify({
          encrypted: false,
          data
        });
      }
      
      // Upload the data to storage
      const dataBlob = new Blob([storedData], { type: 'application/json' });
      await uploadBytes(storageReference, dataBlob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageReference);
      
      // Create the S2DO object document
      const s2doData = {
        id: objectId,
        ownerType,
        ownerId,
        objectType,
        status: 'active',
        storageUrl: downloadURL,
        encryptionStatus: encrypt,
        permissions: {
          publicAccess: isPublic,
          authorizedUsers: [],
          authorizedOrganizations: []
        },
        metadata: {
          size: storedData.length,
          contentType: 'application/json',
          version: '1.0'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 's2doObjects', objectId), s2doData);
      
      return objectId;
    } catch (error) {
      console.error('Error creating S2DO object:', error);
      throw error;
    }
  }
  
  /**
   * Get an S2DO object
   */
  static async getS2DOObject(objectId: string, requesterId: string): Promise<any> {
    try {
      // Get the object metadata
      const objectDoc = await getDoc(doc(db, 's2doObjects', objectId));
      
      if (!objectDoc.exists()) {
        throw new Error('Object not found');
      }
      
      const objectData = objectDoc.data();
      
      // Check access permissions
      const hasAccess =
        objectData.ownerType === 'user' && objectData.ownerId === requesterId ||
        objectData.permissions.publicAccess ||
        objectData.permissions.authorizedUsers.includes(requesterId);
      
      if (!hasAccess) {
        throw new Error('Access denied');
      }
      
      // Fetch the data from storage
      const response = await fetch(objectData.storageUrl);
      const storedData = await response.json();
      
      // If encrypted, decrypt the data
      if (storedData.encrypted) {
        // Get the encryption key
        const keyDoc = await getDoc(doc(db, 's2doEncryptionKeys', objectId));
        
        if (!keyDoc.exists()) {
          throw new Error('Encryption key not found');
        }
        
        const encryptionKey = keyDoc.data().key;
        
        // Decrypt the data
        const decryptedData = CryptoJS.AES.decrypt(
          storedData.data,
          encryptionKey
        ).toString(CryptoJS.enc.Utf8);
        
        return JSON.parse(decryptedData);
      } else {
        // Return unencrypted data
        return storedData.data;
      }
    } catch (error) {
      console.error('Error getting S2DO object:', error);
      throw error;
    }
  }
  
  /**
   * Grant access to an S2DO object
   */
  static async grantS2DOAccess(
    objectId: string,
    accessType: 'user' | 'organization',
    accessId: string,
    granterId: string
  ): Promise<boolean> {
    try {
      // Get the object metadata
      const objectDoc = await getDoc(doc(db, 's2doObjects', objectId));
      
      if (!objectDoc.exists()) {
        throw new Error('Object not found');
      }
      
      const objectData = objectDoc.data();
      
      // Check if granter is the owner
      if (objectData.ownerType === 'user' && objectData.ownerId !== granterId) {
        throw new Error('Only the owner can grant access');
      }
      
      // Update permissions
      if (accessType === 'user') {
        // Add user to authorized users if not already present
        if (!objectData.permissions.authorizedUsers.includes(accessId)) {
          await updateDoc(doc(db, 's2doObjects', objectId), {
            'permissions.authorizedUsers': [...objectData.permissions.authorizedUsers, accessId],
            updatedAt: serverTimestamp()
          });
        }
      } else if (accessType === 'organization') {
        // Add organization to authorized organizations if not already present
        if (!objectData.permissions.authorizedOrganizations.includes(accessId)) {
          await updateDoc(doc(db, 's2doObjects', objectId), {
            'permissions.authorizedOrganizations': [...objectData.permissions.authorizedOrganizations, accessId],
            updatedAt: serverTimestamp()
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error granting S2DO access:', error);
      throw error;
    }
  }
}

// Rays Compute Service
export class RaysComputeService {
  /**
   * Submit a compute job to Rays
   */
  static async submitComputeJob(
    jobType: string,
    requesterId: string,
    requesterType: string,
    parameters: Record<string, any>,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<string> {
    try {
      // Create job document
      const jobId = uuidv4();
      
      const jobData = {
        id: jobId,
        jobType,
        status: 'pending',
        requesterId,
        requesterType,
        parameters,
        priority,
        progress: 0,
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'raysComputeJobs', jobId), jobData);
      
      // In a real implementation, this would trigger a cloud function or backend process
      // to handle the job. For now, we'll just return the job ID.
      
      return jobId;
    } catch (error) {
      console.error('Error submitting compute job:', error);
      throw error;
    }
  }
  
  /**
   * Get compute job status
   */
  static async getJobStatus(jobId: string): Promise<any> {
    try {
      const jobDoc = await getDoc(doc(db, 'raysComputeJobs', jobId));
      
      if (!jobDoc.exists()) {
        throw new Error('Job not found');
      }
      
      return jobDoc.data();
    } catch (error) {
      console.error('Error getting job status:', error);
      throw error;
    }
  }
  
  /**
   * Get compute jobs for a requester
   */
  static async getJobsForRequester(
    requesterId: string,
    requesterType: string,
    status?: string
  ): Promise<any[]> {
    try {
      let jobsQuery = query(
        collection(db, 'raysComputeJobs'),
        where('requesterId', '==', requesterId),
        where('requesterType', '==', requesterType)
      );
      
      if (status) {
        jobsQuery = query(jobsQuery, where('status', '==', status));
      }
      
      const querySnapshot = await getDocs(jobsQuery);
      
      return querySnapshot.docs
        .map(doc => doc.data())
        .sort((a, b) => {
          // Sort by createdAt in descending order (newest first)
          const timeA = a.createdAt?.toMillis() || 0;
          const timeB = b.createdAt?.toMillis() || 0;
          return timeB - timeA;
        });
    } catch (error) {
      console.error('Error getting jobs for requester:', error);
      throw error;
    }
  }
}

// Export all services
export default {
  UserService,
  AuthService,
  OrganizationService,
  AgentService,
  IntegrationGatewayService,
  ActivityLoggerService,
  ConversationService,
  PerformanceMetricsService,
  S2DOService,
  RaysComputeService
};
