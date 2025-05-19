"use strict";
/**
 * Q4D-Lenz Integration for ASOOS
 * Agent-exclusive apparatus for accessing Owner Cultural Empathy Score (OCES)
 * Integrates SERPEW Data, Sentiment Analysis, Career Horizon (distance traveled),
 * Career Vertical (Prestige rising/falling), 9-box Career Framework,
 * Holland RIASEC Case Study benchmarking, and Military DFAB results
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeValidationCheckpoint = exports.getVerificationRecords = exports.createVerificationRecord = exports.addInteractionResponse = exports.createInteractionLog = exports.updateConfidenceMetrics = exports.getConfidenceProfile = exports.createConfidenceProfile = void 0;
const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");
const uuid_1 = require("uuid");
// Initialize Firebase Admin if it hasn't been initialized already
if (!admin.apps.length) {
    admin.initializeApp();
}
const firestore = admin.firestore();
/**
 * Create a new confidence profile for a user
 */
exports.createConfidenceProfile = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    try {
        const { ownerSubscriberId } = request.data;
        if (!ownerSubscriberId) {
            throw new functions.https.HttpsError('invalid-argument', 'Owner subscriber ID is required');
        }
        // Check if profile already exists
        const existingProfiles = await firestore
            .collection('confidenceProfiles')
            .where('ownerSubscriberId', '==', ownerSubscriberId)
            .limit(1)
            .get();
        if (!existingProfiles.empty) {
            return {
                success: true,
                profileId: existingProfiles.docs[0].id,
                profile: existingProfiles.docs[0].data(),
                message: 'Profile already exists',
            };
        }
        // Create new profile
        const profileId = (0, uuid_1.v4)();
        const now = admin.firestore.FieldValue.serverTimestamp();
        const profile = {
            id: profileId,
            ownerSubscriberId,
            currentConfidenceLevel: {
                overall: 0,
                professional: 0,
                social: 0,
                behavioral: 0,
            },
            confidenceMetrics: [],
            behavioralSignals: {
                careerTrajectoryConsistency: 0,
                decisionMakingPattern: {},
                adaptabilityIndex: 0,
            },
            validationCheckpoints: [
                {
                    type: 'career_transition_validation',
                    status: 'pending',
                    confidence_threshold: 70,
                },
            ],
            createdAt: now,
            updatedAt: now,
        };
        // Store in Firestore
        await firestore.collection('confidenceProfiles').doc(profileId).set(profile);
        functions.logger.info('Created confidence profile', { profileId, ownerSubscriberId });
        return {
            success: true,
            profileId,
            profile,
        };
    }
    catch (error) {
        functions.logger.error('Error creating confidence profile:', error);
        throw new functions.https.HttpsError('internal', 'Error creating confidence profile: ' + error.message);
    }
});
/**
 * Get a confidence profile for a user
 */
exports.getConfidenceProfile = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    try {
        const { ownerSubscriberId, profileId } = request.data;
        if (!ownerSubscriberId && !profileId) {
            throw new functions.https.HttpsError('invalid-argument', 'Owner subscriber ID or profile ID is required');
        }
        let profileDoc;
        // Get by profile ID if provided
        if (profileId) {
            profileDoc = await firestore.collection('confidenceProfiles').doc(profileId).get();
        }
        else {
            // Get by owner subscriber ID
            const querySnapshot = await firestore
                .collection('confidenceProfiles')
                .where('ownerSubscriberId', '==', ownerSubscriberId)
                .limit(1)
                .get();
            if (querySnapshot.empty) {
                return {
                    success: false,
                    message: 'Profile not found',
                };
            }
            profileDoc = querySnapshot.docs[0];
        }
        if (!profileDoc.exists) {
            return {
                success: false,
                message: 'Profile not found',
            };
        }
        // Return profile
        return {
            success: true,
            profileId: profileDoc.id,
            profile: profileDoc.data(),
        };
    }
    catch (error) {
        functions.logger.error('Error getting confidence profile:', error);
        throw new functions.https.HttpsError('internal', 'Error getting confidence profile: ' + error.message);
    }
});
/**
 * Update confidence metrics for a user
 */
