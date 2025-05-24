# Bearer Token Authentication Setup Guide

This guide shows how to implement bearer token authentication for your Connect RPC services using `connectrpc/authn-go`.

## Frontend Implementation ✅ 

The frontend implementation has been completed with the following features:

- **Authentication Manager** (`src/services/grpc/authManager.ts`): Handles token storage and validation
- **Authentication Service** (`src/services/authService.ts`): Manages token requests and refresh logic
- **Connect Interceptor** (`src/services/grpc/apiClient.ts`): Automatically adds bearer tokens to all requests
- **Development Fallback**: Generates dev tokens when backend is not available
- **Test Component** (`src/components/Common/AuthTest.tsx`): UI for testing authentication

## Backend Implementation (Go)

### Required Dependencies

```bash
go get connectrpc.com/authn
go get github.com/golang-jwt/jwt/v5
go get connectrpc.com/connect
```

### 1. Authentication Function

```go
package main

import (
    "context"
    "fmt"
    "net/http"
    "strings"
    "time"
    
    "connectrpc.com/authn"
    "github.com/golang-jwt/jwt/v5"
)

// AuthClaims represents the JWT claims
type AuthClaims struct {
    DeviceID string `json:"deviceId"`
    Platform string `json:"platform"`
    jwt.RegisteredClaims
}

// AuthenticatedUser represents an authenticated user
type AuthenticatedUser struct {
    DeviceID string
    Platform string
}

var jwtSecretKey = []byte("your-super-secret-jwt-key")

// Main authentication function for connectrpc/authn
func authenticate(ctx context.Context, req *http.Request) (any, error) {
    authHeader := req.Header.Get("Authorization")
    if authHeader == "" {
        return nil, authn.Errorf("missing authorization header")
    }

    const bearerPrefix = "Bearer "
    if !strings.HasPrefix(authHeader, bearerPrefix) {
        return nil, authn.Errorf("invalid authorization header format")
    }

    tokenString := strings.TrimPrefix(authHeader, bearerPrefix)
    if tokenString == "" {
        return nil, authn.Errorf("empty bearer token")
    }

    token, err := jwt.ParseWithClaims(tokenString, &AuthClaims{}, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }
        return jwtSecretKey, nil
    })

    if err != nil {
        return nil, authn.Errorf("invalid token: %v", err)
    }

    claims, ok := token.Claims.(*AuthClaims)
    if !ok || !token.Valid {
        return nil, authn.Errorf("invalid token claims")
    }

    if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
        return nil, authn.Errorf("token expired")
    }

    return &AuthenticatedUser{
        DeviceID: claims.DeviceID,
        Platform: claims.Platform,
    }, nil
}
```

### 2. Token Generation Endpoint

```go
type TokenRequest struct {
    DeviceID string `json:"deviceId"`
    Platform string `json:"platform"`
}

type TokenResponse struct {
    Token     string `json:"token"`
    ExpiresIn int    `json:"expiresIn"`
}

func generateToken(deviceID, platform string) (string, error) {
    claims := AuthClaims{
        DeviceID: deviceID,
        Platform: platform,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            NotBefore: jwt.NewNumericDate(time.Now()),
            Issuer:    "dankfolio-backend",
            Subject:   deviceID,
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(jwtSecretKey)
}

func tokenHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var req TokenRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    if req.DeviceID == "" {
        http.Error(w, "deviceId is required", http.StatusBadRequest)
        return
    }

    token, err := generateToken(req.DeviceID, req.Platform)
    if err != nil {
        http.Error(w, "Failed to generate token", http.StatusInternalServerError)
        return
    }

    response := TokenResponse{
        Token:     token,
        ExpiresIn: 86400, // 24 hours
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}
```

### 3. Server Setup with Authentication

```go
func setupServer() {
    // Create authentication middleware
    authMiddleware := authn.NewMiddleware(authenticate)

    mux := http.NewServeMux()
    
    // Token endpoint (NOT behind auth middleware)
    mux.HandleFunc("/auth/token", tokenHandler)
    
    // Your Connect services (these will be protected)
    // mux.Handle(coinv1connect.NewCoinServiceHandler(yourCoinService))
    // mux.Handle(tradev1connect.NewTradeServiceHandler(yourTradeService))
    
    // Wrap with authentication middleware
    handler := authMiddleware.Wrap(mux)
    
    // Add CORS if needed
    finalHandler := addCORSMiddleware(handler)
    
    log.Println("Starting server on :8080")
    http.ListenAndServe(":8080", finalHandler)
}
```

### 4. Accessing Authenticated User in Connect Handlers

```go
func (s *CoinService) GetAvailableCoins(
    ctx context.Context,
    req *connect.Request[coinv1.GetAvailableCoinsRequest],
) (*connect.Response[coinv1.GetAvailableCoinsResponse], error) {
    // Get authenticated user from context
    user, ok := authn.GetInfo(ctx).(*AuthenticatedUser)
    if !ok {
        return nil, fmt.Errorf("no authenticated user found")
    }
    
    log.Printf("Request from device: %s, platform: %s", user.DeviceID, user.Platform)
    
    // Your handler logic here
    // ...
}
```

## Security Considerations

1. **JWT Secret Key**: Use a strong, random secret key and store it securely (environment variables)
2. **Token Expiry**: Set appropriate token expiration times (24 hours is reasonable)
3. **HTTPS**: Always use HTTPS in production
4. **Token Storage**: Tokens are stored securely using AsyncStorage on the frontend
5. **Token Refresh**: The frontend automatically refreshes tokens when needed

## Testing the Implementation

1. Use the `AuthTest` component in your app to verify authentication is working
2. Check the logs to see authentication flow
3. Test with both valid and invalid tokens
4. Verify that unauthenticated requests are rejected

## Environment Variables

Make sure your `.env` file has:

```
REACT_APP_API_URL=http://your-backend-url:8080
DEBUG_MODE=true
```

## Production Deployment

1. Change `DEBUG_MODE=false` in production
2. Use proper JWT secret key from environment variables
3. Configure proper CORS origins (not `*`)
4. Set up proper logging and monitoring
5. Consider implementing token refresh endpoints for long-term usage

## Error Handling

The implementation includes proper error handling for:
- Missing tokens
- Invalid tokens
- Expired tokens
- Network failures
- Backend unavailability (development mode fallback)

All errors are logged and displayed appropriately in the UI. 