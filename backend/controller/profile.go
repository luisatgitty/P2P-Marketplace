package controller

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"p2p_marketplace/backend/config"
	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"
	"p2p_marketplace/backend/repository"

	"github.com/gofiber/fiber/v2"
)

const profilePageDefaultLimit = 16
const profilePageMaxLimit = 100

type profileSectionPage struct {
	Limit         int
	Offset        int
	HasPagination bool
}

func parseProfileSectionPage(c *fiber.Ctx, key string) (profileSectionPage, error) {
	limitQuery := strings.TrimSpace(c.Query(key + "Limit"))
	offsetQuery := strings.TrimSpace(c.Query(key + "Offset"))
	hasPagination := limitQuery != "" || offsetQuery != ""

	page := profileSectionPage{
		Limit:         profilePageDefaultLimit,
		Offset:        0,
		HasPagination: hasPagination,
	}

	if !hasPagination {
		return page, nil
	}

	if limitQuery != "" {
		parsedLimit, parseErr := strconv.Atoi(limitQuery)
		if parseErr != nil || parsedLimit < 0 {
			return page, fmt.Errorf("%sLimit must be a non-negative integer", key)
		}
		if parsedLimit > profilePageMaxLimit {
			parsedLimit = profilePageMaxLimit
		}
		page.Limit = parsedLimit
	}

	if offsetQuery != "" {
		parsedOffset, parseErr := strconv.Atoi(offsetQuery)
		if parseErr != nil || parsedOffset < 0 {
			return page, fmt.Errorf("%sOffset must be a non-negative integer", key)
		}
		page.Offset = parsedOffset
	}

	return page, nil
}

func getOptionalRequesterRoleFromSession(c *fiber.Ctx) string {
	sessionToken := strings.TrimSpace(c.Cookies(config.SessionCookieName))
	if sessionToken == "" {
		return ""
	}

	sessionId := middleware.HashToken(sessionToken)
	sessionFromDb, err := repository.GetSessionById(sessionId)
	if err != nil {
		return ""
	}

	if sessionFromDb.UserId == "" || sessionFromDb.IsRevoked || sessionFromDb.ExpiresAt.Before(time.Now()) {
		return ""
	}

	requester, err := repository.GetUserById(sessionFromDb.UserId)
	if err != nil || !requester.IsActive {
		return ""
	}

	return strings.ToUpper(strings.TrimSpace(requester.Role))
}

