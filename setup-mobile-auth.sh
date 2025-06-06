#!/bin/bash

# Setup iOS and Android app authentication for api-for-warp-drive project
# This script configures Firebase Authentication for mobile apps

echo "🔧 Setting up iOS and Android Authentication for ASOOS/AIXTIV..."
echo ""

# Set the Firebase project
export PROJECT_ID="api-for-warp-drive"
echo "📱 Project: $PROJECT_ID"
echo ""

# Verify we're using the correct project
firebase use $PROJECT_ID

echo "📋 Current app configurations:"
echo "   • iOS Bundle ID: com.Coaching2100.Aixtiv-Symphony-Orchestrating-Operating-System"
echo "   • Android Package: com.Coaching2100.Aixtiv_Symphony_Orchestrating_Operating_System"
echo "   • iOS App ID: 1:859242575175:ios:1f989322c66dda4a514862"
echo "   • Android App ID: 1:859242575175:android:0bc8b1d5acd16430514862"
echo ""

# Create mobile-specific directories
echo "📁 Creating mobile configuration directories..."
mkdir -p mobile-config/ios
mkdir -p mobile-config/android
mkdir -p mobile-config/auth
mkdir -p mobile-config/docs

# Download latest configuration files
echo "⬇️ Downloading Firebase configuration files..."
firebase apps:sdkconfig ios 1:859242575175:ios:1f989322c66dda4a514862 > mobile-config/ios/GoogleService-Info.plist
firebase apps:sdkconfig android 1:859242575175:android:0bc8b1d5acd16430514862 > mobile-config/android/google-services.json

echo "✅ Configuration files downloaded:"
echo "   • iOS: mobile-config/ios/GoogleService-Info.plist"
echo "   • Android: mobile-config/android/google-services.json"
echo ""

# Create authentication configuration
echo "🔐 Creating mobile authentication configuration..."

cat > mobile-config/auth/firebase-auth-config.json << 'EOF'
{
  "authConfig": {
    "projectId": "api-for-warp-drive",
    "region": "us-west1",
    "enabledProviders": [
      "email",
      "google",
      "apple",
      "phone"
    ],
    "customClaims": {
      "roles": ["user", "professional", "admin"],
      "clearanceLevel": ["basic", "professional", "sa-internal", "diamond-sao"],
      "organizations": ["coaching2100", "aixtiv", "asoos"]
    },
    "securityRules": {
      "requireEmailVerification": true,
      "enforceMultiFactorAuth": false,
      "allowAnonymousAuth": false,
      "sessionTimeout": "24h"
    }
  },
  "mobileSpecific": {
    "ios": {
      "bundleId": "com.Coaching2100.Aixtiv-Symphony-Orchestrating-Operating-System",
      "appStoreId": "TODO_ADD_WHEN_PUBLISHED",
      "universalLinks": [
        "https://asoos.2100.cool/auth/callback",
        "https://aixtiv.com/auth/callback"
      ]
    },
    "android": {
      "packageName": "com.Coaching2100.Aixtiv_Symphony_Orchestrating_Operating_System",
      "sha256Fingerprints": [
        "TODO_ADD_RELEASE_FINGERPRINT",
        "TODO_ADD_DEBUG_FINGERPRINT"
      ],
      "deepLinks": [
        "https://asoos.2100.cool/auth/callback",
        "https://aixtiv.com/auth/callback"
      ]
    }
  }
}
EOF

# Create Cloud Function for mobile authentication
echo "☁️ Creating mobile authentication Cloud Function..."

cat > functions/mobileAuth.js << 'EOF'
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

if (!admin.apps.length) {
  initializeApp();
}

const auth = getAuth();
const db = getFirestore();

