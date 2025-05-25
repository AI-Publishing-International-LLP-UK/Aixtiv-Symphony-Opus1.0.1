import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { authService } from './auth-service';
import { User, UserType, AuthState, USER_TYPES } from './user-auth-types';

// Create Auth Context with a complete set of methods
const AuthContext = createContext<{
  authState: AuthState;
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
  silentAuthentication: () => Promise<void>;
  useSallyPort: (token: string) => Promise<void>;
}>({
  authState: {
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
  silentAuthentication: async () => {},
  useSallyPort: async () => {}
});

// Auth Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    userType: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            const userType = USER_TYPES[userData.userType];
            
            setAuthState({
              isAuthenticated: true,
              user: userData,
              userType,
              isLoading: false,
              error: null
            });
          } else {
            setAuthState({
              isAuthenticated: false,
              user: null,
              userType: null,
              isLoading: false,
              error: 'User data not found'
            });
          }
        } catch (error) {
          setAuthState({
            isAuthenticated: false,
            user: null,
            userType: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
          userType: null,
          isLoading: false,
          error: null
        });
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

  // Silent Authentication implementation
  const silentAuthentication = async () => {
    setAuthState({ ...authState, isLoading: true, error: null });
    try {
      // Check local storage for refresh token
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token found');
      }

      // Assuming authService has a silentAuth method
      const user = await authService.silentAuth(refreshToken);
      const userType = USER_TYPES[user.userType];
      
      setAuthState({
        isAuthenticated: true,
        user,
        userType,
        isLoading: false,
        error: null
      });
    } catch (error) {
      // Silent auth should fail gracefully
      console.warn('Silent authentication failed:', error);
      setAuthState({
        ...authState,
        isLoading: false,
        // Don't set error for silent auth failures
        error: null
      });
    }
  };

  // SallyPort authentication implementation
  const useSallyPort = async (token: string) => {
    setAuthState({ ...authState, isLoading: true, error: null });
    try {
      // Assuming authService has a sallyPortAuth method
      const user = await authService.sallyPortAuth(token);
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
        error: error instanceof Error ? error.message : 'Error using SallyPort'
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
        upgradeToFullyRegistered,
        silentAuthentication,
        useSallyPort
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
