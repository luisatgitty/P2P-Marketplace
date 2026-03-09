package controller

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"

	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model/data"
	"p2p_marketplace/backend/model/response"
)

func SignUpUser(c *fiber.Ctx) error {
	// Call database connection and initialize user struct
	fmt.Println("/auth/signup called")
	db := middleware.DBConn
	var rcvUser data.UserFromReq
	var userFromDb data.UserFromDb

	// Parse request body into user struct
	if err := c.BodyParser(&rcvUser); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body", err)
	}

	// Basic validation for required fields
	if rcvUser.FirstName == "" || rcvUser.LastName == "" ||
		rcvUser.Email == "" || rcvUser.Password == "" {
		return SendErrorResponse(c, 400, "All fields are required", nil)
	}

	// TODO: Trim whitespace from data

	// Check if email already exists
	var existingUserCount int64
	if err := db.Raw("SELECT COUNT(*) FROM public.users WHERE email=$1",
		rcvUser.Email).Scan(&existingUserCount).Error; err != nil {
		return SendErrorResponse(c, 500, "User data retrieval failed", err)
	}

	// If email exists, return conflict response
	if existingUserCount > 0 {
		return SendErrorResponse(c, 409, "Email already exists", nil)
	}

	// Validate user input
	// TODO: Include the correct error messages
	if err := middleware.ValidateSignUpInput(rcvUser.Email, rcvUser.Password,
		rcvUser.FirstName, rcvUser.LastName); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body", nil)
	}

	// Hash the password and clear
	hashedPassword := GenerateHashPassword(rcvUser.Password)
	rcvUser.Password = ""

	// Insert user data into database
	if res := db.Exec("INSERT INTO public.users (first_name, last_name, email, password_hash) VALUES ($1,$2,$3,$4)",
		rcvUser.FirstName, rcvUser.LastName, rcvUser.Email, hashedPassword); res.Error != nil {
		return SendErrorResponse(c, 500, "New user data insertion failed", res.Error)
	}

	// Get user data from database
	if err := db.Raw("SELECT id, first_name, last_name, email, password_hash, role, verification_status FROM public.users WHERE email=$1",
		rcvUser.Email).Scan(&userFromDb).Error; err != nil {
		return SendErrorResponse(c, 500, "User data retrieval failed", err)
	}

	// Generate session sessionToken
	sessionToken, sessionExpiration, err := GenerateToken()
	if err != nil {
		return SendErrorResponse(c, 500, "Failed to create session", err)
	}

	sessionId := HashToken(sessionToken)

	// Store hashed token and expiry in sessions table
	if res := db.Exec("INSERT INTO public.sessions (user_id, session_token, ip_address, user_agent, expires_at) VALUES ($1,$2,$3,$4,$5)",
		userFromDb.UserId, sessionId, rcvUser.IpAddress, rcvUser.UserAgent, sessionExpiration); res.Error != nil {
		return SendErrorResponse(c, 500, "Failed to persist session", res.Error)
	}

	// Set cookie with raw token
	cookie := &fiber.Cookie{
		Name:     "session_token",
		Value:    sessionToken,
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Lax",
		Expires:  sessionExpiration,
		Path:     "/",
	}
	c.Cookie(cookie)

	// Return the cookies to user
	return c.Status(201).JSON(response.ResponseModel{
		RetCode: "201",
		Message: "User created successfully",
		Data: map[string]interface{}{
			"user": map[string]interface{}{
				"firstName": userFromDb.FirstName,
				"lastName":  userFromDb.LastName,
				"email":     userFromDb.Email,
				"role":      userFromDb.Role,
				"status":    userFromDb.Status,
			},
		},
	})
}

