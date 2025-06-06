#!/bin/bash
# CI/CD Deployment Script for MCP Authorization System
# Deploys the new MCP server with OAuth 2.0 authorization to Google Cloud Run

set -euo pipefail

# Color Constants
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
SERVICE_NAME="integration-gateway-mcp"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
DOMAIN="drclaude.live"

# Logging function
log() {
    local level="$1"
    local message="$2"
    local color="${3:-$NC}"
    echo -e "${color}[${level}] $(date +'%Y-%m-%d %H:%M:%S') - ${message}${NC}"
}

# Error handling
error_exit() {
    log "ERROR" "$1" "$RED"
    exit 1
}

# Success logging
success() {
    log "SUCCESS" "$1" "$GREEN"
}

# Info logging
info() {
    log "INFO" "$1" "$BLUE"
}

# Warning logging
warn() {
    log "WARN" "$1" "$YELLOW"
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        error_exit "gcloud CLI is not installed"
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        error_exit "Docker is not installed"
    fi
    
    # Check if we're authenticated with gcloud
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        error_exit "Not authenticated with gcloud. Run 'gcloud auth login'"
    fi
    
    success "Prerequisites check passed"
}

# Setup Google Cloud configuration
setup_gcloud() {
    info "Setting up Google Cloud configuration..."
    
    # Set the project
    gcloud config set project "$PROJECT_ID" || error_exit "Failed to set project"
    
    # Enable required APIs
    info "Enabling required Google Cloud APIs..."
    gcloud services enable \
        cloudbuild.googleapis.com \
        run.googleapis.com \
        containerregistry.googleapis.com \
        secretmanager.googleapis.com \
        --project="$PROJECT_ID" || error_exit "Failed to enable APIs"
    
    success "Google Cloud configuration completed"
}

# Build and push Docker image
build_and_push() {
    info "Building and pushing Docker image..."
    
    # Create Dockerfile if it doesn't exist
    if [[ ! -f "Dockerfile" ]]; then
        info "Creating Dockerfile..."
        cat > Dockerfile << 'EOF'
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/.well-known/mcp || exit 1

# Start the application
CMD ["node", "server.js"]
EOF
    fi
    
    # Build the image using Cloud Build for better caching and security
    info "Building image with Cloud Build..."
    gcloud builds submit \
        --tag="$IMAGE_NAME" \
        --project="$PROJECT_ID" \
        --timeout=20m || error_exit "Failed to build image"
    
    success "Docker image built and pushed: $IMAGE_NAME"
}

# Create necessary secrets
setup_secrets() {
    info "Setting up secrets in Secret Manager..."
    
    # Create MCP JWT secret if it doesn't exist
    if ! gcloud secrets describe mcp-jwt-secret --project="$PROJECT_ID" &>/dev/null; then
        info "Creating MCP JWT secret..."
        openssl rand -base64 32 | gcloud secrets create mcp-jwt-secret \
            --replication-policy="automatic" \
            --data-file=- \
            --project="$PROJECT_ID" || error_exit "Failed to create MCP JWT secret"
    fi
    
    # Check for other required secrets
    local secrets=("OPENAI_API_KEY" "ANTHROPIC_API_KEY")
    for secret in "${secrets[@]}"; do
        if ! gcloud secrets describe "$secret" --project="$PROJECT_ID" &>/dev/null; then
            warn "Secret $secret not found. Please create it manually:"
            warn "echo 'your-secret-value' | gcloud secrets create $secret --data-file=-"
        fi
    done
    
    success "Secrets setup completed"
}

# Deploy to Cloud Run
deploy_service() {
    info "Deploying MCP Authorization Service to Cloud Run..."
    
    # Deploy the service
    gcloud run deploy "$SERVICE_NAME" \
        --image="$IMAGE_NAME" \
        --platform=managed \
        --region="$REGION" \
        --allow-unauthenticated \
        --port=8080 \
        --memory=2Gi \
        --cpu=2 \
        --timeout=300 \
        --concurrency=100 \
        --min-instances=1 \
        --max-instances=10 \
        --set-env-vars="
PORT=8080,
NODE_ENV=production,
MCP_ISSUER=https://$DOMAIN,
GOOGLE_CLOUD_PROJECT=$PROJECT_ID" \
        --set-secrets="
MCP_JWT_SECRET=mcp-jwt-secret:latest,
OPENAI_API_KEY=OPENAI_API_KEY:latest,
ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest" \
        --project="$PROJECT_ID" || error_exit "Failed to deploy service"
    
    # Get the service URL
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
        --platform=managed \
        --region="$REGION" \
        --format="value(status.url)" \
        --project="$PROJECT_ID")
    
    success "Service deployed successfully at: $SERVICE_URL"
}

# Setup custom domain
setup_domain() {
    info "Setting up custom domain mapping..."
    
    # Check if domain mapping already exists
    if gcloud run domain-mappings describe "$DOMAIN" \
        --region="$REGION" \
        --project="$PROJECT_ID" &>/dev/null; then
        info "Domain mapping already exists for $DOMAIN"
    else
        info "Creating domain mapping for $DOMAIN..."
        gcloud run domain-mappings create \
            --service="$SERVICE_NAME" \
            --domain="$DOMAIN" \
            --region="$REGION" \
            --project="$PROJECT_ID" || warn "Failed to create domain mapping"
    fi
    
    success "Domain setup completed"
}

