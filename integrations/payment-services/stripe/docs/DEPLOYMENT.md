# Stripe Integration Deployment Guide

## Overview

This document provides comprehensive instructions for deploying the Stripe integration within the Aixtiv Symphony architecture. The integration follows the zero-drift model and ensures secure, quantum-resistant storage of API keys with automatic rotation.

## Architecture

The Stripe integration consists of the following components:

- **Core Service**: Manages Stripe API interactions, key storage, and rotation
- **Webhook Handler**: Securely processes incoming webhook events from Stripe
- **Configuration**: Environment-specific settings and telemetry controls
- **Monitoring**: Automated monitoring of key health and rotation status

All components are designed to work with the Aixtiv Symphony secure gateway architecture and comply with the region-specific (us-west1) requirements.

## Prerequisites

Before deployment, ensure the following prerequisites are met:

- **Stripe Account**: Active Stripe account with API access
- **API Keys**: Both test and live API keys from the Stripe Dashboard
- **Webhook Endpoint**: Configured webhook endpoint in the Stripe Dashboard
- **Signing Secret**: Webhook signing secret from Stripe
- **GitHub Repository**: Access to the project repository for secret storage
- **GCP Project**: Access to the Google Cloud project in the us-west1 region
- **Authentication**: Valid authentication credentials for the secure gateway

## Deployment Steps

### 1. API Key Configuration

#### 1.1 Store API Keys in GitHub Secrets

```bash
# For development/test environment
gh secret set STRIPE_API_KEY -b "sk_test_your_test_key_here"

# For production environment
gh secret set STRIPE_API_KEY_PROD -b "sk_live_your_live_key_here"
```

#### 1.2 Configure Secrets in Google Cloud Secret Manager

```bash
# Test environment key
gcloud secrets create stripe-api-key-test \
  --replication-policy="user-managed" \
  --locations="us-west1" \
  --data-file=<(echo -n "sk_test_your_test_key_here")

# Production environment key
gcloud secrets create stripe-api-key-live \
  --replication-policy="user-managed" \
  --locations="us-west1" \
  --data-file=<(echo -n "sk_live_your_live_key_here")
```

### 2. Integration Configuration

#### 2.1 Environment Variables

Add the following environment variables to your deployment configuration:

```
# Stripe Integration
STRIPE_API_ENDPOINT=https://api.stripe.com/v1
STRIPE_CLI_TELEMETRY_OPTOUT=1
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Region and Mode
STRIPE_REGION=us-west1
STRIPE_ZERO_MODE=zero-drift

# Key Rotation (in milliseconds - 90 days default)
STRIPE_KEY_ROTATION_INTERVAL=7776000000
```

#### 2.2 SecretsVault Integration

Ensure the SecretsVault is properly configured with the following permissions:

```bash
# Grant access to Secret Manager
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:your-service-account@your-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Webhook Configuration

#### 3.1 Configure Webhook in Stripe Dashboard

1. Go to the Stripe Dashboard → Developers → Webhooks
2. Add an endpoint with URL: `https://your-domain.com/webhooks/stripe`
3. Select the events you want to receive
4. Copy the signing secret for the next step

#### 3.2 Deploy Webhook Handler

1. Configure the webhook handler with the signing secret:

```typescript
// In your application initialization
import { StripeWebhookHandler } from 'integrations/payment-services/stripe';

const webhookHandler = new StripeWebhookHandler(
  stripeService,
  secretsVault,
  {
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    region: process.env.STRIPE_REGION || 'us-west1',
    zeroMode: 'zero-drift'
  }
);

webhookHandler.setEndpointSecret(process.env.STRIPE_WEBHOOK_SECRET);
```

2. Configure the Express route:

```typescript
app.post('/webhooks/stripe', webhookHandler.createHandler());
```

### 4. Key Rotation Setup

#### 4.1 Configure Automatic Key Rotation

Key rotation is handled automatically by the `StripeService` when initialized with `keyRotationEnabled: true`.

For manual rotation using Aixtiv CLI:

