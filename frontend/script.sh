#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Current directory: $(pwd)"

if [ ! -d "ios" ]; then
  echo "Error: 'ios' directory not found at $(pwd)/ios"
  echo "Please ensure this script is run from your repository root and the 'ios' folder is present."
  exit 1
fi

echo "Navigating to ios directory..."
cd ios

echo "Deintegrating CocoaPods..."
pod deintegrate

echo "Removing old Pods directory, Podfile.lock, and .xcworkspace..."
rm -rf Pods/
rm -f Podfile.lock
rm -rf *.xcworkspace

echo "Cleaning CocoaPods cache..."
pod cache clean --all

echo "Installing CocoaPods dependencies..."
pod install

echo "Navigating back to project root..."
cd ..

echo "Adding changes to git..."
git add ios/Podfile.lock ios/Pods ios/*.xcworkspace ios/*.xcodeproj

# You can check 'git status' here if you want to see what's staged

echo "Committing changes..."
git commit -m "Fix: Refresh CocoaPods paths and workspace for iOS"

echo "Pushing changes to remote..."
git push

echo "Done! Please retry your Xcode Cloud build.
