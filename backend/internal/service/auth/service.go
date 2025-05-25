package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"time"

	"github.com/golang-jwt/jwt/v5"
	dankfoliov1 "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
)

// Service handles authentication operations
type Service struct {
	jwtSecret   []byte
	tokenExpiry time.Duration
}

// AuthClaims represents the JWT claims for device authentication
type AuthClaims struct {
	DeviceID string `json:"device_id"`
	Platform string `json:"platform"`
	jwt.RegisteredClaims
}

// AuthenticatedUser represents an authenticated user context
type AuthenticatedUser struct {
	DeviceID string
	Platform string
}

// Config holds the configuration for the auth service
type Config struct {
	JWTSecret   string
	TokenExpiry time.Duration
}

// NewService creates a new authentication service
func NewService(config *Config) (*Service, error) {
	jwtSecret := []byte(config.JWTSecret)

	// If no secret provided, generate a random one (for development)
	if len(jwtSecret) == 0 {
		randomBytes := make([]byte, 32)
		if _, err := rand.Read(randomBytes); err != nil {
			return nil, fmt.Errorf("failed to generate: %w", err)
		}
		jwtSecret = []byte(hex.EncodeToString(randomBytes))
		slog.Warn("No JWT secret provided, generated random secret for development",
			"secret_length", len(jwtSecret))
	}

	tokenExpiry := config.TokenExpiry
	if tokenExpiry == 0 {
		tokenExpiry = 24 * time.Hour // Default to 24 hours
	}

	return &Service{
		jwtSecret:   jwtSecret,
		tokenExpiry: tokenExpiry,
	}, nil
}

// GenerateToken creates a new JWT token for a device
func (s *Service) GenerateToken(ctx context.Context, req *dankfoliov1.GenerateTokenRequest) (*dankfoliov1.GenerateTokenResponse, error) {
	if req.DeviceId == "" {
		return nil, fmt.Errorf("DeviceID is required")
	}

	// Create claims
	now := time.Now()
	claims := AuthClaims{
		DeviceID: req.DeviceId,
		Platform: req.Platform,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.tokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "dankfolio",
			Subject:   req.DeviceId,
		},
	}

	// Create token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign token
	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		slog.Error("Failed to sign JWT token", "error", err, "device_id", req.DeviceId)
		return nil, fmt.Errorf("failed to generate token")
	}

	slog.Info("Generated new JWT token",
		"device_id", req.DeviceId,
		"platform", req.Platform,
		"expires_at", claims.ExpiresAt.Format(time.RFC3339))

	return &dankfoliov1.GenerateTokenResponse{
		Token:     tokenString,
		ExpiresIn: int32(s.tokenExpiry.Seconds()),
	}, nil
}

// ValidateToken parses and validates a JWT token
func (s *Service) ValidateToken(tokenString string) (*AuthenticatedUser, error) {
	if tokenString == "" {
		return nil, fmt.Errorf("token string is empty")
	}

	// Parse and validate the JWT token
	token, err := jwt.ParseWithClaims(tokenString, &AuthClaims{}, func(token *jwt.Token) (any, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, fmt.Errorf("token invalid: %w", err)
	}

	// Extract claims
	claims, ok := token.Claims.(*AuthClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("token invalid")
	}

	// Validate required claims fields
	if claims.DeviceID == "" {
		return nil, fmt.Errorf("token invalid")
	}

	// Check if token is expired
	if claims.ExpiresAt != nil && claims.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("token is expired")
	}

	return &AuthenticatedUser{
		DeviceID: claims.DeviceID,
		Platform: claims.Platform,
	}, nil
}
