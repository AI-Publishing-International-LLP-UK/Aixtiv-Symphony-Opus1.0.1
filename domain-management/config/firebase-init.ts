// src/infrastructure/firebase/FirebaseInitializer.ts

import { initializeApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  connectFirestoreEmulator 
} from 'firebase/firestore';
import { 
  getAuth, 
  Auth, 
  connectAuthEmulator 
} from 'firebase/auth';
import { 
  getFunctions, 
  Functions, 
  connectFunctionsEmulator 
} from 'firebase/functions';
import { getStorage, Storage, connectStorageEmulator } from 'firebase/storage';

export interface FirebaseConfig extends FirebaseOptions {
  useEmulators?: boolean;
  emulatorHost?: string;
  emulatorPorts?: {
    auth?: number;
    firestore?: number;
    functions?: number;
    storage?: number;
  };
}

export interface FirebaseServices {
  app: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  functions: Functions;
  storage: Storage;
}

export class FirebaseInitializer {
  private static instance: FirebaseInitializer;
  private services: FirebaseServices | null = null;
  private config: FirebaseConfig;
  
  private constructor(config: FirebaseConfig) {
    this.config = {
      useEmulators: process.env.NODE_ENV === 'development',
      emulatorHost: 'localhost',
      emulatorPorts: {
        auth: 9099,
        firestore: 8080,
        functions: 5001,
        storage: 9199
      },
      ...config
    };
  }
  
  /**
   * Get singleton instance of FirebaseInitializer
   */
  public static getInstance(config?: FirebaseConfig): FirebaseInitializer {
    if (!FirebaseInitializer.instance) {
      FirebaseInitializer.instance = new FirebaseInitializer(config || {});
    }
    return FirebaseInitializer.instance;
  }
  
  /**
   * Initialize Firebase and return service instances
   */
  public initialize(): FirebaseServices {
    if (this.services) {
      return this.services;
    }
    
    // Initialize Firebase app
    const app = initializeApp(this.config);
    
    // Initialize Firestore
    const firestore = getFirestore(app);
    
    // Initialize Authentication
    const auth = getAuth(app);
    
    // Initialize Cloud Functions
    const functions = getFunctions(app);
    
    // Initialize Storage
    const storage = getStorage(app);
    
    // Set up emulators if configured
    if (this.config.useEmulators) {
      this.setupEmulators(firestore, auth, functions, storage);
    }
    
    this.services = { app, firestore, auth, functions, storage };
    return this.services;
  }
  
  /**
   * Get initialized services (throws if not initialized)
   */
  public getServices(): FirebaseServices {
    if (!this.services) {
      throw new Error('Firebase services not initialized. Call initialize() first.');
    }
    return this.services;
  }
  
  /**
   * Set up emulators for local development
   */
  private setupEmulators(
    firestore: Firestore, 
    auth: Auth, 
    functions: Functions, 
    storage: Storage
  ): void {
    const host = this.config.emulatorHost!;
    const ports = this.config.emulatorPorts!;
    
    // Connect Firestore emulator
    if (ports.firestore) {
      connectFirestoreEmulator(firestore, host, ports.firestore);
      console.log(`Connected to Firestore emulator at ${host}:${ports.firestore}`);
    }
    
    // Connect Auth emulator
    if (ports.auth) {
      connectAuthEmulator(auth, `http://${host}:${ports.auth}`);
      console.log(`Connected to Auth emulator at ${host}:${ports.auth}`);
    }
    
    // Connect Functions emulator
    if (ports.functions) {
      connectFunctionsEmulator(functions, host, ports.functions);
      console.log(`Connected to Functions emulator at ${host}:${ports.functions}`);
    }
    
    // Connect Storage emulator
    if (ports.storage) {
      connectStorageEmulator(storage, host, ports.storage);
      console.log(`Connected to Storage emulator at ${host}:${ports.storage}`);
    }
  }
  
  /**
   * Reset the singleton instance (for testing)
   */
  public static resetInstance(): void {
    FirebaseInitializer.instance = null as any;
  }
}

export default FirebaseInitializer;
