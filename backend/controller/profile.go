package controller

import (
	"fmt"
	"strings"

	"p2p_marketplace/backend/config"
	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"
	"p2p_marketplace/backend/repository"

	"github.com/gofiber/fiber/v2"
)

func MeProfile(c *fiber.Ctx) error {
	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	user, err := repository.GetProfileUserById(userId)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	listings, err := repository.GetUserListings(userId)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	bookmarks, err := repository.GetUserBookmarks(userId)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	receivedReviews, err := repository.GetUserReceivedReviews(userId)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	personalReviews, err := repository.GetUserPersonalReviews(userId)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	apiURL := c.BaseURL()

	return SendSuccessResponse(c, 200, "Profile fetched successfully", map[string]any{
		"user":            mapProfileUser(user, apiURL),
		"listings":        mapProfileListings(listings, apiURL),
		"bookmarks":       mapProfileListings(bookmarks, apiURL),
		"reviews":         mapProfileReviews(receivedReviews, apiURL),
		"receivedReviews": mapProfileReviews(receivedReviews, apiURL),
		"personalReviews": mapProfileReviews(personalReviews, apiURL),
	})
}

func ProfileById(c *fiber.Ctx) error {
	profileUserId := strings.TrimSpace(c.Params("id"))
	if profileUserId == "" {
		return SendErrorResponse(c, 400, "Profile user ID is required", nil)
	}

	user, err := repository.GetProfileUserById(profileUserId)
	if err != nil {
		return SendErrorResponse(c, 404, err.Error(), err)
	}

	listings, err := repository.GetUserListings(profileUserId)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	receivedReviews, err := repository.GetUserReceivedReviews(profileUserId)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	personalReviews, err := repository.GetUserPersonalReviews(profileUserId)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	apiURL := c.BaseURL()

	return SendSuccessResponse(c, 200, "Profile fetched successfully", map[string]any{
		"user":            mapProfileUser(user, apiURL),
		"listings":        mapProfileListings(listings, apiURL),
		"bookmarks":       []map[string]any{},
		"reviews":         mapProfileReviews(receivedReviews, apiURL),
		"receivedReviews": mapProfileReviews(receivedReviews, apiURL),
		"personalReviews": mapProfileReviews(personalReviews, apiURL),
	})
}

func UpdateMeProfile(c *fiber.Ctx) error {
	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	var body model.UpdateProfileBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	body.FirstName = strings.TrimSpace(body.FirstName)
	body.LastName = strings.TrimSpace(body.LastName)
	body.Bio = strings.TrimSpace(body.Bio)
	body.PhoneNumber = strings.TrimSpace(body.PhoneNumber)
	body.LocationProv = strings.TrimSpace(body.LocationProv)
	body.LocationCity = strings.TrimSpace(body.LocationCity)
	body.LocationBrgy = strings.TrimSpace(body.LocationBrgy)
	body.CurrentPassword = strings.TrimSpace(body.CurrentPassword)
	body.NewPassword = strings.TrimSpace(body.NewPassword)

	if len(body.FirstName) < config.NameMinLength || len(body.FirstName) > config.NameMaxLength {
		return SendErrorResponse(c, 400, fmt.Sprintf("First name must be between %d and %d characters", config.NameMinLength, config.NameMaxLength), nil)
	}
	if len(body.LastName) < config.NameMinLength || len(body.LastName) > config.NameMaxLength {
		return SendErrorResponse(c, 400, fmt.Sprintf("Last name must be between %d and %d characters", config.NameMinLength, config.NameMaxLength), nil)
	}
	if (body.LocationProv == "" && body.LocationCity != "") || (body.LocationProv != "" && body.LocationCity == "") {
		return SendErrorResponse(c, 400, "Province and city/municipality must both be provided", nil)
	}
	if len(body.Bio) > 200 {
		return SendErrorResponse(c, 400, "Bio must not exceed 200 characters", nil)
	}

	if body.NewPassword != "" {
		if body.CurrentPassword == "" {
			return SendErrorResponse(c, 400, "Current password is required to set a new password", nil)
		}
		if err := middleware.ValidatePasswordLength(body.NewPassword); err != nil {
			return SendErrorResponse(c, 400, err.Error(), err)
		}
	}

	if err := repository.UpdateProfile(userId, body); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	updatedUser, err := repository.GetProfileUserById(userId)
	if err != nil {
		return SendErrorResponse(c, 500, "Profile updated but failed to retrieve latest profile", err)
	}

	return SendSuccessResponse(c, 200, "Profile updated successfully", map[string]any{
		"user": mapProfileUser(updatedUser, c.BaseURL()),
	})
}

