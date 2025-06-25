# OAuth2 CLI

A simple command-line tool for Google OAuth2 authentication with service accounts.

## Installation

1. Navigate to the oauth2-cli-v2 directory:
```
cd /Users/as/asoos/integration-gateway/oauth2-cli-v2
```

2. Install dependencies:
```
npm install
```

3. Make the script executable:
```
chmod +x oauth2-cli.js
```

## Usage

### Show Help
```
node oauth2-cli.js help
```

### Authenticate with a Service Account
```
node oauth2-cli.js auth ./key.json
```

### Get an Access Token
```
node oauth2-cli.js token ./key.json https://www.googleapis.com/auth/cloud-platform
```

## Creating a Service Account Key

1. Go to the Google Cloud Console: https://console.cloud.google.com/
2. Navigate to IAM & Admin > Service Accounts
3. Select your project
4. Create a service account or select an existing one
5. Go to the Keys tab
6. Click "Add Key" > "Create new key"
7. Select JSON as the key type
8. Click "Create" and the key file will be downloaded to your computer

## Using the Template

A template key file is included as `key.json.template`. Rename this file to `key.json` and replace the placeholder values with your actual service account credentials.

## Region Configuration

This tool is configured to work with the us-west1 region by default.
