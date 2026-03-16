package controller

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"
	"p2p_marketplace/backend/repository"

	"github.com/gofiber/fiber/v2"
)

func CreateListing(c *fiber.Ctx) error {
	fmt.Println(c.Path())

	var body model.CreateListingBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	if strings.TrimSpace(body.Type) == "" {
		return SendErrorResponse(c, 400, "Listing type is required", nil)
	}
	if strings.TrimSpace(body.Title) == "" {
		return SendErrorResponse(c, 400, "Title is required", nil)
	}
	if strings.TrimSpace(body.Category) == "" {
		return SendErrorResponse(c, 400, "Category is required", nil)
	}
	if body.Price <= 0 {
		return SendErrorResponse(c, 400, "Price must be greater than 0", nil)
	}
	if strings.TrimSpace(body.Description) == "" {
		return SendErrorResponse(c, 400, "Description is required", nil)
	}
	if strings.TrimSpace(body.LocationCity) == "" || strings.TrimSpace(body.LocationProv) == "" {
		return SendErrorResponse(c, 400, "City and province are required", nil)
	}
	if len(body.Images) == 0 {
		return SendErrorResponse(c, 400, "At least one image is required", nil)
	}

	listingId, err := repository.CreateListing(userId, body)
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	return SendSuccessResponse(c, 201, "Listing created successfully", map[string]any{"listingId": listingId})
}

func GetListingEditById(c *fiber.Ctx) error {
	fmt.Println(c.Path())

	listingId := strings.TrimSpace(c.Params("id"))
	if listingId == "" {
		return SendErrorResponse(c, 400, "Listing ID is required", nil)
	}

	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	listing, err := repository.GetListingEditDataById(userId, listingId)
	if err != nil {
		return SendErrorResponse(c, 404, err.Error(), err)
	}

	included := parseJSONStringArray(listing.Included)
	highlights := parseJSONStringArray(listing.Highlights)

	data := map[string]any{
		"id":             listing.Id,
		"type":           listing.Type,
		"title":          listing.Title,
		"category":       listing.Category,
		"price":          listing.Price,
		"priceUnit":      listing.PriceUnit,
		"description":    listing.Description,
		"highlights":     highlights,
		"locationCity":   listing.LocationCity,
		"locationProv":   listing.LocationProv,
		"locationBrgy":   listing.LocationBrgy,
		"condition":      mapConditionDisplay(listing.Condition),
		"deliveryMethod": mapDeliveryDisplay(listing.DeliveryMethod),
		"minPeriod":      formatMinPeriod(listing.MinRentalPeriod),
		"availability":   "",
		"deposit":        listing.Deposit,
		"turnaround":     listing.Turnaround,
		"serviceArea":    listing.ServiceArea,
		"inclusions":     []string{},
		"amenities":      []string{},
	}

	if listing.AvailableFrom != nil {
		data["availability"] = listing.AvailableFrom.Format("2006-01-02")
	}

	if listing.Type == "rent" {
		data["amenities"] = included
	} else {
		data["inclusions"] = included
	}

	return SendSuccessResponse(c, 200, "Listing edit data fetched successfully", data)
}

func UpdateListing(c *fiber.Ctx) error {
	fmt.Println(c.Path())

	listingId := strings.TrimSpace(c.Params("id"))
	if listingId == "" {
		return SendErrorResponse(c, 400, "Listing ID is required", nil)
	}

	var body model.CreateListingBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	if strings.TrimSpace(body.Type) == "" {
		return SendErrorResponse(c, 400, "Listing type is required", nil)
	}
	if strings.TrimSpace(body.Title) == "" {
		return SendErrorResponse(c, 400, "Title is required", nil)
	}
	if strings.TrimSpace(body.Category) == "" {
		return SendErrorResponse(c, 400, "Category is required", nil)
	}
	if body.Price <= 0 {
		return SendErrorResponse(c, 400, "Price must be greater than 0", nil)
	}
	if strings.TrimSpace(body.Description) == "" {
		return SendErrorResponse(c, 400, "Description is required", nil)
	}
	if strings.TrimSpace(body.LocationCity) == "" || strings.TrimSpace(body.LocationProv) == "" {
		return SendErrorResponse(c, 400, "City and province are required", nil)
	}

	if err := repository.UpdateListing(userId, listingId, body); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Listing updated successfully", map[string]any{"listingId": listingId})
}

func DeleteListing(c *fiber.Ctx) error {
	fmt.Println(c.Path())

	listingId := strings.TrimSpace(c.Params("id"))
	if listingId == "" {
		return SendErrorResponse(c, 400, "Listing ID is required", nil)
	}

	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	if err := repository.DeleteListing(userId, listingId); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Listing removed successfully", map[string]any{"listingId": listingId})
}

