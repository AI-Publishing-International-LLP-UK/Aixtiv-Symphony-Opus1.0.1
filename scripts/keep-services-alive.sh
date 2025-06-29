#!/bin/bash

# 🚀 24/7 Service Health Monitor & Auto-Renewal System
# Ensures all MOCOA/ASOOS services stay operational

set -e

# Configuration
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
EMAIL_ALERT="${ALERT_EMAIL:-pr@coaching2100.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Critical services that must always be running
CRITICAL_SERVICES=(
    "diamond-sao-v31"
    "integration-gateway"
    "integration-gateway-production"
    "asoos-api"
    "asoos-integration-gateway"
    "dr-claude"
    "dr-claude-01"
    "dr-claude-02" 
    "dr-claude-03"
    "academy-website"
    "aixtiv-frontend"
    "addmemory"
    "querymemories"
    "searchmemories"
    "storememory"
)

# Memory management services
MEMORY_SERVICES=(
    "addmemory"
    "querymemories" 
    "searchmemories"
    "storememory"
    "analyzememoryimportance"
    "archiveoldmemories"
    "clearsessionmemories"
    "getmemorystats"
)

# Dr Claude orchestration services  
DR_CLAUDE_SERVICES=(
    "dr-claude"
    "dr-claude-01"
    "dr-claude-02"
    "dr-claude-03"
    "drclaude"
    "scheduledagentactions"
    "processscheduledagentactions"
)

# Pinecone integration services
PINECONE_SERVICES=(
    "deletefrompinecone"
    "ensurepineconeindexes"
    "onpineconechathistorycreated"
    "onpineconepromptruncreated"
)

