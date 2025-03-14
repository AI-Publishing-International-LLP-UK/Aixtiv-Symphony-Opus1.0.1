"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const app_1 = require("firebase/app");
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const user_auth_types_1 = require("./user-auth-types");
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
const app = (0, app_1.initializeApp)(firebaseConfig);
const auth = (0, auth_1.getAuth)(app);
const db = (0, firestore_1.getFirestore)(app);
// Authentication providers
const googleProvider = new auth_1.GoogleAuthProvider();
const outlookProvider = new auth_1.OAuthProvider('microsoft.com');
const linkedinProvider = new auth_1.OAuthProvider('linkedin.com');
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
class AuthService {
    constructor() {
        this.currentUser = null;
        // Private constructor to enforce singleton
        (0, auth_1.onAuthStateChanged)(auth, (user) => {
            if (user) {
                this.fetchUserProfile(user);
            }
            else {
                this.currentUser = null;
            }
        });
    }
    static getInstance() {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }
    /**
     * Get current authenticated user
     */
    getCurrentUser() {
        return this.currentUser;
    }
    /**
     * Sign in with Google
     */
    signInWithGoogle() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield (0, auth_1.signInWithPopup)(auth, googleProvider);
                return yield this.handleSocialAuthResult(result.user, user_auth_types_1.AuthProvider.GOOGLE);
            }
            catch (error) {
                console.error('Error signing in with Google:', error);
                throw error;
            }
        });
    }
    /**
     * Sign in with Outlook
     */
    signInWithOutlook() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield (0, auth_1.signInWithPopup)(auth, outlookProvider);
                return yield this.handleSocialAuthResult(result.user, user_auth_types_1.AuthProvider.OUTLOOK);
            }
            catch (error) {
                console.error('Error signing in with Outlook:', error);
                throw error;
            }
        });
    }
    /**
     * Sign in with LinkedIn
     */
    signInWithLinkedIn() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield (0, auth_1.signInWithPopup)(auth, linkedinProvider);
                return yield this.handleSocialAuthResult(result.user, user_auth_types_1.AuthProvider.LINKEDIN);
            }
            catch (error) {
                console.error('Error signing in with LinkedIn:', error);
                throw error;
            }
        });
    }
    /**
     * Sign in with email and password
     */
    signInWithEmail(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield (0, auth_1.signInWithEmailAndPassword)(auth, email, password);
                return yield this.fetchUserProfile(result.user);
            }
            catch (error) {
                console.error('Error signing in with email:', error);
                throw error;
            }
        });
    }
    /**
     * Register with email and password
     */
    registerWithEmail(email, password, displayName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield (0, auth_1.createUserWithEmailAndPassword)(auth, email, password);
                // Send email verification
                yield (0, auth_1.sendEmailVerification)(result.user);
                // Create user profile with basic auth level
                const userProfile = {
                    uid: result.user.uid,
                    email: result.user.email || email,
                    displayName: displayName,
                    userType: 'authenticated',
                    authLevel: user_auth_types_1.UserAuthLevel.DR_MATCH,
                    authProvider: user_auth_types_1.AuthProvider.EMAIL_PASSWORD,
                    verifiedEmail: false,
                    verifiedPaymentMethod: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                // Save user profile to Firestore
                yield (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'users', result.user.uid), Object.assign(Object.assign({}, userProfile), { createdAt: (0, firestore_1.serverTimestamp)(), updatedAt: (0, firestore_1.serverTimestamp)() }));
                return this.fetchUserProfile(result.user);
            }
            catch (error) {
                console.error('Error registering with email:', error);
                throw error;
            }
        });
    }
    /**
     * Sign out
     */
    signOut() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, auth_1.signOut)(auth);
                this.currentUser = null;
            }
            catch (error) {
                console.error('Error signing out:', error);
                throw error;
            }
        });
    }
    /**
     * Upgrade user to Dr. Grant Verified (Level 2)
     * Called after email verification is complete
     */
    upgradeToDrGrant(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userRef = (0, firestore_1.doc)(db, 'users', userId);
                yield (0, firestore_1.updateDoc)(userRef, {
                    userType: 'verified',
                    authLevel: user_auth_types_1.UserAuthLevel.DR_GRANT,
                    verifiedEmail: true,
                    updatedAt: (0, firestore_1.serverTimestamp)()
                });
                if (this.currentUser && this.currentUser.uid === userId) {
                    this.currentUser = Object.assign(Object.assign({}, this.currentUser), { userType: 'verified', authLevel: user_auth_types_1.UserAuthLevel.DR_GRANT, verifiedEmail: true, updatedAt: new Date() });
                }
                return this.currentUser;
            }
            catch (error) {
                console.error('Error upgrading to Dr. Grant:', error);
                throw error;
            }
        });
    }
    /**
     * Add payment method and upgrade user to Payment Verified (Level 2.5)
     */
    addPaymentMethodAndUpgrade(userId, paymentMethodId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userRef = (0, firestore_1.doc)(db, 'users', userId);
                yield (0, firestore_1.updateDoc)(userRef, {
                    userType: 'paymentVerified',
                    authLevel: user_auth_types_1.UserAuthLevel.PAYMENT_VERIFIED,
                    verifiedPaymentMethod: true,
                    paymentMethodId: paymentMethodId,
                    updatedAt: (0, firestore_1.serverTimestamp)()
                });
                if (this.currentUser && this.currentUser.uid === userId) {
                    this.currentUser = Object.assign(Object.assign({}, this.currentUser), { userType: 'paymentVerified', authLevel: user_auth_types_1.UserAuthLevel.PAYMENT_VERIFIED, verifiedPaymentMethod: true, updatedAt: new Date() });
                }
                return this.currentUser;
            }
            catch (error) {
                console.error('Error upgrading with payment method:', error);
                throw error;
            }
        });
    }
    /**
     * Activate trial period (Level 2.75)
     */
    activateTrialPeriod(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userRef = (0, firestore_1.doc)(db, 'users', userId);
                const trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + 3); // 3-day trial
                yield (0, firestore_1.updateDoc)(userRef, {
                    userType: 'trialPeriod',
                    authLevel: user_auth_types_1.UserAuthLevel.TRIAL_PERIOD,
                    trialStartDate: (0, firestore_1.serverTimestamp)(),
                    trialEndDate: trialEndDate,
                    dreamCommanderInStasis: true,
                    updatedAt: (0, firestore_1.serverTimestamp)()
                });
                if (this.currentUser && this.currentUser.uid === userId) {
                    this.currentUser = Object.assign(Object.assign({}, this.currentUser), { userType: 'trialPeriod', authLevel: user_auth_types_1.UserAuthLevel.TRIAL_PERIOD, updatedAt: new Date() });
                }
                return this.currentUser;
            }
            catch (error) {
                console.error('Error activating trial period:', error);
                throw error;
            }
        });
    }
    /**
     * Upgrade to fully registered user (Level 3)
     */
    upgradeToFullyRegistered(userId, culturalEmpathyCode) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userRef = (0, firestore_1.doc)(db, 'users', userId);
                yield (0, firestore_1.updateDoc)(userRef, {
                    userType: 'fullyRegistered',
                    authLevel: user_auth_types_1.UserAuthLevel.FULLY_REGISTERED,
                    culturalEmpathyCode: culturalEmpathyCode,
                    dreamCommanderInStasis: false, // Release from stasis
                    updatedAt: (0, firestore_1.serverTimestamp)()
                });
                if (this.currentUser && this.currentUser.uid === userId) {
                    this.currentUser = Object.assign(Object.assign({}, this.currentUser), { userType: 'fullyRegistered', authLevel: user_auth_types_1.UserAuthLevel.FULLY_REGISTERED, culturalEmpathyCode: culturalEmpathyCode, updatedAt: new Date() });
                }
                return this.currentUser;
            }
            catch (error) {
                console.error('Error upgrading to fully registered:', error);
                throw error;
            }
        });
    }
    /**
     * Handle social authentication result
     */
    handleSocialAuthResult(firebaseUser, provider) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userRef = (0, firestore_1.doc)(db, 'users', firebaseUser.uid);
                const userDoc = yield (0, firestore_1.getDoc)(userRef);
                if (userDoc.exists()) {
                    // Update existing user
                    yield (0, firestore_1.updateDoc)(userRef, {
                        authProvider: provider,
                        updatedAt: (0, firestore_1.serverTimestamp)()
                    });
                    return this.fetchUserProfile(firebaseUser);
                }
                else {
                    // Create new user profile
                    const userProfile = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        displayName: firebaseUser.displayName || '',
                        photoURL: firebaseUser.photoURL || '',
                        userType: 'authenticated',
                        authLevel: user_auth_types_1.UserAuthLevel.DR_MATCH,
                        authProvider: provider,
                        verifiedEmail: firebaseUser.emailVerified,
                        verifiedPaymentMethod: false,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    // If email is verified, set level to DR_GRANT
                    if (firebaseUser.emailVerified) {
                        userProfile.userType = 'verified';
                        userProfile.authLevel = user_auth_types_1.UserAuthLevel.DR_GRANT;
                    }
                    // Save user profile to Firestore
                    yield (0, firestore_1.setDoc)(userRef, Object.assign(Object.assign({}, userProfile), { createdAt: (0, firestore_1.serverTimestamp)(), updatedAt: (0, firestore_1.serverTimestamp)() }));
                    return this.fetchUserProfile(firebaseUser);
                }
            }
            catch (error) {
                console.error('Error handling social auth result:', error);
                throw error;
            }
        });
    }
    /**
     * Fetch user profile from Firestore
     */
    fetchUserProfile(firebaseUser) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userRef = (0, firestore_1.doc)(db, 'users', firebaseUser.uid);
                const userDoc = yield (0, firestore_1.getDoc)(userRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    this.currentUser = userData;
                    return userData;
                }
                else {
                    throw new Error('User profile not found');
                }
            }
            catch (error) {
                console.error('Error fetching user profile:', error);
                throw error;
            }
        });
    }
    /**
     * Get user type object
     */
    getUserType(userTypeId) {
        return user_auth_types_1.USER_TYPES[userTypeId] || null;
    }
}
exports.AuthService = AuthService;
// Export singleton instance
exports.authService = AuthService.getInstance();
