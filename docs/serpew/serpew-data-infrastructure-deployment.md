# SERPEW Data Infrastructure Deployment Guide

## Overview

This guide provides detailed instructions for deploying the SERPEW data infrastructure for the Q4D-Lenz Professional system. This infrastructure connects to multiple private data sources and provides the foundational knowledge needed for comprehensive career and personality assessments.

## Infrastructure Components

The SERPEW data infrastructure consists of the following core components:

1. **Google Cloud Platform (GCP) Resources**
   - Project ID: `api-for-warp-drive` or `coaching2100.com`
   - Region: `us-west1`
   - Google Cloud Storage buckets for R1, R2, R3 datasets
   - GCP Secrets Manager for secure credential storage

2. **Firebase Infrastructure**
   - Firebase Project: `api-for-warp-drive` (desktop)
   - Firebase Project: `app-2100-cool` (iOS and Android)
   - Firestore database for structured data storage

3. **External Data Sources**
   - COACHING2100 Google Drive RSS feeds
   - National sector databases
   - International job dictionaries
   - Personality research archives
   - Career satisfaction metrics

4. **Processing Infrastructure**
   - Ray distributed computing framework
   - Pinecone vector database for semantic search

5. **Source Code Repositories**
   - GitHub: `C2100-PR`
   - GitLab: `C2100-lab`
   - Jira: `C2100pcr`
   - BitBucket: `C2100bb`

## Prerequisite Configuration

Before beginning deployment, ensure you have the following prerequisites in place:

1. **GCP Service Account**
   ```bash
   # Create service account for SERPEW
   gcloud iam service-accounts create serpew-service \
     --description="Service account for SERPEW data infrastructure" \
     --display-name="SERPEW Service Account"
   
   # Grant required permissions
   gcloud projects add-iam-policy-binding api-for-warp-drive \
     --member="serviceAccount:serpew-service@api-for-warp-drive.iam.gserviceaccount.com" \
     --role="roles/storage.admin"
   
   gcloud projects add-iam-policy-binding api-for-warp-drive \
     --member="serviceAccount:serpew-service@api-for-warp-drive.iam.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   
   gcloud projects add-iam-policy-binding api-for-warp-drive \
     --member="serviceAccount:serpew-service@api-for-warp-drive.iam.gserviceaccount.com" \
     --role="roles/firebase.admin"
   
   # Create and download service account key
   gcloud iam service-accounts keys create serpew-service-key.json \
     --iam-account=serpew-service@api-for-warp-drive.iam.gserviceaccount.com
   ```

2. **GCP Secrets Manager Setup**
   ```bash
   # Create secrets for database credentials
   echo -n '{"connection_string":"db-server.coaching2100.com:5432","username":"serpew_user","password":"your-secure-password"}' | \
     gcloud secrets create serpew-sector-db-credentials \
     --replication-policy="automatic" \
     --data-file=-
   
   echo -n '{"job_db_connection":"job-db.coaching2100.com:5432","job_db_username":"job_user","job_db_password":"your-secure-password"}' | \
     gcloud secrets create serpew-job-db-credentials \
     --replication-policy="automatic" \
     --data-file=-
   
   echo -n '{"research_db_connection":"research-db.coaching2100.com:5432","research_db_username":"research_user","research_db_password":"your-secure-password"}' | \
     gcloud secrets create serpew-research-db-credentials \
     --replication-policy="automatic" \
     --data-file=-
   
   echo -n '{"satisfaction_db_connection":"satisfaction-db.coaching2100.com:5432","satisfaction_db_username":"satisfaction_user","satisfaction_db_password":"your-secure-password"}' | \
     gcloud secrets create serpew-satisfaction-db-credentials \
     --replication-policy="automatic" \
     --data-file=-
   
   echo -n '{"root_folder_id":"your-coaching2100-folder-id","firebase_credentials":{...}}' | \
     gcloud secrets create serpew-coaching2100-credentials \
     --replication-policy="automatic" \
     --data-file=-
   ```

