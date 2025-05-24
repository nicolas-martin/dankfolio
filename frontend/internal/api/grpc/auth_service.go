package grpc

import (
	"context"

	"connectrpc.com/connect"
	dankfoliov1 "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/auth"
)

// authServiceHandler implements the AuthService gRPC handler
type authServiceHandler struct {
	authService *auth.Service
}

// newAuthServiceHandler creates a new auth service handler
func newAuthServiceHandler(authService *auth.Service) *authServiceHandler {
	return &authServiceHandler{
		authService: authService,
	}
}

// GenerateToken handles token generation requests
func (h *authServiceHandler) GenerateToken(
	ctx context.Context,
	req *connect.Request[dankfoliov1.GenerateTokenRequest],
) (*connect.Response[dankfoliov1.GenerateTokenResponse], error) {
	resp, err := h.authService.GenerateToken(ctx, req.Msg)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(resp), nil
}