# Function to log with timestamp
log_with_timestamp() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to send alert
send_alert() {
    local service="$1"
    local status="$2"
    local message="$3"
    
    log_with_timestamp "${RED}🚨 ALERT: ${service} - ${status}${NC}"
    log_with_timestamp "${YELLOW}${message}${NC}"
    
    # Send Slack notification if webhook configured
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 MOCOA Alert: \`${service}\` is ${status}. ${message}\"}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
    
    # Log to file for historical tracking
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ALERT: ${service} - ${status} - ${message}" >> /tmp/service-alerts.log
}

# Function to check service health
check_service_health() {
    local service_name="$1"
    
    # Get service details
    local service_info=$(gcloud run services describe "$service_name" \
        --region="$REGION" \
        --format="value(status.url,status.conditions[0].status,status.conditions[0].reason,status.traffic[0].percent)" 2>/dev/null || echo ",,NOTFOUND,")
    
    IFS=',' read -r url status reason traffic <<< "$service_info"
    
    if [ "$status" = "True" ] && [ "$traffic" = "100" ]; then
        # Service is running, check if it responds
        if [ -n "$url" ]; then
            local http_status=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10 || echo "000")
            if [ "$http_status" = "200" ] || [ "$http_status" = "404" ] || [ "$http_status" = "403" ]; then
                log_with_timestamp "${GREEN}✅ ${service_name}: Healthy (${http_status})${NC}"
                return 0
            else
                send_alert "$service_name" "UNRESPONSIVE" "HTTP ${http_status} - Service not responding properly"
                return 1
            fi
        else
            log_with_timestamp "${GREEN}✅ ${service_name}: Running (no public URL)${NC}"
            return 0
        fi
    else
        send_alert "$service_name" "DOWN" "Status: ${status}, Reason: ${reason}, Traffic: ${traffic}%"
        return 1
    fi
}

# Function to restart service
restart_service() {
    local service_name="$1"
    
    log_with_timestamp "${YELLOW}🔄 Restarting ${service_name}...${NC}"
    
    # Get current image
    local current_image=$(gcloud run services describe "$service_name" \
        --region="$REGION" \
        --format="value(spec.template.spec.template.spec.containers[0].image)" 2>/dev/null || echo "")
    
    if [ -n "$current_image" ]; then
        # Restart by updating with same image
        gcloud run services update "$service_name" \
            --region="$REGION" \
            --image="$current_image" \
            --quiet 2>/dev/null || {
            send_alert "$service_name" "RESTART_FAILED" "Failed to restart service"
            return 1
        }
        
        log_with_timestamp "${GREEN}✅ ${service_name} restarted successfully${NC}"
        return 0
    else
        send_alert "$service_name" "RESTART_FAILED" "Could not find service image"
        return 1
    fi
}

# Function to ensure minimum instances
ensure_minimum_instances() {
    local service_name="$1"
    local min_instances="${2:-1}"
    
    log_with_timestamp "${BLUE}🔧 Ensuring ${service_name} has minimum ${min_instances} instances...${NC}"
    
    gcloud run services update "$service_name" \
        --region="$REGION" \
        --min-instances="$min_instances" \
        --max-instances="10" \
        --quiet 2>/dev/null || {
        send_alert "$service_name" "SCALING_FAILED" "Failed to set minimum instances"
        return 1
    }
    
    return 0
}

# Function to check and fix memory management services
check_memory_services() {
    log_with_timestamp "${BLUE}💾 Checking Memory Management Services...${NC}"
    
    local failed_services=()
    
    for service in "${MEMORY_SERVICES[@]}"; do
        if ! check_service_health "$service"; then
            failed_services+=("$service")
        fi
    done
    
    # Restart failed memory services
    for service in "${failed_services[@]}"; do
        restart_service "$service"
        ensure_minimum_instances "$service" 1
    done
}

# Function to check Dr Claude orchestration
check_dr_claude_services() {
    log_with_timestamp "${BLUE}🧠 Checking Dr Claude Orchestration Services...${NC}"
    
    local failed_services=()
    
    for service in "${DR_CLAUDE_SERVICES[@]}"; do
        if ! check_service_health "$service"; then
            failed_services+=("$service")
        fi
    done
    
    # Restart failed Dr Claude services
    for service in "${failed_services[@]}"; do
        restart_service "$service"
        ensure_minimum_instances "$service" 1
    done
}

# Function to check Pinecone integration
check_pinecone_services() {
    log_with_timestamp "${BLUE}🌲 Checking Pinecone Integration Services...${NC}"
    
    local failed_services=()
    
    for service in "${PINECONE_SERVICES[@]}"; do
        if ! check_service_health "$service"; then
            failed_services+=("$service")
        fi
    done
    
    # Restart failed Pinecone services
    for service in "${failed_services[@]}"; do
        restart_service "$service"
        ensure_minimum_instances "$service" 1
    done
}

# Function to optimize resource allocation
optimize_resources() {
    log_with_timestamp "${BLUE}⚡ Optimizing resource allocation...${NC}"
    
    # Critical services get more resources
    for service in "${CRITICAL_SERVICES[@]}"; do
        gcloud run services update "$service" \
            --region="$REGION" \
            --memory="1Gi" \
            --cpu="2" \
            --min-instances="2" \
            --max-instances="10" \
            --concurrency="100" \
            --quiet 2>/dev/null || true
    done
    
    # Memory services get optimized for throughput
    for service in "${MEMORY_SERVICES[@]}"; do
        gcloud run services update "$service" \
            --region="$REGION" \
            --memory="512Mi" \
            --cpu="1" \
            --min-instances="1" \
            --max-instances="5" \
            --concurrency="50" \
            --quiet 2>/dev/null || true
    done
}

# Function to generate health report
generate_health_report() {
    local report_file="/tmp/mocoa-health-report-$(date +%Y%m%d-%H%M%S).json"
    
    log_with_timestamp "${BLUE}📊 Generating health report...${NC}"
    
    # Get all services status
    gcloud run services list \
        --region="$REGION" \
        --format="json" > "$report_file"
    
    # Count healthy vs unhealthy
    local total_services=$(jq length "$report_file")
    local healthy_services=$(jq '[.[] | select(.status.conditions[0].status == "True")] | length' "$report_file")
    local unhealthy_services=$((total_services - healthy_services))
    
    log_with_timestamp "${GREEN}📈 Health Summary: ${healthy_services}/${total_services} services healthy${NC}"
    
    if [ "$unhealthy_services" -gt 0 ]; then
        log_with_timestamp "${RED}⚠️ ${unhealthy_services} services need attention${NC}"
    fi
    
    echo "$report_file"
}

# Function to setup monitoring cron job
setup_monitoring_cron() {
    log_with_timestamp "${BLUE}⏰ Setting up continuous monitoring...${NC}"
    
    # Create cron job that runs every 5 minutes
    (crontab -l 2>/dev/null || echo "") | grep -v "keep-services-alive.sh" | {
        cat
        echo "*/5 * * * * /Users/as/asoos/integration-gateway/scripts/keep-services-alive.sh --monitor >> /tmp/mocoa-monitor.log 2>&1"
        echo "0 */6 * * * /Users/as/asoos/integration-gateway/scripts/keep-services-alive.sh --optimize >> /tmp/mocoa-optimize.log 2>&1"
        echo "0 0 * * * /Users/as/asoos/integration-gateway/scripts/keep-services-alive.sh --report >> /tmp/mocoa-daily-report.log 2>&1"
    } | crontab -
    
    log_with_timestamp "${GREEN}✅ Monitoring cron jobs installed${NC}"
}

# Main execution
main() {
    case "${1:-monitor}" in
        --monitor)
            log_with_timestamp "${PURPLE}🏛️ MOCOA 24/7 Service Monitor - Starting Health Check${NC}"
            
            # Check critical services first
            for service in "${CRITICAL_SERVICES[@]}"; do
                if ! check_service_health "$service"; then
                    restart_service "$service"
                    ensure_minimum_instances "$service" 2
                fi
            done
            
            # Check specialized service groups
            check_memory_services
            check_dr_claude_services
            check_pinecone_services
            ;;
            
        --optimize)
            log_with_timestamp "${PURPLE}🏛️ MOCOA Resource Optimization${NC}"
            optimize_resources
            ;;
            
        --report)
            log_with_timestamp "${PURPLE}🏛️ MOCOA Daily Health Report${NC}"
            report_file=$(generate_health_report)
            log_with_timestamp "${GREEN}📊 Report saved to: ${report_file}${NC}"
            ;;
            
        --setup)
            log_with_timestamp "${PURPLE}🏛️ MOCOA Monitoring Setup${NC}"
            setup_monitoring_cron
            ;;
            
        --help)
            echo "MOCOA 24/7 Service Monitor"
            echo ""
            echo "Usage: $0 [option]"
            echo ""
            echo "Options:"
            echo "  --monitor    Check and restart unhealthy services (default)"
            echo "  --optimize   Optimize resource allocation for all services"
            echo "  --report     Generate comprehensive health report"
            echo "  --setup      Install monitoring cron jobs"
            echo "  --help       Show this help message"
            ;;
            
        *)
            # Default to monitoring
            main --monitor
            ;;
    esac
}

# Set project
gcloud config set project "$PROJECT_ID" --quiet

# Run main function
main "$@"

log_with_timestamp "${GREEN}🎉 MOCOA monitoring cycle completed${NC}"
