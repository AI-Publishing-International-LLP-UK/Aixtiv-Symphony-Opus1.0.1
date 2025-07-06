#!/bin/bash

# Universal 2100.Cool Multi-Site Deployment Script
# Leverages existing GoDaddy DNS infrastructure and Firebase high-speed pipeline

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config/2100-cool-sites.json"
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
BASE_DOMAIN="2100.cool"

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

# Load site configuration
load_config() {
    if [[ ! -f "$CONFIG_FILE" ]]; then
        error_exit "Configuration file not found: $CONFIG_FILE"
    fi
    
    if ! python3 -c "import json; json.load(open('$CONFIG_FILE'))" 2>/dev/null; then
        error_exit "Invalid JSON in configuration file: $CONFIG_FILE"
    fi
    
    success "Configuration loaded from: $CONFIG_FILE"
}

# Get site information from config
get_site_info() {
    local site_key="$1"
    local field="$2"
    
    python3 -c "
import json
with open('$CONFIG_FILE') as f:
    config = json.load(f)
if '$site_key' in config['sites']:
    print(config['sites']['$site_key'].get('$field', ''))
else:
    exit(1)
"
}

# List all available sites
list_sites() {
    info "🌐 Available 2100.Cool Sites:"
    echo
    
    python3 -c "
import json
with open('$CONFIG_FILE') as f:
    config = json.load(f)

print(f\"{'Site':<15} {'Status':<10} {'Domain':<25} {'Lead Agent':<12} {'Category'}\")
print('─' * 80)

for site_key, site in config['sites'].items():
    status_color = '\033[0;32m' if site['status'] == 'active' else '\033[1;33m'
    reset_color = '\033[0m'
    print(f\"{site_key:<15} {status_color}{site['status']:<10}{reset_color} {site['subdomain']:<25} {site['lead_agent']:<12} {site['category']}\")
"
    echo
}

# Check prerequisites
check_prerequisites() {
    info "🔍 Checking prerequisites for 2100.Cool deployment..."
    
    # Check Firebase CLI
    if ! command -v firebase &> /dev/null; then
        error_exit "Firebase CLI not installed. Install with: npm install -g firebase-tools"
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        error_exit "Python 3 not found"
    fi
    
    # Check Firebase authentication
    if ! firebase projects:list &> /dev/null; then
        error_exit "Not authenticated with Firebase. Run: firebase login"
    fi
    
    # Check project access
    if ! firebase use "$PROJECT_ID" &> /dev/null; then
        error_exit "Cannot access Firebase project: $PROJECT_ID"
    fi
    
    success "Prerequisites check passed"
}

# Create site directory structure
create_site_structure() {
    local site_key="$1"
    local target_path=$(get_site_info "$site_key" "target_path")
    
    if [[ -z "$target_path" ]]; then
        error_exit "No target path configured for site: $site_key"
    fi
    
    info "📁 Creating site structure for: $site_key"
    mkdir -p "$SCRIPT_DIR/$target_path"
    success "Site structure created: $target_path"
}

# Generate site content from template
generate_site_content() {
    local site_key="$1"
    local site_subdomain=$(get_site_info "$site_key" "subdomain")
    local site_description=$(get_site_info "$site_key" "description")
    local site_category=$(get_site_info "$site_key" "category")
    local lead_agent=$(get_site_info "$site_key" "lead_agent")
    local target_path=$(get_site_info "$site_key" "target_path")
    local source_path=$(get_site_info "$site_key" "source_path")
    
    info "🎨 Generating content for: $site_key"
    
    # If source exists, use it; otherwise generate from base template
    if [[ -f "$SCRIPT_DIR/$source_path" ]]; then
        info "Using existing source: $source_path"
        cp "$SCRIPT_DIR/$source_path" "$SCRIPT_DIR/$target_path/index.html"
    else
        info "Generating from base template for: $site_key"
        
        # Create customized content based on the base ASOOS template
        cat > "$SCRIPT_DIR/$target_path/index.html" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$site_description - 2100.Cool</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Montserrat', sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            color: #ffffff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            max-width: 800px;
            padding: 40px;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .logo {
            font-size: 48px;
            font-weight: 900;
            background: linear-gradient(135deg, #FFD700, #c7b299, #50C878, #0bb1bb);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 20px;
        }
        .title {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 15px;
            color: #0bb1bb;
        }
        .description {
            font-size: 18px;
            color: #aaa;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        .category {
            display: inline-block;
            background: rgba(11, 177, 187, 0.2);
            color: #0bb1bb;
            padding: 8px 16px;
            border-radius: 15px;
            font-size: 14px;
            margin-bottom: 20px;
        }
        .agent {
            font-size: 16px;
            color: #FFD700;
            margin-bottom: 30px;
        }
        .coming-soon {
            background: linear-gradient(135deg, #0bb1bb, #50C878);
            color: black;
            padding: 15px 30px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            transition: transform 0.3s;
        }
        .coming-soon:hover {
            transform: translateY(-2px);
        }
        .footer {
            margin-top: 40px;
            font-size: 14px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">2100.Cool</div>
        <h1 class="title">$site_description</h1>
        <div class="category">$site_category</div>
        <p class="description">
            Welcome to $site_subdomain - part of the 2100.Cool ecosystem. 
            This platform is designed to deliver cutting-edge solutions 
            in the $site_category space.
        </p>
        <div class="agent">Lead Agent: $lead_agent</div>
        <a href="https://asoos.2100.cool" class="coming-soon">
            Explore ASOOS Platform
        </a>
        <div class="footer">
            <p>Part of the Aixtiv Symphony Orchestrating Operating System</p>
            <p>© 2025 AI Publishing International LLP. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
EOF
    fi
    
    success "Content generated for: $site_key"
}

# Deploy site to Firebase
deploy_site() {
    local site_key="$1"
    local firebase_site=$(get_site_info "$site_key" "firebase_site")
    local target_name=$(get_site_info "$site_key" "target_name")
    local subdomain=$(get_site_info "$site_key" "subdomain")
    
    info "🚀 Deploying $site_key to Firebase..."
    
    cd "$SCRIPT_DIR"
    
    # Set Firebase project
    firebase use "$PROJECT_ID" || error_exit "Failed to set Firebase project"
    
    # Apply hosting target
    firebase target:apply hosting "$target_name" "$firebase_site" || warn "Failed to apply target (may not exist yet)"
    
    # Deploy to Firebase
    local message="Multi-site deployment: $site_key - $(date '+%Y-%m-%d %H:%M:%S')"
    
    if firebase deploy --only "hosting:$target_name" --message "$message"; then
        success "Deployed $site_key successfully!"
        success "🌐 Live at: https://$subdomain"
    else
        error_exit "Deployment failed for: $site_key"
    fi
}

# Verify deployment
verify_deployment() {
    local site_key="$1"
    local subdomain=$(get_site_info "$site_key" "subdomain")
    
    info "🔍 Verifying deployment for: $site_key"
    
    if curl -f -s -o /dev/null --connect-timeout 10 --max-time 30 "https://$subdomain"; then
        success "✅ $subdomain is accessible"
    else
        warn "⚠️  $subdomain may not be accessible yet (DNS propagation)"
    fi
}

# Generate Firebase configuration
generate_firebase_config() {
    info "⚙️  Generating Firebase hosting configuration..."
    
    python3 << 'EOF'
import json
import os

script_dir = os.environ['SCRIPT_DIR']
config_file = f"{script_dir}/config/2100-cool-sites.json"

with open(config_file) as f:
    config = json.load(f)

firebase_config = {
    "hosting": [],
    "functions": {
        "source": "functions",
        "runtime": "nodejs20",
        "region": config["region"]
    }
}

for site_key, site in config["sites"].items():
    if site["status"] == "active" or site["status"] == "planned":
        hosting_config = {
            "target": site["target_name"],
            "public": site["target_path"],
            "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
            "rewrites": [
                {
                    "source": "/api/**",
                    "function": "siteApi"
                },
                {
                    "source": "**",
                    "destination": "/index.html"
                }
            ],
            "headers": [
                {
                    "source": "**",
                    "headers": [
                        {
                            "key": "Content-Security-Policy",
                            "value": config["deployment_settings"]["default_security_headers"]["Content-Security-Policy"]
                        },
                        {
                            "key": "X-Frame-Options", 
                            "value": config["deployment_settings"]["default_security_headers"]["X-Frame-Options"]
                        },
                        {
                            "key": "X-Content-Type-Options",
                            "value": config["deployment_settings"]["default_security_headers"]["X-Content-Type-Options"]
                        }
                    ]
                },
                {
                    "source": "**/*.@(js|css)",
                    "headers": [
                        {
                            "key": "Cache-Control",
                            "value": config["deployment_settings"]["cache_control"]
                        }
                    ]
                }
            ]
        }
        firebase_config["hosting"].append(hosting_config)

# Write updated firebase.json
with open(f"{script_dir}/firebase-2100-cool.json", "w") as f:
    json.dump(firebase_config, f, indent=2)

print("Firebase configuration generated: firebase-2100-cool.json")
EOF
    
    success "Firebase configuration updated"
}

# Show deployment status
show_status() {
    info "📊 2100.Cool Sites Deployment Status:"
    echo
    
    python3 -c "
import json
import subprocess
import sys

try:
    with open('$CONFIG_FILE') as f:
        config = json.load(f)
    
    print(f\"{'Site':<15} {'Status':<10} {'Domain':<25} {'Deploy Status':<15} {'Live Check'}\")
    print('─' * 80)
    
    for site_key, site in config['sites'].items():
        subdomain = site['subdomain']
        
        # Check if site is live
        try:
            result = subprocess.run(['curl', '-f', '-s', '-o', '/dev/null', '--connect-timeout', '5', f'https://{subdomain}'], 
                                  capture_output=True, timeout=10)
            live_status = '✅ Live' if result.returncode == 0 else '❌ Down'
        except:
            live_status = '❓ Unknown'
        
        deploy_status = '🟢 Ready' if site['status'] == 'active' else '🟡 Planned'
        status_color = '\033[0;32m' if site['status'] == 'active' else '\033[1;33m'
        reset_color = '\033[0m'
        
        print(f\"{site_key:<15} {status_color}{site['status']:<10}{reset_color} {subdomain:<25} {deploy_status:<15} {live_status}\")
    
except Exception as e:
    print(f'Error checking status: {e}', file=sys.stderr)
    sys.exit(1)
"
    echo
}

# Main deployment function
deploy_all_sites() {
    info "🚀 Starting multi-site deployment for 2100.Cool"
    echo
    
    python3 -c "
import json
with open('$CONFIG_FILE') as f:
    config = json.load(f)
for site_key, site in config['sites'].items():
    if site['status'] == 'active':
        print(site_key)
" | while read -r site_key; do
        if [[ -n "$site_key" ]]; then
            info "🎯 Processing site: $site_key"
            create_site_structure "$site_key"
            generate_site_content "$site_key"
            deploy_site "$site_key"
            verify_deployment "$site_key"
            echo
        fi
    done
    
    success "🎉 Multi-site deployment completed!"
}

# Deploy specific site
deploy_specific_site() {
    local site_key="$1"
    
    if ! get_site_info "$site_key" "subdomain" >/dev/null 2>&1; then
        error_exit "Site not found: $site_key"
    fi
    
    info "🎯 Deploying specific site: $site_key"
    create_site_structure "$site_key"
    generate_site_content "$site_key"
    deploy_site "$site_key"
    verify_deployment "$site_key"
    
    success "🎉 Site deployment completed: $site_key"
}

# Show usage
show_usage() {
    echo -e "${BLUE}Usage: $0 [command] [options]${NC}"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  list                    List all available sites"
    echo "  status                  Show deployment status of all sites"
    echo "  deploy-all              Deploy all active sites"
    echo "  deploy <site>           Deploy specific site"
    echo "  generate-config         Generate Firebase configuration"
    echo "  check                   Check prerequisites only"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 list                 # List all sites"
    echo "  $0 deploy asoos         # Deploy asoos.2100.cool"
    echo "  $0 deploy-all           # Deploy all active sites"
    echo "  $0 status               # Check status of all sites"
    echo ""
}

# Main execution
main() {
    local command="${1:-}"
    local site_key="${2:-}"
    
    echo -e "${PURPLE}🌐 2100.Cool Multi-Site Deployment System${NC}"
    echo -e "${CYAN}Leveraging GoDaddy DNS → Firebase High-Speed Pipeline${NC}"
    echo
    
    # Load configuration first
    load_config
    
    case "$command" in
        "list")
            list_sites
            ;;
        "status")
            show_status
            ;;
        "deploy-all")
            check_prerequisites
            generate_firebase_config
            deploy_all_sites
            show_status
            ;;
        "deploy")
            if [[ -z "$site_key" ]]; then
                error_exit "Site key required for deploy command"
            fi
            check_prerequisites
            deploy_specific_site "$site_key"
            ;;
        "generate-config")
            generate_firebase_config
            ;;
        "check")
            check_prerequisites
            ;;
        "")
            show_usage
            ;;
        *)
            error_exit "Unknown command: $command"
            ;;
    esac
}

# Run main function
main "$@"
