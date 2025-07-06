/**
 * Confidence Score Calculator
 *
 * Service for calculating comprehensive confidence scores based on profile data
 * from multiple sources.
 */

import { LinkedInProfileData } from './linkedin-profile-service';

interface ConfidenceScoreInput {
  linkedInProfile: any; // LinkedInProfileData 
  drMatchProfile: any; // DrMatchProfile
  agentSpecialization: string;
}

interface ConfidenceScoreResult {
  overallConfidence: number;
  domainConfidence: number;
  profileAuthenticity: number;
  specializedScores: {
    professionalRelevance: number;
    experienceDepth: number;
    credentialValidity: number;
    networkStrength: number;
  };
  confidenceTrend: {
    direction: 'increasing' | 'stable' | 'decreasing';
    velocity: number;
  };
}

export class ConfidenceScoreCalculator {
  /**
   * Calculates a comprehensive confidence score based on multiple data sources
   * 
   * @param params Object containing LinkedIn profile, DR match profile, and agent specialization
   * @returns A comprehensive confidence score result
   */
  calculateComprehensiveScore(params: ConfidenceScoreInput): ConfidenceScoreResult {
    const { linkedInProfile, drMatchProfile, agentSpecialization } = params;

    // Calculate sub-scores
    const profileAuthenticity = this.calculateProfileAuthenticity(linkedInProfile);
    const domainConfidence = this.calculateDomainConfidence(linkedInProfile, drMatchProfile, agentSpecialization);
    const networkStrength = this.calculateNetworkStrength(linkedInProfile, drMatchProfile);
    const experienceDepth = this.calculateExperienceDepth(linkedInProfile);
    const professionalRelevance = this.calculateProfessionalRelevance(linkedInProfile, agentSpecialization);
    const credentialValidity = this.calculateCredentialValidity(linkedInProfile, drMatchProfile);

    // Aggregate specialized scores
    const specializedScores = {
      professionalRelevance,
      experienceDepth,
      credentialValidity,
      networkStrength
    };

    // Weighted calculation of overall confidence
    const overallConfidence = (
      profileAuthenticity * 0.25 +
      domainConfidence * 0.35 +
      networkStrength * 0.15 +
      experienceDepth * 0.15 +
      credentialValidity * 0.10
    );

    // Determine confidence trend
    const confidenceTrend = {
      direction: this.determineConfidenceTrend(specializedScores),
      velocity: 0.05 // Placeholder for trend velocity
    };

    return {
      overallConfidence,
      domainConfidence,
      profileAuthenticity,
      specializedScores,
      confidenceTrend
    };
  }

  /**
   * Calculates profile authenticity based on LinkedIn profile data
   */
  private calculateProfileAuthenticity(linkedInProfile: LinkedInProfileData): number {
    // Check for comprehensive profile elements
    const hasDetailedExperience = linkedInProfile.experience && 
      linkedInProfile.experience.length > 1 && 
      linkedInProfile.experience.every(exp => exp.description && exp.description.length > 20);
    
    const hasDetailedEducation = linkedInProfile.education && 
      linkedInProfile.education.length > 0;
    
    const hasSubstantialSkills = linkedInProfile.skills && 
      linkedInProfile.skills.length > 3;
    
    const hasSubstantialConnections = linkedInProfile.connections > 300;
    const hasRecommendations = linkedInProfile.recommendations > 5;
    
    // Calculate authenticity score
    let score = 0.5; // Base score
    
    if (hasDetailedExperience) score += 0.15;
    if (hasDetailedEducation) score += 0.10;
    if (hasSubstantialSkills) score += 0.10;
    if (hasSubstantialConnections) score += 0.07;
    if (hasRecommendations) score += 0.08;
    
    // Cap at maximum of 1.0
    return Math.min(score, 1.0);
  }

  /**
   * Calculates domain confidence based on profile data and agent specialization
   */
  private calculateDomainConfidence(
    linkedInProfile: LinkedInProfileData, 
    drMatchProfile: any,
    agentSpecialization: string
  ): number {
    // Calculate domain alignment
    const domainAlignmentScore = drMatchProfile.compatibilityData?.domainAlignmentScore || 0.7;
    
    // Assess specialization relevance
    const specializationRelevance = this.assessSpecializationRelevance(
      linkedInProfile.skills, 
      agentSpecialization
    );
    
    // Industry experience relevance
    const industryExperienceScore = drMatchProfile.industryExperience ? 
      drMatchProfile.industryExperience.length / 10 : 0.3;
    
    // Weighted calculation
    return (
      domainAlignmentScore * 0.5 +
      specializationRelevance * 0.3 +
      Math.min(industryExperienceScore, 0.2) * 0.2
    );
  }

