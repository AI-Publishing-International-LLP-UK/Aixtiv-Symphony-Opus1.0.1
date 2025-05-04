# Firebase Setup and Deployment Instructions

## The Problem
The error you're seeing occurs because Firebase Admin is being accessed in `user-preferences.js` before it's properly initialized. This is a common issue with modular Firebase Functions projects.

## The Solution

### 1. Update your project structure

The key is to centralize Firebase initialization in your main `index.js` file, then import and re-export functions from your modules.

#### Step 1: Update your index.js
Replace or update your `functions/index.js` with:
```javascript
const admin = require('firebase-admin');
admin.initializeApp();

// Import all function modules AFTER initialization
const userPreferencesModule = require('./config/user-preferences');

// Export all functions
exports.getUserPreferences = userPreferencesModule.getUserPreferences;
exports.updateUserPreferences = userPreferencesModule.updateUserPreferences;
// Add other function exports here
```

#### Step 2: Update user-preferences.js
Replace your `functions/config/user-preferences.js` with:
```javascript
const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Do NOT initialize Firebase here - it's already initialized in index.js

// Rest of your function code...
```

### 2. Update Node.js version and dependencies

#### Step 1: Install Node.js 20
```bash
nvm install 20
nvm use 20
```

#### Step 2: Update package.json
In your `functions/package.json` file:
```json
"engines": {
  "node": "20"
}
```

#### Step 3: Update dependencies
```bash
cd functions
npm install --save firebase-functions@latest firebase-admin@latest
```

### 3. Deploy your project
```bash
firebase deploy
```

## Important Notes
1. The order of operations is critical - Firebase must be initialized before any module tries to use Firebase services
2. You can only have one `initializeApp()` call in your project
3. All function exports should be done through your main index.js file

This structure ensures consistent initialization across your entire Firebase Functions project.
