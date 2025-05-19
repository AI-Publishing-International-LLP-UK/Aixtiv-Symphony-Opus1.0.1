/**
 * Career Expertise Framework
 * Implements Holland RIASEC and Military DFAB benchmarking
 * for Agent Career Expertise Assessment
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
 * RIASEC Profile Interface
 * Based on Holland's Occupational Themes
 */


/**
 * DFAB (Direction, Function, Action, Behavior) Assessment
 * Based on Military Leadership Assessment
 */


/**
 * Career Industry Categories
 */
enum IndustryCategory {
  TECHNOLOGY = 'technology',
  HEALTHCARE = 'healthcare',
  FINANCE = 'finance',
  EDUCATION = 'education',
  GOVERNMENT = 'government',
  MANUFACTURING = 'manufacturing',
  RETAIL = 'retail',
  SERVICES = 'services',
  MEDIA = 'media',
  NONPROFIT = 'nonprofit'
}

/**
 * Role Level Hierarchy
 */
enum RoleLevel {
  ENTRY = 'entry',
  INTERMEDIATE = 'intermediate',
  SENIOR = 'senior',
  LEAD = 'lead',
  MANAGER = 'manager',
  DIRECTOR = 'director',
  EXECUTIVE = 'executive',
  C_LEVEL = 'c_level'
}

/**
 * Nine Box Position Interface
 * For talent management and career trajectory
 */


/**
 * Career Expertise Profile
 */
;
    roleLevel;
    yearsOfExperience;
    specializations;
    careerTrajectory: {
      verticalMovement; // Positive = upward, Negative = downward
      horizontalMovement; // Career changes across industries
      growthRate; // Rate of progression
    };
  };
  nineBoxPosition;
  expertiseScores: {
    technical;
    leadership;
    domain;
    innovation;
    communication;
  };
  benchmarks: {
    industryPercentile;
    peerComparison;
    projectedGrowth;
  };
  careerRecommendations: {
    shortTerm;
    longTerm;
    skillsToAcquire;
    potentialRoles;
  };
  createdAt;
  updatedAt;
}

/**
 * Nine Box Assessment result mapping
 */
const NINE_BOX_MAPPINGS= {
  '1,1': {
    x,
    y,
    label: 'Risk',
    description: 'Low performance with low potential. May require performance improvement plan or role reassessment.',
    recommendations: [
      'Establish clear performance expectations',
      'Provide structured development opportunities',
      'Consider role fit assessment'
    ]
  },
  '1,2': {
    x,
    y,
    label: 'Enigma',
    description: 'Low performance with moderate potential. May be underperforming due to role misalignment.',
    recommendations: [
      'Clarify performance expectations',
      'Explore alternative roles that may better fit capabilities',
      'Provide coaching and mentoring'
    ]
  },
  '1,3': {
    x,
    y,
    label: 'Potential Gem',
    description: 'Low performance with high potential. May be new to role or need direction.',
    recommendations: [
      'Provide clear performance expectations and guidance',
      'Offer mentoring and coaching',
      'Create development opportunities to leverage potential'
    ]
  },
  '2,1': {
    x,
    y,
    label: 'Solid Professional',
    description: 'Moderate performance with low potential. Reliable contributor with limited growth trajectory.',
    recommendations: [
      'Recognize consistent contributions',
      'Provide skill enhancement opportunities',
      'Consider lateral movement for experience broadening'
    ]
  },
  '2,2': {
    x,
    y,
    label: 'Core Player',
    description: 'Moderate performance with moderate potential. Solid team member with room to grow.',
    recommendations: [
      'Offer targeted development opportunities',
      'Provide increasingly challenging assignments',
      'Consider structured mentoring program'
    ]
  },
  '2,3': {
    x,
    y,
    label: 'Rising Star',
    description: 'Moderate performance with high potential. Shows promise for significant growth.',
    recommendations: [
      'Create stretch assignments',
      'Establish development plan with clear milestones',
      'Consider leadership development programs'
    ]
  },
  '3,1': {
    x,
    y,
    label: 'Valued Expert',
    description: 'High performance with low potential. Subject matter expert with deep domain knowledge.',
    recommendations: [
      'Recognize expertise and contributions',
      'Create opportunities to mentor others',
      'Consider knowledge sharing and documentation initiatives'
    ]
  },
  '3,2': {
    x,
    y,
    label: 'Key Player',
    description: 'High performance with moderate potential. Consistent contributor with some growth capacity.',
    recommendations: [
      'Provide growth opportunities in current role',
      'Consider succession planning for next level',
      'Develop leadership capabilities'
    ]
  },
  '3,3': {
    x,
    y,
    label: 'Star',
    description: 'High performance with high potential. Top talent with significant leadership trajectory.',
    recommendations: [
      'Create accelerated development plan',
      'Offer executive sponsorship',
      'Provide strategic and high-visibility assignments'
    ]
  }
};

