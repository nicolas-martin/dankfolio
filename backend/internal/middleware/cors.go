package middleware

import (
	"net/http"
)

// CORSMiddleware handles CORS for both Connect and gRPC-Web protocols
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers for both Connect and gRPC-Web
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000") // Update this with your frontend origin
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Connect-Protocol-Version,Connect-Timeout-Ms,Grpc-Timeout,X-Grpc-Web,X-User-Agent,Authorization")
		w.Header().Set("Access-Control-Expose-Headers", "Grpc-Status,Grpc-Message,Grpc-Status-Details-Bin")
		w.Header().Set("Access-Control-Max-Age", "7200")
		w.Header().Add("Vary", "Origin")
		w.Header().Add("Vary", "Access-Control-Request-Method")
		w.Header().Add("Vary", "Access-Control-Request-Headers")

		// Handle preflight requests
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
