package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64" // For dev token
	"encoding/hex"
	"encoding/json" // For dev token
	"fmt"
	"log/slog"
	"strings" // For dev token
	"time"

	"firebase.google.com/go/v4/appcheck"
	"github.com/golang-jwt/jwt/v5"
	dankfoliov1 "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
)

// AppCheckClientInterface defines the interface for App Check client operations
type AppCheckClientInterface interface {
	VerifyToken(token string) (*appcheck.DecodedAppCheckToken, error)
}

// NewService creates a new authentication service
func NewService(config *Config) (*Service, error) {
	if config.AppCheckClient == nil {
		return nil, fmt.Errorf("AppCheckClient is required for auth.Service")
	}

	jwtSecret := []byte(config.JWTSecret)
	if len(jwtSecret) == 0 {
		randomBytes := make([]byte, 32)
		if _, err := rand.Read(randomBytes); err != nil {
			return nil, fmt.Errorf("failed to generate random JWT secret: %w", err)
		}
		jwtSecret = []byte(hex.EncodeToString(randomBytes))
		slog.Warn("No JWT secret provided, generated random secret for development", "secret_length", len(jwtSecret))
	}

	tokenExpiry := config.TokenExpiry
	if tokenExpiry == 0 {
		tokenExpiry = 24 * time.Hour // Default to 24 hours
	}

	s := &Service{
		jwtSecret:      jwtSecret,
		tokenExpiry:    tokenExpiry,
		appCheckClient: config.AppCheckClient,
		appEnv:         config.AppEnv, // Renamed field
	}

	slog.Info("AuthService initialized", "appEnv", s.appEnv, "tokenExpiry", s.tokenExpiry) // Updated log key

	return s, nil
}

// GenerateToken verifies an App Check token and then creates a new application JWT.
func (s *Service) GenerateToken(ctx context.Context, req *dankfoliov1.GenerateTokenRequest) (*dankfoliov1.GenerateTokenResponse, error) {
	if s.appCheckClient == nil {
		slog.Error("AppCheck client not initialized in auth.Service, cannot verify App Check token.")
		return nil, fmt.Errorf("internal server error: AppCheck service not configured")
	}
	if req.AppCheckToken == "" {
		// Based on proto, AppCheckToken is field 1, Platform is field 2.
		// The field name in the generated Go struct is AppCheckToken.
		return nil, fmt.Errorf("AppCheckToken is required")
	}

	// Verify the App Check token
	appCheckTokenInfo, err := s.appCheckClient.VerifyToken(req.AppCheckToken)
	if err != nil {
		slog.Warn("Firebase App Check token verification failed", "error", err)
		return nil, fmt.Errorf("invalid AppCheck token: %w", err)
	}

	slog.Info("Firebase App Check token verified successfully", "app_id", appCheckTokenInfo.AppID, "subject", appCheckTokenInfo.Subject)

	// App Check token is valid, now generate an application JWT.
	// Use the App Check token's Subject as the DeviceID for our application JWT.
	deviceIDFromAppCheck := appCheckTokenInfo.Subject

	now := time.Now()
	claims := AuthClaims{
		DeviceID: deviceIDFromAppCheck,
		Platform: req.Platform, // Use platform from request
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.tokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "dankfolio-app", // Consistent issuer for app JWTs
			Subject:   deviceIDFromAppCheck,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(s.jwtSecret)
	if err != nil {
		slog.Error("Failed to sign application JWT", "error", err, "app_check_subject", deviceIDFromAppCheck)
		return nil, fmt.Errorf("failed to generate application token")
	}

	slog.Info("Generated new application JWT after App Check verification",
		"app_check_subject", deviceIDFromAppCheck,
		"platform", claims.Platform,
		"expires_at", claims.ExpiresAt.Format(time.RFC3339))

	return &dankfoliov1.GenerateTokenResponse{
		Token:     signedToken, // This is the application JWT
		ExpiresIn: int32(s.tokenExpiry.Seconds()),
	}, nil
}

// ValidateToken parses and validates an application JWT token
func (s *Service) ValidateToken(tokenString string) (*AuthenticatedUser, error) {
	if tokenString == "" {
		return nil, fmt.Errorf("token string is empty")
	}

	if s.appEnv == "development" {
		return validateDevToken(tokenString)
	}

	// Original HS256 validation logic
	slog.Debug("Attempting to validate a standard HS256 token")
	token, err := jwt.ParseWithClaims(tokenString, &AuthClaims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, fmt.Errorf("application token invalid: %w", err)
	}

	claims, ok := token.Claims.(*AuthClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("application token claims invalid")
	}

	if claims.DeviceID == "" {
		// This check can also use claims.Subject if DeviceID is not a custom claim
		// but derived from Subject in AuthClaims as it is here.
		return nil, fmt.Errorf("application token missing device identifier (from subject)")
	}

	// Note: jwt.ParseWithClaims already validates 'exp', 'iat', 'nbf' if RegisteredClaims is embedded.
	// So, an explicit check claims.ExpiresAt.Time.Before(time.Now()) is somewhat redundant
	// if token.Valid is true, but it doesn't hurt to keep for clarity or if specific error is needed.
	// However, the error from ParseWithClaims (if due to expiry) would be more generic like "token is expired".
	// If we want our specific message "application token is expired", this explicit check is useful.
	if claims.ExpiresAt != nil && claims.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("application token is expired")
	}
	// Additional check to ensure subject (which becomes DeviceID) is present
	if claims.Subject == "" {
		return nil, fmt.Errorf("application token missing subject claim")
	}

	return &AuthenticatedUser{
		DeviceID: claims.DeviceID, // This is claims.Subject due to struct definition
		Platform: claims.Platform,
	}, nil
}

