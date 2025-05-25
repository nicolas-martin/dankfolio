package auth

import (
	"context"
	"strings"
	"testing"
	"time"

	"firebase.google.com/go/v4/appcheck"
	"github.com/golang-jwt/jwt/v5"
	dankfoliov1 "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// MockAppCheckClient implements a mock for Firebase App Check client
type MockAppCheckClient struct {
	shouldFail   bool
	failureError error
	tokenInfo    *appcheck.DecodedAppCheckToken
}

func (m *MockAppCheckClient) VerifyToken(token string) (*appcheck.DecodedAppCheckToken, error) {
	if m.shouldFail {
		return nil, m.failureError
	}
	if m.tokenInfo != nil {
		return m.tokenInfo, nil
	}
	// Default successful response
	return &appcheck.DecodedAppCheckToken{
		AppID:   "test-app-id",
		Subject: "test-device-subject",
	}, nil
}

func TestNewService(t *testing.T) {
	mockAppCheck := &MockAppCheckClient{}

	t.Run("RandomSecret", func(t *testing.T) {
		cfg := &Config{
			JWTSecret:      "", // Empty secret
			AppCheckClient: mockAppCheck,
		}
		s, err := NewService(cfg)
		require.NoError(t, err)
		assert.NotNil(t, s)
		assert.NotEmpty(t, s.jwtSecret, "JWT secret should be generated if not provided")
		assert.NotNil(t, s.appCheckClient, "App Check client should be set")
	})

	t.Run("DefaultExpiry", func(t *testing.T) {
		cfg := &Config{
			JWTSecret:      "test-secret",
			TokenExpiry:    0, // Zero expiry
			AppCheckClient: mockAppCheck,
		}
		s, err := NewService(cfg)
		require.NoError(t, err)
		assert.NotNil(t, s)
		assert.Equal(t, 24*time.Hour, s.tokenExpiry, "Default token expiry should be 24 hours")
	})

	t.Run("ProvidedValues", func(t *testing.T) {
		expectedSecret := "my-super-secret-key"
		expectedExpiry := 2 * time.Hour
		cfg := &Config{
			JWTSecret:      expectedSecret,
			TokenExpiry:    expectedExpiry,
			AppCheckClient: mockAppCheck,
		}
		s, err := NewService(cfg)
		require.NoError(t, err)
		assert.NotNil(t, s)
		assert.Equal(t, []byte(expectedSecret), s.jwtSecret)
		assert.Equal(t, expectedExpiry, s.tokenExpiry)
		assert.NotNil(t, s.appCheckClient)
	})

	t.Run("NilAppCheckClient", func(t *testing.T) {
		cfg := &Config{
			JWTSecret:      "test-secret",
			AppCheckClient: nil,
		}
		s, err := NewService(cfg)
		require.NoError(t, err)
		assert.NotNil(t, s)
		assert.Nil(t, s.appCheckClient, "App Check client should be nil when not provided")
	})
}

func TestGenerateToken(t *testing.T) {
	ctx := context.Background()

	t.Run("Success", func(t *testing.T) {
		mockAppCheck := &MockAppCheckClient{
			tokenInfo: &appcheck.DecodedAppCheckToken{
				AppID:   "test-app-id",
				Subject: "test-device-subject-123",
			},
		}
		cfg := &Config{
			JWTSecret:      "test-generate-secret",
			TokenExpiry:    time.Hour,
			AppCheckClient: mockAppCheck,
		}
		s, err := NewService(cfg)
		require.NoError(t, err)
		require.NotNil(t, s)

		req := &dankfoliov1.GenerateTokenRequest{
			AppCheckToken: "valid-app-check-token",
			Platform:      "test-platform",
		}
		resp, err := s.GenerateToken(ctx, req)
		assert.NoError(t, err)
		require.NotNil(t, resp)
		assert.NotEmpty(t, resp.Token)
		assert.Equal(t, int32(time.Hour.Seconds()), resp.ExpiresIn)

		// Validate the token
		authUser, err := s.ValidateToken(resp.Token)
		assert.NoError(t, err)
		require.NotNil(t, authUser)
		assert.Equal(t, "test-device-subject-123", authUser.DeviceID) // Should use App Check subject
		assert.Equal(t, req.Platform, authUser.Platform)

		// Parse token and verify claims
		claims := &AuthClaims{}
		token, err := jwt.ParseWithClaims(resp.Token, claims, func(token *jwt.Token) (interface{}, error) {
			return s.jwtSecret, nil
		})
		require.NoError(t, err)
		require.NotNil(t, token)
		assert.True(t, token.Valid)

		assert.Equal(t, "test-device-subject-123", claims.DeviceID) // Should use App Check subject
		assert.Equal(t, req.Platform, claims.Platform)
		assert.Equal(t, "dankfolio-app", claims.Issuer)
		assert.Equal(t, "test-device-subject-123", claims.Subject) // Should use App Check subject
		assert.WithinDuration(t, time.Now().Add(s.tokenExpiry), time.Unix(claims.ExpiresAt.Unix(), 0), 5*time.Second)
		assert.WithinDuration(t, time.Now(), time.Unix(claims.IssuedAt.Unix(), 0), 5*time.Second)
	})

	t.Run("MissingAppCheckToken", func(t *testing.T) {
		mockAppCheck := &MockAppCheckClient{}
		cfg := &Config{
			JWTSecret:      "test-secret",
			AppCheckClient: mockAppCheck,
		}
		s, err := NewService(cfg)
		require.NoError(t, err)

		req := &dankfoliov1.GenerateTokenRequest{
			AppCheckToken: "", // Empty App Check token
			Platform:      "test-platform",
		}
		resp, err := s.GenerateToken(ctx, req)
		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.True(t, strings.Contains(err.Error(), "AppCheckToken is required"), "Error message should indicate missing App Check token")
	})

	t.Run("InvalidAppCheckToken", func(t *testing.T) {
		mockAppCheck := &MockAppCheckClient{
			shouldFail:   true,
			failureError: assert.AnError,
		}
		cfg := &Config{
			JWTSecret:      "test-secret",
			AppCheckClient: mockAppCheck,
		}
		s, err := NewService(cfg)
		require.NoError(t, err)

		req := &dankfoliov1.GenerateTokenRequest{
			AppCheckToken: "invalid-app-check-token",
			Platform:      "test-platform",
		}
		resp, err := s.GenerateToken(ctx, req)
		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.True(t, strings.Contains(err.Error(), "invalid AppCheck token"), "Error message should indicate invalid App Check token")
	})

	t.Run("NilAppCheckClient", func(t *testing.T) {
		cfg := &Config{
			JWTSecret:      "test-secret",
			AppCheckClient: nil, // No App Check client
		}
		s, err := NewService(cfg)
		require.NoError(t, err)

		req := &dankfoliov1.GenerateTokenRequest{
			AppCheckToken: "some-token",
			Platform:      "test-platform",
		}
		resp, err := s.GenerateToken(ctx, req)
		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.True(t, strings.Contains(err.Error(), "internal server error"), "Error message should indicate server configuration error")
	})
}

func TestValidateToken(t *testing.T) {
	ctx := context.Background()
	testDeviceID := "test-device-for-validation"
	testPlatform := "test-platform-for-validation"

	mockAppCheck1 := &MockAppCheckClient{
		tokenInfo: &appcheck.DecodedAppCheckToken{
			AppID:   "test-app-id",
			Subject: testDeviceID,
		},
	}

	cfg1 := &Config{JWTSecret: "testSecret1", TokenExpiry: 1 * time.Hour, AppCheckClient: mockAppCheck1}
	service1, err := NewService(cfg1)
	require.NoError(t, err)
	require.NotNil(t, service1)

	cfg2 := &Config{JWTSecret: "testSecret2", TokenExpiry: 1 * time.Hour, AppCheckClient: mockAppCheck1}
	service2, err := NewService(cfg2)
	require.NoError(t, err)
	require.NotNil(t, service2)

	// Generate a valid token with service1
	generateResp, err := service1.GenerateToken(ctx, &dankfoliov1.GenerateTokenRequest{
		AppCheckToken: "valid-app-check-token",
		Platform:      testPlatform,
	})
	require.NoError(t, err)
	require.NotNil(t, generateResp)
	validTokenString := generateResp.Token

	t.Run("ValidToken", func(t *testing.T) {
		resp, err := service1.ValidateToken(validTokenString)
		assert.NoError(t, err)
		require.NotNil(t, resp)
		assert.Equal(t, testDeviceID, resp.DeviceID)
		assert.Equal(t, testPlatform, resp.Platform)
	})

	t.Run("EmptyToken", func(t *testing.T) {
		resp, err := service1.ValidateToken("")
		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.True(t, strings.Contains(err.Error(), "token string is empty"), "Error message should indicate empty token string")
	})

	t.Run("MalformedToken", func(t *testing.T) {
		resp, err := service1.ValidateToken("not-a-jwt-token")
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
				Issuer:    "dankfolio-app",
				Subject:   testDeviceID,
			},
		}
		// Create a token with SigningMethodNone
		token := jwt.NewWithClaims(jwt.SigningMethodNone, claims)
		signedToken, err := token.SignedString(jwt.UnsafeAllowNoneSignatureType) // This is how you sign with "none"
		require.NoError(t, err, "Failed to sign token with none algorithm")

		resp, err := service1.ValidateToken(signedToken)
		assert.Error(t, err)
		assert.Nil(t, resp)
		// jwt-go v5 returns "token signature is invalid" when a different signing method is expected
		assert.True(t, strings.Contains(err.Error(), "token signature is invalid") || strings.Contains(err.Error(), "unexpected signing method"), "Error message should indicate wrong signing method")
	})

	t.Run("ExpiredToken", func(t *testing.T) {
		mockAppCheckShort := &MockAppCheckClient{
			tokenInfo: &appcheck.DecodedAppCheckToken{
				AppID:   "test-app-id",
				Subject: "device-exp",
			},
		}
		shortExpiryCfg := &Config{JWTSecret: "short-expiry-secret", TokenExpiry: 1 * time.Millisecond, AppCheckClient: mockAppCheckShort}
		shortExpiryService, err := NewService(shortExpiryCfg)
		require.NoError(t, err)

		expiredTokenResp, err := shortExpiryService.GenerateToken(ctx, &dankfoliov1.GenerateTokenRequest{
			AppCheckToken: "valid-app-check-token",
			Platform:      "platform-exp",
		})
		require.NoError(t, err)
		require.NotNil(t, expiredTokenResp)

		// Wait for token to expire
		time.Sleep(5 * time.Millisecond) // Sleep a bit longer than expiry to ensure it's expired

		resp, err := shortExpiryService.ValidateToken(expiredTokenResp.Token)
		assert.Error(t, err)
		assert.Nil(t, resp)
		// jwt-go v5 returns "token has invalid claims: token is expired"
		assert.True(t, strings.Contains(err.Error(), "token is expired"), "Error message should indicate token is expired")
	})

	t.Run("DifferentSecret", func(t *testing.T) {
		// validTokenString was generated with service1 (and cfg1's secret)
		// service2 is initialized with cfg2's secret
		resp, err := service2.ValidateToken(validTokenString)
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
				Issuer:    "dankfolio-app",
				Subject:   testDeviceID,
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		signedToken, err := token.SignedString(service1.jwtSecret)
		require.NoError(t, err)

		resp, err := service1.ValidateToken(signedToken)
		assert.Error(t, err) // Error should occur because we are trying to parse into AuthClaims
		assert.Nil(t, resp)
		// This error is a bit generic, "token invalid" because the claims struct won't match
		// We could also see "token signature is invalid" if the parsing of claims fails in a way that affects signature validation.
		// The key is that an error *is* returned.
		assert.True(t, strings.Contains(err.Error(), "token invalid") || strings.Contains(err.Error(), "token signature is invalid") || strings.Contains(err.Error(), "application token"), "Error message should indicate claim type mismatch or general invalidity")
	})
}
