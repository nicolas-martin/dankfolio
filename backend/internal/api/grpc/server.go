package grpc

import (
	"fmt"
	"log"
	"net/http"

	"connectrpc.com/connect"
	"github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/dankfoliov1connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/api/middleware"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/trade"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
)

// Server represents the API server
type Server struct {
	mux           *http.ServeMux
	coinService   *coin.Service
	walletService *wallet.Service
	tradeService  *trade.Service
}

// NewServer creates a new Server instance
func NewServer(coinService *coin.Service, walletService *wallet.Service, tradeService *trade.Service) *Server {
	return &Server{
		mux:           http.NewServeMux(),
		coinService:   coinService,
		walletService: walletService,
		tradeService:  tradeService,
	}
}

// Start starts the Connect RPC server
func (s *Server) Start(port int) error {
	// Register Connect RPC handlers
	path, handler := dankfoliov1connect.NewCoinServiceHandler(
		NewCoinServiceServer(s.coinService),
		connect.WithInterceptors(),
	)
	s.mux.Handle(path, handler)

	path, handler = dankfoliov1connect.NewWalletServiceHandler(
		NewWalletServer(s.walletService),
		connect.WithInterceptors(),
	)
	s.mux.Handle(path, handler)

	path, handler = dankfoliov1connect.NewTradeServiceHandler(
		NewTradeServer(s.tradeService),
		connect.WithInterceptors(),
	)
	s.mux.Handle(path, handler)

	// Start HTTP server with CORS middleware
	addr := fmt.Sprintf(":%d", port)
	log.Printf("Starting Connect RPC server on %s", addr)
	return http.ListenAndServe(addr, middleware.CORSMiddleware(s.mux))
}

// Stop gracefully stops the server
func (s *Server) Stop() {
	// Nothing to clean up for now
}