  /**
   * Calculates network strength based on profile data
   */
  private calculateNetworkStrength(linkedInProfile: LinkedInProfileData, drMatchProfile: any): number {
    const connectionScore = Math.min(linkedInProfile.connections / 3000, 1) * 0.4;
    const diversityScore = linkedInProfile.connectionDiversity ? 
      (linkedInProfile.connectionDiversity.crossIndustry * 0.6) : 0.3;
    const influenceScore = drMatchProfile.networkInsights ? 
      drMatchProfile.networkInsights.industryInfluenceScore * 0.3 : 0.2;
    
    return connectionScore + diversityScore + influenceScore;
  }

  /**
   * Calculates experience depth based on LinkedIn profile
   */
  private calculateExperienceDepth(linkedInProfile: LinkedInProfileData): number {
    if (!linkedInProfile.experience || linkedInProfile.experience.length === 0) {
      return 0.3; // Base score for minimal experience
    }
    
    // Calculate years of experience (simplified)
    const yearsOfExperience = linkedInProfile.experience.length * 2; // Very rough estimate
    
    // Score based on years of experience (capped)
    const experienceScore = Math.min(yearsOfExperience / 20, 1) * 0.7;
    
    // Score based on diversity of roles
    const roleTypes = new Set(linkedInProfile.experience.map(exp => exp.title.split(' ')[0]));
    const roleDiversityScore = Math.min(roleTypes.size / 5, 1) * 0.3;
    
    return experienceScore + roleDiversityScore;
  }

  /**
   * Assess the relevance of agent specialization to the profile's skills
   */
  private assessSpecializationRelevance(skills: string[], specialization: string): number {
    if (!skills || skills.length === 0) {
      return 0.5; // Default middle relevance
    }
    
    // Very simple keyword matching (would be more sophisticated in production)
    const specializationKeywords = specialization.toLowerCase().split(' ');
    let matchCount = 0;
    
    skills.forEach(skill => {
      const skillLower = skill.toLowerCase();
      specializationKeywords.forEach(keyword => {
        if (skillLower.includes(keyword)) {
          matchCount++;
        }
      });
    });
    
    return Math.min(matchCount / (specializationKeywords.length * 2), 1);
  }

  /**
   * Calculate credential validity based on profile data
   */
  private calculateCredentialValidity(linkedInProfile: LinkedInProfileData, drMatchProfile: any): number {
    // Base validity score
    let validityScore = 0.65;
    
    // Adjust based on education credentials
    if (linkedInProfile.education && linkedInProfile.education.length > 0) {
      const hasAdvancedDegree = linkedInProfile.education.some(edu => 
        edu.degree.includes('Ph.D') || edu.degree.includes('Master') || 
        edu.degree.includes('M.S.') || edu.degree.includes('MBA')
      );
      
      if (hasAdvancedDegree) validityScore += 0.15;
    }
    
    // Adjust based on recommendation strength
    if (drMatchProfile.networkInsights && drMatchProfile.networkInsights.recommendationStrength) {
      validityScore += drMatchProfile.networkInsights.recommendationStrength * 0.2;
    }
    
    return Math.min(validityScore, 1.0);
  }
  
  /**
   * Calculates professional relevance based on profile and specialization
   */
  private calculateProfessionalRelevance(
    linkedInProfile: LinkedInProfileData,
    agentSpecialization: string
  ): number {
    // Simple keyword matching (would use more sophisticated NLP in production)
    const specializationTerms = agentSpecialization.toLowerCase().split(' ');
    const profileTerms = [
      linkedInProfile.headline,
      linkedInProfile.currentPosition,
      linkedInProfile.industry,
      linkedInProfile.summary,
      ...linkedInProfile.skills
    ].join(' ').toLowerCase();
    
    let matchCount = 0;
    specializationTerms.forEach(term => {
      if (profileTerms.includes(term)) matchCount++;
    });
    
    const termMatchScore = Math.min(matchCount / specializationTerms.length, 1) * 0.7;
    
    // Industry alignment factor
    const industryAlignmentScore = 0.3; // Placeholder
    
    return termMatchScore + industryAlignmentScore;
  }

  /**
   * Determines the trend direction of confidence scores
   */
  private determineConfidenceTrend(specializedScores: Record<string, number>): 'increasing' | 'stable' | 'decreasing' {
    // Placeholder logic - in a real implementation, this would compare against historical data
    const scoreSum = Object.values(specializedScores).reduce((sum, score) => sum + score, 0);
    const averageScore = scoreSum / Object.values(specializedScores).length;
    
    // Arbitrary thresholds for demonstration
    if (averageScore > 0.8) return 'increasing';
    if (averageScore < 0.5) return 'decreasing';
    return 'stable';
  }
}

