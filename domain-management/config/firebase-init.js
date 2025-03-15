/**
 * AIXTIV SYMPHONY™ Firebase Initialization
 * © 2025 AI Publishing International LLP
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * This file initializes the Firebase Admin SDK for server-side operations.
 */

// Server-side Firebase initialization (Node.js)
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://aixtiv-symphony.firebaseio.com",
  storageBucket: "aixtiv-symphony.appspot.com"
});

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

// Example helper functions for common operations
// ------------------------------------------------

// Create a new user with Firestore profile
async function createUserWithProfile(userData) {
  try {
    // Create the auth user
    const userRecord = await auth.createUser({
      email: userData.email,
      displayName: userData.displayName,
      password: userData.password,
      photoURL: userData.photoURL
    });
    
    // Generate user code
    const userCode = generateUserCode(userData.track, userData.position, userData.level);
    
    // Create the Firestore profile
    const userProfile = {
      id: userRecord.uid,
      userCode,
      track: userData.track,
      position: userData.position,
      level: userData.level,
      entityId: userData.entityId || '',
      specializedRoles: userData.specializedRoles || [],
      paymentTerm: userData.paymentTerm || 'M',
      solutions: userData.solutions || [],
      integrations: userData.integrations || [],
      securityOptions: userData.securityOptions || [],
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      verificationStatus: 'pending',
      userMetadata: userData.userMetadata || {}
    };
    
    await db.collection('users').doc(userRecord.uid).set(userProfile);
    
    return { uid: userRecord.uid, userCode };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// Generate a unique user code
function generateUserCode(track, position, level) {
  const uniqueId = Math.floor(10000 + Math.random() * 90000);
  const secondId = Math.floor(10000 + Math.random() * 90000);
  const specialCode = getRandomSpecialCode();
  
  return `${track}-${position}-${level}-${uniqueId}-${secondId}-${specialCode}`;
}

// Get random special code for user identification
function getRandomSpecialCode() {
  const specialCodes = ['VV', 'CP', 'PI', 'QA', 'RD'];
  return specialCodes[Math.floor(Math.random() * specialCodes.length)];
}

// Create a new organization
async function createOrganization(orgData, creatorUid) {
  try {
    const orgRef = db.collection('organizations').doc();
    const orgId = orgRef.id;
    
    const orgDoc = {
      id: orgId,
      name: orgData.name,
      trackType: orgData.trackType,
      description: orgData.description || '',
      website: orgData.website || '',
      logoURL: orgData.logoURL || '',
      industry: orgData.industry || '',
      size: orgData.size || '',
      address: orgData.address || {},
      contact: orgData.contact || {},
      status: 'active',
      settings: orgData.settings || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Create organization document
    await orgRef.set(orgDoc);
    
    // Add creator as admin member
    await db.collection('organizations').doc(orgId).collection('members').doc(creatorUid).set({
      userId: creatorUid,
      organizationId: orgId,
      role: 'admin',
      permissions: ['manage_members', 'manage_teams', 'manage_settings', 'manage_billing'],
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      metadata: {}
    });
    
    // Update user's entityId if they belong to this organization
    await db.collection('users').doc(creatorUid).update({
      entityId: orgId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { orgId };
  } catch (error) {
    console.error('Error creating organization:', error);
    throw error;
  }
}

// Create a new agent
async function createAgent(agentData, creatorUid) {
  try {
    const agentRef = db.collection('agents').doc();
    const agentId = agentRef.id;
    
    const agentDoc = {
      id: agentId,
      agentTypeId: agentData.agentTypeId,
      ownerType: agentData.ownerType,
      ownerId: agentData.ownerId,
      name: agentData.name,
      nickname: agentData.nickname || null,
      status: 'active',
      performanceProfile: agentData.performanceProfile || 'standard',
      appearanceSettings: agentData.appearanceSettings || {},
      communicationSettings: agentData.communicationSettings || {},
      culturalAdaptationSettings: agentData.culturalAdaptationSettings || {},
      metadata: agentData.metadata || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Create vector store if needed
    if (agentData.createVectorStore) {
      const vectorStoreRef = db.collection('vectorStores').doc();
      const vectorStoreId = vectorStoreRef.id;
      
      await vectorStoreRef.set({
        id: vectorStoreId,
        name: `${agentData.name} Knowledge Base`,
        ownerType: agentData.ownerType,
        ownerId: agentData.ownerId,
        indexName: `agent_${agentId.replace(/-/g, '_')}`,
        namespace: `agent_${agentId}`,
        dimensions: 1536, // Default for most embedding models
        status: 'active',
        metadata: {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      agentDoc.vectorStoreId = vectorStoreId;
    }
    
    // Create agent document
    await agentRef.set(agentDoc);
    
    // Set initial access for creator
    await db.collection('agents').doc(agentId).collection('access').doc(creatorUid).set({
      agentId: agentId,
      accessType: 'user',
      accessId: creatorUid,
      permissionLevel: 'admin',
      grantedAt: admin.firestore.FieldValue.serverTimestamp(),
      grantedBy: creatorUid,
      status: 'active'
    });
    
    return { agentId };
  } catch (error) {
    console.error('Error creating agent:', error);
    throw error;
  }
}

// Create a subscription
async function createSubscription(subscriptionData) {
  try {
    const subscriptionRef = db.collection('subscriptions').doc();
    const subscriptionId = subscriptionRef.id;
    
    const subscriptionDoc = {
      id: subscriptionId,
      solutionId: subscriptionData.solutionId,
      subscriberType: subscriptionData.subscriberType,
      subscriberId: subscriptionData.subscriberId,
      subscriptionTier: subscriptionData.subscriptionTier,
      status: 'active',
      startDate: admin.firestore.FieldValue.serverTimestamp(),
      endDate: subscriptionData.endDate || null,
      billingCycle: subscriptionData.billingCycle || 'monthly',
      paymentStatus: 'paid',
      settings: subscriptionData.settings || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Create NFT token if blockchain validation is enabled
    if (subscriptionData.enableBlockchain) {
      // Implementation for blockchain token generation would go here
      // This is placeholder logic
      const tokenId = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      subscriptionDoc.nftToken = tokenId;
    }
    
    await subscriptionRef.set(subscriptionDoc);
    
    return { subscriptionId };
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}

// Initialize a conversation
async function createConversation(conversationData) {
  try {
    const conversationRef = db.collection('conversations').doc();
    const conversationId = conversationRef.id;
    
    const conversationDoc = {
      id: conversationId,
      title: conversationData.title || 'New Conversation',
      initiatorType: conversationData.initiatorType,
      initiatorId: conversationData.initiatorId,
      conversationType: conversationData.conversationType || 'standard',
      status: 'active',
      metadata: conversationData.metadata || {},
      pineconeNamespace: `conv_${conversationId}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Create the conversation
    await conversationRef.set(conversationDoc);
    
    // Add participants
    const batch = db.batch();
    
    // Add initiator
    const initiatorRef = db.collection('conversations').doc(conversationId)
      .collection('participants').doc(conversationData.initiatorId);
    batch.set(initiatorRef, {
      conversationId: conversationId,
      participantType: conversationData.initiatorType,
      participantId: conversationData.initiatorId,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    });
    
    // Add other participants
    if (conversationData.participants && conversationData.participants.length > 0) {
      for (const participant of conversationData.participants) {
        const participantRef = db.collection('conversations').doc(conversationId)
          .collection('participants').doc(participant.participantId);
        batch.set(participantRef, {
          conversationId: conversationId,
          participantType: participant.participantType,
          participantId: participant.participantId,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'active'
        });
      }
    }
    
    await batch.commit();
    
    return { conversationId };
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

// Add a message to a conversation
async function addMessage(conversationId, messageData) {
  try {
    const messageRef = db.collection('conversations').doc(conversationId)
      .collection('messages').doc();
    const messageId = messageRef.id;
    
    const messageDoc = {
      id: messageId,
      conversationId: conversationId,
      senderType: messageData.senderType,
      senderId: messageData.senderId,
      content: messageData.content,
      contentType: messageData.contentType || 'text',
      parentMessageId: messageData.parentMessageId || null,
      metadata: messageData.metadata || {},
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Add vectorId if provided
    if (messageData.vectorId) {
      messageDoc.vectorId = messageData.vectorId;
    }
    
    await messageRef.set(messageDoc);
    
    // Update conversation timestamp
    await db.collection('conversations').doc(conversationId).update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { messageId };
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

// Log activity
async function logActivity(activityData) {
  try {
    const logRef = db.collection('activityLogs').doc();
    
    await logRef.set({
      id: logRef.id,
      actorType: activityData.actorType,
      actorId: activityData.actorId,
      action: activityData.action,
      resourceType: activityData.resourceType || null,
      resourceId: activityData.resourceId || null,
      status: activityData.status || 'success',
      details: activityData.details || {},
      ipAddress: activityData.ipAddress || null,
      userAgent: activityData.userAgent || null,
      performedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { logId: logRef.id };
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
}

// Export the functions for use in other modules
module.exports = {
  db,
  auth,
  storage,
  createUserWithProfile,
  createOrganization,
  createAgent,
  createSubscription,
  createConversation,
  addMessage,
  logActivity
};
