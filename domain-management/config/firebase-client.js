/**
 * AIXTIV SYMPHONY™ Client-Side Firebase Initialization
 * © 2025 AI Publishing International LLP
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * This file initializes the Firebase client SDK for web applications.
 */

// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "aixtiv-symphony.firebaseapp.com",
  projectId: "aixtiv-symphony",
  storageBucket: "aixtiv-symphony.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// =================================================================================
// AUTH HELPER FUNCTIONS
// =================================================================================

// Sign in with email and password
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
};

// Sign out
export const logOut = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Get current user profile
export const getCurrentUserProfile = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      return { uid: user.uid, ...userDoc.data() };
    } else {
      console.warn("No user profile found");
      return null;
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};

// Auth state observer
export const observeAuthState = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      getDoc(doc(db, "users", user.uid))
        .then(userDoc => {
          if (userDoc.exists()) {
            callback({ uid: user.uid, ...userDoc.data() });
          } else {
            callback(null);
          }
        })
        .catch(error => {
          console.error("Error getting user profile in auth observer:", error);
          callback(null);
        });
    } else {
      callback(null);
    }
  });
};

// =================================================================================
// ORGANIZATION HELPERS
// =================================================================================

// Get user organizations
export const getUserOrganizations = async (userId) => {
  try {
    const membershipsQuery = query(
      collection(db, "organizations"), 
      where(`members.${userId}.status`, "==", "active")
    );
    
    const querySnapshot = await getDocs(membershipsQuery);
    const organizations = [];
    
    querySnapshot.forEach((doc) => {
      organizations.push({ id: doc.id, ...doc.data() });
    });
    
    return organizations;
  } catch (error) {
    console.error("Error getting user organizations:", error);
    throw error;
  }
};

// Get organization details
export const getOrganizationDetails = async (orgId) => {
  try {
    const orgDoc = await getDoc(doc(db, "organizations", orgId));
    if (orgDoc.exists()) {
      return { id: orgDoc.id, ...orgDoc.data() };
    } else {
      throw new Error("Organization not found");
    }
  } catch (error) {
    console.error("Error getting organization details:", error);
    throw error;
  }
};

// Get organization members
export const getOrganizationMembers = async (orgId) => {
  try {
    const membersQuery = query(
      collection(db, "organizations", orgId, "members"),
      where("status", "==", "active")
    );
    
    const querySnapshot = await getDocs(membersQuery);
    const members = [];
    
    querySnapshot.forEach((doc) => {
      members.push({ id: doc.id, ...doc.data() });
    });
    
    return members;
  } catch (error) {
    console.error("Error getting organization members:", error);
    throw error;
  }
};

// =================================================================================
// AGENT HELPERS
// =================================================================================

// Get user agents
export const getUserAgents = async (userId) => {
  try {
    // Query for agents owned directly by the user
    const userAgentsQuery = query(
      collection(db, "agents"),
      where("ownerType", "==", "user"),
      where("ownerId", "==", userId),
      where("status", "==", "active")
    );
    
    const querySnapshot = await getDocs(userAgentsQuery);
    const agents = [];
    
    querySnapshot.forEach((doc) => {
      agents.push({ id: doc.id, ...doc.data() });
    });
    
    // Get agents the user has access to but doesn't own
    const accessQuery = query(
      collection(db, "agents"),
      where(`access.${userId}.status`, "==", "active")
    );
    
    const accessSnapshot = await getDocs(accessQuery);
    
    accessSnapshot.forEach((doc) => {
      // Avoid duplicates
      if (!agents.some(agent => agent.id === doc.id)) {
        agents.push({ id: doc.id, ...doc.data() });
      }
    });
    
    return agents;
  } catch (error) {
    console.error("Error getting user agents:", error);
    throw error;
  }
};

