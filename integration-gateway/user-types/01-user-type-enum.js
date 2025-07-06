"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserTypeMetadata = exports.UserType = void 0;
exports.parseUserTypeCode = parseUserTypeCode;
exports.generateUserTypeCode = generateUserTypeCode;
/**
 * Comprehensive User Type Enumeration for AIXTIV Symphony
 * Defines detailed user types across different tracks and access levels
 */
var UserType;
(function (UserType) {
    // Corporate Track User Types
    UserType["CORPORATE_OWNER_SUBSCRIBER_PROFESSIONAL"] = "C-OSP";
    UserType["CORPORATE_OWNER_TEAM"] = "C-OT";
    UserType["CORPORATE_OWNER_ENTERPRISE"] = "C-OE";
    UserType["CORPORATE_OWNER_GROUP_PRACTITIONER"] = "C-OGP";
    UserType["CORPORATE_TEAM_LEADER"] = "C-L-T";
    UserType["CORPORATE_TEAM_MEMBER"] = "C-M-T";
    UserType["CORPORATE_ENTERPRISE_LEADER"] = "C-L-E";
    UserType["CORPORATE_ENTERPRISE_MEMBER"] = "C-M-E";
    UserType["CORPORATE_DEPARTMENT_LEADER"] = "C-L-D";
    UserType["CORPORATE_DEPARTMENT_MEMBER"] = "C-M-D";
    UserType["CORPORATE_GROUP_LEADER"] = "C-L-G";
    UserType["CORPORATE_GROUP_MEMBER"] = "C-M-G";
    // Organizational Track User Types
    UserType["ORGANIZATIONAL_OWNER"] = "O-OO";
    UserType["ORGANIZATIONAL_LEADER"] = "O-L-E";
    UserType["ORGANIZATIONAL_MEMBER"] = "O-M-E";
    UserType["ORGANIZATIONAL_DIVISION_LEADER"] = "O-L-D";
    UserType["ORGANIZATIONAL_DIVISION_MEMBER"] = "O-M-D";
    // Academic Track User Types
    UserType["ACADEMIC_STUDENT_SUBSCRIBER"] = "A-SS";
    UserType["ACADEMIC_EDUCATOR_SUBSCRIBER"] = "A-ES";
    UserType["ACADEMIC_EDUCATIONAL_INSTITUTION"] = "A-EI";
    UserType["ACADEMIC_INDIVIDUAL_STUDENT"] = "A-S-I";
    UserType["ACADEMIC_CLASS_STUDENT"] = "A-S-C";
    UserType["ACADEMIC_INDIVIDUAL_EDUCATOR"] = "A-E-I";
    UserType["ACADEMIC_CLASS_LEADER"] = "A-E-C";
    UserType["ACADEMIC_INSTITUTION_LEADER"] = "A-L-I";
    UserType["ACADEMIC_DEPARTMENT_LEADER"] = "A-L-D";
    UserType["ACADEMIC_FACULTY_MEMBER"] = "A-F-I";
    UserType["ACADEMIC_INSTITUTION_STUDENT"] = "A-S-I";
    // Community Track User Types
    UserType["COMMUNITY_INDIVIDUAL_SUBSCRIBER"] = "CM-OSI";
    UserType["COMMUNITY_GROUP_COMMUNITY"] = "CM-OGC";
    UserType["COMMUNITY_INDIVIDUAL"] = "CM-I";
    UserType["COMMUNITY_GROUP_LEADER"] = "CM-L-G";
    UserType["COMMUNITY_GROUP_MEMBER"] = "CM-M-G";
    // Specialized Roles (Overlay on Base User Types)
    UserType["VISIONARY_VOICE"] = "VV";
    UserType["CO_PILOT"] = "CP";
    UserType["PILOT"] = "PI";
    // Payment Tiers
    UserType["MONTHLY_SUBSCRIBER"] = "M";
    UserType["QUARTERLY_SUBSCRIBER"] = "Q";
    UserType["ANNUAL_SUBSCRIBER"] = "A";
    // Authentication Levels
    UserType["LEVEL_1_USER"] = "L1";
    UserType["LEVEL_2_USER"] = "L2";
    UserType["LEVEL_3_USER"] = "L3";
})(UserType || (exports.UserType = UserType = {}));
/**
 * User Type Metadata provides additional context and capabilities for each user type
 */
exports.UserTypeMetadata = {
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
function parseUserTypeCode(code) {
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
function generateUserTypeCode(baseType, options) {
    const { userId, specializedRoles = [], paymentTier = UserType.MONTHLY_SUBSCRIBER } = options || {};
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
exports.default = {
    UserType,
    UserTypeMetadata: exports.UserTypeMetadata,
    parseUserTypeCode,
    generateUserTypeCode
};