/**
 * RIASEC to Industry mapping
 */
const RIASEC_INDUSTRY_MAPPING= {
  'R',
  'I',
  'A',
  'S',
  'E',
  'C', IndustryCategory.GOVERNMENT]
};

/**
 * Create a career expertise profile
 */
export const createCareerProfile = functions.https.onCall({
  region: 'us-west1',
}, async (request) => {
  try {
    const { 
      userId, 
      riasecScores,
      dfabScores,
      industries,
      roleLevel,
      yearsOfExperience,
      specializations,
      performanceRating,
      potentialRating
    } = request.data;
    
    if (!userId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'User ID is required'
      );
    }
    
    // Check if profile already exists
    const existingProfiles = await firestore
      .collection('careerExpertiseProfiles')
      .where('userId', '==', userId)
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
    
    // Calculate RIASEC profile
    const riasecProfile = calculateRiasecProfile(riasecScores);
    
    // Calculate DFAB assessment
    const dfabAssessment = calculateDfabAssessment(dfabScores);
    
    // Calculate Nine Box position
    const nineBoxPosition = calculateNineBoxPosition(
      performanceRating || 2,
      potentialRating || 2
    );
    
    // Calculate career trajectory
    const careerTrajectory = calculateCareerTrajectory(
      roleLevel,
      yearsOfExperience
    );
    
    // Calculate expertise scores
    const expertiseScores = calculateExpertiseScores(
      riasecProfile,
      dfabAssessment,
      yearsOfExperience,
      roleLevel
    );
    
    // Calculate benchmarks
    const benchmarks = calculateBenchmarks(
      riasecProfile,
      dfabAssessment,
      expertiseScores,
      industries,
      roleLevel,
      yearsOfExperience
    );
    
    // Generate career recommendations
    const careerRecommendations = generateCareerRecommendations(
      riasecProfile,
      dfabAssessment,
      nineBoxPosition,
      industries,
      specializations
    );
    
    // Create profile document
    const profileId = uuidv4();
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const profile, 'createdAt' | 'updatedAt'> & {
      createdAt;
      updatedAt;
    } = {
      id,
      careerAttributes: {
        industries: {
          primary: industries?.primary || IndustryCategory.TECHNOLOGY,
          secondary: industries?.secondary || IndustryCategory.SERVICES,
          experience: industries?.experience || {}
        },
        roleLevel,
        yearsOfExperience,
        specializations,
        careerTrajectory
      },
      nineBoxPosition,
      expertiseScores,
      benchmarks,
      careerRecommendations,
      createdAt,
      updatedAt: now
    };
    
    // Store in Firestore
    await firestore.collection('careerExpertiseProfiles').doc(profileId).set(profile);
    
    functions.logger.info('Created career expertise profile', { profileId, userId });
    
    return {
      success,
      profile
    };
  } catch (error) {
    functions.logger.error('Error creating career profile:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error creating career profile: ' + (error
    );
  }
});

/**
 * Get a career expertise profile
 */
export const getCareerProfile = functions.https.onCall({
  region: 'us-west1',
}, async (request) => {
  try {
    const { userId, profileId } = request.data;
    
    if (!userId && !profileId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'User ID or profile ID is required'
      );
    }
    
    let profileDoc;
    
    if (profileId) {
      profileDoc = await firestore.collection('careerExpertiseProfiles').doc(profileId).get();
    } else {
      const querySnapshot = await firestore
        .collection('careerExpertiseProfiles')
        .where('userId', '==', userId)
        .limit(1)
        .get();
      
      if (querySnapshot.empty) {
        return {
          success,
          message: 'Profile not found'
        };
      }
      
      profileDoc = querySnapshot.docs[0];
    }
    
    if (!profileDoc.exists) {
      return {
        success,
        message: 'Profile not found'
      };
    }
    
    return {
      success,
      profileId,
      profile)
    };
  } catch (error) {
    functions.logger.error('Error getting career profile:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error getting career profile: ' + (error
    );
  }
});

/**
 * Update a career expertise profile
 */
