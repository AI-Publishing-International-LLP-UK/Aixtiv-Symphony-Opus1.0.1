# Cloudflare-SallyPort Integration Configuration

This document explains the comprehensive integration configuration between Cloudflare tunnels and the SallyPort authentication system for the ASOOS (Aixtiv Symphony Orchestrating Operating System).

## Overview

The `sallyport-integration.json` configuration file provides a complete setup for secure communication between Cloudflare's edge services and the SallyPort authentication framework, implementing zero-trust architecture with multi-layered security.

## Configuration Sections

### 1. Integration Info
Basic metadata about the integration:
- **name**: Human-readable name for the integration
- **version**: Configuration version for compatibility tracking
- **project_id**: Google Cloud project identifier (`api-for-warp-drive`)
- **region**: Primary deployment region (`us-west1`)

### 2. Cloudflare Tunnel Configuration

#### Required Settings
- **tunnel_id**: Unique identifier for the Cloudflare tunnel (requires environment variable `${CLOUDFLARE_TUNNEL_ID}`)
- **account_id**: Cloudflare account ID (requires environment variable `${CLOUDFLARE_ACCOUNT_ID}`)
- **zone_id**: Cloudflare zone ID for the domain (requires environment variable `${CLOUDFLARE_ZONE_ID}`)

#### Tunnel Settings
- **protocol**: Uses QUIC for improved performance and security
- **compression**: gzip compression enabled for bandwidth optimization
- **retries**: 5 automatic retry attempts for reliability
- **transport**: Auto-selection with keepalive configuration

#### Ingress Rules
Defines routing for different hostnames and paths:

1. **auth.2100.cool/sally-port/\*** → SallyPort authentication endpoints (port 8443)
2. **api.2100.cool/v1/auth/\*** → API authentication services (port 8443)
3. **secure.2100.cool/gateway/\*** → Integration Gateway secure endpoints (port 8443)
4. **\*.2100.cool** → Default routing for all subdomains (port 8080)
5. **Catch-all** → 404 status for unmatched requests

### 3. SallyPort Integration

#### Authentication Service
- **base_url**: Primary SallyPort service endpoint
- **timeout**: 30-second request timeout
- **circuit_breaker**: Protection against cascading failures

#### Verification Endpoints
Complete set of SallyPort authentication endpoints:
- `/initialize` - Start authentication process
- `/welcome` - First-time visitor onboarding
- `/verify/biometric` - Biometric verification
- `/verify/linkedin` - Professional identity verification
- `/verify/serpew` - SERPEW data verification
- `/verify/hobmidho` - Personality assessment verification
- `/verify/device` - Device trust verification
- `/continuous` - Continuous authentication monitoring
- `/refresh` - Token refresh
- `/logout` - Session termination

#### Session Management
- **Redis Cluster**: Distributed session storage across 3 zones in us-west1
- **Encryption**: All session data encrypted at rest
- **Cookie Settings**: Secure, HTTPOnly, SameSite=Strict for security

#### Zero Trust Configuration
- **Device Trust**: Fingerprinting and certificate validation
- **Network Context**: Geo-blocking and IP reputation checking
- **Behavioral Analysis**: ML-based anomaly detection

### 4. Security Mapping

#### Protected Paths
Different security levels for various endpoints:

1. **SallyPort Auth Endpoints** (`/api/auth/sally-port/*`)
   - Public access (no authentication required)
   - Used for initial authentication flow

2. **Agent Management** (`/api/v1/agents/*`)
   - Authentication required
   - Minimum trust score: 80
   - Required: biometric + device verification

3. **Admin Functions** (`/api/v1/admin/*`)
   - Authentication required
   - Minimum trust score: 95
   - Required: biometric + LinkedIn + device verification
   - Roles: admin or owner only

4. **Private Interface** (`/private/*`)
   - Authentication required
   - Minimum trust score: 85
   - Required: biometric + device verification

5. **Standard Interface** (`/interface/*`)
   - Authentication required
   - Minimum trust score: 70
   - Required: device verification only

#### Security Headers
Comprehensive security headers including:
- **CSP**: Content Security Policy with Cloudflare challenge support
- **HSTS**: Strict Transport Security with preload
- **Cross-Origin Policies**: CORP, COEP, COOP for isolation
- **Permissions Policy**: Restricts camera, microphone, geolocation

#### Rate Limiting
Tiered rate limiting by endpoint type:
- **Authentication endpoints**: 30 requests/minute
- **API endpoints**: 300 requests/minute
- **Static assets**: 1000 requests/minute

### 5. Cloudflare Features

#### Access Control
- Email domain restrictions (aixtiv.com)
- IP-based access control
- SallyPort verification requirements

#### Bot Management
- Enabled with fight mode
- Score threshold of 30
- Allowlist for verified bots and search engines

#### DDoS Protection
- High sensitivity setting
- HTTP DDoS attack protection
- Rate limiting-based DDoS mitigation

#### Page Rules
- High security for authentication endpoints
- Cache bypass for dynamic content
- Long-term caching for static assets

#### Firewall Rules
- Challenge high threat score requests to SallyPort
- JS challenge for admin endpoints
- Block excessive request rates

### 6. Monitoring and Logging

#### Analytics
- Web analytics enabled
- Zone analytics enabled
- Security analytics enabled

#### Log Destinations
1. **Google Cloud Logging**
   - Project: api-for-warp-drive
   - Log name: cloudflare-sally-port-integration

