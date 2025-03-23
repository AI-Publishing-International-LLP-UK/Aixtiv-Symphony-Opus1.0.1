/**
 * AIXTIV SYMPHONY™ S2DO (Secure Structured Data Objects) Implementation
 * © 2025 AI Publishing International LLP
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * This is proprietary software of AI Publishing International LLP.
 * All rights reserved. No part of this software may be reproduced,
 * modified, or distributed without prior written permission.
 */

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import * as CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import { BlockchainIntegrationManager, S2DOBlockchainSecurityManager } from './blockchain-integration';
import { ActivityLoggerService } from '../core';

// Initialize Firebase services
const db = getFirestore();
const storage = getStorage();
const auth = getAuth();

// S2DO Types
export enum S2DOObjectType {
  MEMORY = 'memory',
  DREAM = 'dream',
  DOCUMENT = 'document',
  JOURNAL = 'journal',
  CONTENT = 'content',
  VISUALIZATION = 'visualization',
  PROFILE = 'profile',
  CONFIGURATION = 'configuration',
  TEMPLATE = 'template'
}

export enum S2DOEncryptionLevel {
  NONE = 'none',
  STANDARD = 'standard',
  HIGH = 'high',
  ULTRA = 'ultra'
}

export enum S2DOAccessLevel {
  PRIVATE = 'private',
  SHARED = 'shared',
  PUBLIC = 'public',
  AUTHENTICATED = 'authenticated',
  PERMISSIONED = 'permissioned'
}

export interface S2DOMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  createdBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  contentType?: string;
  size?: number;
  format?: string;
  version?: string;
  language?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    placeName?: string;
  };
  customProperties?: Record<string, any>;
  blockchainVerification?: {
    hash?: string;
    transactionId?: string;
    timestamp?: Timestamp;
    status?: boolean;
  };
}

export interface S2DOObject {
  id: string;
  ownerType: 'user' | 'organization' | 'agent';
  ownerId: string;
  objectType: S2DOObjectType;
  status: 'active' | 'archived' | 'deleted';
  storageUrl: string;
  encryptionLevel: S2DOEncryptionLevel;
  accessLevel: S2DOAccessLevel;
  permissions: {
    publicAccess: boolean;
    authorizedUsers: string[];
    authorizedOrganizations: string[];
    authorizedAgents?: string[];
  };
  metadata: S2DOMetadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface S2DOStoredData<T> {
  encrypted: boolean;
  encryptionLevel?: S2DOEncryptionLevel;
  data: T | string; // plain data or encrypted string
  schema?: string;
  version?: string;
}

// S2DO Manager Class
export class S2DOManager {
  private blockchainManager: BlockchainIntegrationManager;
  private securityManager: S2DOBlockchainSecurityManager;
  private currentUser: any = null;

