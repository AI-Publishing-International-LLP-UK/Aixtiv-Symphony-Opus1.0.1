# Firebase Hosting Free Tier Guidelines

This document outlines best practices for managing domains within Firebase Hosting's free tier limits, ensuring smooth operation for our approximately 300 domains across multiple sites.

## Free Tier Limits

Firebase Hosting free tier includes:

- **Custom domains:** Up to 360 custom domains across all your Firebase Hosting sites
- **Storage:** 10GB storage total
- **Data transfer:** 360GB/month
- **Projects:** No specific limit, but domains are counted across all projects

## Domain Management Strategies

The domain manager implements the following strategies to ensure we stay within free tier limits:

### 1. Domain Count Tracking

- Checks current domain count before adding new domains
- Prevents exceeding the 360 domain limit across projects
- Provides warnings as you approach the limit

### 2. Rate Limiting

- Limits API requests to prevent being throttled by Firebase
- Spaces out domain additions to avoid hitting daily quotas
- Processes domains in batches with controlled concurrency

### 3. Quota Management

- Configurable daily domain addition limits
- Automatic scheduling of remaining domains for future processing
- Prioritizes domains based on deployment needs

## Best Practices

1. **Plan Domain Additions**
   - Add domains in small batches (25-50) rather than all at once
   - Schedule non-urgent domain additions during off-hours

2. **Monitor Usage**
   - Review domain-results-*.json files regularly
   - Check Firebase Console for current domain counts
   - Set up alerts for approaching limits

3. **Clean Up Unused Domains**
   - Regularly audit and remove unused domains
   - Run the provided cleanup script periodically: `node domain-cleanup.js`

4. **Optimize Deployments**
   - Use shared hosting configurations where possible
   - Combine similar applications under the same domain with different paths

## Daily Operation Guidelines

For day-to-day operations, follow these guidelines:

1. **Adding New Domains**
   ```bash
   # Add up to 25 domains at once
   node domain-manager.js --platform=desktop --batch-size=25 domain1.com domain2.com
   ```

2. **Checking Domain Status**
   ```bash
   # Check status of specific domains
   node domain-manager.js --check-only domain1.com domain2.com
   ```

3. **Cleaning Up Unused Domains**
   ```bash
   # List domains that haven't been accessed in 90+ days
   node domain-cleanup.js --list-inactive --days=90
   
   # Remove inactive domains
   node domain-cleanup.js --remove --days=90
   ```

## Troubleshooting

If you encounter quota issues:

1. **API Rate Limiting**
   - Increase the API throttle interval
   - Reduce concurrency settings
   - Try again after a few hours

2. **Domain Addition Failures**
   - Check error messages in domain-results-*.json
   - Verify domain ownership in GoDaddy
   - Ensure DNS records are correctly configured

3. **Exceeding Domain Limits**
   - Remove unused domains
   - Consider consolidating multiple subdomains to a single domain with path routing
   - In extreme cases, create a new Firebase project

## Monitoring Dashboard

A monitoring dashboard is available to track domain usage across projects:

```
https://console.firebase.google.com/project/[PROJECT_ID]/hosting/sites
```

Check this regularly to ensure you're staying within free tier limits.
