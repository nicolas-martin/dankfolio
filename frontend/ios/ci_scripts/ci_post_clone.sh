#!/bin/bash
set -e
echo "🚀 Running ci_post_clone.sh"

# Double protection against Sentry build failures
export SENTRY_ALLOW_FAILURE=true
export SENTRY_DISABLE_AUTO_UPLOAD=true

# cd out of ios/ci_scripts into main project directory
cd ../../

# Install Node.js 20.x LTS (compatible with React Native 0.76.9)
# RN 0.76 requires Node 18.18+ - using Node 20 LTS for stability
echo "📦 Installing Node.js 20.x LTS..."
brew install node@20
brew link --force node@20

# Verify Node version
echo "📋 Node version: $(node --version)"
echo "📋 npm version: $(npm --version)"

# Set explicit Node binary path for Xcode
export NODE_BINARY="$(which node)"
echo "📍 NODE_BINARY set to: $NODE_BINARY"

# Install CocoaPods
echo "📦 Installing CocoaPods..."
brew install cocoapods

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

# xcode cloud sets `CI` env var to 'TRUE':
# This causes a crash: Error: GetEnv.NoBoolean: TRUE is not a boolean.
# This is a workaround for that issue.
echo "🔧 Running expo prebuild..."
CI="true" npx expo prebuild

echo "✅ ci_post_clone.sh completed successfully!" 