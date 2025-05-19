import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { authService } from './auth-service';
import { User, UserType, AuthState, USER_TYPES } from './user-auth-types';

// Create Auth Context with a complete set of methods
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
  silentAuthentication=> Promise;
  useSallyPort: (token=> Promise;
}>({
  authState: {
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
  silentAuthentication=> {},
  useSallyPort=> {}
});

// Auth Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState({
    isAuthenticated,
    user,
    userType,
    isLoading,
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
            const userData = userDoc.data();
            const userType = USER_TYPES[userData.userType];
            
            setAuthState({
              isAuthenticated,
              user,
              isLoading,
              error: null
            });
          } else {
            setAuthState({
              isAuthenticated,
              user,
              userType,
              isLoading,
              error: 'User data not found'
            });
          }
        } catch (error) {
          setAuthState({
            isAuthenticated,
            user,
            userType,
            isLoading,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        setAuthState({
          isAuthenticated,
          user,
          userType,
          isLoading,
          error: null
        });
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

  // Silent Authentication implementation
  const silentAuthentication = async () => {
    setAuthState({ ...authState, isLoading, error: null });
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
        isAuthenticated,
        isLoading,
        error: null
      });
    } catch (error) {
      // Silent auth should fail gracefully
      console.warn('Silent authentication failed:', error);
      setAuthState({
        ...authState,
        isLoading,
        // Don't set error for silent auth failures
        error: null
      });
    }
  };

  // SallyPort authentication implementation
  const useSallyPort = async (token=> {
    setAuthState({ ...authState, isLoading, error: null });
    try {
      // Assuming authService has a sallyPortAuth method
      const user = await authService.sallyPortAuth(token);
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
        error: error instanceof Error ? error.message : 'Error using SallyPort'
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
