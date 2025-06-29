# GitHub Security Configuration Guide

## 1. Customization Guide

### Token Configuration
```yaml
# Original
${{ secrets.GITHUB_TOKEN }}

# Replace with either:
${{ secrets.YOUR_CUSTOM_TOKEN }}  # For custom token
# OR keep as is for default GitHub token
```

### Email Configuration
```markdown
# Original
[your-security-email]

# Replace with:
security@yourdomain.com  # Your security contact
```

### Team Configuration
```yaml
# Original
teams: ['maintainers']

# Replace with your teams, for example:
teams: ['core-devs', 'security-team']
```

### Branch Configuration
```yaml
# Original
branches: [ main, development ]

# Customize to your branch structure:
branches: [ master, staging, dev ]  # Example
```

## 2. Configuration Steps

### Step 1: Generate Security Tokens
1. Go to GitHub Settings → Developer Settings → Personal Access Tokens
2. Click "Generate New Token"
3. Select required permissions:
   - repo (full)
   - workflow
   - admin:org
4. Copy and save the token securely

### Step 2: Configure Repository Secrets
1. Go to repository Settings → Secrets
2. Add New Repository Secret
3. Name: `SECURITY_TOKEN`
4. Value: [Your generated token]

### Step 3: Configure Branch Protection
1. Go to repository Settings → Branches
2. Add branch protection rule
3. Configure pattern: `master` (or your main branch)
4. Set required reviews: 2 (adjustable)
5. Enable required status checks

### Step 4: Set Up Teams
1. Go to repository Settings → Manage Access
2. Create teams:
   - security-team (admin access)
   - developers (write access)
   - reviewers (read access)

## 3. Testing Procedures

### Test 1: Branch Protection
```bash
# Try direct push to protected branch
git checkout master
git push origin master  # Should fail

# Create and push feature branch
git checkout -b feature/test
git push origin feature/test  # Should succeed
```

### Test 2: Review Requirements
```bash
# Create pull request workflow
1. Create branch
2. Make changes
3. Create PR
4. Attempt merge without reviews (should fail)
5. Get reviews
6. Attempt merge (should succeed)
```

### Test 3: Security Scanning
```bash
# Test security scanning
1. Add test secret to code
2. Attempt to commit
3. Verify scanner catches it
```

### Test 4: Backup Workflow
```bash
# Manual trigger of backup
gh workflow run backup.yml
# Verify backup creation
gh run list --workflow=backup.yml
```

## 4. Common Issues and Solutions

### Issue 1: Token Access Denied
```yaml
Error: Resource not accessible by integration
Solution: Check token permissions in repository settings
```

### Issue 2: Workflow Failures
```yaml
Error: workflow failed
Solution: 
1. Check logs in Actions tab
2. Verify all secrets are properly set
3. Confirm workflow syntax
```

### Issue 3: Branch Protection Bypass
```yaml
Error: Protected branch rules bypassed
Solution:
1. Enable "Include administrators"
2. Check team access levels
3. Verify branch protection patterns
```

## 5. Monitoring Setup

### Configure Alerts
```yaml
# Alert Configuration
notifications:
  email:
    recipients:
      - security@yourdomain.com
      - team@yourdomain.com
  slack:
    channel: #security-alerts
```

### Monitor Actions
1. View GitHub Actions dashboard
2. Check workflow runs
3. Review security scan results
4. Monitor backup status

## 6. Maintenance Schedule

### Daily Tasks
- Review security alerts
- Check workflow status
- Verify backups

### Weekly Tasks
- Review access logs
- Update dependencies
- Check token validity

### Monthly Tasks
- Full security audit
- Update documentation
- Review team access

## 7. Emergency Procedures

### Security Breach Response
1. Disable compromised tokens
2. Lock affected repositories
3. Review access logs
4. Restore from clean backup
5. Update security measures

### Recovery Steps
1. Generate new tokens
2. Update repository secrets
3. Verify protection rules
4. Test all workflows
5. Document incident