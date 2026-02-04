#!/bin/bash

# Quick release script for Homebridge Somfy Protect Automate
# Usage: ./release.sh [patch|minor|major]

set -e

BUMP_TYPE=${1:-patch}

echo "🚀 Starting release process..."
echo "Version bump type: $BUMP_TYPE"

# Check if we have npm credentials
if ! npm whoami &>/dev/null; then
    echo "❌ Not logged into npm!"
    echo ""
    echo "To fix this permanently, generate an npm automation token:"
    echo "1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens"
    echo "2. Click 'Generate New Token' → 'Classic Token'"
    echo "3. Select 'Automation' type"
    echo "4. Copy the token"
    echo "5. Run: npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN"
    echo ""
    exit 1
fi

echo "✓ npm credentials found"

# Update version in source code to match package.json version
update_version_in_source() {
    local new_version=$1
    sed -i.bak "s/v[0-9]\+\.[0-9]\+\.[0-9]\+/v$new_version/" src/index.ts
    rm -f src/index.ts.bak
}

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Bump version
npm version $BUMP_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "New version: $NEW_VERSION"

# Update version in source
update_version_in_source $NEW_VERSION
echo "✓ Updated version in source code"

# Build and publish
echo "Building and publishing..."
npm publish

echo ""
echo "✅ Successfully released v$NEW_VERSION!"
echo "View at: https://www.npmjs.com/package/@jay-d-tyler/homebridge-somfy-protect-automate"