func LogInUser(c *fiber.Ctx) error {
	// Call database connection and initialize user struct
	fmt.Println("/auth/login called")
	db := middleware.DBConn
	var rcvUser data.UserFromReq
	var userFromDb data.UserFromDb

	// Parse request body into user struct
	if err := c.BodyParser(&rcvUser); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body", err)
	}

	// Get user data from database
	if err := db.Raw("SELECT id, first_name, last_name, email, password_hash, role, verification_status FROM public.users WHERE email=$1",
		rcvUser.Email).Scan(&userFromDb).Error; err != nil {
		return SendErrorResponse(c, 500, "User data retrieval failed", err)
	}

	// Compare passwords
	if !middleware.IsPasswordMatch(rcvUser.Password, userFromDb.Password) {
		return SendErrorResponse(c, 401, "Incorrect password", nil)
	}

	// Clear password before returning
	rcvUser.Password = ""

	// Generate session sessionToken
	sessionToken, sessionExpiration, err := GenerateToken()
	if err != nil {
		return SendErrorResponse(c, 500, "Failed to create session", err)
	}

	sessionId := HashToken(sessionToken)

	// Store hashed token and expiry in sessions table
	if res := db.Exec("INSERT INTO public.sessions (user_id, session_token, ip_address, user_agent, expires_at) VALUES ($1,$2,$3,$4,$5)",
		userFromDb.UserId, sessionId, rcvUser.IpAddress, rcvUser.UserAgent, sessionExpiration); res.Error != nil {
		return SendErrorResponse(c, 500, "Failed to persist session", res.Error)
	}

	// Set cookie with raw token
	cookie := &fiber.Cookie{
		Name:     "session_token",
		Value:    sessionToken,
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Lax",
		Expires:  sessionExpiration,
		Path:     "/",
	}
	c.Cookie(cookie)

	// Return the cookies to user
	return c.Status(201).JSON(response.ResponseModel{
		RetCode: "201",
		Message: "User created successfully",
		Data: map[string]interface{}{
			"user": map[string]interface{}{
				"firstName": userFromDb.FirstName,
				"lastName":  userFromDb.LastName,
				"email":     userFromDb.Email,
				"role":      userFromDb.Role,
				"status":    userFromDb.Status,
			},
		},
	})
}

func Authenticate(c *fiber.Ctx) error {
	fmt.Println("/auth/authenticate called")
	db := middleware.DBConn
	var sessionFromDb data.SessionFromDb

	// Read cookie
	sessionToken := c.Cookies("session_token")
	if sessionToken == "" {
		fmt.Println("Missing session token")
		return SendErrorResponse(c, 401, "Missing session token", nil)
	}

	// Hash and lookup session
	sessionId := HashToken(sessionToken)

	if err := db.Raw("SELECT user_id, is_revoked, expires_at FROM public.sessions WHERE session_token=$1", sessionId).Scan(&sessionFromDb).Error; err != nil {
		return SendErrorResponse(c, 401, "Invalid session", err)
	}

	// Check if session is valid
	if sessionFromDb.UserId == "" ||
		sessionFromDb.IsRevoked ||
		sessionFromDb.ExpiresAt.Before(time.Now()) {
		return SendErrorResponse(c, 401, "Invalid session", nil)
	}

	// Attach to context for downstream handlers
	c.Locals("userId", sessionFromDb.UserId)
	return c.Next()
}

func Me(c *fiber.Ctx) error {
	fmt.Println("/auth/me called")
	userId := c.Locals("userId")
	db := middleware.DBConn
	var userFromDb data.UserFromDb

	if userId == nil {
		return SendErrorResponse(c, 401, "Not authenticated", nil)
	}

	// Get user data from database
	if err := db.Raw("SELECT id, first_name, last_name, email, password_hash, role, verification_status FROM public.users WHERE id=$1",
		userId).Scan(&userFromDb).Error; err != nil {
		return SendErrorResponse(c, 500, "User data retrieval failed", err)
	}

	return c.Status(201).JSON(response.ResponseModel{
		RetCode: "201",
		Message: "User is authenticated",
		Data: map[string]interface{}{
			"user": map[string]interface{}{
				"firstName": userFromDb.FirstName,
				"lastName":  userFromDb.LastName,
				"email":     userFromDb.Email,
				"role":      userFromDb.Role,
				"status":    userFromDb.Status,
			},
		},
	})
}

// Logout invalidates session and clears cookie
func Logout(c *fiber.Ctx) error {
	fmt.Println("/auth/logout called")
	db := middleware.DBConn
	sessionToken := c.Cookies("session_token")

	if sessionToken == "" {
		return SendErrorResponse(c, 400, "No session token", nil)
	}

	sessionId := HashToken(sessionToken)
	if res := db.Exec("DELETE FROM public.sessions WHERE session_token=$1", sessionId); res.Error != nil {
		return SendErrorResponse(c, 500, "Failed to delete session", res.Error)
	}

	// Clear the cookie of the user by expiring it
	c.Cookie(&fiber.Cookie{
		Name:     "session_token",
		Value:    "",
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Lax",
		Expires:  time.Now().Add(-time.Hour),
		Path:     "/",
	})

	return SendSuccessResponse(c, 200, "Logged out", nil)
}
