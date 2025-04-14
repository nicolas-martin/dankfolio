package grpc

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	pb "github.com/nicolas-martin/dankfolio/gen/proto/go/dankfolio/v1"
	"github.com/nicolas-martin/dankfolio/internal/api/middleware"
	"github.com/nicolas-martin/dankfolio/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/internal/service/trade"
	"github.com/nicolas-martin/dankfolio/internal/service/wallet"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// Server represents the gRPC server
type Server struct {
	grpcServer    *grpc.Server
	httpMux       *runtime.ServeMux
	coinService   *coin.Service
	walletService *wallet.Service
	tradeService  *trade.Service
}

// NewServer creates a new Server instance
func NewServer(coinService *coin.Service, walletService *wallet.Service, tradeService *trade.Service) *Server {
	return &Server{
		grpcServer:    grpc.NewServer(),
		httpMux:       runtime.NewServeMux(),
		coinService:   coinService,
		walletService: walletService,
		tradeService:  tradeService,
	}
}

// Start starts both the gRPC server and the gRPC-Gateway proxy
func (s *Server) Start(grpcPort, httpPort int) error {
	// Register gRPC services
	coinServer := NewCoinServiceServer(s.coinService)
	pb.RegisterCoinServiceServer(s.grpcServer, coinServer)

	walletServer := NewWalletServer(s.walletService)
	pb.RegisterWalletServiceServer(s.grpcServer, walletServer)

	tradeServer := NewTradeServer(s.tradeService)
	pb.RegisterTradeServiceServer(s.grpcServer, tradeServer)

	// Start gRPC server
	grpcAddr := fmt.Sprintf(":%d", grpcPort)
	lis, err := net.Listen("tcp", grpcAddr)
	if err != nil {
		return fmt.Errorf("failed to listen: %v", err)
	}

	go func() {
		log.Printf("Starting gRPC server on %s", grpcAddr)
		if err := s.grpcServer.Serve(lis); err != nil {
			log.Fatalf("Failed to serve gRPC: %v", err)
		}
	}()

	// Set up gRPC-Gateway
	ctx := context.Background()
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	// Register gRPC-Gateway handlers
	opts := []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())}
	err = pb.RegisterCoinServiceHandlerFromEndpoint(ctx, s.httpMux, grpcAddr, opts)
	if err != nil {
		return fmt.Errorf("failed to register coin gateway: %v", err)
	}

	err = pb.RegisterWalletServiceHandlerFromEndpoint(ctx, s.httpMux, grpcAddr, opts)
	if err != nil {
		return fmt.Errorf("failed to register wallet gateway: %v", err)
	}

	err = pb.RegisterTradeServiceHandlerFromEndpoint(ctx, s.httpMux, grpcAddr, opts)
	if err != nil {
		return fmt.Errorf("failed to register trade gateway: %v", err)
	}

	// Start HTTP server (gRPC-Gateway)
	httpAddr := fmt.Sprintf(":%d", httpPort)
	log.Printf("Starting gRPC-Gateway server on %s", httpAddr)
	handler := middleware.CORSMiddleware(s.httpMux)
	return http.ListenAndServe(httpAddr, handler)
}

// Stop gracefully stops the gRPC server
func (s *Server) Stop() {
	if s.grpcServer != nil {
		s.grpcServer.GracefulStop()
	}
}
