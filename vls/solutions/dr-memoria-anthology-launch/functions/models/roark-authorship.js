/**
 * roark-authorship.js
 * Implements the Roark 5.0 Authorship model for tracking human vs AI contributions,
 * enforcing the 70% human contribution requirement, and generating authorship certificates.
 */

const crypto = require('crypto');
const { logger } = require('../utils/errorLogging');

/**
 * RoarkAuthorship class for managing content creation with a focus on human creative sovereignty
 */
class RoarkAuthorship {
  constructor(config = {}) {
    // Configuration with defaults
    this.config = {
      minimumHumanContribution: 0.7, // 70% minimum human contribution required
      maximumAIContribution: 0.3, // 30% maximum AI contribution allowed
      strictValidation: true, // Enforce strict validation by default
      ...config,
    };
  }

  /**
   * Calculates the contribution percentages for a creative work
   * @param {Array} contributions - Array of contribution objects with content and type (HUMAN or AI)
   * @returns {Object} - Object containing human and AI contribution percentages
   */
  calculateContributionPercentages(contributions) {
    if (
      !contributions ||
      !Array.isArray(contributions) ||
      contributions.length === 0
    ) {
      throw new Error('Invalid contributions data provided');
    }

    let humanContributionScore = 0;
    let aiContributionScore = 0;
    let totalScore = 0;

    // Calculate weighted contribution scores
    contributions.forEach(contribution => {
      const content = contribution.content || '';
      const weight = this._calculateContributionWeight(contribution);
      const score = this._calculateContentScore(content) * weight;

      if (contribution.type === 'HUMAN') {
        humanContributionScore += score;
      } else if (contribution.type === 'AI') {
        aiContributionScore += score;
      }

      totalScore += score;
    });

    // Calculate percentages
    const humanPercentage =
      totalScore > 0 ? humanContributionScore / totalScore : 0;
    const aiPercentage = totalScore > 0 ? aiContributionScore / totalScore : 0;

    return {
      humanPercentage: Math.round(humanPercentage * 1000) / 1000, // Round to 3 decimal places
      aiPercentage: Math.round(aiPercentage * 1000) / 1000,
      totalScore,
    };
  }

  /**
   * Validates if content meets the minimum human contribution requirement
   * @param {Array} contributions - Array of contribution objects
   * @returns {Object} - Validation result object
   */
  validateContentContributions(contributions) {
    try {
      const { humanPercentage, aiPercentage } =
        this.calculateContributionPercentages(contributions);

      const isValid =
        humanPercentage >= this.config.minimumHumanContribution &&
        aiPercentage <= this.config.maximumAIContribution;

      // Check content for harmful or political content
      const containsProhibitedContent = !contributions.every(contribution =>
        this._doesNotContainHarmfulOrPoliticalContent(contribution.content)
      );

      return {
        isValid: isValid && !containsProhibitedContent,
        humanPercentage,
        aiPercentage,
        meetsHumanThreshold:
          humanPercentage >= this.config.minimumHumanContribution,
        exceedsAIThreshold: aiPercentage > this.config.maximumAIContribution,
        containsProhibitedContent,
      };
    } catch (error) {
      logger.error('Error validating content contributions', error);
      throw error;
    }
  }

  /**
   * Generates an authorship certificate for a validated creative work
   * @param {Object} work - The creative work object
   * @param {Array} contributions - Array of contribution objects
   * @param {Object} owner - Owner information
   * @returns {Object} - The authorship certificate
   */
  generateAuthorshipCertificate(work, contributions, owner) {
    // Validate the content first
    const validationResult = this.validateContentContributions(contributions);

    if (!validationResult.isValid) {
      throw new Error(
        'Cannot generate certificate for content that does not meet authorship requirements'
      );
    }

    // Generate a unique identifier for the certificate
    const certificateId = this._generateCertificateId(work, owner);

    // Create timestamp for certificate generation
    const timestamp = new Date().toISOString();

    // Calculate originality score
    const originalityScore = this._calculateOriginalityScore(contributions);

    // Generate the certificate
    return {
      certificateId,
      workId: work.id,
      title: work.title,
      owner: {
        id: owner.id,
        name: owner.name,
      },
      contributions: {
        humanPercentage: validationResult.humanPercentage,
        aiPercentage: validationResult.aiPercentage,
        count: contributions.length,
      },
      metrics: {
        originalityScore,
        integrityScore: this._calculateIntegrityScore(contributions),
      },
      certification: {
        timestamp,
        standard: 'Roark 5.0 Authorship Model',
        version: '1.0.0',
      },
      verificationHash: this._generateVerificationHash(
        work,
        contributions,
        owner,
        timestamp
      ),
    };
  }