func GetListingById(c *fiber.Ctx) error {
	fmt.Println(c.Path())

	listingId := strings.TrimSpace(c.Params("id"))
	if listingId == "" {
		return SendErrorResponse(c, 400, "Listing ID is required", nil)
	}

	listing, err := repository.GetListingDetailById(listingId)
	if err != nil {
		return SendErrorResponse(c, 404, err.Error(), err)
	}

	images, err := repository.GetListingImages(listingId)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	userId := getOptionalUserIdFromSession(c)
	related, err := repository.GetRelatedListings(listingId, listing.CategoryID, listing.Type, userId)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	isBookmarked := false
	if strings.TrimSpace(userId) != "" {
		bookmarked, err := repository.IsListingBookmarked(userId, listingId)
		if err != nil {
			return SendErrorResponse(c, 500, err.Error(), err)
		}
		isBookmarked = bookmarked
	}

	baseURL := c.BaseURL()
	features := parseJSONStringArray(listing.Highlights)
	included := parseJSONStringArray(listing.Included)

	extra := map[string]any{
		"description":    listing.Description,
		"condition":      mapConditionDisplay(listing.Condition),
		"images":         mapAssetURLs(baseURL, images),
		"features":       features,
		"views":          listing.ViewCount,
		"offers":         0,
		"deliveryMethod": mapDeliveryDisplay(listing.DeliveryMethod),
	}

	if listing.Type == "rent" {
		extra["minPeriod"] = formatMinPeriod(listing.MinRentalPeriod)
		if listing.AvailableFrom != nil {
			extra["availability"] = listing.AvailableFrom.Format("Jan 02, 2006")
		}
		extra["deposit"] = listing.Deposit
		extra["amenities"] = included
	} else if listing.Type == "service" {
		extra["turnaround"] = listing.Turnaround
		extra["serviceArea"] = listing.ServiceArea
		extra["inclusions"] = included
	} else {
		extra["inclusions"] = included
	}

	listingCard := map[string]any{
		"id":        listing.Id,
		"title":     listing.Title,
		"price":     listing.Price,
		"priceUnit": listing.PriceUnit,
		"type":      listing.Type,
		"category":  listing.Category,
		"location":  strings.TrimSpace(fmt.Sprintf("%s, %s", listing.LocationCity, listing.LocationProv)),
		"postedAt":  timeAgo(listing.CreatedAt),
		"imageUrl":  mapPrimaryImage(baseURL, images),
		"seller": map[string]any{
			"id":     listing.SellerId,
			"name":   listing.SellerName,
			"rating": listing.SellerRating,
			"isPro":  listing.SellerVerified,
		},
	}

	return SendSuccessResponse(c, 200, "Listing fetched successfully", map[string]any{
		"listing":      listingCard,
		"extra":        extra,
		"related":      mapRelatedListings(baseURL, related),
		"isBookmarked": isBookmarked,
	})
}

func AddListingBookmark(c *fiber.Ctx) error {
	fmt.Println(c.Path())

	listingId := strings.TrimSpace(c.Params("id"))
	if listingId == "" {
		return SendErrorResponse(c, 400, "Listing ID is required", nil)
	}

	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	if err := repository.AddBookmark(userId, listingId); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Listing bookmarked successfully", map[string]any{
		"listingId": listingId,
	})
}

func RemoveListingBookmark(c *fiber.Ctx) error {
	fmt.Println(c.Path())

	listingId := strings.TrimSpace(c.Params("id"))
	if listingId == "" {
		return SendErrorResponse(c, 400, "Listing ID is required", nil)
	}

	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	if err := repository.RemoveBookmark(userId, listingId); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Listing bookmark removed successfully", map[string]any{
		"listingId": listingId,
	})
}

func GetListings(c *fiber.Ctx) error {
	fmt.Println(c.Path())

	userId := getOptionalUserIdFromSession(c)
	listings, err := repository.GetAllListings(userId)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	baseURL := c.BaseURL()
	items := make([]map[string]any, 0, len(listings))
	for _, l := range listings {
		location := strings.TrimSpace(fmt.Sprintf("%s, %s", l.LocationCity, l.LocationProv))
		items = append(items, map[string]any{
			"id":        l.Id,
			"title":     l.Title,
			"price":     l.Price,
			"priceUnit": l.PriceUnit,
			"type":      strings.ToLower(strings.TrimSpace(l.Type)),
			"category":  l.Category,
			"condition": mapConditionDisplay(l.Condition),
			"location":  location,
			"postedAt":  timeAgo(l.CreatedAt),
			"createdAt": l.CreatedAt.UnixMilli(),
			"imageUrl":  mapPrimaryImage(baseURL, []string{l.ImageUrl}),
			"seller": map[string]any{
				"name":   l.SellerName,
				"rating": l.SellerRating,
				"isPro":  l.SellerIsPro,
			},
		})
	}

	return SendSuccessResponse(c, 200, "Listings fetched successfully", map[string]any{
		"listings": items,
	})
}