// Mobile registration function
exports.registerMobileUser = onCall({
  region: 'us-west1',
  cors: true
}, async (request) => {
  try {
    const { email, password, displayName, phoneNumber, organizationCode } = request.data;
    const { platform, appVersion, deviceId } = request.data.deviceInfo || {};
    
    // Validate required fields
    if (!email || !password || !displayName) {
      throw new HttpsError('invalid-argument', 'Missing required registration fields');
    }
    
    // Create user account
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      phoneNumber,
      emailVerified: false
    });
    
    // Set custom claims based on organization
    const customClaims = {
      role: 'user',
      clearanceLevel: 'basic',
      platform: platform || 'unknown',
      registeredAt: new Date().toISOString()
    };
    
    // Add organization-specific claims
    if (organizationCode) {
      switch (organizationCode.toLowerCase()) {
        case 'coaching2100':
          customClaims.organization = 'coaching2100';
          customClaims.clearanceLevel = 'professional';
          break;
        case 'aixtiv':
          customClaims.organization = 'aixtiv';
          break;
        case 'asoos':
          customClaims.organization = 'asoos';
          break;
      }
    }
    
    await auth.setCustomUserClaims(userRecord.uid, customClaims);
    
    // Store mobile device info
    await db.collection('mobile-users').doc(userRecord.uid).set({
      email,
      displayName,
      platform,
      appVersion,
      deviceId,
      organizationCode: organizationCode || null,
      registeredAt: new Date(),
      lastLoginAt: null,
      isActive: true
    });
    
    // Send email verification
    const emailVerificationLink = await auth.generateEmailVerificationLink(email);
    
    return {
      success: true,
      uid: userRecord.uid,
      emailVerificationRequired: true,
      message: 'User registered successfully. Please verify your email address.'
    };
    
  } catch (error) {
    console.error('Mobile registration error:', error);
    throw new HttpsError('internal', error.message || 'Registration failed');
  }
});

// Mobile login function
exports.loginMobileUser = onCall({
  region: 'us-west1',
  cors: true
}, async (request) => {
  try {
    const { idToken, deviceInfo } = request.data;
    
    if (!idToken) {
      throw new HttpsError('unauthenticated', 'ID token required');
    }
    
    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    // Update last login and device info
    await db.collection('mobile-users').doc(uid).update({
      lastLoginAt: new Date(),
      platform: deviceInfo?.platform || 'unknown',
      appVersion: deviceInfo?.appVersion || 'unknown',
      deviceId: deviceInfo?.deviceId || null
    });
    
    // Get user profile
    const userDoc = await db.collection('mobile-users').doc(uid).get();
    const userProfile = userDoc.data();
    
    return {
      success: true,
      user: {
        uid,
        email: decodedToken.email,
        displayName: userProfile?.displayName,
        organization: decodedToken.organization || null,
        clearanceLevel: decodedToken.clearanceLevel || 'basic',
        isActive: userProfile?.isActive || false
      }
    };
    
  } catch (error) {
    console.error('Mobile login error:', error);
    throw new HttpsError('unauthenticated', error.message || 'Login failed');
  }
});

// Get user profile function
exports.getMobileUserProfile = onCall({
  region: 'us-west1',
  cors: true
}, async (request) => {
  try {
    const { idToken } = request.data;
    
    if (!idToken) {
      throw new HttpsError('unauthenticated', 'ID token required');
    }
    
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    const userDoc = await db.collection('mobile-users').doc(uid).get();
    
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User profile not found');
    }
    
    const profile = userDoc.data();
    
    return {
      success: true,
      profile: {
        uid,
        email: decodedToken.email,
        displayName: profile.displayName,
        organization: decodedToken.organization || null,
        clearanceLevel: decodedToken.clearanceLevel || 'basic',
        platform: profile.platform,
        appVersion: profile.appVersion,
        registeredAt: profile.registeredAt,
        lastLoginAt: profile.lastLoginAt,
        isActive: profile.isActive
      }
    };
    
  } catch (error) {
    console.error('Get profile error:', error);
    throw new HttpsError('internal', error.message || 'Failed to get user profile');
  }
});
EOF

# Add mobile auth functions to main functions index
echo "📝 Adding mobile auth functions to index.js..."
if ! grep -q "mobileAuth" functions/index.js; then
  echo "" >> functions/index.js
  echo "// Mobile Authentication Functions" >> functions/index.js
  echo "const { registerMobileUser, loginMobileUser, getMobileUserProfile } = require('./mobileAuth');" >> functions/index.js
  echo "exports.registerMobileUser = registerMobileUser;" >> functions/index.js
  echo "exports.loginMobileUser = loginMobileUser;" >> functions/index.js
  echo "exports.getMobileUserProfile = getMobileUserProfile;" >> functions/index.js
fi

