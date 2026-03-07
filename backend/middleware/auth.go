package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

func ExpiredCookie() *fiber.Cookie {
	return &fiber.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		Expires:  time.Now().Add(-time.Hour),
		Secure:   true,
		HTTPOnly: true,
		SameSite: "Lax",
	}
}

func SessionCookie(value string, expires time.Time) *fiber.Cookie {
	return &fiber.Cookie{
		Name:     "session_token",
		Value:    value,
		Path:     "/",
		Expires:  expires,
		Secure:   true,
		HTTPOnly: true,
		SameSite: "Lax",
	}
}
