/**
 * LinkedIn Integration for Q4D-Lenz
 *
 * This module implements the integration with LinkedIn data via Dr. Match App
 * to enhance the Q4D-Lenz with professional network insights.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const axios = require('axios');

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Import utility functions
const {
  getDocumentById,
  updateDocument,
  createDocument,
  handleHttpError,
  createHttpError,
  authenticateUser,
} = require('./utils');

/**
 * LinkedIn Data Service
 *
 * Service to fetch, process, and analyze LinkedIn data
 */
class LinkedInDataService {
  constructor(config = {}) {
    this.linkedInData = db.collection('linkedInData');
    this.networkAnalysis = db.collection('networkAnalysis');
    this.drMatchAppUrl =
      config.drMatchAppUrl ||
      functions.config().linkedin?.drmatchurl ||
      'https://dr-match-app.example.com';
    this.apiKey = config.apiKey || functions.config().linkedin?.apikey;
  }

  /**
   * Fetch LinkedIn data for an owner-subscriber
   *
   * @param {string} ownerSubscriberId - Owner-subscriber ID
   * @param {string} linkedInToken - LinkedIn access token
   * @returns {Promise<Object>} - LinkedIn data
   */
  async fetchLinkedInData(ownerSubscriberId, linkedInToken) {
    try {
      // In a real implementation, this would call the Dr. Match App API
      // For now, we'll simulate the API call

      // Check if we already have data for this owner
      const existingData = await getDocumentById(
        'linkedInData',
        ownerSubscriberId
      );

      if (existingData && !this._isDataStale(existingData)) {
        return {
          ownerSubscriberId,
          data: existingData.data,
          fromCache: true,
          lastFetched: existingData.fetchedAt
            ? existingData.fetchedAt.toDate().toISOString()
            : null,
        };
      }

      // Simulate calling the Dr. Match App API
      const linkedInData = await this._callDrMatchApp(
        ownerSubscriberId,
        linkedInToken
      );

      // Store the data
      await createDocument('linkedInData', ownerSubscriberId, {
        ownerSubscriberId,
        data: linkedInData,
        fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
        processed: false,
      });

      return {
        ownerSubscriberId,
        data: linkedInData,
        fromCache: false,
        lastFetched: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching LinkedIn data:', error);
      throw error;
    }
  }

  /**
   * Check if LinkedIn data is stale (older than 7 days)
   *
   * @param {Object} data - LinkedIn data object
   * @returns {boolean} - Whether data is stale
   * @private
   */
  _isDataStale(data) {
    if (!data.fetchedAt) return true;

    const fetchDate = data.fetchedAt.toDate();
    const now = new Date();
    const daysDiff = (now - fetchDate) / (1000 * 60 * 60 * 24);

    return daysDiff > 7;
  }

  /**
   * Call the Dr. Match App API
   *
   * @param {string} ownerSubscriberId - Owner-subscriber ID
   * @param {string} linkedInToken - LinkedIn access token
   * @returns {Promise<Object>} - LinkedIn data
   * @private
   */
  async _callDrMatchApp(ownerSubscriberId, linkedInToken) {
    try {
      // In a real implementation, this would make an actual API call
      // For now, we'll return simulated data

      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate a simulated professional profile
      return this._generateSimulatedLinkedInData(ownerSubscriberId);
    } catch (error) {
      console.error('Error calling Dr. Match App:', error);
      throw error;
    }
  }

  /**
   * Generate simulated LinkedIn data
   *
   * @param {string} ownerSubscriberId - Owner-subscriber ID
   * @returns {Object} - Simulated LinkedIn data
   * @private
   */
  _generateSimulatedLinkedInData(ownerSubscriberId) {
    // Get a deterministic but seemingly random value based on the owner ID
    const getRandomValueForOwner = (min, max) => {
      const hash = ownerSubscriberId.split('').reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);

      return Math.floor(Math.abs(Math.sin(hash) * (max - min)) + min);
    };

    // Industry options
    const industries = [
      'Technology',
      'Healthcare',
      'Finance',
      'Education',
      'Manufacturing',
      'Retail',
      'Media',
      'Consulting',
    ];

    // Position options
    const positions = [
      'Director',
      'Manager',
      'Specialist',
      'Consultant',
      'Analyst',
      'Engineer',
      'Executive',
      'Coordinator',
    ];

    // Department options
    const departments = [
      'Marketing',
      'Sales',
      'Engineering',
      'Product',
      'HR',
      'Finance',
      'Operations',
      'Research',
    ];

    // Skills options
    const skillsPool = [
      'Leadership',
      'Strategic Planning',
      'Project Management',
      'Team Building',
      'Communication',
      'Negotiation',
      'Data Analysis',
      'Problem Solving',
      'Innovation',
      'JavaScript',
      'Python',
      'SQL',
      'AI/ML',
      'Cloud Computing',
      'Digital Marketing',
      'SEO',
      'Content Strategy',
      'UX Design',
    ];

    // Generate a simulated profile
    const industryIndex = getRandomValueForOwner(0, industries.length);
    const positionIndex = getRandomValueForOwner(0, positions.length);
    const departmentIndex = getRandomValueForOwner(0, departments.length);
    const connectionCount = getRandomValueForOwner(150, 1500);

    // Generate skills (4-8 random skills)
    const skillCount = getRandomValueForOwner(4, 9);
    const skills = [];
    for (let i = 0; i < skillCount; i++) {
      const skillIndex = getRandomValueForOwner(0, skillsPool.length);
      if (!skills.includes(skillsPool[skillIndex])) {
        skills.push(skillsPool[skillIndex]);
      }
    }

    // Generate education
    const universities = [
      'Stanford University',
      'MIT',
      'Harvard University',
      'University of California',
      'University of Michigan',
      'University of Texas',
      'Cornell University',
    ];

    const degrees = [
      'BS in Computer Science',
      'MBA',
      'MS in Engineering',
      'BA in Business',
      'PhD in Economics',
      'MS in Data Science',
    ];

    const universityIndex = getRandomValueForOwner(0, universities.length);
    const degreeIndex = getRandomValueForOwner(0, degrees.length);

    // Generate simulated LinkedIn data
    return {
      profile: {
        industry: industries[industryIndex],
        position: `${positions[positionIndex]} of ${departments[departmentIndex]}`,
        connections: connectionCount,
        skills: skills,
        education: [
          {
            institution: universities[universityIndex],
            degree: degrees[degreeIndex],
            year: 2010 + getRandomValueForOwner(0, 10),
          },
        ],
        experience: [
          {
            company: 'Current Company Inc.',
            title: `${positions[positionIndex]} of ${departments[departmentIndex]}`,
            duration: `${1 + getRandomValueForOwner(0, 5)} years`,
          },
          {
            company: 'Previous Company Ltd.',
            title: `${positions[(positionIndex + 1) % positions.length]} of ${departments[(departmentIndex + 1) % departments.length]}`,
            duration: `${1 + getRandomValueForOwner(0, 3)} years`,
          },
        ],
      },
      network: {
        connectionCount,
        industryDistribution: {
          [industries[industryIndex]]:
            0.4 + getRandomValueForOwner(0, 20) / 100,
          [industries[(industryIndex + 1) % industries.length]]:
            0.2 + getRandomValueForOwner(0, 15) / 100,
          [industries[(industryIndex + 2) % industries.length]]:
            0.1 + getRandomValueForOwner(0, 10) / 100,
          Other: 0.3 - getRandomValueForOwner(0, 15) / 100,
        },
        growth: {
          monthly: getRandomValueForOwner(5, 20),
          yearly: getRandomValueForOwner(50, 200),
        },
      },
    };
  }

