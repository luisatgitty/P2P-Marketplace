package middleware

import (
	"strings"

	"golang.org/x/crypto/bcrypt"
	// "p2p_marketplace/backend/controller"
)

func IsPasswordMatch(password, hash string) bool {
	// Trim whitespace from password and hash before comparing
	trimPassword := strings.TrimSpace(password)
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(trimPassword))
	return err == nil
}
