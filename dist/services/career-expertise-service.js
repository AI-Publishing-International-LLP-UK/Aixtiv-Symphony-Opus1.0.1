/**
 * Career Expertise Service
 * Client-side access to Career Expertise Framework that references
 * Holland RIASEC and Military DFAB research baselines
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Role Level Enum
 */
export enum RoleLevel {
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
 * Industry Category Enum
 */
export enum IndustryCategory {
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
 * Career Style Reference
 * Based on Holland RIASEC research without direct scoring
 */
export 

/**
 * Leadership Approach Reference
 * Based on DFAB research without direct assessment
 */
export 

/**
 * Nine Box Position Interface
 */
export 

/**
 * Career Expertise Profile Interface
 */
export ;
    roleLevel;
    yearsOfExperience;
    specializations;
    careerTrajectory: {
      verticalMovement;
      horizontalMovement;
      growthRate;
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
 * Career Benchmark Results Interface
 */
export ;
  byDimension, {
    score;
    percentile;
  }>;
  careerProjection: {
    growthRate;
    timeToNextLevel;
    projectedPath;
  };
}

/**
 * Career Expertise Service
 * Provides access to Career Expertise Framework via Firebase Functions
 * References Holland RIASEC and DFAB research without direct assessment
 */
class CareerExpertiseService {
  functions = getFunctions(undefined, 'us-west1');
  
  /**
   * Create a career expertise profile
   * @param params Profile creation parameters
   * @returns Created profile
   */
  async createCareerProfile(params: {
    userId;
    careerStyleInputs?;
    leadershipApproachInputs?;
    industries?: {
      primary;
      secondary;
      experience;
    };
    roleLevel?;
    yearsOfExperience?;
    specializations?;
    performanceRating?;
    potentialRating?;
  }){
    success;
    profileId;
    profile;
    message?;
  }> {
    const createProfile = httpsCallable(this.functions, 'createCareerProfile');
    
    const result = await createProfile(params);
    
    return result.data as {
      success;
      profileId;
      profile;
      message?;
    };
  }
  
  /**
   * Get a career expertise profile
   * @param params Profile retrieval parameters
   * @returns Retrieved profile
   */
  async getCareerProfile(params: {
    userId?;
    profileId?;
  }){
    success;
    profileId?;
    profile?;
    message?;
  }> {
    const getProfile = httpsCallable(this.functions, 'getCareerProfile');
    
    const result = await getProfile(params);
    
    return result.data as {
      success;
      profileId?;
      profile?;
      message?;
    };
  }
  
  /**
   * Update a career expertise profile
   * @param params Profile update parameters
   * @returns Updated profile
   */
  async updateCareerProfile(params: {
    profileId;
    careerStyleInputs?;
    leadershipApproachInputs?;
    industries?: {
      primary?;
      secondary?;
      experience?;
    };
    roleLevel?;
    yearsOfExperience?;
    specializations?;
    performanceRating?;
    potentialRating?;
  }){
    success;
    profileId;
    profile;
  }> {
    const updateProfile = httpsCallable(this.functions, 'updateCareerProfile');
    
    const result = await updateProfile(params);
    
    return result.data as {
      success;
      profileId;
      profile;
    };
  }
  
  /**
   * Get career recommendations
   * @param params Recommendation retrieval parameters
   * @returns Career recommendations
   */
  async getCareerRecommendations(params: {
    profileId?;
    userId?;
  }){
    success;
    profileId?;
    recommendations?: {
      shortTerm;
      longTerm;
      skillsToAcquire;
      potentialRoles;
    };
    message?;
  }> {
    const getRecommendations = httpsCallable(
      this.functions,
      'getCareerRecommendations'
    );
    
    const result = await getRecommendations(params);
    
    return result.data as {
      success;
      profileId?;
      recommendations?: {
        shortTerm;
        longTerm;
        skillsToAcquire;
        potentialRoles;
      };
      message?;
    };
  }
  
