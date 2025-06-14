import { 
  Firestore, 
  CollectionReference, 
  DocumentReference,
  DocumentData,
  Query,
  WhereFilterOp,
  WriteBatch,
  Transaction,
  FieldPath,
  orderBy,
  where,
  limit,
  startAfter,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  collection,
  query,
  writeBatch,
  runTransaction
} from 'firebase-admin/firestore';

import { adminFirestore } from './firebase-admin';

// Error types
export class FirestoreError extends Error {
  constructor(message: string, public code: string, public originalError?: Error) {
    super(message);
    this.name = 'FirestoreError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Pagination options type
export interface PaginationOptions {
  limit?: number;
  startAfterId?: string;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
}

// Filter condition type
export interface FilterCondition {
  field: string;
  operator: WhereFilterOp;
  value: any;
}

// Base model interface that all models should extend
export interface BaseModel {
  id?: string;
  createdAt?: Date | FirebaseFirestore.Timestamp;
  updatedAt?: Date | FirebaseFirestore.Timestamp;
}

// Validator function type
export type Validator<T> = (data: Partial<T>) => boolean | Promise<boolean> | string | Promise<string> | null | Promise<null>;

/**
 * Generic Firestore adapter that provides CRUD operations for any collection
 * Can be extended for model-specific implementations or used directly
 */
export class FirestoreAdapter<T extends BaseModel> {
  protected db: Firestore;
  protected collectionRef: CollectionReference;
  protected validators: Validator<T>[] = [];

  /**
   * Creates a new FirestoreAdapter instance
   * 
   * @param collectionName - The name of the Firestore collection
   * @param validators - Optional array of validator functions
   * @param db - Optional Firestore instance (defaults to adminFirestore)
   */
  constructor(
    protected collectionName: string,
    validators: Validator<T>[] = [],
    db?: Firestore
  ) {
    this.db = db || adminFirestore;
    this.collectionRef = collection(this.db, collectionName);
    this.validators = validators;
  }

  /**
   * Validates data against all validators
   * 
   * @param data - The data to validate
   * @throws ValidationError if validation fails
   */
  async validate(data: Partial<T>): Promise<void> {
    for (const validator of this.validators) {
      const result = await validator(data);
      
      if (result === false) {
        throw new ValidationError(`Validation failed for ${this.collectionName}`);
      } else if (typeof result === 'string') {
        throw new ValidationError(result);
      }
    }
  }

  /**
   * Converts a Firestore document to the model type
   * 
   * @param doc - Firestore document
   * @returns The document data with proper typing
   */
  protected convertFromFirestore(doc: DocumentData): T {
    const data = doc.data();
    
    if (!data) {
      return { id: doc.id } as T;
    }

    // Convert Firestore Timestamps to JavaScript Dates if needed
    return {
      ...data,
      id: doc.id,
    } as T;
  }

  /**
   * Prepares data for Firestore by handling dates and removing id
   * 
   * @param data - The data to prepare for Firestore
   * @returns Firestore-ready data
   */
  protected prepareForFirestore(data: Partial<T>): DocumentData {
    const { id, ...rest } = data;
    
    // Add timestamps if creating or updating
    const now = new Date();
    const result: DocumentData = { ...rest };
    
    // Only set createdAt if it doesn't exist (for create operations)
    if (!data.createdAt) {
      result.createdAt = now;
    }
    
    // Always update the updatedAt timestamp
    result.updatedAt = now;
    
    return result;
  }

  /**
   * Creates a new document in the collection
   * 
   * @param data - The data to create
   * @returns The created document with ID
   * @throws ValidationError if validation fails
   * @throws FirestoreError for Firestore errors
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      // Validate data before creating
      await this.validate(data);
      
      const docData = this.prepareForFirestore(data);
      
      // If ID is provided, use it, otherwise let Firestore generate one
      let docRef: DocumentReference;
      if (data.id) {
        docRef = doc(this.collectionRef, data.id);
        await setDoc(docRef, docData);
      } else {
        docRef = await addDoc(this.collectionRef, docData);
      }
      
      // Get the newly created document
      const newDoc = await getDoc(docRef);
      
      return {
        ...data,
        ...this.convertFromFirestore(newDoc)
      } as T;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new FirestoreError(
        `Failed to create document in ${this.collectionName}: ${error.message}`,
        'create-failed',
        error
      );
    }
  }

  /**
   * Retrieves a document by its ID
   * 
   * @param id - The document ID
   * @returns The document data or null if not found
   * @throws FirestoreError for Firestore errors
   */
  async findById(id: string): Promise<T | null> {
    try {
      const docRef = doc(this.collectionRef, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return this.convertFromFirestore(docSnap);
    } catch (error) {
      throw new FirestoreError(
        `Failed to retrieve document with ID ${id} from ${this.collectionName}: ${error.message}`,
        'read-failed',
        error
      );
    }
  }

  /**
   * Queries documents based on filter conditions with pagination
   * 
   * @param conditions - Optional array of filter conditions
   * @param paginationOptions - Optional pagination options
   * @returns Array of documents matching the query
   * @throws FirestoreError for Firestore errors
   */
  async findMany(
    conditions: FilterCondition[] = [],
    paginationOptions: PaginationOptions = {}
  ): Promise<T[]> {
    try {
      let q: Query = this.collectionRef;
      
      // Apply filter conditions
      conditions.forEach(condition => {
        q = query(q, where(condition.field, condition.operator, condition.value));
      });
      
      // Apply pagination and ordering
      const {
        limit: limitCount = 100,
        startAfterId,
        orderByField = 'createdAt',
        orderDirection = 'desc'
      } = paginationOptions;
      
      q = query(q, orderBy(orderByField, orderDirection));
      
      // Apply cursor-based pagination if startAfterId is provided
      if (startAfterId) {
        const startAfterDoc = await getDoc(doc(this.collectionRef, startAfterId));
        if (startAfterDoc.exists()) {
          q = query(q, startAfter(startAfterDoc));
        }
      }
      
      // Apply limit
      q = query(q, limit(limitCount));
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertFromFirestore(doc));
    } catch (error) {
      throw new FirestoreError(
        `Failed to query documents in ${this.collectionName}: ${error.message}`,
        'query-failed',
        error
      );
    }
  }

  /**
   * Finds a single document matching the provided conditions
   * 
   * @param conditions - Array of filter conditions
   * @returns The first matching document or null if none found
   * @throws FirestoreError for Firestore errors
   */
  async findOne(conditions: FilterCondition[] = []): Promise<T | null> {
    const results = await this.findMany(conditions, { limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Updates a document by ID
   * 
   * @param id - The document ID
   * @param data - The data to update
   * @returns The updated document
   * @throws ValidationError if validation fails
   * @throws FirestoreError for Firestore errors
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      const docRef = doc(this.collectionRef, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new FirestoreError(
          `Document with ID ${id} not found in ${this.collectionName}`,
          'not-found'
        );
      }
      
      // Combine existing data with updates for validation
      const existingData = this.convertFromFirestore(docSnap);
      const combinedData = { ...existingData, ...data };
      
      // Validate the combined data
      await this.validate(combinedData);
      
      // Prepare and update the document
      const updateData = this.prepareForFirestore(data);
      await updateDoc(docRef, updateData);
      
      // Get the updated document
      const updatedDoc = await getDoc(docRef);
      return this.convertFromFirestore(updatedDoc);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new FirestoreError(
        `Failed to update document with ID ${id} in ${this.collectionName}: ${error.message}`,
        'update-failed',
        error
      );
    }
  }

  /**
   * Deletes a document by ID
   * 
   * @param id - The document ID
   * @returns True if the document was deleted
   * @throws FirestoreError for Firestore errors
   */
  async delete(id: string): Promise<boolean> {
    try {
      const docRef = doc(this.collectionRef, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      throw new FirestoreError(
        `Failed to delete document with ID ${id} from ${this.collectionName}: ${error.message}`,
        'delete-failed',
        error
      );
    }
  }

  /**
   * Counts documents matching the provided conditions
   * 
   * @param conditions - Optional array of filter conditions
   * @returns The count of matching documents
   * @throws FirestoreError for Firestore errors
   */
  async count(conditions: FilterCondition[] = []): Promise<number> {
    try {
      let q: Query = this.collectionRef;
      
      // Apply filter conditions
      conditions.forEach(condition => {
        q = query(q, where(condition.field, condition.operator, condition.value));
      });
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      throw new FirestoreError(
        `Failed to count documents in ${this.collectionName}: ${error.message}`,
        'count-failed',
        error
      );
    }
  }

  /**
   * Creates a batch operation for multiple writes
   * 
   * @returns A new batch operation
   */
  createBatch(): WriteBatch {
    return writeBatch(this.db);
  }

  /**
   * Performs multiple operations in a batch
   * 
   * @param operations - Function that performs batch operations
   * @returns The result of the batch commit
   * @throws FirestoreError for Firestore errors
   */
  async performBatch(operations: (batch: WriteBatch) => void): Promise<void> {
    try {
      const batch = this.createBatch();
      operations(batch);
      await batch.commit();
    } catch (error) {
      throw new FirestoreError(
        `Failed to perform batch operations in ${this.collectionName}: ${error.message}`,
        'batch-failed',
        error
      );
    }
  }

  /**
   * Performs multiple operations in a transaction
   * 
   * @param operations - Function that performs transaction operations
   * @returns The result of the transaction
   * @throws FirestoreError for Firestore errors
   */
  async performTransaction<R>(operations: (transaction: Transaction) => Promise<R>): Promise<R> {
    try {
      return await runTransaction(this.db, operations);
    } catch (error) {
      throw new FirestoreError(
        `Failed to perform transaction in ${this.collectionName}: ${error.message}`,
        'transaction-failed',
        error
      );
    }
  }

  /**
   * Adds a validator function to the adapter
   * 
   * @param validator - The validator function to add
   */
  addValidator(validator: Validator<T>): void {
    this.validators.push(validator);
  }

  /**
   * Creates a document reference
   * 
   * @param id - The document ID
   * @returns A document reference
   */
  docRef(id: string): DocumentReference {
    return doc(this.collectionRef, id);
  }
}

/**
 * Creates a required field validator
 * 
 * @param fieldName - The name of the required field
 * @returns A validator function
 */
export function requiredField<T>(fieldName: keyof T): Validator<T> {
  return (data: Partial<T>): string | null => {
    if (data[fieldName] === undefined || data[fieldName] === null || data[fieldName] === '') {
      return `Field '${String(fieldName)}' is required`;
    }
    return null;
  };
}

/**
 * Creates a validator that checks if a field matches a regular expression
 * 
 * @param fieldName - The name of the field to validate
 * @param regex - The regular expression to match
 * @param message - The error message if validation fails
 * @returns A validator function
 */
export function matchesPattern<T>(
  fieldName: keyof T,
  regex: RegExp,
  message: string
): Validator<T> {
  return (data: Partial<T>): string | null => {
    const value = data[fieldName];
    if (value !== undefined && value !== null && typeof value

