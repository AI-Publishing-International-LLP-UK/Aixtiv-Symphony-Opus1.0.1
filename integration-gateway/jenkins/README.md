# Dr. Lucy Automation - Jenkins Integration

This directory contains Jenkins pipeline configurations and scripts for the Dr. Lucy Automation CI/CD solution.

## Directory Structure

- `scripts/` - Contains reusable Jenkins pipeline scripts
    - `fetch-secret.groovy` - Utility for securely fetching secrets from Google Cloud Secret Manager
- `workflows/cicd/` - Contains Jenkins pipeline definitions
    - `dr-lucy-pipeline.groovy` - Main CI/CD pipeline for Dr. Lucy Automation

## Setup Instructions

### Jenkins Configuration

1. **Create Credentials in Jenkins**:
   - Navigate to "Manage Jenkins" > "Manage Credentials"
   - Add a new File credential with ID `gcp-service-account-key` containing your Google Cloud service account key JSON

2. **Install Required Plugins**:
   - Google Cloud SDK Plugin
   - Pipeline Plugin
   - Credentials Plugin
   - Pipeline Utility Steps Plugin

3. **Create a Jenkins Pipeline Job**:
   - Create a new Pipeline job
   - Select "Pipeline script from SCM" as the definition
   - Point to your repository and specify the path to the pipeline file: `jenkins/workflows/cicd/dr-lucy-pipeline.groovy`

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

## Security Features

The `fetch-secret.groovy` script implements several security best practices:

1. Uses temporary credential files that are automatically cleaned up
2. Has timeout handling to prevent hanging indefinitely
3. Never prints secrets to logs
4. Stores secrets securely as Jenkins environment variables
5. Uses Jenkins Credentials Store for managing service account keys

## Pipeline Stages

The `dr-lucy-pipeline.groovy` pipeline includes the following stages:

1. **Checkout** - Checks out code from the repository
2. **Fetch Secrets** - Retrieves all required secrets from Google Cloud Secret Manager
3. **API Integration** - Connects to OpenAI API (only for development and staging environments)
4. **Deploy to Firebase** - Deploys the application to Firebase Hosting
5. **GitHub Integration** - Updates the GitHub repository with deployment status
6. **Integration Service Notification** - Notifies the integration service about the deployment

## Usage Example

```groovy
// Load the secret fetching utility
def secretUtils = load('jenkins/scripts/fetch-secret.groovy')

// Fetch a specific secret
def mySecret = secretUtils.fetchSecret('my-secret-name', 'my-gcp-project-id')

// Use the secret securely
withEnv(["MY_SECRET=${mySecret}"]) {
    sh 'deploy-script.sh'
}
```

## Customization

Replace the example commands in the pipeline stages with your actual deployment and integration commands. The current implementation includes placeholder commands that demonstrate how to safely use the secrets retrieved from Google Cloud Secret Manager.
