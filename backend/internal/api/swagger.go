package api

import (
	"net/http"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	"github.com/swaggo/http-swagger"
)

func (r *Router) setupSwagger(router chi.Router) {
	// Serve OpenAPI specification
	router.Get("/swagger.yaml", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("api", "openapi.yaml"))
	})

	// Serve Swagger UI
	router.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("/swagger.yaml"),
		httpSwagger.DocExpansion("none"),
	))
} 