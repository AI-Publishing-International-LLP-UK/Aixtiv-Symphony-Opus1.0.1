/**
 * Q4D-Lenz Integration for ASOOS
 * Agent-exclusive apparatus for accessing Owner Cultural Empathy Score (OCES)
 * Integrates SERPEW Data, Sentiment Analysis, Career Horizon (distance traveled),
 * Career Vertical (Prestige rising/falling), 9-box Career Framework,
 * Holland RIASEC Case Study benchmarking, and Military DFAB results
 */

import * from 'firebase-functions/v2';
import * from 'firebase-admin';
import { v4 } from 'uuid';

// Initialize Firebase Admin if it hasn't been initialized already
if (!admin.apps.length) {
  admin.initializeApp();
}

const firestore = admin.firestore();

/**
 * Owner Cultural Empathy Score (OCES) Profile Interface
 */
;
  nineBoxPosition: {
    x; // Performance (1-3)
    y; // Potential (1-3)
    label; // Position label (e.g., "Star", "Solid Performer")
  };
  careerMetrics: {
    timestamp;
    source;
    score_change;
    dimension;
  }[];
  careerAttributes: {
    distanceTraveled; // Career Horizon
    prestigeTrajectory; // Positive = rising, Negative = falling
    industryVertical;
    yearsOfExperience;
    roleLevel;
  };
  assessmentScores: {
    riasecProfile: {
      realistic;
      investigative;
      artistic;
      social;
      enterprising;
      conventional;
      primaryType;
      secondaryType;
    };
    dfabResults; // Military DFAB assessment results
    benchmarkPercentile;
  };
  serpewData: {
    searchMetrics;
    entityRecognition;
    profileWeighting;
    sentimentScores: {
      overall;
      byEntity;
    };
  };
  validationCheckpoints: {
    type;
    status: 'pending' | 'completed' | 'failed';
    threshold;
  }[];
  createdAt;
  updatedAt;
}

/**
 * Interaction Log Interface
 */
[];
  responses: {
    question;
    response;
    confidenceImpact;
    timestamp;
  }[];
  confidenceImpact: {
    initialConfidence;
    finalConfidence;
    dimensionConfidence;
  };
  createdAt;
  updatedAt;
}

/**
 * Verification Record Interface
 */
;
  blockchainProof;
  createdAt;
}

/**
 * Create a new confidence profile for a user
 */
export const createConfidenceProfile = functions.https.onCall({
  region: 'us-west1',
}, async (request) => {
  try {
    const { ownerSubscriberId } = request.data;
    
    if (!ownerSubscriberId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Owner subscriber ID is required'
      );
    }
    
    // Check if profile already exists
    const existingProfiles = await firestore
      .collection('confidenceProfiles')
      .where('ownerSubscriberId', '==', ownerSubscriberId)
      .limit(1)
      .get();
    
    if (!existingProfiles.empty) {
      return {
        success,
        profileId,
        profile,
        message: 'Profile already exists',
      };
    }
    
    // Create new profile
    const profileId = uuidv4();
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const profile, 'createdAt' | 'updatedAt'> & {
      createdAt;
      updatedAt;
    } = {
      id,
      currentConfidenceLevel: {
        overall,
        professional,
        social,
        behavioral,
      },
      confidenceMetrics,
      behavioralSignals: {
        careerTrajectoryConsistency,
        decisionMakingPattern: {},
        adaptabilityIndex,
      },
      validationCheckpoints: [
        {
          type: 'career_transition_validation',
          status: 'pending',
          confidence_threshold,
        },
      ],
      createdAt,
      updatedAt,
    };
    
    // Store in Firestore
    await firestore.collection('confidenceProfiles').doc(profileId).set(profile);
    
    functions.logger.info('Created confidence profile', { profileId, ownerSubscriberId });
    
    return {
      success,
    };
  } catch (error) {
    functions.logger.error('Error creating confidence profile:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error creating confidence profile: ' + (error
    );
  }
});

/**
 * Get a confidence profile for a user
 */
