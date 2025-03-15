import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '../services/firebase';

// Define security role levels for ASOOS
export type SecurityRole = 
  | 'SAO' // Super Admin Owner (Mr. Phillip Corey Roark - 100% access, non-revokable)
  | 'SA-Admin' // Aixtiv System Admin
  | 'SA-Enterprise' // Enterprise Owner
  | 'SA-Organization' // Organization Owner
  | 'SA-Coach' // Practitioner Owner
  | 'SA-CompanyTeam' // Team Owner
  | 'SA-CommunityTeam' // Group Owner
  | 'SA-SocratesTeam' // Teacher Group Owner
  | 'User' // Regular user
  | null;

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  securityRole: SecurityRole;
  organizations?: string[];
  teams?: string[];
  lastLogin?: Date;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (requiredRole: SecurityRole) => boolean;
  updateUserProfile: (data: Partial<UserData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Security level hierarchy for permission checks
const securityHierarchy: Record<string, number> = {
  'SAO': 100,
  'SA-Admin': 90,
  'SA-Enterprise': 80,
  'SA-Organization': 70,
  'SA-Coach': 60,
  'SA-CompanyTeam': 50,
  'SA-CommunityTeam': 40,
  'SA-SocratesTeam': 30,
  'User': 10,
  'null': 0
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch user data from Firestore
  const fetchUserData = async (user: FirebaseUser) => {
    try {
      const userRef = doc(firestore, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as Omit<UserData, 'uid'>;
        setUserData({ ...userData, uid: user.uid });
      } else {
        // If user document doesn't exist yet, create it with default role
        const newUserData: UserData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          securityRole: 'User', // Default role
          lastLogin: new Date()
        };
        
        await setDoc(userRef, newUserData);
        setUserData(newUserData);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        await fetchUserData(user);
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Login with email and password
  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Update last login
      if (userCredential.user) {
        const userRef = doc(firestore, 'users', userCredential.user.uid);
        await setDoc(userRef, { lastLogin: new Date() }, { merge: true });
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  // Register new user
  const register = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      const newUserData: UserData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: displayName,
        securityRole: 'User', // Default role
        lastLogin: new Date()
      };
      
      const userRef = doc(firestore, 'users', userCredential.user.uid);
      await setDoc(userRef, newUserData);
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  // Check if user has required permission based on security hierarchy
  const hasPermission = (requiredRole: SecurityRole): boolean => {
    if (!userData || !userData.securityRole) return false;
    
    // SAO is Philip Corey Roark - always has access
    if (userData.securityRole === 'SAO') return true;
    
    const userLevel = securityHierarchy[userData.securityRole] || 0;
    const requiredLevel = securityHierarchy[requiredRole || 'null'] || 0;
    
    return userLevel >= requiredLevel;
  };

  // Update user profile data
  const updateUserProfile = async (data: Partial<UserData>) => {
    if (!currentUser) throw new Error("No authenticated user");
    
    try {
      const userRef = doc(firestore, 'users', currentUser.uid);
      await setDoc(userRef, data, { merge: true });
      
      // Update local user data
      if (userData) {
        setUserData({ ...userData, ...data });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const value = {
    currentUser,
    userData,
    loading,
    login,
    register,
    logout,
    hasPermission,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

