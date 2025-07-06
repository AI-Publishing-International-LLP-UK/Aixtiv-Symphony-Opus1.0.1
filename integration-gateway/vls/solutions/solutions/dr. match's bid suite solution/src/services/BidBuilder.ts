/**
 * BidBuilder.ts - Service for creating and managing bids
 * Stub implementation for the BidBuilder component
 */

import {
  Firestore,
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";

import {
  Bid,
  BidStatus,
  BidVisibility
} from "../models/Bid";

/**
 * BidBuilder - Responsible for creating and managing bids
 */
export class BidBuilder {
  private firestore: Firestore;
  private collectionName: string;

  /**
   * Creates a new BidBuilder instance
   * @param firestore Firestore instance
   * @param collectionName Name of the collection for storing bids
   */
  constructor(firestore: Firestore, collectionName: string) {
    this.firestore = firestore;
    this.collectionName = collectionName;
  }

  /**
   * Creates a new bid
   * @param bidData The data for the new bid
   * @param userId User ID of the bid creator
   * @returns The created bid
   */
  async createBid(bidData: Partial<Bid>, userId: string): Promise<Bid> {
    // Create a new bid document in Firestore
    const bidCollection = collection(this.firestore, this.collectionName);
    
    // Set default values and timestamps
    const now = Timestamp.now();
    const oneMonthLater = new Timestamp(
      now.seconds + (30 * 24 * 60 * 60), // 30 days in seconds
      now.nanoseconds
    );
    
    // Create the new bid with default values
    const newBid: Partial<Bid> = {
      ...bidData,
      ownerId: userId,
      status: bidData.status || BidStatus.DRAFT,
      visibility: bidData.visibility || BidVisibility.PRIVATE,
      createdAt: now,
      updatedAt: now,
      expiresAt: bidData.expiresAt || oneMonthLater,
      tags: bidData.tags || [],
      requirements: bidData.requirements || [],
      attachments: bidData.attachments || [],
      responses: bidData.responses || []
    };
    
    // Add the bid to Firestore
    const docRef = await addDoc(bidCollection, newBid);
    
    // Return the created bid with its ID
    return {
      id: docRef.id,
      ...newBid
    } as Bid;
  }

  /**
   * Updates an existing bid
   * @param bidId ID of the bid to update
   * @param bidData Updated bid data
   * @param userId User ID of the person doing the update
   * @returns The updated bid
   */
  async updateBid(bidId: string, bidData: Partial<Bid>, userId: string): Promise<Bid> {
    // Get reference to the bid document
    const bidRef = doc(this.firestore, this.collectionName, bidId);
    
    // Get the current bid
    const bidDoc = await getDoc(bidRef);
    
    if (!bidDoc.exists()) {
      throw new Error(`Bid with ID ${bidId} not found`);
    }
    
    const existingBid = bidDoc.data() as Bid;
    
    // Check if the user has permission to update this bid
    if (existingBid.ownerId !== userId) {
      throw new Error("You don't have permission to update this bid");
    }
    
    // Prepare the updated bid data
    const updatedBid: Partial<Bid> = {
      ...bidData,
      updatedAt: Timestamp.now(),
      // Don't allow certain fields to be updated
      id: bidId,
      ownerId: existingBid.ownerId,
      ownerName: existingBid.ownerName,
      createdAt: existingBid.createdAt
    };
    
    // Update the bid in Firestore
    await updateDoc(bidRef, updatedBid);
    
    // Return the updated bid
    return {
      ...existingBid,
      ...updatedBid,
      id: bidId
    } as Bid;
  }

  /**
   * Gets a bid by ID
   * @param bidId ID of the bid to retrieve
   * @returns The bid, or null if not found
   */
  async getBid(bidId: string): Promise<Bid | null> {
    // Get reference to the bid document
    const bidRef = doc(this.firestore, this.collectionName, bidId);
    
    // Get the bid
    const bidDoc = await getDoc(bidRef);
    
    if (!bidDoc.exists()) {
      return null;
    }
    
    // Return the bid with its ID
    return {
      id: bidId,
      ...bidDoc.data()
    } as Bid;
  }

  /**
   * Deletes a bid by ID
   * @param bidId ID of the bid to delete
   * @param userId User ID of the person deleting the bid
   * @returns True if successful, false otherwise
   */
  async deleteBid(bidId: string, userId: string): Promise<boolean> {
    // Get reference to the bid document
    const bidRef = doc(this.firestore, this.collectionName, bidId);
    
    // Get the bid
    const bidDoc = await getDoc(bidRef);
    
    if (!bidDoc.exists()) {
      return false;
    }
    
    const bid = bidDoc.data() as Bid;
    
    // Check if the user has permission to delete this bid
    if (bid.ownerId !== userId) {
      throw new Error("You don't have permission to delete this bid");
    }
    
    // Delete the bid
    await deleteDoc(bidRef);
    
    return true;
  }

  /**
   * Responds to a bid
   * @param bidId ID of the bid to respond to
   * @param responseData Response data
   * @param userId User ID of the responder
   * @returns Bid with the new response
   */
  async respondToBid(bidId: string, responseData: any, userId: string): Promise<Bid> {
    // Get reference to the bid document
    const bidRef = doc(this.firestore, this.collectionName, bidId);
    
    // Get the bid
    const bidDoc = await getDoc(bidRef);
    
    if (!bidDoc.exists()) {
      throw new Error(`Bid with ID ${bidId} not found`);
    }
    
    const bid = bidDoc.data() as Bid;
    
    // Check if the bid is open for responses
    if (bid.status !== BidStatus.OPEN) {
      throw new Error(`This bid is not open for responses (current status: ${bid.status})`);
    }
    
    // Check if the user has already responded to this bid
    const existingResponseIndex = bid.responses?.findIndex(r => r.responderId === userId) ?? -1;
    
    // Prepare the response data
    const response = {
      id: existingResponseIndex >= 0 ? bid.responses![existingResponseIndex].id : crypto.randomUUID(),
      responderId: userId,
      responderName: responseData.responderName || "Anonymous",
      proposal: responseData.proposal,
      amount: responseData.amount,
      submittedAt: Timestamp.now(),
      status: responseData.status || "submitted",
      attachments: responseData.attachments || [],
      requirementResponses: responseData.requirementResponses || [],
      notes: responseData.notes
    };
    
    // Update the bid with the new response
    const responses = [...(bid.responses || [])];
    
    if (existingResponseIndex >= 0) {
      // Update existing response
      responses[existingResponseIndex] = response;
    } else {
      // Add new response
      responses.push(response);
    }
    
    const updatedBid = {
      ...bid,
      responses,
      updatedAt: Timestamp.now()
    };
    
    // Update the bid in Firestore
    await updateDoc(bidRef, { responses, updatedAt: updatedBid.updatedAt });
    
    // Return the updated bid
    return {
      id: bidId,
      ...updatedBid
    } as Bid;
  }
