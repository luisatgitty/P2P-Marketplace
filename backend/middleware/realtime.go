package middleware

import (
	"sync"

	"github.com/gofiber/websocket/v2"
)

type WSConnection struct {
	Conn *websocket.Conn
	mu   sync.Mutex
}

func (w *WSConnection) WriteJSON(payload any) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.Conn.WriteJSON(payload)
}

type PresenceHub struct {
	mu    sync.RWMutex
	users map[string]map[*WSConnection]struct{}
}

func NewPresenceHub() *PresenceHub {
	return &PresenceHub{
		users: make(map[string]map[*WSConnection]struct{}),
	}
}

var RealtimeHub = NewPresenceHub()

func (h *PresenceHub) Register(userId string, conn *WSConnection) (firstConnection bool) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.users[userId]; !ok {
		h.users[userId] = make(map[*WSConnection]struct{})
	}

	wasOffline := len(h.users[userId]) == 0
	h.users[userId][conn] = struct{}{}

	return wasOffline
}

func (h *PresenceHub) Unregister(userId string, conn *WSConnection) (nowOffline bool) {
	h.mu.Lock()
	defer h.mu.Unlock()

	conns, ok := h.users[userId]
	if !ok {
		return false
	}

	delete(conns, conn)
	if len(conns) > 0 {
		return false
	}

	delete(h.users, userId)
	return true
}

func (h *PresenceHub) IsOnline(userId string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	conns, ok := h.users[userId]
	if !ok {
		return false
	}

	return len(conns) > 0
}

func (h *PresenceHub) OnlineUserIDs() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	ids := make([]string, 0, len(h.users))
	for userId, conns := range h.users {
		if len(conns) > 0 {
			ids = append(ids, userId)
		}
	}

	return ids
}

func (h *PresenceHub) SendToUser(userId string, payload any) {
	h.mu.RLock()
	conns := h.users[userId]
	items := make([]*WSConnection, 0, len(conns))
	for conn := range conns {
		items = append(items, conn)
	}
	h.mu.RUnlock()

	if len(items) == 0 {
		return
	}

	for _, conn := range items {
		if err := conn.WriteJSON(payload); err != nil {
			_ = conn.Conn.Close()
			h.Unregister(userId, conn)
		}
	}
}

func (h *PresenceHub) Broadcast(payload any) {
	h.mu.RLock()
	targets := make(map[string][]*WSConnection, len(h.users))
	for userId, conns := range h.users {
		items := make([]*WSConnection, 0, len(conns))
		for conn := range conns {
			items = append(items, conn)
		}
		targets[userId] = items
	}
	h.mu.RUnlock()

	for userId, conns := range targets {
		for _, conn := range conns {
			if err := conn.WriteJSON(payload); err != nil {
				_ = conn.Conn.Close()
				h.Unregister(userId, conn)
			}
		}
	}
}
