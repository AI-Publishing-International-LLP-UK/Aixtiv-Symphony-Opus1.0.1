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
exports.useAuth = exports.AuthProvider = void 0;
const react_1 = require("react");
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const auth_service_1 = require("./auth-service");
const user_auth_types_1 = require("./user-auth-types");
// Create Auth Context
const AuthContext = (0, react_1.createContext)({} > ({
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
    signInWithGoogle), () => __awaiter(void 0, void 0, void 0, function* () { }), signInWithOutlook, () => __awaiter(void 0, void 0, void 0, function* () { }), signInWithLinkedIn, () => __awaiter(void 0, void 0, void 0, function* () { }), signInWithEmail, () => __awaiter(void 0, void 0, void 0, function* () { }), registerWithEmail, () => __awaiter(void 0, void 0, void 0, function* () { }), signOut, () => __awaiter(void 0, void 0, void 0, function* () { }), upgradeToDrGrant, () => __awaiter(void 0, void 0, void 0, function* () { }), addPaymentMethodAndUpgrade, () => __awaiter(void 0, void 0, void 0, function* () { }), activateTrialPeriod, () => __awaiter(void 0, void 0, void 0, function* () { }), upgradeToFullyRegistered, () => __awaiter(void 0, void 0, void 0, function* () { }), 
// Silent Auth default implementations
enableSilentAuth, () => __awaiter(void 0, void 0, void 0, function* () { }), updateBehavioralBiometrics, () => __awaiter(void 0, void 0, void 0, function* () { }), registerTrustedDevice, () => __awaiter(void 0, void 0, void 0, function* () { }), getSilentAuthProfile, () => __awaiter(void 0, void 0, void 0, function* () { return null; }), verifySilentAuthScore, () => __awaiter(void 0, void 0, void 0, function* () { return 0; }), 
// SallyPort default implementations
requestSallyPortAccess, () => __awaiter(void 0, void 0, void 0, function* () {
    return ({
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
    });
}), checkSallyPortStatus, () => __awaiter(void 0, void 0, void 0, function* () { return null; }), approveSallyPortRequest, () => __awaiter(void 0, void 0, void 0, function* () { }), rejectSallyPortRequest, () => __awaiter(void 0, void 0, void 0, function* () { }), getActiveSallyPortVerifications, () => __awaiter(void 0, void 0, void 0, function* () { return []; }));
;
// Auth Provider component
const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = (0, react_1.useState)({
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
    (0, react_1.useEffect)(() => {
        const auth = (0, auth_1.getAuth)();
        const db = (0, firestore_1.getFirestore)();
        const unsubscribe = (0, auth_1.onAuthStateChanged)(auth, (user) => __awaiter(void 0, void 0, void 0, function* () {
            if (user) {
                try {
                    // Fetch user data from Firestore
                    // Fetch user data from Firestore
                    const userDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const userType = user_auth_types_1.USER_TYPES[userData.userType];
                        // Check for Silent Auth profile if enabled
                        let silentAuthProfile;
                        let isSilentAuthEnabled = false;
                        let isSallyPortEnabled = false;
                        let authLevel = 'basic';
                        let continuousAuthScore = 0;
                        let activeSallyPortVerifications = [];
                        // Fetch silent auth profile if it exists
                        try {
                            const silentAuthDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'silentAuth', user.uid));
                            if (silentAuthDoc.exists()) {
                                silentAuthProfile = silentAuthDoc.data();
                                isSilentAuthEnabled = true;
                                continuousAuthScore = silentAuthProfile.authStrength;
                                authLevel = 'silent';
                            }
                        }
                        catch (error) {
                            console.error('Error fetching silent auth profile:', error);
                        }
                        // Fetch SallyPort verifications if they exist
                        try {
                            if (isSilentAuthEnabled) {
                                const sallyPortDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'sallyPort', user.uid));
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
                        }
                        catch (error) {
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
                }
                catch (error) {
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
            }
            else {
                setAuthState({
                    isAuthenticated: false,
                    user: null,
                });
            }
        }));
        return () => unsubscribe();
    }, []);
    // Sign in with Google
    const signInWithGoogle = () => __awaiter(void 0, void 0, void 0, function* () {
        setAuthState(Object.assign(Object.assign({}, authState), { isLoading: true, error: null }));
        try {
            const user = yield auth_service_1.authService.signInWithGoogle();
            const userType = user_auth_types_1.USER_TYPES[user.userType];
            setAuthState({
                isAuthenticated: true,
                user,
                userType,
                isLoading: false,
                error: null
            });
        }
        catch (error) {
            setAuthState(Object.assign(Object.assign({}, authState), { isLoading: false, error: error instanceof Error ? error.message : 'Error signing in with Google' }));
        }
    });
    // Sign in with Outlook
    const signInWithOutlook = () => __awaiter(void 0, void 0, void 0, function* () {
        setAuthState(Object.assign(Object.assign({}, authState), { isLoading: true, error: null }));
        try {
            const user = yield auth_service_1.authService.signInWithOutlook();
            const userType = user_auth_types_1.USER_TYPES[user.userType];
            setAuthState({
                isAuthenticated: true,
                user,
                userType,
                isLoading: false,
                error: null
            });
        }
        catch (error) {
            setAuthState(Object.assign(Object.assign({}, authState), { isLoading: false, error: error instanceof Error ? error.message : 'Error signing in with Outlook' }));
        }
    });
    // Sign in with LinkedIn
    const signInWithLinkedIn = () => __awaiter(void 0, void 0, void 0, function* () {
        setAuthState(Object.assign(Object.assign({}, authState), { isLoading: true, error: null }));
        try {
            const user = yield auth_service_1.authService.signInWithLinkedIn();
            const userType = user_auth_types_1.USER_TYPES[user.userType];
            setAuthState({
                isAuthenticated: true,
                user,
                userType,
                isLoading: false,
                error: null
            });
        }
        catch (error) {
            setAuthState(Object.assign(Object.assign({}, authState), { isLoading: false, error: error instanceof Error ? error.message : 'Error signing in with LinkedIn' }));
        }
    });
    // Sign in with email
    const signInWithEmail = (email, password) => __awaiter(void 0, void 0, void 0, function* () {
        setAuthState(Object.assign(Object.assign({}, authState), { isLoading: true, error: null }));
        try {
            const user = yield auth_service_1.authService.signInWithEmail(email, password);
            const userType = user_auth_types_1.USER_TYPES[user.userType];
            setAuthState({
                isAuthenticated: true,
                user,
                userType,
                isLoading: false,
                error: null
            });
        }
        catch (error) {
            setAuthState(Object.assign(Object.assign({}, authState), { isLoading: false, error: error instanceof Error ? error.message : 'Error signing in with email' }));
        }
    });
    // Register with email
    const registerWithEmail = (email, password, displayName) => __awaiter(void 0, void 0, void 0, function* () {
        setAuthState(Object.assign(Object.assign({}, authState), { isLoading: true, error: null }));
        try {
            const user = yield auth_service_1.authService.registerWithEmail(email, password, displayName);
            const userType = user_auth_types_1.USER_TYPES[user.userType];
            setAuthState({
                isAuthenticated: true,
                user,
                userType,
                isLoading: false,
                error: null
            });
        }
        catch (error) {
            setAuthState(Object.assign(Object.assign({}, authState), { isLoading: false, error: error instanceof Error ? error.message : 'Error registering with email' }));
        }
    });
    // Sign out
    const signOut = () => __awaiter(void 0, void 0, void 0, function* () {
        setAuthState(Object.assign(Object.assign({}, authState), { isLoading: true, error: null }));
        try {
            yield auth_service_1.authService.signOut();
            setAuthState({
                isAuthenticated: false,
                user: null,
                userType: null,
                isLoading: false,
                error: null
            });
        }
        catch (error) {
            setAuthState(Object.assign(Object.assign({}, authState), { isLoading: false, error: error instanceof Error ? error.message : 'Error signing out' }));
        }
    });
    // Upgrade to Dr. Grant
    const upgradeToDrGrant = (userId) => __awaiter(void 0, void 0, void 0, function* () {
        setAuthState(Object.assign(Object.assign({}, authState), { isLoading: true, error: null }));
        try {
            const user = yield auth_service_1.authService.upgradeToDrGrant(userId);
            const userType = user_auth_types_1.USER_TYPES[user.userType];
            setAuthState({
                isAuthenticated: true,
                user,
                userType,
                isLoading: false,
                error: null
            });
        }
        catch (error) {
            setAuthState(Object.assign(Object.assign({}, authState), { isLoading: false, error: error instanceof Error ? error.message : 'Error upgrading to Dr. Grant' }));
        }
    });
    // Add payment method and upgrade
    const addPaymentMethodAndUpgrade = (userId, paymentMethodId) => __awaiter(void 0, void 0, void 0, function* () {
        setAuthState(Object.assign(Object.assign({}, authState), { isLoading: true, error: null }));
        try {
            const user = yield auth_service_1.authService.addPaymentMethodAndUpgrade(userId, paymentMethodId);
            const userType = user_auth_types_1.USER_TYPES[user.userType];
            setAuthState({
                isAuthenticated: true,
                user,
                userType,
                isLoading: false,
                error: null
            });
        }
        catch (error) {
            setAuthState(Object.assign(Object.assign({}, authState), { isLoading: false, error: error instanceof Error ? error.message : 'Error adding payment method' }));
        }
    });
    // Activate trial period
    const activateTrialPeriod = (userId) => __awaiter(void 0, void 0, void 0, function* () {
        setAuthState(Object.assign(Object.assign({}, authState), { isLoading: true, error: null }));
        try {
            const user = yield auth_service_1.authService.activateTrialPeriod(userId);
            const userType = user_auth_types_1.USER_TYPES[user.userType];
            setAuthState({
                isAuthenticated: true,
                user,
                userType,
                isLoading: false,
                error: null
            });
        }
        catch (error) {
            setAuthState(Object.assign(Object.assign({}, authState), { isLoading: false, error: error instanceof Error ? error.message : 'Error activating trial period' }));
        }
    });
    // Upgrade to fully registered
    const upgradeToFullyRegistered = (userId, culturalEmpathyCode) => __awaiter(void 0, void 0, void 0, function* () {
        setAuthState(Object.assign(Object.assign({}, authState), { isLoading: true, error: null }));
        try {
            const user = yield auth_service_1.authService.upgradeToFullyRegistered(userId, culturalEmpathyCode);
            const userType = user_auth_types_1.USER_TYPES[user.userType];
            setAuthState({
                isAuthenticated: true,
                user,
                userType,
                isLoading: false,
                error: null
            });
        }
        catch (error) {
            setAuthState(Object.assign(Object.assign({}, authState), { isLoading: false, error: error instanceof Error ? error.message : 'Error upgrading to fully registered' }));
        }
    });
    return value = {};
    {
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
            upgradeToFullyRegistered;
    }
};
exports.AuthProvider = AuthProvider;
    >
        { children }
    < /AuthContext.Provider>;
;
;
// Hook for using auth context
const useAuth = () => {
    const context = (0, react_1.useContext)(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
exports.useAuth = useAuth;
