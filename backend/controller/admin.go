package controller

import (
	"fmt"
	"strings"

	"p2p_marketplace/backend/model"
	"p2p_marketplace/backend/repository"

	"github.com/gofiber/fiber/v2"
)

func requireAdmin(c *fiber.Ctx) (string, error) {
	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return "", SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	user, err := repository.GetUserById(userId)
	if err != nil {
		return "", SendErrorResponse(c, 401, "User is not authenticated", err)
	}

	role := strings.ToUpper(strings.TrimSpace(user.Role))
	if role != "ADMIN" && role != "SUPER_ADMIN" {
		return "", SendErrorResponse(c, 403, "Forbidden", nil)
	}

	return userId, nil
}

func GetAdminDashboardStats(c *fiber.Ctx) error {
	_, authErr := requireAdmin(c)
	if authErr != nil {
		return authErr
	}

	stats, err := repository.GetAdminDashboardStats()
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	weeklyNewUsers, err := repository.GetAdminWeeklyNewUsers()
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	weeklyNewListings, err := repository.GetAdminWeeklyNewListings()
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	listingTypeBreakdown, listingTypeTotalActive, err := repository.GetAdminListingTypeBreakdown()
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Admin dashboard stats fetched successfully", map[string]any{
		"stats":                  stats,
		"weeklyNewUsers":         weeklyNewUsers,
		"weeklyNewListings":      weeklyNewListings,
		"listingTypeBreakdown":   listingTypeBreakdown,
		"listingTypeTotalActive": listingTypeTotalActive,
	})
}

func GetAdminUsers(c *fiber.Ctx) error {
	_, authErr := requireAdmin(c)
	if authErr != nil {
		return authErr
	}

	users, err := repository.GetAdminUsers()
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Users fetched successfully", map[string]any{
		"users": users,
	})
}

func SetAdminUserActive(c *fiber.Ctx) error {
	adminUserId, authErr := requireAdmin(c)
	if authErr != nil {
		return authErr
	}

	targetUserId := strings.TrimSpace(c.Params("id"))
	if targetUserId == "" {
		return SendErrorResponse(c, 400, "User ID is required", nil)
	}
	if targetUserId == adminUserId {
		return SendErrorResponse(c, 400, "You cannot update your own active status from this page", nil)
	}

	var body model.AdminSetUserActiveBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body", err)
	}
	if body.IsActive == nil {
		return SendErrorResponse(c, 400, "isActive is required", nil)
	}

	if err := repository.SetAdminUserActive(targetUserId, *body.IsActive); err != nil {
		if strings.EqualFold(err.Error(), "User not found") {
			return SendErrorResponse(c, 404, err.Error(), err)
		}
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "User status updated successfully", map[string]any{
		"userId":    targetUserId,
		"is_active": *body.IsActive,
	})
}

func DeleteAdminUser(c *fiber.Ctx) error {
	adminUserId, authErr := requireAdmin(c)
	if authErr != nil {
		return authErr
	}

	targetUserId := strings.TrimSpace(c.Params("id"))
	if targetUserId == "" {
		return SendErrorResponse(c, 400, "User ID is required", nil)
	}
	if targetUserId == adminUserId {
		return SendErrorResponse(c, 400, "You cannot delete your own account from this page", nil)
	}

	if err := repository.DeleteAdminUser(targetUserId); err != nil {
		if strings.EqualFold(err.Error(), "User not found") {
			return SendErrorResponse(c, 404, err.Error(), err)
		}
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "User deleted successfully", map[string]any{
		"userId": targetUserId,
	})
}

func GetAdminListings(c *fiber.Ctx) error {
	_, authErr := requireAdmin(c)
	if authErr != nil {
		return authErr
	}

	listings, err := repository.GetAdminListings()
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Listings fetched successfully", map[string]any{
		"listings": listings,
	})
}

func DeleteAdminListing(c *fiber.Ctx) error {
	_, authErr := requireAdmin(c)
	if authErr != nil {
		return authErr
	}

	targetListingId := strings.TrimSpace(c.Params("id"))
	if targetListingId == "" {
		return SendErrorResponse(c, 400, "Listing ID is required", nil)
	}

	if err := repository.DeleteAdminListing(targetListingId); err != nil {
		if strings.EqualFold(err.Error(), "Listing not found") {
			return SendErrorResponse(c, 404, err.Error(), err)
		}
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Listing removed successfully", map[string]any{
		"listingId": targetListingId,
	})
}
