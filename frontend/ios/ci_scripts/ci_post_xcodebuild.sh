#!/bin/bash
set -e
echo "🚀 Running ci_post_xcodebuild.sh"

# Double protection against Sentry build failures
export SENTRY_ALLOW_FAILURE=true
export SENTRY_DISABLE_AUTO_UPLOAD=true

# cd out of ios/ci_scripts into main project directory
cd ../../

# Sentry upload script disabled to prevent build issues
# Uncomment below if you want to re-enable manual Sentry uploads

# # Only upload source maps for release builds
# if [ "$CONFIGURATION" = "Release" ]; then
#     echo "📦 Release build detected, uploading source maps to Sentry..."
#     
#     # Check if SENTRY_AUTH_TOKEN is available
#     if [ -z "$SENTRY_AUTH_TOKEN" ]; then
#         echo "⚠️ SENTRY_AUTH_TOKEN not found, skipping source map upload"
#         exit 0
#     fi
#     
#     # Check if npx is available
#     if ! command -v npx &> /dev/null; then
#         echo "❌ npx not found, skipping source map upload"
#         exit 0
#     fi
#     
#     # Set Sentry release and dist from environment or generate them
#     SENTRY_RELEASE=${SENTRY_RELEASE:-"$APP_VERSION@$BUILD_NUMBER"}
#     SENTRY_DIST=${SENTRY_DIST:-"$BUILD_NUMBER"}
#     
#     echo "📋 Sentry Release: $SENTRY_RELEASE"
#     echo "📋 Sentry Dist: $SENTRY_DIST"
#     
#     # Create a new release in Sentry
#     echo "🏗️ Creating Sentry release..."
#     npx @sentry/cli releases new "$SENTRY_RELEASE" || echo "⚠️ Release creation failed or already exists"
#     
#     # Upload source maps - look for the bundle and source map files
#     # Expo generates these in the iOS build directory
#     BUNDLE_PATH="./main.jsbundle"
#     SOURCEMAP_PATH="./main.jsbundle.map"
#     
#     if [ -f "$SOURCEMAP_PATH" ]; then
#         echo "📤 Uploading source maps to Sentry..."
#         npx @sentry/cli releases files "$SENTRY_RELEASE" upload-sourcemaps \
#             --dist "$SENTRY_DIST" \
#             --strip-prefix /Users/runner/work/ \
#             --strip-common-prefix \
#             --validate \
#             --verbose \
#             "$SOURCEMAP_PATH" || echo "⚠️ Source map upload failed, continuing build"
#         
#         echo "✅ Source maps uploaded to Sentry"
#     else
#         echo "⚠️ Source map file not found at $SOURCEMAP_PATH, skipping upload"
#     fi
#     
#     # Finalize the release
#     echo "🏁 Finalizing Sentry release..."
#     npx @sentry/cli releases finalize "$SENTRY_RELEASE" || echo "⚠️ Release finalization failed"
#     
# else
#     echo "🔧 Debug build detected, skipping source map upload"
# fi

echo "✅ ci_post_xcodebuild.sh completed successfully (Sentry uploads disabled)!" 