func MeProfile(c *fiber.Ctx) error {
	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	listingsPage, err := parseProfileSectionPage(c, "listings")
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	bookmarksPage, err := parseProfileSectionPage(c, "bookmarks")
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	receivedReviewsPage, err := parseProfileSectionPage(c, "receivedReviews")
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	personalReviewsPage, err := parseProfileSectionPage(c, "personalReviews")
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	hasPagination := listingsPage.HasPagination || bookmarksPage.HasPagination || receivedReviewsPage.HasPagination || personalReviewsPage.HasPagination

	user, err := repository.GetProfileUserById(userId)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	listings := make([]model.ProfileListingFromDb, 0)
	bookmarks := make([]model.ProfileListingFromDb, 0)
	receivedReviews := make([]model.ProfileReviewFromDb, 0)
	personalReviews := make([]model.ProfileReviewFromDb, 0)
	listingsTotal := 0
	bookmarksTotal := 0
	receivedReviewsTotal := 0
	personalReviewsTotal := 0

	if !hasPagination {
		listings, listingsTotal, err = repository.GetUserListingsPage(userId, 0, 0)
		if err != nil {
			return SendErrorResponse(c, 500, err.Error(), err)
		}

		bookmarks, bookmarksTotal, err = repository.GetUserBookmarksPage(userId, 0, 0)
		if err != nil {
			return SendErrorResponse(c, 500, err.Error(), err)
		}

		receivedReviews, receivedReviewsTotal, err = repository.GetUserReceivedReviewsPage(userId, 0, 0)
		if err != nil {
			return SendErrorResponse(c, 500, err.Error(), err)
		}

		personalReviews, personalReviewsTotal, err = repository.GetUserPersonalReviewsPage(userId, 0, 0)
		if err != nil {
			return SendErrorResponse(c, 500, err.Error(), err)
		}
	} else {
		if listingsPage.HasPagination {
			listings, listingsTotal, err = repository.GetUserListingsPage(userId, listingsPage.Limit, listingsPage.Offset)
			if err != nil {
				return SendErrorResponse(c, 500, err.Error(), err)
			}
		}

		if bookmarksPage.HasPagination {
			bookmarks, bookmarksTotal, err = repository.GetUserBookmarksPage(userId, bookmarksPage.Limit, bookmarksPage.Offset)
			if err != nil {
				return SendErrorResponse(c, 500, err.Error(), err)
			}
		}

		if receivedReviewsPage.HasPagination {
			receivedReviews, receivedReviewsTotal, err = repository.GetUserReceivedReviewsPage(userId, receivedReviewsPage.Limit, receivedReviewsPage.Offset)
			if err != nil {
				return SendErrorResponse(c, 500, err.Error(), err)
			}
		}

		if personalReviewsPage.HasPagination {
			personalReviews, personalReviewsTotal, err = repository.GetUserPersonalReviewsPage(userId, personalReviewsPage.Limit, personalReviewsPage.Offset)
			if err != nil {
				return SendErrorResponse(c, 500, err.Error(), err)
			}
		}
	}

	apiURL := c.BaseURL()

	return SendSuccessResponse(c, 200, "Profile fetched successfully", map[string]any{
		"user":                 mapProfileUser(user, apiURL),
		"listings":             mapProfileListings(listings, apiURL),
		"bookmarks":            mapProfileListings(bookmarks, apiURL),
		"reviews":              mapProfileReviews(receivedReviews, apiURL),
		"receivedReviews":      mapProfileReviews(receivedReviews, apiURL),
		"personalReviews":      mapProfileReviews(personalReviews, apiURL),
		"listingsTotal":        listingsTotal,
		"bookmarksTotal":       bookmarksTotal,
		"receivedReviewsTotal": receivedReviewsTotal,
		"personalReviewsTotal": personalReviewsTotal,
	})
}

