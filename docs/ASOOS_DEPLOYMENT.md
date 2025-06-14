# ASOOS Deployable Build Guide

## Overview

The ASOOS (Aixtiv Symphony Orchestrating Operating System) Deployable Build is a foundational component of the Aixtiv Symphony architecture. It provides essential backend services for message synchronization, AI interaction through Claude, and initial database setup.

This guide will walk you through deploying these components to your Firebase project and integrating them with the broader ASOOS ecosystem.

## Components

### 1. Firebase Functions

The deployment includes two critical Cloud Functions:

#### syncMessage

This function provides a callable HTTPS endpoint for message synchronization:

- **Purpose**: Records user messages in Firestore for persistence and history tracking
- **Integration Point**: Flight Memory System (FMS) for conversation tracking
- **Data Flow**: User message → Firestore → Available for retrieval and analysis
- **Returns**: Success status and timestamp for client confirmation

#### delegateToClaude

This function enables AI interactions through Claude:

- **Purpose**: Processes user prompts and returns AI responses from Claude
- **Integration Point**: Dr. Claude orchestration component from VLS (Vision Lake Solutions)
- **Data Flow**: User prompt → Claude API → Processed response
- **Returns**: AI response for display in the interface

### 2. Firestore Schema

The deployment initializes the Firestore database with essential seed data:

- **User Profile**: Creates a profile for "Mr. Phillip Corey Roark" (CEO/Principal)
- **Copilot Configuration**: Sets up "QB Lucy" as an active copilot assigned to the user
- **Integration Point**: Core data layer for user management and copilot assignment

## Deployment Instructions

### Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Access to the target Firebase project
- Node.js v14+ installed
- Google Cloud credentials configured

### Deployment Steps

1. **Clone or navigate to the project repository**:
   ```bash
   cd /Users/as/asoos/aixtiv-symphony-opus1.0.1
   ```

2. **Deploy using the automated script**:
   ```bash
   ./scripts/deploy-asoos-build.sh
   ```
   
   This will:
   - Deploy the Firebase Functions
   - Seed the Firestore database
   - Verify the deployment

3. **Specify a different target** (optional):
   ```bash
   ./scripts/deploy-asoos-build.sh your-firebase-project-id
   ```

4. **Verify deployment**:
   - Check the Firebase console: https://console.firebase.google.com
   - Verify Functions are listed in the "Functions" section
   - Check Firestore for the seed data in the "users" and "copilots" collections

## Implementation Details

### Function Structure

The functions follow the standard Firebase callable function pattern:

```javascript
exports.functionName = https.onCall(async (data, context) => {
  // Function logic
  return { result };
});
```

This allows them to be easily called from client applications using the Firebase SDK.

### Database Schema

The database uses the following collections:

- **users**: Stores user profiles with name, email, role, and creation timestamp
- **copilots**: Stores copilot configurations with name, status, assigned user, and creation timestamp
- **messages**: Stores user messages with text, sender information, and timestamps

## Troubleshooting

### Common Issues

1. **Firebase Authentication Errors**:
   - Ensure you're logged in with `firebase login`
   - Verify project access with `firebase projects:list`

2. **Deployment Failures**:
   - Check logs in `logs/deploy-*.log`
   - Verify your Firebase project ID is correct
   - Ensure you have sufficient permissions in GCP/Firebase

3. **Function Execution Errors**:
   - Check Firebase Function logs in the console
   - Verify environment variables are set correctly
   - Test functions using the Firebase Shell: `firebase functions:shell`

4. **Database Seeding Issues**:
   - Run the seed script manually: `node scripts/firestore/schema_seed.js`
   - Check Firestore rules to ensure write access

### Debugging Tips

- Use the `firebase emulators:start` command to test locally before deployment
- Check logs with `firebase functions:log`
- Enable verbose logging in functions with `logger.debug()` statements

## Extending Functionality

### Next Steps

1. **Enhance Claude Integration**:
   - Replace the simulated Claude response with an actual Anthropic API call
   - Add memory context to improve response relevance
   - Implement response streaming for better user experience

2. **Expand Message Synchronization**:
   - Add support for attachments and multimedia
   - Implement real-time updates using Firestore listeners
   - Add message threading and conversation management

3. **Develop Additional Components**:
   - Integrate with Dr. Grant's authentication system
   - Connect to Dream Commander for learning predictions
   - Add Blockchain integration via S2DO smart contracts

4. **User Experience Enhancements**:
   - Add webhook notifications for message events
   - Implement conversation analytics and insights
   - Create admin dashboard for system monitoring

### Integration with ASOOS Architecture

These components serve as the foundation for the broader ASOOS ecosystem:

- **Gateway Integration**: Update the Integration Gateway to route requests to these functions
- **Wing Orchestration**: Connect the Wing agent system to leverage Claude's capabilities
- **Academy Integration**: Use these functions to power learning experiences

## Resources

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Anthropic Claude API Documentation](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Aixtiv Symphony Architecture](../README.md)

---

For support or questions, contact the Aixtiv Symphony team.