exports.updateConfidenceMetrics = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    try {
        const { profileId, source, confidence_increment, dimension = 'professional' } = request.data;
        if (!profileId || !source || confidence_increment === undefined) {
            throw new functions.https.HttpsError('invalid-argument', 'Profile ID, source, and confidence increment are required');
        }
        // Get profile
        const profileDoc = await firestore.collection('confidenceProfiles').doc(profileId).get();
        if (!profileDoc.exists) {
            return {
                success: false,
                message: 'Profile not found',
            };
        }
        const profile = profileDoc.data();
        // Calculate new confidence levels
        const dimensions = ['overall', 'professional', 'social', 'behavioral'];
        const currentLevels = Object.assign({}, profile.currentConfidenceLevel);
        // Update specific dimension
        if (dimensions.includes(dimension)) {
            currentLevels[dimension] = Math.min(100, Math.max(0, currentLevels[dimension] + confidence_increment));
        }
        // Update overall confidence based on dimensions
        currentLevels.overall = Math.round((currentLevels.professional + currentLevels.social + currentLevels.behavioral) / 3);
        // Create new metric
        const newMetric = {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            source,
            confidence_increment,
            dimension,
        };
        // Update profile
        await firestore.collection('confidenceProfiles').doc(profileId).update({
            currentConfidenceLevel: currentLevels,
            confidenceMetrics: admin.firestore.FieldValue.arrayUnion(newMetric),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        functions.logger.info('Updated confidence metrics', {
            profileId,
            dimension,
            confidence_increment,
        });
        return {
            success: true,
            profileId,
            newConfidenceLevel: currentLevels,
        };
    }
    catch (error) {
        functions.logger.error('Error updating confidence metrics:', error);
        throw new functions.https.HttpsError('internal', 'Error updating confidence metrics: ' + error.message);
    }
});
/**
 * Create an interaction log
 */
exports.createInteractionLog = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    try {
        const { profileId, agentType, interactionDimension, questionSet } = request.data;
        if (!profileId || !agentType || !interactionDimension || !questionSet) {
            throw new functions.https.HttpsError('invalid-argument', 'Profile ID, agent type, interaction dimension, and question set are required');
        }
        // Get profile
        const profileDoc = await firestore.collection('confidenceProfiles').doc(profileId).get();
        if (!profileDoc.exists) {
            return {
                success: false,
                message: 'Profile not found',
            };
        }
        const profile = profileDoc.data();
        // Create interaction log
        const interactionId = (0, uuid_1.v4)();
        const now = admin.firestore.FieldValue.serverTimestamp();
        const initialConfidence = profile.currentConfidenceLevel[interactionDimension] || 0;
        const interactionLog = {
            id: interactionId,
            profileId,
            agentType,
            interactionDimension,
            questionSet,
            responses: [],
            confidenceImpact: {
                initialConfidence,
                finalConfidence: initialConfidence,
                dimensionConfidence: {
                    [interactionDimension]: initialConfidence,
                },
            },
            createdAt: now,
            updatedAt: now,
        };
        // Store in Firestore
        await firestore.collection('interactionLogs').doc(interactionId).set(interactionLog);
        functions.logger.info('Created interaction log', {
            interactionId,
            profileId,
            agentType,
        });
        return {
            success: true,
            interactionId,
            interactionLog,
        };
    }
    catch (error) {
        functions.logger.error('Error creating interaction log:', error);
        throw new functions.https.HttpsError('internal', 'Error creating interaction log: ' + error.message);
    }
});
/**
 * Add a response to an interaction log
 */
