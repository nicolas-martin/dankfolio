## E2E Testing Setup with MSW and Maestro

This document outlines the End-to-End (E2E) testing setup for the application, utilizing Mock Service Worker (MSW) for API mocking and Maestro for UI automation.

### 1. Overview

Our E2E testing strategy involves:
- **MSW (Mock Service Worker)**: To intercept outgoing API requests from the app and return predefined mock responses. This allows us to test various scenarios without relying on a live backend. MSW runs directly in the React Native environment.
- **Maestro**: A UI automation tool to script user interactions (taps, swipes, text input) and assert application states. Maestro tests are written in simple YAML flows.

This combination ensures that we can test user flows reliably and consistently in a controlled environment.

### 2. MSW Integration

- **Initialization**: MSW is conditionally initialized at the very start of the application's lifecycle in `frontend/App.tsx`. The initialization is controlled by the `E2E_MOCKING_ENABLED` environment variable. If this variable is set to `'true'`, the MSW worker is started.
  ```typescript
  // In frontend/App.tsx
  if (process.env.E2E_MOCKING_ENABLED === 'true') {
    console.log('[MSW] E2E_MOCKING_ENABLED is true, starting MSW worker...');
    worker.start({...});
  }
  ```

- **API URL Adjustment**: When `E2E_MOCKING_ENABLED` is true, the application's API URL is automatically overridden to `http://localhost:9000`. This change is handled in `frontend/src/utils/env.ts`. MSW does not require a separate server; this URL is used to ensure that requests are routed correctly for MSW to intercept them within the app.
  ```typescript
  // In frontend/src/utils/env.ts, within getEnvVariables()
  if (process.env.E2E_MOCKING_ENABLED === 'true') {
    logger.info('[MSW] E2E_MOCKING_ENABLED is true, setting apiUrl to http://localhost:9000 for MSW.');
    env.apiUrl = 'http://localhost:9000';
  }
  ```

- **Mock Handlers**: API mock handlers are defined in `frontend/e2e/mocks/handlers.ts`. This is where you can specify the mock responses for different API endpoints.

### 3. Environment Variable: `E2E_MOCKING_ENABLED`

The `E2E_MOCKING_ENABLED=true` environment variable is the key to activating the mocking system. When this variable is set to `true` during the build or runtime of the app:
1. MSW worker is started (`App.tsx`).
2. The `apiUrl` is set to `http://localhost:9000` (`env.ts`) for MSW to intercept requests.

### 4. Running the App with Mocks

To run the application with API mocking enabled for E2E testing or development, use the following scripts defined in `frontend/package.json`:

-   **iOS**: `yarn start:e2e:ios`
    ```bash
    cross-env E2E_MOCKING_ENABLED=true npx expo run:ios --device
    ```
-   **Android**: `yarn start:e2e:android`
    ```bash
    cross-env E2E_MOCKING_ENABLED=true npx expo run:android --device
    ```

These scripts use `cross-env` to ensure the `E2E_MOCKING_ENABLED` variable is correctly set across different development environments (Windows, macOS, Linux).

**Crucial Note on Environment Variable Access:**

React Native/Expo apps might not always pick up `process.env` variables set via `cross-env` directly in JavaScript files like `App.tsx` or `env.ts` unless they are embedded at build time.

If you find that `process.env.E2E_MOCKING_ENABLED` is not being read correctly in `App.tsx` or `env.ts`, you may need to pass it through Expo's build-time configuration (`app.config.js`).

**Example `app.config.js` adjustment:**

```javascript
// frontend/app.config.js
// Load environment variables from .env file if needed for other purposes
// import 'dotenv/config'; // Already present if you use it

module.exports = ({ config }) => {
  const e2eMockingEnabled = process.env.E2E_MOCKING_ENABLED === 'true';

  if (e2eMockingEnabled) {
    console.log("📱 [E2E MOCKING] E2E_MOCKING_ENABLED is true via app.config.js");
  }

  return {
    ...config,
    extra: {
      ...config.extra, // Preserve existing extra properties
      E2E_MOCKING_ENABLED: e2eMockingEnabled,
      // Optionally, you could also override REACT_APP_API_URL here if the env.ts modification isn't preferred
      // REACT_APP_API_URL: e2eMockingEnabled ? 'http://localhost:9000' : process.env.REACT_APP_API_URL,
    },
  };
};
```

If you make this change in `app.config.js`, you would then access the variable in your application code like this:

```typescript
// In App.tsx or env.ts
import Constants from 'expo-constants';

const isE2EMockingEnabled = Constants.expoConfig?.extra?.E2E_MOCKING_ENABLED === true;

if (isE2EMockingEnabled) {
  // Start MSW worker or set apiUrl
}
```
Specifically for `env.ts`, if `process.env.E2E_MOCKING_ENABLED` doesn't work, you would modify it to use `Constants.expoConfig.extra.E2E_MOCKING_ENABLED` to determine if the `apiUrl` should be changed to `http://localhost:9000`.

### 5. Running Maestro Tests

Once the app is running with mocks enabled (using `yarn start:e2e:ios` or `yarn start:e2e:android`), you can execute the Maestro UI tests.

-   **Run E2E tests**: `yarn test:e2e`
    ```bash
    maestro test frontend/e2e/flows
    ```

This command will run all Maestro test flows located in the `frontend/e2e/flows/` directory.
The initial test flow `appLoads.yaml` is an example that launches the app and checks for an initial screen element.

### 6. Manual Dependency Installation

Ensure all dependencies, including `cross-env`, are installed by running:
```bash
cd frontend
yarn install
# or if you use npm:
# npm install
```
As noted during the `package.json` update, there was a temporary issue with Node version incompatibility for a sub-dependency (`@solana/codecs-numbers`). If `yarn install` fails due to this, ensure your Node.js version meets the requirements specified in the error messages (likely Node >= 20.18.0) or manage Node versions using a tool like `nvm`.

### 7. Customizing Mocks

API mock responses can be customized by editing the handlers in:
`frontend/e2e/mocks/handlers.ts`

Add or modify handlers in this file to simulate different API scenarios needed for your E2E tests.
Each handler typically specifies a request method (GET, POST, etc.), a URL path, and a function that returns a mock response.
```typescript
// Example from frontend/e2e/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('http://localhost:9000/api/user', () => {
    return HttpResponse.json({ firstName: 'John', lastName: 'Maverick' });
  }),
  // Add more handlers here
];
```

This setup provides a robust framework for conducting E2E tests with controlled API responses and automated UI interactions.
