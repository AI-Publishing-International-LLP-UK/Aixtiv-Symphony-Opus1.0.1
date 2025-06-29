# Dr. Lucy Automation Jenkins Setup Guide

This guide provides instructions for setting up Jenkins to work with the Dr. Lucy Automation service account for deploying applications to Google Cloud Run and Docker.

## Prerequisites

- Jenkins server installed and running
- Access to Google Cloud Platform (GCP) project: `api-for-warp-drive`
- Administrative access to Jenkins

## 1. Installing Required Jenkins Plugins

Install the following plugins through Jenkins Plugin Manager (Manage Jenkins > Plugins > Available):

- **Google Cloud SDK**: For authenticating and interacting with Google Cloud services
- **Docker Pipeline**: For building and managing Docker containers
- **Pipeline**: For defining Jenkins pipelines as code
- **Credentials Binding**: For securely injecting credentials into the pipeline
- **Git**: For source code management
- **Slack Notification**: For sending notifications to Slack channels
- **HTML Publisher**: For publishing test and coverage reports
- **Timestamper**: For adding timestamps to console output
- **NodeJS**: For NodeJS-based applications

After installing, restart Jenkins to apply the changes.

## 2. Setting Up the DrLucyAutomation Service Account

### 2.1 Create Jenkins Credentials

1. Go to **Manage Jenkins** > **Manage Credentials**
2. Click on the domain where you want to store the credentials (typically Jenkins global credentials)
3. Click **Add Credentials**
4. Select **Google Service Account from private key** as the kind
5. Enter the following details:
   - **ID**: `drla-service-account-key`
   - **Description**: `Dr. Lucy Automation GCP Service Account`
   - **Project Name**: `api-for-warp-drive`
   - **JSON Key**: Upload the DrLucyAutomation service account key file

### 2.2 Additional Credentials (if needed)

Add any additional credentials for:
- Docker repositories
- Source code repositories
- Slack webhooks
- Any other services used in your pipelines

## 3. Configuring Jenkins for Cloud Run Deployments

### 3.1 Setting Up Global Tool Configuration

1. Go to **Manage Jenkins** > **Global Tool Configuration**
2. Configure **NodeJS** installations for your Node.js applications
3. Configure **Docker** installations if you're building Docker images on the Jenkins server

### 3.2 Cloud Run Deployment Pipeline Configuration

When creating a pipeline for Cloud Run deployments, use the following template structure:

```groovy
pipeline {
    agent any
    
    environment {
        PROJECT_ID = 'api-for-warp-drive'
        SERVICE_NAME = 'integration-gateway'
        REGION = 'us-west1'
        IMAGE_NAME = "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:${BUILD_NUMBER}"
        CREDENTIALS_ID = 'drla-service-account-key'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build and Test') {
            steps {
                sh 'npm install'
                sh 'npm test'
            }
        }
        
        stage('Build and Push Docker Image') {
            steps {
                script {
                    withCredentials([file(credentialsId: CREDENTIALS_ID, variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
                        sh "gcloud auth activate-service-account --key-file=${GOOGLE_APPLICATION_CREDENTIALS}"
                        sh "gcloud builds submit --tag ${IMAGE_NAME} ."
                    }
                }
            }
        }
        
        stage('Deploy to Cloud Run') {
            steps {
                script {
                    withCredentials([file(credentialsId: CREDENTIALS_ID, variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
                        sh """
                            gcloud auth activate-service-account --key-file=${GOOGLE_APPLICATION_CREDENTIALS}
                            gcloud config set project ${PROJECT_ID}
                            
                            # Set variables in the YAML file
                            sed -i "s|\\\${IMAGE_URL}|${IMAGE_NAME}|g" deployments/cloud-run/service.yaml
                            sed -i "s|\\\${ENVIRONMENT}|production|g" deployments/cloud-run/service.yaml
                            sed -i "s|\\\${SERVICE_ACCOUNT}|drlucyautomation@${PROJECT_ID}.iam.gserviceaccount.com|g" deployments/cloud-run/service.yaml
                            
                            # Deploy to Cloud Run
                            gcloud run services replace deployments/cloud-run/service.yaml --region=${REGION}
                        """
                    }
                }
            }
        }
    }
    
    post {
        success {
            slackSend(channel: '#deployments', color: 'good', message: "Deployment of ${SERVICE_NAME} successful!")
        }
        failure {
            slackSend(channel: '#deployments', color: 'danger', message: "Deployment of ${SERVICE_NAME} failed!")
        }
    }
}
```

## 4. Using the Main Pipeline as an Entry Point

The main Jenkinsfile in your repository serves as an orchestration point for various automation processes. To use it:

1. Open Jenkins and create a new Pipeline job
2. Configure the job to pull from your source code repository
3. Set it to use the "Jenkinsfile" in the repository root
4. Configure appropriate build triggers (webhook, schedule, etc.)
5. Save and run the job

This main pipeline will coordinate the execution of other pipelines (CI/CD, Testing, Deployment, etc.) based on your configuration.

## 5. Troubleshooting

### 5.1 Common Issues

- **Authentication Failures**: Ensure the service account has the necessary permissions
- **Cloud Run Deployment Failures**: 
  - Check for proper YAML formatting
  - Verify container port is set to 8080 (required by Cloud Run)
  - Check the startup probe settings if services take long to initialize

### 5.2 Viewing Logs

To debug Cloud Run deployments:
```
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=integration-gateway" --project=api-for-warp-drive --limit 10
```

## Next Steps

After setting up Jenkins with Dr. Lucy Automation:

1. Implement CI/CD pipelines for all relevant services
2. Set up regular backup of Jenkins configuration
3. Configure alerting for failed builds and deployments
4. Document service-specific deployment procedures

For any questions about these pipelines or their usage, consult the documentation in the `jenkins/workflows` directory.
