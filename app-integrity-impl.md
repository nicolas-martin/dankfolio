# Implementing Secure Authentication: Firebase App Check & JWT with React Native (iOS) and Go (ConnectRPC)

## Introduction
This document outlines the steps to implement a robust authentication mechanism for a React Native (iOS) application and a Go backend using ConnectRPC. It leverages Firebase App Check (with Apple's App Attest) for initial app integrity verification and a custom application-specific JWT for ongoing session management.

## Main Sections
I. Frontend Changes (React Native iOS App with Expo)
II. Backend Changes (Go with ConnectRPC)

---

## I. Frontend Changes (React Native iOS App with Expo)
This section details the modifications and integrations required on the React Native (iOS) client-side, specifically when using Expo.

### 1. Integrate Firebase and App Check for App Attestation
**Purpose:** To obtain a token from Firebase App Check that verifies the authenticity of your app instance and confirms it's running on a legitimate Apple device via App Attest.

**Packages/Libraries:**
*   **`firebase`**: The core Firebase SDK for JavaScript.
    ```bash
    npx expo install firebase
    ```
*   **`expo-app-integrity`** (Optional): Investigate if this package simplifies native App Check integration within an Expo environment. If it provides a more Expo-idiomatic approach or handles native configurations more smoothly than directly using the Firebase JS SDK's App Check module, consider using it. Otherwise, the Firebase JS SDK can be used directly.
    ```bash
    npx expo install expo-app-integrity # If you choose to use it
    ```

**Key Steps:**
1.  **Firebase Project Setup:**
    *   Create a new project or use an existing one in the [Firebase Console](https://console.firebase.google.com/).
2.  **Register iOS App:**
    *   Add your iOS application to the Firebase project.
    *   Ensure the **Bundle ID** configured in Firebase exactly matches your iOS app's bundle identifier in Xcode / `app.json`.
3.  **Enable App Check:**
    *   In the Firebase Console, navigate to "App Check".
    *   Register your app for App Check.
    *   Enable App Attest for your iOS app. You will need your Apple Team ID for this configuration.
4.  **Initialize Firebase in App:**
    *   In your application's entry point (e.g., `App.js` or a dedicated Firebase initialization file), initialize Firebase with your project's configuration:
        ```javascript
        import firebase from 'firebase/app'; // Or specific imports like 'firebase/app-check'
        // Add other Firebase services imports as needed

        const firebaseConfig = {
          // Your Firebase project configuration object
          apiKey: "...",
          authDomain: "...",
          projectId: "...",
          storageBucket: "...",
          messagingSenderId: "...",
          appId: "...",
          measurementId: "..." // Optional
        };

        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        ```
5.  **Activate Firebase App Check:**
    *   After initializing Firebase, activate App Check. If using `expo-app-integrity` and it handles activation, follow its specific API. Otherwise, use the Firebase JS SDK:
        ```javascript
        import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check"; // Adjust for App Attest

        // Ensure Firebase is initialized before this
        const appCheck = initializeAppCheck(firebase.app(), {
          provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'), // For web, for App Attest, this will differ.
                                                                    // For native, you might pass a custom provider or rely on native setup.
                                                                    // Refer to Firebase docs for App Attest on iOS.
          isTokenAutoRefreshEnabled: true
        });
        ```
    *   **Note for App Attest:** The `ReCaptchaV3Provider` is typically for web. For native iOS with App Attest, the setup might involve configuring a custom provider or ensuring your native Firebase setup correctly links App Attest. Consult the latest Firebase documentation for `firebase/app-check` with App Attest on native platforms. `expo-app-integrity` might abstract this.
6.  **Implement Function to Get App Check Token:**
    *   Create a reusable function to retrieve the App Check token.
        ```javascript
        import { getToken } from "firebase/app-check";

        async function getFirebaseAppCheckToken() {
          try {
            const appCheckToken = await getToken(firebase.appCheck(), /* forceRefresh= */ false);
            return appCheckToken.token;
          } catch (err) {
            console.error("Error getting App Check token:", err);
            // Handle error appropriately
            return null;
          }
        }
        ```
    *   Again, if `expo-app-integrity` is used, it might provide its own method for this.

### 2. Exchange App Check Token for Your Application JWT
**Purpose:** To make an initial authenticated call to your backend, sending the Firebase App Check token. The backend will verify this token and, if valid, return your custom application-specific JWT for subsequent session management.

**Packages/Libraries (for ConnectRPC calls):**
*   **`@connectrpc/connect`**: Core ConnectRPC library.
*   **`@connectrpc/connect-react-native`**: Recommended for React Native, providing native-optimized transport. (Alternatively, `@connectrpc/connect-web` if your setup is more web-like, but `connect-react-native` is generally preferred for true native apps).
    ```bash
    npm install @connectrpc/connect @connectrpc/connect-react-native
    # or
    # yarn add @connectrpc/connect @connectrpc/connect-react-native
    ```
*   **Your generated Protobuf code**: The client stubs and message types generated from your `.proto` definitions for your authentication service.

**Key Steps:**
1.  **Create ConnectRPC Client:**
    *   Set up your ConnectRPC client for the authentication service defined in your Protobuf files.
        ```javascript
        // Example: services/auth_connect.js
        import { createPromiseClient } from "@connectrpc/connect";
        import { createConnectTransport } from "@connectrpc/connect-react-native"; // Or connect-web
        import { AuthService } from "./your_protobuf_generated_code/auth_service_connect"; // Adjust path

        const transport = createConnectTransport({
          baseUrl: "https://your-backend-api.example.com", // Your backend URL
        });

        export const authClient = createPromiseClient(AuthService, transport);
        ```
2.  **Call Backend Authentication Endpoint:**
    *   Implement a function to call your backend's authentication endpoint (e.g., `AuthService.AuthenticateApp`).
    *   Pass the Firebase App Check token in the request metadata/headers (e.g., as `X-Firebase-AppCheck`).
        ```javascript
        async function exchangeAppCheckTokenForAppJWT() {
          const firebaseToken = await getFirebaseAppCheckToken();
          if (!firebaseToken) {
            console.error("Failed to get Firebase App Check token. Cannot authenticate.");
            return null;
          }

          try {
            const response = await authClient.authenticateApp(
              {
                // any request body fields if your service expects them
              },
              {
                headers: { "X-Firebase-AppCheck": firebaseToken },
              }
            );
            // Assuming the response contains your application JWT, e.g., response.appToken
            return response.appToken;
          } catch (error) {
            console.error("Error exchanging App Check token for App JWT:", error);
            // Handle errors (e.g., invalid App Check token, network issues)
            return null;
          }
        }
        ```

### 3. Securely Store Your Application JWT
**Purpose:** To persist the application-specific JWT (received from your backend) securely on the device, preventing the need for frequent re-authentication.

**Package/Library:**
*   **`expo-secure-store`**: Provides an interface to the native Keychain on iOS (and Android Keystore), suitable for storing sensitive data.
    ```bash
    npx expo install expo-secure-store
    ```

**Key Steps:**
1.  **Save Application JWT:**
    *   After successfully receiving the application JWT from your backend, use `SecureStore.setItemAsync()` to save it.
        ```javascript
        import * as SecureStore from 'expo-secure-store';

        const APP_JWT_KEY = 'myAppJWT'; // Define a consistent key

        async function saveAppJWT(token) {
          try {
            await SecureStore.setItemAsync(APP_JWT_KEY, token);
            console.log("Application JWT saved securely.");
          } catch (error) {
            console.error("Error saving Application JWT:", error);
          }
        }

        // Usage after getting the token from backend:
        // const appJWT = await exchangeAppCheckTokenForAppJWT();
        // if (appJWT) {
        //   await saveAppJWT(appJWT);
        // }
        ```
2.  **Retrieve Application JWT:**
    *   When needed (e.g., for making authenticated API calls), retrieve the JWT using `SecureStore.getItemAsync()`.
        ```javascript
        async function getAppJWT() {
          try {
            return await SecureStore.getItemAsync(APP_JWT_KEY);
          } catch (error) {
            console.error("Error retrieving Application JWT:", error);
            return null;
          }
        }
        ```
3.  **Delete Application JWT (e.g., on Logout):**
    ```javascript
    async function deleteAppJWT() {
      try {
        await SecureStore.deleteItemAsync(APP_JWT_KEY);
        console.log("Application JWT deleted.");
      } catch (error) {
        console.error("Error deleting Application JWT:", error);
      }
    }
    ```

### 4. Make Authenticated gRPC Calls with Your Application JWT
**Purpose:** For all subsequent API calls to your backend (after the initial App Check token exchange), include your application-specific JWT in the `Authorization` header.

**Packages/Libraries:** Same as in step 2 (`@connectrpc/connect`, `@connectrpc/connect-react-native`, your generated Protobuf code).

**Key Steps:**
1.  **Implement ConnectRPC Interceptor for Authentication:**
    *   An interceptor is a powerful ConnectRPC feature that can modify requests and responses. Create one to automatically add the JWT.
        ```javascript
        // Example: services/interceptors.js
        import { Interceptor } from "@connectrpc/connect";
        import * as SecureStore from 'expo-secure-store'; // Or your getAppJWT function

        const APP_JWT_KEY = 'myAppJWT'; // Must be same key as used for storing

        export const authInterceptor: Interceptor = (next) => async (req) => {
          const appJWT = await SecureStore.getItemAsync(APP_JWT_KEY); // Or await getAppJWT();

          if (appJWT) {
            // Add the Authorization header if the token exists
            if (!req.header) {
              req.header = new Headers();
            }
            req.header.set("Authorization", `Bearer ${appJWT}`);
          }

          try {
            return await next(req);
          } catch (error) {
            // Handle potential "Unauthenticated" errors globally if desired
            // e.g., if error.code === connect.Code.Unauthenticated
            if (error.code === connect.Code.Unauthenticated) { // Assuming connect.Code is available
                console.warn("Request failed with Unauthenticated. JWT might be expired or invalid.");
                // Optionally:
                // - Trigger a token refresh mechanism if you have one
                // - Navigate to login screen
                // - Clear the invalid JWT from secure store
            }
            throw error; // Re-throw the error to be caught by the caller
          }
        };
        ```
2.  **Use Interceptor When Creating ConnectRPC Transport/Client:**
    *   Modify your ConnectRPC client setup to include the `authInterceptor`.
        ```javascript
        // Example: services/apiClient.js (or wherever you create your main client)
        import { createPromiseClient } from "@connectrpc/connect";
        import { createConnectTransport } from "@connectrpc/connect-react-native";
        import { YourService } from "./your_protobuf_generated_code/your_service_connect"; // Adjust
        import { authInterceptor } from "./interceptors"; // Your interceptor

        const transport = createConnectTransport({
          baseUrl: "https://your-backend-api.example.com",
          interceptors: [authInterceptor], // Add the interceptor here
        });

        export const apiClient = createPromiseClient(YourService, transport);

        // If you have multiple services, you can reuse the transport
        // export const anotherServiceClient = createPromiseClient(AnotherService, transport);
        ```

This setup ensures that your Firebase App Check token is used for initial bootstrapping trust, and your application-specific JWT is used for ongoing session management, with secure storage and automatic inclusion in API calls via ConnectRPC interceptors.

---

## II. Backend Changes (Go with ConnectRPC)
This section covers the server-side implementation in Go using ConnectRPC to handle authentication.

### 1. Verify Firebase App Check Token
**Purpose:** To validate the App Check token received from the client to ensure the request is coming from an attested app instance.

**Package/Library:**
*   **`firebase.google.com/go/v4`**: The official Firebase Admin SDK for Go.
    ```bash
    go get firebase.google.com/go/v4
    ```

**Key Steps:**
1.  **Initialize Firebase Admin SDK:**
    *   Ensure the Firebase Admin SDK is initialized at the start of your application. This typically requires a service account key JSON file.
        ```go
        import (
        	"context"
        	"log"

        	firebase "firebase.google.com/go/v4"
        	// "firebase.google.com/go/v4/appcheck" // For App Check client
        	"google.golang.org/api/option"
        )

        func initializeFirebase() (*firebase.App, error) {
        	app, err := firebase.NewApp(context.Background(), nil) 
        	if err != nil {
        		log.Fatalf("error initializing app: %v\n", err)
        		return nil, err
        	}
        	return app, nil
        }

        // Call this once during your application startup
        // var firebaseApp *firebase.App
        // func init() {
        // 	var err error
        // 	firebaseApp, err = initializeFirebase()
        // 	if err != nil {
        // 		// Handle error, perhaps exit or log fatal
        // 	}
        // }
        ```
2.  **Get App Check Client:**
    *   Obtain an App Check client from the initialized Firebase app.
        ```go
        // import "firebase.google.com/go/v4/appcheck"

        // appCheckClient, err := firebaseApp.AppCheck(context.Background())
        // if err != nil {
        //   log.Fatalf("Error getting App Check client: %v\n", err)
        // }
        ```
3.  **Implement Verification in Authentication Handler:**
    *   In the ConnectRPC handler responsible for the initial authentication (e.g., `AuthenticateApp`), extract the `X-Firebase-AppCheck` header.
    *   Verify the token using `appCheckClient.VerifyToken()`.
        ```go
        import (
        	"context"
        	"log"
        	"net/http" // For header access in Connect interceptor/handler

        	"connectrpc.com/connect"
        	firebase "firebase.google.com/go/v4"
        	"firebase.google.com/go/v4/appcheck"
        	// your_protobuf_generated_code "path/to/your/protobuf/generated/code"
        )

        // Assume firebaseApp is initialized globally or passed appropriately
        var firebaseApp *firebase.App 
        // var appCheckClient *appcheck.Client // Initialize this during startup

        // Example of a ConnectRPC service implementation method
        // func (s *AuthServiceServer) AuthenticateApp(
        // 	ctx context.Context,
        // 	req *connect.Request[your_protobuf_generated_code.AuthenticateAppRequest],
        // ) (*connect.Response[your_protobuf_generated_code.AuthenticateAppResponse], error) {
        //
        // 	// 1. Initialize App Check client if not already done (best to do at startup)
        // 	if appCheckClient == nil {
        // 		var err error
        // 		appCheckClient, err = firebaseApp.AppCheck(context.Background())
        // 		if err != nil {
        // 			log.Printf("Error getting App Check client: %v", err)
        // 			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("could not initialize App Check"))
        // 		}
        // 	}
        //
        // 	// 2. Extract the App Check token from the request header
        // 	appCheckToken := req.Header().Get("X-Firebase-AppCheck")
        // 	if appCheckToken == "" {
        // 		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("missing X-Firebase-AppCheck token"))
        // 	}
        //
        // 	// 3. Verify the token
        // 	_, err := appCheckClient.VerifyToken(appCheckToken)
        // 	if err != nil {
        // 		log.Printf("Error verifying App Check token: %v", err)
        // 		// Consider logging the specific error for debugging but return a generic error to the client.
        // 		// Firebase Admin SDK might return specific errors for expired/invalid tokens.
        // 		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("invalid App Check token"))
        // 	}
        //
        // 	log.Println("Firebase App Check token verified successfully.")
        //
        // 	// 4. If verified, proceed to generate and return your application JWT
        // 	// appJWT, err := generateYourApplicationJWT(...)
        // 	// if err != nil { ... }
        // 	// return connect.NewResponse(&your_protobuf_generated_code.AuthenticateAppResponse{AppToken: appJWT}), nil
        //   return nil, nil // Placeholder
        // }
        ```
    *   **Note:** The `appCheckClient.VerifyToken()` method returns an `*appcheck.Token` struct which contains claims from the App Check token (like `AppID`, `Subject`). You might want to inspect these, though for basic verification, a `nil` error is sufficient.

### 2. Generate and Sign Your Application JWT
**Purpose:** After successfully verifying the App Check token, generate your own JWT to be used by the client for subsequent authenticated requests to your API.

**Package/Library:**
*   **`github.com/golang-jwt/jwt/v5`**: A popular Go library for working with JWTs.
    ```bash
    go get github.com/golang-jwt/jwt/v5
    ```

**Key Steps:**
1.  **Define JWT Claims:**
    *   Create a struct for your custom claims. Include standard claims like `RegisteredClaims` (which includes `ExpiresAt`, `IssuedAt`, etc.) and any custom data you need (e.g., `UserID`, `AppID`).
        ```go
        import "github.com/golang-jwt/jwt/v5"

        type AppClaims struct {
        	UserID string `json:"user_id,omitempty"`
        	AppID  string `json:"app_id,omitempty"` // Could be the Firebase App ID from App Check token
        	// Add any other custom claims relevant to your application
        	jwt.RegisteredClaims
        }
        ```
2.  **Create and Sign JWT:**
    *   Implement a function to generate and sign the JWT. You'll need a secret key. **Store and manage this key securely.**
        ```go
        import (
        	"time"
        	"github.com/golang-jwt/jwt/v5"
        )

        // IMPORTANT: This key should be stored securely, e.g., in environment variables or a secret manager.
        // Do NOT hardcode it in your source code for production.
        var jwtSecretKey = []byte("your-super-secret-and-strong-key")

        func GenerateApplicationJWT(userID string, appID string) (string, error) {
        	expirationTime := time.Now().Add(24 * time.Hour) // Example: 24 hours validity

        	claims := &AppClaims{
        		UserID: userID, // Optional, if your app has users at this stage
        		AppID:  appID,  // Can be derived from verified App Check token
        		RegisteredClaims: jwt.RegisteredClaims{
        			ExpiresAt: jwt.NewNumericDate(expirationTime),
        			IssuedAt:  jwt.NewNumericDate(time.Now()),
        			Issuer:    "your-app-name-or-domain", // Replace with your app's identifier
        		},
        	}

        	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
        	signedToken, err := token.SignedString(jwtSecretKey)
        	if err != nil {
        		return "", err
        	}
        	return signedToken, nil
        }

        // In your AuthenticateApp handler, after App Check verification:
        // firebaseAppID := appCheckTokenInfo.AppID // If you get this from VerifyToken response
        // appJWT, err := GenerateApplicationJWT("some-user-id-if-known", firebaseAppID)
        // if err != nil {
        //   log.Printf("Error generating application JWT: %v", err)
        //   return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("could not generate auth token"))
        // }
        // response := connect.NewResponse(&your_protobuf_generated_code.AuthenticateAppResponse{
        // 	AppToken: appJWT,
        // })
        // return response, nil
        ```
    *   **Security Note:** Consider using asymmetric signing methods (like RS256) for higher security, especially if different services need to verify the token without sharing the secret. HS256 is simpler if the same service issues and verifies.

### 3. Authenticate Subsequent Requests Using Your Application JWT
**Purpose:** To protect your main API endpoints by ensuring they receive a valid application JWT.

**Package/Library:**
*   **`connectrpc.com/connect`**: For creating interceptors directly.
*   **`connectrpc.com/authn`** (Recommended): A ConnectRPC utility package for structured authentication.
    ```bash
    go get connectrpc.com/authn
    ```

**Key Steps (using `connectrpc.com/authn`):**
1.  **Create an Authenticator:**
    *   Implement the `authn.Authenticator` interface. This involves a method `Authenticate` that takes the request headers and returns an `authn.Identity` or an error.
        ```go
        // Example: auth/jwt_authenticator.go
        package auth

        import (
        	"context"
        	"fmt"
        	"strings"
        	"time"

        	"connectrpc.com/authn"
        	"connectrpc.com/connect"
        	"github.com/golang-jwt/jwt/v5"
        )

        // Your AppClaims struct (as defined before)
        type AppClaims struct {
        	UserID string `json:"user_id,omitempty"`
        	AppID  string `json:"app_id,omitempty"`
        	jwt.RegisteredClaims
        }

        // jwtSecretKey (as defined before, ensure it's accessible here)
        var jwtSecretKey = []byte("your-super-secret-and-strong-key") 

        type JWTAuthenticator struct{}

        func NewJWTAuthenticator() *JWTAuthenticator {
        	return &JWTAuthenticator{}
        }

        // Authenticate implements authn.Authenticator
        func (a *JWTAuthenticator) Authenticate(ctx context.Context, spec authn.Specification) (authn.Identity, error) {
        	authHeader := spec.RequestHeader().Get("Authorization")
        	if authHeader == "" {
        		return nil, authn.Errorf(connect.CodeUnauthenticated, "missing Authorization header")
        	}

        	parts := strings.SplitN(authHeader, " ", 2)
        	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
        		return nil, authn.Errorf(connect.CodeUnauthenticated, "invalid Authorization header format: expected Bearer token")
        	}
        	tokenString := parts[1]

        	claims := &AppClaims{}
        	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
        		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
        			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        		}
        		return jwtSecretKey, nil
        	})

        	if err != nil {
        		if err == jwt.ErrSignatureInvalid {
        			return nil, authn.Errorf(connect.CodeUnauthenticated, "invalid token signature")
        		}
        		// Check for specific errors like expired token
        		// For example, if errors.Is(err, jwt.ErrTokenExpired)
        		return nil, authn.Errorf(connect.CodeUnauthenticated, "invalid token: %v", err)
        	}

        	if !token.Valid {
        		return nil, authn.Errorf(connect.CodeUnauthenticated, "token is invalid")
        	}
            
            // Optionally, perform more checks on claims like Issuer, Audience, etc.
            // if claims.Issuer != "your-app-name-or-domain" {
            //     return nil, authn.Errorf(connect.CodeUnauthenticated, "token has invalid issuer")
            // }

        	// Create an identity. You can make this richer.
        	// The authn.Identity can be any type. It's often a struct containing user/app info.
        	// This identity will be available in the context of your RPC handlers.
        	identity := &AppIdentity{
        		UserID:    claims.UserID,
        		AppID:     claims.AppID,
        		AllClaims: claims,
        	}
        	return identity, nil
        }

        // AppIdentity is a custom type to store authenticated identity information.
        type AppIdentity struct {
        	UserID    string
        	AppID     string
        	AllClaims *AppClaims
        }

        // You can add methods to AppIdentity to easily access claims or check permissions.
        func (id *AppIdentity) GetProperty(key string) string {
            if key == "user_id" { return id.UserID }
            if key == "app_id" { return id.AppID }
            return ""
        }
        ```
2.  **Create Authentication Interceptor:**
    *   Use `authn.NewInterceptor` with your authenticator.
        ```go
        // In your server setup (e.g., main.go or where you configure ConnectRPC services)
        // import (
        // 	"net/http"
        // 	"connectrpc.com/authn"
        // 	"connectrpc.com/connect"
        // 	"your-app/auth" // Assuming your JWTAuthenticator is in the auth package
        // 	your_service_connect "path/to/your/service/connect"
        // )

        // jwtAuth := auth.NewJWTAuthenticator()
        // authInterceptor, err := authn.NewInterceptor(jwtAuth)
        // if err != nil {
        // 	log.Fatalf("failed to create auth interceptor: %v", err)
        // }
        ```
3.  **Apply Interceptor to Services/Methods:**
    *   Apply the interceptor to all ConnectRPC service handlers that require authentication.
        ```go
        // mux := http.NewServeMux()
        // // Apply to a specific service.
        // // You can choose to apply it per service or globally.
        // path, handler := your_service_connect.NewYourServiceHandler(
        // 	&YourServiceImpl{}, // Your service implementation
        // 	connect.WithInterceptors(authInterceptor),
        // )
        // mux.Handle(path, handler)

        // http.ListenAndServe(":8080", mux)
        ```
4.  **Access Identity in Handlers:**
    *   In your RPC handlers, you can retrieve the `authn.Identity` (which will be your `AppIdentity`) from the context.
        ```go
        // import "connectrpc.com/authn"

        // func (s *YourServiceImpl) ProtectedMethod(
        // 	ctx context.Context,
        // 	req *connect.Request[your_protobuf_generated_code.ProtectedRequest],
        // ) (*connect.Response[your_protobuf_generated_code.ProtectedResponse], error) {
        //
        // 	identity := authn.GetIdentity(ctx) // This will be your *auth.AppIdentity
        // 	if identity == nil {
        // 		// This shouldn't happen if the interceptor is configured correctly and rejects unauthenticated requests.
        // 		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("identity not found in context"))
        // 	}
        //
        // 	appIdentity, ok := identity.(*auth.AppIdentity)
        // 	if !ok {
        // 		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("unexpected identity type in context"))
        // 	}
        //
        // 	log.Printf("Request authenticated for AppID: %s, UserID: %s", appIdentity.AppID, appIdentity.UserID)
        //
        // 	// Proceed with business logic...
        // 	return connect.NewResponse(&your_protobuf_generated_code.ProtectedResponse{
        // 		Message: "Successfully accessed protected method for " + appIdentity.AppID,
        // 	}), nil
        // }
        ```

This backend setup ensures that incoming requests are first validated for app integrity using Firebase App Check, and then subsequent API access is controlled via your custom application JWTs, managed by ConnectRPC interceptors.
