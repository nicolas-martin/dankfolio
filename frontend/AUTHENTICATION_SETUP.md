# Firebase App Check and Application JWT Authentication Guide

This guide outlines the implementation of a robust two-tier authentication system for your Connect RPC services. It leverages Firebase App Check (with App Attest for iOS) to verify app and device integrity, followed by a custom Application JWT for ongoing session management.

## Overview

The authentication process is as follows:

1.  **App/Device Integrity Check (Firebase App Check):**
    *   The frontend (React Native iOS app) initializes Firebase and Firebase App Check.
    *   It uses an appropriate provider (e.g., via `expo-app-integrity` or `expo-firebase-app-check-provider` for App Attest) to obtain an App Check token from Firebase.
2.  **Application JWT Issuance:**
    *   The frontend sends this App Check token to the backend's `AuthService.GenerateToken` gRPC method.
    *   The backend verifies the App Check token using the Firebase Admin SDK.
    *   If valid, the backend generates and signs a custom Application JWT. The claims in this JWT (e.g., a device identifier derived from the App Check token's subject) are determined by the backend.
    *   This Application JWT is returned to the frontend.
3.  **Authenticated API Calls:**
    *   The frontend securely stores the Application JWT.
    *   For subsequent gRPC calls to protected API endpoints, the frontend includes this Application JWT as a Bearer token in the `Authorization` header via a Connect Interceptor.
    *   The backend's authentication middleware verifies the Application JWT before allowing access to the protected RPC handlers.

## Frontend Implementation (React Native with Expo)

### Dependencies

*   **`firebase`**: The core Firebase SDK.
    ```bash
    # Already added via previous steps if you followed along
    # yarn add firebase
    ```
*   **Expo App Check Provider**: For iOS App Attest, you'll need an Expo-specific package that bridges to the native App Attest capabilities and integrates with Firebase App Check.
    *   Investigate packages like `expo-app-integrity` or `expo-firebase-app-check-provider`.
    *   **User Action Required:** Install and configure the chosen package according to its documentation and your Firebase/Apple Developer setup. This typically involves native configuration.
    ```bash
    # Example (replace with actual package and command)
    # npx expo install expo-app-integrity
    ```

### 1. Firebase and App Check Initialization (`src/services/firebaseInit.ts`)

A dedicated service initializes Firebase and App Check.

```typescript
// src/services/firebaseInit.ts (Simplified)
import { initializeApp, FirebaseApp } from 'firebase/app';
import { initializeAppCheck, AppCheck } from 'firebase/app-check'; // Or from your chosen Expo provider
import { logger } from '@/utils/logger';

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_PLACEHOLDER",
  authDomain: "YOUR_AUTH_DOMAIN_PLACEHOLDER",
  projectId: "YOUR_PROJECT_ID_PLACEHOLDER",
  // ... other config ...
  appId: "YOUR_APP_ID_PLACEHOLDER",
};

let firebaseApp: FirebaseApp | null = null;
let appCheckInstance: AppCheck | null = null;

export async function initializeFirebaseServices(): Promise<void> {
  try {
    if (!firebaseApp) {
      firebaseApp = initializeApp(firebaseConfig);
      logger.info('🔥 Firebase app initialized successfully.');
    }

    if (firebaseApp && !appCheckInstance) {
      // IMPORTANT: Provider setup is CRUCIAL here.
      // Replace with your chosen Expo App Check provider for App Attest.
      // const provider = new YourChosenExpoAppCheckProvider(firebaseApp);
      appCheckInstance = initializeAppCheck(firebaseApp, {
        // provider: provider, // Pass the configured provider
        isTokenAutoRefreshEnabled: true,
      });
      logger.info('🔒 Firebase App Check initialized (ensure provider is correctly set for App Attest).');
    }
  } catch (error) {
    logger.error('❌ Failed to initialize Firebase services:', error);
    throw error;
  }
}

export function getAppCheckInstance(): AppCheck | null {
  return appCheckInstance;
}
```

This `initializeFirebaseServices()` function is then called during app startup (e.g., in `App.tsx`'s `prepare()` method).

### 2. Authentication Service (`src/services/authService.ts`)

Manages the App Check token retrieval and Application JWT request.

Key changes in `_performTokenRefresh()`:
1.  Retrieves the `AppCheck` instance via `getAppCheckInstance()`.
2.  Gets the App Check token: `await getAppCheckTokenFirebase(appCheck, false);`.
3.  Calls the backend `authClient.generateToken({ appCheckToken: appCheckTokenValue, platform: "mobile" });`.
4.  Stores the returned Application JWT using `authManager.setToken()`.

Development Fallback: If App Check token retrieval fails in `DEBUG_MODE`, `generateDevelopmentToken()` is called. This dev token is for UI testing and won't be validated by a real backend requiring App Check.

### 3. Token Storage (`src/services/grpc/authManager.ts`)

Handles secure storage (AsyncStorage) of the Application JWT and its expiry. No significant changes needed here other than ensuring it stores the token received from `authService.ts`.

### 4. Connect Interceptor (`src/services/grpc/apiClient.ts`)

Automatically adds the Application JWT (obtained via `authService.getAuthToken()`) as a Bearer token to all gRPC requests, except for calls to the `AuthService` itself to prevent circular dependencies. This setup remains largely unchanged.

## Backend Implementation (Go)

### Required Dependencies

```bash
go get connectrpc.com/authn
go get github.com/golang-jwt/jwt/v5
go get connectrpc.com/connect
go get firebase.google.com/go/v4  # For Firebase Admin SDK
```

### 1. Protobuf Definition (`proto/dankfolio/v1/auth.proto`)

The `GenerateTokenRequest` has been modified:

```protobuf
message GenerateTokenRequest {
  // Firebase App Check token for verifying app integrity
  string app_check_token = 1;
  // Platform identifier (e.g., "ios", "android")
  string platform = 2;
}

// GenerateTokenResponse remains the same, returning the Application JWT
message GenerateTokenResponse {
  string token = 1;
  int32 expires_in = 2;
}
```
The `AuthService.GenerateToken` RPC uses these updated messages.

### 2. Firebase Admin SDK Initialization (e.g., in `cmd/api/main.go`)

The Firebase Admin SDK must be initialized at backend startup. This requires your Firebase project's service account credentials.

**User Action Required:**
*   Download your Firebase service account JSON key from the Firebase console.
*   Securely provide its path to your backend (e.g., via an environment variable `GOOGLE_APPLICATION_CREDENTIALS`).

```go
// Example in main.go
import (
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/appcheck"
	// ... other imports
	"context" // Added for context.Background()
	"log"     // Added for logging
	"github.com/nicolas-martin/dankfolio/backend/internal/service/auth" // Assuming this path
)

func main() {
	// ...
	ctx := context.Background()
	fbApp, err := firebase.NewApp(ctx, nil) // Or with option.WithCredentialsFile("path/to/serviceAccountKey.json")
	if err != nil {
		log.Fatalf("firebase.NewApp: %v", err)
	}

	appCheckClient, err := fbApp.AppCheck(ctx)
	if err != nil {
		log.Fatalf("fbApp.AppCheck: %v", err)
	}

	// Pass appCheckClient to the auth.Service via its Config
	authSvc, err := auth.NewService(&auth.Config{
		// ... other config like JWTSecret, TokenExpiry ...
		AppCheckClient: appCheckClient,
	})
	if err != nil {
		log.Fatalf("auth.NewService: %v", err)
	}
	// ... rest of server setup, pass authSvc to middleware and RPC handlers ...
}
```

### 3. Token Generation Service (`internal/service/auth/service.go`)

The `auth.Service`'s `GenerateToken` method now implements the core App Check logic:

```go
// Simplified GenerateToken method
import (
	"context"
	"fmt"
	dankfoliov1 "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	"github.com/golang-jwt/jwt/v5" // For AuthClaims
	"time" // For tokenExpiry
)

// Assuming AuthClaims is defined in this package or imported
// type AuthClaims struct {
// 	DeviceID string `json:"device_id"`
// 	Platform string `json:"platform"`
// 	jwt.RegisteredClaims
// }

// Assuming Service struct has jwtSecret and tokenExpiry fields
// type Service struct {
// 	// ...
// 	jwtSecret      []byte
// 	tokenExpiry    time.Duration
// 	appCheckClient *appcheck.Client
// }

func (s *Service) GenerateToken(ctx context.Context, req *dankfoliov1.GenerateTokenRequest) (*dankfoliov1.GenerateTokenResponse, error) {
	if s.appCheckClient == nil {
		return nil, fmt.Errorf("AppCheck service not configured")
	}
	if req.AppCheckToken == "" {
		return nil, fmt.Errorf("AppCheckToken is required")
	}

	// 1. Verify App Check token
	appCheckTokenInfo, err := s.appCheckClient.VerifyToken(req.AppCheckToken)
	if err != nil {
		return nil, fmt.Errorf("invalid AppCheck token: %w", err)
	}

	// 2. App Check token is valid, generate Application JWT
	deviceIDFromAppCheck := appCheckTokenInfo.Subject // Use Subject from AppCheck token for JWT's DeviceID claim

	claims := AuthClaims{ // Ensure AuthClaims is defined appropriately
		DeviceID: deviceIDFromAppCheck,
		Platform: req.Platform,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.tokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "dankfolio-app", // Example issuer
			Subject:   deviceIDFromAppCheck,
		},
	}
	
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return nil, fmt.Errorf("failed to sign application token: %w", err)
	}


	return &dankfoliov1.GenerateTokenResponse{
		Token:     tokenString,
		ExpiresIn: int32(s.tokenExpiry.Seconds()),
	}, nil
}
```
The `AuthClaims` struct and `ValidateToken` method remain mostly the same, now dealing with the Application JWT.

### 4. Authentication Middleware (`internal/middleware/auth.go`)

The existing `AuthMiddleware` (using `connectrpc.com/authn`) does not require changes. It continues to:
1.  Extract the Bearer token (which is now the Application JWT) from the `Authorization` header.
2.  Call `authService.ValidateToken()` to validate this Application JWT.
3.  If valid, populate the context with `AuthenticatedUser`.

## Security Considerations

1.  **JWT Secret Key (Application JWT):** Use a strong, random secret key for signing your Application JWTs. Store it securely on the backend (e.g., environment variables, secret manager). This is distinct from any Firebase keys.
2.  **Firebase Service Account Key:** Securely manage your Firebase Admin SDK service account key. Do not commit it to your repository.
3.  **App Attest Setup:** Correctly configure App Attest in the Firebase Console for your iOS app (Bundle ID, Apple Team ID) and in the Apple Developer portal.
4.  **Token Expiry:** Set appropriate expiration times for both Firebase App Check tokens (managed by Firebase) and your Application JWTs.
5.  **HTTPS:** Always use HTTPS in production for all communications.
6.  **Application JWT Storage (Frontend):** `authManager.ts` uses AsyncStorage. For higher security on native, consider `expo-secure-store` or equivalent keychain storage, though this adds complexity. The current setup stores it in AsyncStorage.
7.  **Rate Limiting:** Consider rate limiting on the `GenerateToken` endpoint.

## Placeholders and Configuration

Remember to replace all placeholder values:
*   Firebase project configuration in `frontend/src/services/firebaseInit.ts`.
*   Site key for reCAPTCHA v3 provider or configuration for your chosen Expo App Check provider in `firebaseInit.ts`.
*   JWT signing secret on the backend.
*   Path to Firebase service account key on the backend.

## Testing

1.  Ensure App Attest is working on a real iOS device (simulators do not support App Attest).
2.  Verify that requests fail if a valid App Check token is not provided to `GenerateToken`.
3.  Test Application JWT validation for protected endpoints.
4.  Check development fallback modes.

This new setup significantly enhances security by ensuring requests originate from genuine instances of your app running on legitimate devices.
```