  /**
   * Get career benchmarks against peers
   * @param params Benchmark parameters
   * @returns Benchmark results
   */
  async getCareerBenchmarks(params: {
    profileId?;
    userId?;
    industryCategory?;
    roleLevel?;
    yearsRange?;
  }){
    success;
    profileId?;
    benchmarks?;
    message?;
  }> {
    const getBenchmarks = httpsCallable(this.functions, 'getCareerBenchmarks');
    
    const result = await getBenchmarks(params);
    
    return result.data as {
      success;
      profileId?;
      benchmarks?;
      message?;
    };
  }
  
  /**
   * Get career style reference information
   * Based on Holland RIASEC research without direct assessment
   * @returns Information about career style types
   */
  getCareerStyleInfo(){
    type;
    title;
    description;
    suitableIndustries;
    strengths;
  }[] {
    return [
      {
        type: 'technical',
        title: 'Technical Specialist',
        description: 'Prefers working with tools, equipment, and systems. Enjoys practical, hands-on problems and solutions.',
        suitableIndustries: ['Technology', 'Manufacturing', 'Construction', 'Engineering'],
        strengths: ['Technical problem-solving', 'Working with equipment', 'Systematic thinking', 'Practical application']
      },
      {
        type: 'analytical',
        title: 'Analytical Thinker',
        description: 'Enjoys analyzing information and solving complex problems. Prefers intellectual and abstract challenges.',
        suitableIndustries: ['Technology', 'Science', 'Finance', 'Research'],
        strengths: ['Critical thinking', 'Research skills', 'Data analysis', 'Problem-solving']
      },
      {
        type: 'creative',
        title: 'Creative Innovator',
        description: 'Prefers creative activities and working in unstructured environments. Values self-expression and innovation.',
        suitableIndustries: ['Media', 'Design', 'Marketing', 'Entertainment'],
        strengths: ['Creative thinking', 'Artistic expression', 'Innovation', 'Originality']
      },
      {
        type: 'social',
        title: 'Social Connector',
        description: 'Enjoys working with and helping others. Values interpersonal connection and collaboration.',
        suitableIndustries: ['Healthcare', 'Education', 'Counseling', 'Human Resources'],
        strengths: ['Communication', 'Empathy', 'Collaboration', 'Building relationships']
      },
      {
        type: 'leadership',
        title: 'Strategic Leader',
        description: 'Prefers taking charge, making decisions, and influencing others. Enjoys persuasion and leadership.',
        suitableIndustries: ['Management', 'Sales', 'Entrepreneurship', 'Politics'],
        strengths: ['Leadership', 'Persuasion', 'Decision-making', 'Strategic planning']
      },
      {
        type: 'structural',
        title: 'Organizational Expert',
        description: 'Enjoys organizing information, following procedures, and working with details. Values structure and clarity.',
        suitableIndustries: ['Finance', 'Administration', 'Law', 'Quality Assurance'],
        strengths: ['Organization', 'Attention to detail', 'Process management', 'Systematic thinking']
      }
    ];
  }
  
