package repository

import (
	"fmt"
	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"

	"github.com/gofiber/fiber/v2"
)

func GetSessionById(sessionId string) (model.SessionFromDb, error) {
	db := middleware.DBConn
	var session model.SessionFromDb
	selectQuery := "SELECT user_id, is_revoked, expires_at FROM public.sessions WHERE session_id=$1"
	err := db.Raw(selectQuery, sessionId).Scan(&session).Error
	return session, err
}

func CreateSession(c *fiber.Ctx, user model.UserFromDb, ipAddress, userAgent string) error {
	db := middleware.DBConn
	sevenDays := 10080 // in minutes
	sessionToken, sessionExpiration, tokenErr := middleware.GenerateToken(sevenDays)

	if tokenErr != nil {
		return tokenErr
	}

	// Set the session cookie in the client's browser
	cookie := middleware.SessionCookie(sessionToken, sessionExpiration)
	c.Cookie(cookie)

	sessionId := middleware.HashToken(sessionToken)
	insertQuery := "INSERT INTO public.sessions (user_id, session_id, ip_address, user_agent, expires_at) VALUES ($1,$2,$3,$4,$5)"
	return db.Exec(insertQuery, user.UserId, sessionId, ipAddress, userAgent, sessionExpiration).Error
}

func DeleteSession(c *fiber.Ctx) error {
	db := middleware.DBConn

	// Check for session token in cookies
	sessionToken := c.Cookies("session_token")
	if sessionToken == "" {
		return fmt.Errorf("Missing session token")
	}

	// Clear the session cookie from client
	c.Cookie(middleware.ExpiredCookie())
	sessionId := middleware.HashToken(sessionToken)
	deleteQuery := "DELETE FROM public.sessions WHERE session_id=$1"
	return db.Exec(deleteQuery, sessionId).Error
}

func DeleteUserSessions(userId string) error {
	db := middleware.DBConn
	deleteQuery := "DELETE FROM public.sessions WHERE user_id=$1"
	return db.Exec(deleteQuery, userId).Error
}
