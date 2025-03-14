"use strict";
/**
 * Confidence Score Calculator Service
 * Provides mechanisms to calculate confidence scores for authentication
 * and profile verification processes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfidenceScoreCalculator = void 0;
class ConfidenceScoreCalculator {
    constructor() {
        this.DEFAULT_WEIGHTS = {
            professionalAlignment: 0.4,
            networkDiversity: 0.2,
            collaborativeCapacity: 0.25,
            adaptabilityIndex: 0.15
        };
        this.COMPREHENSIVE_WEIGHTS = {
            professionalAlignment: 0.35,
            networkDiversity: 0.25,
            collaborativeCapacity: 0.25,
            adaptabilityIndex: 0.15
        };
    }
    /**
     * Calculate the overall confidence score based on LinkedIn profile and Dr. Match data
     */
    calculateConfidenceScore(profileData, drMatchData) {
        const components = this.calculateScoreComponents(profileData, drMatchData);
        return this.computeWeightedScore(components);
    }
    /**
     * Calculate individual score components based on input data
     */
    calculateScoreComponents(profileData, drMatchData) {
        return {
            professionalAlignment: this.calculateProfessionalAlignment(profileData, drMatchData),
            networkDiversity: this.calculateNetworkDiversity(profileData),
            collaborativeCapacity: this.calculateCollaborativeCapacity(profileData, drMatchData),
            adaptabilityIndex: this.calculateAdaptabilityIndex(profileData, drMatchData)
        };
    }
    /**
     * Compute the weighted confidence score from components using the default weights
     */
    computeWeightedScore(components) {
        return this.computeWeightedScoreWithCustomWeights(components, this.DEFAULT_WEIGHTS);
    }
    /**
     * Compute the weighted confidence score from components using custom weights
     */
    computeWeightedScoreWithCustomWeights(components, weights) {
        // Ensure weights sum to 1
        const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        if (Math.abs(totalWeight - 1.0) > 0.001) {
            console.warn(`Weights do not sum to 1.0 (sum: ${totalWeight}). Normalizing.`);
            // Normalize weights
            Object.keys(weights).forEach(key => {
                weights[key] /= totalWeight;
            });
        }
        // Calculate weighted sum
        return Object.keys(components).reduce((score, key) => {
            const typedKey = key;
            return score + (components[typedKey] * weights[typedKey]);
        }, 0);
    }
    /**
     * Calculate professional alignment score based on skills match and job history
     */
    calculateProfessionalAlignment(profileData, drMatchData) {
        // Sample implementation - in a real system this would use more sophisticated algorithms
        const skillsScore = profileData.skills.length / 10; // Normalize to 0-1 range
        const matchAttributesScore = drMatchData.matchAttributes.length / 5; // Normalize
        // Combine and cap at 1.0
        return Math.min(1.0, (skillsScore * 0.6) + (matchAttributesScore * 0.4) + (drMatchData.matchScore * 0.3));
    }
    /**
     * Calculate network diversity score based on LinkedIn connections
     */
    calculateNetworkDiversity(profileData) {
        // Sample implementation
        const connectionsCount = profileData.connections;
        // Sigmoid function to normalize: 1 / (1 + e^-((x-500)/200))
        return 1 / (1 + Math.exp(-((connectionsCount - 500) / 200)));
    }
    /**
     * Calculate collaborative capacity score based on LinkedIn recommendations and match data
     */
    calculateCollaborativeCapacity(profileData, drMatchData) {
        // Sample implementation
        const recommendationsScore = Math.min(1.0, profileData.recommendations / 10);
        const matchScore = drMatchData.matchScore; // Assuming normalized to 0-1 already
        return (recommendationsScore * 0.6) + (matchScore * 0.4);
    }
    /**
     * Calculate adaptability index based on job and education history
     */
    calculateAdaptabilityIndex(profileData, drMatchData) {
        // Sample implementation
        const jobChanges = profileData.jobHistory.length;
        const educationDiversity = profileData.educationHistory.length;
        // Normalize and combine
        const jobScore = Math.min(1.0, jobChanges / 5);
        const eduScore = Math.min(1.0, educationDiversity / 3);
        return (jobScore * 0.5) + (eduScore * 0.5);
    }
    /**
     * Calculate a comprehensive confidence score that incorporates all available data sources
     * and applies a more nuanced weighting algorithm based on the quality of input data.
     *
     * @param profileData LinkedIn profile data of the user
     * @param drMatchData Dr. Match profile compatibility data
     * @param additionalFactors Optional additional contextual factors for score adjustment
     * @returns An object containing overallConfidence, domainConfidence, and profileAuthenticity scores
     */
    calculateComprehensiveScore(params) {
        // Calculate the base components
        const baseComponents = this.calculateScoreComponents(params.linkedInProfile, params.drMatchProfile);
        // Apply the comprehensive weights
        const baseScore = this.computeWeightedScoreWithCustomWeights(baseComponents, this.COMPREHENSIVE_WEIGHTS);
        // Factor in agent specialization for more targeted confidence scoring
        const specializationBoost = this.calculateSpecializationBoost(params.linkedInProfile, params.agentSpecialization);
        // Apply the specialization boost (0-0.08 range)
        let adjustedScore = Math.min(1.0, baseScore * (1 + specializationBoost * 0.08));
        // Calculate domain confidence based on professional alignment and collaborative capacity
        const domainConfidence = Math.min(1.0, (baseComponents.professionalAlignment * 0.7) +
            (baseComponents.collaborativeCapacity * 0.3) +
            (specializationBoost * 0.1));
        // Calculate profile authenticity based on network diversity and recommendations
        const profileAuthenticity = Math.min(1.0, (baseComponents.networkDiversity * 0.6) +
            (baseComponents.adaptabilityIndex * 0.4));
        // Apply additional factors if provided
        if (params.additionalFactors) {
            let adjustmentFactor = 0;
            if (params.additionalFactors.recentActivityLevel !== undefined) {
                // More active users get a higher confidence boost (0-0.05)
                adjustmentFactor += params.additionalFactors.recentActivityLevel * 0.05;
            }
            if (params.additionalFactors.verificationStrength !== undefined) {
                // Stronger verification provides a confidence boost (0-0.1)
                adjustmentFactor += params.additionalFactors.verificationStrength * 0.1;
            }
            if (params.additionalFactors.historicalReliability !== undefined) {
                // Higher historical reliability provides a confidence boost (0-0.05)
                adjustmentFactor += params.additionalFactors.historicalReliability * 0.05;
            }
            // Apply the adjustment to overall confidence, ensuring we don't exceed 1.0
            adjustedScore = Math.min(1.0, adjustedScore * (1 + adjustmentFactor));
            // Apply smaller adjustments to domain confidence and profile authenticity
            const domainAdjustment = adjustmentFactor * 0.7;
            const authAdjustment = adjustmentFactor * 0.5;
            return {
                overallConfidence: adjustedScore,
                domainConfidence: Math.min(1.0, domainConfidence * (1 + domainAdjustment)),
                profileAuthenticity: Math.min(1.0, profileAuthenticity * (1 + authAdjustment))
            };
        }
        // Return all three confidence metrics
        return {
            overallConfidence: adjustedScore,
            domainConfidence: domainConfidence,
            profileAuthenticity: profileAuthenticity
        };
    }
    /**
     * Calculate a boost factor based on how well the agent's specialization
     * aligns with the professional skills and experience of the LinkedIn profile
     */
    calculateSpecializationBoost(profileData, agentSpecialization) {
        // Convert specialization to lowercase for case-insensitive matching
        const specialization = agentSpecialization.toLowerCase();
        // Count skills that align with the specialization
        const alignedSkills = profileData.skills.filter(skill => skill.toLowerCase().includes(specialization) ||
            specialization.includes(skill.toLowerCase())).length;
        // Calculate a normalized alignment score (0-1 range)
        const skillAlignment = Math.min(1.0, alignedSkills / Math.max(3, profileData.skills.length / 5));
        // Check job history for relevant experience
        const relevantExperience = profileData.jobHistory.some(job => (job.title && job.title.toLowerCase().includes(specialization)) ||
            (job.description && job.description.toLowerCase().includes(specialization))) ? 0.5 : 0;
        // Combine factors with appropriate weights
        return (skillAlignment * 0.7) + (relevantExperience * 0.3);
    }
}
exports.ConfidenceScoreCalculator = ConfidenceScoreCalculator;
