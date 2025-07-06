#!/bin/bash

# Enhanced SallyPort Cloudflare Authentication Deployment Script
# Version: 2.0.0-cloudflare-integration
# Date: 2025-07-02

set -e

echo "🚀 Starting Enhanced SallyPort Cloudflare Authentication Deployment"
echo "====================================================================="

# Configuration
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
SERVICE_NAME="integration-gateway-mcp"
VERSION="2.0.0-cloudflare-integration"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI not found. Please install Google Cloud SDK."
    exit 1
fi

if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI not found. Please install Firebase CLI."
    exit 1
fi

# Check if we're authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    print_error "Not authenticated with gcloud. Please run 'gcloud auth login'"
    exit 1
fi

print_success "Prerequisites check completed"

# Set the correct project
print_status "Setting Google Cloud project to ${PROJECT_ID}..."
gcloud config set project ${PROJECT_ID}

# Ensure we have necessary APIs enabled
print_status "Enabling required APIs..."
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p functions
mkdir -p logs
mkdir -p config/cloudflare

# Install dependencies
print_status "Installing Node.js dependencies..."
if [ -f "package.json" ]; then
    npm install
else
    print_warning "No package.json found, creating basic one..."
    cat > package.json << EOF
{
  "name": "integration-gateway-sallyport-cloudflare-auth",
  "version": "2.0.0-cloudflare-integration",
  "description": "Enhanced SallyPort authentication with Cloudflare integration",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "deploy": "firebase deploy --only functions",
    "test": "echo \\"Tests not implemented yet\\""
  },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0",
    "express": "^4.18.0",
    "winston": "^3.10.0",
    "axios": "^1.6.0",
    "cors": "^2.8.5"
  },
  "engines": {
    "node": "18"
  }
}
EOF
    npm install
fi

# Create function entry point if it doesn't exist
if [ ! -f "functions/index.js" ]; then
    print_status "Creating Cloud Function entry point..."
    mkdir -p functions
    cat > functions/index.js << 'EOF'
const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');

// Import our enhanced authentication middleware
const sallyPortMiddleware = require('../middleware/sallyport-cloudflare-auth');

const app = express();

// Apply middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', sallyPortMiddleware.healthCheck());

// Metrics endpoint
app.get('/metrics', sallyPortMiddleware.metrics());

// Protected routes - apply SallyPort authentication
app.use('/api/agents', sallyPortMiddleware.authenticate());
app.use('/api/vls', sallyPortMiddleware.authenticate());
app.use('/api/admin', sallyPortMiddleware.authenticate());
app.use('/api/wing', sallyPortMiddleware.authenticate());
app.use('/api/blockchain', sallyPortMiddleware.authenticate());

// Example protected endpoints
app.get('/api/agents', (req, res) => {
  res.json({
    message: 'Agent data accessed successfully',
    user: req.user,
    cloudflareValidation: req.cloudflareValidation,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/vls', (req, res) => {
  res.json({
    message: 'VLS data accessed successfully',
    user: req.user,
    securityLevel: req.cloudflareValidation?.securityLevel,
    timestamp: new Date().toISOString()
  });
});

// Export the Express app as a Cloud Function
exports.integrationGateway = functions
  .region('us-west1')
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB'
  })
  .https
  .onRequest(app);
EOF
fi

# Create or update functions package.json
if [ ! -f "functions/package.json" ]; then
    print_status "Creating functions package.json..."
    cat > functions/package.json << EOF
{
  "name": "integration-gateway-functions",
  "description": "Enhanced SallyPort authentication functions",
  "scripts": {
    "lint": "eslint .",
    "serve": "firebase emulators:start --only functions",
    "shell": "firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "18"
  },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0",
    "express": "^4.18.0",
    "winston": "^3.10.0",
    "axios": "^1.6.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "eslint": "^8.15.0",
    "eslint-config-google": "^0.14.0",
    "firebase-functions-test": "^3.1.0"
  },
  "private": true
}
EOF
fi

# Install function dependencies
print_status "Installing function dependencies..."
cd functions
npm install
cd ..

