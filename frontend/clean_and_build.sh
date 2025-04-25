#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🧹 Starting clean process..."

# 1. Remove iOS build cache and Pods
echo "   - Removing ios/build directory..."
rm -rf ios/build
echo "   - Removing ios/Pods directory..."
rm -rf ios/Pods
echo "   - Removing ios/Podfile.lock file..."
rm -f ios/Podfile.lock

# 2. Remove node_modules
echo "   - Removing node_modules directory..."
rm -rf node_modules

echo "🧼 Clean process finished."
echo ""
echo "📦 Installing dependencies..."

# 3. Install JavaScript dependencies (Detects yarn or npm)
if [ -f yarn.lock ]; then
  echo "   - Using Yarn to install JavaScript dependencies..."
  yarn install
else
  echo "   - Using npm to install JavaScript dependencies..."
  npm install
fi

# 4. Install iOS Pod dependencies
echo "   - Installing iOS Pods..."
npx pod-install

echo "✅ Dependencies installed."
echo ""
echo "🚀 Attempting to build and run on iOS Simulator..."

# 5. Run the local build command
npx expo run:ios

echo "✅ Script finished."
