package middleware

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"time"

	"p2p_marketplace/backend/config"

	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) string {
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(hashedPassword)
}

func IsPasswordMatch(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func GenerateToken(expirationMinutes int) (string, time.Time, error) {
	sessionExpiration := time.Now().Add(time.Duration(expirationMinutes) * time.Minute)

	b := make([]byte, config.SessionTokenLength)
	if _, err := rand.Read(b); err != nil {
		return "", sessionExpiration, err
	}
	// Use RawURLEncoding to avoid '=' padding
	return base64.RawURLEncoding.EncodeToString(b), sessionExpiration, nil
}

func HashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