# Create Firestore security rules for mobile users
echo "🔒 Creating Firestore security rules for mobile users..."

cat > mobile-config/auth/firestore-mobile-rules.txt << 'EOF'
// Add these rules to your firestore.rules file

// Mobile users collection
match /mobile-users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  allow read: if request.auth != null && 
    (request.auth.token.role == 'admin' || 
     request.auth.token.clearanceLevel in ['sa-internal', 'diamond-sao']);
}

// Mobile sessions collection
match /mobile-sessions/{sessionId} {
  allow read, write: if request.auth != null && 
    resource.data.userId == request.auth.uid;
  allow create: if request.auth != null;
}

// Mobile app data collection
match /mobile-app-data/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
EOF

# Create mobile SDK setup instructions
echo "📖 Creating mobile SDK setup instructions..."

cat > mobile-config/docs/iOS-Setup.md << 'EOF'
# iOS Firebase Setup Instructions

## Prerequisites
- Xcode 14.0 or later
- iOS 13.0 or later
- CocoaPods or Swift Package Manager

## Installation

### Using CocoaPods
1. Add to your `Podfile`:
```ruby
pod 'Firebase/Auth'
pod 'Firebase/Firestore'
pod 'Firebase/Functions'
pod 'Firebase/Messaging'
```

2. Run `pod install`

### Using Swift Package Manager
1. Add Firebase iOS SDK: `https://github.com/firebase/firebase-ios-sdk`
2. Select: FirebaseAuth, FirebaseFirestore, FirebaseFunctions, FirebaseMessaging

## Configuration

1. Copy `GoogleService-Info.plist` to your Xcode project root
2. Ensure it's added to your app target
3. Initialize Firebase in `AppDelegate.swift`:

```swift
import Firebase
import FirebaseAuth

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, 
                   didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FirebaseApp.configure()
        return true
    }
}
```

## Authentication Implementation

```swift
import FirebaseAuth
import FirebaseFunctions

class AuthManager {
    private let auth = Auth.auth()
    private let functions = Functions.functions(region: "us-west1")
    
    func registerUser(email: String, password: String, displayName: String, 
                     organizationCode: String? = nil) async throws {
        let registerFunction = functions.httpsCallable("registerMobileUser")
        
        let deviceInfo = [
            "platform": "iOS",
            "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown",
            "deviceId": UIDevice.current.identifierForVendor?.uuidString
        ]
        
        let data = [
            "email": email,
            "password": password,
            "displayName": displayName,
            "organizationCode": organizationCode ?? "",
            "deviceInfo": deviceInfo
        ]
        
        let result = try await registerFunction.call(data)
        print("Registration result:", result.data)
    }
    
    func signIn(email: String, password: String) async throws {
        let result = try await auth.signIn(withEmail: email, password: password)
        
        // Get ID token and call login function
        if let idToken = try await result.user.getIDToken() {
            let loginFunction = functions.httpsCallable("loginMobileUser")
            
            let deviceInfo = [
                "platform": "iOS",
                "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown",
                "deviceId": UIDevice.current.identifierForVendor?.uuidString
            ]
            
            let data = [
                "idToken": idToken,
                "deviceInfo": deviceInfo
            ]
            
            let loginResult = try await loginFunction.call(data)
            print("Login result:", loginResult.data)
        }
    }
}
```

## Bundle ID Configuration
- Bundle ID: `com.Coaching2100.Aixtiv-Symphony-Orchestrating-Operating-System`
- URL Schemes: Add `com.googleusercontent.apps.859242575175-oebmfa3cuii8r0ch8d13euajbhmhvqv7` to Info.plist

## Deep Links Setup
Add to Info.plist:
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>asoos-auth</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>https</string>
        </array>
    </dict>
</array>
```
EOF

cat > mobile-config/docs/Android-Setup.md << 'EOF'
# Android Firebase Setup Instructions

## Prerequisites
- Android Studio Arctic Fox or later
- Android API level 19 (Android 4.4) or later
- Gradle 4.1 or later

## Installation

1. Add to project-level `build.gradle`:
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

2. Add to app-level `build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation 'com.google.firebase:firebase-auth:22.1.1'
    implementation 'com.google.firebase:firebase-firestore:24.7.1'
    implementation 'com.google.firebase:firebase-functions:20.3.1'
    implementation 'com.google.firebase:firebase-messaging:23.2.1'
}
```

## Configuration

1. Copy `google-services.json` to `app/` directory
2. Initialize Firebase in `Application` class:

```kotlin
import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.functions.FirebaseFunctions

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
    }
}
```

## Authentication Implementation

```kotlin
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.functions.FirebaseFunctions
import kotlinx.coroutines.tasks.await

