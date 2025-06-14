#!/bin/bash

# Script to set up Claude MAX API integration for Aixtiv CLI
echo "======================================================"
echo "Setting up Claude 4.0 MAX API integration for Aixtiv CLI"
echo "======================================================"

# Check if CLAUDE_MAX_API_KEY is already set
if [ -z "$CLAUDE_MAX_API_KEY" ]; then
  # Ask for API key if not already set
  echo -n "Enter your Claude.ai MAX API key: "
  read -s API_KEY
  echo ""
  
  if [ -z "$API_KEY" ]; then
    echo "Error: API key is required."
    exit 1
  fi
  
  # Export the API key to the current session
  export CLAUDE_MAX_API_KEY="$API_KEY"
  
  # Save to GCP Secret Manager
  echo -n "Do you want to save the API key to Google Cloud Secret Manager? (y/n): "
  read SAVE_TO_GCP
  
  if [ "$SAVE_TO_GCP" = "y" ] || [ "$SAVE_TO_GCP" = "Y" ]; then
    echo "Saving API key to Google Cloud Secret Manager..."
    echo -n "$API_KEY" | gcloud secrets create claude-max-key --data-file=- --project=api-for-warp-drive 2>/dev/null || \
    echo -n "$API_KEY" | gcloud secrets versions add claude-max-key --data-file=- --project=api-for-warp-drive
    
    if [ $? -eq 0 ]; then
      echo "API key successfully saved to GCP Secret Manager as 'claude-max-key'"
    else
      echo "Failed to save API key to GCP Secret Manager."
    fi
  fi
  
  # Add to .env file for persistence
  echo -n "Do you want to save the API key to your .env file? (y/n): "
  read SAVE_TO_ENV
  
  if [ "$SAVE_TO_ENV" = "y" ] || [ "$SAVE_TO_ENV" = "Y" ]; then
    ENV_FILE="/Users/as/asoos/integration-gateway/.env"
    if grep -q "CLAUDE_MAX_API_KEY" "$ENV_FILE"; then
      # Replace existing line
      sed -i '' "s/^CLAUDE_MAX_API_KEY=.*/CLAUDE_MAX_API_KEY=$API_KEY/g" "$ENV_FILE"
    else
      # Add new line
      echo "\n# Claude.ai MAX API Key" >> "$ENV_FILE"
      echo "CLAUDE_MAX_API_KEY=$API_KEY" >> "$ENV_FILE"
    fi
    echo "API key added to $ENV_FILE"
  else
    echo "Remember to set the CLAUDE_MAX_API_KEY environment variable before using Claude MAX."  
  fi
else
  echo "CLAUDE_MAX_API_KEY is already set in your environment."
fi

# Test the API connection
echo "Testing connection to Claude MAX API..."

TEST_RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "anthropic-api-key: $CLAUDE_MAX_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-opus-20240229",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Hello Claude"}]
  }' \
  https://api.anthropic.com/v1/messages)

if [ "$TEST_RESULT" = "200" ]; then
  echo "Success! Connected to Claude MAX API."
  
  # Create an alias for the command with MAX tokens
  echo "Creating alias for easy access with maximum token limits..."
  ALIAS_LINE="alias claude-max=\"ANTHROPIC_API_KEY=\$CLAUDE_MAX_API_KEY CLAUDE_MODEL_MAX_TOKENS=200000 node /Users/as/asoos/aixtiv-cli/bin/aixtiv.js claude:code:generate\""
  
  # Add alias to .zshrc if not already present
  if ! grep -q "alias claude-max" "$HOME/.zshrc"; then
    echo "$ALIAS_LINE" >> "$HOME/.zshrc"
    echo "Added 'claude-max' alias to your .zshrc file."
    echo "Restart your terminal or run 'source ~/.zshrc' to use it."
  fi
  
  # Create a custom function to handle Claude MAX requests with full token limit
  FUNCTION_TEXT="\n# Claude MAX function with maximum token limit\nfunction claude-max-full() {\n  ANTHROPIC_API_KEY=\$CLAUDE_MAX_API_KEY \\\n  CLAUDE_MODEL=\"claude-3-opus-20240229\" \\\n  CLAUDE_MAX_TOKENS=200000 \\\n  node /Users/as/asoos/aixtiv-cli/bin/aixtiv.js claude:code:generate -t \"\$*\"\n}"
  
  # Add function to .zshrc if not already present
  if ! grep -q "function claude-max-full" "$HOME/.zshrc"; then
    echo "$FUNCTION_TEXT" >> "$HOME/.zshrc"
    echo "Added 'claude-max-full' function to your .zshrc file."
  fi
else
  echo "Warning: Could not connect to Claude MAX API. HTTP status: $TEST_RESULT"
  echo "Please check your API key and try again."
fi

# Create a script to update the Anthropic adapter to use max tokens
SCRIPT_PATH="/Users/as/asoos/integration-gateway/update-anthropic-max-tokens.js"
cat > "$SCRIPT_PATH" << 'EOL'
const fs = require('fs');
const path = require('path');

// Path to the Anthropic adapter file
const adapterPath = path.join(__dirname, 'dist/adapters/llm-adapters/anthropic-adapter.js');

try {
  if (fs.existsSync(adapterPath)) {
    let content = fs.readFileSync(adapterPath, 'utf8');
    
    // Update the claude-3-opus model mapping to use the maximum token limit
    const updated = content.replace(
      /['"](claude-3-opus[^'"]*)['"]:\s*{\s*name:\s*['"](claude-3-opus-[^'"]*)['"],\s*max_tokens:\s*\d+,/g,
      '"$1": { name: "$2", max_tokens: 200000,'
    );
    
    fs.writeFileSync(adapterPath, updated);
    console.log(`Updated Claude 3 Opus token limit to 200,000 in ${adapterPath}`);
  } else {
    console.error(`Anthropic adapter file not found at ${adapterPath}`);
  }
} catch (error) {
  console.error('Error updating Anthropic adapter:', error);
}
EOL

# Run the script to update the adapter
if [ -f "$SCRIPT_PATH" ]; then
  echo "Updating Anthropic adapter to use max token limit..."
  node "$SCRIPT_PATH"
  chmod +x "$SCRIPT_PATH"
fi

echo ""
echo "======================================================"
echo "Setup complete!"
echo "Try generating code with: ANTHROPIC_API_KEY=$CLAUDE_MAX_API_KEY CLAUDE_MODEL=claude-3-opus-20240229 aixtiv claude:code:generate -t \"Create a simple Node.js server\""
echo "Or use the alias (after restarting terminal): claude-max -t \"Create a simple Node.js server\""
echo "For full token limit: claude-max-full Create a comprehensive application with authentication, database, and frontend"
echo "======================================================"