func UpdateMeProfileImages(c *fiber.Ctx) error {
	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	var body model.UpdateProfileImagesBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	if body.ProfileImage == nil && body.CoverImage == nil && !body.RemoveProfileImage && !body.RemoveCoverImage {
		return SendErrorResponse(c, 400, "At least one image is required", nil)
	}

	if err := repository.UpdateProfileImages(userId, body); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	updatedUser, err := repository.GetProfileUserById(userId)
	if err != nil {
		return SendErrorResponse(c, 500, "Images updated but failed to retrieve latest profile", err)
	}

	return SendSuccessResponse(c, 200, "Profile images updated successfully", map[string]any{
		"user": mapProfileUser(updatedUser, c.BaseURL()),
	})
}

func DeactivateMeProfile(c *fiber.Ctx) error {
	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	if err := repository.DeactivateAccount(userId); err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	c.Cookie(middleware.ExpiredCookie())

	return SendSuccessResponse(c, 200, "Account deactivated successfully", nil)
}

func mapProfileUser(user model.ProfileUserFromDb, apiURL string) map[string]any {
	lastLoginAt := ""
	if user.LastLoginAt != nil {
		lastLoginAt = user.LastLoginAt.UTC().Format("2006-01-02T15:04:05Z")
	}

	return map[string]any{
		"firstName":       user.FirstName,
		"lastName":        user.LastName,
		"email":           user.Email,
		"phoneNumber":     user.PhoneNumber,
		"bio":             user.Bio,
		"locationBrgy":    user.LocationBrgy,
		"locationCity":    user.LocationCity,
		"locationProv":    user.LocationProv,
		"profileImageUrl": resolveAssetURL(apiURL, user.ProfileImage),
		"coverImageUrl":   resolveAssetURL(apiURL, user.CoverImage),
		"role":            user.Role,
		"status":          user.Status,
		"createdAt":       user.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		"lastLoginAt":     lastLoginAt,
		"overallRating":   user.OverallRating,
		"reviewCount":     user.ReviewCount,
	}
}

func mapProfileListings(listings []model.ProfileListingFromDb, apiURL string) []map[string]any {
	mapped := make([]map[string]any, 0, len(listings))
	for _, listing := range listings {
		mapped = append(mapped, map[string]any{
			"id":        listing.Id,
			"title":     listing.Title,
			"price":     listing.Price,
			"priceUnit": listing.PriceUnit,
			"type":      listing.Type,
			"category":  listing.Category,
			"location":  listing.Location,
			"postedAt":  listing.PostedAt,
			"imageUrl":  resolveAssetURL(apiURL, listing.ImageUrl),
			"status":    listing.Status,
			"seller": map[string]any{
				"name":   listing.SellerName,
				"rating": listing.SellerRating,
			},
		})
	}
	return mapped
}

func mapProfileReviews(reviews []model.ProfileReviewFromDb, apiURL string) []map[string]any {
	mapped := make([]map[string]any, 0, len(reviews))
	for _, review := range reviews {
		mapped = append(mapped, map[string]any{
			"id":         review.Id,
			"rating":     review.Rating,
			"comment":    strings.TrimSpace(review.Comment),
			"reviewDate": review.ReviewDate,
			"reviewer": map[string]any{
				"id":              review.ReviewerId,
				"name":            review.ReviewerName,
				"profileImageUrl": resolveAssetURL(apiURL, review.ReviewerImageUrl),
			},
			"listing": map[string]any{
				"id":        review.ListingId,
				"title":     review.ListingTitle,
				"price":     review.ListingPrice,
				"priceUnit": review.ListingPriceUnit,
				"imageUrl":  resolveAssetURL(apiURL, review.ListingImageUrl),
			},
		})
	}
	return mapped
}

func resolveAssetURL(apiURL, raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80"
	}
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return trimmed
	}
	return strings.TrimRight(apiURL, "/") + "/" + strings.TrimLeft(trimmed, "/")
}