class AuthManager {
    private val auth = FirebaseAuth.getInstance()
    private val functions = FirebaseFunctions.getInstance("us-west1")
    
    suspend fun registerUser(
        email: String, 
        password: String, 
        displayName: String,
        organizationCode: String? = null
    ) {
        val registerFunction = functions.getHttpsCallable("registerMobileUser")
        
        val deviceInfo = mapOf(
            "platform" to "Android",
            "appVersion" to BuildConfig.VERSION_NAME,
            "deviceId" to android.provider.Settings.Secure.getString(
                context.contentResolver,
                android.provider.Settings.Secure.ANDROID_ID
            )
        )
        
        val data = mapOf(
            "email" to email,
            "password" to password,
            "displayName" to displayName,
            "organizationCode" to (organizationCode ?: ""),
            "deviceInfo" to deviceInfo
        )
        
        val result = registerFunction.call(data).await()
        println("Registration result: ${result.data}")
    }
    
    suspend fun signIn(email: String, password: String) {
        val result = auth.signInWithEmailAndPassword(email, password).await()
        
        // Get ID token and call login function
        result.user?.getIdToken(true)?.await()?.let { tokenResult ->
            val loginFunction = functions.getHttpsCallable("loginMobileUser")
            
            val deviceInfo = mapOf(
                "platform" to "Android",
                "appVersion" to BuildConfig.VERSION_NAME,
                "deviceId" to android.provider.Settings.Secure.getString(
                    context.contentResolver,
                    android.provider.Settings.Secure.ANDROID_ID
                )
            )
            
            val data = mapOf(
                "idToken" to tokenResult.token,
                "deviceInfo" to deviceInfo
            )
            
            val loginResult = loginFunction.call(data).await()
            println("Login result: ${loginResult.data}")
        }
    }
}
```

## Package Name Configuration
- Package: `com.Coaching2100.Aixtiv_Symphony_Orchestrating_Operating_System`

## Deep Links Setup
Add to `AndroidManifest.xml`:
```xml
<activity android:name=".AuthCallbackActivity">
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https"
              android:host="asoos.2100.cool"
              android:pathPrefix="/auth/callback" />
    </intent-filter>
</activity>
```

## SHA-256 Fingerprints
Generate and add your SHA-256 fingerprints:
```bash
# Debug
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Release
keytool -list -v -keystore path/to/release.keystore -alias your_key_alias
```
EOF

echo "✅ Mobile authentication setup completed!"
echo ""
echo "📋 Summary:"
echo "   • Configuration files downloaded to mobile-config/"
echo "   • iOS setup: mobile-config/ios/GoogleService-Info.plist"
echo "   • Android setup: mobile-config/android/google-services.json"
echo "   • Auth functions created: functions/mobileAuth.js"
echo "   • Setup guides: mobile-config/docs/"
echo ""
echo "🚀 Next steps:"
echo "   1. Deploy functions: firebase deploy --only functions"
echo "   2. Update Firestore rules with mobile-config/auth/firestore-mobile-rules.txt"
echo "   3. Configure authentication providers in Firebase Console"
echo "   4. Add SHA-256 fingerprints for Android release builds"
echo "   5. Set up deep link verification for iOS and Android"
echo ""
echo "📱 App Configuration:"
echo "   • iOS Bundle: com.Coaching2100.Aixtiv-Symphony-Orchestrating-Operating-System"
echo "   • Android Package: com.Coaching2100.Aixtiv_Symphony_Orchestrating_Operating_System"
echo "   • Project: api-for-warp-drive (859242575175)"
echo ""
echo "🔗 Authentication URLs:"
echo "   • iOS Callback: https://asoos.2100.cool/auth/callback"
echo "   • Android Callback: https://asoos.2100.cool/auth/callback"
echo "   • Web Console: https://console.firebase.google.com/project/api-for-warp-drive/authentication"

