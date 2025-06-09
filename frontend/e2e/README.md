# End-to-End Testing with Maestro

This directory contains end-to-end tests for the frontend application, powered by Maestro, and the mock server setup.

## Prerequisites

1.  **Install Maestro:** If you haven't already, install the Maestro CLI. Follow the instructions at [https://maestro.mobile.dev/getting-started/installing-maestro](https://maestro.mobile.dev/getting-started/installing-maestro).
2.  **App Build:** You need a development or release build of the application installed on your target iOS simulator/device or Android emulator/device.
    *   For example, to create and run a development build on an iOS simulator:
        ```bash
        npx expo run:ios
        ```
    *   Ensure the `appId` in the Maestro flow files (e.g., `e2e/.maestro/flow.yaml`) matches the bundle identifier of your installed app.

## Running Tests

1.  **Start the Mock Server (if your tests depend on it):**
    The mock server setup is in `frontend/e2e/mocks/`. Ensure it's running or integrated into your test execution process if needed. (Further instructions might be needed here based on how it's typically run).

2.  **Execute Maestro Flows:**
    Navigate to the `frontend/` directory.
    To run a specific flow:
    ```bash
    maestro test e2e/.maestro/flow.yaml
    ```
    To run all flows in the `.maestro` directory:
    ```bash
    maestro test e2e/.maestro/
    ```

### Environment Variable Prerequisites for App

For certain flows, particularly those involving pre-loaded or specific wallet states (like `home_screen_flow.yaml`), the application **must** be built and launched with specific environment variables. This is typically handled when you build/run your development client:

*   `LOAD_DEBUG_WALLET="true"`: This tells the app to bypass normal wallet creation/restore and load a predefined debug wallet.
*   `TEST_PRIVATE_KEY="your_dummy_private_key_here..."`: The private key for the debug wallet.

Ensure these are set in your environment before building or running the app with `npx expo run:ios` or `npx expo run:android` if you intend to run tests requiring this setup. Maestro's `env` block in flow files does *not* directly inject these into the running app's process; the app must be pre-configured.

### Available Flows

*   **`flow.yaml`**: A basic example flow (update or remove if this is no longer relevant).

*   **`home_screen_flow.yaml`**:
    *   Tests the main home screen functionality.
    *   Verifies the display of coin cards (Coin One, Coin Two, Solana) based on mock server data.
    *   Tests navigation from a coin card to its detail screen (placeholder assertion).
    *   **IMPORTANT**: This flow requires the application to be launched with the `LOAD_DEBUG_WALLET` environment variable set to `"true"`, and `TEST_PRIVATE_KEY` also set and accessible to the app. This ensures the debug wallet is pre-loaded, bypassing the manual wallet setup screens. Refer to the main project README or setup guide for instructions on how to set these environment variables for your build/run configuration. (See also "Environment Variable Prerequisites for App" above).

## Developing Tests

*   **Maestro Studio:** Use `maestro studio` to interactively inspect your app's UI hierarchy and generate test steps. This is a powerful tool for creating and debugging flows.
    ```bash
    maestro studio
    ```
*   **Flow Syntax:** Refer to the official Maestro documentation for flow syntax and available commands: [https://maestro.mobile.dev/api-reference/commands](https://maestro.mobile.dev/api-reference/commands)

## Mock Server Details

The mock server uses `msw` (Mock Service Worker). Handlers defining the mocked API responses are in:
*   `frontend/e2e/mocks/handlers.ts`

(Add more details here on how to run/use the mock server if there are specific project scripts or procedures).
