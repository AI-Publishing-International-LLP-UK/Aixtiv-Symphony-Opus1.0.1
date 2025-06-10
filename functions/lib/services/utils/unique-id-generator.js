"use strict";
/**
 * UniqueIdGenerator
 *
 * Service responsible for generating unique identifiers for authenticated users
 * based on their profile data, match data, and confidence scores.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniqueIdGenerator = void 0;
class UniqueIdGenerator {
    constructor() {
        this.VERSION = '1.0.0';
        this.NAMESPACE_PREFIX = 'dcaf'; // Dream Commander Authentication Framework
    }
    /**
     * Generates a unique identifier based on combined profile data
     * @param data Object containing profile, match and confidence data
     * @returns A unique string identifier
     */
    generate(data) {
        const { profileData, drMatchProfile, confidenceScores } = data;
        // Create a digest from the critical components of profile data
        const profileDigest = this.createProfileDigest(profileData);
        // Create a fingerprint from match data
        const matchFingerprint = this.createMatchFingerprint(drMatchProfile);
        // Create a confidence hash from confidence scores
        const confidenceHash = this.createConfidenceHash(confidenceScores);
        // Combine all components with version and namespace
        const uniqueId = this.combineComponents(profileDigest, matchFingerprint, confidenceHash);
        return uniqueId;
    }
    /**
     * Creates a digest from profile data
     */
    createProfileDigest(profileData) {
        // In a production environment, you might use a cryptographic hash function
        // For this implementation, we'll use a simple concatenation with base64 encoding
        const profileString = JSON.stringify({
            id: profileData.userId,
            name: profileData.name,
            // Add fingerprinting from key profile attributes
            attributes: this.extractKeyAttributes(profileData),
        });
        // Simple hash using string operations
        return this.simpleHash(profileString);
    }
    /**
    /**
     * Creates a fingerprint from match data
     */
    createMatchFingerprint(matchData) {
        var _a;
        const matchString = JSON.stringify({
            id: matchData.userId,
            fullName: matchData.fullName,
            careerLevel: matchData.careerLevel,
            // Extract collaborative metrics
            collaborationMetrics: matchData.collaborationMetrics
                ? `${matchData.collaborationMetrics.teamworkScore}|${matchData.collaborationMetrics.leadershipCapability}`
                : '',
            // Extract skills and industries if available
            skills: ((_a = matchData.growthMetrics) === null || _a === void 0 ? void 0 : _a.skillDevelopmentAreas)
                ? matchData.growthMetrics.skillDevelopmentAreas.slice(0, 3).join(',')
                : '',
            industries: matchData.industryExperience
                ? matchData.industryExperience.slice(0, 2).join(',')
                : '',
            // Network insights
            networkStrength: matchData.networkInsights
                ? matchData.networkInsights.connectionDiversity
                : 0,
            // Compatibility data
            compatibilityScore: matchData.compatibilityData
                ? matchData.compatibilityData.domainAlignmentScore
                : 0,
        });
        return this.simpleHash(matchString);
    }
    /**
     * Creates a hash from confidence scores
     */
    createConfidenceHash(scores) {
        // Ensure all required properties are present
        if (scores.overallConfidence === undefined ||
            scores.domainConfidence === undefined ||
            scores.profileAuthenticity === undefined) {
            throw new Error('ConfidenceScores must include overallConfidence, domainConfidence, and profileAuthenticity');
        }
        const scoresString = JSON.stringify({
            overall: Math.round(scores.overallConfidence * 100),
            domain: Math.round(scores.domainConfidence * 100),
            auth: Math.round(scores.profileAuthenticity * 100),
            // Include optional detailed scores if available
            pAlign: scores.professionalAlignment
                ? Math.round(scores.professionalAlignment * 100)
                : 0,
            nDiv: scores.networkDiversity
                ? Math.round(scores.networkDiversity * 100)
                : 0,
            cCap: scores.collaborativeCapacity
                ? Math.round(scores.collaborativeCapacity * 100)
                : 0,
            aIdx: scores.adaptabilityIndex
                ? Math.round(scores.adaptabilityIndex * 100)
                : 0,
        });
        return this.simpleHash(scoresString);
    }
    /**
     * Combines all components into a final unique ID
     */
    combineComponents(profileDigest, matchFingerprint, confidenceHash) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return [
            this.NAMESPACE_PREFIX,
            this.VERSION.replace(/\./g, ''),
            profileDigest.substring(0, 8),
            matchFingerprint.substring(0, 8),
            confidenceHash.substring(0, 8),
            timestamp,
            random,
        ].join('-');
    }
    /**
     * Extracts key attributes from profile data
     */
    extractKeyAttributes(profileData) {
        const keyParts = [
            profileData.userId,
            profileData.name,
            profileData.email || '',
            profileData.skills ? profileData.skills.slice(0, 3).join(',') : '',
            profileData.experience ? profileData.experience.length.toString() : '0',
        ];
        return keyParts.join('|');
    }
    /**
     * A simple string hashing function for demonstration
     * In production, use a cryptographically secure hash function
     */
    simpleHash(input) {
        let hash = 0;
        if (input.length === 0)
            return hash.toString(36);
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        // Convert to alphanumeric string and ensure positive
        return Math.abs(hash).toString(36);
    }
}
exports.UniqueIdGenerator = UniqueIdGenerator;
//# sourceMappingURL=unique-id-generator.js.map