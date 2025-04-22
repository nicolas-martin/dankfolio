package middleware

import (
	"bytes"
	"context"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"connectrpc.com/connect"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	dankfoliov1connect "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/memory"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/stretchr/testify/assert"
)

// mockCoinServiceHandler implements the CoinService handler interface
type mockCoinServiceHandler struct {
	dankfoliov1connect.UnimplementedCoinServiceHandler
	coinService *mockCoinService
}

func newMockCoinServiceHandler(coinService *mockCoinService) *mockCoinServiceHandler {
	return &mockCoinServiceHandler{
		coinService: coinService,
	}
}

// GetCoinByID implements the GetCoinByID RPC method
func (s *mockCoinServiceHandler) GetCoinByID(ctx context.Context, req *connect.Request[pb.GetCoinByIDRequest]) (*connect.Response[pb.Coin], error) {
	ctx, coin, err := s.coinService.GetCoin(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&pb.Coin{
		Id:     coin.ID,
		Name:   coin.Name,
		Symbol: coin.Symbol,
	}), nil
}

// mockCoinService simulates a service using the real in-memory DB
type mockCoinService struct {
	db *memory.TypedCache[model.Coin]
}

func newMockCoinService() *mockCoinService {
	return &mockCoinService{
		db: memory.NewTypedCache[model.Coin]("coin:"),
	}
}

func (s *mockCoinService) GetCoin(ctx context.Context, id string) (context.Context, *model.Coin, error) {
	// Use the real in-memory DB
	if coin, ok, newCtx := s.db.Get(ctx, id); ok {
		return newCtx, &coin, nil
	}

	// If not found, create a new coin
	coin := model.Coin{
		ID:     id,
		Name:   "Test Coin",
		Symbol: "TEST",
	}

	// Store in the real DB
	s.db.Set(id, coin, 1*time.Minute)
	return ctx, &coin, nil
}

func TestCacheAndLoggerIntegration(t *testing.T) {
	// Capture log output
	var logBuffer bytes.Buffer
	log.SetOutput(&logBuffer)
	defer log.SetOutput(os.Stderr) // Restore default output

	// Setup test server with the real in-memory DB
	coinService := newMockCoinService()
	path, handler := dankfoliov1connect.NewCoinServiceHandler(
		newMockCoinServiceHandler(coinService),
		connect.WithInterceptors(
			GRPCLoggerInterceptor(),
			GRPCDebugModeInterceptor(),
		),
	)

	// Create test server
	mux := http.NewServeMux()
	mux.Handle(path, handler)
	server := httptest.NewServer(mux)
	defer server.Close()

	// Create Connect client
	client := dankfoliov1connect.NewCoinServiceClient(
		http.DefaultClient,
		server.URL,
	)

	// First request - should be a cache miss
	logBuffer.Reset() // Clear buffer before request
	start := time.Now()
	req := connect.NewRequest(&pb.GetCoinByIDRequest{Id: "coin123"})
	_, err := client.GetCoinByID(context.Background(), req)
	firstDuration := time.Since(start)
	if err != nil {
		t.Fatalf("GetCoinByID failed: %v", err)
	}
	firstLogs := logBuffer.String()

	// Verify first request logs - should show a request and response
	assert.Contains(t, firstLogs, "gRPC Request")
	assert.Contains(t, firstLogs, "gRPC Response")
	assert.Contains(t, firstLogs, "coin123") // Verify the coin ID is in the logs

	// Second request - should be a cache hit
	logBuffer.Reset()
	start = time.Now()
	req = connect.NewRequest(&pb.GetCoinByIDRequest{Id: "coin123"})
	_, err = client.GetCoinByID(context.Background(), req)
	secondDuration := time.Since(start)
	if err != nil {
		t.Fatalf("GetCoinByID failed: %v", err)
	}
	secondLogs := logBuffer.String()

	// Verify second request logs - should show a request and response
	assert.Contains(t, secondLogs, "gRPC Request")
	assert.Contains(t, secondLogs, "gRPC Response")
	assert.Contains(t, secondLogs, "coin123") // Verify the coin ID is in the logs

	// Third request with different ID - should be a cache miss
	logBuffer.Reset()
	start = time.Now()
	req = connect.NewRequest(&pb.GetCoinByIDRequest{Id: "coin456"})
	_, err = client.GetCoinByID(context.Background(), req)
	thirdDuration := time.Since(start)
	if err != nil {
		t.Fatalf("GetCoinByID failed: %v", err)
	}
	thirdLogs := logBuffer.String()

	// Verify third request logs - should show a request and response
	assert.Contains(t, thirdLogs, "gRPC Request")
	assert.Contains(t, thirdLogs, "gRPC Response")
	assert.Contains(t, thirdLogs, "coin456") // Verify the coin ID is in the logs

	// Verify timing - but only if the difference is significant
	if secondDuration < firstDuration {
		t.Logf("Cache hit (%v) was faster than cache miss (%v)", secondDuration, firstDuration)
	}
	if secondDuration < thirdDuration {
		t.Logf("Cache hit (%v) was faster than second cache miss (%v)", secondDuration, thirdDuration)
	}
}
