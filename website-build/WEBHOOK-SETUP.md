# GitHub Webhook Setup for Jira Integration

This guide provides detailed instructions for setting up and configuring GitHub webhooks to connect your repository with Jira. Properly configured webhooks ensure that actions in GitHub (commits, pull requests, etc.) are automatically reflected in your Jira project.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Creating a Webhook in GitHub](#creating-a-webhook-in-github)
- [Configuring the Payload URL](#configuring-the-payload-url)
- [Setting the Webhook Secret](#setting-the-webhook-secret)
- [Selecting Appropriate Events](#selecting-appropriate-events)
- [Testing the Webhook Connection](#testing-the-webhook-connection)
- [Troubleshooting Common Issues](#troubleshooting-common-issues)

## Prerequisites

Before setting up the webhook, ensure you have:

- Administrator access to the GitHub repository
- Administrator access to your Jira instance at c2100pcr.atlassian.net
- The Jira development tools application installed on your Jira instance
- Your Jira instance is accessible from the internet (for webhook deliveries)

## Creating a Webhook in GitHub

1. Navigate to your GitHub repository (C2100-PR/website-build)
2. Click on **Settings** in the top navigation bar
3. In the left sidebar, click on **Webhooks**
4. Click the **Add webhook** button
5. You may be prompted to confirm your password

## Configuring the Payload URL

The payload URL is the endpoint where GitHub will send the webhook data. For Jira integration:

1. Use the following format for your payload URL:
   ```
   https://c2100pcr.atlassian.net/rest/devinfo/0.10/webhook
   ```
   
2. If you're using the Jira DVCS Connector instead of Jira Software development tools, the URL will be:
   ```
   https://c2100pcr.atlassian.net/rest/bitbucket/1.0/webhook
   ```

3. Ensure the URL is accessible from GitHub's servers
4. Select **application/json** as the Content type

## Setting the Webhook Secret

A webhook secret creates a signature that helps Jira verify that requests are coming from GitHub:

1. Generate a secure random string to use as your secret
   ```bash
   # Example command to generate a secure secret
   openssl rand -hex 20
   ```

2. Copy this generated string
3. Paste it into the **Secret** field in the GitHub webhook configuration
4. Store this same secret in your Jira instance:
   - Navigate to Jira administration > Applications > DVCS accounts
   - Edit your GitHub connection
   - Enter the same secret in the appropriate field

## Selecting Appropriate Events

For proper Jira integration, select the following events:

1. Choose **Let me select individual events**
2. Select the following events:
   - **Pull requests** - To track PR creation, updates, and merges
   - **Pushes** - To track commits and smart commit messages
   - **Issue comments** - To track comments that may contain Jira issue keys
   - **Releases** - To track version releases (if using GitHub releases)

Alternatively, you can select **Send me everything** for complete integration, but this may result in unnecessary webhook calls.

## Testing the Webhook Connection

After setting up the webhook:

1. Complete the webhook creation by clicking **Add webhook**
2. GitHub will immediately send a ping event to your payload URL
3. Check if the ping was successful:
   - Return to the webhook page
   - Look for a green checkmark or a red X next to your webhook
   - Click on the webhook to view delivery details
   - Review the "Recent Deliveries" tab to see the ping response

4. Test the integration with a real-world scenario:
   - Create a commit with a Jira issue key in the message (e.g., "PCR-123: Test webhook integration")
   - Push the commit to GitHub
   - Check the webhook's recent deliveries to confirm the event was sent
   - Verify in Jira that the commit appears on the issue PCR-123

## Troubleshooting Common Issues

### Webhook Delivery Failures

If webhook deliveries are failing:

1. **Check the payload URL**: Ensure it's correctly formatted and accessible
2. **Verify the secret**: Make sure the secret is correctly configured in both GitHub and Jira
3. **Check Jira logs**: Look for webhook-related errors in Jira's log files
4. **Network issues**: Ensure GitHub's IP ranges can access your Jira instance
5. **Firewall settings**: Check if any firewalls are blocking the webhook calls

### Missing Data in Jira

If commits or PRs aren't showing up in Jira:

1. **Issue key format**: Ensure you're using the correct project key format (e.g., PCR-123)
2. **DVCS connector configuration**: Verify your repository is correctly linked in Jira
3. **Repository permissions**: Ensure Jira has sufficient permissions to access your repository
4. **Webhook event selection**: Confirm you've selected all necessary event types

### Authentication Issues

If you're experiencing authentication problems:

1. **OAuth tokens**: Refresh your OAuth tokens in Jira's DVCS connector
2. **Permissions**: Ensure your GitHub user has sufficient repository permissions
3. **Expired credentials**: Check if any credentials have expired and need renewal

For additional assistance, consult the [Atlassian documentation on GitHub integration](https://support.atlassian.com/jira-cloud-administration/docs/integrate-with-github/).

