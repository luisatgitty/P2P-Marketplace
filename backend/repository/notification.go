package repository

import (
	"fmt"

	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"
)

func GetNotificationsByUser(userId string) ([]model.NotificationFromDb, error) {
	db := middleware.DBConn
	notifications := make([]model.NotificationFromDb, 0)

	selectQuery := `
		SELECT
			id,
			user_id,
			type,
			message,
			link,
			COALESCE(is_read, FALSE) AS is_read,
			created_at
		FROM public.notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	if err := db.Raw(selectQuery, userId).Scan(&notifications).Error; err != nil {
		return nil, fmt.Errorf("Failed to retrieve notifications")
	}

	return notifications, nil
}

func MarkAllNotificationsRead(userId string) error {
	db := middleware.DBConn

	if err := db.Exec(`
		UPDATE public.notifications
		SET is_read = TRUE
		WHERE user_id = $1
			AND COALESCE(is_read, FALSE) = FALSE
	`, userId).Error; err != nil {
		return fmt.Errorf("Failed to mark all notifications as read")
	}

	return nil
}

func MarkNotificationRead(userId, notificationId string) error {
	db := middleware.DBConn

	result := db.Exec(`
		UPDATE public.notifications
		SET is_read = TRUE
		WHERE id = $1
			AND user_id = $2
	`, notificationId, userId)
	if result.Error != nil {
		return fmt.Errorf("Failed to mark notification as read")
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("Notification not found")
	}

	return nil
}
