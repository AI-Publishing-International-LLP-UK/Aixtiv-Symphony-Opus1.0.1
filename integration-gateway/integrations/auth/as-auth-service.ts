import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  EmailAuthProvider
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  User, 
  UserType, 
  AuthProvider, 
  UserAuthLevel, 
  USER_TYPES 
} from './user-auth-types';

// Your Firebase configuration
const firebaseConfig = {
  // Add your firebase config here
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Authentication providers
const googleProvider = new GoogleAuthProvider();
const outlookProvider = new OAuthProvider('microsoft.com');
const linkedinProvider = new OAuthProvider('linkedin.com');

// Set custom parameters for providers
googleProvider.setCustomParameters({ prompt: 'select_account' });
outlookProvider.setCustomParameters({ prompt: 'consent' });
linkedinProvider.setCustomParameters({ prompt: 'consent' });

// Add scopes for the providers
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

outlookProvider.addScope('user.read');
outlookProvider.addScope('mail.read');

linkedinProvider.addScope('r_emailaddress');
linkedinProvider.addScope('r_liteprofile');

export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  private constructor() {
    // Private constructor to enforce singleton
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.fetchUserProfile(user);
      } else {
        this.currentUser = null;
      }
    });
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Get current authenticated user
   */
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Sign in with Google
   */
  public async signInWithGoogle(): Promise<User> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return await this.handleSocialAuthResult(result.user, AuthProvider.GOOGLE);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  /**
   * Sign in with Outlook
   */
  public async signInWithOutlook(): Promise<User> {
    try {
      const result = await signInWithPopup(auth, outlookProvider);
      return await this.handleSocialAuthResult(result.user, AuthProvider.OUTLOOK);
    } catch (error) {
      console.error('Error signing in with Outlook:', error);
      throw error;
    }
  }

  /**
   * Sign in with LinkedIn
   */
  public async signInWithLinkedIn(): Promise<User> {
    try {
      const result = await signInWithPopup(auth, linkedinProvider);
      return await this.handleSocialAuthResult(result.user, AuthProvider.LINKEDIN);
    } catch (error) {
      console.error('Error signing in with LinkedIn:', error);
      throw error;
    }
  }

  /**
   * Sign in with email and password
   */
  public async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return await this.fetchUserProfile(result.user);
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
    }
  }

  /**
   * Register with email and password
   */
  public async registerWithEmail(email: string, password: string, displayName: string): Promise<User> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Send email verification
      await sendEmailVerification(result.user);
      
      // Create user profile with basic auth level
      const userProfile: Partial<User> = {
        uid: result.user.uid,
        email: result.user.email || email,
        displayName: displayName,
        userType: 'authenticated',
        authLevel: UserAuthLevel.DR_MATCH,
        authProvider: AuthProvider.EMAIL_PASSWORD,
        verifiedEmail: false,
        verifiedPaymentMethod: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save user profile to Firestore
      await setDoc(doc(db, 'users', result.user.uid), {
        ...userProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return this.fetchUserProfile(result.user);
    } catch (error) {
      console.error('Error registering with email:', error);
      throw error;
    }
  }

  /**
   * Sign out
   */
  public async signOut(): Promise<void> {
    try {
      await signOut(auth);
      this.currentUser = null;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  /**
   * Upgrade user to Dr. Grant Verified (Level 2)
   * Called after email verification is complete
   */
  public async upgradeToDrGrant(userId: string): Promise<User> {
    try {
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        userType: 'verified',
        authLevel: UserAuthLevel.DR_GRANT,
        verifiedEmail: true,
        updatedAt: serverTimestamp()
      });

      if (this.currentUser && this.currentUser.uid === userId) {
        this.currentUser = {
          ...this.currentUser,
          userType: 'verified',
          authLevel: UserAuthLevel.DR_GRANT,
          verifiedEmail: true,
          updatedAt: new Date()
        };
      }

      return this.currentUser as User;
    } catch (error) {
      console.error('Error upgrading to Dr. Grant:', error);
      throw error;
    }
  }

  /**
   * Add payment method and upgrade user to Payment Verified (Level 2.5)
   */
  public async addPaymentMethodAndUpgrade(userId: string, paymentMethodId: string): Promise<User> {
    try {
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        userType: 'paymentVerified',
        authLevel: UserAuthLevel.PAYMENT_VERIFIED,
        verifiedPaymentMethod: true,
        paymentMethodId: paymentMethodId,
        updatedAt: serverTimestamp()
      });

      if (this.currentUser && this.currentUser.uid === userId) {
        this.currentUser = {
          ...this.currentUser,
          userType: 'paymentVerified',
          authLevel: UserAuthLevel.PAYMENT_VERIFIED,
          verifiedPaymentMethod: true,
          updatedAt: new Date()
        };
      }

      return this.currentUser as User;
    } catch (error) {
      console.error('Error upgrading with payment method:', error);
      throw error;
    }
  }

  /**
   * Activate trial period (Level 2.75)
   */
  public async activateTrialPeriod(userId: string): Promise<User> {
    try {
      const userRef = doc(db, 'users', userId);
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 3); // 3-day trial
      
      await updateDoc(userRef, {
        userType: 'trialPeriod',
        authLevel: UserAuthLevel.TRIAL_PERIOD,
        trialStartDate: serverTimestamp(),
        trialEndDate: trialEndDate,
        dreamCommanderInStasis: true,
        updatedAt: serverTimestamp()
      });

      if (this.currentUser && this.currentUser.uid === userId) {
        this.currentUser = {
          ...this.currentUser,
          userType: 'trialPeriod',
          authLevel: UserAuthLevel.TRIAL_PERIOD,
          updatedAt: new Date()
        };
      }

      return this.currentUser as User;
    } catch (error) {
      console.error('Error activating trial period:', error);
      throw error;
    }
  }

  /**
   * Upgrade to fully registered user (Level 3)
   */
  public async upgradeToFullyRegistered(userId: string, culturalEmpathyCode: string): Promise<User> {
    try {
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        userType: 'fullyRegistered',
        authLevel: UserAuthLevel.FULLY_REGISTERED,
        culturalEmpathyCode: culturalEmpathyCode,
        dreamCommanderInStasis: false, // Release from stasis
        updatedAt: serverTimestamp()
      });

      if (this.currentUser && this.currentUser.uid === userId) {
        this.currentUser = {
          ...this.currentUser,
          userType: 'fullyRegistered',
          authLevel: UserAuthLevel.FULLY_REGISTERED,
          culturalEmpathyCode: culturalEmpathyCode,
          updatedAt: new Date()
        };
      }

      return this.currentUser as User;
    } catch (error) {
      console.error('Error upgrading to fully registered:', error);
      throw error;
    }
  }

  /**
   * Handle social authentication result
   */
  private async handleSocialAuthResult(firebaseUser: FirebaseUser, provider: AuthProvider): Promise<User> {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        // Update existing user
        await updateDoc(userRef, {
          authProvider: provider,
          updatedAt: serverTimestamp()
        });
        return this.fetchUserProfile(firebaseUser);
      } else {
        // Create new user profile
        const userProfile: Partial<User> = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
          userType: 'authenticated',
          authLevel: UserAuthLevel.DR_MATCH,
          authProvider: provider,
          verifiedEmail: firebaseUser.emailVerified,
          verifiedPaymentMethod: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // If email is verified, set level to DR_GRANT
        if (firebaseUser.emailVerified) {
          userProfile.userType = 'verified';
          userProfile.authLevel = UserAuthLevel.DR_GRANT;
        }

        // Save user profile to Firestore
        await setDoc(userRef, {
          ...userProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        return this.fetchUserProfile(firebaseUser);
      }
    } catch (error) {
      console.error('Error handling social auth result:', error);
      throw error;
    }
  }

  /**
   * Fetch user profile from Firestore
   */
  private async fetchUserProfile(firebaseUser: FirebaseUser): Promise<User> {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        this.currentUser = userData;
        return userData;
      } else {
        throw new Error('User profile not found');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Get user type object
   */
  public getUserType(userTypeId: string): UserType | null {
    return USER_TYPES[userTypeId] || null;
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
