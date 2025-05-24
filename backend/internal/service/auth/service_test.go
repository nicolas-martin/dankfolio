package auth

import (
	"context"
	"strings"
	"testing"
	"time"

	dankfoliov1 "github.com/jasonblanchard/dankfolio/gen/go/dankfolio/v1"
	"github.com/jasonblanchard/dankfolio/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewService(t *testing.T) {
	t.Run("RandomSecret", func(t *testing.T) {
		cfg := service.Config{
			JWTSecret: "", // Empty secret
		}
		s, err := NewService(cfg)
		require.NoError(t, err)
		assert.NotNil(t, s)
		assert.NotEmpty(t, s.jwtSecret, "JWT secret should be generated if not provided")
	})

	t.Run("DefaultExpiry", func(t *testing.T) {
		cfg := service.Config{
			JWTSecret:  "test-secret",
			TokenExpiry: 0, // Zero expiry
		}
		s, err := NewService(cfg)
		require.NoError(t, err)
		assert.NotNil(t, s)
		assert.Equal(t, 24*time.Hour, s.tokenExpiry, "Default token expiry should be 24 hours")
	})

	t.Run("ProvidedValues", func(t *testing.T) {
		expectedSecret := "my-super-secret-key"
		expectedExpiry := 2 * time.Hour
		cfg := service.Config{
			JWTSecret:  expectedSecret,
			TokenExpiry: expectedExpiry,
		}
		s, err := NewService(cfg)
		require.NoError(t, err)
		assert.NotNil(t, s)
		assert.Equal(t, []byte(expectedSecret), s.jwtSecret)
		assert.Equal(t, expectedExpiry, s.tokenExpiry)
	})
}

func TestGenerateToken(t *testing.T) {
	cfg := service.Config{
		JWTSecret:  "test-generate-secret",
		TokenExpiry: time.Hour,
	}
	s, err := NewService(cfg)
	require.NoError(t, err)
	require.NotNil(t, s)

	ctx := context.Background()

	t.Run("Success", func(t *testing.T) {
		req := &dankfoliov1.GenerateTokenRequest{
			DeviceId: "test-device-id",
			Platform: "test-platform",
		}
		resp, err := s.GenerateToken(ctx, req)
		assert.NoError(t, err)
		require.NotNil(t, resp)
		assert.NotEmpty(t, resp.Token)
		assert.Equal(t, int64(time.Hour.Seconds()), resp.ExpiresIn)

		// Validate the token
		authUser, err := s.ValidateToken(ctx, &dankfoliov1.ValidateTokenRequest{Token: resp.Token})
		assert.NoError(t, err)
		require.NotNil(t, authUser)
		assert.Equal(t, req.DeviceId, authUser.User.GetDeviceId())
		assert.Equal(t, req.Platform, authUser.User.GetPlatform())

		// Parse token and verify claims
		claims := &AuthClaims{}
		token, err := jwt.ParseWithClaims(resp.Token, claims, func(token *jwt.Token) (interface{}, error) {
			return s.jwtSecret, nil
		})
		require.NoError(t, err)
		require.NotNil(t, token)
		assert.True(t, token.Valid)

		assert.Equal(t, req.DeviceId, claims.DeviceID)
		assert.Equal(t, req.Platform, claims.Platform)
		assert.Equal(t, "dankfolio", claims.Issuer)
		assert.Equal(t, req.DeviceId, claims.Subject)
		assert.WithinDuration(t, time.Now().Add(s.tokenExpiry), time.Unix(claims.ExpiresAt.Unix(), 0), 5*time.Second) // Allow 5s clock skew
		assert.WithinDuration(t, time.Now(), time.Unix(claims.IssuedAt.Unix(), 0), 5*time.Second)
	})

	t.Run("MissingDeviceID", func(t *testing.T) {
		req := &dankfoliov1.GenerateTokenRequest{
			DeviceId: "", // Empty DeviceId
			Platform: "test-platform",
		}
		resp, err := s.GenerateToken(ctx, req)
		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.True(t, strings.Contains(err.Error(), "DeviceID is required"), "Error message should indicate missing DeviceID")
	})
}