# Run post-deployment tests
run_tests() {
    info "Running post-deployment tests..."
    
    # Test MCP discovery endpoint
    info "Testing MCP discovery endpoint..."
    if curl -f -s "https://$DOMAIN/.well-known/mcp" > /dev/null; then
        success "MCP discovery endpoint is accessible"
    else
        warn "MCP discovery endpoint test failed"
    fi
    
    # Test OAuth registration endpoint
    info "Testing OAuth registration endpoint..."
    if curl -f -s -X POST "https://$DOMAIN/oauth/register" \
        -H "Content-Type: application/json" \
        -d '{"client_name":"test","redirect_uris":["https://example.com"]}' > /dev/null; then
        success "OAuth registration endpoint is accessible"
    else
        warn "OAuth registration endpoint test failed"
    fi
    
    success "Post-deployment tests completed"
}

# Display deployment information
show_deployment_info() {
    info "=== DEPLOYMENT COMPLETED SUCCESSFULLY ==="
    echo
    echo "🚀 MCP Authorization Service Details:"
    echo "   Service Name: $SERVICE_NAME"
    echo "   Service URL:  $SERVICE_URL"
    echo "   Custom Domain: https://$DOMAIN"
    echo "   Project:      $PROJECT_ID"
    echo "   Region:       $REGION"
    echo
    echo "🔗 MCP Endpoints:"
    echo "   Discovery:    https://$DOMAIN/.well-known/mcp"
    echo "   OAuth Reg:    https://$DOMAIN/oauth/register"
    echo "   Authorization: https://$DOMAIN/oauth/authorize"
    echo "   Token:        https://$DOMAIN/oauth/token"
    echo "   Search:       https://$DOMAIN/mcp/search"
    echo "   Fetch:        https://$DOMAIN/mcp/fetch"
    echo
    echo "📋 Next Steps:"
    echo "   1. Test MCP server with ChatGPT: Add as custom connector"
    echo "   2. Register additional OAuth clients via the registration endpoint"
    echo "   3. Monitor logs: gcloud logs tail --follow $SERVICE_NAME"
    echo "   4. Update DNS if using custom domain"
    echo
}

# Create a simple server.js if it doesn't exist
setup_server() {
    if [[ ! -f "server.js" ]]; then
        info "Creating main server.js file..."
        cat > server.js << 'EOF'
// Main server file for MCP Authorization Service
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const MCPRoutes = require('./services/routes/mcpRoutes');
const logger = require('./services/common/logger');

const app = express();
const port = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['https://chatgpt.com', 'https://chat.openai.com', 'https://drclaude.live'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Setup MCP routes
const mcpRoutes = new MCPRoutes({
  // Add any configuration options here
});
app.use('/', mcpRoutes.getRouter());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: 'internal_server_error',
    error_description: 'An internal server error occurred'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    error_description: 'The requested resource was not found'
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  logger.info(`MCP Authorization Service running on port ${port}`);
  logger.info('Available endpoints:', {
    discovery: '/.well-known/mcp',
    registration: '/oauth/register',
    authorization: '/oauth/authorize',
    token: '/oauth/token',
    search: '/mcp/search',
    fetch: '/mcp/fetch'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});
EOF
    fi
}

# Setup package.json if needed
setup_package_json() {
    if [[ ! -f "package.json" ]]; then
        info "Creating package.json..."
        cat > package.json << 'EOF'
{
  "name": "mcp-authorization-service",
  "version": "1.0.0",
  "description": "MCP Authorization Service with OAuth 2.0 for Aixtiv Symphony",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "lint": "eslint ."
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "@google-cloud/secret-manager": "^5.0.1",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "eslint": "^8.55.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "author": "ASOOS",
  "license": "PRIVATE"
}
EOF
    fi
}

# Main deployment function
main() {
    log "START" "🚀 Starting MCP Authorization Service Deployment" "$GREEN"
    echo
    
    # Run all deployment steps
    check_prerequisites
    setup_gcloud
    setup_package_json
    setup_server
    setup_secrets
    build_and_push
    deploy_service
    setup_domain
    run_tests
    
    echo
    show_deployment_info
    
    success "🎉 MCP Authorization Service deployment completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "test")
        info "Running tests only..."
        run_tests
        ;;
    "build")
        info "Building only..."
        check_prerequisites
        setup_gcloud
        build_and_push
        ;;
    "deploy")
        info "Deploying only..."
        check_prerequisites
        setup_gcloud
        deploy_service
        ;;
    "")
        # Run full deployment
        main
        ;;
    *)
        echo "Usage: $0 [test|build|deploy]"
        echo "  test:   Run post-deployment tests only"
        echo "  build:  Build and push Docker image only"
        echo "  deploy: Deploy to Cloud Run only"
        echo "  (no args): Run full deployment pipeline"
        exit 1
        ;;
esac