3. **Storage Bucket Setup**
   ```bash
   # Create GCS buckets for agent datasets
   gcloud storage buckets create gs://api-for-warp-drive-r1-datasets \
     --location=us-west1 \
     --uniform-bucket-level-access
   
   gcloud storage buckets create gs://api-for-warp-drive-r2-datasets \
     --location=us-west1 \
     --uniform-bucket-level-access
   
   gcloud storage buckets create gs://api-for-warp-drive-r3-datasets \
     --location=us-west1 \
     --uniform-bucket-level-access
   
   # Create bucket for RSS content
   gcloud storage buckets create gs://api-for-warp-drive-rss-content \
     --location=us-west1 \
     --uniform-bucket-level-access
   ```

4. **Firebase Configuration**
   ```bash
   # Initialize Firebase
   firebase use api-for-warp-drive
   
   # Deploy Firestore security rules
   firebase deploy --only firestore:rules
   ```

5. **Pinecone Setup**
   ```bash
   # Set up Pinecone index (using Pinecone console or API)
   # Store API key in Secrets Manager
   echo -n 'your-pinecone-api-key' | \
     gcloud secrets create serpew-pinecone-api-key \
     --replication-policy="automatic" \
     --data-file=-
   ```

## Deployment Steps

### 1. Clone Repository
```bash
# Clone the repository
git clone https://github.com/C2100-PR/q4d-lenz.git
cd q4d-lenz
```

### 2. Set Up Python Environment
```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables
```bash
# Set environment variables
export SERVICE_ACCOUNT_KEY_PATH="./serpew-service-key.json"
export GCP_PROJECT_ID="api-for-warp-drive"
export STORAGE_BUCKET_NAME="api-for-warp-drive-rss-content"
export PINECONE_ENVIRONMENT="us-west1-gcp"
```

### 4. Deploy Google Drive Connector
```bash
# Run the Google Drive connector setup script
python -m vls.scripts.start_drive_sync
```

### 5. Deploy RSS Feed Crawler
```bash
# Run the RSS feed crawler setup script
python -m vls.scripts.start_rss_crawler
```

### 6. Set Up Agent Dataset Storage
```bash
# Run the agent storage setup script
python -m vls.scripts.setup_agent_storage
```

### 7. Deploy Ray Processing Framework
```bash
# Install Ray
pip install ray[default]

# Start Ray cluster
ray start --head

# Run the Ray processing setup script
python -m vls.scripts.start_ray_processor
```

### 8. Set Up Pinecone Semantic Search
```bash
# Install sentence transformers
pip install sentence-transformers

# Run the semantic search setup script
python -m vls.scripts.setup_semantic_search
```

### 9. Deploy Knowledge API
```bash
# Install FastAPI and Uvicorn
pip install fastapi uvicorn

# Run the API server
python -m vls.scripts.start_knowledge_api
```

### 10. Set Up Docker Containers (Optional)
For production deployment, containerize each component:

```bash
# Build Docker images
docker build -t gcr.io/api-for-warp-drive/serpew-drive-connector:v1 -f docker/drive-connector.Dockerfile .
docker build -t gcr.io/api-for-warp-drive/serpew-rss-crawler:v1 -f docker/rss-crawler.Dockerfile .
docker build -t gcr.io/api-for-warp-drive/serpew-ray-processor:v1 -f docker/ray-processor.Dockerfile .
docker build -t gcr.io/api-for-warp-drive/serpew-semantic-search:v1 -f docker/semantic-search.Dockerfile .
docker build -t gcr.io/api-for-warp-drive/serpew-knowledge-api:v1 -f docker/knowledge-api.Dockerfile .

# Push to Google Container Registry
docker push gcr.io/api-for-warp-drive/serpew-drive-connector:v1
docker push gcr.io/api-for-warp-drive/serpew-rss-crawler:v1
docker push gcr.io/api-for-warp-drive/serpew-ray-processor:v1
docker push gcr.io/api-for-warp-drive/serpew-semantic-search:v1
docker push gcr.io/api-for-warp-drive/serpew-knowledge-api:v1
```

## Deployment Architecture

The deployed SERPEW infrastructure follows this architecture:

```
┌─────────────────────┐     ┌────────────────────────┐
│ COACHING2100 Drive  │────▶│ Google Drive Connector │
└─────────────────────┘     └───────────┬────────────┘
                                        │
                                        ▼
