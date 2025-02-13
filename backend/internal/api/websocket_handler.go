package api

import (
	"net/http"

	"github.com/nicolas-martin/dankfolio/internal/service"
)

type WebsocketHandler struct {
	wsService service.WebsocketService
}

func NewWebsocketHandler(wsService service.WebsocketService) *WebsocketHandler {
	return &WebsocketHandler{
		wsService: wsService,
	}
}

func (h *WebsocketHandler) HandleWebsocket(w http.ResponseWriter, r *http.Request) {
	user, ok := GetUserID(r.Context())
	if !ok {
		http.Error(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	err := h.wsService.HandleConnection(w, r, user.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
