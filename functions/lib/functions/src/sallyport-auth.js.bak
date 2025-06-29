"use strict";
/**
 * SallyPort Authentication Integration with Firebase
 * Provides secure authentication and token verification for 2100.cool Firebase hosting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserSignIn = exports.verifySallyPortSession = exports.authenticateWithSallyPort = void 0;
const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");
const axios_1 = require("axios");
// Initialize Firebase Admin if it hasn't been initialized already
if (!admin.apps.length) {
    admin.initializeApp();
}
const firestore = admin.firestore();
const auth = admin.auth();
// SallyPort configuration 
const SALLYPORT_BASE_URL = process.env.SALLYPORT_BASE_URL || 'https://sallyport.aixtiv.dev/api/v1';
const GCP_PROJECT = process.env.GCP_PROJECT || 'api-for-warp-drive';
// Get SallyPort API key from Secret Manager
async function getSallyPortApiKey() {
    try {
        // In production, this would fetch from Secret Manager
        // For development, we return a placeholder
        return 'placeholder-api-key';
    }
    catch (error) {
        functions.logger.error('Failed to retrieve SallyPort API key', error);
        throw new Error('Failed to retrieve SallyPort API key');
    }
}
// Create an authenticated SallyPort API client
async function createAuthorizedClient() {
    try {
        const apiKey = await getSallyPortApiKey();
        const client = axios_1.default.create({
            baseURL: SALLYPORT_BASE_URL,
            timeout: 10000,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Aixtiv-Integration-Gateway/1.0',
            },
        });
        // Add response interceptor for error handling
        client.interceptors.response.use(response => response, error => {
            functions.logger.error(`SallyPort API error: ${error.message}`);
            if (error.response) {
                functions.logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
            }
            return Promise.reject(error);
        });
        return client;
    }
    catch (error) {
        functions.logger.error(`Failed to create SallyPort client: ${error.message}`);
        throw new Error(`SallyPort client initialization failed: ${error.message}`);
    }
}
/**
 * Verify a session token with SallyPort
 * @param sessionToken The session token to verify
 * @returns Session data if valid
 */
async function verifySessionToken(sessionToken) {
    try {
        const client = await createAuthorizedClient();
        const response = await client.get('/session', {
            headers: {
                'X-Session-Token': sessionToken,
            },
        });
        return response.data;
    }
    catch (error) {
        functions.logger.error(`Failed to verify session token: ${error.message}`);
        throw new Error(`Session verification failed: ${error.message}`);
    }
}
/**
 * Firebase function to authenticate using SallyPort and issue a Firebase Auth token
 */
exports.authenticateWithSallyPort = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    try {
        const { sessionToken } = request.data;
        if (!sessionToken) {
            throw new functions.https.HttpsError('invalid-argument', 'Session token is required');
        }
        functions.logger.info('Authenticating with SallyPort', { sessionToken: '***' });
        // Verify the token with SallyPort
        const sessionData = await verifySessionToken(sessionToken);
        if (!sessionData.valid) {
            throw new functions.https.HttpsError('unauthenticated', sessionData.message || 'Invalid session token');
        }
        // Get the user ID from the session
        const userUuid = sessionData.userUuid;
        // Check if the user exists in Firebase Auth
        let userRecord;
        try {
            userRecord = await auth.getUser(userUuid);
        }
        catch (error) {
            // User doesn't exist, create a new user
            userRecord = await auth.createUser({
                uid: userUuid,
                email: sessionData.email || `${userUuid}@example.com`,
                displayName: sessionData.displayName || 'ASOOS User',
            });
            // Create a user profile in Firestore
            await firestore.collection('users').doc(userUuid).set({
                uid: userUuid,
                email: sessionData.email || `${userUuid}@example.com`,
                displayName: sessionData.displayName || 'ASOOS User',
                role: sessionData.role || 'user',
                permissions: sessionData.permissions || [],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        // Create a custom token
        const customToken = await auth.createCustomToken(userUuid, {
            role: sessionData.role || 'user',
            permissions: sessionData.permissions || [],
        });
        // Store session information
        await firestore.collection('userSessions').doc(userUuid).set({
            sessionToken: sessionToken,
            userUuid: userUuid,
            lastAuthenticated: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours
            ),
        });
        functions.logger.info('Authentication successful', { userUuid });
        return {
            token: customToken,
            user: {
                uid: userUuid,
                email: userRecord.email,
                displayName: userRecord.displayName,
                role: sessionData.role || 'user',
                permissions: sessionData.permissions || [],
            },
        };
    }
    catch (error) {
        functions.logger.error('Authentication error', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Authentication failed: ' + error.message);
    }
});
/**
 * Firebase function to verify the current Firebase Auth session is valid with SallyPort
 */
exports.verifySallyPortSession = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    try {
        // Ensure the user is authenticated
        if (!request.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const uid = request.auth.uid;
        // Get the user's session
        const sessionDoc = await firestore.collection('userSessions').doc(uid).get();
        if (!sessionDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Session not found');
        }
        const sessionData = sessionDoc.data();
        const sessionToken = sessionData.sessionToken;
        // Verify with SallyPort
        const verificationResult = await verifySessionToken(sessionToken);
        if (!verificationResult.valid) {
            // Session is no longer valid
            await firestore.collection('userSessions').doc(uid).delete();
            throw new functions.https.HttpsError('unauthenticated', 'Session is no longer valid');
        }
        // Update the session timestamp
        await firestore.collection('userSessions').doc(uid).update({
            lastVerified: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            valid: true,
            user: {
                uid,
                role: verificationResult.role,
                permissions: verificationResult.permissions,
            },
        };
    }
    catch (error) {
        functions.logger.error('Session verification error', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Session verification failed: ' + error.message);
    }
});
/**
 * Firebase Auth Trigger that validates user sign-in with SallyPort
 */
exports.onUserSignIn = functions.auth.user().onCreate(async (user) => {
    try {
        functions.logger.info('New user signed in, checking with SallyPort', { uid: user.uid });
        // Get the user's session
        const sessionDoc = await firestore.collection('userSessions').doc(user.uid).get();
        if (!sessionDoc.exists) {
            functions.logger.warn('No session found for user', { uid: user.uid });
            return;
        }
        const sessionData = sessionDoc.data();
        const sessionToken = sessionData.sessionToken;
        // Verify with SallyPort
        const verificationResult = await verifySessionToken(sessionToken);
        if (!verificationResult.valid) {
            // If invalid, disable the user
            functions.logger.warn('SallyPort validation failed, disabling user', { uid: user.uid });
            await auth.updateUser(user.uid, { disabled: true });
            // Delete the session
            await firestore.collection('userSessions').doc(user.uid).delete();
        }
        else {
            // Update user custom claims based on SallyPort data
            await auth.setCustomUserClaims(user.uid, {
                role: verificationResult.role || 'user',
                permissions: verificationResult.permissions || [],
            });
            functions.logger.info('User validated with SallyPort', { uid: user.uid });
        }
    }
    catch (error) {
        functions.logger.error('Error in onUserSignIn trigger', error);
        // Don't throw here as this is a triggered function
    }
});
//# sourceMappingURL=sallyport-auth.js.map