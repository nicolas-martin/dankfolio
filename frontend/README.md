# DankFolio Mobile Frontend

This is the frontend application for DankFolio, a mobile app for tracking cryptocurrency portfolios.

## Getting Started

Prerequisites and setup instructions for running the app will be added here.

## End-to-End Testing with Detox

This project uses Detox for end-to-End (E2E) testing.

### Prerequisites

- Ensure you have a development environment set up for React Native (iOS Simulator or Android Emulator).
- For iOS testing: A macOS environment is required for building the app.
- Detox CLI (can be run via `npx detox`).
- Tests are written in TypeScript and located in the `frontend/e2e` directory.

### Running Tests

The following commands utilize the configurations defined in `.detoxrc.json`, which now use Expo CLI for building development clients.

1.  **Build the app for Detox:**
    *   For iOS: `npx detox build -c ios.sim.debug`
        *   This command internally uses `npx expo run:ios --configuration Debug --device "iPhone 14" --no-bundler` (or similar, as per `.detoxrc.json`).
        *   **Note**: Building for iOS requires a macOS environment.
    *   For Android: `npx detox build -c android.emu.debug`
        *   This command internally uses `npx expo run:android --configuration Debug --device "Pixel_3a_API_30_x86" --no-bundler` (or similar, as per `.detoxrc.json`).

2.  **Run the Detox tests:**
    *   For iOS: `npx detox test -c ios.sim.debug`
    *   For Android: `npx detox test -c android.emu.debug`

Refer to the `.detoxrc.json` file for detailed configurations. Make sure your emulators/simulators match the device names specified there (e.g., "iPhone 14", "Pixel_3a_API_30_x86").

### API Mocking with Mock Service Worker (`msw`)

To ensure stable and predictable E2E tests, this project uses Mock Service Worker (`msw`) to mock API responses. This allows us to test UI behavior with consistent data without relying on a live backend.

-   **Mock Handlers Location**: API mock handlers are defined in `frontend/e2e/mocks/handlers.ts`.
-   **How it Works**: `msw` intercepts outgoing requests from the app (during E2E tests run via Detox) and returns mocked responses defined in the handlers. This is managed by a setup file (`frontend/e2e/setup.ts`) that starts/stops the mock server.
-   **Adding New Mock Handlers**:
    1.  Open `frontend/e2e/mocks/handlers.ts`.
    2.  Identify the API endpoint URL you need to mock (e.g., from `frontend/src/services/grpcApi.ts` and `frontend/src/services/grpc/apiClient.ts`, noting the gRPC-Web URL structure like `{API_BASE_URL}/{serviceFullName}/{methodName}`).
    3.  Add a new handler using `http.post` (for gRPC-Web) or other `http` methods. For example:
        ```typescript
        import { http, HttpResponse } from 'msw';

        // Inside the `export const handlers = [...]` array:
        http.post('https://api.dankfolio.com/your.service.v1/YourMethod', async ({ request }) => {
          // You can inspect `request` if needed (e.g., request.json() for REST, or specific parsing for gRPC)
          console.log('[MSW] Intercepted YourMethod');
          return HttpResponse.json({ your_mock_data: 'value' });
          // Ensure the response structure matches what the frontend expects.
        }),
        ```
    4.  Make sure the `API_BASE_URL` in `handlers.ts` matches the application's configured API URL.
    5.  Update or add E2E tests to assert UI changes based on your new mock data.

-   **Important**: The mock server currently uses `https://api.dankfolio.com` as the base URL for API calls. If the actual application's `REACT_APP_API_URL` environment variable points to a different base URL, you will need to update `API_BASE_URL` in `frontend/e2e/mocks/handlers.ts` for the mocks to work correctly.
