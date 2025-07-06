# ASOOS Payment Services Integration Gateway

## Overview

The Payment Services Integration Gateway provides a unified interface for payment processing, invoicing, and contract management within the ASOOS ecosystem. This module integrates Stripe for payment processing, Xero for accounting and invoicing, and PandaDoc for contract management and digital signatures.

### Key Features

- **Unified Payment Processing**: Secure payment processing through Stripe, supporting one-time payments and subscriptions
- **Automated Accounting**: Integration with Xero for automatic invoice generation and reconciliation
- **Contract Management**: PandaDoc integration for digital contract generation, signing, and management
- **Comprehensive Monitoring**: Built-in metrics, logging, and alerting
- **Security-First Design**: End-to-end encryption, authentication, and authorization
- **Scalable Architecture**: Built on GCP Cloud Run for auto-scaling and high availability
- **FMS Integration**: Complete audit logging to the Flight Memory System (FMS)

## Setup and Installation

### Prerequisites

- Node.js 18.x or higher
- npm 8.x or higher
- GCP account with access to the `asoos-payment` namespace
- Stripe, Xero, and PandaDoc accounts with API credentials
- Access to the ASOOS Firestore database
- Access to SallyPort authentication system

### Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/aixtiv/asoos.git
   cd asoos/integration-gateway/integrations/payment-services
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on the provided `.env.example`:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration values
   ```

4. Set up development secrets:
   ```bash
   npm run secrets:setup
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. For local webhook testing, use the Stripe CLI:
   ```bash
   npm run stripe:listen
   ```

## Configuration Guide

### Environment Variables

The service is configured primarily through environment variables. Key variables include:

- **Core Configuration**
  - `NODE_ENV`: Environment (development, staging, production)
  - `GCP_PROJECT_ID`: Google Cloud Project ID
  - `GCP_REGION`: Google Cloud Region (defaults to us-west1)
  - `PORT`: Server port (defaults to 8080)

- **Stripe Configuration**
  - `STRIPE_PUBLIC_KEY`: Stripe publishable key
  - `STRIPE_SECRET_KEY`: Stripe secret key
  - `STRIPE_WEBHOOK_SECRET`: Webhook signing secret
  - `STRIPE_API_VERSION`: API version (defaults to 2025-01-01)

- **Xero Configuration**
  - `XERO_CLIENT_ID`: Xero OAuth2 client ID
  - `XERO_CLIENT_SECRET`: Xero OAuth2 client secret
  - `XERO_REDIRECT_URI`: OAuth2 redirect URI
  - `XERO_SCOPES`: Comma-separated OAuth scopes
  - `XERO_TENANT_ID`: Xero tenant ID (optional)

- **PandaDoc Configuration**
  - `PANDADOC_API_KEY`: PandaDoc API key
  - `PANDADOC_CLIENT_ID`: PandaDoc client ID
  - `PANDADOC_CLIENT_SECRET`: PandaDoc client secret
  - `PANDADOC_API_URL`: PandaDoc API URL

- **Security Configuration**
  - `SALLYPORT_AUTH_ENDPOINT`: SallyPort authentication endpoint
  - `TOKEN_VERIFICATION_SECRET`: JWT verification secret
  - `PAYMENT_GATEWAY_ENCRYPTION_KEY`: Encryption key for sensitive data

- **Monitoring Configuration**
  - `MONITORING_ENABLED`: Enable monitoring (true/false)
  - `LOG_LEVEL`: Logging level (debug, info, warn, error)
  - `ALERT_EMAIL`: Email for alerts

### Configuration Files

The following configuration files can be customized for advanced settings:

- `config/service.config.js`: Central service configuration
- `stripe/config/stripe.config.js`: Stripe-specific configuration
- `xero/config/xero.config.js`: Xero-specific configuration
- `pandadoc/config/pandadoc.config.js`: PandaDoc-specific configuration
- `monitoring/logging.config.js`: Logging configuration
- `monitoring/monitoring.config.js`: Monitoring and metrics configuration
- `monitoring/alerts.config.js`: Alert configuration

## API Documentation

### Payment API Endpoints

#### Create Payment Intent

```
POST /api/payments
```

**Request Body:**
```json
{
  "amount": 100.00,
  "currency": "USD",
  "customer_id": "cus_123456789",
  "payment_methods": ["card"],
  "description": "Product purchase",
  "metadata": {
    "order_id": "order_123",
    "product_id": "prod_123"
  },
  "receipt_email": "customer@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment_intent_id": "pi_123456789",
    "client_secret": "pi_123456789_secret_123456789",
    "amount": 100.00,
    "currency": "USD",
    "status": "requires_payment_method"
  }
}
```

#### Get Payment Intent

```
GET /api/payments/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "pi_123456789",
    "amount": 100.00,
    "currency": "USD",
    "status": "succeeded",
    "payment_method": "pm_123456789",
    "created": 1683000000,
    "customer": "cus_123456789",
    "metadata": {
      "order_id": "order_123",
      "product_id": "prod_123"
    }
  }
}
```