exports.addInteractionResponse = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    try {
        const { interactionId, question, response, confidenceImpact = 0 } = request.data;
        if (!interactionId || !question || !response) {
            throw new functions.https.HttpsError('invalid-argument', 'Interaction ID, question, and response are required');
        }
        // Get interaction log
        const interactionDoc = await firestore
            .collection('interactionLogs')
            .doc(interactionId)
            .get();
        if (!interactionDoc.exists) {
            return {
                success: false,
                message: 'Interaction log not found',
            };
        }
        const interactionLog = interactionDoc.data();
        // Add response
        const newResponse = {
            question,
            response,
            confidenceImpact,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Calculate new confidence impact
        const newFinalConfidence = Math.min(100, Math.max(0, interactionLog.confidenceImpact.finalConfidence + confidenceImpact));
        const dimensionConfidence = Object.assign({}, interactionLog.confidenceImpact.dimensionConfidence);
        dimensionConfidence[interactionLog.interactionDimension] = newFinalConfidence;
        // Update interaction log
        await firestore.collection('interactionLogs').doc(interactionId).update({
            responses: admin.firestore.FieldValue.arrayUnion(newResponse),
            'confidenceImpact.finalConfidence': newFinalConfidence,
            'confidenceImpact.dimensionConfidence': dimensionConfidence,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Update profile confidence level if confidence impact is non-zero
        if (confidenceImpact !== 0) {
            await (0, exports.updateConfidenceMetrics)({
                data: {
                    profileId: interactionLog.profileId,
                    source: `interaction_${interactionId}`,
                    confidence_increment: confidenceImpact,
                    dimension: interactionLog.interactionDimension,
                },
            });
        }
        functions.logger.info('Added interaction response', {
            interactionId,
            question,
            confidenceImpact,
        });
        return {
            success: true,
            interactionId,
            newConfidenceLevel: newFinalConfidence,
        };
    }
    catch (error) {
        functions.logger.error('Error adding interaction response:', error);
        throw new functions.https.HttpsError('internal', 'Error adding interaction response: ' + error.message);
    }
});
/**
 * Create a verification record
 */
exports.createVerificationRecord = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    try {
        const { interactionId, agents, initialConfidence, finalConfidence, validationScore } = request.data;
        if (!interactionId ||
            !agents ||
            !Array.isArray(agents) ||
            initialConfidence === undefined ||
            finalConfidence === undefined ||
            validationScore === undefined) {
            throw new functions.https.HttpsError('invalid-argument', 'Interaction ID, agents, initialConfidence, finalConfidence, and validationScore are required');
        }
        // Generate blockchain proof (placeholder)
        const blockchainProof = (0, uuid_1.v4)();
        // Create verification record
        const verificationRecord = {
            interactionId,
            agents,
            confidenceMetrics: {
                initialConfidence,
                finalConfidence,
                validationScore,
            },
            blockchainProof,
            createdAt: admin.firestore.Timestamp.now(),
        };
        // Store in Firestore
        await firestore
            .collection('verificationRecords')
            .doc(interactionId)
            .set(verificationRecord);
        functions.logger.info('Created verification record', {
            interactionId,
            agents,
            validationScore,
        });
        return {
            success: true,
            interactionId,
            blockchainProof,
            verificationRecord,
        };
    }
    catch (error) {
        functions.logger.error('Error creating verification record:', error);
        throw new functions.https.HttpsError('internal', 'Error creating verification record: ' + error.message);
    }
});
/**
 * Get verification records for an interaction
 */
exports.getVerificationRecords = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    try {
        const { interactionId } = request.data;
        if (!interactionId) {
            throw new functions.https.HttpsError('invalid-argument', 'Interaction ID is required');
        }
        // Get verification record
        const verificationDoc = await firestore
            .collection('verificationRecords')
            .doc(interactionId)
            .get();
        if (!verificationDoc.exists) {
            return {
                success: false,
                message: 'Verification record not found',
            };
        }
        return {
            success: true,
            verificationRecord: verificationDoc.data(),
        };
    }
    catch (error) {
        functions.logger.error('Error getting verification records:', error);
        throw new functions.https.HttpsError('internal', 'Error getting verification records: ' + error.message);
    }
});
/**
 * Complete a validation checkpoint
 */
exports.completeValidationCheckpoint = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    try {
        const { profileId, checkpointType, status = 'completed' } = request.data;
        if (!profileId || !checkpointType) {
            throw new functions.https.HttpsError('invalid-argument', 'Profile ID and checkpoint type are required');
        }
        // Get profile
        const profileDoc = await firestore.collection('confidenceProfiles').doc(profileId).get();
        if (!profileDoc.exists) {
            return {
                success: false,
                message: 'Profile not found',
            };
        }
        const profile = profileDoc.data();
        // Find checkpoint
        const checkpointIndex = profile.validationCheckpoints.findIndex((checkpoint) => checkpoint.type === checkpointType);
        if (checkpointIndex === -1) {
            return {
                success: false,
                message: 'Checkpoint not found',
            };
        }
        // Update checkpoint
        const updatedCheckpoints = [...profile.validationCheckpoints];
        updatedCheckpoints[checkpointIndex].status = status;
        // Update profile
        await firestore.collection('confidenceProfiles').doc(profileId).update({
            validationCheckpoints: updatedCheckpoints,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        functions.logger.info('Completed validation checkpoint', {
            profileId,
            checkpointType,
            status,
        });
        return {
            success: true,
            profileId,
            checkpointType,
            status,
        };
    }
    catch (error) {
        functions.logger.error('Error completing validation checkpoint:', error);
        throw new functions.https.HttpsError('internal', 'Error completing validation checkpoint: ' + error.message);
    }
});
//# sourceMappingURL=q4d-lenz-integration.js.map