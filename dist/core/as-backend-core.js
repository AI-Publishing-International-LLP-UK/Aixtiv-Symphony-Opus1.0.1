/**
 * AIXTIV SYMPHONY™ Core Services
 * © 2025 AI Publishing International LLP
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This is proprietary software of AI Publishing International LLP.
 * All rights reserved. No part of this software may be reproduced,
 * modified, or distributed without prior written permission.
 */

import * from 'firebase/app';
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
  increment,
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
  User
} from 'firebase/auth';
import {
  getStorage,
  ref
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import * from '@pinecone-database/pinecone';
import { v4 } from 'uuid';
import * from 'crypto-js';
import { ethers } from 'ethers';

// Initialize Firebase (would use actual config in production)
const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
  measurementId,
};

// Initialize Firebase if not already initialized
let firebaseApp;
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
  environment: process.env.PINECONE_ENVIRONMENT || '',
});

// Initialize Blockchain Provider (Ethereum example)
const provider = new ethers.providers.JsonRpcProvider(
  process.env.ETHEREUM_RPC_URL
);
const aixtivWallet = new ethers.Wallet(
  process.env.AIXTIV_PRIVATE_KEY || '',
  provider
);

// Core types and interfaces
import {
  UserType,
  CoreSolution,
  PilotType,
  IntegrationType,
  SecurityOption,
} from './types';

export enum PerformanceProfile {
  STANDARD = 'standard',
  HIGH_PERFORMANCE = 'high-performance',
  ULTRA_PERFORMANCE = 'ultra-performance',
}

export enum SecurityTier {
  BASIC = 1,
  ENTERPRISE = 2,
  OWNER_SUBSCRIBER = 3,
  ADVANCED = 4,
}

export enum GatewayType {
  OWNER = 'owner',
  ENTERPRISE = 'enterprise',
  OWNER_SUBSCRIBER = 'owner-subscriber',
}

export 

export ;
  contact?: {
    email?;
    phone?;
  };
  status: 'active' | 'inactive' | 'suspended';
  settings;
  createdAt;
  updatedAt;
  blockchainVerification?: {
    address;
    verificationStatus;
    transactionId?;
  };
}

export ;
  communicationSettings: {
    language?;
    tone?;
    responseLength?: 'concise' | 'standard' | 'detailed';
    adapters?;
  };
  culturalAdaptationSettings: {
    region?;
    contextualReferences?;
    localExamples?;
    languageAdaptation?;
  };
  metadata;
  vectorStoreId?;
  createdAt;
  updatedAt;
}

export ;
  rateLimitSettings: {
    requestsPerMinute?;
    requestsPerHour?;
    requestsPerDay?;
  };
  createdAt;
  updatedAt;
}

// User Service
export class UserService {
  /**
   * Create a new user with Firebase Auth and Firestore
   */
  static async createUser(
    email,
    password,
    userData, 'id' | 'createdAt' | 'updatedAt' | 'verificationStatus'>
    >
  ){
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      // Update display name if provided
      if (userData.displayName) {
        await updateProfile(firebaseUser, {
          displayName,
          photoURL,
        });
      }

      // Generate blockchain verification
      const blockchainAddress =
        userData.blockchainAddress || (await this.generateBlockchainAddress());

      // Create user document in Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const now = serverTimestamp();

      const userDoc= {
        id,
        userCode: userData.userCode || '',
        track,
        position,
        level,
        entityId: userData.entityId || '',
        specializedRoles,
        paymentTerm,
        solutions,
        integrations,
        securityOptions,
        email,
        displayName: userData.displayName || email.split('@')[0],
        photoURL,
        createdAt,
        updatedAt,
        verificationStatus: 'pending',
        userMetadata: userData.userMetadata || {},
      };

      await setDoc(userDocRef, userDoc);

      // Create blockchain verification record
      await this.createBlockchainVerification(
        'user',
        firebaseUser.uid,
        blockchainAddress
      );

      // If user is part of an organization, add them to the organization
      if (
        userData.entityId &&
        (userData.track === UserType.CORPORATE ||
          userData.track === UserType.ORGANIZATIONAL)
      ) {
        const memberDoc = {
          userId,
          organizationId,
          role=== UserType.LEADER ? 'admin' : 'member',
          permissions,
          joinedAt,
          status: 'active',
          metadata: {},
        };

        await setDoc(
          doc(
            db,
            'organizations',
            userData.entityId,
            'members',
            firebaseUser.uid
          ),
          memberDoc
        );
      }

      // Send email verification
      await sendEmailVerification(firebaseUser);

      return {
        ...userDoc,
        // Replace server timestamp with actual Timestamp
        createdAt,
        updatedAt,
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(id){
    try {
      const userDoc = await getDoc(doc(db, 'users', id));

      if (!userDoc.exists()) {
        return null;
      }

      return userDoc.data();
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email){
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email)
      );

      const querySnapshot = await getDocs(usersQuery);

      if (querySnapshot.empty) {
        return null;
      }

      return querySnapshot.docs[0].data();
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateUser(
    id,
    data){
    try {
      const userDocRef = doc(db, 'users', id);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        return null;
      }

      const updateData= {
        ...data,
        updatedAt,
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
            displayName,
            photoURL,
          });
        }
      }