┌─────────────────────┐     ┌────────────────────────┐     ┌─────────────────────┐
│   RSS Feed Sources  │────▶│    RSS Feed Crawler    │────▶│  Google Cloud Storage│
└─────────────────────┘     └───────────┬────────────┘     └─────────────────────┘
                                        │
                                        ▼
┌─────────────────────┐     ┌────────────────────────┐     ┌─────────────────────┐
│ Specialist Agent    │────▶│ Ray Processing Framework│────▶│ Firestore Database  │
│ Training Data       │     └───────────┬────────────┘     └─────────────────────┘
└─────────────────────┘                 │
                                        ▼
┌─────────────────────┐     ┌────────────────────────┐     ┌─────────────────────┐
│ Career Databases    │────▶│ Pinecone Vector DB     │────▶│ Semantic Search API │
└─────────────────────┘     └───────────┬────────────┘     └─────────────────────┘
                                        │
                                        ▼
                            ┌────────────────────────┐
                            │     Knowledge API      │
                            └────────────────────────┘
                                        │
                                        ▼
                            ┌────────────────────────┐
                            │ Q4D-Lenz SERPEW System │
                            └────────────────────────┘
```

## Validation and Testing

After deployment, validate each component:

1. **Drive Connector Test**
   ```bash
   curl http://localhost:8000/drive/files | jq .
   ```

2. **RSS Crawler Test**
   ```bash
   curl http://localhost:8000/feeds/list | jq .
   ```

3. **Agent Storage Test**
   ```bash
   curl http://localhost:8000/datasets/r1 | jq .
   ```

4. **Semantic Search Test**
   ```bash
   curl -X POST http://localhost:8000/search \
     -H "Content-Type: application/json" \
     -d '{"query":"career development strategies","filters":{"content_type":"article"},"top_k":3}' | jq .
   ```

## Continuous Integration/Continuous Deployment

Set up CI/CD pipelines using GitHub Actions or GitLab CI:

```yaml
# .github/workflows/deploy-serpew.yml
name: Deploy SERPEW Infrastructure

on:
  push:
    branches: [ main ]
    paths:
      - 'vls/core/q4d-lenz/professional/serpew/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v0
        with:
          project_id: api-for-warp-drive
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          export_default_credentials: true
      
      - name: Build and push Docker images
        run: |
          docker build -t gcr.io/api-for-warp-drive/serpew-knowledge-api:${{ github.sha }} -f docker/knowledge-api.Dockerfile .
          docker push gcr.io/api-for-warp-drive/serpew-knowledge-api:${{ github.sha }}
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy serpew-knowledge-api \
            --image gcr.io/api-for-warp-drive/serpew-knowledge-api:${{ github.sha }} \
            --platform managed \
            --region us-west1 \
            --allow-unauthenticated
```

## Monitoring and Logging

Configure monitoring for the SERPEW infrastructure:

1. **Set Up Cloud Monitoring**
   ```bash
   # Create monitoring dashboard
   gcloud monitoring dashboards create \
     --config-from-file=monitoring/serpew-dashboard.json
   ```

2. **Configure Logging**
   ```bash
   # Create log sink
   gcloud logging sinks create serpew-logs \
     storage.googleapis.com/api-for-warp-drive-logs \
     --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name:"serpew"'
   ```

3. **Set Up Alerts**
   ```bash
   # Create alert policy for API errors
   gcloud alpha monitoring policies create \
     --policy-from-file=monitoring/serpew-api-error-alert.json
   ```

## Security Considerations

Ensure the following security measures are in place:

1. **Data Encryption**
   - All data at rest is encrypted using Google-managed encryption keys
   - Sensitive credentials are stored in GCP Secrets Manager
   - Network traffic is encrypted using TLS

2. **Access Controls**
   - Service accounts use principle of least privilege
   - IAM roles are configured for minimal access
   - API endpoints require authentication

3. **Audit Logging**
   - All data access is recorded using the S2DO protocol
   - GCP audit logging is enabled for all services
   - Administrative actions are logged and monitored

## Troubleshooting

Common issues and their solutions:

1. **Google Drive Connection Failures**
   - Check service account permissions
   - Verify that the root folder ID is correct
   - Ensure proper OAuth scope is configured

2. **Database Connection Issues**
   - Verify database credentials in GCP Secrets Manager
   - Check network connectivity and firewall rules
   - Validate database user permissions

3. **Ray Cluster Problems**
   - Ensure Ray is properly initialized
   - Check for sufficient memory and CPU resources
   - Verify port accessibility for Ray dashboard

## Contact Information

For support with this deployment, contact:

- **Owner Email**: pr@coaching2100.com
- **Jira Project**: C2100pcr
- **Support Slack Channel**: #serpew-deployment

## Appendix: Data Schema Examples

### Sector Standards Schema
```sql
CREATE TABLE sector_hierarchy (
  sector_id VARCHAR(36) PRIMARY KEY,
  sector_name VARCHAR(255) NOT NULL,
  parent_sector_id VARCHAR(36),
  sector_level INT NOT NULL,
  sector_code VARCHAR(50) NOT NULL,
  jurisdiction VARCHAR(50) NOT NULL,
  FOREIGN KEY (parent_sector_id) REFERENCES sector_hierarchy(sector_id)
);

