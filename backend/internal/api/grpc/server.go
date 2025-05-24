package grpc

import (
	"fmt"
	"log"
	"net/http"

	"connectrpc.com/connect"
	dankfoliov1connect "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/middleware"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/auth"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/trade"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

// Server represents the API server
type Server struct {
	mux            *http.ServeMux
	coinService    *coin.Service
	walletService  *wallet.Service
	tradeService   *trade.Service
	priceService   *price.Service
	utilityService *Service
	authService    *auth.Service
}

// NewServer creates a new Server instance
func NewServer(
	coinService *coin.Service,
	walletService *wallet.Service,
	tradeService *trade.Service,
	priceService *price.Service,
	utilityService *Service,
	authService *auth.Service,
) *Server {
	return &Server{
		mux:            http.NewServeMux(),
		coinService:    coinService,
		walletService:  walletService,
		tradeService:   tradeService,
		priceService:   priceService,
		utilityService: utilityService,
		authService:    authService,
	}
}

// Start starts the Connect RPC server
func (s *Server) Start(port int) error {
	// Create logger interceptor
	logInterceptor := middleware.GRPCLoggerInterceptor()
	debugModeInterceptor := middleware.GRPCDebugModeInterceptor()

	// Create authentication middleware
	authMiddleware := middleware.AuthMiddleware(s.authService)

	// Default interceptors for all handlers
	defaultInterceptors := connect.WithInterceptors(debugModeInterceptor, logInterceptor)

	// Register AuthService handler (NOT behind auth middleware - it generates tokens)
	path, handler := dankfoliov1connect.NewAuthServiceHandler(
		newAuthServiceHandler(s.authService),
		defaultInterceptors,
	)
	s.mux.Handle(path, handler)

	// Create a sub-mux for protected routes
	protectedMux := http.NewServeMux()

	// Register protected Connect RPC handlers
	path, handler = dankfoliov1connect.NewCoinServiceHandler(
		newCoinServiceHandler(s.coinService),
		defaultInterceptors,
	)
	protectedMux.Handle(path, handler)

	path, handler = dankfoliov1connect.NewWalletServiceHandler(
		newWalletServiceHandler(s.walletService),
		defaultInterceptors,
	)
	protectedMux.Handle(path, handler)

	path, handler = dankfoliov1connect.NewTradeServiceHandler(
		newTradeServiceHandler(s.tradeService),
		defaultInterceptors,
	)
	protectedMux.Handle(path, handler)

	// Register PriceService handler
	path, handler = dankfoliov1connect.NewPriceServiceHandler(
		newPriceServiceHandler(s.priceService),
		defaultInterceptors,
	)
	protectedMux.Handle(path, handler)

	// Register UtilityService handler
	path, handler = dankfoliov1connect.NewUtilityServiceHandler(
		s.utilityService,
		defaultInterceptors,
	)
	protectedMux.Handle(path, handler)

	// Wrap protected routes with authentication middleware
	s.mux.Handle("/", authMiddleware.Wrap(protectedMux))

	// Start HTTP server with CORS middleware and HTTP/2 support
	addr := fmt.Sprintf(":%d", port)
	log.Printf("Starting Connect RPC server on %s", addr)

	// Wrap the mux with CORS middleware
	handler = middleware.CORSMiddleware(s.mux)

	// Use h2c for HTTP/2 without TLS
	return http.ListenAndServe(addr, h2c.NewHandler(handler, &http2.Server{}))
}

// Stop gracefully stops the server
func (s *Server) Stop() {
	// Nothing to clean up for now
}