  /**
   * Analyze LinkedIn data for professional insights
   *
   * @param {string} ownerSubscriberId - Owner-subscriber ID
   * @returns {Promise<Object>} - Analysis results
   */
  async analyzeLinkedInData(ownerSubscriberId) {
    try {
      // Get LinkedIn data
      const linkedInData = await getDocumentById(
        'linkedInData',
        ownerSubscriberId
      );

      if (!linkedInData) {
        throw new Error(
          `LinkedIn data for owner ${ownerSubscriberId} not found`
        );
      }

      // Perform analysis
      const analysis = this._analyzeNetworkData(linkedInData.data);

      // Store analysis results
      const analysisId = await createDocument('networkAnalysis', null, {
        ownerSubscriberId,
        analysis,
        linkedInDataId: linkedInData.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Mark LinkedIn data as processed
      await updateDocument('linkedInData', ownerSubscriberId, {
        processed: true,
        analysisId,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        analysisId,
        analysis,
      };
    } catch (error) {
      console.error('Error analyzing LinkedIn data:', error);
      throw error;
    }
  }

  /**
   * Analyze network data to generate insights
   *
   * @param {Object} data - LinkedIn data
   * @returns {Object} - Analysis results
   * @private
   */
  _analyzeNetworkData(data) {
    // Extract profile and network data
    const { profile, network } = data;

    // Calculate network strength (0-100)
    const networkSize = network.connectionCount;
    let networkStrength = 0;

    if (networkSize < 200) {
      networkStrength = networkSize / 2;
    } else if (networkSize < 500) {
      networkStrength = 50 + (networkSize - 200) / 10;
    } else {
      networkStrength = 80 + (networkSize - 500) / 50;
    }

    networkStrength = Math.min(Math.max(networkStrength, 0), 100);

    // Calculate industry presence (0-100)
    const primaryIndustry = profile.industry;
    const primaryIndustryPercentage =
      network.industryDistribution[primaryIndustry] || 0;
    const industryPresence = primaryIndustryPercentage * 100;

    // Calculate growth momentum (0-100)
    const monthlyGrowth = network.growth.monthly;
    const yearlyGrowth = network.growth.yearly;

    let growthMomentum = 0;

    if (yearlyGrowth < 50) {
      growthMomentum = yearlyGrowth;
    } else if (yearlyGrowth < 150) {
      growthMomentum = 50 + (yearlyGrowth - 50) / 2;
    } else {
      growthMomentum = 75 + (yearlyGrowth - 150) / 10;
    }

    growthMomentum = Math.min(Math.max(growthMomentum, 0), 100);

    // Generate insights based on analysis
    const insights = this._generateNetworkInsights(
      profile,
      network,
      networkStrength,
      industryPresence,
      growthMomentum
    );

    return {
      metrics: {
        networkStrength,
        industryPresence,
        growthMomentum,
      },
      insights,
    };
  }

  /**
   * Generate network insights based on analysis
   *
   * @param {Object} profile - LinkedIn profile
   * @param {Object} network - Network data
   * @param {number} networkStrength - Network strength score
   * @param {number} industryPresence - Industry presence score
   * @param {number} growthMomentum - Growth momentum score
   * @returns {Object} - Network insights
   * @private
   */
  _generateNetworkInsights(
    profile,
    network,
    networkStrength,
    industryPresence,
    growthMomentum
  ) {
    const insights = {
      strengths: [],
      opportunities: [],
      recommendations: [],
    };

    // Add strengths based on metrics
    if (networkStrength > 70) {
      insights.strengths.push('Strong overall network size and reach');
    }

    if (industryPresence > 60) {
      insights.strengths.push(
        `Strong presence in the ${profile.industry} industry`
      );
    }

    if (growthMomentum > 60) {
      insights.strengths.push('Excellent network growth momentum');
    }

    // Add opportunities based on metrics
    if (networkStrength < 50) {
      insights.opportunities.push('Potential to expand overall network size');
    }

    if (industryPresence < 40) {
      insights.opportunities.push(
        `Opportunity to strengthen presence in the ${profile.industry} industry`
      );
    }

    if (growthMomentum < 40) {
      insights.opportunities.push(
        'Potential to increase rate of new connections'
      );
    }

    // Generate recommendations
    if (networkStrength < 50) {
      insights.recommendations.push(
        'Attend industry events and engage with professionals in your field'
      );
    } else if (industryPresence < 40) {
      insights.recommendations.push(
        'Connect with more professionals in your specific industry'
      );
    } else if (growthMomentum < 40) {
      insights.recommendations.push(
        'Set a goal to add 3-5 meaningful connections each week'
      );
    } else {
      insights.recommendations.push(
        'Focus on deepening relationships with your existing network'
      );
    }

    // Add skill-based recommendations
    if (profile.skills && profile.skills.length > 0) {
      insights.recommendations.push(
        `Highlight your expertise in ${profile.skills.slice(0, 3).join(', ')} to attract relevant connections`
      );
    }

    return insights;
  }
}

// Create Express API for LinkedIn integration
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(authenticateUser);

// Initialize LinkedIn data service
const linkedInService = new LinkedInDataService();

/**
 * Fetch LinkedIn data
 * POST /api/linkedin/fetch
 */
app.post('/fetch', async (req, res) => {
  try {
    const { ownerSubscriberId, linkedInToken } = req.body;

    if (!ownerSubscriberId) {
      throw createHttpError('Owner-subscriber ID is required', 400);
    }

    const result = await linkedInService.fetchLinkedInData(
      ownerSubscriberId,
      linkedInToken
    );

    res.status(200).json({
      ownerSubscriberId,
      fromCache: result.fromCache,
      lastFetched: result.lastFetched,
      profile: result.data.profile,
    });
  } catch (error) {
    handleHttpError(error, res);
  }
});

/**
 * Analyze LinkedIn data
 * POST /api/linkedin/analyze
 */
app.post('/analyze', async (req, res) => {
  try {
    const { ownerSubscriberId } = req.body;

    if (!ownerSubscriberId) {
      throw createHttpError('Owner-subscriber ID is required', 400);
    }

    const result = await linkedInService.analyzeLinkedInData(ownerSubscriberId);

    res.status(200).json({
      ownerSubscriberId,
      analysisId: result.analysisId,
      metrics: result.analysis.metrics,
      insights: result.analysis.insights,
    });
  } catch (error) {
    handleHttpError(error, res);
  }
});

/**
 * Get LinkedIn data
 * GET /api/linkedin/:ownerSubscriberId
 */
app.get('/:ownerSubscriberId', async (req, res) => {
  try {
    const { ownerSubscriberId } = req.params;

    if (!ownerSubscriberId) {
      throw createHttpError('Owner-subscriber ID is required', 400);
    }

    const linkedInData = await getDocumentById(
      'linkedInData',
      ownerSubscriberId
    );

    if (!linkedInData) {
      throw createHttpError(
        `LinkedIn data for owner ${ownerSubscriberId} not found`,
        404
      );
    }

    res.status(200).json({
      ownerSubscriberId,
      profile: linkedInData.data.profile,
      fetchedAt: linkedInData.fetchedAt
        ? linkedInData.fetchedAt.toDate().toISOString()
        : null,
    });
  } catch (error) {
    handleHttpError(error, res);
  }
});

/**
 * Get network analysis
 * GET /api/linkedin/:ownerSubscriberId/analysis
 */
app.get('/:ownerSubscriberId/analysis', async (req, res) => {
  try {
    const { ownerSubscriberId } = req.params;

    if (!ownerSubscriberId) {
      throw createHttpError('Owner-subscriber ID is required', 400);
    }

    // Find the latest analysis for this owner
    const snapshot = await db
      .collection('networkAnalysis')
      .where('ownerSubscriberId', '==', ownerSubscriberId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw createHttpError(
        `Network analysis for owner ${ownerSubscriberId} not found`,
        404
      );
    }

    const analysis = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
      createdAt: snapshot.docs[0].data().createdAt
        ? snapshot.docs[0].data().createdAt.toDate().toISOString()
        : null,
    };

    res.status(200).json({
      ownerSubscriberId,
      metrics: analysis.analysis.metrics,
      insights: analysis.analysis.insights,
      createdAt: analysis.createdAt,
    });
  } catch (error) {
    handleHttpError(error, res);
  }
});

// Export the LinkedIn integration API
const linkedInApi = functions.region('us-west1').https.onRequest(app);

module.exports = {
  LinkedInDataService,
  linkedInApi,
};
