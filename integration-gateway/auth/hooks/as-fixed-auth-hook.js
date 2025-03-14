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
// Create Auth Context with a complete set of methods
const AuthContext = (0, react_1.createContext)({
    authState: {
        isAuthenticated: false,
        user: null,
        userType: null,
        isLoading: true,
        error: null
    },
    signInWithGoogle: () => __awaiter(void 0, void 0, void 0, function* () { }),
    signInWithOutlook: () => __awaiter(void 0, void 0, void 0, function* () { }),
    signInWithLinkedIn: () => __awaiter(void 0, void 0, void 0, function* () { }),
    signInWithEmail: () => __awaiter(void 0, void 0, void 0, function* () { }),
    registerWithEmail: () => __awaiter(void 0, void 0, void 0, function* () { }),
    signOut: () => __awaiter(void 0, void 0, void 0, function* () { }),
    upgradeToDrGrant: () => __awaiter(void 0, void 0, void 0, function* () { }),
    addPaymentMethodAndUpgrade: () => __awaiter(void 0, void 0, void 0, function* () { }),
    activateTrialPeriod: () => __awaiter(void 0, void 0, void 0, function* () { }),
    upgradeToFullyRegistered: () => __awaiter(void 0, void 0, void 0, function* () { }),
    silentAuthentication: () => __awaiter(void 0, void 0, void 0, function* () { }),
    useSallyPort: () => __awaiter(void 0, void 0, void 0, function* () { })
});
// Auth Provider component
const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = (0, react_1.useState)({
        isAuthenticated: false,
        user: null,
        userType: null,
        isLoading: true,
        error: null
    });
    (0, react_1.useEffect)(() => {
        const auth = (0, auth_1.getAuth)();
        const db = (0, firestore_1.getFirestore)();
        const unsubscribe = (0, auth_1.onAuthStateChanged)(auth, (user) => __awaiter(void 0, void 0, void 0, function* () {
            if (user) {
                try {
                    // Fetch user data from Firestore
                    const userDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const userType = user_auth_types_1.USER_TYPES[userData.userType];
                        setAuthState({
                            isAuthenticated: true,
                            user: userData,
                            userType,
                            isLoading: false,
                            error: null
                        });
                    }
                    else {
                        setAuthState({
                            isAuthenticated: false,
                            user: null,
                            userType: null,
                            isLoading: false,
                            error: 'User data not found'
                        });
                    }
                }
                catch (error) {
                    setAuthState({
                        isAuthenticated: false,
                        user: null,
                        userType: null,
                        isLoading: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            else {
                setAuthState({
                    isAuthenticated: false,
                    user: null,
                    userType: null,
                    isLoading: false,
                    error: null
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
    // Silent Authentication implementation
    const silentAuthentication = () => __awaiter(void 0, void 0, void 0, function* () {
        setAuthState(Object.assign(Object.assign({}, authState), { isLoading: true, error: null }));
        try {
            // Check local storage for refresh token
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                throw new Error('No refresh token found');
            }
            // Assuming authService has a silentAuth method
            const user = yield auth_service_1.authService.silentAuth(refreshToken);
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
            // Silent auth should fail gracefully
            console.warn('Silent authentication failed:', error);
            setAuthState(Object.assign(Object.assign({}, authState), { isLoading: false, 
                // Don't set error for silent auth failures
                error: null }));
        }
    });
    // SallyPort authentication implementation
    const useSallyPort = (token) => __awaiter(void 0, void 0, void 0, function* () {
        setAuthState(Object.assign(Object.assign({}, authState), { isLoading: true, error: null }));
        try {
            // Assuming authService has a sallyPortAuth method
            const user = yield auth_service_1.authService.sallyPortAuth(token);
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
            setAuthState(Object.assign(Object.assign({}, authState), { isLoading: false, error: error instanceof Error ? error.message : 'Error using SallyPort' }));
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
            upgradeToFullyRegistered,
            silentAuthentication,
            useSallyPort;
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
