# Dr. Lucy Automation CI/CD Pipeline

This directory contains GitHub Actions workflows for the Dr. Lucy Automation CI/CD solution.

## Workflow Files

- `ci-cd-pipeline.yml`: Main CI/CD pipeline that securely fetches secrets from Google Cloud Secret Manager and uses them for deployment

## Scripts

- `scripts/fetch-secret.sh`: A script to securely fetch secrets from Google Cloud Secret Manager without exposing them

## Setup Instructions

### Required Secrets

Add the following secrets to your GitHub repository:

1. `GCP_SA_KEY`: Google Cloud service account key JSON with access to Secret Manager
2. `FIREBASE_SA_KEY`: Firebase service account key (if using Firebase deployment)

### Google Cloud Setup

1. **Create a service account** with Secret Manager Secret Accessor role
2. **Generate and download a key** for this service account
3. **Enable the Secret Manager API** in your Google Cloud project
4. **Create the following secrets in Google Cloud Secret Manager**:
   - `dr_lucy_automation_token` - Dr. Lucy Automation token
   - `openai-api-key` - OpenAI API key
   - `firebase-app-hosting-github-oauth-github-oauthtoken-f30414` - Firebase OAuth token
   - `godaddy-firebase` - GoDaddy Firebase integration key
   - `GITHUB_TOKEN` - GitHub API token
   - `INTEGRATION_TOKEN` - Integration service token

### Usage Instructions

This workflow can be triggered manually via the GitHub Actions UI with the "workflow_dispatch" event.
You can select the deployment environment (development, staging, or production) when triggering the workflow.

## Workflow Steps

The CI/CD pipeline includes the following steps:

1. **Checkout code** from GitHub
2. **Authenticate to Google Cloud** using the service account key
3. **Create Scripts Directory** for the fetch-secret script
4. **Retrieve Necessary Secrets** from Google Cloud Secret Manager:
   - Fetches each required secret and stores it securely as a GitHub environment variable
5. **Integrate with OpenAI API** (only for development and staging environments)
6. **Deploy to Firebase Hosting** using the retrieved secrets
7. **Update GitHub Repository** with deployment status
8. **Notify Integration Service** about the deployment

## Security Features

The `fetch-secret.sh` script implements several security best practices:

1. Uses secure temporary files that are automatically cleaned up
2. Has timeout handling to prevent hanging indefinitely
3. Never prints secrets to logs
4. Stores secrets securely as GitHub environment variables

## Customization

Replace the example commands in the workflow steps with your actual deployment and integration commands. The current implementation includes placeholder commands that demonstrate how to safely use the secrets retrieved from Google Cloud Secret Manager.
