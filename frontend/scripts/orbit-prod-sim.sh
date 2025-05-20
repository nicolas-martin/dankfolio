#!/usr/bin/env bash
set -euo pipefail

### ─── CONFIG ───────────────────────────────────────────────────────────────
# Replace these with your actual names/paths
APP_NAME="dankfolio"                           # Xcode scheme & bundle name
WORKSPACE="ios/${APP_NAME}.xcworkspace"      # path to your .xcworkspace
SCHEME="${APP_NAME}"                         # Xcode scheme
DERIVED_DATA="ios/build"                     # where xcodebuild will put its products
SIMULATOR_TYPE="iPhone 16 Pro"               # the device type you want
RUNTIME="com.apple.CoreSimulator.SimRuntime.iOS-18-4"
ORBIT_CLI="/Applications/Expo Orbit.app/Contents/Resources/orbit-cli-arm64"
### ────────────────────────────────────────────────────────────────────────

echo "🔨 Building ${APP_NAME} (Release) for the simulator…"
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -sdk iphonesimulator \
  -derivedDataPath "$DERIVED_DATA" \
  clean build

APP_PATH="${DERIVED_DATA}/Build/Products/Release-iphonesimulator/${APP_NAME}.app"
if [[ ! -d "$APP_PATH" ]]; then
  echo "❌ Build failed: .app not found at $APP_PATH"
  exit 1
fi

echo "📱 Looking for a booted simulator…"
UDID=$(xcrun simctl list devices booted \
       | grep -Eo '([A-F0-9-]{36})' \
       | head -n1 || true)

if [[ -z "$UDID" ]]; then
  echo "🆕 No simulator booted—creating & booting a fresh ${SIMULATOR_TYPE}…"
  UDID=$(xcrun simctl create "Dev ${SIMULATOR_TYPE}" \
           "com.apple.CoreSimulator.SimDeviceType.${SIMULATOR_TYPE// /-}" \
           "${RUNTIME}")
  xcrun simctl boot "$UDID"
  # give it a moment
  sleep 5
fi

echo "🔑 Using simulator UDID: $UDID"
echo "🚀 Installing & launching via Orbit…"

"$ORBIT_CLI" install-and-launch \
  --app-path "$APP_PATH" \
  --device-id "$UDID"

echo "✅ Done!"
