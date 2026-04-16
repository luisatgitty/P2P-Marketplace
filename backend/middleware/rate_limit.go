package middleware

import (
	"fmt"
	"strings"

	"p2p_marketplace/backend/config"
	"p2p_marketplace/backend/model"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

func PublicRateLimiter() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        config.RateLimitPublicMax,
		Expiration: config.RateLimitPublicWindow,
		KeyGenerator: func(c *fiber.Ctx) string {
			return fmt.Sprintf("pub|%s|%s|%s", c.IP(), c.Method(), routeKey(c))
		},
		LimitReached: limitReachedHandler,
	})
}

func StrictPublicRateLimiter() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        config.RateLimitStrictPublicMax,
		Expiration: config.RateLimitStrictPublicWindow,
		KeyGenerator: func(c *fiber.Ctx) string {
			return fmt.Sprintf("pub-strict|%s|%s|%s", c.IP(), c.Method(), routeKey(c))
		},
		LimitReached: limitReachedHandler,
	})
}

func PrivateRateLimiter() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        config.RateLimitAuthenticatedMax,
		Expiration: config.RateLimitAuthenticatedWindow,
		KeyGenerator: func(c *fiber.Ctx) string {
			userId := strings.TrimSpace(fmt.Sprintf("%v", c.Locals("userId")))
			if userId == "" || userId == "%!v(<nil>)" {
				return fmt.Sprintf("priv-fallback|%s|%s|%s", c.IP(), c.Method(), routeKey(c))
			}
			return fmt.Sprintf("priv|%s|%s|%s", userId, c.Method(), routeKey(c))
		},
		LimitReached: limitReachedHandler,
	})
}

func routeKey(c *fiber.Ctx) string {
	if c.Route() != nil {
		routePath := strings.TrimSpace(c.Route().Path)
		if routePath != "" {
			return routePath
		}
	}
	return c.Path()
}

func limitReachedHandler(c *fiber.Ctx) error {
	return c.Status(fiber.StatusTooManyRequests).JSON(model.ResponseModel{
		RetCode: "429",
		Message: "Too Many Requests",
		Data: model.ErrorModel{
			Message:   config.RateLimitExceededMessage,
			IsSuccess: false,
			Error:     nil,
		},
	})
}
