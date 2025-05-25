package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"time"

	"firebase.google.com/go/v4/appcheck"
	"github.com/golang-jwt/jwt/v5"
	dankfoliov1 "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
)

// Service handles authentication operations
type Service struct {
	jwtSecret      []byte
	tokenExpiry    time.Duration
	appCheckClient *appcheck.Client
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
	AppCheckClient *appcheck.Client
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

	return &Service{
		jwtSecret:      jwtSecret,
		tokenExpiry:    tokenExpiry,
		appCheckClient: config.AppCheckClient,
	}, nil
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

// ValidateToken parses and validates an application JWT token
func (s *Service) ValidateToken(tokenString string) (*AuthenticatedUser, error) {
	if tokenString == "" {
		return nil, fmt.Errorf("token string is empty")
	}


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
		return nil, fmt.Errorf("application token missing device identifier")
	}


	if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
		return nil, fmt.Errorf("application token is expired")

	}

	return &AuthenticatedUser{
		DeviceID: claims.DeviceID,
		Platform: claims.Platform,
	}, nil
}
