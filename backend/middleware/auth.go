package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	// "p2p_marketplace/backend/controller"
)

func IsPasswordMatch(password, hash string) bool {
	// Trim whitespace from password and hash before comparing
	trimPassword := strings.TrimSpace(password)
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(trimPassword))
	return err == nil
}

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
