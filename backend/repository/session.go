package repository

import (
	"fmt"
	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model/data"

	"github.com/gofiber/fiber/v2"
)

func GetSessionById(sessionId string) (data.SessionFromDb, error) {
	db := middleware.DBConn
	var session data.SessionFromDb
	selectQuery := "SELECT user_id, is_revoked, expires_at FROM public.sessions WHERE session_id=$1"
	err := db.Raw(selectQuery, sessionId).Scan(&session).Error
	return session, err
}

func CreateSession(c *fiber.Ctx, user data.UserFromDb, ipAddress, userAgent string) error {
	db := middleware.DBConn
	sessionToken, sessionExpiration, tokenErr := middleware.GenerateToken()

	if tokenErr != nil {
		return tokenErr
	}

	sessionId := middleware.HashToken(sessionToken)
	insertQuery := "INSERT INTO public.sessions (user_id, session_id, ip_address, user_agent, expires_at) VALUES ($1,$2,$3,$4,$5)"

	err := db.Exec(insertQuery, user.UserId, sessionId, ipAddress, userAgent, sessionExpiration).Error
	cookie := middleware.SessionCookie(sessionToken, sessionExpiration)
	c.Cookie(cookie)
	return err
}

func DeleteSession(c *fiber.Ctx) error {
	db := middleware.DBConn

	// Check for session token in cookies
	sessionToken := c.Cookies("session_token")
	if sessionToken == "" {
		return fmt.Errorf("Missing session token")
	}

	sessionId := middleware.HashToken(sessionToken)
	deleteQuery := "DELETE FROM public.sessions WHERE session_id=$1"
	err := db.Exec(deleteQuery, sessionId).Error
	// Clear the session cookie regardless
	c.Cookie(middleware.ExpiredCookie())
	return err
}