func getOptionalUserIdFromSession(c *fiber.Ctx) string {
	sessionToken := strings.TrimSpace(c.Cookies("session_token"))
	if sessionToken == "" {
		return ""
	}

	sessionId := middleware.HashToken(sessionToken)
	session, err := repository.GetSessionById(sessionId)
	if err != nil {
		return ""
	}

	if session.UserId == "" || session.IsRevoked || session.ExpiresAt.Before(time.Now()) {
		return ""
	}

	return session.UserId
}

func parseJSONStringArray(raw string) []string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return []string{}
	}

	var parsed []string
	if err := json.Unmarshal([]byte(trimmed), &parsed); err != nil {
		return []string{trimmed}
	}

	out := make([]string, 0, len(parsed))
	for _, item := range parsed {
		v := strings.TrimSpace(item)
		if v != "" {
			out = append(out, v)
		}
	}
	return out
}

func mapConditionDisplay(raw string) string {
	switch strings.ToUpper(strings.TrimSpace(raw)) {
	case "NEW":
		return "New"
	case "LIKE_NEW":
		return "Like New"
	case "LIGHTLY_USED":
		return "Lightly Used"
	case "WELL_USED":
		return "Well Used"
	case "HEAVILY_USED":
		return "Heavily Used"
	default:
		return ""
	}
}

func mapDeliveryDisplay(raw string) string {
	switch strings.ToUpper(strings.TrimSpace(raw)) {
	case "MEETUP":
		return "Meet-up only"
	case "SHIPPING":
		return "Delivery available"
	case "BOTH":
		return "Meet-up or Delivery"
	default:
		return ""
	}
}

func formatMinPeriod(v int) string {
	if v <= 0 {
		return ""
	}
	if v == 1 {
		return "1 month"
	}
	return fmt.Sprintf("%d months", v)
}

func mapAssetURLs(baseURL string, raw []string) []string {
	out := make([]string, 0, len(raw))
	for _, item := range raw {
		trimmed := strings.TrimSpace(item)
		if trimmed == "" {
			continue
		}
		if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
			out = append(out, trimmed)
			continue
		}
		out = append(out, strings.TrimRight(baseURL, "/")+"/"+strings.TrimLeft(trimmed, "/"))
	}
	return out
}

func mapPrimaryImage(baseURL string, raw []string) string {
	images := mapAssetURLs(baseURL, raw)
	if len(images) == 0 {
		return "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80"
	}
	return images[0]
}

func mapRelatedListings(baseURL string, listings []model.ProfileListingFromDb) []map[string]any {
	items := make([]map[string]any, 0, len(listings))
	for _, l := range listings {
		img := l.ImageUrl
		if img == "" {
			img = "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80"
		} else if !strings.HasPrefix(img, "http://") && !strings.HasPrefix(img, "https://") {
			img = strings.TrimRight(baseURL, "/") + "/" + strings.TrimLeft(img, "/")
		}

		items = append(items, map[string]any{
			"id":        l.Id,
			"title":     l.Title,
			"price":     l.Price,
			"priceUnit": l.PriceUnit,
			"type":      l.Type,
			"category":  l.Category,
			"location":  l.Location,
			"postedAt":  l.PostedAt,
			"imageUrl":  img,
			"seller": map[string]any{
				"name":   l.SellerName,
				"rating": l.SellerRating,
			},
		})
	}
	return items
}

func timeAgo(t time.Time) string {
	if t.IsZero() {
		return "recently"
	}
	delta := time.Since(t)
	if delta < time.Minute {
		return "just now"
	}
	if delta < time.Hour {
		return fmt.Sprintf("%dm ago", int(delta.Minutes()))
	}
	if delta < 24*time.Hour {
		return fmt.Sprintf("%dh ago", int(delta.Hours()))
	}
	if delta < 30*24*time.Hour {
		return fmt.Sprintf("%dd ago", int(delta.Hours()/24))
	}
	return t.Format("Jan 02, 2006")
}