  constructor(
    blockchainManager: BlockchainIntegrationManager,
    securityManager: S2DOBlockchainSecurityManager
  ) {
    this.blockchainManager = blockchainManager;
    this.securityManager = securityManager;
    
    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
    });
  }

  /**
   * Create a new S2DO object
   */
  public async createObject<T>(
    ownerType: 'user' | 'organization' | 'agent',
    ownerId: string,
    objectType: S2DOObjectType,
    data: T,
    metadata: Partial<S2DOMetadata> = {},
    encryptionLevel: S2DOEncryptionLevel = S2DOEncryptionLevel.STANDARD,
    accessLevel: S2DOAccessLevel = S2DOAccessLevel.PRIVATE,
    permissions: Partial<S2DOObject['permissions']> = {}
  ): Promise<S2DOObject> {
    try {
      // Generate a unique ID for the object
      const objectId = uuidv4();
      
      // Prepare metadata
      const now = Timestamp.now();
      const fullMetadata: S2DOMetadata = {
        ...metadata,
        createdBy: this.currentUser?.uid || ownerId,
        createdAt: now,
        updatedAt: now,
        size: JSON.stringify(data).length,
        contentType: this.determineContentType(data),
        version: '1.0'
      };
      
      // Prepare permissions
      const fullPermissions: S2DOObject['permissions'] = {
        publicAccess: accessLevel === S2DOAccessLevel.PUBLIC,
        authorizedUsers: permissions.authorizedUsers || [],
        authorizedOrganizations: permissions.authorizedOrganizations || [],
        authorizedAgents: permissions.authorizedAgents || []
      };
      
      // Process data based on encryption level
      let storedData: S2DOStoredData<T>;
      let encryptionKey: string | null = null;
      
      if (encryptionLevel !== S2DOEncryptionLevel.NONE) {
        // Generate encryption key
        encryptionKey = this.generateEncryptionKey(encryptionLevel);
        
        // Encrypt the data
        const encryptedData = this.encryptData(JSON.stringify(data), encryptionKey, encryptionLevel);
        
        storedData = {
          encrypted: true,
          encryptionLevel,
          data: encryptedData,
          schema: typeof data === 'object' ? this.getObjectSchema(data) : undefined,
          version: '1.0'
        };
      } else {
        storedData = {
          encrypted: false,
          data,
          schema: typeof data === 'object' ? this.getObjectSchema(data) : undefined,
          version: '1.0'
        };
      }
      
      // Store the data
      const storageUrl = await this.storeObjectData(objectId, ownerType, ownerId, objectType, storedData);
      
      // Create S2DO object record
      const s2doObject: S2DOObject = {
        id: objectId,
        ownerType,
        ownerId,
        objectType,
        status: 'active',
        storageUrl,
        encryptionLevel,
        accessLevel,
        permissions: fullPermissions,
        metadata: fullMetadata,
        createdAt: now,
        updatedAt: now
      };
      
      // Save the S2DO object record to Firestore
      await setDoc(doc(db, 's2doObjects', objectId), s2doObject);
      
      // If encryption was used, store the encryption key securely
      if (encryptionKey) {
        await this.storeEncryptionKey(objectId, encryptionKey, encryptionLevel);
      }
      
      // Create blockchain verification if needed
      if (encryptionLevel === S2DOEncryptionLevel.HIGH || encryptionLevel === S2DOEncryptionLevel.ULTRA) {
        // Get owner's blockchain address
        const ownerAddress = await this.getBlockchainAddress(ownerType, ownerId);
        
        if (ownerAddress) {
          try {
            // Register on blockchain
            const { objectHash, transactionId } = await this.securityManager.registerObject(
              objectId,
              {
                id: objectId,
                ownerType,
                ownerId,
                objectType,
                metadata: {
                  createdAt: now,
                  updatedAt: now,
                  size: fullMetadata.size,
                  contentType: fullMetadata.contentType
                }
              },
              ownerAddress
            );
            
            // Update S2DO object with blockchain verification
            await updateDoc(doc(db, 's2doObjects', objectId), {
              'metadata.blockchainVerification': {
                hash: objectHash,
                transactionId,
                timestamp: Timestamp.now(),
                status: true
              }
            });
          } catch (error) {
            console.error('Error registering S2DO object on blockchain:', error);
            // Continue without blockchain verification
          }
        }
      }
      
      // Log activity
      await ActivityLoggerService.logActivity(
        ownerType,
        ownerId,
        'CREATE_S2DO_OBJECT',
        'object',
        objectId,
        'success',
        {
          objectType,
          encryptionLevel,
          accessLevel
        }
      );
      
      return s2doObject;
    } catch (error) {
      console.error('Error creating S2DO object:', error);
      throw error;
    }
  }

  /**
   * Get an S2DO object's metadata
   */
  public async getObjectMetadata(objectId: string): Promise<S2DOObject | null> {
    try {
      const objectDoc = await getDoc(doc(db, 's2doObjects', objectId));
      
      if (!objectDoc.exists()) {
        return null;
      }
      
      return objectDoc.data() as S2DOObject;
    } catch (error) {
      console.error('Error getting S2DO object metadata:', error);
      throw error;
    }
  }

  /**
   * Get an S2DO object's data
   */
  public async getObjectData<T>(objectId: string, userId: string): Promise<T | null> {
    try {
      // Get the object metadata
      const objectMetadata = await this.getObjectMetadata(objectId);
      
      if (!objectMetadata) {
        throw new Error('Object not found');
      }
      
      // Check access permissions
      if (!this.checkAccessPermissions(objectMetadata, userId)) {
        throw new Error('Access denied');
      }
      
      // Get the object data from storage
      const response = await fetch(objectMetadata.storageUrl);
      const storedData: S2DOStoredData<T> = await response.json();
      
      // If the data is encrypted, decrypt it
      if (storedData.encrypted) {
        // Get the encryption key
        const encryptionKey = await this.getEncryptionKey(objectId, userId);
        
        if (!encryptionKey) {
          throw new Error('Encryption key not available');
        }
        
        // Decrypt the data
        const decryptedDataString = this.decryptData(
          storedData.data as string,
          encryptionKey,
          objectMetadata.encryptionLevel
        );
        
        return JSON.parse(decryptedDataString);
      } else {
        // Return unencrypted data
        return storedData.data as T;
      }
    } catch (error) {
      console.error('Error getting S2DO object data:', error);
      throw error;
    }
  }

  /**
   * Update an S2DO object's data
   */
  public async updateObjectData<T>(
    objectId: string,
    data: T,
    userId: string,
    updateMetadata: Partial<S2DOMetadata> = {}
  ): Promise<S2DOObject> {
    try {
      // Get the object metadata
      const objectMetadata = await this.getObjectMetadata(objectId);
      
      if (!objectMetadata) {
        throw new Error('Object not found');
      }
      
      // Check write permissions
      if (!this.checkWritePermissions(objectMetadata, userId)) {
        throw new Error('Write access denied');
      }
      
      // Process data based on existing encryption level
      let storedData: S2DOStoredData<T>;
      const encryptionLevel = objectMetadata.encryptionLevel;
      
      if (encryptionLevel !== S2DOEncryptionLevel.NONE) {
        // Get the encryption key
        const encryptionKey = await this.getEncryptionKey(objectId, userId);
        
        if (!encryptionKey) {
          throw new Error('Encryption key not available');
        }
        
        // Encrypt the data
        const encryptedData = this.encryptData(JSON.stringify(data), encryptionKey, encryptionLevel);
        
        storedData = {
          encrypted: true,
          encryptionLevel,
          data: encryptedData,
          schema: typeof data === 'object' ? this.getObjectSchema(data) : undefined,
          version: '1.0'
        };
      } else {
        storedData = {
          encrypted: false,
          data,
          schema: typeof data === 'object' ? this.getObjectSchema(data) : undefined,
          version: '1.0'
        };
      }
      
      // Update data in storage
      const storageUrl = await this.storeObjectData(
        objectId,
        objectMetadata.ownerType,
        objectMetadata.ownerId,
        objectMetadata.objectType,
        storedData
      );
      
      // Update metadata
      const now = Timestamp.now();
      const updatedMetadata = {
        ...objectMetadata.metadata,
        ...updateMetadata,
        updatedAt: now,
        size: JSON.stringify(data).length,
        version: (parseFloat(objectMetadata.metadata.version || '1.0') + 0.1).toFixed(1)
      };
      
      // Update S2DO object record
      const updatedObject: S2DOObject = {
        ...objectMetadata,
        storageUrl,
        metadata: updatedMetadata,
        updatedAt: now
      };
      
      await updateDoc(doc(db, 's2doObjects', objectId), {
        storageUrl,
        metadata: updatedMetadata,
        updatedAt: now
      });
      
      // Update blockchain verification if needed
      if (
        encryptionLevel === S2DOEncryptionLevel.HIGH ||
        encryptionLevel === S2DOEncryptionLevel.ULTRA
      ) {
        // Get owner's blockchain address
        const ownerAddress = await this.getBlockchainAddress(
          objectMetadata.ownerType,
          objectMetadata.ownerId
        );
        
        if (ownerAddress) {
          try {
            // Register updated object on blockchain
            const { objectHash, transactionId } = await this.securityManager.registerObject(
              objectId,
              {
                id: objectId,
                ownerType: objectMetadata.ownerType,
                ownerId: objectMetadata.ownerId,
                objectType: objectMetadata.objectType,
                metadata: {
                  updatedAt: now,
                  size: updatedMetadata.size,
                  version: updatedMetadata.version
                }
              },
              ownerAddress
            );
            
            // Update S2DO object with blockchain verification
            await updateDoc(doc(db, 's2doObjects', objectId), {
              'metadata.blockchainVerification': {
                hash: objectHash,
                transactionId,
                timestamp: Timestamp.now(),
                status: true
              }
            });
          } catch (error) {
            console.error('Error updating S2DO object on blockchain:', error);
            // Continue without blockchain verification update
          }
        }
      }
      
      // Log activity
      await ActivityLoggerService.logActivity(
        'user',
        userId,
        'UPDATE_S2DO_OBJECT',
        'object',
        objectId,
        'success',
        {
          objectType: objectMetadata.objectType,
          version: updatedMetadata.version
        }
      );
      
      return updatedObject;
    } catch (error) {
      console.error('Error updating S2DO object data:', error);
      throw error;
    }
  }

  /**
   * Update an S2DO object's metadata
   */
  public async updateObjectMetadata(
    objectId: string,
    metadata: Partial<S2DOMetadata>,
    userId: string
  ): Promise<S2DOObject> {
    try {
      // Get the object metadata
      const objectMetadata = await this.getObjectMetadata(objectId);
      
      if (!objectMetadata) {
        throw new Error('Object not found');
      }
      
      // Check write permissions
      if (!this.checkWritePermissions(objectMetadata, userId)) {
        throw new Error('Write access denied');
      }
      
      // Update metadata
      const now = Timestamp.now();
      const updatedMetadata = {
        ...objectMetadata.metadata,
        ...metadata,
        updatedAt: now
      };
      
      // Update S2DO object record
      await updateDoc(doc(db, 's2doObjects', objectId), {
        metadata: updatedMetadata,
        updatedAt: now
      });
      
      // Return updated object
      return {
        ...objectMetadata,
        metadata: updatedMetadata,
        updatedAt: now
      };
    } catch (error) {
      console.error('Error updating S2DO object metadata:', error);
      throw error;
    }
  }

  /**
   * Update an S2DO object's permissions
   */
  public async updateObjectPermissions(
    objectId: string,
    permissions: Partial<S2DOObject['permissions']>,
    accessLevel?: S2DOAccessLevel,
    userId: string
  ): Promise<S2DOObject> {
    try {
      // Get the object metadata
      const objectMetadata = await this.getObjectMetadata(objectId);
      
      if (!objectMetadata) {
        throw new Error('Object not found');
      }
      
      // Check if user is the owner
      if (
        objectMetadata.ownerType === 'user' && objectMetadata.ownerId !== userId ||
        objectMetadata.ownerType === 'organization' && !await this.isOrganizationAdmin(objectMetadata.ownerId, userId)
      ) {
        throw new Error('Only the owner can modify permissions');
      }
      
      // Update permissions
      const updatedPermissions = {
        ...objectMetadata.permissions,
        ...permissions
      };
      
      // If access level is provided, update public access flag
      if (accessLevel) {
        updatedPermissions.publicAccess = accessLevel === S2DOAccessLevel.PUBLIC;
      }
      
      // Update S2DO object record
      const now = Timestamp.now();
      await updateDoc(doc(db, 's2doObjects', objectId), {
        permissions: updatedPermissions,
        accessLevel: accessLevel || objectMetadata.accessLevel,
        updatedAt: now
      });
      
      // Log activity
      await ActivityLoggerService.logActivity(
        'user',
        userId,
        'UPDATE_S2DO_PERMISSIONS',
        'object',
        objectId,
        'success',
        {
          accessLevel: accessLevel || objectMetadata.accessLevel,
          publicAccess: updatedPermissions.publicAccess
        }
      );
      
      // Return updated object
      return {
        ...objectMetadata,
        permissions: updatedPermissions,
        accessLevel: accessLevel || objectMetadata.accessLevel,
        updatedAt: now
      };
    } catch (error) {
      console.error('Error updating S2DO object permissions:', error);
      throw error;
    }
  }

  /**
   * Archive an S2DO object
   */
  public async archiveObject(
    objectId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Get the object metadata
      const objectMetadata = await this.getObjectMetadata(objectId);
      
      if (!objectMetadata) {
        throw new Error('Object not found');
      }
      
      // Check if user is the owner
      if (
        objectMetadata.ownerType === 'user' && objectMetadata.ownerId !== userId ||
        objectMetadata.ownerType === 'organization' && !await this.isOrganizationAdmin(objectMetadata.ownerId, userId)
      ) {
        throw new Error('Only the owner can archive objects');
      }
      
      // Update S2DO object status
      const now = Timestamp.now();
      await updateDoc(doc(db, 's2doObjects', objectId), {
        status: 'archived',
        updatedAt: now
      });
      
      // Log activity
      await ActivityLoggerService.logActivity(
        'user',
        userId,
        'ARCHIVE_S2DO_OBJECT',
        'object',
        objectId,
        'success'
      );
      
      return true;
    } catch (error) {
      console.error('Error archiving S2DO object:', error);
      throw error;
    }
  }

  /**
   * Delete an S2DO object
   */
  public async deleteObject(
    objectId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Get the object metadata
      const objectMetadata = await this.getObjectMetadata(objectId);
      
      if (!objectMetadata) {
        throw new Error('Object not found');
      }
      
      // Check if user is the owner
      if (
        objectMetadata.ownerType === 'user' && objectMetadata.ownerId !== userId ||
        objectMetadata.ownerType === 'organization' && !await this.isOrganizationAdmin(objectMetadata.ownerId, userId)
      ) {
        throw new Error('Only the owner can delete objects');
      }
      
      // Soft delete - update status to deleted
      const now = Timestamp.now();
      await updateDoc(doc(db, 's2doObjects', objectId), {
        status: 'deleted',
        updatedAt: now
      });
      
      // Log activity
      await ActivityLoggerService.logActivity(
        'user',
        userId,
        'DELETE_S2DO_OBJECT',
        'object',
        objectId,
        'success'
      );
      
      return true;
    } catch (error) {
      console.error('Error deleting S2DO object:', error);
      throw error;
    }
  }

  /**
   * Get S2DO objects by owner
   */
  public async getObjectsByOwner(
    ownerType: 'user' | 'organization' | 'agent',
    ownerId: string,
    objectType?: S2DOObjectType,
    status: 'active' | 'archived' | 'deleted' = 'active',
    userId: string
  ): Promise<S2DOObject[]> {
    try {
      // Check if user has access to owner's objects
      if (
        ownerType === 'user' && ownerId !== userId ||
        ownerType === 'organization' && !await this.isOrganizationMember(ownerId, userId)
      ) {
        throw new Error('Access denied to owner\'s objects');
      }
      
      // Build query
      let objectsQuery = query(
        collection(db, 's2doObjects'),
        where('ownerType', '==', ownerType),
        where('ownerId', '==', ownerId),
        where('status', '==', status)
      );
      
      // Add object type filter if provided
      if (objectType) {
        objectsQuery = query(
          objectsQuery,
          where('objectType', '==', objectType)
        );
      }
      
      // Execute query
      const querySnapshot = await getDocs(objectsQuery);
      
      // Return results
      return querySnapshot.docs.map(doc => doc.data() as S2DOObject);
    } catch (error) {
      console.error('Error getting S2DO objects by owner:', error);
      throw error;
    }
  }

  /**
   * Get S2DO objects by access permission
   */
  public async getAccessibleObjects(
    userId: string,
    objectType?: S2DOObjectType,
    status: 'active' | 'archived' | 'deleted' = 'active'
  ): Promise<S2DOObject[]> {
    try {
      // Get user's organizations
      const orgMemberships = await this.getUserOrganizations(userId);
      
      // Build query for public objects
      let publicObjectsQuery = query(
        collection(db, 's2doObjects'),
        where('permissions.publicAccess', '==', true),
        where('status', '==', status)
      );
      
      // Add object type filter if provided
      if (objectType) {
        publicObjectsQuery = query(
          publicObjectsQuery,
          where('objectType', '==', objectType)
        );
      }
      
      // Execute query for public objects
      const publicObjectsSnapshot = await getDocs(publicObjectsQuery);
      const publicObjects = publicObjectsSnapshot.docs.map(doc => doc.data() as S2DOObject);
      
      // Build query for objects shared directly with user
      let userObjectsQuery = query(
        collection(db, 's2doObjects'),
        where('permissions.authorizedUsers', 'array-contains', userId),
        where('status', '==', status)
      );
      
      // Add object type filter if provided
      if (objectType) {
        userObjectsQuery = query(
          userObjectsQuery,
          where('objectType', '==', objectType)
        );
      }
      
      // Execute query for user objects
      const userObjectsSnapshot = await getDocs(userObjectsQuery);
      const userObjects = userObjectsSnapshot.docs.map(doc => doc.data() as S2DOObject);
      
      // Build query for objects shared with user's organizations
      const orgObjects: S2DOObject[] = [];
      
      for (const orgId of orgMemberships) {
        let orgObjectsQuery = query(
          collection(db, 's2doObjects'),
          where('permissions.authorizedOrganizations', 'array-contains', orgId),
          where('status', '==', status)
        );
        
        // Add object type filter if provided
        if (objectType) {
          orgObjectsQuery = query(
            orgObjectsQuery,
            where('objectType', '==', objectType)
          );
        }
        
        // Execute query for organization objects
        const orgObjectsSnapshot = await getDocs(orgObjectsQuery);
        orgObjects.push(...orgObjectsSnapshot.docs.map(doc => doc.data() as S2DOObject));
      }
      
      // Combine results and remove duplicates
      const allObjects = [...publicObjects, ...userObjects, ...orgObjects];
      const uniqueObjects = this.removeDuplicateObjects(allObjects);
      
      return uniqueObjects;
    } catch (error) {
      console.error('Error getting accessible S2DO objects:', error);
      throw error;
    }
  }

  /**
   * Search S2DO objects by metadata
   */
  public async searchObjects(
    userId: string,
    searchParams: {
      title?: string;
      tags?: string[];
      objectType?: S2DOObjectType;
      createdAfter?: Date;
      createdBefore?: Date;
      updatedAfter?: Date;
      updatedBefore?: Date;
      ownerType?: 'user' | 'organization' | 'agent';
      ownerId?: string;
    },
    status: 'active' | 'archived' | 'deleted' = 'active'
  ): Promise<S2DOObject[]> {
    try {
      // Get accessible objects
      const accessibleObjects = await this.getAccessibleObjects(
        userId,
        searchParams.objectType,
        status
      );
      
      // Filter by search parameters
      return accessibleObjects.filter(obj => {
        // Owner type and ID
        if (searchParams.ownerType && obj.ownerType !== searchParams.ownerType) return false;
        if (searchParams.ownerId && obj.ownerId !== searchParams.ownerId) return false;
        
        // Title search (case insensitive)
        if (
          searchParams.title && 
          (!obj.metadata.title || 
           !obj.metadata.title.toLowerCase().includes(searchParams.title.toLowerCase()))
        ) {
          return false;
        }
        
        // Tags search (any match)
        if (
          searchParams.tags && 
          searchParams.tags.length > 0 &&
          (!obj.metadata.tags || 
           !searchParams.tags.some(tag => obj.metadata.tags?.includes(tag)))
        ) {
          return false;
        }
        
        // Date ranges
        if (searchParams.createdAfter && 
            obj.createdAt.toDate() < searchParams.createdAfter) {
          return false;
        }
        
        if (searchParams.createdBefore && 
            obj.createdAt.toDate() > searchParams.createdBefore) {
          return false;
        }
        
        if (searchParams.updatedAfter && 
            obj.updatedAt.toDate() < searchParams.updatedAfter) {
          return false;
        }
        
        if (searchParams.updatedBefore && 
            obj.updatedAt.toDate() > searchParams.updatedBefore) {
          return false;
        }
        
        return true;
      });
    } catch (error) {
      console.error('Error searching S2DO objects:', error);
      throw error;
    }
  }

  /**
   * Verify an S2DO object against blockchain
   */
  public async verifyObjectOnBlockchain(
    objectId: string,
    userId: string
  ): Promise<{ verified: boolean; details?: any }> {
    try {
      // Get the object metadata
      const objectMetadata = await this.getObjectMetadata(objectId);
      
      if (!objectMetadata) {
        throw new Error('Object not found');
      }
      
      // Check access permissions
      if (!this.checkAccessPermissions(objectMetadata, userId)) {
        throw new Error('Access denied');
      }
      
      // Check if object has blockchain verification
      if (!objectMetadata.metadata.blockchainVerification?.hash) {
        return { verified: false, details: 'No blockchain verification found' };
      }
      
      // Verify against blockchain
      const verificationResult = await this.securityManager.verifyObjectHash(
        objectId,
        objectMetadata.metadata.blockchainVerification.hash
      );
      
      return {
        verified: verificationResult.verified,
        details: verificationResult.blockchainRecord
      };
    } catch (error) {
      console.error('Error verifying S2DO object on blockchain:', error);
      throw error;
    }
  }

  // Private utility methods

  /**
   * Generate an encryption key based on encryption level
   */
  private generateEncryptionKey(encryptionLevel: S2DOEncryptionLevel): string {
    // Generate a random key of appropriate strength
    let keyLength = 32; // Default for STANDARD
    
    if (encryptionLevel === S2DOEncryptionLevel.HIGH) {
      keyLength = 48;
    } else if (encryptionLevel === S2DOEncryptionLevel.ULTRA) {
      keyLength = 64;
    }
    
    return CryptoJS.lib.WordArray.random(keyLength).toString();
  }

  /**
   * Encrypt data using specified encryption level
   */
  private encryptData(
    data: string,
    key: string,
    encryptionLevel: S2DOEncryptionLevel
  ): string {
    if (encryptionLevel === S2DOEncryptionLevel.STANDARD) {
      // Standard AES-256 encryption
      return CryptoJS.AES.encrypt(data, key).toString();
    } else if (encryptionLevel === S2DOEncryptionLevel.HIGH) {
      // Triple encryption with different derived keys
      const key1 = CryptoJS.PBKDF2(key, CryptoJS.lib.WordArray.random(16), { keySize: 8, iterations: 1000 }).toString();
      const key2 = CryptoJS.PBKDF2(key, CryptoJS.lib.WordArray.random(16), { keySize: 8, iterations: 2000 }).toString();
      
      const firstPass = CryptoJS.AES.encrypt(data, key).toString();
      const secondPass = CryptoJS.AES.encrypt(firstPass, key1).toString();
      return CryptoJS.AES.encrypt(secondPass, key2).toString();
    } else if (encryptionLevel === S2DOEncryptionLevel.ULTRA) {
      // Ultra-secure encryption with multiple algorithms and rounds
      const key1 = CryptoJS.PBKDF2(key, CryptoJS.lib.WordArray.random(32), { keySize: 16, iterations: 2000 }).toString();
      const key2 = CryptoJS.PBKDF2(key, CryptoJS.lib.WordArray.random(32), { keySize: 16, iterations: 3000 }).toString();
      const key3 = CryptoJS.PBKDF2(key, CryptoJS.lib.WordArray.random(32), { keySize: 16, iterations: 4000 }).toString();
      
      // Initial AES encryption
      const firstPass = CryptoJS.AES.encrypt(data, key).toString();
      
      // Second round with different algorithm
      const salt = CryptoJS.lib.WordArray.random(16);
      const secondPass = CryptoJS.TripleDES.encrypt(firstPass, key1, { salt }).toString();
      
      // Third round with AES again
      const thirdPass = CryptoJS.AES.encrypt(secondPass, key2, { mode: CryptoJS.mode.CBC }).toString();
      
      // Final round
      return CryptoJS.AES.encrypt(thirdPass, key3, { mode: CryptoJS.mode.CTR }).toString();
    }
    
    // Fallback to standard encryption
    return CryptoJS.AES.encrypt(data, key).toString();
  }

  /**
   * Decrypt data using specified encryption level
   */
  private decryptData(
    encryptedData: string,
    key: string,
    encryptionLevel: S2DOEncryptionLevel
  ): string {
    try {
      if (encryptionLevel === S2DOEncryptionLevel.STANDARD) {
        // Standard AES-256 decryption
        return CryptoJS.AES.decrypt(encryptedData, key).toString(CryptoJS.enc.Utf8);
      } else if (encryptionLevel === S2DOEncryptionLevel.HIGH) {
        // Triple decryption with different derived keys
        const key1 = CryptoJS.PBKDF2(key, CryptoJS.lib.WordArray.random(16), { keySize: 8, iterations: 1000 }).toString();
        const key2 = CryptoJS.PBKDF2(key, CryptoJS.lib.WordArray.random(16), { keySize: 8, iterations: 2000 }).toString();
        
        const firstPass = CryptoJS.AES.decrypt(encryptedData, key2).toString(CryptoJS.enc.Utf8);
        const secondPass = CryptoJS.AES.decrypt(firstPass, key1).toString(CryptoJS.enc.Utf8);
        return CryptoJS.AES.decrypt(secondPass, key).toString(CryptoJS.enc.Utf8);
      } else if (encryptionLevel === S2DOEncryptionLevel.ULTRA) {
        // Ultra-secure decryption with multiple algorithms and rounds
        const key1 = CryptoJS.PBKDF2(key, CryptoJS.lib.WordArray.random(32), { keySize: 16, iterations: 2000 }).toString();
        const key2 = CryptoJS.PBKDF2(key, CryptoJS.lib.WordArray.random(32), { keySize: 16, iterations: 3000 }).toString();
        const key3 = CryptoJS.PBKDF2(key, CryptoJS.lib.WordArray.random(32), { keySize: 16, iterations: 4000 }).toString();
        
        // Reverse the encryption steps
        const firstPass = CryptoJS.AES.decrypt(encryptedData, key3, { mode: CryptoJS.mode.CTR }).toString(CryptoJS.enc.Utf8);
        const secondPass = CryptoJS.AES.decrypt(firstPass, key2, { mode: CryptoJS.mode.CBC }).toString(CryptoJS.enc.Utf8);
        const thirdPass = CryptoJS.TripleDES.decrypt(secondPass, key1).toString(CryptoJS.enc.Utf8);
        return CryptoJS.AES.decrypt(thirdPass, key).toString(CryptoJS.enc.Utf8);
      }
      
      // Fallback to standard decryption
      return CryptoJS.AES.decrypt(encryptedData, key).toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Error decrypting data:', error);
      throw new Error('Failed to decrypt data. The encryption key may be incorrect.');
    }
  }

  /**
   * Store encryption key securely
   */
  private async storeEncryptionKey(
    objectId: string,
    encryptionKey: string,
    encryptionLevel: S2DOEncryptionLevel
  ): Promise<void> {
    try {
      // Create a random ID for the key record
      const keyId = `key_${objectId}`;
      
      // Store the key
      await setDoc(doc(db, 's2doEncryptionKeys', keyId), {
        objectId,
        key: encryptionKey,
        level: encryptionLevel,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error storing encryption key:', error);
      throw error;
    }
  }

  /**
   * Retrieve encryption key
   */
  private async getEncryptionKey(
    objectId: string,
    userId: string
  ): Promise<string | null> {
    try {
      // Get the object metadata to check permissions
      const objectMetadata = await this.getObjectMetadata(objectId);
      
      if (!objectMetadata) {
        throw new Error('Object not found');
      }
      
      // Check access permissions
      if (!this.checkAccessPermissions(objectMetadata, userId)) {
        throw new Error('Access denied');
      }
      
      // Get the encryption key
      const keyDoc = await getDoc(doc(db, 's2doEncryptionKeys', `key_${objectId}`));
      
      if (!keyDoc.exists()) {
        return null;
      }
      
      return keyDoc.data().key;
    } catch (error) {
      console.error('Error getting encryption key:', error);
      return null;
    }
  }

  /**
   * Store object data in Firebase Storage
   */
  private async storeObjectData<T>(
    objectId: string,
    ownerType: string,
    ownerId: string,
    objectType: S2DOObjectType,
    data: S2DOStoredData<T>
  ): Promise<string> {
    try {
      // Create storage reference
      const path = `s2do/${ownerType}/${ownerId}/${objectType}/${objectId}`;
      const fileRef = storageRef(storage, path);
      
      // Convert data to JSON string and create blob
      const dataBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      
      // Upload data
      await uploadBytes(fileRef, dataBlob);
      
      // Get download URL
      return await getDownloadURL(fileRef);
    } catch (error) {
      console.error('Error storing object data:', error);
      throw error;
    }
  }

  /**
   * Check if user has access to an object
   */
  private checkAccessPermissions(object: S2DOObject, userId: string): boolean {
    // Owner always has access
    if (object.ownerType === 'user' && object.ownerId === userId) {
      return true;
    }
    
    // Public objects are accessible to all
    if (object.permissions.publicAccess) {
      return true;
    }
    
    // Check authorized users
    if (object.permissions.authorizedUsers.includes(userId)) {
      return true;
    }
    
    // Check authorized organizations
    // In a real implementation, this would check if the user is a member of any authorized organization
    // For now, we'll assume that's handled by the calling code
    
    return false;
  }

  /**
   * Check if user has write permissions for an object
   */
  private checkWritePermissions(object: S2DOObject, userId: string): boolean {
    // Only owner or organization admin has write permissions
    if (object.ownerType === 'user') {
      return object.ownerId === userId;
    } else if (object.ownerType === 'organization') {
      // In a real implementation, this would check if the user is an admin of the organization
      // For now, we'll assume that's handled by the calling code
      return true;
    }
    
    return false;
  }

  /**
   * Get blockchain address for owner
   */
  private async getBlockchainAddress(
    ownerType: string,
    ownerId: string
  ): Promise<string | null> {
    try {
      if (ownerType === 'user') {
        const userDoc = await getDoc(doc(db, 'users', ownerId));
        
        if (!userDoc.exists()) {
          return null;
        }
        
        return userDoc.data().blockchainAddress || null;
      } else if (ownerType === 'organization') {
        const orgDoc = await getDoc(doc(db, 'organizations', ownerId));
        
        if (!orgDoc.exists()) {
          return null;
        }
        
        return orgDoc.data().blockchainVerification?.address || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting blockchain address:', error);
      return null;
    }
  }

  /**
   * Check if user is member of an organization
   */
  private async isOrganizationMember(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const memberDoc = await getDoc(doc(db, 'organizations', organizationId, 'members', userId));
      return memberDoc.exists();
    } catch (error) {
      console.error('Error checking organization membership:', error);
      return false;
    }
  }

  /**
   * Check if user is admin of an organization
   */
  private async isOrganizationAdmin(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const memberDoc = await getDoc(doc(db, 'organizations', organizationId, 'members', userId));
      
      if (!memberDoc.exists()) {
        return false;
      }
      
      return memberDoc.data().role === 'admin';
    } catch (error) {
      console.error('Error checking organization admin status:', error);
      return false;
    }
  }

  /**
   * Get user's organizations
   */
  private async getUserOrganizations(userId: string): Promise<string[]> {
    try {
      const membershipQuery = query(
        collection(db, 'organizations'),
        where(`members.${userId}`, '!=', null)
      );
      
      const querySnapshot = await getDocs(membershipQuery);
      return querySnapshot.docs.map(doc => doc.id);
    } catch (error) {
      console.error('Error getting user organizations:', error);
      return [];
    }
  }

  /**
   * Remove duplicate objects from array
   */
  private removeDuplicateObjects(objects: S2DOObject[]): S2DOObject[] {
    const uniqueIds = new Set<string>();
    return objects.filter(obj => {
      if (uniqueIds.has(obj.id)) {
        return false;
      }
      uniqueIds.add(obj.id);
      return true;
    });
  }

  /**
   * Determine content type of data
   */
  private determineContentType(data: any): string {
    if (typeof data === 'string') {
      return 'text/plain';
    } else if (Array.isArray(data)) {
      return 'application/json';
    } else if (typeof data === 'object') {
      // Try to determine more specific content type based on object structure
      if (data.type === 'image') {
        return `image/${data.format || 'unknown'}`;
      } else if (data.type === 'document') {
        return `application/${data.format || 'json'}`;
      } else if (data.type === 'audio') {
        return `audio/${data.format || 'unknown'}`;
      } else if (data.type === 'video') {
        return `video/${data.format || 'unknown'}`;
      }
      
      return 'application/json';
    }
    
    return 'application/octet-stream';
  }

  /**
   * Get schema of object
   */
  private getObjectSchema(data: any): string {
    // In a real implementation, this would generate a JSON Schema
    // For now, just return the keys
    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      
      const schema: Record<string, string> = {};
      for (const key of keys) {
        schema[key] = typeof data[key];
      }
      
      return JSON.stringify(schema);
    }
    
    return '';
  }
}

export default {
  S2DOManager,
  S2DOObjectType,
  S2DOEncryptionLevel,
  S2DOAccessLevel
};
