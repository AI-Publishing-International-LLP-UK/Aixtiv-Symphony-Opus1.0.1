import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { authService } from './auth-service';
import { User, UserType, AuthState, USER_TYPES } from './user-auth-types';

// Vision Lake Solutions - Silent Authentication & SallyPort types
export 

export 

export 

export 

export 

export 

// Create Auth Context
const AuthContext = createContext Promise;
  signInWithOutlook=> Promise;
  signInWithLinkedIn=> Promise;
  signInWithEmail: (email, password=> Promise;
  registerWithEmail: (email, password, displayName=> Promise;
  signOut=> Promise;
  upgradeToDrGrant: (userId=> Promise;
  addPaymentMethodAndUpgrade: (userId, paymentMethodId=> Promise;
  activateTrialPeriod: (userId=> Promise;
  upgradeToFullyRegistered: (userId, culturalEmpathyCode=> Promise;
  // VLS Silent Authentication Methods
  enableSilentAuth: (userId=> Promise;
  updateBehavioralBiometrics: (biometricData=> Promise;
  registerTrustedDevice: (deviceInfo, 'lastSeen' | 'isTrusted' | 'trustLevel'>) => Promise;
  getSilentAuthProfile: (userId=> Promise;
  verifySilentAuthScore=> Promise; // Returns current trust score
  // VLS SallyPort Methods
  requestSallyPortAccess: (purpose, accessLevel=> Promise;
  checkSallyPortStatus: (verificationId=> Promise;
  approveSallyPortRequest: (verificationId, approverEmail, approverName=> Promise;
  rejectSallyPortRequest: (verificationId, reason=> Promise;
  getActiveSallyPortVerifications: (userId=> Promise;
}>({
}>({
  authState: {
    isAuthenticated,
    user,
    userType,
    isLoading,
    error,
    isSilentAuthEnabled,
    isSallyPortEnabled,
    authLevel: 'basic',
    continuousAuthScore: 0
  },
    isAuthenticated,
    user,
    userType,
    isLoading,
    error: null
  },
  signInWithGoogle=> {},
  signInWithOutlook=> {},
  signInWithLinkedIn=> {},
  signInWithEmail=> {},
  registerWithEmail=> {},
  signOut=> {},
  upgradeToDrGrant=> {},
  addPaymentMethodAndUpgrade=> {},
  activateTrialPeriod=> {},
  upgradeToFullyRegistered=> {},
  // Silent Auth default implementations
  enableSilentAuth=> {},
  updateBehavioralBiometrics=> {},
  registerTrustedDevice=> {},
  getSilentAuthProfile=> null,
  verifySilentAuthScore=> 0,
  // SallyPort default implementations
  requestSallyPortAccess=> ({ 
    verificationId: '', 
    status: 'pending', 
    requestedAt, 
    expiresAt, 
    accessLevel: '', 
    purpose: '',
    deviceInfo: { 
      deviceId: '', 
      deviceType: 'other', 
      browser: '', 
      os: '', 
      lastSeen, 
      isTrusted, 
      trustLevel: 0 
    },
    locationInfo: { 
      country: '', 
      region: '', 
      lastAccessed, 
      isAnomaly: false 
    }
  }),
  checkSallyPortStatus=> null,
  approveSallyPortRequest=> {},
  rejectSallyPortRequest=> {},
  getActiveSallyPortVerifications=> []
});

// Auth Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState({
    isAuthenticated,
    user,
    userType,
    isLoading,
    error,
    isSilentAuthEnabled,
    isSallyPortEnabled,
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
            const userData = userDoc.data();
            const userType = USER_TYPES[userData.userType];
            
            // Check for Silent Auth profile if enabled
            let silentAuthProfile;
            let isSilentAuthEnabled = false;
            let isSallyPortEnabled = false;
            let authLevel: MultiLevelAuthState['authLevel'] = 'basic';
            let continuousAuthScore = 0;
            let activeSallyPortVerifications= [];
            
            // Fetch silent auth profile if it exists
            try {
              const silentAuthDoc = await getDoc(doc(db, 'silentAuth', user.uid));
              if (silentAuthDoc.exists()) {
                silentAuthProfile = silentAuthDoc.data();
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
              isAuthenticated,
              user,
              isLoading,
              error,
              activeSallyPortVerifications
            });
            setAuthState({
              isAuthenticated,
              user,
              userType,
              isLoading,
              error: 'User data not found',
              isSilentAuthEnabled,
              isSallyPortEnabled,
              authLevel: 'basic',
              continuousAuthScore: 0
            });
          }
        } catch (error) {
          setAuthState({
            isAuthenticated,
            user,
            userType,
            isLoading,
            error: error instanceof Error ? error.message : 'Unknown error',
            isSilentAuthEnabled,
            isSallyPortEnabled,
            authLevel: 'basic',
            continuousAuthScore: 0
          });
        }
      } else {
        setAuthState({
          isAuthenticated,
          user,
      }
    });

    return () => unsubscribe();
  }, []);

  // Sign in with Google
  const signInWithGoogle = async () => {
    setAuthState({ ...authState, isLoading, error: null });
    try {
      const user = await authService.signInWithGoogle();
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated,
        isLoading,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading,
        error: error instanceof Error ? error.message : 'Error signing in with Google'
      });
    }
  };

  // Sign in with Outlook
  const signInWithOutlook = async () => {
    setAuthState({ ...authState, isLoading, error: null });
    try {
      const user = await authService.signInWithOutlook();
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated,
        isLoading,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading,
        error: error instanceof Error ? error.message : 'Error signing in with Outlook'
      });
    }
  };

  // Sign in with LinkedIn
  const signInWithLinkedIn = async () => {
    setAuthState({ ...authState, isLoading, error: null });
    try {
      const user = await authService.signInWithLinkedIn();
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated,
        isLoading,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading,
        error: error instanceof Error ? error.message : 'Error signing in with LinkedIn'
      });
    }
  };

  // Sign in with email
  const signInWithEmail = async (email, password=> {
    setAuthState({ ...authState, isLoading, error: null });
    try {
      const user = await authService.signInWithEmail(email, password);
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated,
        isLoading,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading,
        error: error instanceof Error ? error.message : 'Error signing in with email'
      });
    }
  };

  // Register with email
  const registerWithEmail = async (email, password, displayName=> {
    setAuthState({ ...authState, isLoading, error: null });
    try {
      const user = await authService.registerWithEmail(email, password, displayName);
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated,
        isLoading,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading,
        error: error instanceof Error ? error.message : 'Error registering with email'
      });
    }
  };

  // Sign out
  const signOut = async () => {
    setAuthState({ ...authState, isLoading, error: null });
    try {
      await authService.signOut();
      setAuthState({
        isAuthenticated,
        user,
        userType,
        isLoading,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading,
        error: error instanceof Error ? error.message : 'Error signing out'
      });
    }
  };

  // Upgrade to Dr. Grant
  const upgradeToDrGrant = async (userId=> {
    setAuthState({ ...authState, isLoading, error: null });
    try {
      const user = await authService.upgradeToDrGrant(userId);
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated,
        isLoading,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading,
        error: error instanceof Error ? error.message : 'Error upgrading to Dr. Grant'
      });
    }
  };

  // Add payment method and upgrade
  const addPaymentMethodAndUpgrade = async (userId, paymentMethodId=> {
    setAuthState({ ...authState, isLoading, error: null });
    try {
      const user = await authService.addPaymentMethodAndUpgrade(userId, paymentMethodId);
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated,
        isLoading,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading,
        error: error instanceof Error ? error.message : 'Error adding payment method'
      });
    }
  };

  // Activate trial period
  const activateTrialPeriod = async (userId=> {
    setAuthState({ ...authState, isLoading, error: null });
    try {
      const user = await authService.activateTrialPeriod(userId);
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated,
        isLoading,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading,
        error: error instanceof Error ? error.message : 'Error activating trial period'
      });
    }
  };

  // Upgrade to fully registered
  const upgradeToFullyRegistered = async (userId, culturalEmpathyCode=> {
    setAuthState({ ...authState, isLoading, error: null });
    try {
      const user = await authService.upgradeToFullyRegistered(userId, culturalEmpathyCode);
      const userType = USER_TYPES[user.userType];
      setAuthState({
        isAuthenticated,
        isLoading,
        error: null
      });
    } catch (error) {
      setAuthState({
        ...authState,
        isLoading,
        error: error instanceof Error ? error.message : 'Error upgrading to fully registered'
      });
    }
  };

  return (
    
      {children}
    
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