CREATE TABLE sector_standards (
  standard_id VARCHAR(36) PRIMARY KEY,
  sector_id VARCHAR(36) NOT NULL,
  standard_name VARCHAR(255) NOT NULL,
  standard_code VARCHAR(50) NOT NULL,
  description TEXT,
  certification_requirements TEXT,
  skill_requirements TEXT,
  standard_level VARCHAR(50) NOT NULL,
  jurisdiction VARCHAR(50) NOT NULL,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  FOREIGN KEY (sector_id) REFERENCES sector_hierarchy(sector_id)
);
```

### Job Definitions Schema
```sql
CREATE TABLE job_definitions (
  job_code VARCHAR(36) PRIMARY KEY,
  job_title VARCHAR(255) NOT NULL,
  description TEXT,
  required_skills TEXT,
  required_education TEXT,
  typical_experience TEXT,
  career_path TEXT,
  sector_id VARCHAR(36) NOT NULL,
  jurisdiction VARCHAR(50) NOT NULL,
  holland_code VARCHAR(6),
  o_net_code VARCHAR(20),
  isco_code VARCHAR(20),
  job_family VARCHAR(100),
  FOREIGN KEY (sector_id) REFERENCES sector_hierarchy(sector_id)
);

CREATE TABLE career_satisfaction_metrics (
  id VARCHAR(36) PRIMARY KEY,
  job_code VARCHAR(36) NOT NULL,
  metric_year INT NOT NULL,
  overall_satisfaction DECIMAL(5,2) NOT NULL,
  autonomy_satisfaction DECIMAL(5,2),
  compensation_satisfaction DECIMAL(5,2),
  work_life_balance DECIMAL(5,2),
  growth_opportunities DECIMAL(5,2),
  job_security DECIMAL(5,2),
  peer_relationships DECIMAL(5,2),
  management_quality DECIMAL(5,2),
  sample_size INT NOT NULL,
  jurisdiction VARCHAR(50) NOT NULL,
  measurement_methodology VARCHAR(100),
  FOREIGN KEY (job_code) REFERENCES job_definitions(job_code)
);
```

### Research Studies Schema
```sql
CREATE TABLE personality_career_studies (
  study_id VARCHAR(36) PRIMARY KEY,
  study_title VARCHAR(255) NOT NULL,
  publication_year INT NOT NULL,
  authors TEXT,
  methodology TEXT,
  abstract TEXT,
  key_findings TEXT,
  sample_size INT,
  personality_factors TEXT
);

CREATE TABLE personality_job_correlations (
  id VARCHAR(36) PRIMARY KEY,
  study_id VARCHAR(36) NOT NULL,
  personality_factor VARCHAR(100) NOT NULL,
  job_family VARCHAR(100) NOT NULL,
  correlation_coefficient DECIMAL(5,4) NOT NULL,
  statistical_significance DECIMAL(5,4),
  FOREIGN KEY (study_id) REFERENCES personality_career_studies(study_id)
);
```