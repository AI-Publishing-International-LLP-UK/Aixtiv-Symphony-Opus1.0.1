import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { authService } from './auth-service';
import { User, UserType, AuthState, USER_TYPES } from './user-auth-types';
import ClaudeTokenManager, { ClaudeOAuthToken, TokenValidationResult } from '../../core-protocols/admin-core/claude_token_manager';

// Vision Lake Solutions - Silent Authentication & SallyPort types
export interface BehavioralBiometric {
  typingPattern?: string;
  interactionTiming?: number[];
  scrollPattern?: number[];
  lastAnalyzed?: Date;
  confidenceScore?: number; // 0-100 scale
}

export interface DeviceIdentifier {
  deviceId: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'other';
  browser: string;
  os: string;
  lastSeen: Date;
  isTrusted: boolean;
  trustLevel: number; // 0-100 scale
}

export interface LocationData {
  country: string;
  region: string;
  city?: string;
  lastAccessed: Date;
  isAnomaly: boolean;
  ipAddress?: string;
}

export interface SilentAuthProfile {
  userId: string;
  behavioralBiometrics: BehavioralBiometric[];
  trustedDevices: DeviceIdentifier[];
  knownLocations: LocationData[];
  authStrength: number; // 0-100 scale
  lastUpdated: Date;
  riskScore: number; // 0-100 (higher = riskier)
}

export interface SallyPortVerification {
  verificationId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approverEmail?: string;
  approverName?: string;
  requestedAt: Date;
  expiresAt: Date;
  completedAt?: Date;
  accessLevel: string;
  purpose: string;
  deviceInfo: DeviceIdentifier;
  locationInfo: LocationData;
}

export interface ClaudeAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token?: ClaudeOAuthToken;
  tokenValidation?: TokenValidationResult;
  scopes: string[];
  userId?: string;
}

export interface MultiLevelAuthState extends AuthState {
  silentAuthProfile?: SilentAuthProfile;
  continuousAuthScore?: number; // Real-time score from 0-100
  activeSallyPortVerifications?: SallyPortVerification[];
  isSilentAuthEnabled: boolean;
  isSallyPortEnabled: boolean;
  authLevel: 'basic' | 'silent' | 'sallyport' | 'full'; // Progression of auth levels
  claudeAuth: ClaudeAuthState; // Claude-specific auth state
}

// Create Auth Context
const AuthContext = createContext<{
  authState: MultiLevelAuthState;
  signInWithGoogle: () => Promise<void>;
  signInWithOutlook: () => Promise<void>;
  signInWithLinkedIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  upgradeToDrGrant: (userId: string) => Promise<void>;
  addPaymentMethodAndUpgrade: (userId: string, paymentMethodId: string) => Promise<void>;
  activateTrialPeriod: (userId: string) => Promise<void>;
  upgradeToFullyRegistered: (userId: string, culturalEmpathyCode: string) => Promise<void>;
  // VLS Silent Authentication Methods
  enableSilentAuth: (userId: string) => Promise<void>;
  updateBehavioralBiometrics: (biometricData: Partial<BehavioralBiometric>) => Promise<void>;
  registerTrustedDevice: (deviceInfo: Omit<DeviceIdentifier, 'lastSeen' | 'isTrusted' | 'trustLevel'>) => Promise<void>;
  getSilentAuthProfile: (userId: string) => Promise<SilentAuthProfile | null>;
  verifySilentAuthScore: () => Promise<number>; // Returns current trust score
  // VLS SallyPort Methods
  requestSallyPortAccess: (purpose: string, accessLevel: string) => Promise<SallyPortVerification>;
  checkSallyPortStatus: (verificationId: string) => Promise<SallyPortVerification | null>;
  approveSallyPortRequest: (verificationId: string, approverEmail: string, approverName: string) => Promise<void>;
  rejectSallyPortRequest: (verificationId: string, reason: string) => Promise<void>;
  getActiveSallyPortVerifications: (userId: string) => Promise<SallyPortVerification[]>;
  // Claude OAuth2 Methods
  initiateClaudeAuth: (redirectUri?: string) => Promise<string>; // Returns authorization URL
  handleClaudeAuthCallback: (code: string, codeVerifier?: string) => Promise<void>;
  refreshClaudeToken: () => Promise<boolean>;
  getClaudeAccessToken: () => Promise<string | null>;
  validateClaudeToken: () => Promise<TokenValidationResult>;
  signOutClaude: () => Promise<void>;
}>({
}>({
  authState: {
    isAuthenticated: false,
    user: null,
    userType: null,
    isLoading: true,
    error: null,
    isSilentAuthEnabled: false,
    isSallyPortEnabled: false,
    authLevel: 'basic',
    continuousAuthScore: 0,
    claudeAuth: {
      isAuthenticated: false,
      isLoading: false,
      error: null,
      scopes: []
    }
  },
    isAuthenticated: false,
    user: null,
    userType: null,
    isLoading: true,
    error: null
  },
  signInWithGoogle: async () => {},
  signInWithOutlook: async () => {},
  signInWithLinkedIn: async () => {},
  signInWithEmail: async () => {},
  registerWithEmail: async () => {},
  signOut: async () => {},
  upgradeToDrGrant: async () => {},
  addPaymentMethodAndUpgrade: async () => {},
  activateTrialPeriod: async () => {},
  upgradeToFullyRegistered: async () => {},
  // Silent Auth default implementations
  enableSilentAuth: async () => {},
  updateBehavioralBiometrics: async () => {},
  registerTrustedDevice: async () => {},
  getSilentAuthProfile: async () => null,
  verifySilentAuthScore: async () => 0,
  // SallyPort default implementations
  requestSallyPortAccess: async () => ({ 
    verificationId: '', 
    status: 'pending', 
    requestedAt: new Date(), 
    expiresAt: new Date(), 
    accessLevel: '', 
    purpose: '',
    deviceInfo: { 
      deviceId: '', 
      deviceType: 'other', 
      browser: '', 
      os: '', 
      lastSeen: new Date(), 
      isTrusted: false, 
      trustLevel: 0 
    },
    locationInfo: { 
      country: '', 
      region: '', 
      lastAccessed: new Date(), 
      isAnomaly: false 
    }
  }),
  checkSallyPortStatus: async () => null,
  approveSallyPortRequest: async () => {},
  rejectSallyPortRequest: async () => {},
  getActiveSallyPortVerifications: async () => []
});

