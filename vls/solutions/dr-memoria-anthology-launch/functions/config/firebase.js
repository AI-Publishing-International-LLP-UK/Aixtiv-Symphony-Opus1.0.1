// Firebase configuration for Dr. Memoria Anthology System

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: 'dr-memoria-anthology.firebaseapp.com',
  projectId: 'dr-memoria-anthology',
  storageBucket: 'dr-memoria-anthology.appspot.com',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// Function to set up Firebase configuration
function setupFirebaseConfig() {
  // Set Firebase configuration environment variables
  firebase.initializeApp(firebaseConfig);

  // Configure Firebase services
  const auth = firebase.auth();
  const firestore = firebase.firestore();
  const functions = firebase.functions();

  // Optional: Enable Firestore persistence
  firestore.enablePersistence().catch(err => {
    console.error('Firestore persistence error:', err);
  });

  return {
    auth,
    firestore,
    functions,
  };
}

module.exports = {
  firebaseConfig,
  setupFirebaseConfig,
};
