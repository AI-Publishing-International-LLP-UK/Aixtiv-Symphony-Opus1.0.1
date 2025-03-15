# Gold Standard Domain Management System

A comprehensive, end-to-end domain management solution for Firebase Hosting that supports all 17+ hosting sites in your project. This system automates the entire lifecycle from domain purchase to deployment with built-in SEO optimization and Google verification.

## Features

- **One-Command Domain Management**: Purchase, configure, and deploy with a single command
- **Multi-Site Support**: Intelligently manages domains across all 17+ Firebase Hosting sites
- **GoDaddy Integration**: Search, purchase, and configure domains directly through the API
- **SEO Optimization**: Automatic sitemap generation, robots.txt configuration, and Google verification
- **Google Search Console Integration**: Domain verification and ownership confirmation
- **Cloud Run Deployment**: Seamless integration with your `/users/asoos/deployment.sh` script
- **CI/CD Pipeline**: GitHub Actions workflow for automated domain configuration
- **Free Tier Management**: Optimizes domain distribution to stay within Firebase's free tier limits

## Prerequisites

- Node.js 20+
- Firebase project with Admin access
- GoDaddy API credentials
- Service account key for Firebase Admin SDK
- Google Search Console verification token (optional)

## Installation

```bash
# Clone the repository
git clone https://github.com/C2100-PR/website-builds.git
cd website-builds

# Install dependencies
npm install

# Link the CLI tool globally
npm link
```

## Configuration

Create a `.env` file with the following variables:

```
# Firebase Configuration
FIREBASE_PROJECT_ID=api-for-warp-drive
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account-key.json

# GoDaddy API Credentials
GODADDY_API_KEY=your_api_key
GODADDY_API_SECRET=your_api_secret
GODADDY_CONTACT={"firstName":"Your","lastName":"Name","email":"your@email.com","phone":"+1.1234567890","organization":"Your Company","addressMailing":{"address1":"123 Main St","city":"Anytown","state":"CA","postalCode":"12345","country":"US"}}

# SEO Configuration
GOOGLE_VERIFICATION_ID=your_verification_id
ENABLE_SEO=true
GENERATE_SITEMAP=true
GENERATE_ROBOTS_TXT=true

# Cloud Run Configuration
CLOUD_RUN_REGION=us-west1
DEPLOYMENT_SCRIPT=./users/asoos/deployment.sh

# Performance Settings
CONCURRENCY=3
RETRY_ATTEMPTS=5
```

## Usage

### Command Line Interface

The CLI provides an intuitive interface for all domain management operations:

```bash
# Search and purchase a domain
domain-manager purchase mycoachingbusiness --tlds=.com,.net,.org --privacy --deploy

# Deploy to an existing domain (with automatic site selection)
domain-manager deploy mydomain.com --site-type=coaching

# Deploy to a specific site
domain-manager deploy mydomain.com --site=coaching2100

# Deploy multiple domains from a file
domain-manager batch-deploy domains.txt --distribute

# List all Firebase sites with domain counts
domain-manager list-sites

# Get site recommendation for a domain
domain-manager recommend api.mydomain.com

# Check domain status
domain-manager check mydomain.com

# Validate your configuration
domain-manager validate-config
```

### Automated Site Selection

The system automatically selects the optimal Firebase Hosting site based on:

1. **Domain Pattern Matching**: Categorizes domains by pattern (e.g., `api.domain.com` goes to API sites)
2. **Available Capacity**: Distributes domains to stay within free tier limits
3. **Site Purpose Alignment**: Maps domains to appropriate site categories:
   - API domains → `api-for-warp-drive`, `api-for-warp-drive-coaching2100-com`
   - Coaching domains → `coaching2100`, `coaching2100-com`, `vision-coaching-domain`
   - Content domains → `knowledge-content`, `community-groups`
   - And more...

### GitHub Actions Integration

The project includes a complete CI/CD workflow:

```yaml
name: Domain Configuration
on:
  push:
    paths:
      - 'domains/**'
  workflow_dispatch:
    inputs:
      domain:
        description: 'Domain to configure'
        required: true
```

Simply add domains to the appropriate list in the `domains/` directory and push to trigger automatic configuration.

## Architecture

The system consists of specialized services:

1. **Domain Purchase Service**: GoDaddy API integration for purchasing and DNS setup
2. **Firebase Domain Manager**: Configures domains in Firebase Hosting
3. **Site Selector Service**: Intelligently distributes domains across all hosting sites
4. **SEO Optimization Service**: Google verification and search engine optimization
5. **Cloud Run Deployment**: Integration with your deployment script

## SEO Optimization

Each domain automatically receives:

- Google Search Console verification file
- Generated sitemap.xml with your site structure
- Optimized robots.txt
- Meta tags for social sharing and search engines
- Google Analytics integration

## Free Tier Management

The system carefully manages the ~300 domain limit across Firebase Hosting:

- Distributes domains across all 17+ hosting sites
- Reserves capacity on each site to prevent exceeding quotas
- Implements rate limiting to avoid API throttling
- Provides real-time domain count monitoring

## Troubleshooting

Common issues and solutions:

- **Domain Configuration Fails**: Check GoDaddy domain ownership and DNS propagation
- **API Rate Limiting**: System automatically retries with exponential backoff
- **Free Tier Limits**: Use `list-sites` command to check current domain counts
- **Cloud Run Deployment Issues**: Verify the deployment script has correct permissions

## License

MIT
