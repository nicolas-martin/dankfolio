package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/fatih/color"

	"connectrpc.com/connect"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
)

// GRPCLoggerInterceptor creates an interceptor that logs all gRPC requests and responses
func GRPCLoggerInterceptor() connect.UnaryInterceptorFunc {
	interceptor := func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(
			ctx context.Context,
			req connect.AnyRequest,
		) (connect.AnyResponse, error) {
			// Log the request
			startTime := time.Now()
			reqDetails, err := structToJSON(req.Any())
			if err != nil {
				reqDetails = fmt.Sprintf("failed to marshal request: %v", err)
			}

			debugModeColor := color.New(color.FgGreen, color.Bold)
			if req.Header().Get("x-debug-mode") == "true" {
				debugModeColor = color.New(color.FgYellow, color.Bold)
			}

			slog.Info("📤 gRPC Request",
				slog.String("peer", req.Peer().Addr),
				slog.String("procedure", debugModeColor.Sprintf("%s", req.Spec().Procedure)),
				slog.String("request", reqDetails),
			)

			// Call the handler
			res, err := next(ctx, req)

			// Calculate duration
			duration := time.Since(startTime)

			// Log the response or error
			if err != nil {
				// Log the error
				connectErr, ok := err.(*connect.Error)
				var errDetails string
				if ok {
					// Create a map that includes both error details and message
					errMap := map[string]any{
						"code":    connectErr.Code(),
						"message": connectErr.Message(),
					}

					// Add details if available
					if details := connectErr.Details(); len(details) > 0 {
						errMap["details"] = details
					}

					// Convert to JSON for structured logging
					errJSON, jsonErr := json.Marshal(errMap)
					if jsonErr == nil {
						errDetails = string(errJSON)
					} else {
						errDetails = fmt.Sprintf("code: %s, message: %s", connectErr.Code(), connectErr.Message())
					}
				} else {
					// For non-connect errors, just use the error message
					errDetails = fmt.Sprintf(`{"message": "%s"}`, err.Error())
				}

				slog.Error("❌ gRPC Error",
					slog.String("peer", req.Peer().Addr),
					slog.String("procedure", debugModeColor.Sprintf("%s", req.Spec().Procedure)),
					slog.Duration("duration", duration),
					slog.String("error", errDetails),
				)
				return nil, err
			}

			// Log the successful response
			var resDetails string
			if req.Spec().Procedure == "/dankfolio.v1.PriceService/GetPriceHistory" {
				if respTyped, ok := res.Any().(*pb.GetPriceHistoryResponse); ok && respTyped.GetData() != nil {
					items := respTyped.GetData().GetItems()
					count := len(items)
					if count == 0 {
						resDetails = "{ data: { items: [empty] }, ... }"
					} else {
						first, _ := structToJSON(items[0])
						last, _ := structToJSON(items[count-1])
						resDetails = fmt.Sprintf("{ data: { items: [count=%d, first=%s, last=%s] }, ... }", count, first, last)
					}
				}
			}
			if req.Spec().Procedure == "/dankfolio.v1.CoinService/GetAllCoins" {
				// NOTE: skip logging for the GetAllCoins
				return res, nil
			}
			// Add specific handling for GetProxiedImage responses
			if req.Spec().Procedure == "/dankfolio.v1.UtilityService/GetProxiedImage" {
				// NOTE: skip logging for the proxied image data
				return res, nil
				// if respTyped, ok := res.Any().(*pb.GetProxiedImageResponse); ok {
				// 	dataLen := len(respTyped.GetImageData())
				// 	contentType := respTyped.GetContentType()
				// 	resDetails = fmt.Sprintf("{ imageData: [size=%d bytes], contentType: %q }", dataLen, contentType)
				// }
			}
			if resDetails == "" {
				var err error
				resDetails, err = structToJSON(res.Any())
				if err != nil {
					resDetails = fmt.Sprintf("failed to marshal response: %v", err)
				}
			}

			slog.Info("📥 gRPC Response",
				slog.String("peer", req.Peer().Addr),
				slog.String("procedure", debugModeColor.Sprintf("%s", req.Spec().Procedure)),
				slog.Duration("duration", duration),
				slog.String("response", resDetails),
			)

			return res, nil
		}
	}
	return interceptor
}

// Helper to convert structs to JSON
func structToJSON(v any) (string, error) {
	// For sensitive data, you might want to redact certain fields
	bytes, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}
