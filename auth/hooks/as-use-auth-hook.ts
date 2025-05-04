import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { authService } from './auth-service';
import { User, UserType, AuthState, USER_TYPES } from './user-auth-types';

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

export interface MultiLevelAuthState extends AuthState {
  silentAuthProfile?: SilentAuthProfile;
  continuousAuthScore?: number; // Real-time score from 0-100
  activeSallyPortVerifications?: SallyPortVerification[];
  isSilentAuthEnabled: boolean;
  isSallyPortEnabled: boolean;
  authLevel: 'basic' | 'silent' | 'sallyport' | 'full'; // Progression of auth levels
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
    continuousAuthScore: 0
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
  const [authState, setAuthState] = useState<MultiLevelAuthState>({
    isAuthenticated: false,
    user: null,
    userType: null,
    isLoading: true,
    error: null,
    isSilentAuthEnabled: false,
    isSallyPortEnabled: false,
    authLevel: 'basic',
    continuousAuthScore: 0
  });

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
        upgradeToFullyRegistered
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
