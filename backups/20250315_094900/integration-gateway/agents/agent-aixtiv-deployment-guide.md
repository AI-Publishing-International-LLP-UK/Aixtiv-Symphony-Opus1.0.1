# AIXTIV SYMPHONY™ Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the AIXTIV SYMPHONY™ system to a production environment. The deployment leverages Google Cloud Platform (GCP) services to ensure high availability, scalability, and robust security.

## Prerequisites

- Google Cloud Platform account with appropriate permissions
- Google Kubernetes Engine (GKE) access
- Docker installed locally for building images
- `gcloud` CLI tool installed and configured
- `kubectl` CLI tool installed and configured
- Git access to the AIXTIV SYMPHONY™ repositories

## Local Development Setup

1. Clone the repository
```bash
git clone https://github.com/aixtiv-publishing/aixtiv-symphony.git
cd aixtiv-symphony
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env
# Edit .env file with your local configuration
```

4. Start development server
```bash
npm run dev
```

5. Run tests
```bash
npm test
```

## Docker Build

```bash
# Build Docker image
docker build -t aixtiv-symphony:local .

# Run locally
docker run -p 3000:3000 aixtiv-symphony:local
```

## Kubernetes Deployment

### Initial Setup

1. Authenticate with Google Cloud
```bash
# Authenticate with Google Cloud
gcloud auth login

# Set project
gcloud config set project api-for-warp-drive

# Configure Docker to use Google Container Registry
gcloud auth configure-docker gcr.io

# Connect to Kubernetes cluster
gcloud container clusters get-credentials aixtiv-symphony-primary --region us-west1
```

2. Create Kubernetes Namespace
```bash
# Create production namespace
kubectl create namespace production

# Verify namespace creation
kubectl get namespaces
```

3. Create Secrets
```bash
# Create secrets for database and authentication
kubectl create secret generic aixtiv-secrets \
    --from-literal=DATABASE_URL="your_actual_database_connection_string" \
    --from-literal=JWT_SECRET="your_secure_jwt_secret" \
    --from-literal=API_KEYS="your_encrypted_api_keys" \
    -n production

# Create secrets for LinkedIn integrations
kubectl create secret generic linkedin-api-secrets \
    --from-literal=DR_MATCH_CLIENT_ID="7874fjg5h9t5la" \
    --from-literal=DR_MATCH_CLIENT_SECRET="your_match_client_secret" \
    --from-literal=DR_MEMORIA_CLIENT_ID="your_memoria_client_id" \
    --from-literal=DR_MEMORIA_CLIENT_SECRET="your_memoria_client_secret" \
    -n production

# Verify secrets (without showing actual values)
kubectl get secrets -n production
```

### Build and Push Docker Image

1. Tag and push to Google Container Registry
```bash
# Tag the image
docker tag aixtiv-symphony:local gcr.io/api-for-warp-drive/aixtiv-symphony:latest

# Push to GCR
docker push gcr.io/api-for-warp-drive/aixtiv-symphony:latest
```

2. Deploy to Kubernetes
```bash
# Apply deployment configuration
kubectl apply -f kubernetes/deployment.yaml -n production

# Apply service configuration
kubectl apply -f kubernetes/service.yaml -n production

# Apply ingress configuration
kubectl apply -f kubernetes/ingress.yaml -n production
```

3. Verify deployment
```bash
# Check deployment status
kubectl get deployments -n production

# Check pod status
kubectl get pods -n production

# Check services
kubectl get services -n production

# Check ingress
kubectl get ingress -n production
```

### Monitoring and Management

1. Configure monitoring
```bash
# Apply monitoring configuration
kubectl apply -f kubernetes/monitoring.yaml -n production

# Set up logging
kubectl apply -f kubernetes/logging.yaml -n production
```

2. Set up alerts
```bash
# Apply alert policies
kubectl apply -f kubernetes/alerts.yaml -n production
```

3. View logs
```bash
# View logs for a specific pod
kubectl logs -f deployment/aixtiv-symphony -n production

# Stream logs to Cloud Logging
gcloud logging read "resource.type=k8s_container AND resource.labels.namespace_name=production AND resource.labels.container_name=aixtiv-symphony" --limit 10
```

### Scaling and Updates

1. Manual scaling
```bash
# Scale deployment
kubectl scale deployment aixtiv-symphony --replicas=5 -n production
```

2. Auto-scaling
```bash
# Apply Horizontal Pod Autoscaler
kubectl apply -f kubernetes/hpa.yaml -n production

# Check HPA status
kubectl get hpa -n production
```

3. Rolling updates
```bash
# Update image version
kubectl set image deployment/aixtiv-symphony aixtiv-symphony=gcr.io/api-for-warp-drive/aixtiv-symphony:v1.2.3 -n production

# Check rollout status
kubectl rollout status deployment/aixtiv-symphony -n production
```

4. Rollback
```bash
# Rollback to previous version
kubectl rollout undo deployment/aixtiv-symphony -n production
```

## CI/CD Configuration

1. Set up GitHub Actions
   - Create a `.github/workflows/deploy.yml` file
   - Configure GCP service account with appropriate permissions
   - Set up secrets in GitHub repository settings

2. Configure automated testing
   - Unit tests
   - Integration tests
   - Security scans

3. Configure approval process for production deployments

## Performance Tuning

1. Resource allocation
   - CPU and memory limits
   - Horizontal vs vertical scaling

2. Database optimization
   - Connection pooling
   - Query optimization
   - Caching strategies

3. Content delivery
   - CDN configuration
   - Edge caching

## Security Considerations

1. Network security
   - VPC configuration
   - Firewall rules
   - Private Google Access

2. Application security
   - Regular security audits
   - Dependency scanning
   - Vulnerability patching

3. Data security
   - Encryption at rest
   - Encryption in transit
   - Access controls

## Troubleshooting

1. Check pod status and logs
```bash
# Get detailed pod information
kubectl describe pod <pod-name> -n production

# Check container logs
kubectl logs <pod-name> -c aixtiv-symphony -n production
```

2. Check Kubernetes events
```bash
kubectl get events -n production
```

3. Check service connectivity
```bash
# Create a debug pod
kubectl run debug --image=busybox -it --rm -- sh

# Test connectivity to service
wget -O- http://aixtiv-symphony-service:3000/health
```

4. Common issues
   - Resource constraints (OOMKilled)
   - Configuration errors
   - Network connectivity issues

## Backup and Disaster Recovery

1. Database backups
   - Scheduled automatic backups
   - Point-in-time recovery

2. Configuration backups
   - Export Kubernetes resources
   - Version control for configurations

3. Disaster recovery plan
   - Multi-region deployment strategies
   - Failover procedures
   - Recovery time objectives

---

© 2025 AI Publishing International LLP. All rights reserved.