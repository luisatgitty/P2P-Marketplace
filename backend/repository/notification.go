package repository

import (
	"fmt"
	"strings"

	"gorm.io/gorm"

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

func InsertVerificationNotificationTx(tx *gorm.DB, userId, status, reason string) error {
	normalizedStatus := strings.ToUpper(strings.TrimSpace(status))
	trimmedReason := strings.TrimSpace(reason)

	message := "Your verification request has been updated."
	switch normalizedStatus {
	case "VERIFIED":
		message = "Your verification request has been approved."
	case "REJECTED":
		message = "Your verification request was rejected."
		if trimmedReason != "" {
			message = fmt.Sprintf("Your verification request was rejected. Reason: %s.", trimmedReason)
		}
	}

	if err := tx.Exec(`
		INSERT INTO public.notifications (user_id, type, message, link)
		VALUES ($1, 'VERIFICATION', $2, '/profile')
	`, userId, message).Error; err != nil {
		return fmt.Errorf("Failed to create verification notification")
	}

	return nil
}

func InsertReportNotificationTx(tx *gorm.DB, userId, message, link string) error {
	trimmedMessage := strings.TrimSpace(message)
	if trimmedMessage == "" {
		return fmt.Errorf("Notification message is required")
	}

	trimmedLink := strings.TrimSpace(link)
	if trimmedLink == "" {
		trimmedLink = "/notifications"
	}

	if err := tx.Exec(`
		INSERT INTO public.notifications (user_id, type, message, link)
		VALUES ($1, 'REPORT', $2, $3)
	`, userId, trimmedMessage, trimmedLink).Error; err != nil {
		return fmt.Errorf("Failed to create report notification")
	}

	return nil
}
