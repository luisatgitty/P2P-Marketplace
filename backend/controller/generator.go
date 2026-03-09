package controller

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"

	"p2p_marketplace/backend/model/errors"
	"p2p_marketplace/backend/model/response"
)

func GenerateHashPassword(password string) string {
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(hashedPassword)
}

func GenerateToken() (string, time.Time, error) {
	sessionExpiration := time.Now().Add(7 * 24 * time.Hour)

	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", sessionExpiration, err
	}
	// Use RawURLEncoding to avoid '=' padding
	return base64.RawURLEncoding.EncodeToString(b), sessionExpiration, nil
}

// Hash the token before storing in DB (store only this)
func HashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

func GetRetCodeMessage(retCode int) string {
	switch retCode {
	case 400:
		return "Unauthorized Request"
	case 401:
		return "Invalid Request"
	case 404:
		return "Bad Request"
	case 409:
		return "Conflict"
	case 419:
		return "Authentication Timeout"
	case 500:
		return "Internal Server Error"
	default:
		return "Unknown Error"
	}
}

func SendErrorResponse(c *fiber.Ctx, retCode int, message string, err error) error {
	return c.Status(retCode).JSON(response.ResponseModel{
		RetCode: fmt.Sprintf("%d", retCode),
		Message: GetRetCodeMessage(retCode),
		Data: errors.ErrorModel{
			Message:   message,
			IsSuccess: false,
			Error:     err,
		},
	})
}

func SendSuccessResponse(c *fiber.Ctx, retCode int, message string, data interface{}) error {
	return c.Status(retCode).JSON(response.ResponseModel{
		RetCode: fmt.Sprintf("%d", retCode),
		Message: message,
		Data:    data,
	})
}
