"use strict";
/**
 * AIXTIV SYMPHONY™ User Type System
 * © 2025 AI Publishing International LLP
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This is proprietary software of AI Publishing International LLP.
 * All rights reserved. No part of this software may be reproduced,
 * modified, or distributed without prior written permission.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserTypeMetadata = exports.SecurityOption = exports.IntegrationType = exports.PilotType = exports.CoreSolution = exports.UserType = void 0;
exports.parseUserTypeCode = parseUserTypeCode;
exports.generateUserTypeCode = generateUserTypeCode;
exports.addUserWithBlockchainVerification = addUserWithBlockchainVerification;
/**
 * User Type Enum - The comprehensive user classification system for AIXTIV SYMPHONY
 * Designed for Firestore document-based storage and blockchain integration
 */
var UserType;
(function (UserType) {
    // -------------------- TRACK IDENTIFIERS --------------------
    UserType["CORPORATE"] = "C";
    UserType["ORGANIZATIONAL"] = "O";
    UserType["ACADEMIC"] = "A";
    UserType["COMMUNITY"] = "CM";
    // -------------------- POSITION IDENTIFIERS --------------------
    UserType["LEADER"] = "L";
    UserType["MEMBER"] = "M";
    UserType["STUDENT"] = "S";
    UserType["EDUCATOR"] = "E";
    UserType["FACULTY"] = "F";
    UserType["INDIVIDUAL"] = "I";
    // -------------------- LEVEL IDENTIFIERS --------------------
    UserType["ENTERPRISE"] = "E";
    UserType["TEAM"] = "T";
    UserType["GROUP"] = "G";
    UserType["DEPARTMENT"] = "D";
    UserType["CLASS"] = "C";
    UserType["LEVEL_INDIVIDUAL"] = "I";
    // -------------------- SPECIALIZED ROLE IDENTIFIERS --------------------
    UserType["VISIONARY_VOICE"] = "VV";
    UserType["CO_PILOT"] = "CP";
    UserType["PILOT"] = "PI";
    // -------------------- PAYMENT TERM IDENTIFIERS --------------------
    UserType["MONTHLY_SUBSCRIBER"] = "M";
    UserType["QUARTERLY_SUBSCRIBER"] = "Q";
    UserType["ANNUAL_SUBSCRIBER"] = "A";
    UserType["ENTERPRISE_LICENSE"] = "EL";
    // -------------------- COMPLETE USER TYPES --------------------
    // Corporate Track - Enterprise Level
    UserType["CORPORATE_ENTERPRISE_LEADER"] = "C-L-E";
    UserType["CORPORATE_ENTERPRISE_MEMBER"] = "C-M-E";
    // Corporate Track - Team Level
    UserType["CORPORATE_TEAM_LEADER"] = "C-L-T";
    UserType["CORPORATE_TEAM_MEMBER"] = "C-M-T";
    // Corporate Track - Group Level
    UserType["CORPORATE_GROUP_LEADER"] = "C-L-G";
    UserType["CORPORATE_GROUP_MEMBER"] = "C-M-G";
    // Organizational Track
    UserType["ORGANIZATIONAL_ENTERPRISE_LEADER"] = "O-L-E";
    UserType["ORGANIZATIONAL_DEPARTMENT_LEADER"] = "O-L-D";
    UserType["ORGANIZATIONAL_TEAM_MEMBER"] = "O-M-T";
    // Academic Track
    UserType["ACADEMIC_FACULTY"] = "A-F-C";
    UserType["ACADEMIC_EDUCATOR"] = "A-E-C";
    UserType["ACADEMIC_STUDENT"] = "A-S-C";
    // Community Track
    UserType["COMMUNITY_LEADER"] = "CM-L-I";
    UserType["COMMUNITY_MEMBER"] = "CM-M-I";
})(UserType || (exports.UserType = UserType = {}));
/**
 * Solution Codes - Enum for solutions available in the AIXTIV SYMPHONY system
 */
