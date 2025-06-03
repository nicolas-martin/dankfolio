#!/bin/bash
set -e
echo "🚀 Running ci_post_clone.sh"

# Double protection against Sentry build failures
export SENTRY_ALLOW_FAILURE=true
export SENTRY_DISABLE_AUTO_UPLOAD=true

# cd out of ios/ci_scripts into main project directory
cd ../../

# install node and cocoapods
brew install node cocoapods

npm install

# xcode cloud sets `CI` env var to 'TRUE':
# This causes a crash: Error: GetEnv.NoBoolean: TRUE is not a boolean.
# This is a workaround for that issue.
CI="true" npx expo prebuild

echo "✅ ci_post_clone.sh completed successfully!" 