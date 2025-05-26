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

// Service handles authentication operations
type Service struct {
	jwtSecret      []byte
	tokenExpiry    time.Duration
	appCheckClient AppCheckClientInterface
	appEnv         string // Renamed from backendAppEnv
}

// AuthClaims represents the JWT claims for device authentication
type AuthClaims struct {
	DeviceID string `json:"device_id"` // Derived from AppCheck token's Subject
	Platform string `json:"platform"`
	jwt.RegisteredClaims
}

// AuthenticatedUser represents an authenticated user context from the Application JWT
type AuthenticatedUser struct {
	DeviceID string
	Platform string
}

// Config holds the configuration for the auth service
type Config struct {
	JWTSecret      string
	TokenExpiry    time.Duration
	AppCheckClient AppCheckClientInterface
	AppEnv         string // Renamed from BackendAppEnv
}

// NewService creates a new authentication service
func NewService(config *Config) (*Service, error) {
	if config.AppCheckClient == nil {
		slog.Warn("No AppCheck client provided to auth.NewService. App Check verification will be critically impaired.")
		// Depending on strictness, might return an error:
		// return nil, fmt.Errorf("AppCheckClient is required for auth.Service")
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
		"expires_at", claims.ExpiresAt.Time.Format(time.RFC3339))

	return &dankfoliov1.GenerateTokenResponse{
		Token:     signedToken, // This is the application JWT
		ExpiresIn: int32(s.tokenExpiry.Seconds()),
	}, nil
}

// DevTokenHeader represents the header of a development token
type DevTokenHeader struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
}

// DevTokenPayload represents the payload of a development token
type DevTokenPayload struct {
	Sub      string `json:"sub"`
	DeviceID string `json:"device_id"`
	Platform string `json:"platform"`
	Iat      int64  `json:"iat"`
	Exp      int64  `json:"exp"`
	Dev      bool   `json:"dev"`
	Iss      string `json:"iss"`
}

// _validateDevTokenClaims performs specific checks on decoded dev token header and payload.
func _validateDevTokenClaims(headerBytes []byte, payloadBytes []byte) (*DevTokenPayload, error) {
	var header DevTokenHeader
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		slog.Warn("Failed to unmarshal dev token header for _validateDevTokenClaims", "error", err)
		return nil, fmt.Errorf("invalid dev token: failed to unmarshal header: %w", err)
	}

	var payload DevTokenPayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		slog.Warn("Failed to unmarshal dev token payload for _validateDevTokenClaims", "error", err)
		return nil, fmt.Errorf("invalid dev token: failed to unmarshal payload: %w", err)
	}

	if header.Alg != "DEV" {
		return nil, fmt.Errorf("invalid dev token: incorrect algorithm, expected DEV, got %s", header.Alg)
	}
	if !payload.Dev {
		return nil, fmt.Errorf("invalid dev token: 'dev' claim is not true")
	}
	if payload.Iss != "dankfolio-app-dev" {
		return nil, fmt.Errorf("invalid dev token: incorrect issuer, expected dankfolio-app-dev, got %s", payload.Iss)
	}
	if payload.Exp <= time.Now().Unix() {
		return nil, fmt.Errorf("invalid dev token: expired (exp: %d, now: %d)", payload.Exp, time.Now().Unix())
	}
	if payload.DeviceID == "" {
		return nil, fmt.Errorf("invalid dev token: 'device_id' claim is empty")
	}
	// Optional: Log 'sub' claim discrepancies but don't make it a validation failure by default.
	if payload.Sub == "" || payload.Sub != payload.DeviceID {
		slog.Warn("Dev token 'sub' claim does not match 'device_id' or is empty during _validateDevTokenClaims", "sub", payload.Sub, "device_id", payload.DeviceID)
	}
	return &payload, nil
}

// ValidateToken parses and validates an application JWT token
func (s *Service) ValidateToken(tokenString string) (*AuthenticatedUser, error) {
	if tokenString == "" {
		return nil, fmt.Errorf("token string is empty")
	}

	if s.appEnv == "development" { // Condition changed to appEnv and "development"
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

			validatedPayload, err := _validateDevTokenClaims(headerBytes, payloadBytes)
			if err != nil {
				// _validateDevTokenClaims already logs specifics
				return nil, err
			}

			slog.Info("Successfully validated development token (appEnv=development)", "device_id", validatedPayload.DeviceID, "platform", validatedPayload.Platform) // Updated log
			return &AuthenticatedUser{
				DeviceID: validatedPayload.DeviceID,
				Platform: validatedPayload.Platform,
			}, nil
		} else {
			slog.Debug("Backend env is development, but token does not appear to be a dev-signature token. Proceeding to standard validation.") // Updated log
		}
	} else {
		// This is the block for s.appEnv != "development"
		parts := strings.Split(tokenString, ".")
		if len(parts) == 3 && parts[2] == "dev-signature" {
			slog.Warn("Dev-signature token encountered in non-development backend environment. Token will be processed by standard validation and should be rejected.", "appEnv", s.appEnv) // Updated log
		}
	}

	// Original HS256 validation logic
	slog.Debug("Attempting to validate a standard HS256 token")
	token, err := jwt.ParseWithClaims(tokenString, &AuthClaims{}, func(token *jwt.Token) (interface{}, error) {
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
	if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
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
// No changes needed for this part, it was moved into the new structure.