func validateDevToken(tokenString string) (*AuthenticatedUser, error) {
	parts := strings.Split(tokenString, ".")
	if len(parts) == 3 && parts[2] == "dev-signature" {
		slog.Debug("Attempting to validate a development token (appEnv=development)") // Updated log

		headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
		if err != nil {
			slog.Warn("Failed to decode dev token header", "error", err)
			return nil, fmt.Errorf("invalid dev token: failed to decode header: %w", err)
		}

		payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
		if err != nil {
			slog.Warn("Failed to decode dev token payload", "error", err)
			return nil, fmt.Errorf("invalid dev token: failed to decode payload: %w", err)
		}

		// Call the updated _validateDevTokenClaims function
		deviceID, platform, err := validateDevTokenClaims(headerBytes, payloadBytes)
		if err != nil {
			// _validateDevTokenClaims already logs specifics for most cases
			return nil, err
		}

		slog.Info("Successfully validated development token (appEnv=development)", "device_id", deviceID, "platform", platform) // Updated log
		return &AuthenticatedUser{
			DeviceID: deviceID,
			Platform: platform,
		}, nil
	} else {
		slog.Debug("Backend env is development, but token does not appear to be a dev-signature token. Proceeding to standard validation.") // Updated log
	}
	return nil, fmt.Errorf("invalid dev token: expected format 'header.payload.dev-signature', got '%s'", tokenString)
}

func validateDevTokenClaims(headerBytes []byte, payloadBytes []byte) (deviceID string, platform string, err error) {
	var headerMap map[string]any
	if errUnmarshal := json.Unmarshal(headerBytes, &headerMap); errUnmarshal != nil {
		slog.Warn("Failed to unmarshal dev token header into map for _validateDevTokenClaims", "error", errUnmarshal)
		// Return empty strings for deviceID and platform along with the error
		return "", "", fmt.Errorf("invalid dev token: failed to unmarshal header: %w", errUnmarshal)
	}

	var payloadMap map[string]any
	if errUnmarshal := json.Unmarshal(payloadBytes, &payloadMap); errUnmarshal != nil {
		slog.Warn("Failed to unmarshal dev token payload into map for _validateDevTokenClaims", "error", errUnmarshal)
		return "", "", fmt.Errorf("invalid dev token: failed to unmarshal payload: %w", errUnmarshal)
	}

	// Validate header algorithm
	alg, ok := headerMap["alg"].(string)
	if !ok || alg != "DEV" {
		return "", "", fmt.Errorf("invalid dev token: incorrect or missing 'alg' in header, expected 'DEV', got '%v'", headerMap["alg"])
	}

	// Validate 'dev' claim in payload
	devClaim, ok := payloadMap["dev"].(bool)
	if !ok || !devClaim {
		return "", "", fmt.Errorf("invalid dev token: 'dev' claim in payload is missing, not a boolean, or not true")
	}

	// Validate 'iss' claim in payload
	iss, ok := payloadMap["iss"].(string)
	if !ok || iss != "dankfolio-app-dev" {
		return "", "", fmt.Errorf("invalid dev token: incorrect or missing 'iss' in payload, expected 'dankfolio-app-dev', got '%v'", payloadMap["iss"])
	}

	// Validate 'exp' claim in payload
	expFloat, ok := payloadMap["exp"].(float64) // JSON numbers are float64 by default
	if !ok {
		// It's crucial to return here if 'exp' is not a number, to avoid panic in int64 conversion.
		return "", "", fmt.Errorf("invalid dev token: 'exp' claim in payload is missing or not a number")
	}
	exp := int64(expFloat) // Convert float64 to int64 for time comparison
	if exp <= time.Now().Unix() {
		return "", "", fmt.Errorf("invalid dev token: expired (exp: %d, now: %d)", exp, time.Now().Unix())
	}

	// Validate and extract 'device_id' claim from payload
	deviceIDStr, ok := payloadMap["device_id"].(string)
	if !ok || deviceIDStr == "" {
		return "", "", fmt.Errorf("invalid dev token: 'device_id' claim in payload is missing, not a string, or empty")
	}

	// Extract 'platform' claim from payload (optional, can be empty, defaults to empty string if missing/wrong type)
	platformStr, _ := payloadMap["platform"].(string)

	// Optional: Log 'sub' claim discrepancies from payload
	subClaim, subOk := payloadMap["sub"].(string)
	if !subOk || subClaim == "" || subClaim != deviceIDStr {
		slog.Warn("Dev token 'sub' claim does not match 'device_id', is empty, or missing during map validation", "sub", subClaim, "device_id", deviceIDStr)
	}

	return deviceIDStr, platformStr, nil
}
