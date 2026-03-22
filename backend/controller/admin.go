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

func requireSuperAdmin(c *fiber.Ctx) (string, error) {
	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return "", SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	user, err := repository.GetUserById(userId)
	if err != nil {
		return "", SendErrorResponse(c, 401, "User is not authenticated", err)
	}

	role := strings.ToUpper(strings.TrimSpace(user.Role))
	if role != "SUPER_ADMIN" {
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

func GetAdminReports(c *fiber.Ctx) error {
	_, authErr := requireAdmin(c)
	if authErr != nil {
		return authErr
	}

	reports, err := repository.GetAdminReports()
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Reports fetched successfully", map[string]any{
		"reports": reports,
	})
}

func SetAdminReportStatus(c *fiber.Ctx) error {
	adminUserId, authErr := requireAdmin(c)
	if authErr != nil {
		return authErr
	}

	reportId := strings.TrimSpace(c.Params("id"))
	if reportId == "" {
		return SendErrorResponse(c, 400, "Report ID is required", nil)
	}

	var body model.AdminSetReportStatusBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body", err)
	}

	normalizedStatus := strings.ToUpper(strings.TrimSpace(body.Status))
	if normalizedStatus != "RESOLVED" && normalizedStatus != "DISMISSED" {
		return SendErrorResponse(c, 400, "Status must be RESOLVED or DISMISSED", nil)
	}

	if err := repository.SetAdminReportStatus(reportId, adminUserId, normalizedStatus); err != nil {
		if strings.EqualFold(err.Error(), "Report not found") {
			return SendErrorResponse(c, 404, err.Error(), err)
		}
		if strings.EqualFold(err.Error(), "Invalid report status") {
			return SendErrorResponse(c, 400, err.Error(), err)
		}
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Report status updated successfully", map[string]any{
		"reportId": reportId,
		"status":   normalizedStatus,
	})
}

func GetAdminAccounts(c *fiber.Ctx) error {
	_, authErr := requireSuperAdmin(c)
	if authErr != nil {
		return authErr
	}

	admins, err := repository.GetAdminAccounts()
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Admin accounts fetched successfully", map[string]any{
		"admins": admins,
	})
}

func CreateAdminAccount(c *fiber.Ctx) error {
	_, authErr := requireSuperAdmin(c)
	if authErr != nil {
		return authErr
	}

	var body model.AdminCreateAdminBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body", err)
	}

	admin, err := repository.CreateAdminAccount(body)
	if err != nil {
		message := strings.TrimSpace(err.Error())
		if strings.Contains(strings.ToLower(message), "already exists") {
			return SendErrorResponse(c, 409, message, err)
		}
		if strings.Contains(strings.ToLower(message), "invalid") || strings.Contains(strings.ToLower(message), "required") || strings.Contains(strings.ToLower(message), "must") {
			return SendErrorResponse(c, 400, message, err)
		}
		return SendErrorResponse(c, 500, message, err)
	}

	return SendSuccessResponse(c, 201, "Admin account created successfully", map[string]any{
		"admin": admin,
	})
}

func DeleteAdminAccount(c *fiber.Ctx) error {
	adminUserId, authErr := requireSuperAdmin(c)
	if authErr != nil {
		return authErr
	}

	targetUserId := strings.TrimSpace(c.Params("id"))
	if targetUserId == "" {
		return SendErrorResponse(c, 400, "Admin ID is required", nil)
	}
	if targetUserId == adminUserId {
		return SendErrorResponse(c, 400, "You cannot remove your own account", nil)
	}

	if err := repository.DeleteAdminAccount(targetUserId); err != nil {
		message := strings.TrimSpace(err.Error())
		if strings.EqualFold(message, "Admin account not found") {
			return SendErrorResponse(c, 404, message, err)
		}
		if strings.Contains(strings.ToLower(message), "last super admin") {
			return SendErrorResponse(c, 400, message, err)
		}
		return SendErrorResponse(c, 500, message, err)
	}

	return SendSuccessResponse(c, 200, "Admin account removed successfully", map[string]any{
		"adminId": targetUserId,
	})
}
