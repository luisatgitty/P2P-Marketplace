package controller

import (
	"fmt"
	"strings"

	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/repository"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

func UpgradeRealtimeSocket(c *fiber.Ctx) error {
	if !websocket.IsWebSocketUpgrade(c) {
		return fiber.ErrUpgradeRequired
	}
	return c.Next()
}

func RealtimeSocket(c *websocket.Conn) {
	userId := strings.TrimSpace(fmt.Sprintf("%v", c.Locals("userId")))
	if userId == "" || userId == "%!v(<nil>)" {
		_ = c.WriteJSON(map[string]any{
			"type": "error",
			"data": map[string]any{"message": "Unauthorized websocket session."},
		})
		_ = c.Close()
		return
	}

	conn := &middleware.WSConnection{Conn: c}
	firstConnection := middleware.RealtimeHub.Register(userId, conn)
	if firstConnection {
		_ = repository.UpdateUserLastLogin(userId)
		middleware.RealtimeHub.Broadcast(map[string]any{
			"type": "presence:update",
			"data": map[string]any{
				"userId":   userId,
				"isOnline": true,
			},
		})
	}

	defer func() {
		nowOffline := middleware.RealtimeHub.Unregister(userId, conn)
		if nowOffline {
			_ = repository.UpdateUserLastLogin(userId)
			middleware.RealtimeHub.Broadcast(map[string]any{
				"type": "presence:update",
				"data": map[string]any{
					"userId":   userId,
					"isOnline": false,
				},
			})
		}
		_ = c.Close()
	}()

	_ = conn.WriteJSON(map[string]any{
		"type": "presence:connected",
		"data": map[string]any{"userId": userId},
	})

	for {
		var payload map[string]any
		if err := c.ReadJSON(&payload); err != nil {
			break
		}

		eventType := strings.TrimSpace(fmt.Sprintf("%v", payload["type"]))
		switch eventType {
		case "ping":
			_ = conn.WriteJSON(map[string]any{
				"type": "pong",
			})
		}
	}
}
