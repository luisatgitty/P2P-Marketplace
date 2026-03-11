package repository

import (
	"fmt"
	"time"

	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"
)

func InsertPasswordResetToken(userId, hashedToken string, expiresAt time.Time) error {
	db := middleware.DBConn
	insertQuery := "INSERT INTO public.password_resets (user_id, token, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET token=$2, expires_at=$3"
	return db.Exec(insertQuery, userId, hashedToken, expiresAt).Error
}

func GetUserToReset(token string) (int, string, error) {
	db := middleware.DBConn
	var reset model.PwdResetFromDb
	hashedToken := middleware.HashToken(token)
	selectQuery := "SELECT user_id FROM public.password_resets WHERE token=$1 AND expires_at > $2"

	if err := db.Raw(selectQuery, hashedToken, time.Now()).Scan(&reset).Error; err != nil {
		// Add error retCode and log the error for debugging
		return 500, "", fmt.Errorf("Failed to retrieve user ID. Please contact support.")
	}
	if reset.UserId == "" {
		return 400, "", fmt.Errorf("Invalid or expired token.")
	}
	return 200, reset.UserId, nil
}

func UpdateUserPassword(userId, newPassword string) error {
	db := middleware.DBConn
	hashedPassword := middleware.HashPassword(newPassword)
	updateQuery := "UPDATE public.users SET password_hash=$1 WHERE id=$2"
	return db.Exec(updateQuery, hashedPassword, userId).Error
}

func DeletePasswordResetToken(userId string) error {
	db := middleware.DBConn
	deleteQuery := "DELETE FROM public.password_resets WHERE user_id=$1"
	return db.Exec(deleteQuery, userId).Error
}