var CoreSolution;
(function (CoreSolution) {
    CoreSolution["DREAM_COMMANDER"] = "DC";
    CoreSolution["LENZ_ANALYST"] = "LA";
    CoreSolution["WISH_GRANTER"] = "WG";
    CoreSolution["MEMORIA_ANTHOLOGY"] = "MA";
    CoreSolution["BRAND_DIAGNOSTIC"] = "BD";
    CoreSolution["BRAND_BUILDER"] = "BB";
    CoreSolution["CUSTOMER_DELIGHT"] = "CD";
    CoreSolution["BID_SUITE"] = "BS";
})(CoreSolution || (exports.CoreSolution = CoreSolution = {}));
/**
 * Pilot Types - Specialized agents in the AIXTIV SYMPHONY ecosystem
 */
var PilotType;
(function (PilotType) {
    // R1 Core Squadron
    PilotType["DR_LUCY_R1_CORE_01"] = "DLR1C01";
    PilotType["DR_LUCY_R1_CORE_02"] = "DLR1C02";
    PilotType["DR_LUCY_R1_CORE_03"] = "DLR1C03";
    // Specialized Agent Pilots
    PilotType["DR_CLAUDE_PILOT"] = "DCP";
    PilotType["DR_ROARK_PILOT"] = "DRP";
    PilotType["DR_MEMORIA_PILOT"] = "DMP";
    // Operational Agents
    PilotType["PROFESSOR_LEE_PILOT"] = "PLP";
    PilotType["DR_MATCH_PILOT"] = "DMaP";
    // Relationship and Historical Agents
    PilotType["DR_CYPRIOT_PILOT"] = "DCyP";
    PilotType["DR_MARIA_HISTORICAL_01"] = "DMH01";
    PilotType["DR_MARIA_HISTORICAL_02"] = "DMH02";
    PilotType["DR_MARIA_HISTORICAL_03"] = "DMH03";
    // Governance and Compliance Agents
    PilotType["DR_BURBY_PILOT"] = "DBP";
})(PilotType || (exports.PilotType = PilotType = {}));
/**
 * Integration Type - Available integrations for the AIXTIV SYMPHONY system
 */
var IntegrationType;
(function (IntegrationType) {
    IntegrationType["MATCH_LINKEDIN_APP"] = "ML-A";
    IntegrationType["MEMORIA_LINKEDIN_APP"] = "MM-A";
    IntegrationType["GOOGLE_WORKSPACE"] = "GW-A";
    IntegrationType["BLOCKCHAIN_VALIDATOR"] = "BC-V";
})(IntegrationType || (exports.IntegrationType = IntegrationType = {}));
/**
 * Security Option - Security features available in the system
 */
var SecurityOption;
(function (SecurityOption) {
    SecurityOption["SINGLE_SIGN_ON"] = "SSO";
    SecurityOption["MULTI_FACTOR_AUTH"] = "MFA";
    SecurityOption["BIOMETRIC_AUTH"] = "BA";
    SecurityOption["BLOCKCHAIN_VERIFICATION"] = "BCV";
})(SecurityOption || (exports.SecurityOption = SecurityOption = {}));
/**
 * Metadata for user types - provides additional context and capabilities for each user type
 */
