package service

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/your-username/meme-coin-trader/internal/model"
)

type WebSocketService struct {
	clients    map[*websocket.Conn]string // map client connection to userID
	clientsMux sync.RWMutex
	broadcast  chan interface{}
}

func NewWebSocketService() *WebSocketService {
	ws := &WebSocketService{
		clients:   make(map[*websocket.Conn]string),
		broadcast: make(chan interface{}, 1000),
	}
	go ws.broadcastLoop()
	return ws
}

func (s *WebSocketService) AddClient(conn *websocket.Conn, userID string) {
	s.clientsMux.Lock()
	s.clients[conn] = userID
	s.clientsMux.Unlock()

	// Start reading messages in a goroutine
	go s.readPump(conn)
}

func (s *WebSocketService) RemoveClient(conn *websocket.Conn) {
	s.clientsMux.Lock()
	delete(s.clients, conn)
	s.clientsMux.Unlock()
}

func (s *WebSocketService) BroadcastPriceUpdate(update model.PriceUpdate) {
	s.broadcast <- struct {
		Type    string           `json:"type"`
		Payload model.PriceUpdate `json:"payload"`
	}{
		Type:    "price_update",
		Payload: update,
	}
}

func (s *WebSocketService) BroadcastTradeUpdate(trade *model.Trade) {
	s.broadcast <- struct {
		Type    string      `json:"type"`
		Payload *model.Trade `json:"payload"`
	}{
		Type:    "trade_update",
		Payload: trade,
	}
}

func (s *WebSocketService) SendPortfolioUpdate(userID string, portfolio *model.Portfolio) {
	msg := struct {
		Type    string          `json:"type"`
		Payload *model.Portfolio `json:"payload"`
	}{
		Type:    "portfolio_update",
		Payload: portfolio,
	}

	s.clientsMux.RLock()
	defer s.clientsMux.RUnlock()

	for conn, id := range s.clients {
		if id == userID {
			conn.WriteJSON(msg)
		}
	}
}

func (s *WebSocketService) broadcastLoop() {
	for msg := range s.broadcast {
		s.clientsMux.RLock()
		for conn := range s.clients {
			err := conn.WriteJSON(msg)
			if err != nil {
				conn.Close()
				s.RemoveClient(conn)
			}
		}
		s.clientsMux.RUnlock()
	}
}

func (s *WebSocketService) readPump(conn *websocket.Conn) {
	defer func() {
		conn.Close()
		s.RemoveClient(conn)
	}()

	conn.SetReadLimit(512) // Set message size limit
	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				// Log error
			}
			break
		}
	}
} 