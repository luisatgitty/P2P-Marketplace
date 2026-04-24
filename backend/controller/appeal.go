package controller

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"p2p_marketplace/backend/config"
	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"
	"p2p_marketplace/backend/repository"

	"github.com/gofiber/fiber/v2"
)

var appealPhonePattern = regexp.MustCompile(`^\d{11}$`)

func normalizeAppealCategory(category string) string {
	trimmed := strings.ToUpper(strings.TrimSpace(category))
	for _, allowed := range config.AppealCategories {
		if trimmed == allowed {
			return allowed
		}
	}
	return ""
}

func normalizeAppealResolution(resolution string) string {
	trimmed := strings.ToUpper(strings.TrimSpace(resolution))
	for _, allowed := range config.AppealResolutions {
		if trimmed == allowed {
			return allowed
		}
	}
	return ""
}

func normalizeAppealStatus(status string) string {
	trimmed := strings.ToUpper(strings.TrimSpace(status))
	for _, allowed := range config.AppealStatuses {
		if trimmed == allowed {
			return allowed
		}
	}
	return ""
}

func validateAppealBody(body *model.AppealCreateBody) error {
	body.UserId = strings.TrimSpace(body.UserId)
	body.FullName = strings.TrimSpace(body.FullName)
	body.Email = strings.TrimSpace(body.Email)
	body.Phone = strings.TrimSpace(body.Phone)
	body.Category = normalizeAppealCategory(body.Category)
	body.Subject = strings.TrimSpace(body.Subject)
	body.Message = strings.TrimSpace(body.Message)
	body.EvidenceURL = strings.TrimSpace(body.EvidenceURL)

	if body.FullName == "" {
		return fmt.Errorf("Full name is required")
	}
	if utf8.RuneCountInString(body.FullName) < config.NameMinLength || utf8.RuneCountInString(body.FullName) > config.NameMaxLength*2 {
		return fmt.Errorf("Full name length is invalid")
	}
	if err := middleware.ValidateEmail(body.Email); err != nil {
		return fmt.Errorf("Invalid email format")
	}
	if body.Phone != "" && !appealPhonePattern.MatchString(body.Phone) {
		return fmt.Errorf("Phone number must be 11 digits")
	}
	if body.Category == "" {
		return fmt.Errorf("Appeal category is invalid")
	}
	if utf8.RuneCountInString(body.Subject) < config.AppealSubjectMinLength || utf8.RuneCountInString(body.Subject) > config.AppealSubjectMaxLength {
		return fmt.Errorf("Subject length is invalid")
	}
	if utf8.RuneCountInString(body.Message) < config.AppealMessageMinLength || utf8.RuneCountInString(body.Message) > config.AppealMessageMaxLength {
		return fmt.Errorf("Appeal message length is invalid")
	}
	if body.EvidenceURL != "" && utf8.RuneCountInString(body.EvidenceURL) > config.AppealEvidenceMaxLength {
		return fmt.Errorf("Evidence URL must not exceed %d characters", config.AppealEvidenceMaxLength)
	}
	return nil
}

func SubmitAppeal(c *fiber.Ctx) error {
	var body model.AppealCreateBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body", err)
	}

	if err := validateAppealBody(&body); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	created, err := repository.CreateAppeal(body)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 201, "Appeal submitted successfully", map[string]any{
		"appeal": created,
	})
}

func GetAppealsByEmail(c *fiber.Ctx) error {
	email := strings.TrimSpace(c.Query("email"))
	if email == "" {
		return SendErrorResponse(c, 400, "Email query parameter is required", nil)
	}
	if err := middleware.ValidateEmail(email); err != nil {
		return SendErrorResponse(c, 400, "Invalid email format", err)
	}

	limit := 4
	if rawLimit := strings.TrimSpace(c.Query("limit")); rawLimit != "" {
		parsedLimit, parseErr := strconv.Atoi(rawLimit)
		if parseErr != nil || parsedLimit <= 0 {
			return SendErrorResponse(c, 400, "Invalid limit query parameter", parseErr)
		}
		if parsedLimit > config.AppealPageMaxLimit {
			parsedLimit = config.AppealPageMaxLimit
		}
		limit = parsedLimit
	}

	appeals, total, err := repository.GetAppeals(model.AppealQuery{
		Email:  email,
		Limit:  limit,
		Offset: 0,
	})
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Appeals fetched successfully", map[string]any{
		"appeals": appeals,
		"total":   total,
		"limit":   limit,
		"offset":  0,
	})
}

