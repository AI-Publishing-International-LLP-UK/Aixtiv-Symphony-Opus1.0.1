# Cloudflare-SallyPort Integration Settings Summary

## 🔧 Cloudflare Settings Included

### Required Configuration
- **Tunnel ID, Account ID, Zone ID** - Core Cloudflare identifiers
- **Credentials File Path** - `/etc/cloudflared/credentials.json`
- **Config File Path** - `/etc/cloudflared/config.yml`

### Tunnel Settings
- **Protocol**: QUIC (modern, secure protocol)
- **Compression**: gzip enabled
- **Retries**: 5 automatic attempts
- **Grace Period**: 30 seconds for graceful shutdown
- **Transport**: Auto-selection with keepalive (1m intervals)

### Ingress Rules (Path Routing)
- `auth.2100.cool/sally-port/*` → Port 8443 (SallyPort auth)
- `api.2100.cool/v1/auth/*` → Port 8443 (API auth)
- `secure.2100.cool/gateway/*` → Port 8443 (Secure gateway)
- `*.2100.cool` → Port 8080 (Default routing)
- Catch-all → 404 status

### Security Features
- **Bot Management**: Fight mode enabled, threshold 30
- **DDoS Protection**: High sensitivity, HTTP attack protection
- **Access Control**: Email domain + IP restrictions
- **Rate Limiting**: Tiered by endpoint type (30-1000 req/min)
- **Firewall Rules**: Challenge/block based on threat scores

### Page Rules
- Auth endpoints: High security, no caching
- API endpoints: High security, cache bypass
- Static assets: Cache everything (24h TTL)

### Monitoring & Analytics
- **Web Analytics**: Enabled
- **Zone Analytics**: Enabled  
- **Security Analytics**: Enabled
- **Log Destinations**: Google Cloud Logging + Webhook

## 🔐 SallyPort Settings Included

### Authentication Service
- **Base URL**: `https://auth.2100.cool/sally-port`
- **API Version**: v1
- **Timeout**: 30 seconds
- **Retry Attempts**: 3
- **Circuit Breaker**: 5 failures trigger, 60s recovery

### Verification Endpoints
- `/initialize` - Start auth process
- `/welcome` - First-time visitor flow
- `/verify/biometric` - Biometric verification
- `/verify/linkedin` - Professional identity
- `/verify/serpew` - SERPEW data validation
- `/verify/hobmidho` - Personality assessments
- `/verify/device` - Device trust verification
- `/continuous` - Ongoing auth monitoring
- `/refresh` - Token refresh
- `/logout` - Session termination

### Session Management
- **Redis Cluster**: 3-node setup across us-west1 zones
- **Encryption**: All session data encrypted
- **Compression**: Enabled for performance
- **TTL**: 3600 seconds (1 hour) default
- **Max Sessions**: 5 per user
- **Cookie Settings**: Secure, HTTPOnly, SameSite=Strict

### Zero Trust Configuration
- **Device Trust**: Fingerprinting + certificate validation
- **Geo-blocking**: Allow US, CA, GB, AU, DE, FR, JP
- **IP Reputation**: Threat intelligence, Tor/VPN blocking
- **Behavioral Analysis**: ML-based anomaly detection (0.8 threshold)

### Security Mapping
- **Protected Paths**: 5 security levels defined
- **Trust Scores**: 70-95 minimum scores by endpoint
- **Required Verifications**: Biometric, LinkedIn, device combinations
- **Role Requirements**: Admin/owner restrictions

## 🌍 Required Environment Variables

```bash
# Core Cloudflare
CLOUDFLARE_TUNNEL_ID="your-tunnel-id"
CLOUDFLARE_ACCOUNT_ID="your-account-id"
CLOUDFLARE_ZONE_ID="your-zone-id"

# Multi-Environment
CLOUDFLARE_ZONE_ID_PROD="prod-zone-id"
CLOUDFLARE_ZONE_ID_STAGING="staging-zone-id"
CLOUDFLARE_ZONE_ID_DEV="dev-zone-id"

# Webhook Integration
WEBHOOK_TOKEN="webhook-bearer-token"
```

## 🚀 Multi-Environment Support

### Production
- Tunnel: `asoos-sallyport-tunnel-prod`
- Hostnames: auth.2100.cool, api.2100.cool, secure.2100.cool

### Staging  
- Tunnel: `asoos-sallyport-tunnel-staging`
- Hostnames: auth-staging.2100.cool, api-staging.2100.cool

### Development
- Tunnel: `asoos-sallyport-tunnel-dev`
- Hostnames: auth-dev.2100.cool, api-dev.2100.cool

## 📊 Monitoring & Alerting

### Metrics Tracked
- Response time
- Error rate  
- Threat score distribution
- Authentication success rate
- Tunnel health status

### Alert Thresholds
- **High Error Rate**: >5% → Slack/Email
- **Auth Failures**: >10% → All channels + PagerDuty
- **Tunnel Down**: Immediate → All channels + SMS

## 🔄 Disaster Recovery

### Failover Setup
- **Backup Origins**: us-central1, us-east1
- **Health Checks**: 10-second frequency
- **Failover Threshold**: 3 failures
- **Backup Tunnels**: Priority-based (1: us-central1, 2: us-east1)

### Rollout Strategy
- **Type**: Blue-green deployment
- **Health Check**: `/health` endpoint
- **Check Interval**: 30 seconds
- **Rollback Threshold**: 5% error rate

## 📋 Compliance Features

### Data Residency
- **Primary Region**: us-west1
- **Allowed Regions**: us-west1, us-central1, us-east1
- **Data Localization**: Enforced

### Privacy Standards
- **GDPR**: Compliant
- **CCPA**: Compliant  
- **Data Retention**: 90 days
- **PII Encryption**: Enforced

### Security Standards
- **SOC 2 Type II**: ✅
- **ISO 27001**: ✅
- **PCI DSS**: Not required
- **HIPAA**: Not required

## 🛡️ Security Headers Applied

```
Content-Security-Policy: Comprehensive CSP with Cloudflare challenge support
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

## ⚡ Quick Start Checklist

1. ✅ Set environment variables
2. ✅ Install cloudflared binary
3. ✅ Create Cloudflare tunnel
4. ✅ Configure DNS records
5. ✅ Set up systemd service
6. ✅ Deploy configuration
7. ✅ Test authentication flow
8. ✅ Verify security headers
9. ✅ Monitor tunnel health
10. ✅ Configure alerting

This configuration provides enterprise-grade security and reliability for the Cloudflare-SallyPort integration in the ASOOS ecosystem.
