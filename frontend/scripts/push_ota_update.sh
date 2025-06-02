#!/bin/bash

# Script to push an OTA update with EAS

# Usage instructions
usage() {
  echo "Usage: $0 <channel_name> \"<commit_message>\""
  echo "  <channel_name>: The channel to publish the update to (e.g., production, preview, development)."
  echo "  <commit_message>: The message to associate with the update (enclose in quotes)."
  exit 1
}

# Check if the correct number of arguments is provided
if [ "$#" -ne 2 ]; then
  usage
fi

CHANNEL="$1"
MESSAGE="$2"

# Validate that channel name and message are not empty
if [ -z "$CHANNEL" ]; then
  echo "Error: Channel name cannot be empty."
  usage
fi

if [ -z "$MESSAGE" ]; then
  echo "Error: Commit message cannot be empty."
  usage
fi

echo "Publishing OTA update to channel '$CHANNEL' with message: '$MESSAGE'"

# Run the EAS update command
eas update --auto --channel "$CHANNEL" --message "$MESSAGE"

# Check the exit status of the eas update command
if [ $? -eq 0 ]; then
  echo "EAS Update published successfully to channel '$CHANNEL'."
else
  echo "Error: EAS Update failed. Please check the output above for details."
  exit 1
fi

exit 0
