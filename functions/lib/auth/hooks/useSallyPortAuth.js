"use strict";
/**
 * SallyPort Authentication Hook
 * Provides easy access to SallyPort authentication functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSallyPortAuth = void 0;
const react_1 = require("react");
const SallyPortAuth_1 = require("../components/SallyPortAuth");
/**
 * Custom hook for SallyPort authentication
 * Provides functions for login, logout, and session verification
 */
const useSallyPortAuth = (options = {}) => {
    const { autoVerify = false, verifyInterval = 5 * 60 * 1000, // 5 minutes
    onVerified, } = options;
    const auth = (0, react_1.useContext)(SallyPortAuth_1.AuthContext);
    // Handle session verification
    const verifySession = (0, react_1.useCallback)(async () => {
        if (!auth.user) {
            return false;
        }
        const isValid = await auth.verifySession();
        if (onVerified) {
            onVerified(isValid);
        }
        return isValid;
    }, [auth, onVerified]);
    // Set up automatic verification
    (0, react_1.useEffect)(() => {
        if (!autoVerify || !auth.user) {
            return () => { };
        }
        // Verify immediately on mount
        verifySession();
        // Set up interval for periodic verification
        const intervalId = setInterval(verifySession, verifyInterval);
        // Clean up interval on unmount
        return () => clearInterval(intervalId);
    }, [autoVerify, auth.user, verifyInterval, verifySession]);
    // Return auth context and additional functionality
    return Object.assign(Object.assign({}, auth), { verifySession });
};
exports.useSallyPortAuth = useSallyPortAuth;
exports.default = exports.useSallyPortAuth;
//# sourceMappingURL=useSallyPortAuth.js.map