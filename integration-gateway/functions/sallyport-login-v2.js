const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');
const SallyPortAuthAdapter = require('./lib/sallyport-auth-adapter');

// Initialize Firebase Admin if it hasn't been initialized already
if (!admin.apps.length) {
    admin.initializeApp();
}

const firestore = admin.firestore();
const auth = admin.auth();

// Initialize the SallyPort Auth Adapter with our working configuration
const sallyPortAdapter = new SallyPortAuthAdapter({
    baseUrl: process.env.SALLYPORT_BASE_URL || 'https://sallyport-cloudflare-auth-859242575175.us-west1.run.app',
    backupUrl: process.env.SALLYPORT_BACKUP_URL || 'https://integration-gateway-859242575175.us-west1.run.app'
});

/**
 * Enhanced SallyPort Login Function
 * Uses the working SallyPort authentication adapter
 */
exports.sallyPortLoginV2 = functions.https.onRequest({
    region: 'us-west1',
    cors: true
}, async (req, res) => {
    try {
        // Handle CORS
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Token');
        
        if (req.method === 'OPTIONS') {
            res.status(200).send('');
            return;
        }

        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const { email, password, sessionToken } = req.body;

        functions.logger.info('SallyPort login attempt', { 
            email: email ? email.substring(0, 3) + '***' : 'none',
            hasSessionToken: !!sessionToken
        });

        let authResult;

        if (sessionToken) {
            // Verify existing session token
            functions.logger.info('Verifying existing session token');
            authResult = await sallyPortAdapter.verifySession(sessionToken);
            
            if (!authResult.valid) {
                res.status(401).json({
                    success: false,
                    message: 'Session token is invalid or expired',
                    error: 'invalid_session'
                });
                return;
            }

            // Convert verification result to auth result format
            authResult = {
                success: true,
                sessionToken: sessionToken,
                user: {
                    uuid: authResult.userUuid,
                    email: authResult.email,
                    displayName: authResult.displayName,
                    role: authResult.role,
                    permissions: authResult.permissions
                }
            };
        } else if (email) {
            // Authenticate with credentials
            functions.logger.info('Authenticating with credentials');
            authResult = await sallyPortAdapter.authenticate({ email, password });
            
            if (!authResult.success) {
                res.status(401).json({
                    success: false,
                    message: authResult.message || 'Authentication failed',
                    error: authResult.error || 'invalid_credentials'
                });
                return;
            }
        } else {
            // Create a test session for demo purposes
            functions.logger.info('Creating demo session');
            const testSession = await sallyPortAdapter.createTestSession('user');
            authResult = {
                success: true,
                sessionToken: testSession.sessionToken,
                user: testSession.user
            };
        }

        const userUuid = authResult.user.uuid;
        
        // Check if user exists in Firebase Auth
        let userRecord;
        try {
            userRecord = await auth.getUser(userUuid);
            functions.logger.info('Found existing Firebase user', { uid: userUuid });
        } catch (error) {
            // User doesn't exist, create a new user
            functions.logger.info('Creating new Firebase user', { uid: userUuid });
            userRecord = await auth.createUser({
                uid: userUuid,
                email: authResult.user.email,
                displayName: authResult.user.displayName,
            });

            // Create user profile in Firestore
            await firestore.collection('users').doc(userUuid).set({
                uid: userUuid,
                email: authResult.user.email,
                displayName: authResult.user.displayName,
                role: authResult.user.role,
                permissions: authResult.user.permissions,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastLogin: admin.firestore.FieldValue.serverTimestamp(),
                authProvider: 'sallyport'
            });
        }

        // Create custom Firebase token
        const customToken = await auth.createCustomToken(userUuid, {
            role: authResult.user.role,
            permissions: authResult.user.permissions,
            sallyPortSession: authResult.sessionToken
        });

        // Store session information
        await firestore.collection('userSessions').doc(userUuid).set({
            sessionToken: authResult.sessionToken,
            userUuid: userUuid,
            email: authResult.user.email,
            role: authResult.user.role,
            permissions: authResult.user.permissions,
            lastAuthenticated: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(
                new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours
            ),
            authProvider: 'sallyport'
        }, { merge: true });

        // Update user's last login
        await firestore.collection('users').doc(userUuid).update({
            lastLogin: admin.firestore.FieldValue.serverTimestamp()
        });

        functions.logger.info('Authentication successful', { 
            userUuid,
            role: authResult.user.role 
        });

        res.status(200).json({
            success: true,
            message: 'Authentication successful',
            data: {
                firebaseToken: customToken,
                sallyPortSession: authResult.sessionToken,
                user: {
                    uid: userUuid,
                    email: authResult.user.email,
                    displayName: authResult.user.displayName,
                    role: authResult.user.role,
                    permissions: authResult.user.permissions
                }
            }
        });

    } catch (error) {
        functions.logger.error('SallyPort login error', error);
        
        // Check if it's a connectivity issue
        if (error.message.includes('connect') || error.message.includes('timeout')) {
            res.status(503).json({
                success: false,
                message: 'Authentication service temporarily unavailable',
                error: 'service_unavailable',
                details: 'Please try again in a moment'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Authentication failed: ' + error.message,
                error: 'internal_error'
            });
        }
    }
});

/**
 * Health check endpoint for the SallyPort service
 */
exports.sallyPortHealth = functions.https.onRequest({
    region: 'us-west1',
    cors: true
}, async (req, res) => {
    try {
        const health = await sallyPortAdapter.healthCheck();
        
        res.status(health.status === 'healthy' ? 200 : 503).json({
            status: health.status,
            service: 'sallyport-auth',
            timestamp: health.timestamp,
            baseUrl: sallyPortAdapter.baseUrl,
            details: health.details || health.error
        });
    } catch (error) {
        functions.logger.error('Health check failed', error);
        res.status(503).json({
            status: 'unhealthy',
            service: 'sallyport-auth',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * Session verification endpoint
 */
exports.verifySallyPortSessionV2 = functions.https.onCall({
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
        const verificationResult = await sallyPortAdapter.verifySession(sessionToken);
        
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
    } catch (error) {
        functions.logger.error('Session verification error', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Session verification failed: ' + error.message);
    }
});
