package controller

import (
	"fmt"
	"strings"

	"p2p_marketplace/backend/config"
	"p2p_marketplace/backend/model"
	"p2p_marketplace/backend/repository"

	"github.com/gofiber/fiber/v2"
)

func adminToAbsoluteAssetURL(baseURL, raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return trimmed
	}
	return strings.TrimRight(baseURL, "/") + "/" + strings.TrimLeft(trimmed, "/")
}

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

	adminUser, err := repository.GetUserById(adminUserId)
	if err != nil {
		return SendErrorResponse(c, 401, "User is not authenticated", err)
	}

	targetUserId := strings.TrimSpace(c.Params("id"))
	if targetUserId == "" {
		return SendErrorResponse(c, 400, "User ID is required", nil)
	}
	if targetUserId == adminUserId {
		return SendErrorResponse(c, 400, "You cannot update your own active status from this page", nil)
	}

	targetUser, err := repository.GetUserById(targetUserId)
	if err != nil {
		return SendErrorResponse(c, 404, "User not found", err)
	}

	adminRole := strings.ToUpper(strings.TrimSpace(adminUser.Role))
	targetRole := strings.ToUpper(strings.TrimSpace(targetUser.Role))
	if (targetRole == "ADMIN" || targetRole == "SUPER_ADMIN") && adminRole != "SUPER_ADMIN" {
		return SendErrorResponse(c, 403, "Forbidden", nil)
	}

	var body model.AdminSetUserActiveBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body", err)
	}
	if body.IsActive == nil {
		return SendErrorResponse(c, 400, "isActive is required", nil)
	}

	if err := repository.SetAdminUserActive(targetUserId, *body.IsActive, adminUserId); err != nil {
		if strings.EqualFold(err.Error(), "User not found") {
			return SendErrorResponse(c, 404, err.Error(), err)
		}
		if strings.Contains(strings.ToLower(err.Error()), "last active super admin") {
			return SendErrorResponse(c, 400, err.Error(), err)
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

	adminUser, err := repository.GetUserById(adminUserId)
	if err != nil {
		return SendErrorResponse(c, 401, "User is not authenticated", err)
	}

	targetUserId := strings.TrimSpace(c.Params("id"))
	if targetUserId == "" {
		return SendErrorResponse(c, 400, "User ID is required", nil)
	}
	if targetUserId == adminUserId {
		return SendErrorResponse(c, 400, "You cannot delete your own account from this page", nil)
	}

	targetUser, err := repository.GetUserById(targetUserId)
	if err != nil {
		return SendErrorResponse(c, 404, "User not found", err)
	}

	adminRole := strings.ToUpper(strings.TrimSpace(adminUser.Role))
	targetRole := strings.ToUpper(strings.TrimSpace(targetUser.Role))
	if (targetRole == "ADMIN" || targetRole == "SUPER_ADMIN") && adminRole != "SUPER_ADMIN" {
		return SendErrorResponse(c, 403, "Forbidden", nil)
	}

	if err := repository.DeleteAdminUser(targetUserId, adminUserId); err != nil {
		if strings.EqualFold(err.Error(), "User not found") {
			return SendErrorResponse(c, 404, err.Error(), err)
		}
		if strings.Contains(strings.ToLower(err.Error()), "last super admin") {
			return SendErrorResponse(c, 400, err.Error(), err)
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

	baseURL := c.BaseURL()
	for i := range listings {
		listings[i].ListingImageURL = adminToAbsoluteAssetURL(baseURL, listings[i].ListingImageURL)
		listings[i].SellerProfileURL = adminToAbsoluteAssetURL(baseURL, listings[i].SellerProfileURL)
	}

	return SendSuccessResponse(c, 200, "Listings fetched successfully", map[string]any{
		"listings": listings,
	})
}

func GetAdminTransactions(c *fiber.Ctx) error {
	_, authErr := requireAdmin(c)
	if authErr != nil {
		return authErr
	}

	transactions, err := repository.GetAdminTransactions()
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	baseURL := c.BaseURL()
	for i := range transactions {
		transactions[i].ListingImageURL = adminToAbsoluteAssetURL(baseURL, transactions[i].ListingImageURL)
		transactions[i].ClientProfileImageURL = adminToAbsoluteAssetURL(baseURL, transactions[i].ClientProfileImageURL)
		transactions[i].OwnerProfileImageURL = adminToAbsoluteAssetURL(baseURL, transactions[i].OwnerProfileImageURL)
	}

	return SendSuccessResponse(c, 200, "Transactions fetched successfully", map[string]any{
		"transactions": transactions,
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

	return SendSuccessResponse(c, 200, "Listing deleted successfully", map[string]any{
		"listingId": targetListingId,
		"status":    "DELETED",
	})
}

func ToggleAdminListingVisibility(c *fiber.Ctx) error {
	_, authErr := requireAdmin(c)
	if authErr != nil {
		return authErr
	}

	targetListingId := strings.TrimSpace(c.Params("id"))
	if targetListingId == "" {
		return SendErrorResponse(c, 400, "Listing ID is required", nil)
	}

	nextStatus, err := repository.ToggleAdminListingVisibility(targetListingId)
	if err != nil {
		if strings.EqualFold(err.Error(), "Listing not found") {
			return SendErrorResponse(c, 404, err.Error(), err)
		}
		if strings.EqualFold(err.Error(), "Cannot update visibility for deleted listing") {
			return SendErrorResponse(c, 400, err.Error(), err)
		}
		if strings.EqualFold(err.Error(), "Listing cannot be shadow banned from current status") {
			return SendErrorResponse(c, 400, err.Error(), err)
		}
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Listing shadow-ban status updated successfully", map[string]any{
		"listingId": targetListingId,
		"status":    nextStatus,
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

	baseURL := c.BaseURL()
	for i := range reports {
		reports[i].ReporterImage = adminToAbsoluteAssetURL(baseURL, reports[i].ReporterImage)
		reports[i].OwnerImage = adminToAbsoluteAssetURL(baseURL, reports[i].OwnerImage)
		reports[i].ListingImageURL = adminToAbsoluteAssetURL(baseURL, reports[i].ListingImageURL)
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

	normalizedAction := strings.ToUpper(strings.TrimSpace(body.Action))
	if normalizedAction != "" {
		reason := strings.TrimSpace(body.Reason)
		if reason == "" {
			return SendErrorResponse(c, 400, "Reason is required", nil)
		}
		if len(reason) > config.AdminReasonMaxLength {
			return SendErrorResponse(c, 400, fmt.Sprintf("Reason must not exceed %d characters", config.AdminReasonMaxLength), nil)
		}

		actionAllowed := false
		for _, allowedAction := range config.AdminReportActionTypes {
			if normalizedAction == allowedAction {
				actionAllowed = true
				break
			}
		}
		if !actionAllowed {
			return SendErrorResponse(c, 400, "Invalid report action", nil)
		}

		if err := repository.SetAdminReportAction(reportId, adminUserId, normalizedAction, reason); err != nil {
			if strings.EqualFold(err.Error(), "Report not found") {
				return SendErrorResponse(c, 404, err.Error(), err)
			}
			if strings.Contains(strings.ToLower(err.Error()), "invalid") || strings.Contains(strings.ToLower(err.Error()), "required") || strings.Contains(strings.ToLower(err.Error()), "already") {
				return SendErrorResponse(c, 400, err.Error(), err)
			}
			return SendErrorResponse(c, 500, err.Error(), err)
		}

		return SendSuccessResponse(c, 200, "Report action applied successfully", map[string]any{
			"reportId": reportId,
			"action":   normalizedAction,
		})
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

func GetAdminVerifications(c *fiber.Ctx) error {
	_, authErr := requireAdmin(c)
	if authErr != nil {
		return authErr
	}

	verifications, err := repository.GetAdminVerifications()
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Verifications fetched successfully", map[string]any{
		"verifications": verifications,
	})
}

func SetAdminVerificationStatus(c *fiber.Ctx) error {
	reviewedById, authErr := requireAdmin(c)
	if authErr != nil {
		return authErr
	}

	verificationId := strings.TrimSpace(c.Params("id"))
	if verificationId == "" {
		return SendErrorResponse(c, 400, "Verification ID is required", nil)
	}

	var body model.AdminSetVerificationStatusBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body", err)
	}

	normalizedStatus := strings.ToUpper(strings.TrimSpace(body.Status))
	reason := strings.TrimSpace(body.Reason)

	if normalizedStatus != "VERIFIED" && normalizedStatus != "REJECTED" {
		return SendErrorResponse(c, 400, "Status must be VERIFIED or REJECTED", nil)
	}
	if reason == "" {
		return SendErrorResponse(c, 400, "Reason is required", nil)
	}
	if len(reason) > config.AdminReasonMaxLength {
		return SendErrorResponse(c, 400, fmt.Sprintf("Reason must not exceed %d characters", config.AdminReasonMaxLength), nil)
	}

	if err := repository.SetAdminVerificationStatus(verificationId, reviewedById, normalizedStatus, reason); err != nil {
		message := strings.TrimSpace(err.Error())
		if strings.EqualFold(message, "Verification not found") {
			return SendErrorResponse(c, 404, message, err)
		}
		if strings.EqualFold(message, "Verification is already reviewed") {
			return SendErrorResponse(c, 400, message, err)
		}
		if strings.Contains(strings.ToLower(message), "invalid") || strings.Contains(strings.ToLower(message), "required") {
			return SendErrorResponse(c, 400, message, err)
		}
		return SendErrorResponse(c, 500, message, err)
	}

	return SendSuccessResponse(c, 200, "Verification status updated successfully", map[string]any{
		"verificationId": verificationId,
		"status":         normalizedStatus,
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

	if err := repository.DeleteAdminUser(targetUserId, adminUserId); err != nil {
		message := strings.TrimSpace(err.Error())
		if strings.EqualFold(message, "User not found") {
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

func SetAdminAccountActive(c *fiber.Ctx) error {
	adminUserId, authErr := requireSuperAdmin(c)
	if authErr != nil {
		return authErr
	}

	targetUserId := strings.TrimSpace(c.Params("id"))
	if targetUserId == "" {
		return SendErrorResponse(c, 400, "Admin ID is required", nil)
	}
	if targetUserId == adminUserId {
		return SendErrorResponse(c, 400, "You cannot update your own active status", nil)
	}

	var body model.AdminSetUserActiveBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body", err)
	}
	if body.IsActive == nil {
		return SendErrorResponse(c, 400, "isActive is required", nil)
	}

	if err := repository.SetAdminUserActive(targetUserId, *body.IsActive, adminUserId); err != nil {
		message := strings.TrimSpace(err.Error())
		if strings.EqualFold(message, "User not found") {
			return SendErrorResponse(c, 404, message, err)
		}
		if strings.Contains(strings.ToLower(message), "last super admin") {
			return SendErrorResponse(c, 400, message, err)
		}
		return SendErrorResponse(c, 500, message, err)
	}

	return SendSuccessResponse(c, 200, "Admin account status updated successfully", map[string]any{
		"adminId":   targetUserId,
		"is_active": *body.IsActive,
	})
}
