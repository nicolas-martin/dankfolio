#!/bin/bash
set -e
echo "🚀 Running ci_post_clone.sh"

# cd out of ios/ci_scripts into main project directory
cd ../../

# install node and cocoapods
brew install node cocoapods

# install node modules
npm install

# Configure Sentry for CI builds
export SENTRY_DISABLE_AUTO_UPLOAD=true

# xcode cloud sets `CI` env var to 'TRUE':
# This causes a crash: Error: GetEnv.NoBoolean: TRUE is not a boolean.
# This is a workaround for that issue.
CI="true" npx expo prebuild

echo "✅ ci_post_clone.sh completed successfully!" 