func ProfileById(c *fiber.Ctx) error {
	profileUserId := strings.TrimSpace(c.Params("id"))
	if profileUserId == "" {
		return SendErrorResponse(c, 400, "Profile user ID is required", nil)
	}

	listingsPage, err := parseProfileSectionPage(c, "listings")
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	receivedReviewsPage, err := parseProfileSectionPage(c, "receivedReviews")
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	personalReviewsPage, err := parseProfileSectionPage(c, "personalReviews")
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	hasPagination := listingsPage.HasPagination || receivedReviewsPage.HasPagination || personalReviewsPage.HasPagination

	user, err := repository.GetProfileUserById(profileUserId)
	if err != nil {
		return SendErrorResponse(c, 404, err.Error(), err)
	}

	now := time.Now().UTC()
	requesterRole := getOptionalRequesterRoleFromSession(c)
	canViewBlockedProfile := requesterRole == "ADMIN" || requesterRole == "SUPER_ADMIN"
	if (!user.IsActive || (user.AccountLockedUntil != nil && user.AccountLockedUntil.After(now))) && !canViewBlockedProfile {
		return SendErrorResponse(c, 404, "User not found", nil)
	}

	listings := make([]model.ProfileListingFromDb, 0)
	receivedReviews := make([]model.ProfileReviewFromDb, 0)
	personalReviews := make([]model.ProfileReviewFromDb, 0)
	listingsTotal := 0
	receivedReviewsTotal := 0
	personalReviewsTotal := 0

	if !hasPagination {
		listings, listingsTotal, err = repository.GetUserListingsPage(profileUserId, 0, 0)
		if err != nil {
			return SendErrorResponse(c, 500, err.Error(), err)
		}

		receivedReviews, receivedReviewsTotal, err = repository.GetUserReceivedReviewsPage(profileUserId, 0, 0)
		if err != nil {
			return SendErrorResponse(c, 500, err.Error(), err)
		}

		personalReviews, personalReviewsTotal, err = repository.GetUserPersonalReviewsPage(profileUserId, 0, 0)
		if err != nil {
			return SendErrorResponse(c, 500, err.Error(), err)
		}
	} else {
		if listingsPage.HasPagination {
			listings, listingsTotal, err = repository.GetUserListingsPage(profileUserId, listingsPage.Limit, listingsPage.Offset)
			if err != nil {
				return SendErrorResponse(c, 500, err.Error(), err)
			}
		}

		if receivedReviewsPage.HasPagination {
			receivedReviews, receivedReviewsTotal, err = repository.GetUserReceivedReviewsPage(profileUserId, receivedReviewsPage.Limit, receivedReviewsPage.Offset)
			if err != nil {
				return SendErrorResponse(c, 500, err.Error(), err)
			}
		}

		if personalReviewsPage.HasPagination {
			personalReviews, personalReviewsTotal, err = repository.GetUserPersonalReviewsPage(profileUserId, personalReviewsPage.Limit, personalReviewsPage.Offset)
			if err != nil {
				return SendErrorResponse(c, 500, err.Error(), err)
			}
		}
	}

	apiURL := c.BaseURL()

	return SendSuccessResponse(c, 200, "Profile fetched successfully", map[string]any{
		"user":                 mapProfileUser(user, apiURL),
		"listings":             mapProfileListings(listings, apiURL),
		"bookmarks":            []map[string]any{},
		"reviews":              mapProfileReviews(receivedReviews, apiURL),
		"receivedReviews":      mapProfileReviews(receivedReviews, apiURL),
		"personalReviews":      mapProfileReviews(personalReviews, apiURL),
		"listingsTotal":        listingsTotal,
		"bookmarksTotal":       0,
		"receivedReviewsTotal": receivedReviewsTotal,
		"personalReviewsTotal": personalReviewsTotal,
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

	if err := middleware.ValidateUpdateProfileInput(&body); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
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

func SubmitMeVerification(c *fiber.Ctx) error {
	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	var body model.SubmitVerificationBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body", err)
	}

	if err := middleware.ValidateSubmitVerificationInput(&body); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	if err := repository.SubmitUserVerification(userId, body); err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	return SendSuccessResponse(c, 201, "Verification submitted successfully", map[string]any{
		"status": "PENDING",
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
			"id":               listing.Id,
			"title":            listing.Title,
			"price":            listing.Price,
			"priceUnit":        listing.PriceUnit,
			"type":             listing.Type,
			"category":         listing.Category,
			"location":         listing.Location,
			"postedAt":         listing.PostedAt,
			"imageUrl":         resolveAssetURL(apiURL, listing.ImageUrl),
			"status":           listing.Status,
			"hasActiveBooking": listing.HasActiveBooking,
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
				"status":          strings.ToLower(strings.TrimSpace(review.ReviewerStatus)),
			},
			"listing": map[string]any{
				"id":        review.ListingId,
				"title":     review.ListingTitle,
				"price":     review.ListingPrice,
				"priceUnit": review.ListingPriceUnit,
				"imageUrl":  resolveAssetURL(apiURL, review.ListingImageUrl),
				"type":      review.ListingType,
				"location":  review.ListingLocation,
			},
		})
	}
	return mapped
}

func resolveAssetURL(apiURL, raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return trimmed
	}
	return strings.TrimRight(apiURL, "/") + "/" + strings.TrimLeft(trimmed, "/")
}
