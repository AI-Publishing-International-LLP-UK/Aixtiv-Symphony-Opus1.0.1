"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_TYPES = exports.AuthProvider = exports.UserAuthLevel = void 0;
// User Authentication Levels
var UserAuthLevel;
(function (UserAuthLevel) {
    UserAuthLevel[UserAuthLevel["NON_AUTHENTICATED"] = 0] = "NON_AUTHENTICATED";
    UserAuthLevel[UserAuthLevel["DR_MATCH"] = 1] = "DR_MATCH";
    UserAuthLevel[UserAuthLevel["DR_GRANT"] = 2] = "DR_GRANT";
    UserAuthLevel[UserAuthLevel["PAYMENT_VERIFIED"] = 2.5] = "PAYMENT_VERIFIED";
    UserAuthLevel[UserAuthLevel["TRIAL_PERIOD"] = 2.75] = "TRIAL_PERIOD";
    UserAuthLevel[UserAuthLevel["FULLY_REGISTERED"] = 3] = "FULLY_REGISTERED";
})(UserAuthLevel || (exports.UserAuthLevel = UserAuthLevel = {}));
// Authentication Provider Types
var AuthProvider;
(function (AuthProvider) {
    AuthProvider["NONE"] = "none";
    AuthProvider["GOOGLE"] = "google";
    AuthProvider["OUTLOOK"] = "outlook";
    AuthProvider["LINKEDIN"] = "linkedin";
    AuthProvider["EMAIL_PASSWORD"] = "email_password";
})(AuthProvider || (exports.AuthProvider = AuthProvider = {}));
// Default User Types
exports.USER_TYPES = {
    guest: {
        id: 'guest',
        level: UserAuthLevel.NON_AUTHENTICATED,
        name: 'Guest',
        description: 'Non-authenticated user with limited access',
        privileges: ['view_public_content'],
        allowedOperations: ['read_public'],
    },
    authenticated: {
        id: 'authenticated',
        level: UserAuthLevel.DR_MATCH,
        name: 'Dr. Match Authenticated',
        description: 'Basic authenticated user',
        privileges: ['view_public_content', 'view_basic_features', 'comment'],
        allowedOperations: ['read_public', 'read_basic', 'write_comments'],
    },
    verified: {
        id: 'verified',
        level: UserAuthLevel.DR_GRANT,
        name: 'Dr. Grant Verified',
        description: 'Email verified user with free publication',
        privileges: [
            'view_public_content',
            'view_basic_features',
            'comment',
            'publish_free',
        ],
        allowedOperations: [
            'read_public',
            'read_basic',
            'write_comments',
            'write_publications',
        ],
    },
    paymentVerified: {
        id: 'paymentVerified',
        level: UserAuthLevel.PAYMENT_VERIFIED,
        name: 'Payment Method Verified',
        description: 'User with validated payment method',
        privileges: [
            'view_public_content',
            'view_basic_features',
            'comment',
            'publish_free',
            'access_premium_content',
        ],
        allowedOperations: [
            'read_public',
            'read_basic',
            'read_premium',
            'write_comments',
            'write_publications',
        ],
    },
    trialPeriod: {
        id: 'trialPeriod',
        level: UserAuthLevel.TRIAL_PERIOD,
        name: 'Trial Period User',
        description: 'User in 3-day free trial with validated payment',
        privileges: [
            'view_public_content',
            'view_basic_features',
            'comment',
            'publish_free',
            'access_premium_content',
            'access_trial_features',
        ],
        allowedOperations: [
            'read_public',
            'read_basic',
            'read_premium',
            'write_comments',
            'write_publications',
            'create_dream_commander',
        ],
    },
    fullyRegistered: {
        id: 'fullyRegistered',
        level: UserAuthLevel.FULLY_REGISTERED,
        name: 'Fully Registered User',
        description: 'Permanent registered user with cultural-empathy code',
        privileges: [
            'view_public_content',
            'view_basic_features',
            'comment',
            'publish_free',
            'access_premium_content',
            'access_all_features',
            'download_content',
        ],
        allowedOperations: [
            'read_public',
            'read_basic',
            'read_premium',
            'write_comments',
            'write_publications',
            'create_dream_commander',
            'download_lenz',
            'download_co_pilot_nft',
        ],
    },
};
//# sourceMappingURL=as-user-auth-types.js.map