  /**
   * Get leadership approach reference information
   * Based on DFAB research without direct assessment
   * @returns Information about leadership approaches
   */
  getLeadershipApproachInfo(){
    type;
    title;
    description;
    strengths;
    developmentAreas;
  }[] {
    return [
      {
        type: 'strategic',
        title: 'Strategic Visionary',
        description: 'Focuses on big-picture thinking, long-term planning, and setting direction. Excels at creating vision and strategy.',
        strengths: ['Vision setting', 'Strategic planning', 'Future thinking', 'Conceptual skills'],
        developmentAreas: ['Tactical execution', 'Detail orientation', 'Short-term focus']
      },
      {
        type: 'operational',
        title: 'Operational Expert',
        description: 'Excels at translating strategy into operational plans and managing resources effectively. Focuses on systems and processes.',
        strengths: ['Process management', 'Resource allocation', 'Organizational planning', 'System thinking'],
        developmentAreas: ['Creative thinking', 'Adaptability', 'Vision setting']
      },
      {
        type: 'tactical',
        title: 'Tactical Implementer',
        description: 'Prefers immediate action and practical execution. Excels at hands-on implementation and solving immediate problems.',
        strengths: ['Execution focus', 'Problem-solving', 'Practical approach', 'Decisive action'],
        developmentAreas: ['Strategic thinking', 'Long-term planning', 'Big-picture perspective']
      },
      {
        type: 'interpersonal',
        title: 'People-Focused Leader',
        description: 'Focuses on building relationships, developing teams, and creating positive work environments. Excels at collaboration.',
        strengths: ['People development', 'Emotional intelligence', 'Team building', 'Collaboration'],
        developmentAreas: ['Task focus', 'Decision-making', 'Technical depth']
      }
    ];
  }
  
  /**
   * Get Nine Box framework information
   * @returns Information about the Nine Box talent management framework
   */
  getNineBoxInfo(){
    position;
    label;
    description;
    recommendations;
  }[] {
    return [
      {
        position: '1,1',
        label: 'Risk',
        description: 'Low performance with low potential. May require performance improvement plan or role reassessment.',
        recommendations: [
          'Establish clear performance expectations',
          'Provide structured development opportunities',
          'Consider role fit assessment'
        ]
      },
      {
        position: '1,2',
        label: 'Enigma',
        description: 'Low performance with moderate potential. May be underperforming due to role misalignment.',
        recommendations: [
          'Clarify performance expectations',
          'Explore alternative roles that may better fit capabilities',
          'Provide coaching and mentoring'
        ]
      },
      {
        position: '1,3',
        label: 'Potential Gem',
        description: 'Low performance with high potential. May be new to role or need direction.',
        recommendations: [
          'Provide clear performance expectations and guidance',
          'Offer mentoring and coaching',
          'Create development opportunities to leverage potential'
        ]
      },
      {
        position: '2,1',
        label: 'Solid Professional',
        description: 'Moderate performance with low potential. Reliable contributor with limited growth trajectory.',
        recommendations: [
          'Recognize consistent contributions',
          'Provide skill enhancement opportunities',
          'Consider lateral movement for experience broadening'
        ]
      },
      {
        position: '2,2',
        label: 'Core Player',
        description: 'Moderate performance with moderate potential. Solid team member with room to grow.',
        recommendations: [
          'Offer targeted development opportunities',
          'Provide increasingly challenging assignments',
          'Consider structured mentoring program'
        ]
      },
      {
        position: '2,3',
        label: 'Rising Star',
        description: 'Moderate performance with high potential. Shows promise for significant growth.',
        recommendations: [
          'Create stretch assignments',
          'Establish development plan with clear milestones',
          'Consider leadership development programs'
        ]
      },
      {
        position: '3,1',
        label: 'Valued Expert',
        description: 'High performance with low potential. Subject matter expert with deep domain knowledge.',
        recommendations: [
          'Recognize expertise and contributions',
          'Create opportunities to mentor others',
          'Consider knowledge sharing and documentation initiatives'
        ]
      },
      {
        position: '3,2',
        label: 'Key Player',
        description: 'High performance with moderate potential. Consistent contributor with some growth capacity.',
        recommendations: [
          'Provide growth opportunities in current role',
          'Consider succession planning for next level',
          'Develop leadership capabilities'
        ]
      },
      {
        position: '3,3',
        label: 'Star',
        description: 'High performance with high potential. Top talent with significant leadership trajectory.',
        recommendations: [
          'Create accelerated development plan',
          'Offer executive sponsorship',
          'Provide strategic and high-visibility assignments'
        ]
      }
    ];
  }
}

// Export singleton instance
export const careerExpertiseService = new CareerExpertiseService();
export default careerExpertiseService;