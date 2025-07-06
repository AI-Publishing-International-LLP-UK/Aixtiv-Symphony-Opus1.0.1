/**
 * Comprehensive User Type Enumeration for AIXTIV Symphony
 * Defines detailed user types across different tracks and access levels
 */
export enum UserType {
  // Corporate Track User Types
  CORPORATE_OWNER_SUBSCRIBER_PROFESSIONAL = 'C-OSP',
  CORPORATE_OWNER_TEAM = 'C-OT',
  CORPORATE_OWNER_ENTERPRISE = 'C-OE',
  CORPORATE_OWNER_GROUP_PRACTITIONER = 'C-OGP',
  CORPORATE_TEAM_LEADER = 'C-L-T',
  CORPORATE_TEAM_MEMBER = 'C-M-T',
  CORPORATE_ENTERPRISE_LEADER = 'C-L-E',
  CORPORATE_ENTERPRISE_MEMBER = 'C-M-E',
  CORPORATE_DEPARTMENT_LEADER = 'C-L-D',
  CORPORATE_DEPARTMENT_MEMBER = 'C-M-D',
  CORPORATE_GROUP_LEADER = 'C-L-G',
  CORPORATE_GROUP_MEMBER = 'C-M-G',

  // Organizational Track User Types
  ORGANIZATIONAL_OWNER = 'O-OO',
  ORGANIZATIONAL_LEADER = 'O-L-E',
  ORGANIZATIONAL_MEMBER = 'O-M-E',
  ORGANIZATIONAL_DIVISION_LEADER = 'O-L-D',
  ORGANIZATIONAL_DIVISION_MEMBER = 'O-M-D',

  // Academic Track User Types
  ACADEMIC_STUDENT_SUBSCRIBER = 'A-SS',
  ACADEMIC_EDUCATOR_SUBSCRIBER = 'A-ES',
  ACADEMIC_EDUCATIONAL_INSTITUTION = 'A-EI',
  ACADEMIC_INDIVIDUAL_STUDENT = 'A-S-I',
  ACADEMIC_CLASS_STUDENT = 'A-S-C',
  ACADEMIC_INDIVIDUAL_EDUCATOR = 'A-E-I',
  ACADEMIC_CLASS_LEADER = 'A-E-C',
  ACADEMIC_INSTITUTION_LEADER = 'A-L-I',
  ACADEMIC_DEPARTMENT_LEADER = 'A-L-D',
  ACADEMIC_FACULTY_MEMBER = 'A-F-I',
  ACADEMIC_INSTITUTION_STUDENT = 'A-S-I',

  // Community Track User Types
  COMMUNITY_INDIVIDUAL_SUBSCRIBER = 'CM-OSI',
  COMMUNITY_GROUP_COMMUNITY = 'CM-OGC',
  COMMUNITY_INDIVIDUAL = 'CM-I',
  COMMUNITY_GROUP_LEADER = 'CM-L-G',
  COMMUNITY_GROUP_MEMBER = 'CM-M-G',

  // Specialized Roles (Overlay on Base User Types)
  VISIONARY_VOICE = 'VV',
  CO_PILOT = 'CP',
  PILOT = 'PI',

  // Payment Tiers
  MONTHLY_SUBSCRIBER = 'M',
  QUARTERLY_SUBSCRIBER = 'Q',
  ANNUAL_SUBSCRIBER = 'A',

  // Authentication Levels
  LEVEL_1_USER = 'L1',
  LEVEL_2_USER = 'L2',
  LEVEL_3_USER = 'L3'
}

/**
 * User Type Metadata provides additional context and capabilities for each user type
 */
export const UserTypeMetadata: Record<UserType, {
  track: 'Corporate' | 'Organizational' | 'Academic' | 'Community';
  baseCapabilities: string[];
  specializedRoles?: UserType[];
  paymentTiers?: UserType[];
  authenticationLevels?: UserType[];
}> = {
  [UserType.CORPORATE_OWNER_SUBSCRIBER_PROFESSIONAL]: {
    track: 'Corporate',
    baseCapabilities: ['Dream Commander', 'Bid Suite', 'Q4D-Lenz'],
    specializedRoles: [UserType.VISIONARY_VOICE, UserType.CO_PILOT],
    paymentTiers: [UserType.MONTHLY_SUBSCRIBER, UserType.QUARTERLY_SUBSCRIBER, UserType.ANNUAL_SUBSCRIBER],
    authenticationLevels: [UserType.LEVEL_1_USER, UserType.LEVEL_2_USER, UserType.LEVEL_3_USER]
  },
  // ... similar detailed metadata for each user type
  
  // Example of a more complex user type with multiple capabilities
  [UserType.CORPORATE_ENTERPRISE_LEADER]: {
    track: 'Corporate',
    baseCapabilities: [
      'Dream Commander', 
      'Bid Suite', 
      'Q4D-Lenz', 
      'Strategic Planning', 
      'Team Management'
    ],
    specializedRoles: [
      UserType.VISIONARY_VOICE, 
      UserType.PILOT
    ],
    paymentTiers: [UserType.QUARTERLY_SUBSCRIBER, UserType.ANNUAL_SUBSCRIBER],
    authenticationLevels: [UserType.LEVEL_2_USER, UserType.LEVEL_3_USER]
  },

  // Placeholder for other user types with their specific metadata
  [UserType.ACADEMIC_STUDENT_SUBSCRIBER]: {
    track: 'Academic',
    baseCapabilities: ['Q4D-Lenz', 'Learning Resources'],
    specializedRoles: [],
    paymentTiers: [UserType.MONTHLY_SUBSCRIBER],
    authenticationLevels: [UserType.LEVEL_1_USER]
  }
};

/**
 * Utility function to validate and parse user type codes
 */
export function parseUserTypeCode(code: string): {
  track: string;
  position: string;
  level: string;
  userId?: string;
  specializedRoles?: string[];
  paymentTier?: string;
} {
  // Implement a comprehensive parsing logic for user type codes
  // Example: "C-L-E-8765-45921-VV-Q" 
  const parts = code.split('-');
  
  return {
    track: parts[0],
    position: parts[1],
    level: parts[2],
    userId: parts.length > 4 ? parts[4] : undefined,
    specializedRoles: parts.includes('VV') ? ['VV'] : [],
    paymentTier: parts.includes('Q') ? 'Q' : parts.includes('A') ? 'A' : 'M'
  };
}

/**
 * Function to generate a complete user type code
 */
export function generateUserTypeCode(
  baseType: UserType, 
  options?: {
    userId?: string;
    specializedRoles?: UserType[];
    paymentTier?: UserType;
  }
): string {
  const { 
    userId, 
    specializedRoles = [], 
    paymentTier = UserType.MONTHLY_SUBSCRIBER 
  } = options || {};

  const baseParts = baseType.split('-');
  const code = [...baseParts];

  if (userId) {
    code.push(userId);
  }

  specializedRoles.forEach(role => {
    if (role !== baseType) {
      code.push(role);
    }
  });

  code.push(paymentTier);

  return code.join('-');
}

// Export the complete module for comprehensive user type management
export default {
  UserType,
  UserTypeMetadata,
  parseUserTypeCode,
  generateUserTypeCode
};
