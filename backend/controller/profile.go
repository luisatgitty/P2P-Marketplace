package controller

import (
	"fmt"
	"strings"

	"p2p_marketplace/backend/model"
	"p2p_marketplace/backend/repository"

	"github.com/gofiber/fiber/v2"
)

func MeProfile(c *fiber.Ctx) error {
	fmt.Println(c.Path())

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

	apiURL := c.BaseURL()

	return SendSuccessResponse(c, 200, "Profile fetched successfully", map[string]any{
		"user":      mapProfileUser(user, apiURL),
		"listings":  mapProfileListings(listings, apiURL),
		"bookmarks": mapProfileListings(bookmarks, apiURL),
	})
}

func mapProfileUser(user model.ProfileUserFromDb, apiURL string) map[string]any {
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
