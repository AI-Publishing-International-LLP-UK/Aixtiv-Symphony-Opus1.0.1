"use strict";
/**
 * Q4D-Lenz Service
 * Client-side access to Q4D-Lenz apparatus for Owner Cultural Empathy Score (OCES)
 * Exclusively for agent use to analyze SERPEW Data, Career Trajectory, and Benchmarks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.q4dLenzService = void 0;
const functions_1 = require("firebase/functions");
/**
 * Q4D-Lenz Service
 * Provides access to Q4D-Lenz functions via Firebase Functions
 */
class Q4DLenzService {
    constructor() {
        this.functions = (0, functions_1.getFunctions)(undefined, 'us-west1');
    }
    /**
     * Create a confidence profile for a user
     * @param ownerSubscriberId User ID
     * @returns Created profile
     */
    async createConfidenceProfile(ownerSubscriberId) {
        const createProfile = (0, functions_1.httpsCallable)(this.functions, 'createConfidenceProfile');
        const result = await createProfile({
            ownerSubscriberId,
        });
        return result.data;
    }
    /**
     * Get a confidence profile for a user
     * @param criteria Search criteria
     * @returns Confidence profile
     */
    async getConfidenceProfile(criteria) {
        const getProfile = (0, functions_1.httpsCallable)(this.functions, 'getConfidenceProfile');
        const result = await getProfile(criteria);
        return result.data;
    }
    /**
     * Update confidence metrics for a user
     * @param profileId Profile ID
     * @param source Source of the update
     * @param confidence_increment Amount to increment confidence
     * @param dimension Dimension to update
     * @returns Updated confidence levels
     */
    async updateConfidenceMetrics(profileId, source, confidence_increment, dimension = 'professional') {
        const updateMetrics = (0, functions_1.httpsCallable)(this.functions, 'updateConfidenceMetrics');
        const result = await updateMetrics({
            profileId,
            source,
            confidence_increment,
            dimension,
        });
        return result.data;
    }
    /**
     * Create an interaction log
     * @param profileId Profile ID
     * @param agentType Agent type
     * @param interactionDimension Dimension of interaction
     * @param questionSet Set of questions
     * @returns Created interaction log
     */
    async createInteractionLog(profileId, agentType, interactionDimension, questionSet) {
        const createLog = (0, functions_1.httpsCallable)(this.functions, 'createInteractionLog');
        const result = await createLog({
            profileId,
            agentType,
            interactionDimension,
            questionSet,
        });
        return result.data;
    }
    /**
     * Add a response to an interaction log
     * @param interactionId Interaction ID
     * @param question Question
     * @param response Response
     * @param confidenceImpact Confidence impact
     * @returns Updated confidence level
     */
    async addInteractionResponse(interactionId, question, response, confidenceImpact = 0) {
        const addResponse = (0, functions_1.httpsCallable)(this.functions, 'addInteractionResponse');
        const result = await addResponse({
            interactionId,
            question,
            response,
            confidenceImpact,
        });
        return result.data;
    }
    /**
     * Create a verification record
     * @param interactionId Interaction ID
     * @param agents Agents involved
     * @param initialConfidence Initial confidence
     * @param finalConfidence Final confidence
     * @param validationScore Validation score
     * @returns Created verification record
     */
    async createVerificationRecord(interactionId, agents, initialConfidence, finalConfidence, validationScore) {
        const createRecord = (0, functions_1.httpsCallable)(this.functions, 'createVerificationRecord');
        const result = await createRecord({
            interactionId,
            agents,
            initialConfidence,
            finalConfidence,
            validationScore,
        });
        return result.data;
    }
    /**
     * Get verification records for an interaction
     * @param interactionId Interaction ID
     * @returns Verification record
     */
    async getVerificationRecords(interactionId) {
        const getRecords = (0, functions_1.httpsCallable)(this.functions, 'getVerificationRecords');
        const result = await getRecords({
            interactionId,
        });
        return result.data;
    }
    /**
     * Complete a validation checkpoint
     * @param profileId Profile ID
     * @param checkpointType Checkpoint type
     * @param status Status
     * @returns Result
     */
    async completeValidationCheckpoint(profileId, checkpointType, status = 'completed') {
        const completeCheckpoint = (0, functions_1.httpsCallable)(this.functions, 'completeValidationCheckpoint');
        const result = await completeCheckpoint({
            profileId,
            checkpointType,
            status,
        });
        return result.data;
    }
    /**
     * Start a confidence building session
     * This is a helper method that creates a profile and interaction log
     * @param userId User ID
     * @param agentType Agent type
     * @param dimension Dimension
     * @param questions Questions
     * @returns Session info
     */
    async startConfidenceSession(userId, agentType, dimension, questions) {
        // Get or create profile
        const profileResult = await this.getConfidenceProfile({
            ownerSubscriberId: userId,
        });
        let profileId;
        if (profileResult.success && profileResult.profileId) {
            // Use existing profile
            profileId = profileResult.profileId;
        }
        else {
            // Create new profile
            const createResult = await this.createConfidenceProfile(userId);
            profileId = createResult.profileId;
        }
        // Create interaction log
        const logResult = await this.createInteractionLog(profileId, agentType, dimension, questions);
        // Return session info
        return {
            profileId,
            interactionId: logResult.interactionId,
            confidenceLevel: profileResult.success && profileResult.profile
                ? profileResult.profile.currentConfidenceLevel
                : { overall: 0, professional: 0, social: 0, behavioral: 0 },
        };
    }
    /**
     * Process a response in a confidence session
     * @param interactionId Interaction ID
     * @param question Question
     * @param response Response
     * @param calculateConfidence Function to calculate confidence impact
     * @returns Updated confidence
     */
    async processSessionResponse(interactionId, question, response, calculateConfidence) {
        // Calculate confidence impact if function provided
        let confidenceImpact = 0;
        if (calculateConfidence) {
            confidenceImpact = calculateConfidence(response);
        }
        else {
            // Default calculation based on response length and complexity
            confidenceImpact = Math.min(5, Math.max(0, Math.floor(response.length / 50)) +
                (response.includes(' because ') ? 1 : 0) +
                (response.includes(' however ') ? 1 : 0));
        }
        // Add response
        const result = await this.addInteractionResponse(interactionId, question, response, confidenceImpact);
        return {
            success: result.success,
            newConfidenceLevel: result.newConfidenceLevel,
        };
    }
    /**
     * Complete a confidence session with verification
     * @param interactionId Interaction ID
     * @param agents Agents involved
     * @param initialConfidence Initial confidence
     * @param finalConfidence Final confidence
     * @returns Verification record
     */
    async completeConfidenceSession(interactionId, agents, initialConfidence, finalConfidence) {
        // Calculate validation score
        const validationScore = Math.min(1.0, Math.max(0, (finalConfidence - initialConfidence) / 100 + 0.5));
        // Create verification record
        const result = await this.createVerificationRecord(interactionId, agents, initialConfidence, finalConfidence, validationScore);
        return {
            success: result.success,
            blockchainProof: result.blockchainProof,
        };
    }
}
// Export singleton instance
exports.q4dLenzService = new Q4DLenzService();
exports.default = exports.q4dLenzService;
//# sourceMappingURL=q4d-lenz-service.js.map