export const updateCareerProfile = functions.https.onCall({
  region: 'us-west1',
}, async (request) => {
  try {
    const { 
      profileId, 
      riasecScores,
      dfabScores,
      industries,
      roleLevel,
      yearsOfExperience,
      specializations,
      performanceRating,
      potentialRating
    } = request.data;
    
    if (!profileId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Profile ID is required'
      );
    }
    
    // Get existing profile
    const profileDoc = await firestore.collection('careerExpertiseProfiles').doc(profileId).get();
    
    if (!profileDoc.exists) {
      return {
        success,
        message: 'Profile not found'
      };
    }
    
    const existingProfile = profileDoc.data();
    
    // Update profile fields
    const updates= {
      updatedAt)
    };
    
    // Update RIASEC profile if scores provided
    if (riasecScores) {
      updates.riasecProfile = calculateRiasecProfile(riasecScores);
    }
    
    // Update DFAB assessment if scores provided
    if (dfabScores) {
      updates.dfabAssessment = calculateDfabAssessment(dfabScores);
    }
    
    // Update career attributes
    const careerAttributes= {};
    
    if (industries) {
      careerAttributes['industries'] = {
        primary,
        secondary,
        experience: industries.experience || existingProfile.careerAttributes.industries.experience
      };
    }
    
    if (roleLevel) {
      careerAttributes['roleLevel'] = roleLevel;
    }
    
    if (yearsOfExperience !== undefined) {
      careerAttributes['yearsOfExperience'] = yearsOfExperience;
    }
    
    if (specializations) {
      careerAttributes['specializations'] = specializations;
    }
    
    // Calculate new Nine Box position if ratings provided
    if (performanceRating !== undefined && potentialRating !== undefined) {
      updates.nineBoxPosition = calculateNineBoxPosition(performanceRating, potentialRating);
    }
    
    // Recalculate trajectory if role level or experience changed
    if (roleLevel || yearsOfExperience !== undefined) {
      careerAttributes['careerTrajectory'] = calculateCareerTrajectory(
        roleLevel || existingProfile.careerAttributes.roleLevel,
        yearsOfExperience !== undefined ? yearsOfExperience ;
    }
    
    if (Object.keys(careerAttributes).length > 0) {
      // Merge with existing attributes
      updates['careerAttributes'] = {
        ...existingProfile.careerAttributes,
        ...careerAttributes
      };
    }
    
    // Recalculate expertise scores if relevant fields changed
    if (riasecScores || dfabScores || roleLevel || yearsOfExperience !== undefined) {
      const riasec = updates.riasecProfile || existingProfile.riasecProfile;
      const dfab = updates.dfabAssessment || existingProfile.dfabAssessment;
      const role = roleLevel || existingProfile.careerAttributes.roleLevel;
      const years = yearsOfExperience !== undefined ? yearsOfExperience ;
      
      updates.expertiseScores = calculateExpertiseScores(riasec, dfab, years, role);
    }
    
    // Recalculate benchmarks if relevant fields changed
    if (riasecScores || dfabScores || industries || roleLevel || yearsOfExperience !== undefined) {
      const riasec = updates.riasecProfile || existingProfile.riasecProfile;
      const dfab = updates.dfabAssessment || existingProfile.dfabAssessment;
      const expertise = updates.expertiseScores || existingProfile.expertiseScores;
      const inds = industries || existingProfile.careerAttributes.industries;
      const role = roleLevel || existingProfile.careerAttributes.roleLevel;
      const years = yearsOfExperience !== undefined ? yearsOfExperience ;
      
      updates.benchmarks = calculateBenchmarks(riasec, dfab, expertise, inds, role, years);
    }
    
    // Regenerate recommendations if profile significantly changed
    if (
      riasecScores || 
      dfabScores || 
      industries || 
      specializations || 
      performanceRating !== undefined || 
      potentialRating !== undefined
    ) {
      const riasec = updates.riasecProfile || existingProfile.riasecProfile;
      const dfab = updates.dfabAssessment || existingProfile.dfabAssessment;
      const nineBox = updates.nineBoxPosition || existingProfile.nineBoxPosition;
      const inds = industries || existingProfile.careerAttributes.industries;
      const specs = specializations || existingProfile.careerAttributes.specializations;
      
      updates.careerRecommendations = generateCareerRecommendations(riasec, dfab, nineBox, inds, specs);
    }
    
    // Update profile
    await firestore.collection('careerExpertiseProfiles').doc(profileId).update(updates);
    
    functions.logger.info('Updated career expertise profile', { profileId });
    
    // Get updated profile
    const updatedDoc = await firestore.collection('careerExpertiseProfiles').doc(profileId).get();
    
    return {
      success,
      profile)
    };
  } catch (error) {
    functions.logger.error('Error updating career profile:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error updating career profile: ' + (error
    );
  }
});

/**
 * Get career recommendations
 */