  /**
   * Calculates the weight of a contribution based on its type and metadata
   * @param {Object} contribution - Contribution object
   * @returns {Number} - Weight factor between 0 and 1
   * @private
   */
  _calculateContributionWeight(contribution) {
    // Default weight is 1.0
    let weight = 1.0;

    // Adjust weight based on contribution metadata if available
    if (contribution.metadata) {
      // Consider the stage of contribution in the creative process
      if (contribution.metadata.stage === 'initial_concept') {
        weight *= 1.5; // Initial concepts have higher weight
      } else if (contribution.metadata.stage === 'refinement') {
        weight *= 0.8; // Refinements have slightly lower weight
      }

      // Consider the impact of the contribution
      if (contribution.metadata.impact === 'major') {
        weight *= 1.3;
      } else if (contribution.metadata.impact === 'minor') {
        weight *= 0.7;
      }
    }

    return Math.min(Math.max(weight, 0.5), 1.5); // Keep weight between 0.5 and 1.5
  }

  /**
   * Calculates a content score based on length, complexity, and coherence
   * @param {String} content - The content text
   * @returns {Number} - Content score
   * @private
   */
  _calculateContentScore(content) {
    if (!content || typeof content !== 'string') {
      return 0;
    }

    // Basic scoring based on content length
    const lengthScore = Math.min(content.length / 1000, 5); // Cap at 5 for 5000+ character content

    // Complexity scoring (simplified)
    const wordCount = content.split(/\s+/).length;
    const sentenceCount = content.split(/[.!?]+/).length;
    const avgWordsPerSentence =
      sentenceCount > 0 ? wordCount / sentenceCount : 0;
    const complexityScore = Math.min(avgWordsPerSentence / 10, 3); // Cap at 3 for 30+ words per sentence

    // Combined score with weighting
    return lengthScore * 0.6 + complexityScore * 0.4;
  }

  /**
   * Checks if content is free from harmful or political content
   * @param {String} content - Content to check
   * @returns {Boolean} - True if content does not contain harmful or political content
   * @private
   */
  _doesNotContainHarmfulOrPoliticalContent(content) {
    if (!content || typeof content !== 'string') {
      return true; // Empty content is considered safe
    }

    // Simplified prohibited content detection
    const prohibitedTerms = [
      // Harmful content indicators
      'hate speech',
      'violence',
      'terrorism',
      'suicide',
      'self-harm',
      'child abuse',
      'exploitation',
      'harassment',
      'illegal activity',

      // Political content indicators
      'political party',
      'candidate',
      'election',
      'policy debate',
      'parliament',
      'congress',
      'legislation',
      'campaign',
      'voter',
      'liberal',
      'conservative',
      'democrat',
      'republican',
      'socialist',
      'political stance',
      'political agenda',
      'political bias',
    ];

    const contentLowerCase = content.toLowerCase();

    // Check for prohibited terms
    for (const term of prohibitedTerms) {
      if (contentLowerCase.includes(term)) {
        logger.warn(`Content contains prohibited term: ${term}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Calculates originality score based on content uniqueness
   * @param {Array} contributions - Contribution objects
   * @returns {Number} - Originality score between 0 and 1
   * @private
   */
  _calculateOriginalityScore(contributions) {
    // Simplified originality calculation
    // In a real implementation, this would involve more sophisticated analysis
    // such as comparing against a corpus of existing works
    const avgContentLength =
      contributions.reduce((sum, contribution) => {
        return sum + (contribution.content ? contribution.content.length : 0);
      }, 0) / contributions.length;

    // Naive approximation of originality based on content length
    // This is a placeholder for a more sophisticated implementation
    return Math.min(avgContentLength / 5000, 0.95);
  }

  /**
   * Calculates integrity score based on contribution coherence
   * @param {Array} contributions - Contribution objects
   * @returns {Number} - Integrity score between 0 and 1
   * @private
   */
  _calculateIntegrityScore(contributions) {
    // In a real implementation, this would analyze coherence between contributions
    // For this simplified version, we'll return a static high score
    return 0.9;
  }

  /**
   * Generates a unique certificate ID
   * @param {Object} work - Work object
   * @param {Object} owner - Owner object
   * @returns {String} - Certificate ID
   * @private
   */
  _generateCertificateId(work, owner) {
    const timestamp = Date.now();
    const baseString = `${work.id}-${owner.id}-${timestamp}`;
    return `ROARK-${crypto.createHash('sha256').update(baseString).digest('hex').substring(0, 16)}`;
  }

  /**
   * Generates a verification hash for the certificate
   * @param {Object} work - Work object
   * @param {Array} contributions - Contribution objects
   * @param {Object} owner - Owner object
   * @param {String} timestamp - Certificate timestamp
   * @returns {String} - Verification hash
   * @private
   */
  _generateVerificationHash(work, contributions, owner, timestamp) {
    // Create a string representation of the certificate data
    const contributionData = contributions
      .map(c => `${c.type}:${c.content ? c.content.length : 0}`)
      .join('|');
    const dataToHash = `${work.id}|${work.title}|${owner.id}|${contributionData}|${timestamp}`;

    // Generate SHA-256 hash
    return crypto.createHash('sha256').update(dataToHash).digest('hex');
  }
}

module.exports = RoarkAuthorship;