// Auth Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Initialize Claude Token Manager
  const claudeTokenManager = new ClaudeTokenManager('api-for-warp-drive');
  
  const [authState, setAuthState] = useState<MultiLevelAuthState>({
    isAuthenticated: false,
    user: null,
    userType: null,
    isLoading: true,
    error: null,
    isSilentAuthEnabled: false,
    isSallyPortEnabled: false,
    authLevel: 'basic',
    continuousAuthScore: 0,
    claudeAuth: {
      isAuthenticated: false,
      isLoading: false,
      error: null,
      scopes: []
    }
  });
  
  // Store code verifier for PKCE
  const [pkceCodeVerifier, setPkceCodeVerifier] = useState<string | undefined>();

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch user data from Firestore
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            const userType = USER_TYPES[userData.userType];
            
            // Check for Silent Auth profile if enabled
            let silentAuthProfile: SilentAuthProfile | undefined;
            let isSilentAuthEnabled = false;
            let isSallyPortEnabled = false;
            let authLevel: MultiLevelAuthState['authLevel'] = 'basic';
            let continuousAuthScore = 0;
            let activeSallyPortVerifications: SallyPortVerification[] = [];
            
            // Fetch silent auth profile if it exists
            try {
              const silentAuthDoc = await getDoc(doc(db, 'silentAuth', user.uid));
              if (silentAuthDoc.exists()) {
                silentAuthProfile = silentAuthDoc.data() as SilentAuthProfile;
                isSilentAuthEnabled = true;
                continuousAuthScore = silentAuthProfile.authStrength;
                authLevel = 'silent';
              }
            } catch (error) {
              console.error('Error fetching silent auth profile:', error);
            }
            
            // Fetch SallyPort verifications if they exist
            try {
              if (isSilentAuthEnabled) {
                const sallyPortDoc = await getDoc(doc(db, 'sallyPort', user.uid));
                if (sallyPortDoc.exists()) {
                  const sallyPortData = sallyPortDoc.data();
                  isSallyPortEnabled = sallyPortData.isEnabled || false;
                  
                  if (isSallyPortEnabled) {
                    const activeVerifications = sallyPortData.activeVerifications || [];
                    if (activeVerifications.length > 0) {
                      activeSallyPortVerifications = activeVerifications;
                      const hasApproved = activeVerifications.some(v => v.status === 'approved');
                      if (hasApproved) {
                        authLevel = 'sallyport';
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error fetching SallyPort data:', error);
            }
            
            setAuthState({
              isAuthenticated: true,
              user: userData,
              userType,
              isLoading: false,
              error: null,
              silentAuthProfile,
              isSilentAuthEnabled,
              isSallyPortEnabled,
              authLevel,
              continuousAuthScore,
              activeSallyPortVerifications
            });
            setAuthState({
              isAuthenticated: false,
              user: null,
              userType: null,
              isLoading: false,
              error: 'User data not found',
              isSilentAuthEnabled: false,
              isSallyPortEnabled: false,
              authLevel: 'basic',
              continuousAuthScore: 0
            });
          }
        } catch (error) {
          setAuthState({
            isAuthenticated: false,
            user: null,
            userType: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            isSilentAuthEnabled: false,
            isSallyPortEnabled: false,
            authLevel: 'basic',
            continuousAuthScore: 0
          });
        }
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
      }
    });

    return () => unsubscribe();
  }, []);

  // Sign in with Google
  const signInWithGoogle = async () => {
    setAuthState({ ...authState, isLoading: true, error: null });
    try {
      const user = await authService.signInWithGoogle();
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated: true,
        user,
        userType,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error signing in with Google'
      });
    }
  };

  // Sign in with Outlook
  const signInWithOutlook = async () => {
    setAuthState({ ...authState, isLoading: true, error: null });
    try {
      const user = await authService.signInWithOutlook();
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated: true,
        user,
        userType,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error signing in with Outlook'
      });
    }
  };

  // Sign in with LinkedIn
  const signInWithLinkedIn = async () => {
    setAuthState({ ...authState, isLoading: true, error: null });
    try {
      const user = await authService.signInWithLinkedIn();
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated: true,
        user,
        userType,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error signing in with LinkedIn'
      });
    }
  };

  // Sign in with email
  const signInWithEmail = async (email: string, password: string) => {
    setAuthState({ ...authState, isLoading: true, error: null });
    try {
      const user = await authService.signInWithEmail(email, password);
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated: true,
        user,
        userType,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error signing in with email'
      });
    }
  };

  // Register with email
  const registerWithEmail = async (email: string, password: string, displayName: string) => {
    setAuthState({ ...authState, isLoading: true, error: null });
    try {
      const user = await authService.registerWithEmail(email, password, displayName);
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated: true,
        user,
        userType,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error registering with email'
      });
    }
  };

  // Sign out
  const signOut = async () => {
    setAuthState({ ...authState, isLoading: true, error: null });
    try {
      await authService.signOut();
      setAuthState({
        isAuthenticated: false,
        user: null,
        userType: null,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error signing out'
      });
    }
  };

  // Upgrade to Dr. Grant
  const upgradeToDrGrant = async (userId: string) => {
    setAuthState({ ...authState, isLoading: true, error: null });
    try {
      const user = await authService.upgradeToDrGrant(userId);
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated: true,
        user,
        userType,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error upgrading to Dr. Grant'
      });
    }
  };

  // Add payment method and upgrade
  const addPaymentMethodAndUpgrade = async (userId: string, paymentMethodId: string) => {
    setAuthState({ ...authState, isLoading: true, error: null });
    try {
      const user = await authService.addPaymentMethodAndUpgrade(userId, paymentMethodId);
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated: true,
        user,
        userType,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error adding payment method'
      });
    }
  };

  // Activate trial period
  const activateTrialPeriod = async (userId: string) => {
    setAuthState({ ...authState, isLoading: true, error: null });
    try {
      const user = await authService.activateTrialPeriod(userId);
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated: true,
        user,
        userType,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error activating trial period'
      });
    }
  };

  // Upgrade to fully registered
  const upgradeToFullyRegistered = async (userId: string, culturalEmpathyCode: string) => {
    setAuthState({ ...authState, isLoading: true, error: null });
    try {
      const user = await authService.upgradeToFullyRegistered(userId, culturalEmpathyCode);
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated: true,
        user,
        userType,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error upgrading to fully registered'
      });
    }
  };

  // Claude OAuth2 Authentication Methods
  
  // Initiate Claude OAuth2 flow
  const initiateClaudeAuth = async (redirectUri?: string): Promise<string> => {
    try {
      setAuthState(prevState => ({
        ...prevState,
        claudeAuth: {
          ...prevState.claudeAuth,
          isLoading: true,
          error: null
        }
      }));
      
      // Generate authorization URL with PKCE
      const { url, codeVerifier } = await claudeTokenManager.generateAuthorizationUrl(
        redirectUri,
        // Generate a random state value for CSRF protection
        `state-${Math.random().toString(36).substring(2, 15)}`
      );
      
      // Store code verifier for later use in the callback
      setPkceCodeVerifier(codeVerifier);
      
      return url;
    } catch (error) {
      setAuthState(prevState => ({
        ...prevState,
        claudeAuth: {
          ...prevState.claudeAuth,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initiate Claude OAuth flow'
        }
      }));
      
      throw error;
    }
  };
  
  // Handle Claude OAuth2 callback
  const handleClaudeAuthCallback = async (code: string, codeVerifier?: string): Promise<void> => {
    try {
      setAuthState(prevState => ({
        ...prevState,
        claudeAuth: {
          ...prevState.claudeAuth,
          isLoading: true,
          error: null
        }
      }));
      
      // Use the stored code verifier if not provided
      const verifier = codeVerifier || pkceCodeVerifier;
      
      // Exchange authorization code for tokens
      const token = await claudeTokenManager.initiateOAuthFlow(code, verifier);
      
      // Validate the token
      const validation = await claudeTokenManager.validateClaudeToken(token);
      
      // Store token in Secret Manager
      await claudeTokenManager.rotateToken('claude-oauth-token', token);
      
      // Update auth state
      setAuthState(prevState => ({
        ...prevState,
        claudeAuth: {
          isAuthenticated: validation.isValid,
          isLoading: false,
          error: null,
          token,
          tokenValidation: validation,
          scopes: validation.scopes || [],
          userId: validation.userId
        }
      }));
      
      // Clear code verifier
      setPkceCodeVerifier(undefined);
    } catch (error) {
      setAuthState(prevState => ({
        ...prevState,
        claudeAuth: {
          ...prevState.claudeAuth,
          isAuthenticated: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to complete Claude OAuth flow'
        }
      }));
      
      // Clear code verifier
      setPkceCodeVerifier(undefined);
      
      throw error;
    }
  };
  
  // Refresh Claude token
  const refreshClaudeToken = async (): Promise<boolean> => {
    try {
      setAuthState(prevState => ({
        ...prevState,
        claudeAuth: {
          ...prevState.claudeAuth,
          isLoading: true,
          error: null
        }
      }));
      
      // Get current token
      let token = authState.claudeAuth.token;
      
      // If no token in state, try to get from Secret Manager
      if (!token) {
        try {
          token = await claudeTokenManager.getSecureToken('claude-oauth-token');
        } catch (error) {
          throw new Error('No valid Claude token available to refresh');
        }
      }
      
      // Refresh token
      const refreshedToken = await claudeTokenManager.refreshOAuthToken(token.refresh_token);
      
      if (!refreshedToken) {
        throw new Error('Token refresh failed');
      }
      
      // Validate the refreshed token
      const validation = await claudeTokenManager.validateClaudeToken(refreshedToken);
      
      // Store refreshed token in Secret Manager
      await claudeTokenManager.rotateToken('claude-oauth-token', refreshedToken);
      
      // Update auth state
      setAuthState(prevState => ({
        ...prevState,
        claudeAuth: {
          isAuthenticated: validation.isValid,
          isLoading: false,
          error: null,
          token: refreshedToken,
          tokenValidation: validation,
          scopes: validation.scopes || [],
          userId: validation.userId
        }
      }));
      
      return true;
    } catch (error) {
      setAuthState(prevState => ({
        ...prevState,
        claudeAuth: {
          ...prevState.claudeAuth,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to refresh Claude token'
        }
      }));
      
      return false;
    }
  };
  
  // Get Claude access token for API calls
  const getClaudeAccessToken = async (): Promise<string | null> => {
    try {
      // If we have a valid token in state, use it
      if (authState.claudeAuth.token && authState.claudeAuth.isAuthenticated) {
        const now = Date.now();
        
        // Check if token is expired or about to expire
        if (now < authState.claudeAuth.token.expires_at - 300000) { // 5 minutes buffer
          return authState.claudeAuth.token.access_token;
        }
        
        // Token is expired or about to expire, refresh it
        const refreshed = await refreshClaudeToken();
        if (refreshed && authState.claudeAuth.token) {
          return authState.claudeAuth.token.access_token;
        }
      }
      
      // Try to get a token from Secret Manager
      try {
        const token = await claudeTokenManager.getSecureToken('claude-oauth-token');
        
        // Update auth state with the token
        const validation = await claudeTokenManager.validateClaudeToken(token);
        
        setAuthState(prevState => ({
          ...prevState,
          claudeAuth: {
            isAuthenticated: validation.isValid,
            isLoading: false,
            error: null,
            token,
            tokenValidation: validation,
            scopes: validation.scopes || [],
            userId: validation.userId
          }
        }));
        
        return token.access_token;
      } catch (error) {
        console.error('Failed to get Claude token from Secret Manager:', error);
        
        // No valid token available, set auth state accordingly
        setAuthState(prevState => ({
          ...prevState,
          claudeAuth: {
            isAuthenticated: false,
            isLoading: false,
            error: 'No valid Claude token available',
            scopes: []
          }
        }));
        
        return null;
      }
    } catch (error) {
      console.error('Error getting Claude access token:', error);
      return null;
    }
  };
  
  // Validate Claude token
  const validateClaudeToken = async (): Promise<TokenValidationResult> => {
    try {
      setAuthState(prevState => ({
        ...prevState,
        claudeAuth: {
          ...prevState.claudeAuth,
          isLoading: true
        }
      }));
      
      // Get current token
      let token = authState.claudeAuth.token;
      
      // If no token in state, try to get from Secret Manager
      if (!token) {
        try {
          token = await claudeTokenManager.getSecureToken('claude-oauth-token');
        } catch (error) {
          const result: TokenValidationResult = {
            isValid: false,
            error: 'No valid Claude token available'
          };
          
          setAuthState(prevState => ({
            ...prevState,
            claudeAuth: {
              isAuthenticated: false,
              isLoading: false,
              error: result.error,
              scopes: []
            }
          }));
          
          return result;
        }
      }
      
      // Validate token
      const validation = await claudeTokenManager.validateClaudeToken(token);
      
      // Update auth state
      setAuthState(prevState => ({
        ...prevState,
        claudeAuth: {
          isAuthenticated: validation.isValid,
          isLoading: false,
          error: validation.error || null,
          token,
          tokenValidation: validation,
          scopes: validation.scopes || [],
          userId: validation.userId
        }
      }));
      
      return validation;
    } catch (error) {
      const result: TokenValidationResult = {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error during token validation'
      };
      
      setAuthState(prevState => ({
        ...prevState,
        claudeAuth: {
          isAuthenticated: false,
          isLoading: false,
          error: result.error,
          scopes: []
        }
      }));
      
      return result;
    }
  };
  
  // Sign out from Claude
  const signOutClaude = async (): Promise<void> => {
    try {
      setAuthState(prevState => ({
        ...prevState,
        claudeAuth: {
          ...prevState.claudeAuth,
          isLoading: true
        }
      }));
      
      // Clear Claude auth state
      setAuthState(prevState => ({
        ...prevState,
        claudeAuth: {
          isAuthenticated: false,
          isLoading: false,
          error: null,
          token: undefined,
          tokenValidation: undefined,
          scopes: []
        }
      }));
      
      // Note: We're not removing the token from Secret Manager as it might be needed
      // by other services. In a production environment, you might want to invalidate
      // the token server-side or remove it from Secret Manager.
    } catch (error) {
      setAuthState(prevState => ({
        ...prevState,
        claudeAuth: {
          ...prevState.claudeAuth,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to sign out from Claude'
        }
      }));
      
      throw error;
    }
  };
  
  // Check for existing Claude token on mount
  useEffect(() => {
    const checkClaudeToken = async () => {
      try {
        const token = await claudeTokenManager.getSecureToken('claude-oauth-token');
        const validation = await claudeTokenManager.validateClaudeToken(token);
        
        setAuthState(prevState => ({
          ...prevState,
          claudeAuth: {
            isAuthenticated: validation.isValid,
            isLoading: false,
            error: validation.error || null,
            token,
            tokenValidation: validation,
            scopes: validation.scopes || [],
            userId: validation.userId
          }
        }));
      } catch (error) {
        // No valid token or error occurred, just keep default state
        console.log('No valid Claude token found or error occurred:', error);
      }
    };
    
    checkClaudeToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authState,
        signInWithGoogle,
        signInWithOutlook,
        signInWithLinkedIn,
        signInWithEmail,
        registerWithEmail,
        signOut,
        upgradeToDrGrant,
        addPaymentMethodAndUpgrade,
        activateTrialPeriod,
        upgradeToFullyRegistered,
        // Claude OAuth2 methods
        initiateClaudeAuth,
        handleClaudeAuthCallback,
        refreshClaudeToken,
        getClaudeAccessToken,
        validateClaudeToken,
        signOutClaude
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
