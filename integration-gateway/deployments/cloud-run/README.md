# Cloud Run Deployment Documentation

## Overview

This directory contains the configuration and scripts necessary for deploying the Integration Gateway service to Google Cloud Run. The deployment process is designed to be repeatable, maintainable, and support multiple environments (development, staging, production).

## Directory Structure

```
deployments/cloud-run/
├── cloudbuild.yaml    # CI/CD pipeline configuration for Cloud Build
├── service.yaml       # Cloud Run service definition template
├── deploy.sh          # Deployment script for local deployment
└── environments/      # Environment-specific configurations
    ├── dev.env        # Development environment variables
    ├── staging.env    # Staging environment variables
    └── prod.env       # Production environment variables
```

## Prerequisites

Before deploying, ensure you have:

1. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and configured
2. Docker installed for local builds
3. Appropriate permissions in your GCP project
4. Authenticated with gcloud: `gcloud auth login`
5. Set your project: `gcloud config set project YOUR_PROJECT_ID`

## Configuration

### Service Configuration (service.yaml)

The `service.yaml` file is a template that defines the Cloud Run service configuration. It includes:

- CPU and memory resources
- Autoscaling settings
- Container image reference (substituted during deployment)
- Environment variables
- Service account configuration

### Environment Variables

Environment-specific variables are stored in `.env` files in the `environments/` directory:

- `dev.env`: Development environment configuration
- `staging.env`: Staging environment configuration
- `prod.env`: Production environment configuration

Edit these files to customize settings for each environment.

## Deployment Methods

### Local Deployment

To deploy from your local machine:

1. Make sure you're in the project root directory
2. Run the deployment script with appropriate parameters:

```bash
./deployments/cloud-run/deploy.sh --env=dev --project=your-project-id --region=us-central1
```

Parameters:
- `--env`: Environment to deploy (dev, staging, prod)
- `--project`: Google Cloud project ID
- `--region`: Google Cloud region for deployment

### CI/CD Deployment (Cloud Build)

The `cloudbuild.yaml` file configures automated deployment via Google Cloud Build:

1. Builds the container image
2. Pushes it to Google Artifact Registry
3. Updates the Cloud Run service

To trigger a deployment via Cloud Build:

```bash
gcloud builds submit --config=deployments/cloud-run/cloudbuild.yaml \
  --substitutions=_ENVIRONMENT=dev,_REGION=us-central1
```

## Monitoring and Maintenance

### Viewing Deployment Status

```bash
gcloud run services describe integration-gateway --platform managed --region=REGION
```

### Viewing Logs

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=integration-gateway" --limit=10
```

### Rolling Back

To roll back to a previous version:

```bash
gcloud run services update-traffic integration-gateway \
  --platform=managed \
  --region=REGION \
  --to-revisions=REVISION_NAME=100
```

You can find revision names with:

```bash
gcloud run revisions list --platform=managed --region=REGION --service=integration-gateway
```

## Security Considerations

- Ensure the service account has the minimum required permissions
- Store sensitive information in Secret Manager, not in environment files
- Regularly update dependencies and base container images
- Enable Container Analysis scanning for vulnerabilities

## Troubleshooting

Common issues and solutions:

1. **Deployment fails with permission errors**:
   - Verify your gcloud authentication and permissions
   - Check service account permissions

2. **Service fails to start**:
   - Check Cloud Run logs for application errors
   - Verify environment variables are correctly set

3. **Performance issues**:
   - Review resource allocation (CPU/memory)
   - Check autoscaling settings