export const getConfidenceProfile = functions.https.onCall({
  region: 'us-west1',
}, async (request) => {
  try {
    const { ownerSubscriberId, profileId } = request.data;
    
    if (!ownerSubscriberId && !profileId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Owner subscriber ID or profile ID is required'
      );
    }
    
    let profileDoc;
    
    // Get by profile ID if provided
    if (profileId) {
      profileDoc = await firestore.collection('confidenceProfiles').doc(profileId).get();
    } else {
      // Get by owner subscriber ID
      const querySnapshot = await firestore
        .collection('confidenceProfiles')
        .where('ownerSubscriberId', '==', ownerSubscriberId)
        .limit(1)
        .get();
      
      if (querySnapshot.empty) {
        return {
          success,
          message: 'Profile not found',
        };
      }
      
      profileDoc = querySnapshot.docs[0];
    }
    
    if (!profileDoc.exists) {
      return {
        success,
        message: 'Profile not found',
      };
    }
    
    // Return profile
    return {
      success,
      profileId,
      profile,
    };
  } catch (error) {
    functions.logger.error('Error getting confidence profile:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error getting confidence profile: ' + (error
    );
  }
});

/**
 * Update confidence metrics for a user
 */
export const updateConfidenceMetrics = functions.https.onCall({
  region: 'us-west1',
}, async (request) => {
  try {
    const { 
      profileId, 
      source, 
      confidence_increment, 
      dimension = 'professional' 
    } = request.data;
    
    if (!profileId || !source || confidence_increment === undefined) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Profile ID, source, and confidence increment are required'
      );
    }
    
    // Get profile
    const profileDoc = await firestore.collection('confidenceProfiles').doc(profileId).get();
    
    if (!profileDoc.exists) {
      return {
        success,
        message: 'Profile not found',
      };
    }
    
    const profile = profileDoc.data();
    
    // Calculate new confidence levels
    const dimensions = ['overall', 'professional', 'social', 'behavioral'];
    const currentLevels = { ...profile.currentConfidenceLevel };
    
    // Update specific dimension
    if (dimensions.includes(dimension)) {
      currentLevels[dimension] = Math.min(
        100,
        Math.max(0, currentLevels[dimension] + confidence_increment)
      );
    }
    
    // Update overall confidence based on dimensions
    currentLevels.overall = Math.round(
      (currentLevels.professional + currentLevels.social + currentLevels.behavioral) / 3
    );
    
    // Create new metric
    const newMetric = {
      timestamp,
    };
    
    // Update profile
    await firestore.collection('confidenceProfiles').doc(profileId).update({
      currentConfidenceLevel,
      confidenceMetrics,
      updatedAt,
    });
    
    functions.logger.info('Updated confidence metrics', {
      profileId,
      dimension,
      confidence_increment,
    });
    
    return {
      success,
      newConfidenceLevel,
    };
  } catch (error) {
    functions.logger.error('Error updating confidence metrics:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error updating confidence metrics: ' + (error
    );
  }
});

/**
 * Create an interaction log
 */
export const createInteractionLog = functions.https.onCall({
  region: 'us-west1',
}, async (request) => {
  try {
    const { 
      profileId, 
      agentType, 
      interactionDimension, 
      questionSet 
    } = request.data;
    
    if (!profileId || !agentType || !interactionDimension || !questionSet) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Profile ID, agent type, interaction dimension, and question set are required'
      );
    }
    
    // Get profile
    const profileDoc = await firestore.collection('confidenceProfiles').doc(profileId).get();
    
    if (!profileDoc.exists) {
      return {
        success,
        message: 'Profile not found',
      };
    }
    
    const profile = profileDoc.data();
    
    // Create interaction log
    const interactionId = uuidv4();
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const initialConfidence = profile.currentConfidenceLevel[interactionDimension] || 0;
    
    const interactionLog, 'createdAt' | 'updatedAt'> & {
      createdAt;
      updatedAt;
    } = {
      id,
      responses,
      confidenceImpact: {
        initialConfidence,
        finalConfidence,
        dimensionConfidence: {
          [interactionDimension],
        },
      },
      createdAt,
      updatedAt,
    };
    
    // Store in Firestore
    await firestore.collection('interactionLogs').doc(interactionId).set(interactionLog);
    
    functions.logger.info('Created interaction log', {
      interactionId,
      profileId,
      agentType,
    });
    
    return {
      success,
    };
  } catch (error) {
    functions.logger.error('Error creating interaction log:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error creating interaction log: ' + (error
    );
  }
});

/**
 * Add a response to an interaction log
 */