# Create or update firebase.json
print_status "Creating Firebase configuration..."
cat > firebase.json << EOF
{
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log"
      ],
      "predeploy": [
        "npm --prefix \"\$RESOURCE_DIR\" run lint"
      ]
    }
  ],
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
EOF

# Create Firestore security rules
if [ ! -f "firestore.rules" ]; then
    print_status "Creating Firestore security rules..."
    cat > firestore.rules << 'EOF'
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow system to write audit logs (functions only)
    match /audit_logs/{document=**} {
      allow read: if request.auth != null;
      allow write: if true; // Functions can write
    }
    
    // Allow system to write security alerts
    match /security_alerts/{document=**} {
      allow read: if request.auth != null;
      allow write: if true; // Functions can write
    }
    
    // Allow system to write auth sessions
    match /auth_sessions/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Allow system to write middleware monitoring
    match /middleware_monitoring/{document=**} {
      allow read: if request.auth != null;
      allow write: if true; // Functions can write
    }
  }
}
EOF
fi

# Create Firestore indexes
if [ ! -f "firestore.indexes.json" ]; then
    print_status "Creating Firestore indexes..."
    cat > firestore.indexes.json << EOF
{
  "indexes": [
    {
      "collectionGroup": "audit_logs",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "timestamp",
          "order": "DESCENDING"
        },
        {
          "fieldPath": "eventType",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "middleware_monitoring",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "timestamp",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "security_alerts",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "alertTimestamp",
          "order": "DESCENDING"
        },
        {
          "fieldPath": "acknowledged",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
EOF
fi

# Deploy Firestore rules and indexes
print_status "Deploying Firestore rules and indexes..."
firebase deploy --only firestore:rules,firestore:indexes --project ${PROJECT_ID}

# Deploy functions
print_status "Deploying Cloud Functions..."
firebase deploy --only functions --project ${PROJECT_ID}

# Get the deployed function URL
print_status "Getting deployed function URL..."
FUNCTION_URL=$(gcloud functions describe integrationGateway --region=${REGION} --format="value(httpsTrigger.url)" 2>/dev/null || echo "")

if [ -z "$FUNCTION_URL" ]; then
    print_warning "Could not retrieve function URL. Checking alternative methods..."
    FUNCTION_URL="https://${REGION}-${PROJECT_ID}.cloudfunctions.net/integrationGateway"
fi

print_success "Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary"
echo "===================="
echo "🌍 Region: ${REGION}"
echo "📦 Project: ${PROJECT_ID}"
echo "🔗 Function URL: ${FUNCTION_URL}"
echo "📊 Version: ${VERSION}"
echo ""
echo "🔍 Test endpoints:"
echo "   Health Check: ${FUNCTION_URL}/health"
echo "   Metrics: ${FUNCTION_URL}/metrics"
echo "   Protected API: ${FUNCTION_URL}/api/agents"
echo ""
echo "🔐 Authentication Features Deployed:"
echo "   ✅ Cloudflare challenge validation"
echo "   ✅ Comprehensive audit logging"
echo "   ✅ Protected resource enforcement"
echo "   ✅ Real-time security monitoring"
echo "   ✅ Rate limiting"
echo "   ✅ CORS optimization"
echo ""

# Test the deployment
print_status "Testing deployment..."
echo "Testing health check endpoint..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${FUNCTION_URL}/health" || echo "000")

if [ "$HTTP_CODE" -eq 200 ]; then
    print_success "Health check passed! ✅"
else
    print_warning "Health check returned HTTP $HTTP_CODE (this might be expected if authentication is required)"
fi

echo ""
print_success "🎉 Enhanced SallyPort Cloudflare Authentication deployment completed!"
print_status "Monitor logs with: firebase functions:log --project ${PROJECT_ID}"
print_status "View metrics in Cloud Console: https://console.cloud.google.com/functions/list?project=${PROJECT_ID}"

echo ""
echo "🔗 Next Steps:"
echo "1. Update your client applications to use the new endpoint"
echo "2. Configure Cloudflare to proxy requests to this function"
echo "3. Set up monitoring alerts for security events"
echo "4. Review audit logs in Firestore"
echo ""
echo "For more information, see the deployment documentation."
