package controller

import (
	"fmt"
	"strings"

	"p2p_marketplace/backend/repository"

	"github.com/gofiber/fiber/v2"
)

func GetAdminDashboardStats(c *fiber.Ctx) error {
	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	user, err := repository.GetUserById(userId)
	if err != nil {
		return SendErrorResponse(c, 401, "User is not authenticated", err)
	}

	role := strings.ToUpper(strings.TrimSpace(user.Role))
	if role != "ADMIN" && role != "SUPER_ADMIN" {
		return SendErrorResponse(c, 403, "Forbidden", nil)
	}

	stats, err := repository.GetAdminDashboardStats()
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Admin dashboard stats fetched successfully", map[string]any{
		"stats": stats,
	})
}