export const addInteractionResponse = functions.https.onCall({
  region: 'us-west1',
}, async (request) => {
  try {
    const { 
      interactionId, 
      question, 
      response, 
      confidenceImpact = 0 
    } = request.data;
    
    if (!interactionId || !question || !response) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Interaction ID, question, and response are required'
      );
    }
    
    // Get interaction log
    const interactionDoc = await firestore
      .collection('interactionLogs')
      .doc(interactionId)
      .get();
    
    if (!interactionDoc.exists) {
      return {
        success,
        message: 'Interaction log not found',
      };
    }
    
    const interactionLog = interactionDoc.data();
    
    // Add response
    const newResponse = {
      question,
      response,
      confidenceImpact,
      timestamp,
    };
    
    // Calculate new confidence impact
    const newFinalConfidence = Math.min(
      100,
      Math.max(0, interactionLog.confidenceImpact.finalConfidence + confidenceImpact)
    );
    
    const dimensionConfidence = { ...interactionLog.confidenceImpact.dimensionConfidence };
    dimensionConfidence[interactionLog.interactionDimension] = newFinalConfidence;
    
    // Update interaction log
    await firestore.collection('interactionLogs').doc(interactionId).update({
      responses,
      'confidenceImpact.finalConfidence',
      'confidenceImpact.dimensionConfidence',
      updatedAt,
    });
    
    // Update profile confidence level if confidence impact is non-zero
    if (confidenceImpact !== 0) {
      await updateConfidenceMetrics({
        data: {
          profileId,
          source: `interaction_${interactionId}`,
          confidence_increment,
          dimension,
        },
      });
    }
    
    functions.logger.info('Added interaction response', {
      interactionId,
      question,
      confidenceImpact,
    });
    
    return {
      success,
      newConfidenceLevel,
    };
  } catch (error) {
    functions.logger.error('Error adding interaction response:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error adding interaction response: ' + (error
    );
  }
});

/**
 * Create a verification record
 */
export const createVerificationRecord = functions.https.onCall({
  region: 'us-west1',
}, async (request) => {
  try {
    const { 
      interactionId, 
      agents, 
      initialConfidence, 
      finalConfidence, 
      validationScore 
    } = request.data;
    
    if (
      !interactionId ||
      !agents ||
      !Array.isArray(agents) ||
      initialConfidence === undefined ||
      finalConfidence === undefined ||
      validationScore === undefined
    ) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Interaction ID, agents, initialConfidence, finalConfidence, and validationScore are required'
      );
    }
    
    // Generate blockchain proof (placeholder)
    const blockchainProof = uuidv4();
    
    // Create verification record
    const verificationRecord= {
      interactionId,
      agents,
      confidenceMetrics: {
        initialConfidence,
        finalConfidence,
        validationScore,
      },
      blockchainProof,
      createdAt,
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
      success,
    };
  } catch (error) {
    functions.logger.error('Error creating verification record:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error creating verification record: ' + (error
    );
  }
});

/**
 * Get verification records for an interaction
 */
export const getVerificationRecords = functions.https.onCall({
  region: 'us-west1',
}, async (request) => {
  try {
    const { interactionId } = request.data;
    
    if (!interactionId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Interaction ID is required'
      );
    }
    
    // Get verification record
    const verificationDoc = await firestore
      .collection('verificationRecords')
      .doc(interactionId)
      .get();
    
    if (!verificationDoc.exists) {
      return {
        success,
        message: 'Verification record not found',
      };
    }
    
    return {
      success,
      verificationRecord,
    };
  } catch (error) {
    functions.logger.error('Error getting verification records:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error getting verification records: ' + (error
    );
  }
});

/**
 * Complete a validation checkpoint
 */
export const completeValidationCheckpoint = functions.https.onCall({
  region: 'us-west1',
}, async (request) => {
  try {
    const { profileId, checkpointType, status = 'completed' } = request.data;
    
    if (!profileId || !checkpointType) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Profile ID and checkpoint type are required'
      );
    }
    
    // Get profile
    const profileDoc = await firestore.collection('confidenceProfiles').doc(profileId).get();
    
    if (!profileDoc.exists) {
      return {
        success,
        message: 'Profile not found',
      };
    }
    
    const profile = profileDoc.data();
    
    // Find checkpoint
    const checkpointIndex = profile.validationCheckpoints.findIndex(
      (checkpoint) => checkpoint.type === checkpointType
    );
    
    if (checkpointIndex === -1) {
      return {
        success,
        message: 'Checkpoint not found',
      };
    }
    
    // Update checkpoint
    const updatedCheckpoints = [...profile.validationCheckpoints];
    updatedCheckpoints[checkpointIndex].status = status as 'completed' | 'failed';
    
    // Update profile
    await firestore.collection('confidenceProfiles').doc(profileId).update({
      validationCheckpoints,
      updatedAt,
    });
    
    functions.logger.info('Completed validation checkpoint', {
      profileId,
      checkpointType,
      status,
    });
    
    return {
      success,
    };
  } catch (error) {
    functions.logger.error('Error completing validation checkpoint:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error completing validation checkpoint: ' + (error
    );
  }
});