import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase configuration
// NOTE: These values should be replaced with environment variables in production
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Authentication service
export const authService = {
  // Current user
  currentUser: () => auth.currentUser,
  
  // Sign in with email and password
  signIn: (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  },
  
  // Sign up with email and password
  signUp: (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
  },
  
  // Sign out
  signOut: () => {
    return signOut(auth);
  },
  
  // Subscribe to auth state changes
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },
  
  // Update user profile
  updateProfile: (user: User, data: { displayName?: string; photoURL?: string }) => {
    return updateProfile(user, data);
  }
};

// Firestore service
export const firestoreService = {
  // Collections
  collections: {
    users: collection(db, 'users'),
    courses: collection(db, 'courses'),
    sessions: collection(db, 'sessions'),
    activities: collection(db, 'activities'),
    products: collection(db, 'products'),
    webinars: collection(db, 'webinars'),
    organizations: collection(db, 'organizations'),
    roles: collection(db, 'roles'),
    skills: collection(db, 'skills'),
    occupations: collection(db, 'occupations')
  },
  
  // Create document
  createDocument: <T extends Record<string, any>>(collectionName: string, id: string, data: T) => {
    return setDoc(doc(db, collectionName, id), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },
  
  // Get document by ID
  getDocument: async <T>(collectionName: string, id: string) => {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as T & { id: string } : null;
  },
  
  // Update document
  updateDocument: <T extends Record<string, any>>(collectionName: string, id: string, data: Partial<T>) => {
    return updateDoc(doc(db, collectionName, id), {
      ...data,
      updatedAt: serverTimestamp()
    });
  },
  
  // Delete document
  deleteDocument: (collectionName: string, id: string) => {
    return deleteDoc(doc(db, collectionName, id));
  },
  
  // Query documents
  queryDocuments: async <T>(
    collectionName: string, 
    conditions: { field: string; operator: '==' | '!=' | '>' | '>=' | '<' | '<='; value: any }[] = [],
    sortOptions: { field: string; direction: 'asc' | 'desc' }[] = [],
    limitCount?: number
  ) => {
    let q = collection(db, collectionName);
    let compositeQuery = query(q);
    
    // Apply where conditions
    if (conditions.length > 0) {
      conditions.forEach(condition => {
        compositeQuery = query(
          compositeQuery, 
          where(condition.field, condition.operator, condition.value)
        );
      });
    }
    
    // Apply sorting
    if (sortOptions.length > 0) {
      sortOptions.forEach(sort => {
        compositeQuery = query(
          compositeQuery, 
          orderBy(sort.field, sort.direction)
        );
      });
    }
    
    // Apply limit
    if (limitCount) {
      compositeQuery = query(compositeQuery, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(compositeQuery);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T & { id: string }));
  },
  
  // Server timestamp
  serverTimestamp: () => serverTimestamp(),
  
  // Timestamp
  timestamp: Timestamp
};

// Storage service
export const storageService = {
  // Upload file
  uploadFile: async (path: string, file: File): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  },
  
  // Get download URL
  getFileUrl: (path: string) => {
    const storageRef = ref(storage, path);
    return getDownloadURL(storageRef);
  }
};

// Export the Firebase instances
export { app, auth, db, storage };

// Default export for easier imports
export default {
  app,
  auth,
  db,
  storage,
  authService,
  firestoreService,
  storageService
};