#### Confirm Payment Intent

```
POST /api/payments/:id/confirm
```

**Request Body:**
```json
{
  "payment_method": "pm_123456789",
  "return_url": "https://asoos-2100-com.firebaseapp.com/payment/success"
}
```

#### Create Refund

```
POST /api/payments/refund
```

**Request Body:**
```json
{
  "payment_intent": "pi_123456789",
  "amount": 50.00,
  "reason": "requested_by_customer"
}
```

### Subscription API Endpoints

#### Create Subscription

```
POST /api/subscriptions
```

**Request Body:**
```json
{
  "customer": "cus_123456789",
  "items": [
    {
      "price": "price_123456789",
      "quantity": 1
    }
  ],
  "trial_period_days": 14,
  "metadata": {
    "user_id": "user_123",
    "plan_name": "Premium"
  }
}
```

#### Get Subscription

```
GET /api/subscriptions/:id
```

#### Update Subscription

```
POST /api/subscriptions/:id/update
```

**Request Body:**
```json
{
  "cancel_at_period_end": true,
  "proration_behavior": "create_prorations",
  "metadata": {
    "updated_by": "admin_123"
  }
}
```

For a complete API reference, see the [API Documentation](https://docs.asoos-2100-com.firebaseapp.com/api/payment-services).

## Deployment Process

### Deploying to GCP Cloud Run

The service is deployed to Google Cloud Run in the `us-west1` region. The deployment process is automated using the provided scripts:

1. Ensure you have the Google Cloud SDK installed and configured.

2. Build and test the service:
   ```bash
   npm run build
   ```

3. Deploy to production:
   ```bash
   npm run deploy:prod
   ```

Alternatively, you can use the deployment configuration directly:

```bash
gcloud run deploy payment-services-gateway \
  --source . \
  --region us-west1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account payment-services-sa@${PROJECT_ID}.iam.gserviceaccount.com
```

### CI/CD Integration

The service is integrated with GitHub Actions for CI/CD. Each push to the main branch triggers:

1. Linting and testing
2. Building the container image
3. Deploying to staging environment
4. Running integration tests
5. Promoting to production (if all tests pass)

See `.github/workflows/payment-services-ci.yml` for details.

## Security Considerations

### Authentication and Authorization

All API endpoints are protected by SallyPort authentication. The following roles are supported:

- `payment_admin`: Full access to all payment operations
- `payment_processor`: Can create and manage payments
- `payment_viewer`: Read-only access to payment data
- `subscription_admin`: Full access to subscription operations
- `subscription_manager`: Can create and manage subscriptions
- `subscription_viewer`: Read-only access to subscription data
- `refund_processor`: Can process refunds
- `dispute_handler`: Can handle disputes
- `system_monitor`: Can access health and monitoring endpoints

### Data Security

- All sensitive data is encrypted at rest and in transit
- Payment information is never stored directly; only references to Stripe objects
- Webhook signatures are verified to prevent tampering
- API keys and secrets are stored in Google Secret Manager
- Input validation is applied to all endpoints
- Content Security Policy (CSP) headers are set to prevent XSS attacks
- Rate limiting is applied to prevent abuse

### Compliance

The service follows PCI DSS compliance requirements by:

- Never storing sensitive card data
- Using Stripe Elements for secure card collection
- Implementing proper authentication and authorization
- Maintaining audit logs of all transactions
- Regular security scanning and testing

## Monitoring and Logging

### Metrics and Monitoring

The service exports the following metrics to Google Cloud Monitoring:

- `payment_services.transaction.count`: Count of payment transactions
- `payment_services.transaction.value`: Value of payment transactions
- `payment_services.transaction.latency`: Latency of payment processing
- `payment_services.transaction.error_rate`: Error rate of payment transactions
- `payment_services.transaction.success_rate`: Success rate of payment transactions
- `payment_services.stripe.webhook.latency`: Latency of webhook processing
- `payment_services.stripe.api.call_count`: Count of Stripe API calls

These metrics are displayed on the `payment-services-dashboard` in Google Cloud Monitoring.

### Alerting

Alerts are configured for:

- High error rates (> 5%)
- Service unavailability
- High latency (> 5 seconds)

Alerts are sent to the configured email address and Slack channel.

### Logging

Logs are structured in JSON format and include:

- Transaction details (with sensitive data redacted)
- Webhook event processing
- Authentication and authorization events
- Error details with stack traces (in development)
- Request/response metadata (without sensitive information)

In production, logs are sent to Google Cloud Logging. In development, logs are output to the console and log files.

### Audit Logging

All financial transactions are logged to the Flight Memory System (FMS) for audit purposes. Each log entry includes:

- Transaction ID
- User ID
- Timestamp
- Action type
- Amount and currency
- Status
- IP address and user agent
- Related entities (order, product, subscription)

## Troubleshooting Guide

### Common Issues

#### Webhook Processing Failures

**Symptoms:** Webhook events are received but not properly processed. Look for `webhook.failed` events in the logs.

**Solutions:**
1. Verify webhook signature secret is correctly configured
2. Check that the webhook URL is correctly registered in Stripe
3. Ensure the service has connectivity to required services
4. Check for any validation errors in the webhook payload

#### Payment Processing Errors

**Symptoms:** Payments fail with error codes. Look for `payment.failed` events in the logs.

**Solutions:**
1. Check the specific error code from Stripe (e.g., `card_declined`, `insufficient_funds`)
2. Verify the customer has a valid payment method
3. Ensure the amount is within acceptable limits
4. Check for any currency mismatches

#### Authentication Issues

**Symptoms:** API requests fail with 401 or 403 status codes.

**Solutions:**
1. Verify SallyPort authentication is properly configured
2. Check that the user has the required roles
3. Ensure the token is valid and not expired
4. Verify the API key is correctly provided in the request

### Diagnostic Tools

- **Health Check Endpoint:** `/health` provides the current status of the service and its dependencies
- **Metrics Endpoint:** `/metrics` provides real-time metrics for monitoring
- **Logs:** Check Cloud Logging or local log files for detailed error information
- **Stripe Dashboard:** Use the Stripe Dashboard to verify payment status and details
- **Xero Dashboard:** Use the Xero Dashboard to verify invoice status
- **PandaDoc Dashboard:** Use the PandaDoc Dashboard to verify document status

### Support

For issues with the payment services integration, contact:

- **Technical Support:** support@asoos-2100-com.firebaseapp.com
- **Emergency Issues:** emergency@asoos-2100-com.firebaseapp.com or call the on-call engineer at +1-555-123-4567
- **Slack Channel:** #payment-services-support

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

© 2025 Aixtiv Symphony Orchestrating Operating System. All rights reserved.

# Payment Services Integration Gateway

## Overview
The Payment Services Integration Gateway provides a unified interface for payment processing, invoicing, and contract management within the ASOOS ecosystem. This module integrates Stripe for payment processing, Xero for accounting and invoicing, and PandaDoc for contract management and digital signatures.

## Directory Structure
```
/integrations/payment-services/
├── .env.example                # Environment variables template
├── config.js                   # Main configuration orchestrator
├── README.md                   # This documentation file
├── stripe/                     # Stripe payment processing integration
│   ├── api/                    # API endpoints for Stripe integration
│   ├── core/                   # Core Stripe business logic
│   ├── webhooks/               # Webhook handlers for Stripe events
│   ├── services/               # Service abstraction layer
│   └── config/                 # Stripe-specific configuration
│       └── stripe.config.js
├── xero/                       # Xero accounting integration
│   ├── api/                    # API endpoints for Xero integration
│   ├── core/                   # Core Xero business logic
│   ├── webhooks/               # Webhook handlers for Xero events
│   ├── services/               # Service abstraction layer
│   └── config/                 # Xero-specific configuration
│       └── xero.config.js
└── pandadoc/                   # PandaDoc contract management integration
    ├── api/                    # API endpoints for PandaDoc integration
    ├── core/                   # Core PandaDoc business logic
    ├── webhooks/               # Webhook handlers for PandaDoc events
    ├── services/               # Service abstraction layer
    └── config/                 # PandaDoc-specific configuration
        └── pandadoc.config.js
```

## Integration Workflow
1. **Payment Processing (Stripe)**
   - Handles payment intents, subscriptions, and one-time charges
   - Processes webhook events from Stripe
   - Integrates with e-commerce for order status updates

2. **Accounting Integration (Xero)**
   - Creates and manages invoices based on payment events
   - Synchronizes customer contacts between ASOOS and Xero
   - Reconciles payments with invoices automatically

3. **Document Management (PandaDoc)**
   - Generates contracts and agreements based on subscription events
   - Processes document signing workflows
   - Validates digital signatures and handles document lifecycle

## Security Considerations
- All API keys and credentials are stored securely in environment variables
- SallyPort authentication is enforced for all endpoints
- Webhook payloads are verified using signature validation
- All financial transactions are audit-logged to the FMS (Flight Memory System)

## Setting Up the Integration
1. Copy the `.env.example` file to `.env`
2. Configure all required environment variables with actual credentials
3. Ensure the necessary GCP services are provisioned in us-west1 region
4. Run the integration tests to verify connectivity to all services
5. Deploy the gateway using the CI/CD pipeline

## Integration Points
- **Dr. Grant Authenticator**: For user authentication and role verification
- **E-commerce Module**: For order and product entitlement updates
- **FMS (Flight Memory System)**: For audit logging of all financial transactions

## Monitoring and Alerts
- Payment processing errors trigger alerts via configured channels
- Failed webhook deliveries are logged and retried automatically
- Critical reconciliation errors are escalated to the operations team

## Technical Support
For issues related to the payment integration gateway, contact the Symphony support team at support@asoos-2100-com.firebaseapp.com or raise a ticket in the internal support system.