```bash
aixtiv claude:secrets -a rotate-api-key -k stripe-api-key-test
```

#### 4.2 Configure Rotation Monitoring

Deploy the monitoring configuration:

```bash
cd /Users/as/asoos/opus/opus1.0.1
npm run deploy:monitoring:stripe
```

### 5. CI/CD Configuration

#### 5.1 GitHub Actions Workflow

Add the following to your GitHub Actions workflow:

```yaml
jobs:
  deploy_stripe_integration:
    name: Deploy Stripe Integration
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Configure Stripe CLI
        env:
          STRIPE_API_KEY: ${{ secrets.STRIPE_API_KEY }}
          STRIPE_DEVICE_NAME: "asoos-ci-${{ github.run_id }}"
          STRIPE_CLI_TELEMETRY_OPTOUT: "1"
        run: |
          curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg > /dev/null
          echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
          sudo apt update
          sudo apt install stripe
      
      - name: Run tests
        run: npm test -- --testPathPattern=integrations/payment-services/stripe
      
      - name: Deploy
        run: npm run deploy:stripe
```

#### 5.2 Deployment Script

Add the following to your package.json:

```json
{
  "scripts": {
    "deploy:stripe": "node scripts/deploy-stripe-integration.js",
    "deploy:monitoring:stripe": "node scripts/deploy-stripe-monitoring.js"
  }
}
```

### 6. Verification and Testing

#### 6.1 Verify Deployment

After deployment, verify the integration is working correctly:

```bash
# Check service health
curl https://your-domain.com/api/health/stripe

# Verify webhook configuration (admin only)
curl https://your-domain.com/api/admin/stripe/webhook/verify
```

#### 6.2 Test Key Rotation

Manually trigger a key rotation to verify the process:

```bash
# Using Aixtiv CLI
aixtiv claude:secrets -a rotate-api-key -k stripe-api-key-test

# Using API (admin only)
curl -X POST https://your-domain.com/api/admin/stripe/rotate-key
```

## Security Considerations

### Secure Key Handling

- Never log or expose API keys in application code
- Always use the SecretsVault for key access
- Restrict key access to only the necessary services
- Enable audit logging for all key accesses

### Webhook Security

- Always verify webhook signatures
- Use HTTPS for webhook endpoints
- Implement IP allowlists in production
- Follow the zero-drift model for webhook handling

### Key Rotation

- Automate key rotation on a regular schedule (default: 90 days)
- Monitor for rotation failures
- Have a backup key available during rotation
- Test the rotation process regularly

## Troubleshooting

### Common Issues

#### API Key Issues

- **Expired Key**: Verify API key is valid in the Stripe Dashboard
- **Wrong Key Type**: Ensure test keys are used in development and live keys in production
- **Rotation Failure**: Check rotation logs in Cloud Logging

#### Webhook Issues

- **Signature Verification Failure**: Verify the webhook secret matches Stripe's Dashboard
- **Missing Events**: Check event subscriptions in the Stripe Dashboard
- **Rate Limiting**: Adjust rate limit settings if needed

### Logs and Monitoring

- **Stripe Service Logs**: `/logs/stripe-service-*`
- **Webhook Logs**: `/logs/stripe-webhook-*`
- **Audit Logs**: Accessible through Cloud Logging with filter `resource.type="stripe-integration"`
- **Rotation Alerts**: Configured in Cloud Monitoring

## Maintenance

### Scheduled Tasks

- **Key Rotation**: Automatic every 90 days
- **Webhook Health Check**: Daily verification
- **Configuration Validation**: Weekly validation

### Update Procedures

When updating the Stripe integration:

1. Test changes in development environment
2. Update documentation
3. Deploy to staging
4. Verify with test transactions
5. Deploy to production

## Reference

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Webhook Security](https://stripe.com/docs/webhooks/signatures)
- [Key Management Best Practices](https://stripe.com/docs/keys)
- [Aixtiv Symphony Integration Guide](https://aixtiv.com/docs/symphony/integrations)