exports.UserTypeMetadata = {
    [UserType.CORPORATE_ENTERPRISE_LEADER]: {
        baseCapabilities: [
            'Dream Commander',
            'Bid Suite',
            'LENZ Analyst',
            'Strategic Planning',
            'Team Management',
        ],
        eligibleSpecializedRoles: [UserType.VISIONARY_VOICE, UserType.CO_PILOT],
        availablePaymentTiers: [
            UserType.QUARTERLY_SUBSCRIBER,
            UserType.ANNUAL_SUBSCRIBER,
            UserType.ENTERPRISE_LICENSE,
        ],
        availableSolutions: [
            CoreSolution.DREAM_COMMANDER,
            CoreSolution.LENZ_ANALYST,
            CoreSolution.BID_SUITE,
            CoreSolution.MEMORIA_ANTHOLOGY,
            CoreSolution.BRAND_DIAGNOSTIC,
        ],
        maxIntegrations: 10,
        securityLevel: 'maximum',
        blockchainEnabled: true,
    },
    [UserType.CORPORATE_TEAM_MEMBER]: {
        baseCapabilities: ['Task Management', 'Content Development', 'Reporting'],
        eligibleSpecializedRoles: [UserType.PILOT],
        availablePaymentTiers: [
            UserType.MONTHLY_SUBSCRIBER,
            UserType.QUARTERLY_SUBSCRIBER,
        ],
        availableSolutions: [
            CoreSolution.WISH_GRANTER,
            CoreSolution.CUSTOMER_DELIGHT,
        ],
        maxIntegrations: 3,
        securityLevel: 'enhanced',
        blockchainEnabled: true,
    },
    [UserType.ACADEMIC_STUDENT]: {
        baseCapabilities: [
            'Learning Path',
            'Content Access',
            'Project Collaboration',
        ],
        eligibleSpecializedRoles: [],
        availablePaymentTiers: [
            UserType.MONTHLY_SUBSCRIBER,
            UserType.QUARTERLY_SUBSCRIBER,
        ],
        availableSolutions: [CoreSolution.LENZ_ANALYST, CoreSolution.WISH_GRANTER],
        maxIntegrations: 2,
        securityLevel: 'basic',
        blockchainEnabled: false,
    },
    // Additional user type metadata entries would follow the same pattern
};
/**
 * Parses a user type code into its component parts
 * @param code The full user type code (e.g., "C-L-E-8765-45921-VV-Q")
 */
function parseUserTypeCode(code) {
    const parts = code.split('-');
    return {
        track: parts[0],
        position: parts[1],
        level: parts[2],
        entityId: parts.length > 3 ? parts[3] : undefined,
        userId: parts.length > 4 ? parts[4] : undefined,
        specializedRoles: parts.length > 5 ? [parts[5]] : [],
        paymentTier: parts.length > 6 ? parts[6] : undefined,
    };
}
/**
 * Generates a complete user type code from components
 * @param baseType The base user type (e.g., UserType.CORPORATE_ENTERPRISE_LEADER)
 * @param options Additional options to include in the code
 */
function generateUserTypeCode(baseType, options) {
    const baseParts = baseType.split('-');
    let code = `${baseParts[0]}-${baseParts[1]}-${baseParts[2]}`;
    if (options.entityId) {
        code += `-${options.entityId}`;
    }
    if (options.userId) {
        code += `-${options.userId}`;
    }
    if (options.specializedRoles && options.specializedRoles.length > 0) {
        code += `-${options.specializedRoles[0]}`;
    }
    if (options.paymentTier) {
        code += `-${options.paymentTier}`;
    }
    return code;
}
/**
 * Adds a user to Firestore with blockchain verification
 * @param userData The user data to add
 */
async function addUserWithBlockchainVerification(userData) {
    // Implementation would interact with Firebase/Firestore and blockchain
    // This is a placeholder for the actual implementation
    // Generate blockchain verification
    const blockchainVerification = await generateBlockchainVerification(userData);
    // Store user in Firestore
    // const userRef = await addDoc(collection(firestore, 'users'), {
    //   ...userData,
    //   createdAt: serverTimestamp(),
    //   updatedAt: serverTimestamp(),
    //   verificationStatus: 'pending',
    //   blockchainAddress: blockchainVerification.userAddress
    // });
    // Return the user ID
    return 'user-id-placeholder';
}
/**
 * Generates blockchain verification for a user
 * @param userData The user data to verify
 */
async function generateBlockchainVerification(userData) {
    // Implementation would interact with blockchain
    // This is a placeholder for the actual implementation
    return {
        userAddress: '0x' + Math.random().toString(16).substring(2, 42),
        userCodeHash: 'hash-placeholder',
        timestamp: Date.now(),
        transactionId: 'tx-placeholder',
        verificationStatus: false,
        verificationProof: 'proof-placeholder',
    };
}
/**
 * Exports all user type system components
 */
exports.default = {
    UserType,
    CoreSolution,
    PilotType,
    IntegrationType,
    SecurityOption,
    UserTypeMetadata: exports.UserTypeMetadata,
    parseUserTypeCode,
    generateUserTypeCode,
    addUserWithBlockchainVerification,
};
//# sourceMappingURL=02-uid-aixtiv-user-types.js.map