export const getCareerRecommendations = functions.https.onCall({
  region: 'us-west1',
}, async (request) => {
  try {
    const { profileId, userId } = request.data;
    
    if (!profileId && !userId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Profile ID or User ID is required'
      );
    }
    
    let profileDoc;
    
    if (profileId) {
      profileDoc = await firestore.collection('careerExpertiseProfiles').doc(profileId).get();
    } else {
      const querySnapshot = await firestore
        .collection('careerExpertiseProfiles')
        .where('userId', '==', userId)
        .limit(1)
        .get();
      
      if (querySnapshot.empty) {
        return {
          success,
          message: 'Profile not found'
        };
      }
      
      profileDoc = querySnapshot.docs[0];
    }
    
    if (!profileDoc.exists) {
      return {
        success,
        message: 'Profile not found'
      };
    }
    
    const profile = profileDoc.data();
    
    return {
      success,
      profileId,
      recommendations: profile.careerRecommendations
    };
  } catch (error) {
    functions.logger.error('Error getting career recommendations:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error getting career recommendations: ' + (error
    );
  }
});

/**
 * Get career benchmarks against peers
 */
export const getCareerBenchmarks = functions.https.onCall({
  region: 'us-west1',
}, async (request) => {
  try {
    const { profileId, userId, industryCategory, roleLevel, yearsRange } = request.data;
    
    if (!profileId && !userId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Profile ID or User ID is required'
      );
    }
    
    let profileDoc;
    
    if (profileId) {
      profileDoc = await firestore.collection('careerExpertiseProfiles').doc(profileId).get();
    } else {
      const querySnapshot = await firestore
        .collection('careerExpertiseProfiles')
        .where('userId', '==', userId)
        .limit(1)
        .get();
      
      if (querySnapshot.empty) {
        return {
          success,
          message: 'Profile not found'
        };
      }
      
      profileDoc = querySnapshot.docs[0];
    }
    
    if (!profileDoc.exists) {
      return {
        success,
        message: 'Profile not found'
      };
    }
    
    const profile = profileDoc.data();
    
    // Get profiles for comparison based on filters
    let query = firestore.collection('careerExpertiseProfiles').limit(100);
    
    if (industryCategory) {
      query = query.where('careerAttributes.industries.primary', '==', industryCategory);
    }
    
    if (roleLevel) {
      query = query.where('careerAttributes.roleLevel', '==', roleLevel);
    }
    
    const snapshot = await query.get();
    
    // Filter by years range if provided
    let peerProfiles = snapshot.docs.map(doc => doc.data();
    
    if (yearsRange) {
      const [min, max] = yearsRange;
      peerProfiles = peerProfiles.filter(p => 
        p.careerAttributes.yearsOfExperience >= min && 
        p.careerAttributes.yearsOfExperience  sum + score, 0);
  
  const normalizedScores= {};
  for (const [key, value] of Object.entries(mergedScores)) {
    normalizedScores[key] = totalScore > 0 ? Math.round((value / totalScore) * 100) ;
  }
  
  // Find primary and secondary types
  const sortedTypes = Object.entries(normalizedScores)
    .sort(([, a], [, b]) => b - a)
    .map(([type]) => type);
  
  return {
    realistic,
    investigative,
    artistic,
    social,
    enterprising,
    conventional,
    primaryType: sortedTypes[0] || 'investigative',
    secondaryType: sortedTypes[1] || 'enterprising'
  };
}

/**
 * Calculate DFAB assessment from scores
 */
function calculateDfabAssessment(scores){
  const defaultScores = {
    direction,
    function,
    action,
    behavior: 0
  };
  
  // Merge provided scores with defaults
  const mergedScores = {
    ...defaultScores,
    ...scores
  };
  
  // Normalize scores to 0-100 range
  const totalScore = Object.values(mergedScores).reduce((sum, score) => sum + score, 0);
  
  const normalizedScores= {};
  for (const [key, value] of Object.entries(mergedScores)) {
    normalizedScores[key] = totalScore > 0 ? Math.round((value / totalScore) * 100) ;
  }
  
  // Find primary strength and development area
  const sortedAreas = Object.entries(normalizedScores)
    .sort(([, a], [, b]) => b - a)
    .map(([area]) => area);
  
  const primaryStrength = sortedAreas[0];
  const developmentArea = sortedAreas[sortedAreas.length - 1];
  
  // Determine leadership style
  let leadershipStyle = '';
  
  if (normalizedScores.direction > normalizedScores.function &&
      normalizedScores.direction > normalizedScores.action) {
    leadershipStyle = 'Strategic Visionary';
  } else if (normalizedScores.function > normalizedScores.direction &&
             normalizedScores.function > normalizedScores.action) {
    leadershipStyle = 'Operational Expert';
  } else if (normalizedScores.action > normalizedScores.direction &&
             normalizedScores.action > normalizedScores.function) {
    leadershipStyle = 'Tactical Implementer';
  } else {
    leadershipStyle = 'Balanced Leader';
  }
  
  // Adjust based on behavior score
  if (normalizedScores.behavior > 75) {
    leadershipStyle += ' with Strong People Skills';
  } else if (normalizedScores.behavior  0 ? 
    (levelValue / yearsOfExperience) * 2 ;
  
  // Placeholder for horizontal movement
  // Would ideally be calculated from actual career history
  const horizontalMovement = 1;
  
  // Calculate overall growth rate
  const growthRate = (verticalMovement + horizontalMovement) / 2;
  
  return {
    verticalMovement,
    horizontalMovement,
    growthRate
  };
}

/**
 * Calculate expertise scores
 */
function calculateExpertiseScores(
  riasecProfile,
  dfabAssessment,
  yearsOfExperience,
  roleLevel){
  technical;
  leadership;
  domain;
  innovation;
  communication;
} {
  // Convert role level to numeric value
  const roleLevelValues= {
    [RoleLevel.ENTRY],
    [RoleLevel.INTERMEDIATE],
    [RoleLevel.SENIOR],
    [RoleLevel.LEAD],
    [RoleLevel.MANAGER],
    [RoleLevel.DIRECTOR],
    [RoleLevel.EXECUTIVE],
    [RoleLevel.C_LEVEL]: 8
  };
  
  const levelValue = roleLevelValues[roleLevel] || 2;
  
  // Calculate technical expertise
  // Influenced by Realistic and Investigative RIASEC scores
  // Adjusted by years of experience
  const technical = Math.min(
    100,
    ((riasecProfile.realistic + riasecProfile.investigative) / 2) * 0.6 +
    Math.min(100, yearsOfExperience * 5) * 0.4
  );
  
  // Calculate leadership expertise
  // Influenced by Enterprising RIASEC score and DFAB direction/function
  // Adjusted by role level
  const leadership = Math.min(
    100,
    riasecProfile.enterprising * 0.3 +
    ((dfabAssessment.direction + dfabAssessment.function) / 2) * 0.4 +
    (levelValue * 10) * 0.3
  );
  
  // Calculate domain expertise
  // Influenced by years of experience and Conventional RIASEC score
  const domain = Math.min(
    100,
    Math.min(100, yearsOfExperience * 7) * 0.7 +
    riasecProfile.conventional * 0.3
  );
  
  // Calculate innovation expertise
  // Influenced by Artistic and Investigative RIASEC scores
  const innovation = Math.min(
    100,
    ((riasecProfile.artistic + riasecProfile.investigative) / 2) * 0.8 +
    dfabAssessment.direction * 0.2
  );
  
  // Calculate communication expertise
  // Influenced by Social RIASEC score and DFAB behavior
  const communication = Math.min(
    100,
    riasecProfile.social * 0.6 +
    dfabAssessment.behavior * 0.4
  );
  
  return {
    technical,
    leadership,
    domain,
    innovation,
    communication)
  };
}

/**
 * Calculate benchmarks
 */
function calculateBenchmarks(
  riasecProfile,
  dfabAssessment,
  expertiseScores,
  industries: { primary; secondary; experience, number> },
  roleLevel,
  yearsOfExperience){
  industryPercentile;
  peerComparison;
  projectedGrowth;
} {
  // Convert role level to numeric value
  const roleLevelValues= {
    [RoleLevel.ENTRY],
    [RoleLevel.INTERMEDIATE],
    [RoleLevel.SENIOR],
    [RoleLevel.LEAD],
    [RoleLevel.MANAGER],
    [RoleLevel.DIRECTOR],
    [RoleLevel.EXECUTIVE],
    [RoleLevel.C_LEVEL]: 8
  };
  
  const levelValue = roleLevelValues[roleLevel] || 2;
  
  // Calculate industry percentile
  // Higher for better RIASEC-industry match and more experience
  const primaryIndustry = industries.primary;
  const riasecMatch = calculateRiasecIndustryMatch(riasecProfile, primaryIndustry);
  const industryExperience = industries.experience[primaryIndustry] || 0;
  
  const industryPercentile = Math.min(
    99,
    riasecMatch * 0.4 +
    Math.min(100, industryExperience * 10) * 0.6
  );
  
  // Calculate peer comparison
  // Compare to peers with similar experience and role level
  const avgExpertiseScore = Object.values(expertiseScores).reduce((sum, score) => sum + score, 0) / 
    Object.values(expertiseScores).length;
  
  const peerComparison = Math.min(
    99,
    avgExpertiseScore * 0.7 +
    (dfabAssessment.direction + dfabAssessment.function) / 2 * 0.3
  );
  
  // Calculate projected growth
  // Based on DFAB scores, role level, and growth potential
  const growthPotential = calculateGrowthPotential(riasecProfile, dfabAssessment, levelValue);
  
  const projectedGrowth = Math.min(
    99,
    growthPotential * 0.8 +
    (yearsOfExperience  },
  specializations){
  shortTerm;
  longTerm;
  skillsToAcquire;
  potentialRoles;
} {
  // Generate recommendations based on Nine Box position
  const baseRecommendations = nineBoxPosition.recommendations || [];
  
  // Generate short-term recommendations
  const shortTerm = [
    ...baseRecommendations,
    `Focus on ${dfabAssessment.developmentArea} to balance your leadership profile`,
    `Leverage your ${riasecProfile.primaryType} orientation in current projects`
  ];
  
  // Generate long-term recommendations
  const longTerm = [
    `Consider specialization in ${industries.primary} with ${riasecProfile.primaryType} focus`,
    `Develop broader perspective through ${industries.secondary} exploration`,
    `Build on your ${dfabAssessment.primaryStrength} strength for career advancement`
  ];
  
  // Generate skills to acquire based on RIASEC profile weaknesses
  const riasecEntries = Object.entries(riasecProfile).filter(
    ([key]) => key !== 'primaryType' && key !== 'secondaryType'
  );
  
  const weakestAreas = riasecEntries
    .sort(([, a], [, b]) => a - b)
    .slice(0, 2)
    .map(([area]) => area);
  
  const skillsToAcquire = [
    ...getSkillsForRiasecArea(weakestAreas[0]),
    ...getSkillsForRiasecArea(weakestAreas[1]),
    `Strengthen ${dfabAssessment.developmentArea} capabilities`
  ];
  
  // Generate potential roles based on RIASEC profile and Nine Box position
  const potentialRoles = generatePotentialRoles(
    riasecProfile,
    nineBoxPosition,
    industries.primary
  );
  
  return {
    shortTerm,
    longTerm,
    skillsToAcquire,
    potentialRoles
  };
}

/**
 * Get skills for RIASEC area
 */
function getSkillsForRiasecArea(area){
  switch (area) {
    case 'realistic':
      return ['Develop technical proficiency in hands-on tools', 'Build practical problem-solving skills'];
    case 'investigative':
      return ['Enhance analytical thinking', 'Develop research methodologies'];
    case 'artistic':
      return ['Cultivate creative thinking', 'Develop design sensibilities'];
    case 'social':
      return ['Strengthen interpersonal communication', 'Develop emotional intelligence'];
    case 'enterprising':
      return ['Build leadership capabilities', 'Develop persuasion and negotiation skills'];
    case 'conventional':
      return ['Improve organizational skills', 'Enhance detail orientation and process management'];
    default:
      return ['Develop balanced skill set across multiple domains'];
  }
}

/**
 * Generate potential roles based on profile
 */
function generatePotentialRoles(
  riasecProfile,
  nineBoxPosition,
  industry){
  // Base roles on primary RIASEC type
  const baseRoles= {
    'realistic': ['Technical Specialist', 'Systems Engineer', 'Operations Manager'],
    'investigative': ['Research Analyst', 'Data Scientist', 'R&D Specialist'],
    'artistic': ['Creative Director', 'UX Designer', 'Content Strategist'],
    'social': ['HR Specialist', 'Training Manager', 'Customer Success Lead'],
    'enterprising': ['Business Development Manager', 'Sales Director', 'Entrepreneur'],
    'conventional': ['Project Manager', 'Financial Analyst', 'Operations Coordinator']
  };
  
  // Get base roles for primary type
  const primary = riasecProfile.primaryType;
  const secondary = riasecProfile.secondaryType;
  
  const primaryRoles = baseRoles[primary] || [];
  const secondaryRoles = baseRoles[secondary] || [];
  
  // Blend roles based on nine box position
  const potentialRoles = [];
  
  // Add industry-specific roles
  const industryRoles = getIndustrySpecificRoles(industry, primary);
  
  // Combine based on Nine Box position
  if (nineBoxPosition.x >= 2 && nineBoxPosition.y >= 2) {
    // Higher performer with potential - add advancement roles
    potentialRoles.push(...primaryRoles.slice(0, 2), ...secondaryRoles.slice(0, 1), ...industryRoles.slice(0, 2));
  } else {
    // Lower performer or potential - focus on current strengths
    potentialRoles.push(...primaryRoles.slice(0, 1), ...secondaryRoles.slice(0, 1), ...industryRoles.slice(0, 1));
  }
  
  return [...new Set(potentialRoles)]; // Remove duplicates
}

/**
 * Get industry-specific roles
 */
function getIndustrySpecificRoles(
  industry,
  riasecType){
  const industryRoles= {
    [IndustryCategory.TECHNOLOGY]: {
      'realistic': ['DevOps Engineer', 'Network Administrator'],
      'investigative': ['Data Scientist', 'AI Researcher'],
      'artistic': ['UX Designer', 'Creative Technologist'],
      'social': ['Developer Advocate', 'IT Trainer'],
      'enterprising': ['Product Manager', 'Solutions Architect'],
      'conventional': ['QA Specialist', 'IT Project Manager']
    },
    [IndustryCategory.HEALTHCARE]: {
      'realistic': ['Biomedical Technician', 'Clinical Engineer'],
      'investigative': ['Clinical Researcher', 'Health Data Analyst'],
      'artistic': ['Medical Illustrator', 'Health Communications Specialist'],
      'social': ['Patient Advocate', 'Clinical Educator'],
      'enterprising': ['Healthcare Administrator', 'Practice Manager'],
      'conventional': ['Health Information Manager', 'Compliance Coordinator']
    },
    [IndustryCategory.FINANCE]: {
      'realistic': ['Financial Systems Specialist', 'Trade Execution Specialist'],
      'investigative': ['Risk Analyst', 'Quantitative Analyst'],
      'artistic': ['Financial Communications Specialist', 'UI Designer for Fintech'],
      'social': ['Financial Advisor', 'Client Relationship Manager'],
      'enterprising': ['Investment Banker', 'Wealth Management Director'],
      'conventional': ['Financial Controller', 'Audit Manager']
    },
    [IndustryCategory.EDUCATION]: {
      'realistic': ['Ed Tech Support Specialist', 'Lab Coordinator'],
      'investigative': ['Educational Researcher', 'Curriculum Developer'],
      'artistic': ['Instructional Designer', 'Digital Learning Creator'],
      'social': ['Teacher', 'Student Success Coach'],
      'enterprising': ['School Administrator', 'Education Program Director'],
      'conventional': ['Registrar', 'Accreditation Specialist']
    },
    [IndustryCategory.GOVERNMENT]: {
      'realistic': ['Infrastructure Specialist', 'Facilities Manager'],
      'investigative': ['Policy Analyst', 'Research Economist'],
      'artistic': ['Public Affairs Specialist', 'Communications Director'],
      'social': ['Community Outreach Coordinator', 'Public Engagement Specialist'],
      'enterprising': ['Agency Director', 'Program Manager'],
      'conventional': ['Budget Analyst', 'Regulatory Compliance Officer']
    },
    [IndustryCategory.MANUFACTURING]: {
      'realistic': ['Production Engineer', 'Maintenance Supervisor'],
      'investigative': ['Process Improvement Specialist', 'R&D Engineer'],
      'artistic': ['Industrial Designer', 'Product Development Specialist'],
      'social': ['Training Coordinator', 'Safety Manager'],
      'enterprising': ['Plant Manager', 'Supply Chain Director'],
      'conventional': ['Quality Control Manager', 'Inventory Control Specialist']
    },
    [IndustryCategory.RETAIL]: {
      'realistic': ['Store Operations Manager', 'Logistics Coordinator'],
      'investigative': ['Consumer Insights Analyst', 'Retail Data Analyst'],
      'artistic': ['Visual Merchandiser', 'Brand Experience Designer'],
      'social': ['Customer Experience Manager', 'Retail Trainer'],
      'enterprising': ['Store Manager', 'Regional Director'],
      'conventional': ['Inventory Manager', 'Retail Buyer']
    },
    [IndustryCategory.SERVICES]: {
      'realistic': ['Service Operations Manager', 'Field Service Technician'],
      'investigative': ['Service Design Researcher', 'Customer Intelligence Analyst'],
      'artistic': ['Service Experience Designer', 'Brand Strategist'],
      'social': ['Customer Success Manager', 'Client Services Director'],
      'enterprising': ['Business Services Manager', 'Client Engagement Director'],
      'conventional': ['Service Delivery Manager', 'Process Improvement Specialist']
    },
    [IndustryCategory.MEDIA]: {
      'realistic': ['Broadcast Technician', 'Production Coordinator'],
      'investigative': ['Media Analyst', 'Audience Researcher'],
      'artistic': ['Art Director', 'Content Creator'],
      'social': ['Public Relations Specialist', 'Community Manager'],
      'enterprising': ['Executive Producer', 'Media Director'],
      'conventional': ['Production Manager', 'Content Operations Manager']
    },
    [IndustryCategory.NONPROFIT]: {
      'realistic': ['Facilities Coordinator', 'Event Manager'],
      'investigative': ['Program Evaluator', 'Impact Assessment Specialist'],
      'artistic': ['Communications Director', 'Creative Director'],
      'social': ['Volunteer Coordinator', 'Community Outreach Director'],
      'enterprising': ['Development Director', 'Executive Director'],
      'conventional': ['Grants Manager', 'Operations Director']
    }
  };
  
  return industryRoles[industry]?.[riasecType] || 
    ['Industry Specialist', 'Domain Expert', 'Senior Professional'];
}

/**
 * Calculate detailed benchmarks for peer comparison
 */
function calculateDetailedBenchmarks(
  profile,
  peerProfiles){
  overall: {
    percentile;
    peerCount;
  };
  byDimension, {
    score;
    percentile;
  }>;
  careerProjection: {
    growthRate;
    timeToNextLevel;
    projectedPath;
  };
} {
  // Calculate overall percentile
  const overallScores = peerProfiles.map(p => {
    const expertise = Object.values(p.expertiseScores).reduce((sum, score) => sum + score, 0) / 
      Object.values(p.expertiseScores).length;
    
    return expertise;
  });
  
  const profileOverallScore = Object.values(profile.expertiseScores).reduce(
    (sum, score) => sum + score, 0
  ) / Object.values(profile.expertiseScores).length;
  
  const overallPercentile = calculatePercentile(profileOverallScore, overallScores);
  
  // Calculate percentile by dimension
  const byDimension, { score; percentile: number }> = {};
  
  for (const [dimension, score] of Object.entries(profile.expertiseScores)) {
    const peerScores = peerProfiles.map(p => p.expertiseScores[dimension] || 0);
    const percentile = calculatePercentile(score, peerScores);
    
    byDimension[dimension] = {
      score,
      percentile
    };
  }
  
  // Calculate career projection
  const roleLevel = profile.careerAttributes.roleLevel;
  const roleLevelValues= {
    [RoleLevel.ENTRY],
    [RoleLevel.INTERMEDIATE],
    [RoleLevel.SENIOR],
    [RoleLevel.LEAD],
    [RoleLevel.MANAGER],
    [RoleLevel.DIRECTOR],
    [RoleLevel.EXECUTIVE],
    [RoleLevel.C_LEVEL]: 8
  };
  
  const currentLevelValue = roleLevelValues[roleLevel] || 2;
  const nextLevelValue = currentLevelValue + 1;
  
  // Estimate time to next level based on growth rate
  const avgTimeToNextLevel = 2.5; // Average years
  const growthAdjustment = (profile.careerAttributes.careerTrajectory.growthRate >= 1.5) ?
    0.7 = 1.0 ? 1.0 ;
  
  const timeToNextLevel = Math.max(1, Math.round(avgTimeToNextLevel * growthAdjustment * 10) / 10);
  
  // Project career path
  const maxProjectionSteps = 3;
  const projectedPath = [];
  
  // Get level name for a value
  const getLevelName = (value)=> {
    for (const [level, levelValue] of Object.entries(roleLevelValues)) {
      if (levelValue === value) {
        return formatRoleLevel(level;
      }
    }
    return 'Advanced Position';
  };
  
  // Add current level
  projectedPath.push(formatRoleLevel(roleLevel));
  
  // Add projected levels
  for (let i = 1; i  v < value).length;
  
  // Calculate percentile
  return (countBelow / dataset.length) * 100;
}

/**
 * Format role level for display
 */
function formatRoleLevel(level){
  switch (level) {
    case RoleLevel.ENTRY:
      return 'Entry Level';
    case RoleLevel.INTERMEDIATE:
      return 'Intermediate';
    case RoleLevel.SENIOR:
      return 'Senior';
    case RoleLevel.LEAD:
      return 'Lead';
    case RoleLevel.MANAGER:
      return 'Manager';
    case RoleLevel.DIRECTOR:
      return 'Director';
    case RoleLevel.EXECUTIVE:
      return 'Executive';
    case RoleLevel.C_LEVEL:
      return 'C-Level';
    default:
      return 'Professional';
  }
}