// Get agent details
export const getAgentDetails = async (agentId) => {
  try {
    const agentDoc = await getDoc(doc(db, "agents", agentId));
    if (agentDoc.exists()) {
      return { id: agentDoc.id, ...agentDoc.data() };
    } else {
      throw new Error("Agent not found");
    }
  } catch (error) {
    console.error("Error getting agent details:", error);
    throw error;
  }
};

// =================================================================================
// CONVERSATION HELPERS
// =================================================================================

// Get user conversations
export const getUserConversations = async (userId, limit = 20) => {
  try {
    const participantQuery = query(
      collection(db, "conversations"),
      where(`participants.${userId}.status`, "==", "active"),
      where("status", "==", "active")
    );
    
    const querySnapshot = await getDocs(participantQuery);
    const conversations = [];
    
    querySnapshot.forEach((doc) => {
      conversations.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by most recent update
    conversations.sort((a, b) => b.updatedAt.seconds - a.updatedAt.seconds);
    
    return conversations.slice(0, limit);
  } catch (error) {
    console.error("Error getting user conversations:", error);
    throw error;
  }
};

// Get conversation messages
export const getConversationMessages = async (conversationId, limit = 50) => {
  try {
    const messagesQuery = query(
      collection(db, "conversations", conversationId, "messages"),
      where("deletedAt", "==", null)
    );
    
    const querySnapshot = await getDocs(messagesQuery);
    const messages = [];
    
    querySnapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by timestamp
    messages.sort((a, b) => a.sentAt.seconds - b.sentAt.seconds);
    
    return messages.slice(Math.max(0, messages.length - limit));
  } catch (error) {
    console.error("Error getting conversation messages:", error);
    throw error;
  }
};

// Send a message
export const sendMessage = async (conversationId, messageData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    const messageRef = doc(collection(db, "conversations", conversationId, "messages"));
    const messageId = messageRef.id;
    
    const timestamp = new Date();
    
    await setDoc(messageRef, {
      id: messageId,
      conversationId: conversationId,
      senderType: 'user',
      senderId: user.uid,
      content: messageData.content,
      contentType: messageData.contentType || 'text',
      parentMessageId: messageData.parentMessageId || null,
      metadata: messageData.metadata || {},
      sentAt: timestamp,
      updatedAt: timestamp
    });
    
    // Update conversation timestamp
    await updateDoc(doc(db, "conversations", conversationId), {
      updatedAt: timestamp
    });
    
    return { messageId };
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// =================================================================================
// SUBSCRIPTION HELPERS
// =================================================================================

// Get user subscriptions
export const getUserSubscriptions = async (userId) => {
  try {
    // Direct user subscriptions
    const userSubsQuery = query(
      collection(db, "subscriptions"),
      where("subscriberType", "==", "user"),
      where("subscriberId", "==", userId),
      where("status", "==", "active")
    );
    
    const userSubsSnapshot = await getDocs(userSubsQuery);
    const subscriptions = [];
    
    userSubsSnapshot.forEach((doc) => {
      subscriptions.push({ id: doc.id, ...doc.data() });
    });
    
    // Get user's organizations
    const userOrgs = await getUserOrganizations(userId);
    
    // Get org subscriptions
    for (const org of userOrgs) {
      const orgSubsQuery = query(
        collection(db, "subscriptions"),
        where("subscriberType", "==", "organization"),
        where("subscriberId", "==", org.id),
        where("status", "==", "active")
      );
      
      const orgSubsSnapshot = await getDocs(orgSubsQuery);
      
      orgSubsSnapshot.forEach((doc) => {
        subscriptions.push({ 
          id: doc.id, 
          ...doc.data(),
          organisationName: org.name // Add org name for context
        });
      });
    }
    
    return subscriptions;
  } catch (error) {
    console.error("Error getting user subscriptions:", error);
    throw error;
  }
};

// =================================================================================
// STORAGE HELPERS
// =================================================================================

// Upload file to Firebase Storage
export const uploadFile = async (file, path) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return { path, downloadURL };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

// Export all Firebase services and helpers
export {
  app,
  db,
  auth,
  storage
};
