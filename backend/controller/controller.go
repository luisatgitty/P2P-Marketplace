package controller

import (
	"fmt"
	"strings"
	"time"

	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model/data"
	"p2p_marketplace/backend/model/response"
	"p2p_marketplace/backend/repository"

	"github.com/gofiber/fiber/v2"
)

func SignUpUser(c *fiber.Ctx) error {
	fmt.Println(c.Path())
	var rcvUser data.UserFromReq

	// Parse the request body
	if err := c.BodyParser(&rcvUser); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body", err)
	}

	// Validate the received user data
	if err := middleware.ValidateSignUpInput(&rcvUser); err != nil {
		return SendErrorResponse(c, 400, "Invalid user data", err)
	}

	// Check if email already exists
	if err := repository.IsUserExist(rcvUser.Email); err != nil {
		return SendErrorResponse(c, 409, "Email already exists", nil)
	}

	// Create the user in the database with hashed password
	if err := repository.CreateUser(rcvUser); err != nil {
		return SendErrorResponse(c, 500, "Failed to create user", err)
	}

	// Reduce password exposure incase of logging or other operations
	rcvUser.Password = ""

	// Fetch the created user to get the ID and other details for session creation
	userFromDb, err := repository.GetUserByEmail(rcvUser.Email)
	if err != nil {
		return SendErrorResponse(c, 500, "User data retrieval failed", err)
	}

	// Create a session for the client
	if err := repository.CreateSession(c, userFromDb, rcvUser.IpAddress, rcvUser.UserAgent); err != nil {
		return SendErrorResponse(c, 500, "Failed to create session", err)
	}

	// Return success response with user data
	return c.Status(201).JSON(response.ResponseModel{
		RetCode: "201",
		Message: "User created successfully",
		Data:    map[string]interface{}{"user": BuildUserResponse(userFromDb)},
	})
}

func LogInUser(c *fiber.Ctx) error {
	fmt.Println(c.Path())
	var rcvUser data.UserFromReq

	// Parse the request body
	if err := c.BodyParser(&rcvUser); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body", err)
	}

	// Trim whitespaces of user data
	rcvUser.Email = strings.TrimSpace(rcvUser.Email)
	rcvUser.Password = strings.TrimSpace(rcvUser.Password)

	// Get userFromDb by email to verify credentials
	userFromDb, err := repository.GetUserByEmail(rcvUser.Email)
	if err != nil {
		return SendErrorResponse(c, 500, "User data retrieval failed", err)
	}

	// Check if user password matches the stored hash
	if !middleware.IsPasswordMatch(rcvUser.Password, userFromDb.Password) {
		repository.IncreaseUserFailedLogin(userFromDb.UserId)
		return SendErrorResponse(c, 401, "Incorrect password", nil)
	}

	// Reduce password exposure incase of logging or other operations
	rcvUser.Password = ""

	// Create a session for the client
	if err := repository.CreateSession(c, userFromDb, rcvUser.IpAddress, rcvUser.UserAgent); err != nil {
		return SendErrorResponse(c, 500, "Failed to create session", err)
	}

	// Update user's last login time and reset failed login attempts
	if err := repository.UpdateUserLastLogin(userFromDb.UserId); err != nil {
		return SendErrorResponse(c, 500, "Failed to update last login time", err)
	}

	// Return success response with user data
	return c.Status(200).JSON(response.ResponseModel{
		RetCode: "200",
		Message: "Logged in successfully",
		Data:    map[string]interface{}{"user": BuildUserResponse(userFromDb)},
	})
}

func AuthenticateUser(c *fiber.Ctx) error {
	fmt.Println(c.Path())

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

	// Store userId in context for future handlers to use
	c.Locals("userId", sessionFromDb.UserId)
	return c.Next()
}

func Me(c *fiber.Ctx) error {
	fmt.Println(c.Path())

	// Check if user successfully identified
	userId := c.Locals("userId")
	if userId == nil {
		// Clear the session cookie if userId is not found
		c.Cookie(middleware.ExpiredCookie())
		return SendErrorResponse(c, 401, "Not authenticated", nil)
	}

	// Fetch userFromDb data to return in response
	userFromDb, err := repository.GetUserById(userId)
	if err != nil {
		return SendErrorResponse(c, 500, "User data retrieval failed", err)
	}

	// Return success response with user data
	return c.Status(200).JSON(response.ResponseModel{
		RetCode: "200",
		Message: "User is authenticated",
		Data:    map[string]interface{}{"user": BuildUserResponse(userFromDb)},
	})
}

func Logout(c *fiber.Ctx) error {
	fmt.Println(c.Path())

	// Delete session from DB and clear cookie
	if err := repository.DeleteSession(c); err != nil {
		return SendErrorResponse(c, 500, "Failed to logout", err)
	}

	// Return success response
	return SendSuccessResponse(c, 200, "Logged out successfully", nil)
}
