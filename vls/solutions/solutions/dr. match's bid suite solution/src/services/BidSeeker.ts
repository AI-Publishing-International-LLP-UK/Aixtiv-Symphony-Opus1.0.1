/**
 * BidSeeker.ts - Service for searching and monitoring bids
 * Implements functionality to find and track bids based on criteria
 */

import {
  Firestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  QueryConstraint,
  DocumentData,
  Timestamp,
  QuerySnapshot
} from "firebase/firestore";

import {
  Bid,
  BidSearchCriteria,
  BidSearchResult,
  BidSeekingContext,
  BidStatus,
  BidCategory,
  BidSortBy
} from "../models/Bid";

/**
 * BidSeeker - Responsible for searching and monitoring bids
 */
export class BidSeeker {
  private firestore: Firestore;
  private collectionName: string;

  /**
   * Creates a new BidSeeker instance
   * @param firestore Firestore instance
   * @param collectionName Name of the collection containing bids
   */
  constructor(firestore: Firestore, collectionName: string) {
    this.firestore = firestore;
    this.collectionName = collectionName;
  }

  /**
   * Searches for bids matching the given criteria
   * @param criteria Search criteria for finding bids
   * @param context Optional context for personalized search results
   * @returns Results of the bid search
   */
  async searchBids(
    criteria: BidSearchCriteria,
    context?: BidSeekingContext
  ): Promise<BidSearchResult> {
    // Build query constraints based on search criteria
    const queryConstraints: QueryConstraint[] = this.buildQueryConstraints(criteria);
    
    // Create the query
    const bidCollection = collection(this.firestore, this.collectionName);
    const q = query(bidCollection, ...queryConstraints);
    
    // Execute the query
    const querySnapshot = await getDocs(q);
    
    // Map documents to Bid objects
    const bids: Bid[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return this.mapDocumentToBid(doc.id, data);
    });
    
    // Personalize results if context is provided
    const personalizedBids = context ? this.personalizeResults(bids, context) : bids;
    
    // Determine if there are more results
    const hasMore = bids.length >= (criteria.limit || 10);
    
    return {
      bids: personalizedBids,
      totalCount: querySnapshot.size,
      hasMore
    };
  }

  /**
   * Monitors bids for changes in real-time
   * @param criteria Criteria to filter which bids to monitor
   * @param callback Function called when monitored bids change
   * @returns A function that can be called to stop monitoring
   */
  monitorBids(
    criteria: BidSearchCriteria,
    callback: (bids: Bid[]) => void
  ): () => void {
    // Build query constraints based on criteria
    const queryConstraints = this.buildQueryConstraints(criteria);
    
    // Create the query
    const bidCollection = collection(this.firestore, this.collectionName);
    const q = query(bidCollection, ...queryConstraints);
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const bids: Bid[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return this.mapDocumentToBid(doc.id, data);
      });
      
      // Call the callback with the updated bids
      callback(bids);
    });
    
    // Return the unsubscribe function
    return unsubscribe;
  }

  /**
   * Builds Firestore query constraints based on search criteria
   * @param criteria Search criteria
   * @returns Array of query constraints
   * @private
   */
  private buildQueryConstraints(criteria: BidSearchCriteria): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];
    
    // Filter by status
    if (criteria.statuses && criteria.statuses.length > 0) {
      constraints.push(where("status", "in", criteria.statuses));
    }
    
    // Filter by category
    if (criteria.categories && criteria.categories.length > 0) {
      constraints.push(where("category", "in", criteria.categories));
    }
    
    // Filter by amount range
    if (criteria.minAmount !== undefined) {
      constraints.push(where("amount", ">=", criteria.minAmount));
    }
    if (criteria.maxAmount !== undefined) {
      constraints.push(where("amount", "<=", criteria.maxAmount));
    }
    
    // Filter by owner
    if (criteria.ownerId) {
      constraints.push(where("ownerId", "==", criteria.ownerId));
    }
    
    // Filter by responder
    if (criteria.responderId) {
      constraints.push(where("responses.responderId", "==", criteria.responderId));
    }
    
    // Filter by tags (exact match on at least one tag)
    if (criteria.tags && criteria.tags.length > 0) {
      constraints.push(where("tags", "array-contains-any", criteria.tags));
    }
    
    // Filter by date range
    if (criteria.dateRange) {
      if (criteria.dateRange.startDate) {
        const startTimestamp = Timestamp.fromDate(criteria.dateRange.startDate);
        constraints.push(where("createdAt", ">=", startTimestamp));
      }
      if (criteria.dateRange.endDate) {
        const endTimestamp = Timestamp.fromDate(criteria.dateRange.endDate);
        constraints.push(where("createdAt", "<=", endTimestamp));
      }
    }
    
    // Handle location filters
    if (criteria.location) {
      if (criteria.location.country) {
        constraints.push(where("location.country", "==", criteria.location.country));
      }
      if (criteria.location.state) {
        constraints.push(where("location.state", "==", criteria.location.state));
      }
      if (criteria.location.city) {
        constraints.push(where("location.city", "==", criteria.location.city));
      }
      if (criteria.location.remote !== undefined) {
        constraints.push(where("location.remote", "==", criteria.location.remote));
      }
      // Note: Radius search would require geohashing or a specialized solution
    }
    
    // Add sorting
    if (criteria.sortBy) {
      const direction = criteria.sortDirection || "desc";
      switch (criteria.sortBy) {
        case BidSortBy.CREATED_AT:
          constraints.push(orderBy("createdAt", direction));
          break;
        case BidSortBy.EXPIRES_AT:
          constraints.push(orderBy("expiresAt", direction));
          break;
        case BidSortBy.AMOUNT:
          constraints.push(orderBy("amount", direction));
          break;
        // Relevance sorting would be handled in-memory
      }
    } else {
      // Default sort by createdAt descending (newest first)
      constraints.push(orderBy("createdAt", "desc"));
    }
    
    // Add pagination
    if (criteria.limit) {
      constraints.push(limit(criteria.limit));
    } else {
      constraints.push(limit(10)); // Default limit
    }
    
    // Note: offset/startAfter would require additional implementation
    
    return constraints;
  }

  /**
   * Maps a Firestore document to a Bid object
   * @param id Document ID
   * @param data Document data
   * @returns Bid object
   * @private
   */
  private mapDocumentToBid(id: string, data: DocumentData): Bid {
    return {
      id,
      title: data.title,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      status: data.status as BidStatus,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      expiresAt: data.expiresAt,
      ownerId: data.ownerId,
      ownerName: data.ownerName,
      category: data.category as BidCategory,
      tags: data.tags || [],
      location: data.location,
      requirements: data.requirements || [],
      attachments: data.attachments || [],
      visibility: data.visibility,
      responses: data.responses || [],
      metadata: data.metadata || {}
    };
  }

  /**
   * Personalizes search results based on user context
   * @param bids Array of bids to personalize
   * @param context User context for personalization
   * @returns Personalized array of bids
   * @private
   */
  private personalizeResults(bids: Bid[], context: BidSeekingContext): Bid[] {
    // In a real implementation, this would use the context to personalize results
    // Could involve re-ranking, filtering, or enhancing results based on user preferences
    
    // For now, we'll just return the original results
    return bids;
    
    // A more advanced implementation might look like:
    // return bids.filter(bid => {
    //   // Filter based on user preferences
    //   return true;
    // }).sort((a, b) => {
    //   // Sort based on relevance to user
    //   return 0;
    // });
  }
}

