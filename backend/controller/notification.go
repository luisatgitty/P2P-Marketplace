package controller

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"p2p_marketplace/backend/repository"

	"github.com/gofiber/fiber/v2"
)

func GetNotifications(c *fiber.Ctx) error {
	userId := strings.TrimSpace(fmt.Sprintf("%v", c.Locals("userId")))
	if userId == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	hasLimitParam := strings.TrimSpace(c.Query("limit")) != ""
	hasOffsetParam := strings.TrimSpace(c.Query("offset")) != ""
	hasPagination := hasLimitParam || hasOffsetParam

	limit := 15
	if hasPagination && hasLimitParam {
		parsedLimit, parseErr := strconv.Atoi(strings.TrimSpace(c.Query("limit")))
		if parseErr != nil || parsedLimit <= 0 {
			return SendErrorResponse(c, 400, "Limit must be a positive integer", parseErr)
		}
		if parsedLimit > 100 {
			parsedLimit = 100
		}
		limit = parsedLimit
	}

	offset := 0
	if hasPagination && hasOffsetParam {
		parsedOffset, parseErr := strconv.Atoi(strings.TrimSpace(c.Query("offset")))
		if parseErr != nil || parsedOffset < 0 {
			return SendErrorResponse(c, 400, "Offset must be a non-negative integer", parseErr)
		}
		offset = parsedOffset
	}

	unreadCount, err := repository.GetUnreadNotificationCountByUser(userId)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	if !hasPagination {
		rows, err := repository.GetNotificationsByUser(userId)
		if err != nil {
			return SendErrorResponse(c, 500, err.Error(), err)
		}

		items := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			items = append(items, map[string]any{
				"id":        row.Id,
				"userId":    row.UserId,
				"type":      row.Type,
				"message":   row.Message,
				"link":      row.Link,
				"isRead":    row.IsRead,
				"createdAt": row.CreatedAt.UTC().Format(time.RFC3339),
			})
		}

		return SendSuccessResponse(c, 200, "Notifications fetched successfully", map[string]any{
			"notifications": items,
			"unreadCount":   unreadCount,
		})
	}

	rows, total, err := repository.GetNotificationsByUserPage(userId, limit, offset)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	items := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		items = append(items, map[string]any{
			"id":        row.Id,
			"userId":    row.UserId,
			"type":      row.Type,
			"message":   row.Message,
			"link":      row.Link,
			"isRead":    row.IsRead,
			"createdAt": row.CreatedAt.UTC().Format(time.RFC3339),
		})
	}

	return SendSuccessResponse(c, 200, "Notifications fetched successfully", map[string]any{
		"notifications": items,
		"total":         total,
		"limit":         limit,
		"offset":        offset,
		"unreadCount":   unreadCount,
	})
}

func MarkAllNotificationsRead(c *fiber.Ctx) error {
	userId := strings.TrimSpace(fmt.Sprintf("%v", c.Locals("userId")))
	if userId == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	if err := repository.MarkAllNotificationsRead(userId); err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Notifications marked as read", map[string]any{"isSuccess": true})
}

func MarkNotificationRead(c *fiber.Ctx) error {
	userId := strings.TrimSpace(fmt.Sprintf("%v", c.Locals("userId")))
	if userId == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	notificationId := strings.TrimSpace(c.Params("id"))
	if notificationId == "" {
		return SendErrorResponse(c, 400, "Notification ID is required", nil)
	}

	if err := repository.MarkNotificationRead(userId, notificationId); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			return SendErrorResponse(c, 404, err.Error(), nil)
		}
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Notification marked as read", map[string]any{"isSuccess": true})
}
