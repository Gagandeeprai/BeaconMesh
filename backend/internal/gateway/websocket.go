package gateway

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// ── WebSocket Hub ────────────────────────────────────────────────────────────

// client represents a single connected WebSocket client.
type client struct {
	conn *websocket.Conn
	send chan []byte
}

// Hub manages active WebSocket connections and message broadcasting.
type Hub struct {
	mu          sync.RWMutex
	clients     map[*client]struct{}
	upgrader    websocket.Upgrader
	dataFetcher func() interface{} // callback to build the broadcast payload
}

// NewHub creates a Hub. dataFetcher is called every broadcast tick to obtain
// the current snapshot to send to all clients.
func NewHub(dataFetcher func() interface{}) *Hub {
	return &Hub{
		clients: make(map[*client]struct{}),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for hackathon demo
			},
			HandshakeTimeout: 10 * time.Second,
		},
		dataFetcher: dataFetcher,
	}
}

// register adds a new client to the hub.
func (h *Hub) register(c *client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[c] = struct{}{}
}

// unregister removes a client from the hub and closes its send channel.
func (h *Hub) unregister(c *client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		close(c.send)
	}
}

// broadcast serializes payload and sends to all connected clients.
func (h *Hub) broadcast(payload []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		select {
		case c.send <- payload:
		default:
			// Drop if client's send buffer is full (slow consumer)
		}
	}
}

// writePump runs in a goroutine per client, draining the send channel to the WS conn.
func (h *Hub) writePump(c *client) {
	defer func() {
		_ = c.conn.Close()
		h.unregister(c)
	}()

	c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	for {
		msg, ok := <-c.send
		if !ok {
			// Hub closed the channel
			_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}
		c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			log.Printf("[WS] write error: %v", err)
			return
		}
	}
}

// readPump keeps the connection alive by consuming incoming frames (ping/pong).
func (h *Hub) readPump(c *client) {
	defer func() {
		h.unregister(c)
		_ = c.conn.Close()
	}()
	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("[WS] unexpected close: %v", err)
			}
			return
		}
	}
}

// ServeWS upgrades an HTTP request to a WebSocket connection.
// Route: GET /api/v1/ws (no auth required for the hackathon demo).
func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS] upgrade error: %v", err)
		return
	}

	c := &client{
		conn: conn,
		send: make(chan []byte, 256),
	}

	h.register(c)
	log.Printf("[WS] client connected — total: %d", h.ClientCount())

	// Send an immediate snapshot on connect
	if data := h.buildPayload(); data != nil {
		c.send <- data
	}

	go h.writePump(c)
	h.readPump(c) // blocks until client disconnects
	log.Printf("[WS] client disconnected — total: %d", h.ClientCount())
}

// buildPayload fetches the current snapshot and serialises it to JSON.
func (h *Hub) buildPayload() []byte {
	data := h.dataFetcher()
	if data == nil {
		return nil
	}
	b, err := json.Marshal(data)
	if err != nil {
		log.Printf("[WS] marshal error: %v", err)
		return nil
	}
	return b
}

// StartBroadcastLoop starts a background goroutine that pushes snapshots to all
// clients every `interval`. Call this once from main.
func (h *Hub) StartBroadcastLoop(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			payload := h.buildPayload()
			if payload != nil {
				h.broadcast(payload)
			}
		}
	}()
}

// ClientCount returns the current number of connected WebSocket clients.
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}
