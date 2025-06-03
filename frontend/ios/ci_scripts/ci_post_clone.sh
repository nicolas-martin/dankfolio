#!/bin/sh

# ci_post_clone.sh
# Xcode Cloud build script to install CocoaPods dependencies
# This script runs after the repository is cloned but before the build starts

set -e

echo "🚀 Starting Xcode Cloud post-clone script..."

# Navigate to the iOS directory
cd $CI_WORKSPACE/frontend/ios

echo "📍 Current directory: $(pwd)"

# Check if Podfile exists
if [ ! -f "Podfile" ]; then
    echo "❌ Error: Podfile not found in $(pwd)"
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

echo "🎉 Xcode Cloud post-clone script completed!" 