#!/bin/bash
# Firebase Monitoring Script
# Watches for any Firebase connection attempts after cleanup
# Run this periodically to ensure cleanup remains effective

echo "🔍 Firebase Monitoring Check - $(date)"
echo "=============================================="

# Check for any new Firebase files
echo "1. Checking for new Firebase files..."
FIREBASE_FILES=$(find /Users/as/asoos -name "*firebase*" ! -path "*/FIREBASE_CLEANUP_ARCHIVE/*" ! -name "*.DISABLED" ! -name "firebase-monitoring.sh" 2>/dev/null)

if [ -n "$FIREBASE_FILES" ]; then
    echo "⚠️  WARNING: New Firebase files detected:"
    echo "$FIREBASE_FILES"
    echo ""
else
    echo "✅ No new Firebase files found"
fi

# Check for Firebase references in recent git commits (if git repo exists)
echo ""
echo "2. Checking recent code changes for Firebase references..."
if [ -d "/Users/as/asoos/.git" ]; then
    RECENT_FIREBASE=$(git log --since="24 hours ago" --grep="firebase" --oneline 2>/dev/null)
    if [ -n "$RECENT_FIREBASE" ]; then
        echo "⚠️  WARNING: Recent commits mention Firebase:"
        echo "$RECENT_FIREBASE"
    else
        echo "✅ No recent Firebase-related commits"
    fi
else
    echo "ℹ️  No git repository detected, skipping commit check"
fi

# Check for running processes that might be Firebase-related
echo ""
echo "3. Checking for Firebase-related processes..."
FIREBASE_PROCESSES=$(ps aux | grep -i firebase | grep -v grep | grep -v firebase-monitoring)

if [ -n "$FIREBASE_PROCESSES" ]; then
    echo "⚠️  WARNING: Firebase-related processes detected:"
    echo "$FIREBASE_PROCESSES"
else
    echo "✅ No Firebase processes running"
fi

# Check for Firebase in package.json files
echo ""
echo "4. Checking package.json files for Firebase dependencies..."
FIREBASE_DEPS=$(find /Users/as/asoos -name "package.json" ! -path "*/FIREBASE_CLEANUP_ARCHIVE/*" ! -path "*/node_modules/*" -exec grep -l "firebase" {} \; 2>/dev/null)

if [ -n "$FIREBASE_DEPS" ]; then
    echo "⚠️  WARNING: Firebase dependencies found in:"
    echo "$FIREBASE_DEPS"
    echo ""
    echo "Details:"
    for file in $FIREBASE_DEPS; do
        echo "  File: $file"
        grep -n "firebase" "$file" | head -3
        echo ""
    done
else
    echo "✅ No Firebase dependencies in package.json files"
fi

# Check active network connections (if netstat available)
echo ""
echo "5. Checking for Firebase network connections..."
if command -v netstat >/dev/null 2>&1; then
    FIREBASE_CONNECTIONS=$(netstat -an | grep -i firebase 2>/dev/null)
    if [ -n "$FIREBASE_CONNECTIONS" ]; then
        echo "⚠️  WARNING: Firebase network connections detected:"
        echo "$FIREBASE_CONNECTIONS"
    else
        echo "✅ No Firebase network connections"
    fi
else
    echo "ℹ️  netstat not available, skipping network check"
fi

# Summary
echo ""
echo "📊 MONITORING SUMMARY"
echo "====================="
echo "Archive Status: $(ls -la /Users/as/asoos/FIREBASE_CLEANUP_ARCHIVE/ | wc -l | xargs) items archived"
echo "Disabled Scripts: $(find /Users/as/asoos -name "*.DISABLED" | wc -l | xargs) scripts disabled"
echo "Monitoring Time: $(date)"

# Create alert if issues found
ALERT_FILE="/Users/as/asoos/firebase-alert.log"
if [ -n "$FIREBASE_FILES" ] || [ -n "$FIREBASE_DEPS" ] || [ -n "$FIREBASE_PROCESSES" ]; then
    echo "⚠️  ALERT: Firebase references detected!" >> "$ALERT_FILE"
    echo "Time: $(date)" >> "$ALERT_FILE"
    echo "Run 'cat /Users/as/asoos/firebase-alert.log' for details" >> "$ALERT_FILE"
    echo ""
    echo "🚨 ALERT: Firebase references detected!"
    echo "   Check details in: $ALERT_FILE"
    echo "   Consider re-running cleanup script"
else
    echo ""
    echo "✅ ALL CLEAR: No Firebase references detected"
    echo "🔒 Your ASOOS system remains Firebase-free"
fi

echo ""
echo "To run this check regularly, add to crontab:"
echo "# Check for Firebase references daily at 9 AM"
echo "0 9 * * * /Users/as/asoos/firebase-monitoring.sh >> /Users/as/asoos/firebase-monitoring.log 2>&1"
