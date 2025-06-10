import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  User
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  EmailAuthProvider,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  User,
  UserType,
  AuthProvider,
  UserAuthLevel,
  USER_TYPES,
} from './user-auth-types';

// Your Firebase configuration
const firebaseConfig = {
  // Add your firebase config here
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
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
  static instance;
  currentUser= null;

  constructor() {
    // Private constructor to enforce singleton
    onAuthStateChanged(auth, user => {
      if (user) {
        this.fetchUserProfile(user);
      } else {
        this.currentUser = null;
      }
    });
  }

  static getInstance(){
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(){
    return this.currentUser;
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(){
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return await this.handleSocialAuthResult(
        result.user,
        AuthProvider.GOOGLE
      );
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  /**
   * Sign in with Outlook
   */
  async signInWithOutlook(){
    try {
      const result = await signInWithPopup(auth, outlookProvider);
      return await this.handleSocialAuthResult(
        result.user,
        AuthProvider.OUTLOOK
      );
    } catch (error) {
      console.error('Error signing in with Outlook:', error);
      throw error;
    }
  }

  /**
   * Sign in with LinkedIn
   */
  async signInWithLinkedIn(){
    try {
      const result = await signInWithPopup(auth, linkedinProvider);
      return await this.handleSocialAuthResult(
        result.user,
        AuthProvider.LINKEDIN
      );
    } catch (error) {
      console.error('Error signing in with LinkedIn:', error);
      throw error;
    }
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email, password){
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
  async registerWithEmail(
    email,
    password,
    displayName){
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Send email verification
      await sendEmailVerification(result.user);

      // Create user profile with basic auth level
      const userProfile= {
        uid,
        email,
        displayName,
        userType: 'authenticated',
        authLevel,
        authProvider,
        verifiedEmail,
        verifiedPaymentMethod,
        createdAt,
        updatedAt,
      };

      // Save user profile to Firestore
      await setDoc(doc(db, 'users', result.user.uid), {
        ...userProfile,
        createdAt,
        updatedAt,
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
  async signOut(){
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
  async upgradeToDrGrant(userId){
    try {
      const userRef = doc(db, 'users', userId);

      await updateDoc(userRef, {
        userType: 'verified',
        authLevel,
        verifiedEmail,
        updatedAt,
      });

      if (this.currentUser && this.currentUser.uid === userId) {
        this.currentUser = {
          ...this.currentUser,
          userType: 'verified',
          authLevel,
          verifiedEmail,
          updatedAt,
        };
      }

      return this.currentUser;
    } catch (error) {
      console.error('Error upgrading to Dr. Grant:', error);
      throw error;
    }
  }

  /**
   * Add payment method and upgrade user to Payment Verified (Level 2.5)
   */
  async addPaymentMethodAndUpgrade(
    userId,
    paymentMethodId){
    try {
      const userRef = doc(db, 'users', userId);

      await updateDoc(userRef, {
        userType: 'paymentVerified',
        authLevel,
        verifiedPaymentMethod,
        paymentMethodId,
        updatedAt,
      });

      if (this.currentUser && this.currentUser.uid === userId) {
        this.currentUser = {
          ...this.currentUser,
          userType: 'paymentVerified',
          authLevel,
          verifiedPaymentMethod,
          updatedAt,
        };
      }

      return this.currentUser;
    } catch (error) {
      console.error('Error upgrading with payment method:', error);
      throw error;
    }
  }

  /**
   * Activate trial period (Level 2.75)
   */
  async activateTrialPeriod(userId){
    try {
      const userRef = doc(db, 'users', userId);
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 3); // 3-day trial

      await updateDoc(userRef, {
        userType: 'trialPeriod',
        authLevel,
        trialStartDate,
        trialEndDate,
        dreamCommanderInStasis,
        updatedAt,
      });

      if (this.currentUser && this.currentUser.uid === userId) {
        this.currentUser = {
          ...this.currentUser,
          userType: 'trialPeriod',
          authLevel,
          updatedAt,
        };
      }

      return this.currentUser;
    } catch (error) {
      console.error('Error activating trial period:', error);
      throw error;
    }
  }

  /**
   * Upgrade to fully registered user (Level 3)
   */
  async upgradeToFullyRegistered(
    userId,
    culturalEmpathyCode){
    try {
      const userRef = doc(db, 'users', userId);

      await updateDoc(userRef, {
        userType: 'fullyRegistered',
        authLevel,
        culturalEmpathyCode,
        dreamCommanderInStasis, // Release from stasis
        updatedAt,
      });

      if (this.currentUser && this.currentUser.uid === userId) {
        this.currentUser = {
          ...this.currentUser,
          userType: 'fullyRegistered',
          authLevel,
          culturalEmpathyCode,
          updatedAt,
        };
      }

      return this.currentUser;
    } catch (error) {
      console.error('Error upgrading to fully registered:', error);
      throw error;
    }
  }

  /**
   * Handle social authentication result
   */
  async handleSocialAuthResult(
    firebaseUser,
    provider){
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        // Update existing user
        await updateDoc(userRef, {
          authProvider,
          updatedAt,
        });
        return this.fetchUserProfile(firebaseUser);
      } else {
        // Create new user profile
        const userProfile= {
          uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
          userType: 'authenticated',
          authLevel,
          authProvider,
          verifiedEmail,
          verifiedPaymentMethod,
          createdAt,
          updatedAt,
        };

        // If email is verified, set level to DR_GRANT
        if (firebaseUser.emailVerified) {
          userProfile.userType = 'verified';
          userProfile.authLevel = UserAuthLevel.DR_GRANT;
        }

        // Save user profile to Firestore
        await setDoc(userRef, {
          ...userProfile,
          createdAt,
          updatedAt,
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
  async fetchUserProfile(firebaseUser){
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
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
  getUserType(userTypeId){
    return USER_TYPES[userTypeId] || null;
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
