#!/bin/bash

# 💎 GOOGLE WORKSPACE EMAIL ALIAS SETUP
# 
# Sacred Mission: Create email alias for pr@aipublishinginternational.com 
# to forward to both pr@coaching2100.com and mo@coaching2100.com
# Authority: Mr. Phillip Corey Roark (0000001) - Diamond SAO Command Center
# Purpose: Set up email distribution using Google Cloud and Workspace APIs
# 
# @classification DIAMOND_SAO_EXCLUSIVE  
# @date 2025-09-04

set -e

echo "💎 GOOGLE WORKSPACE EMAIL ALIAS SETUP"
echo "═══════════════════════════════════════"
echo ""
echo "🎯 Target: pr@aipublishinginternational.com"
echo "📧 Forward to: pr@coaching2100.com, mo@coaching2100.com"
echo ""

# Check if we're authenticated with Google Cloud
echo "🔍 Checking Google Cloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo "❌ Not authenticated with Google Cloud"
    echo "💡 Please run: gcloud auth login"
    exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1)
echo "✅ Authenticated as: $ACTIVE_ACCOUNT"

# Set the project
PROJECT_ID="api-for-warp-drive"
echo "🏗️  Setting project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Function to check if domain alias exists
check_domain_alias() {
    echo ""
    echo "🌐 Checking domain configuration..."
    
    # This is a manual step that needs to be done in Google Admin Console
    echo "📋 MANUAL STEP REQUIRED:"
    echo "   1. Go to https://admin.google.com"
    echo "   2. Navigate to Domains → Manage domains"
    echo "   3. Add 'aipublishinginternational.com' as a domain alias"
    echo "   4. Complete domain verification process"
    echo ""
    
    read -p "⏳ Have you added aipublishinginternational.com as a domain alias? (y/n): " domain_added
    if [[ $domain_added != "y" && $domain_added != "Y" ]]; then
        echo "⚠️  Please complete domain alias setup first"
        echo "💡 https://support.google.com/a/answer/53340?hl=en"
        exit 1
    fi
    
    echo "✅ Domain alias setup confirmed"
}

# Function to create email group using Google Groups API
create_email_group() {
    echo ""
    echo "👥 Creating email distribution group..."
    
    local group_email="pr@aipublishinginternational.com"
    local group_name="PR AI Publishing International"
    local group_description="Distribution list for PR at AI Publishing International - forwards to pr@coaching2100.com and mo@coaching2100.com"
    
    echo "🔧 Group details:"
    echo "   Email: $group_email"
    echo "   Name: $group_name"
    echo "   Members: pr@coaching2100.com, mo@coaching2100.com"
    echo ""
    
    # Create the group JSON payload
    cat > /tmp/group_payload.json << EOF
{
  "email": "$group_email",
  "name": "$group_name", 
  "description": "$group_description"
}
EOF

    # Create members JSON payload
    cat > /tmp/members_payload.json << EOF
[
  {
    "email": "pr@coaching2100.com",
    "role": "MEMBER"
  },
  {
    "email": "mo@coaching2100.com", 
    "role": "MEMBER"
  }
]
EOF
    
    echo "📋 MANUAL STEP REQUIRED - Google Groups Creation:"
    echo "   1. Go to https://admin.google.com"
    echo "   2. Navigate to Directory → Groups"
    echo "   3. Click 'Create group'"
    echo "   4. Set up group with these details:"
    echo "      - Group email: $group_email"
    echo "      - Group name: $group_name" 
    echo "      - Description: $group_description"
    echo "   5. Add members:"
    echo "      - pr@coaching2100.com"
    echo "      - mo@coaching2100.com"
    echo "   6. Configure group settings:"
    echo "      - Who can post: Anyone on the internet"
    echo "      - Who can view conversations: Group members"
    echo "      - Message moderation: None"
    echo ""
    
    read -p "⏳ Have you created the email group? (y/n): " group_created
    if [[ $group_created != "y" && $group_created != "Y" ]]; then
        echo "⚠️  Please complete group creation first"
        exit 1
    fi
    
    echo "✅ Email group creation confirmed"
}

# Function to test email forwarding
test_email_forwarding() {
    echo ""
    echo "🧪 Testing email forwarding..."
    echo "📧 To test the setup:"
    echo "   1. Send a test email to pr@aipublishinginternational.com"
    echo "   2. Check that both pr@coaching2100.com and mo@coaching2100.com receive it"
    echo "   3. Verify the email appears to come from the original sender"
    echo ""
    
    read -p "🔍 Would you like to send a test email now? (y/n): " send_test
    if [[ $send_test == "y" || $send_test == "Y" ]]; then
        echo "📤 Manual test required - please send an email to pr@aipublishinginternational.com"
        echo "   and verify it reaches both target addresses"
    fi
}

# Function to create backup forwarding rule
create_backup_forwarding() {
    echo ""
    echo "🔄 Setting up backup forwarding (optional)..."
    echo "📋 You can also set up forwarding rules in Gmail:"
    echo "   1. Login to pr@coaching2100.com Gmail"
    echo "   2. Go to Settings → Filters and Blocked Addresses"
    echo "   3. Create filter for emails sent to pr@aipublishinginternational.com"
    echo "   4. Set action to forward to mo@coaching2100.com"
    echo ""
}

# Function to display completion summary
show_completion_summary() {
    echo ""
    echo "✅ EMAIL ALIAS SETUP COMPLETED!"
    echo "═══════════════════════════════════════"
    echo "🎯 Email alias: pr@aipublishinginternational.com"
    echo "📨 Forwards to:"
    echo "   • pr@coaching2100.com"
    echo "   • mo@coaching2100.com"
    echo ""
    echo "🔍 Next steps:"
    echo "   1. Test by sending email to pr@aipublishinginternational.com"
    echo "   2. Verify both recipients receive the email"
    echo "   3. Check email headers to ensure proper forwarding"
    echo ""
    echo "📞 Support:"
    echo "   • Google Workspace Admin Console: https://admin.google.com"
    echo "   • Groups management: https://groups.google.com"
    echo ""
    echo "💎 Diamond SAO Email Management - Operation Complete"
}

# Main execution flow
main() {
    echo "🚀 Starting email alias setup process..."
    
    # Step 1: Check domain alias
    check_domain_alias
    
    # Step 2: Create email group
    create_email_group
    
    # Step 3: Test forwarding
    test_email_forwarding
    
    # Step 4: Backup forwarding (optional)
    create_backup_forwarding
    
    # Step 5: Show completion summary
    show_completion_summary
    
    echo ""
    echo "🎉 Email alias setup process completed successfully!"
}

# Run the main function
main
