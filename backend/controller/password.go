package controller

import (
	"fmt"
	"os"
	"time"

	"p2p_marketplace/backend/config"
	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"
	"p2p_marketplace/backend/repository"

	"github.com/gofiber/fiber/v2"
)

func ForgotPassword(c *fiber.Ctx) error {
	fmt.Println(c.Path())
	var body struct {
		Email string `json:"email"`
	}

	// Parse the request body
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	// Validate email format
	if err := middleware.ValidateEmail(body.Email); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	// Get userFromDb by email to verify credentials
	userFromDb, err := repository.GetUserByEmail(body.Email)
	if err != nil {
		return SendSuccessResponse(c, 404, err.Error(), nil)
	}

	// Check if user account is locked
	if !userFromDb.LockedUntil.IsZero() && userFromDb.LockedUntil.After(time.Now()) {
		return SendErrorResponse(c, 403, "Account temporarily locked due to too many failed login attempts. Please try again later.", nil)
	}

	// Generate reset token
	resetToken, tokenExpiration, tokenErr := middleware.GenerateToken(config.PwdResetTokenDuration)
	if tokenErr != nil {
		return SendErrorResponse(c, 500, "Failed to generate reset token. Please contact support.", tokenErr)
	}
	hashedToken := middleware.HashToken(resetToken)

	// Store hashed token in database
	if err := repository.InsertPasswordResetToken(userFromDb.UserId, hashedToken, tokenExpiration); err != nil {
		return SendErrorResponse(c, 500, "Failed to store reset token. Please contact support.", err)
	}

	// Generate reset link and send email
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", os.Getenv("FRONTEND_URL"), resetToken)
	if err := middleware.SendPasswordResetEmail(userFromDb.Email, userFromDb.FirstName, resetLink); err != nil {
		return SendErrorResponse(c, 500, "Failed to send reset email", err)
	}

	return SendSuccessResponse(c, 200, "Reset link has been sent", nil)
}

func ValidateResetToken(c *fiber.Ctx) error {
	fmt.Println(c.Path())

	// Get token from query parameters included in the reset link
	token := c.Query("token")
	// Validate token validity and expiration
	retCode, _, err := validatePwdResetToken(token)
	if err != nil {
		return SendErrorResponse(c, retCode, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Token is valid", nil)
}

func ResetPassword(c *fiber.Ctx) error {
	fmt.Println(c.Path())
	var body model.PwdResetFromBody

	// Parse the request body
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	// NOTE: Disabled password complexity validation during development
	// Validate password complexity
	// if err := middleware.ValidatePasswordComplexity(body.Password); err != nil {
	// 	return SendErrorResponse(c, 400, err.Error(), err)
	// }

	// Validate token validity and expiration
	retCode, userId, err := validatePwdResetToken(body.Token)
	if err != nil {
		return SendErrorResponse(c, retCode, err.Error(), err)
	}

	// Update password
	if err := repository.UpdateUserPassword(userId, body.Password); err != nil {
		return SendErrorResponse(c, 500, "Failed to reset password. Please contact support.", err)
	}

	// Delete token after use
	if err := repository.DeletePasswordResetToken(userId); err != nil {
		return SendErrorResponse(c, 500, "Failed to delete reset token. Please contact support.", err)
	}

	// Invalidate all existing sessions for security
	if err := repository.DeleteUserSessions(userId); err != nil {
		return SendErrorResponse(c, 500, "Failed to invalidate sessions. Please contact support.", err)
	}

	return SendSuccessResponse(c, 200, "Password reset successfully", nil)
}
