package grpc

import (
	"fmt"
	"fmt"
	"log"
	"net"

	// Import the generated protobuf code for gRPC services
	dankfoliov1pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	// Keep connect generated code for service implementations if they are used directly
	// dankfoliov1connect "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"

	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/trade"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/reflection" // Optional: for gRPC server reflection
)

// Server represents the API server
type Server struct {
	gsrv           *grpc.Server
	coinService    *coin.Service // Store original services if needed by handlers
	walletService  *wallet.Service
	tradeService   *trade.Service
	priceService   *price.Service
	utilityService *Service
}

// NewServer creates a new Server instance with TLS
func NewServer(
	certFile string,
	keyFile string,
	coinService *coin.Service,
	walletService *wallet.Service,
	tradeService *trade.Service,
	priceService *price.Service,
	utilityService *Service,
) (*Server, error) {
	creds, err := credentials.NewServerTLSFromFile(certFile, keyFile)
	if err != nil {
		return nil, fmt.Errorf("could not load TLS keys: %w", err)
	}

	// Initialize gRPC server with TLS credentials
	// Note: Interceptors from connect-go (middleware.GRPCLoggerInterceptor) are not directly compatible
	// with grpc.Server options. They would need to be rewritten or adapted.
	// For now, we initialize without those specific interceptors to focus on TLS.
	gsrv := grpc.NewServer(grpc.Creds(creds))

	s := &Server{
		gsrv:           gsrv,
		coinService:    coinService,
		walletService:  walletService,
		tradeService:   tradeService,
		priceService:   priceService,
		utilityService: utilityService,
	}

	// Register gRPC services
	// These assume that newCoinServiceHandler etc. return implementations
	// of the *dankfoliov1pb.<Service>Server interfaces.
	dankfoliov1pb.RegisterCoinServiceServer(gsrv, newCoinServiceHandler(s.coinService))
	dankfoliov1pb.RegisterWalletServiceServer(gsrv, newWalletServiceHandler(s.walletService))
	dankfoliov1pb.RegisterTradeServiceServer(gsrv, newTradeServiceHandler(s.tradeService))
	dankfoliov1pb.RegisterPriceServiceServer(gsrv, newPriceServiceHandler(s.priceService))
	dankfoliov1pb.RegisterUtilityServiceServer(gsrv, s.utilityService) // Assuming s.utilityService implements UtilityServiceServer

	// Optional: Enable server reflection for tools like grpcurl
	reflection.Register(gsrv)

	return s, nil
}

// Start starts the gRPC server
func (s *Server) Start(port int) error {
	addr := fmt.Sprintf(":%d", port)
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("failed to listen: %w", err)
	}

	log.Printf("Starting gRPC server with TLS on %s", addr)
	return s.gsrv.Serve(lis)
}

// Stop gracefully stops the server
func (s *Server) Stop() {
	log.Println("Stopping gRPC server...")
	s.gsrv.GracefulStop()
	log.Println("gRPC server stopped.")
}