2. **Webhook Integration**
   - Endpoint: https://api.2100.cool/v1/logs/cloudflare
   - Bearer token authentication

#### Metrics Tracking
- Response time monitoring
- Error rate tracking
- Threat score distribution
- Authentication success rate
- Tunnel health status

#### Alert Configuration
- **High Error Rate**: >5% triggers Slack/email
- **Authentication Failures**: >10% triggers all channels
- **Tunnel Down**: Immediate escalation to all channels including SMS

### 7. Deployment Configuration

#### Multi-Environment Support
- **Production**: auth.2100.cool, api.2100.cool, secure.2100.cool
- **Staging**: auth-staging.2100.cool, api-staging.2100.cool
- **Development**: auth-dev.2100.cool, api-dev.2100.cool

#### Rollout Strategy
- Blue-green deployment pattern
- Health check endpoint: `/health`
- 30-second health check interval
- 5% error threshold for rollback

### 8. Disaster Recovery

#### Failover Configuration
- Automatic failover enabled
- Backup origins in us-central1 and us-east1
- 10-second health check frequency
- 3-failure threshold for failover

#### Backup Tunnels
- Primary backup in us-central1
- Secondary backup in us-east1
- Priority-based failover sequence

### 9. Compliance

#### Data Residency
- Primary region: us-west1
- Allowed regions: us-west1, us-central1, us-east1
- Data localization enforcement

#### Privacy Standards
- GDPR compliant
- CCPA compliant
- 90-day data retention
- PII encryption enforced

#### Security Standards
- SOC 2 Type II compliant
- ISO 27001 compliant
- PCI DSS not required
- HIPAA not required

## Required Environment Variables

The following environment variables must be set for the configuration to work:

```bash
# Cloudflare Configuration
export CLOUDFLARE_TUNNEL_ID="your-tunnel-id"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_ZONE_ID="your-zone-id"
export CLOUDFLARE_ZONE_ID_PROD="your-prod-zone-id"
export CLOUDFLARE_ZONE_ID_STAGING="your-staging-zone-id"
export CLOUDFLARE_ZONE_ID_DEV="your-dev-zone-id"

# Webhook Authentication
export WEBHOOK_TOKEN="your-webhook-bearer-token"
```

## Setup Instructions

### 1. Cloudflare Tunnel Setup
```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Create tunnel
cloudflared tunnel create asoos-sallyport-tunnel

# Configure credentials
sudo mkdir -p /etc/cloudflared
sudo cp ~/.cloudflared/<tunnel-id>.json /etc/cloudflared/credentials.json
```

### 2. DNS Configuration
```bash
# Add CNAME records for each hostname
cloudflared tunnel route dns asoos-sallyport-tunnel auth.2100.cool
cloudflared tunnel route dns asoos-sallyport-tunnel api.2100.cool
cloudflared tunnel route dns asoos-sallyport-tunnel secure.2100.cool
```

### 3. Service Configuration
```bash
# Create systemd service
sudo tee /etc/systemd/system/cloudflared.service > /dev/null <<EOF
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=cloudflared
ExecStart=/usr/local/bin/cloudflared tunnel --config /etc/cloudflared/config.yml run
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

## Validation and Testing

### 1. Tunnel Health Check
```bash
# Check tunnel status
cloudflared tunnel info asoos-sallyport-tunnel

# Test connectivity
curl -I https://auth.2100.cool/sally-port/health
```

### 2. Authentication Flow Test
```bash
# Test SallyPort initialization
curl -X POST https://auth.2100.cool/sally-port/initialize \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 3. Security Headers Validation
```bash
# Verify security headers
curl -I https://api.2100.cool/v1/auth/status
```

## Troubleshooting

### Common Issues

1. **Tunnel Connection Failures**
   - Verify tunnel credentials
   - Check network connectivity
   - Review firewall rules

2. **Authentication Errors**
   - Validate SallyPort service health
   - Check Redis cluster connectivity
   - Review session cookie settings

3. **High Latency**
   - Monitor origin server performance
   - Check Cloudflare edge cache hit rates
   - Review keepalive settings

### Log Analysis
```bash
# Check Cloudflare tunnel logs
sudo journalctl -u cloudflared -f

# Review Google Cloud logs
gcloud logging read "resource.type=gce_instance AND log_name=projects/api-for-warp-drive/logs/cloudflare-sally-port-integration"
```

## Security Considerations

1. **Certificate Management**
   - Use proper TLS certificates for all origins
   - Implement certificate rotation
   - Monitor certificate expiration

2. **Secret Management**
   - Store all secrets in Google Secret Manager
   - Use environment variable injection
   - Implement secret rotation policies

3. **Access Control**
   - Regularly review and update access policies
   - Monitor authentication success rates
   - Implement anomaly detection

4. **Network Security**
   - Use private networks for origin servers
   - Implement proper firewall rules
   - Monitor for suspicious traffic patterns

## Maintenance

### Regular Tasks
- Monitor tunnel health and performance
- Review and update firewall rules
- Rotate authentication tokens
- Update security headers as needed
- Review and update rate limiting thresholds

### Monitoring Dashboards
- Cloudflare Analytics dashboard
- Google Cloud Monitoring for tunnel metrics
- SallyPort authentication success rates
- Security incident tracking

This configuration provides a robust, secure, and scalable integration between Cloudflare and SallyPort authentication for the ASOOS ecosystem.