func GetAdminAppeals(c *fiber.Ctx) error {
	_, authErr := requireAdmin(c)
	if authErr != nil {
		return authErr
	}

	limit := config.AppealPageDefaultLimit
	if rawLimit := strings.TrimSpace(c.Query("limit")); rawLimit != "" {
		parsedLimit, parseErr := strconv.Atoi(rawLimit)
		if parseErr != nil || parsedLimit <= 0 {
			return SendErrorResponse(c, 400, "Invalid limit query parameter", parseErr)
		}
		if parsedLimit > config.AppealPageMaxLimit {
			parsedLimit = config.AppealPageMaxLimit
		}
		limit = parsedLimit
	}

	offset := 0
	if rawOffset := strings.TrimSpace(c.Query("offset")); rawOffset != "" {
		parsedOffset, parseErr := strconv.Atoi(rawOffset)
		if parseErr != nil || parsedOffset < 0 {
			return SendErrorResponse(c, 400, "Invalid offset query parameter", parseErr)
		}
		offset = parsedOffset
	}

	query := model.AppealQuery{
		Search:   strings.TrimSpace(c.Query("search")),
		Status:   normalizeAppealStatus(c.Query("status")),
		Category: normalizeAppealCategory(c.Query("category")),
		Limit:    limit,
		Offset:   offset,
	}

	rawStatus := strings.TrimSpace(c.Query("status"))
	if rawStatus != "" && !strings.EqualFold(rawStatus, "ALL") && query.Status == "" {
		return SendErrorResponse(c, 400, "Invalid status query parameter", nil)
	}

	rawCategory := strings.TrimSpace(c.Query("category"))
	if rawCategory != "" && !strings.EqualFold(rawCategory, "ALL") && query.Category == "" {
		return SendErrorResponse(c, 400, "Invalid category query parameter", nil)
	}

	appeals, total, err := repository.GetAppeals(query)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Appeals fetched successfully", map[string]any{
		"appeals": appeals,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}

func GetAdminAppealSummary(c *fiber.Ctx) error {
	_, authErr := requireAdmin(c)
	if authErr != nil {
		return authErr
	}

	summary, err := repository.GetAppealSummary()
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Appeal summary fetched successfully", summary)
}

func ReviewAdminAppeal(c *fiber.Ctx) error {
	reviewerId, authErr := requireSuperAdmin(c)
	if authErr != nil {
		return authErr
	}

	appealId := strings.TrimSpace(c.Params("id"))
	if appealId == "" {
		return SendErrorResponse(c, 400, "Appeal ID is required", nil)
	}

	var body model.AppealReviewBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body", err)
	}

	resolution := normalizeAppealResolution(body.Resolution)
	if resolution == "" {
		return SendErrorResponse(c, 400, "Invalid resolution", nil)
	}

	adminNote := strings.TrimSpace(body.AdminNote)
	if adminNote == "" {
		return SendErrorResponse(c, 400, "Admin note is required", nil)
	}
	if utf8.RuneCountInString(adminNote) > config.AdminReasonMaxLength {
		return SendErrorResponse(c, 400, fmt.Sprintf("Admin note must not exceed %d characters", config.AdminReasonMaxLength), nil)
	}

	updated, err := repository.ReviewAppeal(appealId, resolution, adminNote, reviewerId)
	if err != nil {
		if strings.EqualFold(err.Error(), "Appeal not found") {
			return SendErrorResponse(c, 404, err.Error(), err)
		}
		if strings.Contains(strings.ToLower(err.Error()), "already been reviewed") {
			return SendErrorResponse(c, 400, err.Error(), err)
		}
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	emailStatus := "SENT"
	if err := middleware.SendAppealDecisionEmail(updated.Email, updated.FullName, updated.TicketNumber, resolution, adminNote); err != nil {
		emailStatus = "FAILED"
	}
	_ = repository.SetAppealEmailNotificationStatus(appealId, emailStatus)

	refreshed, refreshErr := repository.GetAppealById(appealId)
	if refreshErr == nil {
		updated = refreshed
	}

	return SendSuccessResponse(c, 200, "Appeal reviewed successfully", map[string]any{
		"appeal": updated,
	})
}
