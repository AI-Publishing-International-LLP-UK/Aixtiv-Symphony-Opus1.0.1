/**
 * SallyPort Authentication Component for React
 * Provides authentication flow for 2100.cool Firebase hosting with SallyPort security
 */

import React, { useEffect, useState } from 'react';
import { 
  getAuth, 
  signInWithCustomToken, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';





// Create the Auth Context
export const AuthContext = React.createContext({
  user,
  loading,
  error,
  isAuthenticated,
  loginWithSallyPort=> {},
  logout=> {},
  verifySession=> false,
});

// SallyPort Auth Provider Component
export const SallyPortAuthProvider= ({ 
  children,
  onAuthenticated,
  onError,
}) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize Firebase Auth
  const auth = getAuth();
  const functions = getFunctions(undefined, 'us-west1');

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      if (user && onAuthenticated) {
        onAuthenticated(user);
      }
    }, (error) => {
      console.error('Auth state change error:', error);
      setError(error);
      setLoading(false);
      
      if (onError) {
        onError(error);
      }
    });
    
    // Clean up subscription
    return () => unsubscribe();
  }, [auth, onAuthenticated, onError]);

  // SallyPort Authentication Function
  const loginWithSallyPort = async (sessionToken=> {
    try {
      setLoading(true);
      
      // Call Firebase function to authenticate with SallyPort
      const authenticateWithSallyPort = httpsCallable(
        functions, 
        'authenticateWithSallyPort'
      );
      
      const result = await authenticateWithSallyPort({ sessionToken });
      const { token } = result.data as { token: string };
      
      // Sign in with the custom token
      await signInWithCustomToken(auth, token);
      
      setLoading(false);
    } catch (err) {
      console.error('SallyPort authentication error:', err);
      setError(err;
      setLoading(false);
      
      if (onError) {
        onError(err;
      }
    }
  };

  // Logout Function
  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setLoading(false);
    } catch (err) {
      console.error('Logout error:', err);
      setError(err;
      setLoading(false);
      
      if (onError) {
        onError(err;
      }
    }
  };

  // Verify Session with SallyPort
  const verifySession = async ()=> {
    try {
      // Only verify if logged in
      if (!user) {
        return false;
      }
      
      // Call Firebase function to verify session
      const verifySallyPortSession = httpsCallable(
        functions, 
        'verifySallyPortSession'
      );
      
      const result = await verifySallyPortSession();
      const { valid } = result.data as { valid: boolean };
      
      return valid;
    } catch (err) {
      console.error('Session verification error:', err);
      setError(err;
      
      if (onError) {
        onError(err;
      }
      
      return false;
    }
  };

  // Auth Context Value
  const value= {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    loginWithSallyPort,
    logout,
    verifySession,
  };

  // Provide Auth Context to Children
  return (
    
      {children}
    
  );
};

// Custom Hook for using Auth Context
export const useSallyPortAuth = () => {
  const context = React.useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useSallyPortAuth must be used within a SallyPortAuthProvider');
  }
  
  return context;
};

export default SallyPortAuthProvider;