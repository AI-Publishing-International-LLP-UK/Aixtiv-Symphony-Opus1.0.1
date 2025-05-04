# Quick AIXTIV SYMPHONY Firebase Deployment Guide

This guide provides a streamlined process to deploy your AIXTIV SYMPHONY system to Firebase with minimal setup.

## Prerequisites

- Firebase account
- Node.js and npm installed
- Firebase CLI (`npm install -g firebase-tools`)
- Your AIXTIV code ready for deployment

## Step 1: Run the Deployment Script

1. Download the deployment script
2. Make it executable: `chmod +x firebase-deployment.sh`
3. Run the script: `./firebase-deployment.sh`

The script will:
- Set up a multi-site Firebase configuration
- Create placeholder pages for each component
- Configure security rules
- Deploy the basic structure to Firebase

## Step 2: Connect Your Custom Domains

After deployment, connect your extensive domain structure:

1. Go to Firebase Console > Hosting
2. Select each deployed site (anthology, orchestrate, academy, visualization)
3. Click "Add custom domain"
4. Follow the verification process for each domain
5. Set up DNS records as instructed by Firebase

For your 120+ domain structure, consider:
- Using wildcards for subdomains where possible
- Creating domain groups in Firebase for easier management
- Setting up domain forwarding for promotional domains

## Step 3: Update Your Codebase

Replace the placeholder content with your actual application:

1. Build each component:
   ```bash
   cd anthology
   npm run build
   # Repeat for each component
   ```

2. Deploy just the updated components:
   ```bash
   firebase deploy --only hosting:anthology
   # Repeat for each component
   ```

## Step 4: Configure Firebase Functions

To get your GenAI functionality working:

1. Update the functions/index.js file with your actual code
2. Add your Anthology AI Publishing code to the relevant functions
3. Deploy the updated functions:
   ```bash
   firebase deploy --only functions
   ```

## Step 5: Set Up Environment Variables

1. Go to Firebase Console > Functions > Settings
2. Add your environment variables:
   - API keys for AI services
   - Domain configuration
   - Integration endpoints

## Step 6: Set Up Authentication

For your 2100.cool login process:

1. Go to Firebase Console > Authentication
2. Enable Email/Password authentication
3. Configure additional providers as needed
4. Set up custom domains for authentication if required

## Quick Reference Commands

Deploy everything:
```bash
firebase deploy
```

Deploy specific components:
```bash
firebase deploy --only hosting:anthology,functions:anthology
firebase deploy --only hosting:orchestrate
firebase deploy --only hosting:academy
firebase deploy --only hosting:visualization
```

View function logs:
```bash
firebase functions:log
```

## Troubleshooting

**Deployment fails:**
- Check Firebase CLI version: `firebase --version`
- Ensure you're logged in: `firebase login`
- Verify project permissions in Firebase console

**Custom domains not connecting:**
- Verify DNS settings
- Check domain verification
- Wait for DNS propagation (can take 24-48 hours)

**Function errors:**
- Check function logs: `firebase functions:log`
- Verify environment variables
- Test functions locally before deployment

## Next Steps

Once your basic deployment is live:

1. Set up CI/CD pipelines for automated deployment
2. Configure monitoring and alerts
3. Implement analytics to track usage
4. Set up database backups
5. Connect visualization centers to the deployed application

For additional help, refer to the [Firebase documentation](https://firebase.google.com/docs).
