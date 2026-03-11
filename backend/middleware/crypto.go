package middleware

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"math/big"
	"strings"
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

func GenerateToken(expirationMinutes time.Duration) (string, time.Time, error) {
	expiration := time.Now().Add(expirationMinutes)

	b := make([]byte, config.SessionTokenLength)
	if _, err := rand.Read(b); err != nil {
		return "", expiration, err
	}
	// Use RawURLEncoding to avoid '=' padding
	return base64.RawURLEncoding.EncodeToString(b), expiration, nil
}

func HashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

func GenerateOTP(length int) (string, time.Time, error) {
	var otp strings.Builder
	expiration := time.Now().Add(config.EmailOTPDuration)

	for range length {
		n, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", expiration, err
		}
		otp.WriteString(n.String())
	}
	return otp.String(), expiration, nil
}
