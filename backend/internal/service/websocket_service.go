package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

type WebSocketService struct {
	clients    map[*websocket.Conn]bool
	broadcast  chan []byte
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	mu         sync.Mutex
}

func NewWebSocketService() *WebSocketService {
	return &WebSocketService{
		clients:    make(map[*websocket.Conn]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
	}
}

func (s *WebSocketService) Run(ctx context.Context) {
	for {
		select {
		case client := <-s.register:
			s.mu.Lock()
			s.clients[client] = true
			s.mu.Unlock()

		case client := <-s.unregister:
			s.mu.Lock()
			if _, ok := s.clients[client]; ok {
				delete(s.clients, client)
				client.Close()
			}
			s.mu.Unlock()

		case message := <-s.broadcast:
			s.mu.Lock()
			for client := range s.clients {
				err := client.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					log.Printf("error: %v", err)
					client.Close()
					delete(s.clients, client)
				}
			}
			s.mu.Unlock()

		case <-ctx.Done():
			return
		}
	}
}

func (s *WebSocketService) BroadcastPriceUpdate(update model.PriceUpdate) error {
	message, err := json.Marshal(update)
	if err != nil {
		return fmt.Errorf("failed to marshal price update: %w", err)
	}

	s.broadcast <- message
	return nil
}

func (s *WebSocketService) RegisterClient(conn *websocket.Conn) {
	s.register <- conn
}

func (s *WebSocketService) UnregisterClient(conn *websocket.Conn) {
	s.unregister <- conn
}

func (s *WebSocketService) HandleConnection(conn *websocket.Conn) {
	defer func() {
		s.UnregisterClient(conn)
		conn.Close()
	}()

	s.RegisterClient(conn)

	// Keep connection alive
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
	}
}
