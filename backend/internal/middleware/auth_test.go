package middleware

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"connectrpc.com/authn"
	dankfoliov1 "github.com/nicolas-martin/dankfolio/gen/go/dankfolio/v1"
	authservice "github.com/nicolas-martin/dankfolio/internal/service/auth" // Assuming this is the package for AuthenticatedUser
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// AuthService is an interface that matches the methods of auth.Service needed by the middleware.
// This allows us to mock the auth.Service.
type AuthService interface {
	ValidateToken(context.Context, *dankfoliov1.ValidateTokenRequest) (*dankfoliov1.ValidateTokenResponse, error)
}

// MockAuthService is a mock implementation of AuthService.
type MockAuthService struct {
	mock.Mock
}

// ValidateToken mocks the ValidateToken method.
func (m *MockAuthService) ValidateToken(ctx context.Context, req *dankfoliov1.ValidateTokenRequest) (*dankfoliov1.ValidateTokenResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dankfoliov1.ValidateTokenResponse), args.Error(1)
}

func TestAuthMiddleware(t *testing.T) {
	ctx := context.Background()

	t.Run("NoAuthorizationHeader", func(t *testing.T) {
		mockAuthSvc := new(MockAuthService)
		middleware := NewAuthMiddleware(mockAuthSvc)

		req, err := http.NewRequestWithContext(ctx, "POST", "/test", nil)
		require.NoError(t, err)

		info, err := middleware.Authn(req.Context(), req)
		assert.Error(t, err)
		assert.Nil(t, info)
		authnErr, ok := err.(*authn.Error)
		require.True(t, ok, "error should be of type authn.Error")
		assert.Equal(t, "missing authorization header", authnErr.Message) // Check the internal message
		mockAuthSvc.AssertNotCalled(t, "ValidateToken", mock.Anything, mock.Anything)
	})

	t.Run("InvalidHeaderFormat (Not Bearer)", func(t *testing.T) {
		mockAuthSvc := new(MockAuthService)
		middleware := NewAuthMiddleware(mockAuthSvc)

		req, err := http.NewRequestWithContext(ctx, "POST", "/test", nil)
		require.NoError(t, err)
		req.Header.Set("Authorization", "Basic somecreds")

		info, err := middleware.Authn(req.Context(), req)
		assert.Error(t, err)
		assert.Nil(t, info)
		authnErr, ok := err.(*authn.Error)
		require.True(t, ok, "error should be of type authn.Error")
		assert.Equal(t, "invalid authorization header format", authnErr.Message)
		mockAuthSvc.AssertNotCalled(t, "ValidateToken", mock.Anything, mock.Anything)
	})

	t.Run("EmptyBearerToken", func(t *testing.T) {
		mockAuthSvc := new(MockAuthService)
		middleware := NewAuthMiddleware(mockAuthSvc)

		req, err := http.NewRequestWithContext(ctx, "POST", "/test", nil)
		require.NoError(t, err)
		req.Header.Set("Authorization", "Bearer ")

		info, err := middleware.Authn(req.Context(), req)
		assert.Error(t, err)
		assert.Nil(t, info)
		authnErr, ok := err.(*authn.Error)
		require.True(t, ok, "error should be of type authn.Error")
		assert.Equal(t, "empty bearer token", authnErr.Message)
		mockAuthSvc.AssertNotCalled(t, "ValidateToken", mock.Anything, mock.Anything)
	})

	t.Run("TokenValidationFails", func(t *testing.T) {
		mockAuthSvc := new(MockAuthService)
		middleware := NewAuthMiddleware(mockAuthSvc)
		testToken := "yourtoken"
		expectedError := fmt.Errorf("invalid token")

		mockAuthSvc.On("ValidateToken", mock.Anything, &dankfoliov1.ValidateTokenRequest{Token: testToken}).
			Return(nil, expectedError).Once()

		req, err := http.NewRequestWithContext(ctx, "POST", "/test", nil)
		require.NoError(t, err)
		req.Header.Set("Authorization", "Bearer "+testToken)

		info, err := middleware.Authn(req.Context(), req)
		assert.Error(t, err)
		assert.Nil(t, info)
		authnErr, ok := err.(*authn.Error)
		require.True(t, ok, "error should be of type authn.Error")
		assert.Equal(t, fmt.Sprintf("invalid token: %s", expectedError.Error()), authnErr.Message)
		mockAuthSvc.AssertExpectations(t)
	})

	t.Run("TokenValidationSucceeds", func(t *testing.T) {
		mockAuthSvc := new(MockAuthService)
		middleware := NewAuthMiddleware(mockAuthSvc)
		testToken := "validtoken"
		expectedUser := &dankfoliov1.User{
			DeviceId: "test-device",
			Platform: "test-platform",
		}
		validateResp := &dankfoliov1.ValidateTokenResponse{User: expectedUser}

		mockAuthSvc.On("ValidateToken", mock.Anything, &dankfoliov1.ValidateTokenRequest{Token: testToken}).
			Return(validateResp, nil).Once()

		req, err := http.NewRequestWithContext(ctx, "POST", "/test", nil)
		require.NoError(t, err)
		req.Header.Set("Authorization", "Bearer "+testToken)

		info, err := middleware.Authn(req.Context(), req)
		assert.NoError(t, err)
		require.NotNil(t, info)

		// The info returned by authn.Func is directly the *dankfoliov1.User
		// as stored by `WithInfo` in the middleware.
		authenticatedUser, ok := info.(*dankfoliov1.User)
		require.True(t, ok, "info should be of type *dankfoliov1.User")
		assert.Equal(t, expectedUser.DeviceId, authenticatedUser.GetDeviceId())
		assert.Equal(t, expectedUser.Platform, authenticatedUser.GetPlatform())

		mockAuthSvc.AssertExpectations(t)

		// Optional: Verify retrieval from context using authn.GetInfo
		// This step assumes the context is correctly populated by the authn mechanism.
		// First, we need a context that would have been populated by the ConnectRPC framework
		// after the Authn func runs successfully. For testing Authn directly,
		// the `info` returned is the primary subject of test.
		// If we wanted to test the context part, we'd typically need a handler
		// that the middleware wraps.
		// However, authn.GetInfo(req.Context()) will NOT work here because `req.Context()`
		// is the original context, not one potentially augmented by the middleware chain.
		// The `info` object IS the user data. We can simulate setting it in a new context
		// if we wanted to test a downstream handler's behavior.
		// For the purpose of this middleware test, asserting the returned `info` is sufficient.
	})
}
