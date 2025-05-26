package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Service handles authentication operations
type Service struct {
	jwtSecret      []byte
	tokenExpiry    time.Duration
	appCheckClient AppCheckClientInterface
	env            string
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
