// Properly initialize Firebase Admin at the top of the file
const admin = require('firebase-admin');

// Check if Firebase is already initialized to avoid multiple initialization errors
if (!admin.apps.length) {
  admin.initializeApp();
}

// The rest of your user-preferences.js code would go here
// For example:
const functions = require('firebase-functions');

// User preferences functions
exports.getUserPreferences = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to access user preferences.'
    );
  }

  const uid = context.auth.uid;
  
  try {
    // Now you can safely use admin.firestore() because Firebase is properly initialized
    const userDoc = await admin.firestore().collection('userPreferences').doc(uid).get();
    
    if (!userDoc.exists) {
      // Return default preferences if document doesn't exist
      return { theme: 'light', notifications: true };
    }
    
    return userDoc.data();
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    throw new functions.https.HttpsError('internal', 'Failed to retrieve user preferences');
  }
});

exports.updateUserPreferences = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to update user preferences.'
    );
  }

  const uid = context.auth.uid;
  const { preferences } = data;
  
  if (!preferences || typeof preferences !== 'object') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'You must provide valid preferences to update.'
    );
  }
  
  try {
    // Now you can safely use admin.firestore() because Firebase is properly initialized
    await admin.firestore().collection('userPreferences').doc(uid).set(preferences, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update user preferences');
  }
});
