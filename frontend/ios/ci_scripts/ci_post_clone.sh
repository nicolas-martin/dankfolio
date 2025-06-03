#!/bin/sh

# ci_post_clone.sh
# Xcode Cloud build script to install CocoaPods dependencies
# This script runs after the repository is cloned but before the build starts

set -e

echo "🚀 Starting Xcode Cloud post-clone script..."

# Debug: Show Xcode Cloud environment variables
echo "🔍 Xcode Cloud Environment Debug:"
echo "CI_WORKSPACE: $CI_WORKSPACE"
echo "PWD: $(pwd)"
echo "HOME: $HOME"
echo "USER: $USER"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "📍 Script directory: $SCRIPT_DIR"

# Navigate to the iOS directory (one level up from ci_scripts)
IOS_DIR="$(dirname "$SCRIPT_DIR")"
cd "$IOS_DIR"

echo "📍 Current directory: $(pwd)"

# Install Node.js using Homebrew (required for Expo Podfile)
echo "🔧 Installing Node.js..."
if ! command -v node &> /dev/null; then
    brew install node
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Navigate to frontend directory to install npm dependencies
FRONTEND_DIR="$(dirname "$IOS_DIR")"
echo "📍 Frontend directory: $FRONTEND_DIR"
cd "$FRONTEND_DIR"

# Install npm dependencies (required for Expo Podfile to resolve expo/package.json)
echo "📦 Installing npm dependencies..."
npm install

# Go back to iOS directory for CocoaPods
cd "$IOS_DIR"

# Check if Podfile exists
if [ ! -f "Podfile" ]; then
    echo "❌ Error: Podfile not found in $(pwd)"
    echo "📋 Directory contents:"
    ls -la
    exit 1
fi

echo "📦 Installing CocoaPods dependencies..."

# Install CocoaPods if not available
if ! command -v pod &> /dev/null; then
    echo "🔧 Installing CocoaPods..."
    gem install cocoapods
fi

# Install pods
pod install --verbose

echo "✅ CocoaPods dependencies installed successfully!"
echo "📋 Pods directory contents:"
ls -la Pods/ | head -10

echo "🎉 ci_post_clone.sh completed successfully!" 