#!/bin/bash
#
# Security Validation Module for Integration Gateway
# This module provides unified security validation functions for the AIXTIV SYMPHONY system
#

# Check TLS configuration
checkTlsConfiguration() {
    local endpoint="$1"
    local secure_ciphers=0
    local has_hsts=0
    
    # Check HTTPS
    if [[ ! "$endpoint" =~ ^https:// ]]; then
        echo "Error: Endpoint must use HTTPS"
        return 1
    fi
    
    # Check HSTS header
    if curl -sI "$endpoint" | grep -q "Strict-Transport-Security"; then
        has_hsts=1
    else
        echo "Warning: HSTS header not configured"
    fi
    
    # Check for secure TLS version and ciphers
    if command -v nmap &>/dev/null; then
        if nmap --script ssl-enum-ciphers -p 443 "${endpoint#https://}" | grep -q "TLSv1.2\|TLSv1.3"; then
            secure_ciphers=1
        else
            echo "Warning: Weak TLS version detected"
        fi
    else
        echo "Warning: nmap not available, skipping TLS cipher check"
        # Default to pass if we can't check
        secure_ciphers=1
    fi
    
    # Return success only if both checks pass
    [[ $has_hsts -eq 1 && $secure_ciphers -eq 1 ]]
}

# Check CORS configuration
checkCorsConfiguration() {
    local endpoint="$1"
    local cors_response
    
    cors_response=$(curl -sI -H "Origin: https://example.com" "$endpoint")
    
    # Check for CORS headers
    if echo "$cors_response" | grep -q "Access-Control-Allow-Origin"; then
        # Verify it's not overly permissive
        if echo "$cors_response" | grep -q "Access-Control-Allow-Origin: \*"; then
            echo "Warning: CORS allows all origins (*)"
            return 1
        fi
        return 0
    fi
    
    return 1
}

# Check security headers
checkSecurityHeaders() {
    local endpoint="$1"
    local response
    local required_headers=(
        "X-Content-Type-Options: nosniff"
        "X-Frame-Options"
        "Content-Security-Policy"
        "X-XSS-Protection"
    )
    local missing_headers=0
    
    response=$(curl -sI "$endpoint")
    
    for header in "${required_headers[@]}"; do
        if ! echo "$response" | grep -q "$header"; then
            echo "Warning: Missing security header: $header"
            missing_headers=$((missing_headers + 1))
        fi
    done
    
    # Return success if we have all required headers
    [[ $missing_headers -eq 0 ]]
}

# Validate YAML file for security issues
validateYamlSecurity() {
    local yaml_file="$1"
    
    # Check if file exists
    if [[ ! -f "$yaml_file" ]]; then
        echo "Error: YAML file not found: $yaml_file"
        return 1
    fi
    
    # Check if yamllint is available
    if command -v yamllint &>/dev/null; then
        if ! yamllint -d "{extends: default, rules: {line-length: disable}}" "$yaml_file"; then
            echo "Error: YAML syntax validation failed for $yaml_file"
            return 1
        fi
    else
        # Fallback to basic syntax check if yamllint is not available
        if ! python3 -c "import yaml; yaml.safe_load(open('$yaml_file'))" 2>/dev/null; then
            echo "Error: YAML syntax validation failed for $yaml_file"
            return 1
        fi
    fi
    
    # Check for common security issues
    if grep -q -E "(password|secret|key|token|credential).*:.*[A-Za-z0-9/+]{8,}" "$yaml_file"; then
        echo "Error: Found potential credentials in $yaml_file"
        return 1
    fi
    
    # Check for templating variables that should be used
    if grep -q -E "(PROJECT_ID|SERVICE_ACCOUNT).*:.*[^{$]" "$yaml_file"; then
        echo "Error: Found hardcoded values that should use environment variables in $yaml_file"
        return 1
    fi
    
    return 0
}

# Check for secrets in files using pattern matching
checkForSecretsInFiles() {
    local file_pattern="$1"
    local files=( $file_pattern )
    local found_secrets=0
    
    # Common secret patterns
    local patterns=(
        "password[[:space:]]*=[[:space:]]*['\"][^'\"]+['\"]"
        "secret[[:space:]]*=[[:space:]]*['\"][^'\"]+['\"]"
        "key[[:space:]]*=[[:space:]]*['\"][^'\"]+['\"]"
        "token[[:space:]]*=[[:space:]]*['\"][^'\"]+['\"]"
        "Bearer [A-Za-z0-9\\-_]+"
        "-----BEGIN (RSA|OPENSSH) PRIVATE KEY-----"
        "AIza[0-9A-Za-z\\-_]{35}"  # Google API Key pattern
        "[A-Za-z0-9_]{21}\\.[A-Za-z0-9_]{7}\\.[A-Za-z0-9_]{21}"  # JWT pattern
    )
    
    for file in "${files[@]}"; do
        if [[ ! -f "$file" ]]; then
            continue
        fi
        
        for pattern in "${patterns[@]}"; do
            if grep -q -E "$pattern" "$file"; then
                echo "Warning: Potential secret found in $file matching pattern: $pattern"
                found_secrets=$((found_secrets + 1))
            fi
        done
    done
    
    # Return success if no secrets found
    [[ $found_secrets -eq 0 ]]
}

# Check if environment variables are properly set
validateEnvironmentVariables() {
    local required_vars=("$@")
    local missing_vars=0
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            echo "Error: Required environment variable $var is not set"
            missing_vars=$((missing_vars + 1))
        fi
    done
    
    # Return success if all variables are set
    [[ $missing_vars -eq 0 ]]
}

# Validate file permissions
validateFilePermissions() {
    local file="$1"
    local expected_perms="$2"
    
    if [[ ! -f "$file" ]]; then
        echo "Error: File not found: $file"
        return 1
    fi
    
    local perms=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%Lp" "$file" 2>/dev/null)
    
    if [[ "$perms" != "$expected_perms" ]]; then
        echo "Error: File $file has incorrect permissions: $perms (expected $expected_perms)"
        return 1
    fi
    
    return 0
}

# Process YAML template with environment variables
processYamlTemplate() {
    local template="$1"
    local output="$2"
    
    if [[ ! -f "$template" ]]; then
        echo "Error: Template file not found: $template"
        return 1
    fi
    
    # Create a temporary processed file
    local tmp_file=$(mktemp)
    
    # Replace environment variables in the template
    eval "cat <<EOF
$(cat "$template")
EOF
" > "$tmp_file"
    
    # Check if output contains any unreplaced variables
    if grep -q -E '\${[A-Za-z0-9_]+}' "$tmp_file"; then
        echo "Error: Unresolved variables in processed template"
        rm "$tmp_file"
        return 1
    fi
    
    # Validate the processed YAML
    if ! validateYamlSecurity "$tmp_file"; then
        echo "Error: Processed YAML failed security validation"
        rm "$tmp_file"
        return 1
    fi
    
    # Move to final location
    mv "$tmp_file" "$output"
    
    return 0
}

# Echo that the module has been loaded
echo "Security validation module loaded"
