// Type exports
export type {
Service,
ServiceEvent,
ServiceType,
ServiceStatus,
OrchestrationConfig
} from './types/orchestra';

// Service implementation exports
export { OrchestraService } from './lib/OrchestraService';

// Firebase service exports
export {
firebaseApp,
firestore,
storage,
auth,
initializeFirebase
} from './services/firebase';

// Version export
export const VERSION = '1.0.0';
