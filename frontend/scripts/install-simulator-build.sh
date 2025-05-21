#!/bin/bash

# === CONFIGURATION ===
APP_TARBALL="${1:-dankfolio.app.tar.gz}"       # Default tarball name if none passed
OUTPUT_DIR="./build-output"
BUNDLE_ID="com.anonymous.dankfoliomobile"

# === CHECKS ===
if [[ ! -f "$APP_TARBALL" ]]; then
  echo "❌ Build archive not found: $APP_TARBALL"
  exit 1
fi

# === CLEANUP & EXTRACT ===
echo "📦 Extracting $APP_TARBALL to $OUTPUT_DIR..."
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
tar -xzf "$APP_TARBALL" -C "$OUTPUT_DIR"

APP_BUNDLE=$(find "$OUTPUT_DIR" -type d -name "*.app" | head -n 1)

if [[ -z "$APP_BUNDLE" ]]; then
  echo "❌ .app bundle not found after extraction."
  exit 1
fi

# === INSTALL TO SIMULATOR ===
echo "📲 Installing $APP_BUNDLE to booted simulator..."
xcrun simctl install booted "$APP_BUNDLE"

# === LAUNCH APP ===
echo "🚀 Launching $BUNDLE_ID..."
xcrun simctl launch booted "$BUNDLE_ID"
