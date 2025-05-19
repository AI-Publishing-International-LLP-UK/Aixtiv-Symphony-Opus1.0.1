// User Authentication Levels
export enum UserAuthLevel {
  NON_AUTHENTICATED = 0, // Level 0= 1, // Level 1= 2, // Level 2= 2.5, // Level 2.5= 2.75, // Level 2.75: 3-day free trial with payment method
  FULLY_REGISTERED = 3, // Level 3: Permanent registered user
}

// Authentication Provider Types
export enum AuthProvider {
  NONE = 'none',
  GOOGLE = 'google',
  OUTLOOK = 'outlook',
  LINKEDIN = 'linkedin',
  EMAIL_PASSWORD = 'email_password',
}

// User Type Interface
export 

// Default User Types
export const USER_TYPES= {
  guest: {
    id: 'guest',
    level,
    name: 'Guest',
    description: 'Non-authenticated user with limited access',
    privileges: ['view_public_content'],
    allowedOperations: ['read_public'],
  },
  authenticated: {
    id: 'authenticated',
    level,
    name: 'Dr. Match Authenticated',
    description: 'Basic authenticated user',
    privileges: ['view_public_content', 'view_basic_features', 'comment'],
    allowedOperations: ['read_public', 'read_basic', 'write_comments'],
  },
  verified: {
    id: 'verified',
    level,
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
    level,
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
    level,
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
    level,
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

// User Interface
export 

// Authentication State
export 
