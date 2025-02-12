package api

import (
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // In production, implement proper origin checking
	},
}

func (r *Router) handleWebSocket() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())
		if user == nil {
			respondError(w, http.StatusUnauthorized, "Authentication required")
			return
		}

		conn, err := upgrader.Upgrade(w, req, nil)
		if err != nil {
			// Log error
			return
		}

		r.wsService.AddClient(conn, user.ID)
	}
} 