func TestValidateToken(t *testing.T) {
	ctx := context.Background()
	testDeviceID := "test-device-for-validation"
	testPlatform := "test-platform-for-validation"

	cfg1 := service.Config{JWTSecret: "testSecret1", TokenExpiry: 1 * time.Hour}
	service1, err := NewService(cfg1)
	require.NoError(t, err)
	require.NotNil(t, service1)

	cfg2 := service.Config{JWTSecret: "testSecret2", TokenExpiry: 1 * time.Hour}
	service2, err := NewService(cfg2)
	require.NoError(t, err)
	require.NotNil(t, service2)

	// Generate a valid token with service1
	generateResp, err := service1.GenerateToken(ctx, &dankfoliov1.GenerateTokenRequest{
		DeviceId: testDeviceID,
		Platform: testPlatform,
	})
	require.NoError(t, err)
	require.NotNil(t, generateResp)
	validTokenString := generateResp.Token

	t.Run("ValidToken", func(t *testing.T) {
		resp, err := service1.ValidateToken(ctx, &dankfoliov1.ValidateTokenRequest{Token: validTokenString})
		assert.NoError(t, err)
		require.NotNil(t, resp)
		require.NotNil(t, resp.User)
		assert.Equal(t, testDeviceID, resp.User.GetDeviceId())
		assert.Equal(t, testPlatform, resp.User.GetPlatform())
	})

	t.Run("EmptyToken", func(t *testing.T) {
		resp, err := service1.ValidateToken(ctx, &dankfoliov1.ValidateTokenRequest{Token: ""})
		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.True(t, strings.Contains(err.Error(), "token string is empty"), "Error message should indicate empty token string")
	})

	t.Run("MalformedToken", func(t *testing.T) {
		resp, err := service1.ValidateToken(ctx, &dankfoliov1.ValidateTokenRequest{Token: "not-a-jwt-token"})
		assert.Error(t, err)
		assert.Nil(t, resp)
		// Error message from jwt-go library is "token contains an invalid number of segments"
		assert.True(t, strings.Contains(err.Error(), "token contains an invalid number of segments"), "Error message should indicate malformed token")
	})

	t.Run("WrongSigningMethod", func(t *testing.T) {
		claims := &AuthClaims{
			DeviceID: testDeviceID,
			Platform: testPlatform,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
				Issuer:    "dankfolio",
				Subject:   testDeviceID,
			},
		}
		// Create a token with SigningMethodNone
		token := jwt.NewWithClaims(jwt.SigningMethodNone, claims)
		signedToken, err := token.SignedString(jwt.UnsafeAllowNoneSignatureType) // This is how you sign with "none"
		require.NoError(t, err, "Failed to sign token with none algorithm")

		resp, err := service1.ValidateToken(ctx, &dankfoliov1.ValidateTokenRequest{Token: signedToken})
		assert.Error(t, err)
		assert.Nil(t, resp)
		// jwt-go v5 returns "token signature is invalid" when a different signing method is expected
		assert.True(t, strings.Contains(err.Error(), "token signature is invalid") || strings.Contains(err.Error(), "unexpected signing method"), "Error message should indicate wrong signing method")
	})

	t.Run("ExpiredToken", func(t *testing.T) {
		shortExpiryCfg := service.Config{JWTSecret: "short-expiry-secret", TokenExpiry: 1 * time.Millisecond}
		shortExpiryService, err := NewService(shortExpiryCfg)
		require.NoError(t, err)

		expiredTokenResp, err := shortExpiryService.GenerateToken(ctx, &dankfoliov1.GenerateTokenRequest{
			DeviceId: "device-exp",
			Platform: "platform-exp",
		})
		require.NoError(t, err)
		require.NotNil(t, expiredTokenResp)

		// Wait for token to expire
		time.Sleep(5 * time.Millisecond) // Sleep a bit longer than expiry to ensure it's expired

		resp, err := shortExpiryService.ValidateToken(ctx, &dankfoliov1.ValidateTokenRequest{Token: expiredTokenResp.Token})
		assert.Error(t, err)
		assert.Nil(t, resp)
		// jwt-go v5 returns "token has invalid claims: token is expired"
		assert.True(t, strings.Contains(err.Error(), "token is expired"), "Error message should indicate token is expired")
	})

	t.Run("DifferentSecret", func(t *testing.T) {
		// validTokenString was generated with service1 (and cfg1's secret)
		// service2 is initialized with cfg2's secret
		resp, err := service2.ValidateToken(ctx, &dankfoliov1.ValidateTokenRequest{Token: validTokenString})
		assert.Error(t, err)
		assert.Nil(t, resp)
		// jwt-go v5 returns "token signature is invalid" for this case
		assert.True(t, strings.Contains(err.Error(), "token signature is invalid"), "Error message should indicate signature mismatch")
	})

	t.Run("InvalidClaimsType", func(t *testing.T) {
		// Create a token with different claims type but signed with service1's secret
		type DifferentClaims struct {
			SomeData string `json:"some_data"`
			jwt.RegisteredClaims
		}
		claims := &DifferentClaims{
			SomeData: "some-value",
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
				Issuer:    "dankfolio",
				Subject:   testDeviceID,
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		signedToken, err := token.SignedString(service1.jwtSecret)
		require.NoError(t, err)

		resp, err := service1.ValidateToken(ctx, &dankfoliov1.ValidateTokenRequest{Token: signedToken})
		assert.Error(t, err) // Error should occur because we are trying to parse into AuthClaims
		assert.Nil(t, resp)
		// This error is a bit generic, "token invalid" because the claims struct won't match
		// We could also see "token signature is invalid" if the parsing of claims fails in a way that affects signature validation.
		// The key is that an error *is* returned.
		assert.True(t, strings.Contains(err.Error(), "token invalid") || strings.Contains(err.Error(), "token signature is invalid"), "Error message should indicate claim type mismatch or general invalidity")
	})
}
