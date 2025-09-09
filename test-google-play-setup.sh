#!/bin/bash

echo "🧪 Testing Google Play Service Account Setup"
echo "=========================================="
echo ""

# Check if service account key exists
if [ ! -f "google-service-account.json" ]; then
    echo "❌ google-service-account.json not found in current directory"
    echo "   Please create it first using the setup script"
    exit 1
fi

echo "✅ Found google-service-account.json"

# Extract email from JSON
SERVICE_EMAIL=$(cat google-service-account.json | grep "client_email" | cut -d'"' -f4)
echo "📧 Service Account Email: $SERVICE_EMAIL"

# Set environment variable
export GOOGLE_SERVICE_ACCOUNT_KEY=$(cat google-service-account.json)

echo ""
echo "🧪 Testing EAS commands..."
echo ""

echo "1. Testing EAS login status:"
npx eas whoami

echo ""
echo "2. Testing Android build configuration:"
npx eas build:configure --platform android

echo ""
echo "3. Testing submit configuration:"
npx eas submit --platform android --help | head -10

echo ""
echo "✅ If all commands above succeeded, your setup should work!"
echo ""
echo "Next steps:"
echo "1. Add GOOGLE_SERVICE_ACCOUNT_KEY to GitHub secrets"
echo "2. Grant permissions in Google Play Console Users & permissions"
echo "3. Test with: eas build --platform android --profile production"
