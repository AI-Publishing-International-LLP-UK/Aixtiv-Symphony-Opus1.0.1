"use strict";
/**
 * AIXTIV SYMPHONY™ Core Services
 * © 2025 AI Publishing International LLP
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This is proprietary software of AI Publishing International LLP.
 * All rights reserved. No part of this software may be reproduced,
 * modified, or distributed without prior written permission.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaysComputeService = exports.S2DOService = exports.PerformanceMetricsService = exports.ConversationService = exports.ActivityLoggerService = exports.IntegrationGatewayService = exports.AgentService = exports.OrganizationService = exports.AuthService = exports.UserService = exports.GatewayType = exports.SecurityTier = exports.PerformanceProfile = void 0;
const firebase = __importStar(require("firebase/app"));
const firestore_1 = require("firebase/firestore");
const auth_1 = require("firebase/auth");
const storage_1 = require("firebase/storage");
const functions_1 = require("firebase/functions");
const PineconeClient = __importStar(require("@pinecone-database/pinecone"));
const uuid_1 = require("uuid");
const CryptoJS = __importStar(require("crypto-js"));
const ethers_1 = require("ethers");
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
let firebaseApp;
try {
    firebaseApp = firebase.getApp();
}
catch (_a) {
    firebaseApp = firebase.initializeApp(firebaseConfig);
}
// Initialize services
const db = (0, firestore_1.getFirestore)(firebaseApp);
const auth = (0, auth_1.getAuth)(firebaseApp);
const storage = (0, storage_1.getStorage)(firebaseApp);
const functions = (0, functions_1.getFunctions)(firebaseApp);
// Initialize Pinecone
const pinecone = new PineconeClient.PineconeClient({
    apiKey: process.env.PINECONE_API_KEY || '',
    environment: process.env.PINECONE_ENVIRONMENT || ''
});
// Initialize Blockchain Provider (Ethereum example)
const provider = new ethers_1.ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
const aixtivWallet = new ethers_1.ethers.Wallet(process.env.AIXTIV_PRIVATE_KEY || '', provider);
// Core types and interfaces
const types_1 = require("./types");
var PerformanceProfile;
(function (PerformanceProfile) {
    PerformanceProfile["STANDARD"] = "standard";
    PerformanceProfile["HIGH_PERFORMANCE"] = "high-performance";
    PerformanceProfile["ULTRA_PERFORMANCE"] = "ultra-performance";
})(PerformanceProfile || (exports.PerformanceProfile = PerformanceProfile = {}));
var SecurityTier;
(function (SecurityTier) {
    SecurityTier[SecurityTier["BASIC"] = 1] = "BASIC";
    SecurityTier[SecurityTier["ENTERPRISE"] = 2] = "ENTERPRISE";
    SecurityTier[SecurityTier["OWNER_SUBSCRIBER"] = 3] = "OWNER_SUBSCRIBER";
    SecurityTier[SecurityTier["ADVANCED"] = 4] = "ADVANCED";
})(SecurityTier || (exports.SecurityTier = SecurityTier = {}));
var GatewayType;
(function (GatewayType) {
    GatewayType["OWNER"] = "owner";
    GatewayType["ENTERPRISE"] = "enterprise";
    GatewayType["OWNER_SUBSCRIBER"] = "owner-subscriber";
})(GatewayType || (exports.GatewayType = GatewayType = {}));
// User Service
class UserService {
    /**
     * Create a new user with Firebase Auth and Firestore
     */
    static createUser(email, password, userData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Create user in Firebase Auth
                const userCredential = yield (0, auth_1.createUserWithEmailAndPassword)(auth, email, password);
                const firebaseUser = userCredential.user;
                // Update display name if provided
                if (userData.displayName) {
                    yield (0, auth_1.updateProfile)(firebaseUser, {
                        displayName: userData.displayName,
                        photoURL: userData.photoURL
                    });
                }
                // Generate blockchain verification
                const blockchainAddress = userData.blockchainAddress || (yield this.generateBlockchainAddress());
                // Create user document in Firestore
                const userDocRef = (0, firestore_1.doc)(db, 'users', firebaseUser.uid);
                const now = (0, firestore_1.serverTimestamp)();
                const userDoc = {
                    id: firebaseUser.uid,
                    userCode: userData.userCode || '',
                    track: userData.track || types_1.UserType.INDIVIDUAL,
                    position: userData.position || types_1.UserType.MEMBER,
                    level: userData.level || types_1.UserType.LEVEL_INDIVIDUAL,
                    entityId: userData.entityId || '',
                    specializedRoles: userData.specializedRoles || [],
                    paymentTerm: userData.paymentTerm || types_1.UserType.MONTHLY_SUBSCRIBER,
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
                yield (0, firestore_1.setDoc)(userDocRef, userDoc);
                // Create blockchain verification record
                yield this.createBlockchainVerification('user', firebaseUser.uid, blockchainAddress);
                // If user is part of an organization, add them to the organization
                if (userData.entityId && (userData.track === types_1.UserType.CORPORATE || userData.track === types_1.UserType.ORGANIZATIONAL)) {
                    const memberDoc = {
                        userId: firebaseUser.uid,
                        organizationId: userData.entityId,
                        role: userData.position === types_1.UserType.LEADER ? 'admin' : 'member',
                        permissions: [],
                        joinedAt: now,
                        status: 'active',
                        metadata: {}
                    };
                    yield (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'organizations', userData.entityId, 'members', firebaseUser.uid), memberDoc);
                }
                // Send email verification
                yield (0, auth_1.sendEmailVerification)(firebaseUser);
                return Object.assign(Object.assign({}, userDoc), { 
                    // Replace server timestamp with actual Timestamp
                    createdAt: firestore_1.Timestamp.now(), updatedAt: firestore_1.Timestamp.now() });
            }
            catch (error) {
                console.error('Error creating user:', error);
                throw error;
            }
        });
    }
    /**
     * Get user by ID
     */
    static getUserById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'users', id));
                if (!userDoc.exists()) {
                    return null;
                }
                return userDoc.data();
            }
            catch (error) {
                console.error('Error getting user:', error);
                throw error;
            }
        });
    }
    /**
     * Get user by email
     */
    static getUserByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const usersQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'users'), (0, firestore_1.where)('email', '==', email));
                const querySnapshot = yield (0, firestore_1.getDocs)(usersQuery);
                if (querySnapshot.empty) {
                    return null;
                }
                return querySnapshot.docs[0].data();
            }
            catch (error) {
                console.error('Error getting user by email:', error);
                throw error;
            }
        });
    }
    /**
     * Update user profile
     */
    static updateUser(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userDocRef = (0, firestore_1.doc)(db, 'users', id);
                const userDoc = yield (0, firestore_1.getDoc)(userDocRef);
                if (!userDoc.exists()) {
                    return null;
                }
                const updateData = Object.assign(Object.assign({}, data), { updatedAt: (0, firestore_1.serverTimestamp)() });
                // Remove fields that shouldn't be updated directly
                delete updateData.id;
                delete updateData.createdAt;
                delete updateData.email; // Email should be updated through Firebase Auth
                yield (0, firestore_1.updateDoc)(userDocRef, updateData);
                // If display name is updated, also update it in Firebase Auth
                if (data.displayName) {
                    const currentUser = auth.currentUser;
                    if (currentUser && currentUser.uid === id) {
                        yield (0, auth_1.updateProfile)(currentUser, {
                            displayName: data.displayName,
                            photoURL: data.photoURL
                        });
                    }
                }
                // If specialized roles or track are updated, check for gateway creation
                if (data.specializedRoles || data.track || data.position) {
                    yield this.ensureUserGateways(id);
                }
                // Fetch and return the updated user
                const updatedUserDoc = yield (0, firestore_1.getDoc)(userDocRef);
                return updatedUserDoc.data();
            }
            catch (error) {
                console.error('Error updating user:', error);
                throw error;
            }
        });
    }
    /**
     * Change user type (track, position, level)
     */
    static changeUserType(userId, track, position, level) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userDocRef = (0, firestore_1.doc)(db, 'users', userId);
                const userDoc = yield (0, firestore_1.getDoc)(userDocRef);
                if (!userDoc.exists()) {
                    return null;
                }
                const updateData = {
                    updatedAt: (0, firestore_1.serverTimestamp)()
                };
                if (track)
                    updateData.track = track;
                if (position)
                    updateData.position = position;
                if (level)
                    updateData.level = level;
                // Update the user code if any component changes
                if (track || position || level) {
                    const userData = userDoc.data();
                    updateData.userCode = this.generateUserCode(track || userData.track, position || userData.position, level || userData.level, userData.entityId, userData.id, userData.specializedRoles, userData.paymentTerm);
                    // Log the type change
                    yield this.logUserTypeChange(userId, userData.track, userData.position, userData.level, track || userData.track, position || userData.position, level || userData.level);
                }
                yield (0, firestore_1.updateDoc)(userDocRef, updateData);
                // Fetch and return the updated user
                const updatedUserDoc = yield (0, firestore_1.getDoc)(userDocRef);
                return updatedUserDoc.data();
            }
            catch (error) {
                console.error('Error changing user type:', error);
                throw error;
            }
        });
    }
    /**
     * Add a specialized role to a user
     */
    static addSpecializedRole(userId, role) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userDocRef = (0, firestore_1.doc)(db, 'users', userId);
                const userDoc = yield (0, firestore_1.getDoc)(userDocRef);
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
                yield (0, firestore_1.updateDoc)(userDocRef, {
                    specializedRoles: updatedRoles,
                    updatedAt: (0, firestore_1.serverTimestamp)()
                });
                // If adding a Visionary Voice role, ensure appropriate gateways exist
                if (role === types_1.UserType.VISIONARY_VOICE) {
                    yield this.ensureUserGateways(userId);
                }
                // Fetch and return the updated user
                const updatedUserDoc = yield (0, firestore_1.getDoc)(userDocRef);
                return updatedUserDoc.data();
            }
            catch (error) {
                console.error('Error adding specialized role:', error);
                throw error;
            }
        });
    }
    /**
     * Generate a blockchain address for a user
     */
    static generateBlockchainAddress() {
        return __awaiter(this, void 0, void 0, function* () {
            // In a real implementation, this would create a secure wallet
            // Here we're just generating a random Ethereum-like address
            const wallet = ethers_1.ethers.Wallet.createRandom();
            return wallet.address;
        });
    }
    /**
     * Create blockchain verification for a record
     */
    static createBlockchainVerification(recordType, recordId, blockchainAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Create a verification hash
                const verificationHash = CryptoJS.SHA256(`${recordType}:${recordId}:${blockchainAddress}:${Date.now()}`).toString();
                // In a real implementation, this would submit a transaction to the blockchain
                // For now, we'll create a record in Firestore
                const blockchainRecord = {
                    recordType,
                    recordId,
                    blockchainAddress,
                    transactionId: `tx_${(0, uuid_1.v4)().replace(/-/g, '').substring(0, 24)}`,
                    timestamp: (0, firestore_1.serverTimestamp)(),
                    verificationHash,
                    verificationStatus: true,
                    blockchainNetwork: 'ethereum',
                    metadata: {}
                };
                const recordRef = yield (0, firestore_1.addDoc)((0, firestore_1.collection)(db, 'blockchainRecords'), blockchainRecord);
                return recordRef.id;
            }
            catch (error) {
                console.error('Error creating blockchain verification:', error);
                throw error;
            }
        });
    }
    /**
     * Log a user type change
     */
    static logUserTypeChange(userId, oldTrack, oldPosition, oldLevel, newTrack, newPosition, newLevel) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    performedAt: (0, firestore_1.serverTimestamp)()
                };
                yield (0, firestore_1.addDoc)((0, firestore_1.collection)(db, 'activityLogs'), logEntry);
            }
            catch (error) {
                console.error('Error logging user type change:', error);
            }
        });
    }
    /**
     * Generate a user code from components
     */
    static generateUserCode(track, position, level, entityId, userId, specializedRoles, paymentTerm) {
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
    static ensureUserGateways(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'users', userId));
                if (!userDoc.exists()) {
                    return;
                }
                const userData = userDoc.data();
                // Check if user needs the Owner gateway
                const needsOwnerGateway = userData.specializedRoles.includes(types_1.UserType.VISIONARY_VOICE) ||
                    userData.position === types_1.UserType.LEADER;
                // Check if user needs the Owner-Subscriber gateway
                const needsSubscriberGateway = userData.specializedRoles.includes(types_1.UserType.VISIONARY_VOICE) ||
                    userData.specializedRoles.includes(types_1.UserType.CO_PILOT);
                if (needsOwnerGateway) {
                    // Check if user already has an Owner gateway
                    const gatewaysQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'integrationGateways'), (0, firestore_1.where)('ownerType', '==', 'user'), (0, firestore_1.where)('ownerId', '==', userId), (0, firestore_1.where)('gatewayType', '==', GatewayType.OWNER));
                    const querySnapshot = yield (0, firestore_1.getDocs)(gatewaysQuery);
                    if (querySnapshot.empty) {
                        // Create Owner gateway
                        yield IntegrationGatewayService.createGateway({
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
                    const gatewaysQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'integrationGateways'), (0, firestore_1.where)('ownerType', '==', 'user'), (0, firestore_1.where)('ownerId', '==', userId), (0, firestore_1.where)('gatewayType', '==', GatewayType.OWNER_SUBSCRIBER));
                    const querySnapshot = yield (0, firestore_1.getDocs)(gatewaysQuery);
                    if (querySnapshot.empty) {
                        // Create Owner-Subscriber gateway
                        yield IntegrationGatewayService.createGateway({
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
            }
            catch (error) {
                console.error('Error ensuring user gateways:', error);
            }
        });
    }
}
exports.UserService = UserService;
// Authentication Service
class AuthService {
    /**
     * Sign in a user with email and password
     */
    static signInWithEmail(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userCredential = yield (0, auth_1.signInWithEmailAndPassword)(auth, email, password);
                const firebaseUser = userCredential.user;
                // Get the AIXTIV user profile
                const aixtivUser = yield UserService.getUserById(firebaseUser.uid);
                if (!aixtivUser) {
                    throw new Error('User profile not found');
                }
                // Update last login timestamp
                yield (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 'users', firebaseUser.uid), {
                    lastLogin: (0, firestore_1.serverTimestamp)()
                });
                // Log activity
                yield this.logUserActivity(firebaseUser.uid, 'USER_SIGN_IN', 'success');
                return { user: firebaseUser, aixtivUser };
            }
            catch (error) {
                console.error('Error signing in:', error);
                throw error;
            }
        });
    }
    /**
     * Sign out the current user
     */
    static signOut() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    // Log activity before signing out
                    yield this.logUserActivity(currentUser.uid, 'USER_SIGN_OUT', 'success');
                }
                yield (0, auth_1.signOut)(auth);
            }
            catch (error) {
                console.error('Error signing out:', error);
                throw error;
            }
        });
    }
    /**
     * Reset password for a user
     */
    static resetPassword(email) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, auth_1.sendPasswordResetEmail)(auth, email);
            }
            catch (error) {
                console.error('Error resetting password:', error);
                throw error;
            }
        });
    }
    /**
     * Get the current authenticated user
     */
    static getCurrentUser() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const unsubscribe = (0, auth_1.onAuthStateChanged)(auth, (user) => __awaiter(this, void 0, void 0, function* () {
                    unsubscribe();
                    if (!user) {
                        resolve(null);
                        return;
                    }
                    try {
                        const aixtivUser = yield UserService.getUserById(user.uid);
                        if (!aixtivUser) {
                            resolve(null);
                            return;
                        }
                        resolve({ user, aixtivUser });
                    }
                    catch (error) {
                        reject(error);
                    }
                }), reject);
            });
        });
    }
    /**
     * Generate a JWT token for a user
     */
    static generateToken(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Use Firebase Functions to generate token
                const generateTokenFn = (0, functions_1.httpsCallable)(functions, 'generateUserToken');
                const result = yield generateTokenFn({ userId });
                return result.data.token;
            }
            catch (error) {
                console.error('Error generating token:', error);
                throw error;
            }
        });
    }
    /**
     * Verify a JWT token
     */
    static verifyToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Use Firebase Functions to verify token
                const verifyTokenFn = (0, functions_1.httpsCallable)(functions, 'verifyUserToken');
                const result = yield verifyTokenFn({ token });
                return result.data;
            }
            catch (error) {
                console.error('Error verifying token:', error);
                throw error;
            }
        });
    }
    /**
     * Log user authentication activity
     */
    static logUserActivity(userId, action, status) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const logEntry = {
                    actorType: 'user',
                    actorId: userId,
                    action,
                    resourceType: 'auth',
                    resourceId: userId,
                    status,
                    performedAt: (0, firestore_1.serverTimestamp)()
                };
                yield (0, firestore_1.addDoc)((0, firestore_1.collection)(db, 'activityLogs'), logEntry);
            }
            catch (error) {
                console.error('Error logging user activity:', error);
            }
        });
    }
}
exports.AuthService = AuthService;
// Organization Service
class OrganizationService {
    /**
     * Create a new organization
     */
    static createOrganization(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Generate a unique ID if not provided
                const orgId = data.id || (0, uuid_1.v4)();
                // Set required fields
                const now = (0, firestore_1.serverTimestamp)();
                const orgData = {
                    id: orgId,
                    name: data.name || 'New Organization',
                    trackType: data.trackType || types_1.UserType.CORPORATE,
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
                if ((_a = data.blockchainVerification) === null || _a === void 0 ? void 0 : _a.address) {
                    orgData.blockchainVerification = data.blockchainVerification;
                }
                else if (data.trackType === types_1.UserType.CORPORATE || data.trackType === types_1.UserType.ORGANIZATIONAL) {
                    // Generate blockchain address for corporate or organizational entities
                    const blockchainAddress = yield this.generateBlockchainAddress();
                    orgData.blockchainVerification = {
                        address: blockchainAddress,
                        verificationStatus: false
                    };
                    // Create blockchain verification record
                    const txId = yield UserService['createBlockchainVerification']('organization', orgId, blockchainAddress);
                    orgData.blockchainVerification.transactionId = txId;
                    orgData.blockchainVerification.verificationStatus = true;
                }
                // Create the organization document
                const orgDocRef = (0, firestore_1.doc)(db, 'organizations', orgId);
                yield (0, firestore_1.setDoc)(orgDocRef, orgData);
                // Create appropriate gateways for the organization
                if (data.trackType === types_1.UserType.CORPORATE || data.trackType === types_1.UserType.ORGANIZATIONAL) {
                    yield this.createOrganizationGateways(orgId, data.name || 'New Organization');
                }
                return Object.assign(Object.assign({}, orgData), { 
                    // Replace server timestamp with actual Timestamp
                    createdAt: firestore_1.Timestamp.now(), updatedAt: firestore_1.Timestamp.now() });
            }
            catch (error) {
                console.error('Error creating organization:', error);
                throw error;
            }
        });
    }
    /**
     * Get organization by ID
     */
    static getOrganizationById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const orgDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'organizations', id));
                if (!orgDoc.exists()) {
                    return null;
                }
                return orgDoc.data();
            }
            catch (error) {
                console.error('Error getting organization:', error);
                throw error;
            }
        });
    }
    /**
     * Add a member to an organization
     */
    static addMemberToOrganization(organizationId_1, userId_1) {
        return __awaiter(this, arguments, void 0, function* (organizationId, userId, role = 'member') {
            var _a;
            try {
                // Check if organization exists
                const orgDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'organizations', organizationId));
                if (!orgDoc.exists()) {
                    throw new Error('Organization not found');
                }
                // Check if user exists
                const userDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'users', userId));
                if (!userDoc.exists()) {
                    throw new Error('User not found');
                }
                // Check if user is already a member
                const memberDocRef = (0, firestore_1.doc)(db, 'organizations', organizationId, 'members', userId);
                const memberDoc = yield (0, firestore_1.getDoc)(memberDocRef);
                if (memberDoc.exists()) {
                    // If already a member, update role if needed
                    if (((_a = memberDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== role) {
                        yield (0, firestore_1.updateDoc)(memberDocRef, {
                            role,
                            updatedAt: (0, firestore_1.serverTimestamp)()
                        });
                    }
                    return true;
                }
                // Add member document
                yield (0, firestore_1.setDoc)(memberDocRef, {
                    userId,
                    organizationId,
                    role,
                    permissions: role === 'admin' ? ['manage_members', 'manage_teams', 'manage_settings'] : [],
                    joinedAt: (0, firestore_1.serverTimestamp)(),
                    status: 'active',
                    metadata: {}
                });
                // Update user's entity ID if not already set
                const userData = userDoc.data();
                if (!(userData === null || userData === void 0 ? void 0 : userData.entityId)) {
                    yield (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 'users', userId), {
                        entityId: organizationId,
                        updatedAt: (0, firestore_1.serverTimestamp)()
                    });
                }
                return true;
            }
            catch (error) {
                console.error('Error adding member to organization:', error);
                throw error;
            }
        });
    }
    /**
     * Get all members of an organization
     */
    static getOrganizationMembers(organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const membersSnapshot = yield (0, firestore_1.getDocs)((0, firestore_1.collection)(db, 'organizations', organizationId, 'members'));
                const members = [];
                for (const memberDoc of membersSnapshot.docs) {
                    const memberData = memberDoc.data();
                    // Get basic user information
                    const userDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'users', memberData.userId));
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
            }
            catch (error) {
                console.error('Error getting organization members:', error);
                throw error;
            }
        });
    }
    /**
     * Create organization teams
     */
    static createTeam(organizationId, name, description, leaderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if organization exists
                const orgDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'organizations', organizationId));
                if (!orgDoc.exists()) {
                    throw new Error('Organization not found');
                }
                // Create team document
                const teamData = {
                    id: (0, uuid_1.v4)(),
                    organizationId,
                    name,
                    description: description || '',
                    leaderId,
                    status: 'active',
                    settings: {},
                    createdAt: (0, firestore_1.serverTimestamp)(),
                    updatedAt: (0, firestore_1.serverTimestamp)()
                };
                yield (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'teams', teamData.id), teamData);
                // If leader is provided, add them to the team
                if (leaderId) {
                    yield (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'teams', teamData.id, 'members', leaderId), {
                        userId: leaderId,
                        teamId: teamData.id,
                        role: 'leader',
                        joinedAt: (0, firestore_1.serverTimestamp)(),
                        status: 'active'
                    });
                }
                return Object.assign(Object.assign({}, teamData), { createdAt: firestore_1.Timestamp.now(), updatedAt: firestore_1.Timestamp.now() });
            }
            catch (error) {
                console.error('Error creating team:', error);
                throw error;
            }
        });
    }
    /**
     * Generate a blockchain address for an organization
     */
    static generateBlockchainAddress() {
        return __awaiter(this, void 0, void 0, function* () {
            // In a real implementation, this would create a secure wallet
            // Here we're just generating a random Ethereum-like address
            const wallet = ethers_1.ethers.Wallet.createRandom();
            return wallet.address;
        });
    }
    /**
     * Create appropriate gateways for an organization
     */
    static createOrganizationGateways(organizationId, organizationName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Create Enterprise gateway
                yield IntegrationGatewayService.createGateway({
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
                yield IntegrationGatewayService.createGateway({
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
            }
            catch (error) {
                console.error('Error creating organization gateways:', error);
            }
        });
    }
}
exports.OrganizationService = OrganizationService;
// Agent Service
class AgentService {
    /**
     * Create a new agent instance
     */
    static createAgentInstance(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Generate a unique ID if not provided
                const agentId = data.id || (0, uuid_1.v4)();
                // Set required fields
                const now = (0, firestore_1.serverTimestamp)();
                const agentData = {
                    id: agentId,
                    agentTypeId: data.agentTypeId || types_1.PilotType.DR_LUCY_R1_CORE_01,
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
                    const vectorStoreId = yield this.createAgentVectorStore(agentId, data.name || 'New Agent');
                    agentData.vectorStoreId = vectorStoreId;
                }
                // Create the agent document
                const agentDocRef = (0, firestore_1.doc)(db, 'agents', agentId);
                yield (0, firestore_1.setDoc)(agentDocRef, agentData);
                // If this is a Visionary agent, create an NFT
                if (data.agentTypeId === types_1.PilotType.DR_ROARK_PILOT) {
                    yield this.createAgentNFT(agentId, data.name || 'New Agent', data.ownerType || 'user', data.ownerId || '');
                }
                return Object.assign(Object.assign({}, agentData), { 
                    // Replace server timestamp with actual Timestamp
                    createdAt: firestore_1.Timestamp.now(), updatedAt: firestore_1.Timestamp.now() });
            }
            catch (error) {
                console.error('Error creating agent:', error);
                throw error;
            }
        });
    }
    /**
     * Get agent by ID
     */
    static getAgentById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const agentDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'agents', id));
                if (!agentDoc.exists()) {
                    return null;
                }
                return agentDoc.data();
            }
            catch (error) {
                console.error('Error getting agent:', error);
                throw error;
            }
        });
    }
    /**
     * Get agents by owner
     */
    static getAgentsByOwner(ownerType, ownerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const agentsQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'agents'), (0, firestore_1.where)('ownerType', '==', ownerType), (0, firestore_1.where)('ownerId', '==', ownerId));
                const querySnapshot = yield (0, firestore_1.getDocs)(agentsQuery);
                return querySnapshot.docs.map(doc => doc.data());
            }
            catch (error) {
                console.error('Error getting agents by owner:', error);
                throw error;
            }
        });
    }
    /**
     * Update an agent instance
     */
    static updateAgentInstance(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const agentDocRef = (0, firestore_1.doc)(db, 'agents', id);
                const agentDoc = yield (0, firestore_1.getDoc)(agentDocRef);
                if (!agentDoc.exists()) {
                    return null;
                }
                const updateData = Object.assign(Object.assign({}, data), { updatedAt: (0, firestore_1.serverTimestamp)() });
                // Remove fields that shouldn't be updated directly
                delete updateData.id;
                delete updateData.createdAt;
                delete updateData.ownerType;
                delete updateData.ownerId;
                yield (0, firestore_1.updateDoc)(agentDocRef, updateData);
                // Fetch and return the updated agent
                const updatedAgentDoc = yield (0, firestore_1.getDoc)(agentDocRef);
                return updatedAgentDoc.data();
            }
            catch (error) {
                console.error('Error updating agent:', error);
                throw error;
            }
        });
    }
    /**
     * Grant access to an agent
     */
    static grantAgentAccess(agentId, accessType, accessId, permissionLevel, grantedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if agent exists
                const agentDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'agents', agentId));
                if (!agentDoc.exists()) {
                    throw new Error('Agent not found');
                }
                // Create access document
                const accessData = {
                    agentId,
                    accessType,
                    accessId,
                    permissionLevel,
                    grantedAt: (0, firestore_1.serverTimestamp)(),
                    grantedBy,
                    status: 'active'
                };
                const accessDocId = `${accessType}_${accessId}`;
                yield (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'agents', agentId, 'access', accessDocId), accessData);
                return true;
            }
            catch (error) {
                console.error('Error granting agent access:', error);
                throw error;
            }
        });
    }
    /**
     * Create a vector store for an agent
     */
    static createAgentVectorStore(agentId, agentName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if Pinecone is initialized
                yield pinecone.init();
                // Create a unique namespace for this agent
                const namespace = `agent_${agentId.replace(/-/g, '_')}`;
                // Check if index exists, create if needed
                const indexName = 'aixtiv_symphony';
                const indexes = yield pinecone.listIndexes();
                if (!indexes.includes(indexName)) {
                    // Create the index
                    yield pinecone.createIndex({
                        name: indexName,
                        dimension: 1536, // For compatibility with common embedding models
                        metric: 'cosine'
                    });
                }
                // Create vector store record in Firestore
                const vectorStoreData = {
                    id: (0, uuid_1.v4)(),
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
                    createdAt: (0, firestore_1.serverTimestamp)(),
                    updatedAt: (0, firestore_1.serverTimestamp)()
                };
                const vectorStoreRef = (0, firestore_1.doc)(db, 'vectorStores', vectorStoreData.id);
                yield (0, firestore_1.setDoc)(vectorStoreRef, vectorStoreData);
                return vectorStoreData.id;
            }
            catch (error) {
                console.error('Error creating agent vector store:', error);
                throw error;
            }
        });
    }
    /**
     * Create an NFT for a Visionary agent
     */
    static createAgentNFT(agentId, agentName, ownerType, ownerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // In a real implementation, this would interact with blockchain to mint an NFT
                // For now, we'll create an NFT record in Firestore
                // Get owner's blockchain address
                let ownerAddress = '';
                if (ownerType === 'user') {
                    const userDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'users', ownerId));
                    if (userDoc.exists()) {
                        ownerAddress = userDoc.data().blockchainAddress || '';
                    }
                }
                else if (ownerType === 'organization') {
                    const orgDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'organizations', ownerId));
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
                    id: (0, uuid_1.v4)(),
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
                    mintedAt: (0, firestore_1.serverTimestamp)(),
                    transferHistory: [
                        {
                            fromAddress: '0x0000000000000000000000000000000000000000',
                            toAddress: ownerAddress,
                            transactionId: `tx_${(0, uuid_1.v4)().replace(/-/g, '').substring(0, 24)}`,
                            timestamp: (0, firestore_1.serverTimestamp)()
                        }
                    ]
                };
                yield (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'nftTokens', nftData.id), nftData);
                // Update agent with NFT reference
                yield (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 'agents', agentId), {
                    'metadata.nftTokenId': tokenId,
                    updatedAt: (0, firestore_1.serverTimestamp)()
                });
                return nftData.id;
            }
            catch (error) {
                console.error('Error creating agent NFT:', error);
                throw error;
            }
        });
    }
}
exports.AgentService = AgentService;
// Integration Gateway Service
class IntegrationGatewayService {
    /**
     * Create a new integration gateway
     */
    static createGateway(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Generate a unique ID if not provided
                const gatewayId = data.id || (0, uuid_1.v4)();
                // Generate a secure encryption key ID if not provided
                const encryptionKeyId = data.encryptionKeyId || (0, uuid_1.v4)();
                // Set required fields
                const now = (0, firestore_1.serverTimestamp)();
                const gatewayData = {
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
                const gatewayDocRef = (0, firestore_1.doc)(db, 'integrationGateways', gatewayId);
                yield (0, firestore_1.setDoc)(gatewayDocRef, gatewayData);
                // Create default endpoints
                yield this.createDefaultEndpoints(gatewayId, data.gatewayType || GatewayType.OWNER);
                return Object.assign(Object.assign({}, gatewayData), { 
                    // Replace server timestamp with actual Timestamp
                    createdAt: firestore_1.Timestamp.now(), updatedAt: firestore_1.Timestamp.now() });
            }
            catch (error) {
                console.error('Error creating gateway:', error);
                throw error;
            }
        });
    }
    /**
     * Get gateway by ID
     */
    static getGatewayById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const gatewayDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'integrationGateways', id));
                if (!gatewayDoc.exists()) {
                    return null;
                }
                return gatewayDoc.data();
            }
            catch (error) {
                console.error('Error getting gateway:', error);
                throw error;
            }
        });
    }
    /**
     * Get gateways by owner
     */
    static getGatewaysByOwner(ownerType, ownerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const gatewaysQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'integrationGateways'), (0, firestore_1.where)('ownerType', '==', ownerType), (0, firestore_1.where)('ownerId', '==', ownerId));
                const querySnapshot = yield (0, firestore_1.getDocs)(gatewaysQuery);
                return querySnapshot.docs.map(doc => doc.data());
            }
            catch (error) {
                console.error('Error getting gateways by owner:', error);
                throw error;
            }
        });
    }
    /**
     * Create an endpoint for a gateway
     */
    static createEndpoint(gatewayId_1, path_1, method_1, description_1) {
        return __awaiter(this, arguments, void 0, function* (gatewayId, path, method, description, requiresAuth = true, permissions = [], inputSchema = null, outputSchema = null) {
            try {
                // Check if gateway exists
                const gatewayDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'integrationGateways', gatewayId));
                if (!gatewayDoc.exists()) {
                    throw new Error('Gateway not found');
                }
                // Check if endpoint already exists
                const endpointsQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'integrationGateways', gatewayId, 'endpoints'), (0, firestore_1.where)('endpointPath', '==', path), (0, firestore_1.where)('method', '==', method));
                const querySnapshot = yield (0, firestore_1.getDocs)(endpointsQuery);
                if (!querySnapshot.empty) {
                    throw new Error('Endpoint already exists');
                }
                // Create endpoint document
                const endpointData = {
                    id: (0, uuid_1.v4)(),
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
                    createdAt: (0, firestore_1.serverTimestamp)(),
                    updatedAt: (0, firestore_1.serverTimestamp)()
                };
                yield (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'integrationGateways', gatewayId, 'endpoints', endpointData.id), endpointData);
                return Object.assign(Object.assign({}, endpointData), { createdAt: firestore_1.Timestamp.now(), updatedAt: firestore_1.Timestamp.now() });
            }
            catch (error) {
                console.error('Error creating endpoint:', error);
                throw error;
            }
        });
    }
    /**
     * Generate an API key for a gateway
     */
    static generateApiKey(gatewayId_1, keyName_1, issuedToType_1, issuedToId_1, issuedBy_1) {
        return __awaiter(this, arguments, void 0, function* (gatewayId, keyName, issuedToType, issuedToId, issuedBy, permissions = [], expiresInDays = 365) {
            try {
                // Check if gateway exists
                const gatewayDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'integrationGateways', gatewayId));
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
                    id: (0, uuid_1.v4)(),
                    gatewayId,
                    keyName,
                    keyPrefix: prefix,
                    keyHash,
                    issuedToType,
                    issuedToId,
                    issuedBy,
                    permissions,
                    status: 'active',
                    issuedAt: (0, firestore_1.serverTimestamp)(),
                    expiresAt: firestore_1.Timestamp.fromDate(expiresAt)
                };
                yield (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'integrationApiKeys', apiKeyData.id), apiKeyData);
                return {
                    keyId: apiKeyData.id,
                    apiKey,
                    prefix
                };
            }
            catch (error) {
                console.error('Error generating API key:', error);
                throw error;
            }
        });
    }
    /**
     * Validate an API key
     */
    static validateApiKey(prefix, apiKey) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Query for the API key by prefix
                const apiKeysQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'integrationApiKeys'), (0, firestore_1.where)('keyPrefix', '==', prefix), (0, firestore_1.where)('status', '==', 'active'));
                const querySnapshot = yield (0, firestore_1.getDocs)(apiKeysQuery);
                if (querySnapshot.empty) {
                    return false;
                }
                // Get the stored hash
                const storedHash = querySnapshot.docs[0].data().keyHash;
                // Verify the hash
                const calculatedHash = CryptoJS.SHA256(apiKey).toString();
                // Check if key has expired
                const expiresAt = querySnapshot.docs[0].data().expiresAt;
                if (expiresAt && expiresAt.toDate() < new Date()) {
                    return false;
                }
                // Update last used timestamp
                yield (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 'integrationApiKeys', querySnapshot.docs[0].id), {
                    lastUsedAt: (0, firestore_1.serverTimestamp)()
                });
                return calculatedHash === storedHash;
            }
            catch (error) {
                console.error('Error validating API key:', error);
                return false;
            }
        });
    }
    /**
     * Create default endpoints for a gateway
     */
    static createDefaultEndpoints(gatewayId, gatewayType) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const batch = (0, firestore_1.writeBatch)(db);
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
                        id: (0, uuid_1.v4)(),
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
                        createdAt: (0, firestore_1.serverTimestamp)(),
                        updatedAt: (0, firestore_1.serverTimestamp)()
                    };
                    const endpointRef = (0, firestore_1.doc)(db, 'integrationGateways', gatewayId, 'endpoints', endpointData.id);
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
                            id: (0, uuid_1.v4)(),
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
                            createdAt: (0, firestore_1.serverTimestamp)(),
                            updatedAt: (0, firestore_1.serverTimestamp)()
                        };
                        const endpointRef = (0, firestore_1.doc)(db, 'integrationGateways', gatewayId, 'endpoints', endpointData.id);
                        batch.set(endpointRef, endpointData);
                    }
                }
                else if (gatewayType === GatewayType.ENTERPRISE) {
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
                            id: (0, uuid_1.v4)(),
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
                            createdAt: (0, firestore_1.serverTimestamp)(),
                            updatedAt: (0, firestore_1.serverTimestamp)()
                        };
                        const endpointRef = (0, firestore_1.doc)(db, 'integrationGateways', gatewayId, 'endpoints', endpointData.id);
                        batch.set(endpointRef, endpointData);
                    }
                }
                else if (gatewayType === GatewayType.OWNER_SUBSCRIBER) {
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
                            id: (0, uuid_1.v4)(),
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
                            createdAt: (0, firestore_1.serverTimestamp)(),
                            updatedAt: (0, firestore_1.serverTimestamp)()
                        };
                        const endpointRef = (0, firestore_1.doc)(db, 'integrationGateways', gatewayId, 'endpoints', endpointData.id);
                        batch.set(endpointRef, endpointData);
                    }
                }
                yield batch.commit();
            }
            catch (error) {
                console.error('Error creating default endpoints:', error);
                throw error;
            }
        });
    }
    /**
     * Generate a Cloud Function name for an endpoint
     */
    static generateFunctionName(gatewayId, path, method) {
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
exports.IntegrationGatewayService = IntegrationGatewayService;
// Activity Logger Service
class ActivityLoggerService {
    /**
     * Log an activity
     */
    static logActivity(actorType_1, actorId_1, action_1, resourceType_1, resourceId_1) {
        return __awaiter(this, arguments, void 0, function* (actorType, actorId, action, resourceType, resourceId, status = 'success', details, ipAddress, userAgent) {
            try {
                const logEntry = {
                    id: (0, uuid_1.v4)(),
                    actorType,
                    actorId,
                    action,
                    resourceType: resourceType || null,
                    resourceId: resourceId || null,
                    status,
                    details: details || null,
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null,
                    performedAt: (0, firestore_1.serverTimestamp)()
                };
                yield (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'activityLogs', logEntry.id), logEntry);
            }
            catch (error) {
                console.error('Error logging activity:', error);
            }
        });
    }
    /**
     * Get activity logs for a resource
     */
    static getActivityForResource(resourceType_1, resourceId_1) {
        return __awaiter(this, arguments, void 0, function* (resourceType, resourceId, limit = 100) {
            try {
                const logsQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'activityLogs'), (0, firestore_1.where)('resourceType', '==', resourceType), (0, firestore_1.where)('resourceId', '==', resourceId));
                const querySnapshot = yield (0, firestore_1.getDocs)(logsQuery);
                return querySnapshot.docs
                    .map(doc => doc.data())
                    .sort((a, b) => {
                    var _a, _b;
                    // Sort manually by performedAt in descending order
                    const timeA = ((_a = a.performedAt) === null || _a === void 0 ? void 0 : _a.toMillis()) || 0;
                    const timeB = ((_b = b.performedAt) === null || _b === void 0 ? void 0 : _b.toMillis()) || 0;
                    return timeB - timeA;
                })
                    .slice(0, limit);
            }
            catch (error) {
                console.error('Error getting activity logs:', error);
                throw error;
            }
        });
    }
}
exports.ActivityLoggerService = ActivityLoggerService;
// Conversation Service
class ConversationService {
    /**
     * Create a new conversation
     */
    static createConversation(title, initiatorType, initiatorId, participants) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Create conversation document
                const conversationId = (0, uuid_1.v4)();
                const now = (0, firestore_1.serverTimestamp)();
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
                yield (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'conversations', conversationId), conversationData);
                // Add participants
                const batch = (0, firestore_1.writeBatch)(db);
                for (const participant of participants) {
                    const participantData = {
                        conversationId,
                        participantType: participant.type,
                        participantId: participant.id,
                        joinedAt: now,
                        status: 'active'
                    };
                    const participantRef = (0, firestore_1.doc)(db, 'conversations', conversationId, 'participants', `${participant.type}_${participant.id}`);
                    batch.set(participantRef, participantData);
                }
                yield batch.commit();
                return Object.assign(Object.assign({}, conversationData), { createdAt: firestore_1.Timestamp.now(), updatedAt: firestore_1.Timestamp.now(), participants });
            }
            catch (error) {
                console.error('Error creating conversation:', error);
                throw error;
            }
        });
    }
    /**
     * Add a message to a conversation
     */
    static addMessage(conversationId_1, senderType_1, senderId_1, content_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, senderType, senderId, content, contentType = 'text', parentMessageId) {
            try {
                // Check if conversation exists
                const conversationDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'conversations', conversationId));
                if (!conversationDoc.exists()) {
                    throw new Error('Conversation not found');
                }
                // Verify sender is a participant
                const participantRef = (0, firestore_1.doc)(db, 'conversations', conversationId, 'participants', `${senderType}_${senderId}`);
                const participantDoc = yield (0, firestore_1.getDoc)(participantRef);
                if (!participantDoc.exists() || participantDoc.data().status !== 'active') {
                    throw new Error('Sender is not an active participant');
                }
                // Create message document
                const messageId = (0, uuid_1.v4)();
                const now = (0, firestore_1.serverTimestamp)();
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
                yield (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'conversations', conversationId, 'messages', messageId), messageData);
                // Update conversation's updatedAt timestamp
                yield (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 'conversations', conversationId), {
                    updatedAt: now
                });
                // If HIGH_PERFORMANCE or ULTRA_PERFORMANCE agent is involved, vectorize the message
                // This would require the agent's vectorStoreId
                if (senderType === 'agent' || conversationDoc.data().metadata.vectorize) {
                    yield this.vectorizeMessage(messageId, conversationId, content, senderType, senderId);
                }
                return Object.assign(Object.assign({}, messageData), { sentAt: firestore_1.Timestamp.now(), updatedAt: firestore_1.Timestamp.now() });
            }
            catch (error) {
                console.error('Error adding message:', error);
                throw error;
            }
        });
    }
    /**
     * Get conversation messages
     */
    static getConversationMessages(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const messagesQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'conversations', conversationId, 'messages'), (0, firestore_1.where)('deletedAt', '==', null)
                // Order by sentAt in ascending order (oldest first)
                // Note: This requires an index to be created
                );
                const querySnapshot = yield (0, firestore_1.getDocs)(messagesQuery);
                return querySnapshot.docs
                    .map(doc => doc.data())
                    .sort((a, b) => {
                    var _a, _b;
                    // Sort manually by sentAt in ascending order
                    const timeA = ((_a = a.sentAt) === null || _a === void 0 ? void 0 : _a.toMillis()) || 0;
                    const timeB = ((_b = b.sentAt) === null || _b === void 0 ? void 0 : _b.toMillis()) || 0;
                    return timeA - timeB;
                });
            }
            catch (error) {
                console.error('Error getting conversation messages:', error);
                throw error;
            }
        });
    }
    /**
     * Vectorize a message for retrieval
     */
    static vectorizeMessage(messageId, conversationId, content, senderType, senderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // In a real implementation, this would:
                // 1. Generate an embedding for the message content
                // 2. Store the embedding in Pinecone
                // 3. Update the message with the vector ID
                // For now, we'll create a placeholder record
                const vectorId = `vector_${(0, uuid_1.v4)()}`;
                // Update the message with the vector ID
                yield (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 'conversations', conversationId, 'messages', messageId), {
                    vectorId,
                    'metadata.vectorized': true
                });
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
            }
            catch (error) {
                console.error('Error vectorizing message:', error);
            }
        });
    }
}
exports.ConversationService = ConversationService;
// Performance Metrics Service
class PerformanceMetricsService {
    /**
     * Record a performance metric
     */
    static recordMetric(metricType, subjectType, subjectId, value, unit, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const metricData = {
                    id: (0, uuid_1.v4)(),
                    metricType,
                    subjectType,
                    subjectId,
                    value,
                    unit: unit || null,
                    capturedAt: (0, firestore_1.serverTimestamp)(),
                    metadata: metadata || {}
                };
                yield (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'performanceMetrics', metricData.id), metricData);
            }
            catch (error) {
                console.error('Error recording metric:', error);
            }
        });
    }
    /**
     * Get metrics for a subject
     */
    static getMetricsForSubject(subjectType_1, subjectId_1, metricType_1, startDate_1, endDate_1) {
        return __awaiter(this, arguments, void 0, function* (subjectType, subjectId, metricType, startDate, endDate, limit = 100) {
            try {
                let metricsQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'performanceMetrics'), (0, firestore_1.where)('subjectType', '==', subjectType), (0, firestore_1.where)('subjectId', '==', subjectId));
                if (metricType) {
                    metricsQuery = (0, firestore_1.query)(metricsQuery, (0, firestore_1.where)('metricType', '==', metricType));
                }
                // Note: In Firestore, you can't use inequality filters on different fields
                // So we can't filter by both metricType and date range in a single query
                // We'll filter by date range programmatically
                const querySnapshot = yield (0, firestore_1.getDocs)(metricsQuery);
                return querySnapshot.docs
                    .map(doc => doc.data())
                    .filter(metric => {
                    var _a;
                    if (!startDate && !endDate)
                        return true;
                    const metricDate = ((_a = metric.capturedAt) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date(0);
                    if (startDate && metricDate < startDate)
                        return false;
                    if (endDate && metricDate > endDate)
                        return false;
                    return true;
                })
                    .sort((a, b) => {
                    var _a, _b;
                    // Sort by capturedAt in descending order (newest first)
                    const timeA = ((_a = a.capturedAt) === null || _a === void 0 ? void 0 : _a.toMillis()) || 0;
                    const timeB = ((_b = b.capturedAt) === null || _b === void 0 ? void 0 : _b.toMillis()) || 0;
                    return timeB - timeA;
                })
                    .slice(0, limit);
            }
            catch (error) {
                console.error('Error getting metrics:', error);
                throw error;
            }
        });
    }
}
exports.PerformanceMetricsService = PerformanceMetricsService;
// S2DO Service (Secure Structured Data Objects)
class S2DOService {
    /**
     * Create a new S2DO object
     */
    static createS2DOObject(ownerType_1, ownerId_1, objectType_1, data_1) {
        return __awaiter(this, arguments, void 0, function* (ownerType, ownerId, objectType, data, isPublic = false, encrypt = true) {
            try {
                // Generate a unique ID
                const objectId = (0, uuid_1.v4)();
                // Store the data in Firebase Storage
                const storageReference = (0, storage_1.ref)(storage, `s2do/${ownerType}/${ownerId}/${objectType}/${objectId}`);
                // Encrypt data if required
                let storedData;
                if (encrypt) {
                    // Generate an encryption key
                    const encryptionKey = CryptoJS.lib.WordArray.random(32).toString();
                    // Encrypt the data
                    const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(data), encryptionKey).toString();
                    // Store the encrypted data
                    storedData = JSON.stringify({
                        encrypted: true,
                        data: encryptedData
                    });
                    // Store the encryption key securely
                    yield (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 's2doEncryptionKeys', objectId), {
                        key: encryptionKey,
                        objectId,
                        ownerType,
                        ownerId,
                        createdAt: (0, firestore_1.serverTimestamp)()
                    });
                }
                else {
                    // Store unencrypted data
                    storedData = JSON.stringify({
                        encrypted: false,
                        data
                    });
                }
                // Upload the data to storage
                const dataBlob = new Blob([storedData], { type: 'application/json' });
                yield (0, storage_1.uploadBytes)(storageReference, dataBlob);
                // Get the download URL
                const downloadURL = yield (0, storage_1.getDownloadURL)(storageReference);
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
                    createdAt: (0, firestore_1.serverTimestamp)(),
                    updatedAt: (0, firestore_1.serverTimestamp)()
                };
                yield (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 's2doObjects', objectId), s2doData);
                return objectId;
            }
            catch (error) {
                console.error('Error creating S2DO object:', error);
                throw error;
            }
        });
    }
    /**
     * Get an S2DO object
     */
    static getS2DOObject(objectId, requesterId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get the object metadata
                const objectDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 's2doObjects', objectId));
                if (!objectDoc.exists()) {
                    throw new Error('Object not found');
                }
                const objectData = objectDoc.data();
                // Check access permissions
                const hasAccess = objectData.ownerType === 'user' && objectData.ownerId === requesterId ||
                    objectData.permissions.publicAccess ||
                    objectData.permissions.authorizedUsers.includes(requesterId);
                if (!hasAccess) {
                    throw new Error('Access denied');
                }
                // Fetch the data from storage
                const response = yield fetch(objectData.storageUrl);
                const storedData = yield response.json();
                // If encrypted, decrypt the data
                if (storedData.encrypted) {
                    // Get the encryption key
                    const keyDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 's2doEncryptionKeys', objectId));
                    if (!keyDoc.exists()) {
                        throw new Error('Encryption key not found');
                    }
                    const encryptionKey = keyDoc.data().key;
                    // Decrypt the data
                    const decryptedData = CryptoJS.AES.decrypt(storedData.data, encryptionKey).toString(CryptoJS.enc.Utf8);
                    return JSON.parse(decryptedData);
                }
                else {
                    // Return unencrypted data
                    return storedData.data;
                }
            }
            catch (error) {
                console.error('Error getting S2DO object:', error);
                throw error;
            }
        });
    }
    /**
     * Grant access to an S2DO object
     */
    static grantS2DOAccess(objectId, accessType, accessId, granterId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get the object metadata
                const objectDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 's2doObjects', objectId));
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
                        yield (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 's2doObjects', objectId), {
                            'permissions.authorizedUsers': [...objectData.permissions.authorizedUsers, accessId],
                            updatedAt: (0, firestore_1.serverTimestamp)()
                        });
                    }
                }
                else if (accessType === 'organization') {
                    // Add organization to authorized organizations if not already present
                    if (!objectData.permissions.authorizedOrganizations.includes(accessId)) {
                        yield (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, 's2doObjects', objectId), {
                            'permissions.authorizedOrganizations': [...objectData.permissions.authorizedOrganizations, accessId],
                            updatedAt: (0, firestore_1.serverTimestamp)()
                        });
                    }
                }
                return true;
            }
            catch (error) {
                console.error('Error granting S2DO access:', error);
                throw error;
            }
        });
    }
}
exports.S2DOService = S2DOService;
// Rays Compute Service
class RaysComputeService {
    /**
     * Submit a compute job to Rays
     */
    static submitComputeJob(jobType_1, requesterId_1, requesterType_1, parameters_1) {
        return __awaiter(this, arguments, void 0, function* (jobType, requesterId, requesterType, parameters, priority = 'normal') {
            try {
                // Create job document
                const jobId = (0, uuid_1.v4)();
                const jobData = {
                    id: jobId,
                    jobType,
                    status: 'pending',
                    requesterId,
                    requesterType,
                    parameters,
                    priority,
                    progress: 0,
                    createdAt: (0, firestore_1.serverTimestamp)()
                };
                yield (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'raysComputeJobs', jobId), jobData);
                // In a real implementation, this would trigger a cloud function or backend process
                // to handle the job. For now, we'll just return the job ID.
                return jobId;
            }
            catch (error) {
                console.error('Error submitting compute job:', error);
                throw error;
            }
        });
    }
    /**
     * Get compute job status
     */
    static getJobStatus(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const jobDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'raysComputeJobs', jobId));
                if (!jobDoc.exists()) {
                    throw new Error('Job not found');
                }
                return jobDoc.data();
            }
            catch (error) {
                console.error('Error getting job status:', error);
                throw error;
            }
        });
    }
    /**
     * Get compute jobs for a requester
     */
    static getJobsForRequester(requesterId, requesterType, status) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let jobsQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'raysComputeJobs'), (0, firestore_1.where)('requesterId', '==', requesterId), (0, firestore_1.where)('requesterType', '==', requesterType));
                if (status) {
                    jobsQuery = (0, firestore_1.query)(jobsQuery, (0, firestore_1.where)('status', '==', status));
                }
                const querySnapshot = yield (0, firestore_1.getDocs)(jobsQuery);
                return querySnapshot.docs
                    .map(doc => doc.data())
                    .sort((a, b) => {
                    var _a, _b;
                    // Sort by createdAt in descending order (newest first)
                    const timeA = ((_a = a.createdAt) === null || _a === void 0 ? void 0 : _a.toMillis()) || 0;
                    const timeB = ((_b = b.createdAt) === null || _b === void 0 ? void 0 : _b.toMillis()) || 0;
                    return timeB - timeA;
                });
            }
            catch (error) {
                console.error('Error getting jobs for requester:', error);
                throw error;
            }
        });
    }
}
exports.RaysComputeService = RaysComputeService;
// Export all services
exports.default = {
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
