# EAS Over-the-Air (OTA) Updates

Quick guide to EAS OTA updates.

## Prerequisites

*   **Network:** Stable internet connection for the device.
*   **Battery:** Sufficient charge on the device (>50% or plugged in).
*   **Storage:** Enough free space on the device for the update.
*   **EAS CLI Ready:** Assumes EAS CLI is already installed and you are logged into your EAS account.
*   **EAS Project Linked:** Assumes your local project is already linked to an EAS project.
*   **Runtime Version:** App's native build must have a `runtimeVersion` compatible with the update (see `app.json` or `app.config.js`). OTA updates won't apply if the `runtimeVersion` (e.g., "1.0.0" or one derived from a policy like "sdkVersion") of the build and the update do not match.

## Creating a New Update

1.  **Code Changes:** Make your app modifications.
2.  **Native Changes:** If native code changed (new modules, direct iOS/Android edits):
    *   You **must** create a new native build.
    *   If `runtimeVersion` uses `appVersion` policy: Increment app version (e.g., `expo.version` in `app.json`), then `eas build`.
3.  **Publish Update:**
    ```bash
    eas update
    ```
    *   **Common Options:**
        *   `--branch <branch-name>`: Specify branch (e.g., `production`). Example: `eas update --branch production`
        *   `--message "<message>"`: Add a description. Example: `eas update --message "Fix login bug"`
        *   `--auto`: Skip prompts (for CI/CD).

## Publishing to Different Channels

Channels (e.g., `development`, `preview`, `production`, `simulator-release`) stream updates to specific builds. Native builds listen to one channel, defined in `eas.json` build profiles. The exact channels available can be configured in `eas.json`.

*   **Publish to a specific channel:**
    Use the `--channel` flag with `eas update`.
    ```bash
    eas update --channel <channel-name> --message "Your descriptive message"
    ```
    **Examples:**
    *   Publish to `production`:
        ```bash
        eas update --channel production --message "Release version 1.2.3"
        ```
    *   Publish to `preview` for QA:
        ```bash
        eas update --channel preview --message "Testing new cart feature - RC1"
        ```
    *   Publish to `development` for internal testing:
        ```bash
        eas update --channel development --message "Fix user login bug - dev build"
        ```
    *   Publish to `simulator-release` for simulator builds:
        ```bash
        eas update --channel simulator-release --message "Testing iOS simulator specific fix"
        ```

*   **`eas.json` build profile configuration (example):**
    Builds are configured to listen to a specific channel in `eas.json`.
    ```json
    {
      "build": {
        "development": {
          "channel": "development",
          "developmentClient": true
        },
        "preview": {
          "channel": "preview",
          "distribution": "internal"
        },
        "production": {
          "channel": "production"
        },
        "simulator-release": {
          "channel": "simulator-release",
          "ios": {
            "simulator": true
          }
        }
      }
    }
    ```
    Builds made with `eas build -p <profile-name>` (e.g., `eas build -p preview`) will listen to the channel defined in that profile (e.g., `preview`).

## Testing the Update

1.  **Install Build:** Install an app build on a device/simulator configured for your target channel (via `eas build -p <profile-name>`).
2.  **Trigger Update:**
    *   **Automatic:** Restart the app (default behavior).
    *   **Manual:** Use an in-app "Check for updates" button (uses `expo-updates` functions).
3.  **Verify:**
    *   Check for your new features/fixes.
    *   Confirm in EAS Dashboard.
    *   Optionally, display `Updates.updateId` in-app for debugging.
    *   **Troubleshooting:** If no update, check `runtimeVersion` match, channel configuration, network, and logs.

## Helper Script: push_ota_update.sh

To simplify the process of publishing updates, a helper script `push_ota_update.sh` is available in the `frontend/scripts/` directory.

**Purpose:**
This script streamlines publishing an OTA update to a specified channel with a given message by wrapping the `eas update` command. It includes basic argument validation and error handling.

**Making it Executable:**
If you haven't already, you need to make the script executable:
```bash
chmod +x frontend/scripts/push_ota_update.sh
```

**Running the Script:**
To run the script, provide the channel name and the commit message (enclosed in quotes) as arguments.

*   **Syntax:**
    ```bash
    ./frontend/scripts/push_ota_update.sh <channel_name> "<commit_message>"
    ```

*   **Examples:**
    *   Publishing to `production`:
        ```bash
        ./frontend/scripts/push_ota_update.sh production "Updated the main screen UI components"
        ```
    *   Publishing to `preview`:
        ```bash
        ./frontend/scripts/push_ota_update.sh preview "Testing new analytics integration"
        ```
    *   Publishing to `development`:
        ```bash
        ./frontend/scripts/push_ota_update.sh development "Internal test for new API"
        ```
    *   Publishing to `simulator-release`:
        ```bash
        ./frontend/scripts/push_ota_update.sh simulator-release "Testing fix for simulator layout"
        ```
The script will call `eas update --auto --channel "$CHANNEL" --message "$MESSAGE"` internally, where `$CHANNEL` and `$MESSAGE` are the arguments you provide.

## General OTA Process (Simplified)

1.  Device checks for updates.
2.  Downloads package.
3.  Verifies package.
4.  Applies update (may involve restart).
5.  Reports status.

## Basic Troubleshooting

*   **Network:** Check connectivity.
*   **Battery/Storage:** Ensure sufficient levels.
*   **Reboot Device:** Can resolve temporary issues.
*   **EAS Server Status:** Check for outages.
*   **Device Logs:** Provide error details.
*   **Update Download/Install Failures:** Check network, package integrity, `runtimeVersion` compatibility.
*   **No Boot After Update:** Critical. Attempt recovery mode or contact support.
