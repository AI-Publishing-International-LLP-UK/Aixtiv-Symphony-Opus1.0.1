#!/bin/bash
# cleanup-exploded-branches.sh
# 
# This script identifies and cleans up "exploded" Git branches, which includes:
# - Fully merged branches (local and remote)
# - Stale branches with no activity in the last 90 days
# - Temporary branches with specific prefixes
#
# The script provides options for dry run and force deletion.

# Exit on error
set -e

# Default settings
DRY_RUN=false
FORCE=false
DAYS_THRESHOLD=90
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Print colored messages
print_info() {
    echo -e "${BLUE}INFO:${NC} $1"
}

print_success() {
    echo -e "${GREEN}SUCCESS:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

# Display usage information
show_usage() {
    echo -e "${BOLD}Usage:${NC} $0 [options]"
    echo ""
    echo "Options:"
    echo "  -d, --dry-run       Show what would be deleted without actually deleting"
    echo "  -f, --force         Skip confirmation prompts and force delete branches"
    echo "  -t, --days DAYS     Set the stale threshold in days (default: $DAYS_THRESHOLD)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --dry-run                # Show what would be deleted"
    echo "  $0 --force                  # Delete without confirmation"
    echo "  $0 --days 30                # Consider branches stale after 30 days"
    echo ""
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -t|--days)
                DAYS_THRESHOLD=$2
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Get the list of protected branches that should never be deleted
get_protected_branches() {
    echo "main develop deployment-fixes master production staging"
}

# Get the list of branch prefixes that indicate temporary work
get_temporary_prefixes() {
    echo "temp- feature/ fix/ hotfix/ dependabot/"
}

# Identify fully merged branches (both local and remote)
identify_merged_branches() {
    print_info "Identifying fully merged branches..."
    
    # Get list of merged branches, excluding protected branches
    local protected_branches=$(get_protected_branches)
    local merged_branches=$(git branch --merged | grep -v "^\*" | grep -v -E "($(echo $protected_branches | tr ' ' '|'))")
    
    if [[ -z "$merged_branches" ]]; then
        print_info "No merged branches found"
        return
    fi
    
    echo "$merged_branches" | while read -r branch; do
        branch=$(echo "$branch" | tr -d '[:space:]')
        if [[ -n "$branch" ]]; then
            echo "$branch"
        fi
    done
}

# Identify stale branches (no commits in the last X days)
identify_stale_branches() {
    print_info "Identifying stale branches (no commits in the last $DAYS_THRESHOLD days)..."
    
    local protected_branches=$(get_protected_branches)
    local cutoff_date=$(date -v-${DAYS_THRESHOLD}d +%s 2>/dev/null || date --date="$DAYS_THRESHOLD days ago" +%s)
    
    # List all branches with their last commit date
    git for-each-ref --sort=committerdate refs/heads/ --format='%(refname:short) %(committerdate:unix)' | 
    while read -r branch commit_date; do
        # Skip protected branches
        if echo "$protected_branches" | grep -q -w "$branch"; then
            continue
        fi
        
        # Check if the branch is stale
        if [[ $commit_date -lt $cutoff_date ]]; then
            echo "$branch"
        fi
    done
}

# Identify branches with temporary prefixes
identify_temporary_branches() {
    print_info "Identifying branches with temporary prefixes..."
    
    local temp_prefixes=$(get_temporary_prefixes)
    local protected_branches=$(get_protected_branches)
    
    # Create a regex pattern for temporary prefixes
    local prefix_pattern=$(echo "$temp_prefixes" | tr ' ' '|' | sed 's/\//\\\//g')
    
    # Find branches with temporary prefixes
    git branch | grep -v "^\*" | grep -E "(${prefix_pattern})" | 
    while read -r branch; do
        branch=$(echo "$branch" | tr -d '[:space:]')
        
        # Skip protected branches
        if echo "$protected_branches" | grep -q -w "$branch"; then
            continue
        fi
        
        echo "$branch"
    done
}

# Clean up remote branches that no longer exist locally
cleanup_remote_tracking_branches() {
    print_info "Cleaning up remote tracking branches..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        git remote prune origin --dry-run
    else
        git remote prune origin
    fi
}

# Delete a branch locally
delete_local_branch() {
    local branch=$1
    local delete_flag="-d"
    
    # Use -D if force option is set
    if [[ "$FORCE" == "true" ]]; then
        delete_flag="-D"
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "Would delete local branch: $branch"
    else
        print_info "Deleting local branch: $branch"
        git branch $delete_flag "$branch" || {
            if [[ "$FORCE" == "true" ]]; then
                print_error "Failed to delete branch $branch even with force option"
            else
                print_warning "Branch $branch not fully merged. Use -f to force delete."
            fi
            return 1
        }
    fi
}

# Delete a branch remotely
delete_remote_branch() {
    local branch=$1
    
    # Check if branch exists on remote
    if git ls-remote --heads origin "$branch" | grep -q "$branch"; then
        if [[ "$DRY_RUN" == "true" ]]; then
            print_info "Would delete remote branch: origin/$branch"
        else
            print_info "Deleting remote branch: origin/$branch"
            git push origin --delete "$branch" || {
                print_error "Failed to delete remote branch origin/$branch"
                return 1
            }
        fi
    else
        print_info "Remote branch origin/$branch does not exist"
    fi
}

# Process a list of branches to delete
process_branches() {
    local branches=$1
    local branch_count=$(echo "$branches" | wc -l | tr -d '[:space:]')
    
    if [[ -z "$branches" || "$branch_count" -eq 0 ]]; then
        print_info "No branches to process"
        return
    fi
    
    print_info "Found $branch_count branches to process"
    echo -e "${YELLOW}Branches to delete:${NC}"
    echo "$branches"
    echo ""
    
    # Ask for confirmation unless force option is set
    if [[ "$DRY_RUN" == "false" && "$FORCE" == "false" ]]; then
        read -p "Do you want to delete these branches? (y/n): " confirm
        if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
            print_warning "Operation canceled by user"
            return
        fi
    fi
    
    # Process each branch
    echo "$branches" | while read -r branch; do
        branch=$(echo "$branch" | tr -d '[:space:]')
        if [[ -n "$branch" ]]; then
            delete_local_branch "$branch"
            delete_remote_branch "$branch"
        fi
    done
}

# Main function
main() {
    print_info "Starting cleanup of exploded branches..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_warning "DRY RUN MODE: No branches will be deleted"
    fi
    
    # Clean up remote tracking branches
    cleanup_remote_tracking_branches
    
    # Identify branches to delete
    local merged_branches=$(identify_merged_branches)
    local stale_branches=$(identify_stale_branches)
    local temp_branches=$(identify_temporary_branches)
    
    # Combine all branches, remove duplicates
    local all_branches=$(echo -e "$merged_branches\n$stale_branches\n$temp_branches" | grep -v "^$" | sort | uniq)
    
    # Process branches
    process_branches "$all_branches"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_success "Dry run completed. Run without --dry-run to actually delete branches."
    else
        print_success "Branch cleanup completed!"
    fi
}

# Parse command line arguments
parse_args "$@"

# Run main function
main