      // If specialized roles or track are updated, check for gateway creation
      if (data.specializedRoles || data.track || data.position) {
        await this.ensureUserGateways(id);
      }

      // Fetch and return the updated user
      const updatedUserDoc = await getDoc(userDocRef);
      return updatedUserDoc.data();
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Change user type (track, position, level)
   */
  static async changeUserType(
    userId,
    track?,
    position?,
    level?){
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        return null;
      }

      const updateData= {
        updatedAt,
      };

      if (track) updateData.track = track;
      if (position) updateData.position = position;
      if (level) updateData.level = level;

      // Update the user code if any component changes
      if (track || position || level) {
        const userData = userDoc.data();
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
      return updatedUserDoc.data();
    } catch (error) {
      console.error('Error changing user type:', error);
      throw error;
    }
  }

  /**
   * Add a specialized role to a user
   */
  static async addSpecializedRole(
    userId,
    role){
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data();

      // Check if user already has this role
      if (userData.specializedRoles.includes(role)) {
        return userData;
      }

      // Add the role
      const updatedRoles = [...userData.specializedRoles, role];

      // Update user document
      await updateDoc(userDocRef, {
        specializedRoles,
        updatedAt,
      });

      // If adding a Visionary Voice role, ensure appropriate gateways exist
      if (role === UserType.VISIONARY_VOICE) {
        await this.ensureUserGateways(userId);
      }

      // Fetch and return the updated user
      const updatedUserDoc = await getDoc(userDocRef);
      return updatedUserDoc.data();
    } catch (error) {
      console.error('Error adding specialized role:', error);
      throw error;
    }
  }

  /**
   * Generate a blockchain address for a user
   */
  static async generateBlockchainAddress(){
    // In a real implementation, this would create a secure wallet
    // Here we're just generating a random Ethereum-like address
    const wallet = ethers.Wallet.createRandom();
    return wallet.address;
  }

  /**
   * Create blockchain verification for a record
   */
  static async createBlockchainVerification(
    recordType,
    recordId,
    blockchainAddress){
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
        timestamp,
        verificationStatus,
        blockchainNetwork: 'ethereum',
        metadata: {},
      };

      const recordRef = await addDoc(
        collection(db, 'blockchainRecords'),
        blockchainRecord
      );

      return recordRef.id;
    } catch (error) {
      console.error('Error creating blockchain verification:', error);
      throw error;
    }
  }

  /**
   * Log a user type change
   */
  static async logUserTypeChange(
    userId,
    oldTrack,
    oldPosition,
    oldLevel,
    newTrack,
    newPosition,
    newLevel){
    try {
      const logEntry = {
        actorType: 'system',
        actorId: 'typeChange',
        action: 'USER_TYPE_CHANGED',
        resourceType: 'user',
        resourceId,
        status: 'success',
        details: {
          old: {
            track,
            position,
            level,
          },
          new: {
            track,
            position,
            level,
          },
        },
        performedAt,
      };

      await addDoc(collection(db, 'activityLogs'), logEntry);
    } catch (error) {
      console.error('Error logging user type change:', error);
    }
  }

  /**
   * Generate a user code from components
   */
  static generateUserCode(
    track,
    position,
    level,
    entityId,
    userId,
    specializedRoles,
    paymentTerm){
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
  static async ensureUserGateways(userId){
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (!userDoc.exists()) {
        return;
      }

      const userData = userDoc.data();

      // Check if user needs the Owner gateway
      const needsOwnerGateway =
        userData.specializedRoles.includes(UserType.VISIONARY_VOICE) ||
        userData.position === UserType.LEADER;

      // Check if user needs the Owner-Subscriber gateway
      const needsSubscriberGateway =
        userData.specializedRoles.includes(UserType.VISIONARY_VOICE) ||
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
            gatewayType,
            name: `${userData.displayName} Personal Gateway`,
            description: `Personal integration gateway for ${userData.displayName}`,
            ownerType: 'user',
            ownerId,
            securityTier,
            status: 'active',
            authenticationSettings: {
              apiKeyRequired,
              jwtRequired,
              allowedOrigins,
              blockchainVerificationRequired,
            },
            rateLimitSettings: {
              requestsPerMinute,
              requestsPerHour,
              requestsPerDay,
            },
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
            gatewayType,
            name: `${userData.displayName} Subscriber Gateway`,
            description: `Subscriber integration gateway for ${userData.displayName}`,
            ownerType: 'user',
            ownerId,
            securityTier,
            status: 'active',
            authenticationSettings: {
              apiKeyRequired,
              jwtRequired,
              allowedOrigins,
              blockchainVerificationRequired,
            },
            rateLimitSettings: {
              requestsPerMinute,
              requestsPerHour,
              requestsPerDay,
            },
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
    email,
    password){ user; aixtivUser: AIXTIVUser }> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      // Get the AIXTIV user profile
      const aixtivUser = await UserService.getUserById(firebaseUser.uid);

      if (!aixtivUser) {
        throw new Error('User profile not found');
      }

      // Update last login timestamp
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        lastLogin,
      });

      // Log activity
      await this.logUserActivity(firebaseUser.uid, 'USER_SIGN_IN', 'success');

      return { user, aixtivUser };
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  /**
   * Sign out the current user
   */
  static async signOut(){
    try {
      const currentUser = auth.currentUser;

      if (currentUser) {
        // Log activity before signing out
        await this.logUserActivity(currentUser.uid, 'USER_SIGN_OUT', 'success');
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
  static async resetPassword(email){
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
  static async getCurrentUser(){
    user;
    aixtivUser;
  } | null> {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        async user => {
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
  static async generateToken(userId){
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
  static async verifyToken(token){
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
  static async logUserActivity(
    userId,
    action,
    status: 'success' | 'failure'
  ){
    try {
      const logEntry = {
        actorType: 'user',
        actorId,
        resourceType: 'auth',
        resourceId,
        performedAt,
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
  static async createOrganization(
    data){
    try {
      // Generate a unique ID if not provided
      const orgId = data.id || uuidv4();

      // Set required fields
      const now = serverTimestamp();

      const orgData= {
        id,
        name: data.name || 'New Organization',
        trackType,
        description,
        website,
        logoURL,
        industry,
        size,
        address: data.address || {},
        contact: data.contact || {},
        status: data.status || 'active',
        settings: data.settings || {},
        createdAt,
        updatedAt,
      };

      // Generate blockchain verification if needed
      if (data.blockchainVerification?.address) {
        orgData.blockchainVerification = data.blockchainVerification;
      } else if (
        data.trackType === UserType.CORPORATE ||
        data.trackType === UserType.ORGANIZATIONAL
      ) {
        // Generate blockchain address for corporate or organizational entities
        const blockchainAddress = await this.generateBlockchainAddress();
        orgData.blockchainVerification = {
          address,
          verificationStatus,
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
      if (
        data.trackType === UserType.CORPORATE ||
        data.trackType === UserType.ORGANIZATIONAL
      ) {
        await this.createOrganizationGateways(
          orgId,
          data.name || 'New Organization'
        );
      }

      return {
        ...orgData,
        // Replace server timestamp with actual Timestamp
        createdAt,
        updatedAt,
      };
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }

  /**
   * Get organization by ID
   */
  static async getOrganizationById(id){
    try {
      const orgDoc = await getDoc(doc(db, 'organizations', id));

      if (!orgDoc.exists()) {
        return null;
      }

      return orgDoc.data();
    } catch (error) {
      console.error('Error getting organization:', error);
      throw error;
    }
  }

  /**
   * Add a member to an organization
   */
  static async addMemberToOrganization(
    organizationId,
    userId,
    role= 'member'
  ){
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
      const memberDocRef = doc(
        db,
        'organizations',
        organizationId,
        'members',
        userId
      );
      const memberDoc = await getDoc(memberDocRef);

      if (memberDoc.exists()) {
        // If already a member, update role if needed
        if (memberDoc.data()?.role !== role) {
          await updateDoc(memberDocRef, {
            role,
            updatedAt,
          });
        }
        return true;
      }

      // Add member document
      await setDoc(memberDocRef, {
        userId,
        organizationId,
        role,
        permissions=== 'admin'
            ? ['manage_members', 'manage_teams', 'manage_settings']
            ,
        joinedAt,
        status: 'active',
        metadata: {},
      });

      // Update user's entity ID if not already set
      const userData = userDoc.data();
      if (!userData?.entityId) {
        await updateDoc(doc(db, 'users', userId), {
          entityId,
          updatedAt,
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
  static async getOrganizationMembers(organizationId){
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
            id,
            role,
            permissions,
            joinedAt,
            status,
            username,
            email,
            firstName: userData.firstName || userData.displayName.split(' ')[0],
            lastName:
              userData.lastName ||
              userData.displayName.split(' ').slice(1).join(' '),
            photoURL,
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
    organizationId,
    name,
    description?,
    leaderId?){
    try {
      // Check if organization exists
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId));
      if (!orgDoc.exists()) {
        throw new Error('Organization not found');
      }

      // Create team document
      const teamData = {
        id,
        description: description || '',
        leaderId,
        status: 'active',
        settings: {},
        createdAt,
        updatedAt,
      };

      await setDoc(doc(db, 'teams', teamData.id), teamData);

      // If leader is provided, add them to the team
      if (leaderId) {
        await setDoc(doc(db, 'teams', teamData.id, 'members', leaderId), {
          userId,
          teamId,
          role: 'leader',
          joinedAt,
          status: 'active',
        });
      }

      return {
        ...teamData,
        createdAt,
        updatedAt,
      };
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }

  /**
   * Generate a blockchain address for an organization
   */
  static async generateBlockchainAddress(){
    // In a real implementation, this would create a secure wallet
    // Here we're just generating a random Ethereum-like address
    const wallet = ethers.Wallet.createRandom();
    return wallet.address;
  }

  /**
   * Create appropriate gateways for an organization
   */
  static async createOrganizationGateways(
    organizationId,
    organizationName){
    try {
      // Create Enterprise gateway
      await IntegrationGatewayService.createGateway({
        gatewayType,
        name: `${organizationName} Enterprise Gateway`,
        description: `Enterprise integration gateway for ${organizationName}`,
        ownerType: 'organization',
        ownerId,
        securityTier,
        status: 'active',
        authenticationSettings: {
          apiKeyRequired,
          jwtRequired,
          allowedOrigins,
          blockchainVerificationRequired,
        },
        rateLimitSettings: {
          requestsPerMinute,
          requestsPerHour,
          requestsPerDay,
        },
      });

      // Create Owner-Subscriber gateway
      await IntegrationGatewayService.createGateway({
        gatewayType,
        name: `${organizationName} Subscriber Gateway`,
        description: `Subscriber integration gateway for ${organizationName}`,
        ownerType: 'organization',
        ownerId,
        securityTier,
        status: 'active',
        authenticationSettings: {
          apiKeyRequired,
          jwtRequired,
          allowedOrigins,
          blockchainVerificationRequired,
        },
        rateLimitSettings: {
          requestsPerMinute,
          requestsPerHour,
          requestsPerDay,
        },
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
  static async createAgentInstance(data){
    try {
      // Generate a unique ID if not provided
      const agentId = data.id || uuidv4();

      // Set required fields
      const now = serverTimestamp();

      const agentData= {
        id,
        agentTypeId,
        ownerType: data.ownerType || 'user',
        ownerId: data.ownerId || '',
        name: data.name || 'New Agent',
        nickname,
        status: data.status || 'active',
        performanceProfile,
        appearanceSettings: data.appearanceSettings || {},
        communicationSettings: data.communicationSettings || {},
        culturalAdaptationSettings: data.culturalAdaptationSettings || {},
        metadata: data.metadata || {},
        createdAt,
        updatedAt,
      };

      // Create vector store for agent if needed
      if (
        data.performanceProfile === PerformanceProfile.HIGH_PERFORMANCE ||
        data.performanceProfile === PerformanceProfile.ULTRA_PERFORMANCE
      ) {
        const vectorStoreId = await this.createAgentVectorStore(
          agentId,
          data.name || 'New Agent'
        );
        agentData.vectorStoreId = vectorStoreId;
      }

      // Create the agent document
      const agentDocRef = doc(db, 'agents', agentId);
      await setDoc(agentDocRef, agentData);

      // If this is a Visionary agent, create an NFT
      if (data.agentTypeId === PilotType.DR_ROARK_PILOT) {
        await this.createAgentNFT(
          agentId,
          data.name || 'New Agent',
          data.ownerType || 'user',
          data.ownerId || ''
        );
      }

      return {
        ...agentData,
        // Replace server timestamp with actual Timestamp
        createdAt,
        updatedAt,
      };
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  /**
   * Get agent by ID
   */
  static async getAgentById(id){
    try {
      const agentDoc = await getDoc(doc(db, 'agents', id));

      if (!agentDoc.exists()) {
        return null;
      }

      return agentDoc.data();
    } catch (error) {
      console.error('Error getting agent:', error);
      throw error;
    }
  }

  /**
   * Get agents by owner
   */
  static async getAgentsByOwner(
    ownerType,
    ownerId){
    try {
      const agentsQuery = query(
        collection(db, 'agents'),
        where('ownerType', '==', ownerType),
        where('ownerId', '==', ownerId)
      );

      const querySnapshot = await getDocs(agentsQuery);

      return querySnapshot.docs.map(doc => doc.data();
    } catch (error) {
      console.error('Error getting agents by owner:', error);
      throw error;
    }
  }

  /**
   * Update an agent instance
   */
  static async updateAgentInstance(
    id,
    data){
    try {
      const agentDocRef = doc(db, 'agents', id);
      const agentDoc = await getDoc(agentDocRef);

      if (!agentDoc.exists()) {
        return null;
      }

      const updateData= {
        ...data,
        updatedAt,
      };

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.ownerType;
      delete updateData.ownerId;

      await updateDoc(agentDocRef, updateData);

      // Fetch and return the updated agent
      const updatedAgentDoc = await getDoc(agentDocRef);
      return updatedAgentDoc.data();
    } catch (error) {
      console.error('Error updating agent:', error);
      throw error;
    }
  }

  /**
   * Grant access to an agent
   */
  static async grantAgentAccess(
    agentId,
    accessType,
    accessId,
    permissionLevel,
    grantedBy){
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
        grantedAt,
        status: 'active',
      };

      const accessDocId = `${accessType}_${accessId}`;
      await setDoc(
        doc(db, 'agents', agentId, 'access', accessDocId),
        accessData
      );

      return true;
    } catch (error) {
      console.error('Error granting agent access:', error);
      throw error;
    }
  }

  /**
   * Create a vector store for an agent
   */
  static async createAgentVectorStore(
    agentId,
    agentName){
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
          name,
          dimension, // For compatibility with common embedding models
          metric: 'cosine',
        });
      }

      // Create vector store record in Firestore
      const vectorStoreData = {
        id,
        name: `${agentName} Vector Store`,
        ownerType: 'agent',
        ownerId,
        dimensions,
        status: 'active',
        metadata: {
          agentId,
        },
        createdAt,
        updatedAt,
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
  static async createAgentNFT(
    agentId,
    agentName,
    ownerType,
    ownerId){
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
        id,
        tokenType: 'agent',
        linkedRecordId,
        contractAddress: process.env.NFT_CONTRACT_ADDRESS || '0x0',
        blockchainNetwork: 'ethereum',
        metadata: {
          name: `AIXTIV Agent: ${agentName}`,
          description: `This NFT represents ownership of the ${agentName} agent in the AIXTIV SYMPHONY ecosystem.`,
          image: `https://aixtiv.io/nft/agent/${agentId}.png`,
          attributes: [
            {
              trait_type: 'Agent Type',
              value: 'Visionary',
            },
            {
              trait_type: 'Performance Profile',
              value: 'Ultra',
            },
            {
              trait_type: 'Creation Date',
              value).split('T')[0],
            },
          ],
        },
        mintedAt,
        transferHistory: [
          {
            fromAddress: '0x0000000000000000000000000000000000000000',
            toAddress,
            transactionId: `tx_${uuidv4().replace(/-/g, '').substring(0, 24)}`,
            timestamp,
          },
        ],
      };

      await setDoc(doc(db, 'nftTokens', nftData.id), nftData);

      // Update agent with NFT reference
      await updateDoc(doc(db, 'agents', agentId), {
        'metadata.nftTokenId',
        updatedAt,
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
  static async createGateway(
    data){
    try {
      // Generate a unique ID if not provided
      const gatewayId = data.id || uuidv4();

      // Generate a secure encryption key ID if not provided
      const encryptionKeyId = data.encryptionKeyId || uuidv4();

      // Set required fields
      const now = serverTimestamp();

      const gatewayData= {
        id,
        gatewayType,
        name: data.name || 'New Gateway',
        description,
        ownerType: data.ownerType || 'user',
        ownerId: data.ownerId || '',
        securityTier,
        status: data.status || 'active',
        encryptionKeyId,
        authenticationSettings: data.authenticationSettings || {
          apiKeyRequired,
          jwtRequired,
          allowedOrigins,
          blockchainVerificationRequired,
        },
        rateLimitSettings: data.rateLimitSettings || {
          requestsPerMinute,
          requestsPerHour,
          requestsPerDay,
        },
        createdAt,
        updatedAt,
      };

      // Create the gateway document
      const gatewayDocRef = doc(db, 'integrationGateways', gatewayId);
      await setDoc(gatewayDocRef, gatewayData);

      // Create default endpoints
      await this.createDefaultEndpoints(
        gatewayId,
        data.gatewayType || GatewayType.OWNER
      );

      return {
        ...gatewayData,
        // Replace server timestamp with actual Timestamp
        createdAt,
        updatedAt,
      };
    } catch (error) {
      console.error('Error creating gateway:', error);
      throw error;
    }
  }

  /**
   * Get gateway by ID
   */
  static async getGatewayById(id){
    try {
      const gatewayDoc = await getDoc(doc(db, 'integrationGateways', id));

      if (!gatewayDoc.exists()) {
        return null;
      }

      return gatewayDoc.data();
    } catch (error) {
      console.error('Error getting gateway:', error);
      throw error;
    }
  }

  /**
   * Get gateways by owner
   */
  static async getGatewaysByOwner(
    ownerType,
    ownerId){
    try {
      const gatewaysQuery = query(
        collection(db, 'integrationGateways'),
        where('ownerType', '==', ownerType),
        where('ownerId', '==', ownerId)
      );

      const querySnapshot = await getDocs(gatewaysQuery);

      return querySnapshot.docs.map(doc => doc.data();
    } catch (error) {
      console.error('Error getting gateways by owner:', error);
      throw error;
    }
  }

  /**
   * Create an endpoint for a gateway
   */
  static async createEndpoint(
    gatewayId,
    path,
    method,
    description,
    requiresAuth= true,
    permissions= [],
    inputSchema= null,
    outputSchema= null
  ){
    try {
      // Check if gateway exists
      const gatewayDoc = await getDoc(
        doc(db, 'integrationGateways', gatewayId)
      );
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
        id,
        endpointPath,
        description: description || '',
        requiresAuthentication,
        requiredPermissions,
        status: 'active',
        functionName,
        createdAt,
        updatedAt,
      };

      await setDoc(
        doc(db, 'integrationGateways', gatewayId, 'endpoints', endpointData.id),
        endpointData
      );

      return {
        ...endpointData,
        createdAt,
        updatedAt,
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
    gatewayId,
    keyName,
    issuedToType,
    issuedToId,
    issuedBy,
    permissions= [],
    expiresInDays= 365
  ){ keyId; apiKey; prefix: string }> {
    try {
      // Check if gateway exists
      const gatewayDoc = await getDoc(
        doc(db, 'integrationGateways', gatewayId)
      );
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
        id,
        keyPrefix,
        status: 'active',
        issuedAt,
        expiresAt,
      };

      await setDoc(doc(db, 'integrationApiKeys', apiKeyData.id), apiKeyData);

      return {
        keyId,
      };
    } catch (error) {
      console.error('Error generating API key:', error);
      throw error;
    }
  }

  /**
   * Validate an API key
   */
  static async validateApiKey(
    prefix,
    apiKey){
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
      const expiresAt = querySnapshot.docs[0].data().expiresAt;
      if (expiresAt && expiresAt.toDate()  doc.data())
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
    title,
    initiatorType,
    initiatorId,
    participants: Array
  ){
    try {
      // Create conversation document
      const conversationId = uuidv4();
      const now = serverTimestamp();

      const conversationData = {
        id,
        title,
        conversationType: 'standard',
        status: 'active',
        metadata: {},
        createdAt,
        updatedAt,
      };

      await setDoc(doc(db, 'conversations', conversationId), conversationData);

      // Add participants
      const batch = writeBatch(db);

      for (const participant of participants) {
        const participantData = {
          conversationId,
          participantType,
          participantId,
          joinedAt,
          status: 'active',
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
        createdAt,
        updatedAt,
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
    conversationId,
    senderType,
    senderId,
    content,
    contentType= 'text',
    parentMessageId?){
    try {
      // Check if conversation exists
      const conversationDoc = await getDoc(
        doc(db, 'conversations', conversationId)
      );
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
      if (
        !participantDoc.exists() ||
        participantDoc.data().status !== 'active'
      ) {
        throw new Error('Sender is not an active participant');
      }

      // Create message document
      const messageId = uuidv4();
      const now = serverTimestamp();

      const messageData = {
        id,
        parentMessageId,
        metadata: {},
        sentAt,
        updatedAt,
      };

      await setDoc(
        doc(db, 'conversations', conversationId, 'messages', messageId),
        messageData
      );

      // Update conversation's updatedAt timestamp
      await updateDoc(doc(db, 'conversations', conversationId), {
        updatedAt,
      });

      // If HIGH_PERFORMANCE or ULTRA_PERFORMANCE agent is involved, vectorize the message
      // This would require the agent's vectorStoreId
      if (senderType === 'agent' || conversationDoc.data().metadata.vectorize) {
        await this.vectorizeMessage(
          messageId,
          conversationId,
          content,
          senderType,
          senderId
        );
      }

      return {
        ...messageData,
        sentAt,
        updatedAt,
      };
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  /**
   * Get conversation messages
   */
  static async getConversationMessages(conversationId){
    try {
      const messagesQuery = query(
        collection(db, 'conversations', conversationId, 'messages'),
        where('deletedAt', '==', null)
        // Order by sentAt in ascending order (oldest first)
        // Note;

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
  static async vectorizeMessage(
    messageId,
    conversationId,
    content,
    senderType,
    senderId){
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
          'metadata.vectorized',
        }
      );

      // If this is a Cloud Function context, we would:
      //   const embed = await embeddingModel.generateEmbedding(content);
      //   const index = pinecone.Index('aixtiv_symphony');
      //   await index.upsert({
      //     namespace: `conversation_${conversationId}`,
      //     vectors: [{
      //       id,
      //       values,
      //       metadata: {
      //         messageId,
      //         conversationId,
      //         senderType,
      //         senderId,
      //         timestamp)
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
    metricType,
    subjectType,
    subjectId,
    value,
    unit?,
    metadata?){
    try {
      const metricData = {
        id,
        unit,
        capturedAt,
        metadata: metadata || {},
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
    subjectType,
    subjectId,
    metricType?,
    startDate?,
    endDate?,
    limit= 100
  ){
    try {
      let metricsQuery = query(
        collection(db, 'performanceMetrics'),
        where('subjectType', '==', subjectType),
        where('subjectId', '==', subjectId)
      );

      if (metricType) {
        metricsQuery = query(
          metricsQuery,
          where('metricType', '==', metricType)
        );
      }

      // Note, you can't use inequality filters on different fields
      // So we can't filter by both metricType and date range in a single query
      // We'll filter by date range programmatically

      const querySnapshot = await getDocs(metricsQuery);

      return querySnapshot.docs
        .map(doc => doc.data())
        .filter(metric => {
          if (!startDate && !endDate) return true;

          const metricDate = metric.capturedAt?.toDate() || new Date(0);

          if (startDate && metricDate  endDate) return false;

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
    ownerType,
    ownerId,
    objectType,
    data,
    isPublic= false,
    encrypt= true
  ){
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
          encrypted,
          data,
        });

        // Store the encryption key securely
        await setDoc(doc(db, 's2doEncryptionKeys', objectId), {
          key,
          createdAt,
        });
      } else {
        // Store unencrypted data
        storedData = JSON.stringify({
          encrypted,
        });
      }

      // Upload the data to storage
      const dataBlob = new Blob([storedData], { type: 'application/json' });
      await uploadBytes(storageReference, dataBlob);

      // Get the download URL
      const downloadURL = await getDownloadURL(storageReference);

      // Create the S2DO object document
      const s2doData = {
        id,
        status: 'active',
        storageUrl,
        encryptionStatus,
        permissions: {
          publicAccess,
          authorizedUsers,
          authorizedOrganizations,
        },
        metadata: {
          size,
          contentType: 'application/json',
          version: '1.0',
        },
        createdAt,
        updatedAt,
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
  static async getS2DOObject(
    objectId,
    requesterId){
    try {
      // Get the object metadata
      const objectDoc = await getDoc(doc(db, 's2doObjects', objectId));

      if (!objectDoc.exists()) {
        throw new Error('Object not found');
      }

      const objectData = objectDoc.data();

      // Check access permissions
      const hasAccess =
        (objectData.ownerType === 'user' &&
          objectData.ownerId === requesterId) ||
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
    objectId,
    accessType: 'user' | 'organization',
    accessId,
    granterId){
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
            'permissions.authorizedUsers',
            updatedAt,
          });
        }
      } else if (accessType === 'organization') {
        // Add organization to authorized organizations if not already present
        if (
          !objectData.permissions.authorizedOrganizations.includes(accessId)
        ) {
          await updateDoc(doc(db, 's2doObjects', objectId), {
            'permissions.authorizedOrganizations',
            updatedAt,
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
    jobType,
    requesterId,
    requesterType,
    parameters,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ){
    try {
      // Create job document
      const jobId = uuidv4();

      const jobData = {
        id,
        status: 'pending',
        requesterId,
        requesterType,
        parameters,
        priority,
        progress,
        createdAt,
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
  static async getJobStatus(jobId){
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
    requesterId,
    requesterType,
    status?){
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
  RaysComputeService,
};
