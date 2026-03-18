package controller

import (
	"fmt"
	"strings"
	"time"

	"p2p_marketplace/backend/config"
	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"
	"p2p_marketplace/backend/repository"

	"github.com/gofiber/fiber/v2"
)

func SendEmailOTP(c *fiber.Ctx) error {
	// Parse the request body
	var body model.UserFromBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	// Validate user input and check if email already exists
	if retCode, err := validateInputAndUser(&body); err != nil {
		return SendErrorResponse(c, retCode, err.Error(), err)
	}

	// Send OTP to user's email and store the hashed OTP in database
	if retCode, err := storeAndSendOTP(body.FirstName, body.Email); err != nil {
		return SendErrorResponse(c, retCode, err.Error(), err)
	}

	// Return success response with email to indicate OTP sent
	return SendSuccessResponse(c, 201, "OTP sent successfully.", map[string]any{
		"user": body.Email,
	})
}

func SignUpUser(c *fiber.Ctx) error {
	// Parse the request body
	var body model.UserFromBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	if len(body.OTP) != config.EmailOTPLength {
		return SendErrorResponse(c, 400, fmt.Sprintf("OTP must be %d digits", config.EmailOTPLength), nil)
	}

	// Verify the OTP against the database record
	if err := repository.VerifyEmailVerif(body.Email, body.OTP); err != nil {
		return SendErrorResponse(c, 400, err.Error(), nil)
	}

	// Delete the OTP record after successful verification
	if err := repository.DeleteEmailVerif(body.Email); err != nil {
		// Log the error but don't fail the request since verification was successful
		fmt.Printf("Failed to delete OTP record for email %s: %v\n", body.Email, err)
	}

	/// Validate user input and check if email already exists
	if retCode, err := validateInputAndUser(&body); err != nil {
		return SendErrorResponse(c, retCode, err.Error(), err)
	}

	// Create the user in the database with hashed password
	if err := repository.CreateUser(body); err != nil {
		return SendErrorResponse(c, 500, "Failed to create user. Please contact support.", err)
	}

	// Reduce password exposure incase of logging or other operations
	body.Password = ""

	// Fetch the created user to get the ID and other details for session creation
	userFromDb, err := repository.GetUserByEmail(body.Email)
	if err != nil {
		return SendErrorResponse(c, 500, "Failed to retrieve user data. Please contact support.", err)
	}

	// Create a session for the client
	if err := repository.CreateSession(c, userFromDb, body.IpAddress, body.UserAgent); err != nil {
		return SendErrorResponse(c, 500, "Failed to create session. Please contact support.", err)
	}

	// Return success response with user data
	return SendSuccessResponse(c, 201, "User created successfully", map[string]any{
		"user": BuildUserResponse(userFromDb),
	})
}

func LogInUser(c *fiber.Ctx) error {
	// Parse the request body
	var body model.UserFromBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	// Trim whitespaces of user data
	body.Email = strings.TrimSpace(body.Email)
	body.Password = strings.TrimSpace(body.Password)

	// Validate email format
	if err := middleware.ValidateEmail(body.Email); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	// NOTE: Disabled password complexity validation during development
	// Validate password length
	// if err := middleware.ValidatePasswordLength(rcvUser.Password); err != nil {
	// 	return SendErrorResponse(c, 400, err.Error(), err)
	// }

	// Get userFromDb by email to verify credentials
	userFromDb, err := repository.GetUserByEmail(body.Email)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	if !userFromDb.IsActive {
		return SendErrorResponse(c, 403, "Account is inactive. Please contact support.", nil)
	}

	// Check if user account is locked
	if !userFromDb.LockedUntil.IsZero() && userFromDb.LockedUntil.After(time.Now()) {
		return SendErrorResponse(c, 403, "Account temporarily locked due to too many failed login attempts. Please try again later.", nil)
	}

	// Check if user login attempts exceeded the limit
	if userFromDb.FailedLogin >= 5 {
		repository.LockedUserAccount(userFromDb.UserId)
		return SendErrorResponse(c, 403, "Account temporarily locked due to too many failed login attempts", nil)
	}

	// Check if user password matches the stored hash
	if !middleware.IsPasswordMatch(body.Password, userFromDb.Password) {
		repository.IncreaseUserFailedLogin(userFromDb.UserId)
		return SendErrorResponse(c, 401, "Incorrect password. Please try again.", nil)
	}

	// Reduce password exposure incase of logging or other operations
	body.Password = ""

	// Create a session for the client
	if err := repository.CreateSession(c, userFromDb, body.IpAddress, body.UserAgent); err != nil {
		return SendErrorResponse(c, 500, "Failed to create session. Please contact support.", err)
	}

	// Update user's last login time and reset failed login attempts
	if err := repository.UpdateUserLastLogin(userFromDb.UserId); err != nil {
		// This error is not critical. User login proceeds.
		fmt.Printf("%v: Failed to update last login time. Please contact support. %v\n", c.Path(), err)
	}

	// Return success response with user data
	return SendSuccessResponse(c, 200, "Logged in successfully", map[string]any{
		"user": BuildUserResponse(userFromDb),
	})
}

func AuthenticateUser(c *fiber.Ctx) error {
	// Check for session token in cookies
	sessionToken := c.Cookies("session_token")
	if sessionToken == "" {
		return SendErrorResponse(c, 401, "Missing session token", nil)
	}

	// Fetch session data from DB
	sessionId := middleware.HashToken(sessionToken)
	sessionFromDb, err := repository.GetSessionById(sessionId)
	if err != nil {
		return SendErrorResponse(c, 401, "Invalid session token", err)
	}

	// Remove the invalid session cookie from client if session is invalid
	if sessionFromDb.UserId == "" || sessionFromDb.IsRevoked || sessionFromDb.ExpiresAt.Before(time.Now()) {
		c.Cookie(middleware.ExpiredCookie())
		return SendErrorResponse(c, 401, "Session expired or revoked", nil)
	}

	userFromDb, err := repository.GetUserById(sessionFromDb.UserId)
	if err != nil || !userFromDb.IsActive {
		c.Cookie(middleware.ExpiredCookie())
		_ = repository.DeleteUserSessions(sessionFromDb.UserId)
		return SendErrorResponse(c, 401, "Account is inactive", nil)
	}

	// Store userId in context for future handlers to use
	c.Locals("userId", sessionFromDb.UserId)
	return c.Next()
}

func Me(c *fiber.Ctx) error {
	// Check if user successfully identified
	userId := c.Locals("userId")
	if userId == nil {
		// Clear the session cookie if userId is not found
		c.Cookie(middleware.ExpiredCookie())
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	// Fetch userFromDb data to return in response
	userFromDb, err := repository.GetUserById(userId)
	if err != nil {
		return SendErrorResponse(c, 500, "Failed to retrieve user data. Please contact support.", err)
	}

	// Return success response with user data
	return SendSuccessResponse(c, 200, "User is authenticated", map[string]any{
		"user": BuildUserResponse(userFromDb),
	})
}

func Logout(c *fiber.Ctx) error {
	// Delete session from DB and clear cookie
	if err := repository.DeleteSession(c); err != nil {
		fmt.Printf("%v: Failed to delete session during logout: %v\n", c.Path(), err)
	}

	// Return success response with expired cookie
	return SendSuccessResponse(c, 200, "Logged out successfully", nil)
}
