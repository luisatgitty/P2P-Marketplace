package controller

import (
	"encoding/json"
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

func CreateListing(c *fiber.Ctx) error {
	var body model.CreateListingBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	if err := middleware.ValidateCreateListingInput(&body, false); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	listingId, err := repository.CreateListing(userId, body)
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	return SendSuccessResponse(c, 201, "Listing created successfully", map[string]any{"listingId": listingId})
}

func GetListingEditById(c *fiber.Ctx) error {
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

	timeWindows, err := repository.GetListingTimeWindows(listingId)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	included := parseJSONStringArray(listing.Included)
	highlights := parseJSONStringArray(listing.Highlights)
	daysOff := parseJSONStringArray(listing.DaysOff)

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
		"arrangement":    listing.Arrangement,
		"inclusions":     []string{},
		"amenities":      []string{},
		"dayoffs":        daysOff,
		"timeWindows":    timeWindows,
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

	if err := middleware.ValidateCreateListingInput(&body, true); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	if err := repository.UpdateListing(userId, listingId, body); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Listing updated successfully", map[string]any{"listingId": listingId})
}

func DeleteListing(c *fiber.Ctx) error {
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

	return SendSuccessResponse(c, 200, "Listing removed successfully", map[string]any{
		"listingId": listingId,
		"status":    "DELETED",
	})
}

func ToggleListingVisibility(c *fiber.Ctx) error {
	listingId := strings.TrimSpace(c.Params("id"))
	if listingId == "" {
		return SendErrorResponse(c, 400, "Listing ID is required", nil)
	}

	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	nextStatus, err := repository.ToggleListingVisibility(userId, listingId)
	if err != nil {
		message := err.Error()
		if strings.EqualFold(message, "Listing not found or unauthorized") {
			return SendErrorResponse(c, 404, message, err)
		}
		if strings.EqualFold(message, "Cannot update visibility for deleted listing") || strings.EqualFold(message, "Cannot update visibility for sold listing") || strings.EqualFold(message, "Listing visibility cannot be toggled from current status") {
			return SendErrorResponse(c, 400, message, err)
		}
		return SendErrorResponse(c, 500, message, err)
	}

	return SendSuccessResponse(c, 200, "Listing visibility updated successfully", map[string]any{
		"listingId": listingId,
		"status":    nextStatus,
	})
}

func GetListingById(c *fiber.Ctx) error {
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

	timeWindows, err := repository.GetListingTimeWindows(listingId)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	userId := getOptionalUserIdFromSession(c)
	related, err := repository.GetRelatedListings(listingId, listing.CategoryID, listing.Type, listing.LocationProv, userId)
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
	daysOff := parseJSONStringArray(listing.DaysOff)

	extra := map[string]any{
		"description":      listing.Description,
		"condition":        mapConditionDisplay(listing.Condition),
		"images":           mapAssetURLs(baseURL, images),
		"features":         features,
		"transactionCount": listing.TransactionCount,
		"reviewCount":      listing.ReviewCount,
		"deliveryMethod":   mapDeliveryDisplay(listing.DeliveryMethod),
	}

	switch listing.Type {
	case "rent":
		extra["minPeriod"] = formatMinPeriod(listing.MinRentalPeriod)
		if listing.AvailableFrom != nil {
			extra["available_from"] = listing.AvailableFrom.Format("2006-01-02")
			extra["availability"] = listing.AvailableFrom.Format("Jan 02, 2006")
		}
		extra["deposit"] = listing.Deposit
		extra["amenities"] = included
		extra["daysOff"] = daysOff
	case "service":
		if listing.AvailableFrom != nil {
			extra["available_from"] = listing.AvailableFrom.Format("2006-01-02")
			extra["availability"] = listing.AvailableFrom.Format("Jan 02, 2006")
		}
		extra["turnaround"] = listing.Turnaround
		extra["serviceArea"] = listing.ServiceArea
		extra["arrangement"] = listing.Arrangement
		extra["inclusions"] = included
		extra["daysOff"] = daysOff
	default:
		extra["inclusions"] = included
	}

	extra["timeWindows"] = timeWindows

	listingCard := map[string]any{
		"id":         listing.Id,
		"title":      listing.Title,
		"price":      listing.Price,
		"priceUnit":  listing.PriceUnit,
		"type":       listing.Type,
		"status":     strings.ToLower(strings.TrimSpace(listing.Status)),
		"sellStatus": strings.ToLower(strings.TrimSpace(listing.SellStatus)),
		"category":   listing.Category,
		"location":   strings.TrimSpace(fmt.Sprintf("%s, %s", listing.LocationCity, listing.LocationProv)),
		"postedAt":   listing.CreatedAt.UTC().Format(time.RFC3339),
		"imageUrl":   mapPrimaryImage(baseURL, images),
		"seller": map[string]any{
			"id":              listing.SellerId,
			"name":            listing.SellerName,
			"profileImageUrl": mapPrimaryImage(baseURL, []string{listing.SellerProfileImage}),
			"rating":          listing.SellerRating,
			"isPro":           listing.SellerVerified,
			"isActive":        listing.SellerIsActive,
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

func MarkListingAsComplete(c *fiber.Ctx) error {
	listingId := strings.TrimSpace(c.Params("id"))
	if listingId == "" {
		return SendErrorResponse(c, 400, "Listing ID is required", nil)
	}

	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	affectedConversationIds, listingMarkedSold, err := repository.MarkListingAsComplete(userId, listingId)
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	if listingMarkedSold {
		participantIds, participantErr := repository.GetParticipantUserIdsByListing(listingId)
		if participantErr == nil {
			for _, targetUserId := range participantIds {
				middleware.RealtimeHub.SendToUser(targetUserId, map[string]any{
					"type": "listing:status",
					"data": map[string]any{
						"listingId":   listingId,
						"status":      "SOLD",
						"sellStatus":  "SOLD",
						"updatedById": userId,
					},
				})
			}
		}
	}

	for _, conversationId := range affectedConversationIds {
		trimmedConversationId := strings.TrimSpace(conversationId)
		if trimmedConversationId == "" {
			continue
		}

		realtimeMessagePayload := map[string]any{
			"type": "message:new",
			"data": map[string]any{
				"conversationId": trimmedConversationId,
			},
		}

		peerUserId, peerErr := repository.GetConversationPeerUserId(userId, trimmedConversationId)
		if peerErr == nil && strings.TrimSpace(peerUserId) != "" {
			middleware.RealtimeHub.SendToUser(peerUserId, realtimeMessagePayload)
		}
		middleware.RealtimeHub.SendToUser(userId, realtimeMessagePayload)
	}

	response := map[string]any{
		"listingId": listingId,
		"completed": true,
	}
	if listingMarkedSold {
		response["status"] = "SOLD"
	}

	return SendSuccessResponse(c, 200, "Listing transaction completed successfully", response)
}

func ReportListing(c *fiber.Ctx) error {
	listingId := strings.TrimSpace(c.Params("id"))
	if listingId == "" {
		return SendErrorResponse(c, 400, "Listing ID is required", nil)
	}

	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	var body model.ReportListingBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	if strings.TrimSpace(body.Reason) == "" {
		return SendErrorResponse(c, 400, "Report reason is required", nil)
	}

	normalizedReason := config.NormalizeReportReason(body.Reason)
	if normalizedReason == "" {
		return SendErrorResponse(c, 400, "Invalid report reason", nil)
	}

	trimmedDescription := strings.TrimSpace(body.Description)
	if len(trimmedDescription) > config.ReportDescriptionMaxLength {
		return SendErrorResponse(c, 400, "Report details must be at most 500 characters", nil)
	}

	descriptionWords := strings.Fields(trimmedDescription)
	if len(descriptionWords) > config.ReportDescriptionMaxWords {
		return SendErrorResponse(c, 400, "Report details must be at most 80 words", nil)
	}

	reportId, err := repository.CreateListingReport(userId, listingId, body.ReportedUserId, normalizedReason, trimmedDescription)
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	return SendSuccessResponse(c, 201, "Report submitted successfully", map[string]any{
		"reportId": reportId,
	})
}

func GetMyListingReview(c *fiber.Ctx) error {
	listingId := strings.TrimSpace(c.Params("id"))
	if listingId == "" {
		return SendErrorResponse(c, 400, "Listing ID is required", nil)
	}

	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	review, err := repository.GetMyListingReview(userId, listingId)
	if err != nil {
		if strings.EqualFold(strings.TrimSpace(err.Error()), "Review not found") {
			return SendErrorResponse(c, 404, err.Error(), err)
		}
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Review fetched successfully", map[string]any{
		"id":      review.Id,
		"rating":  review.Rating,
		"comment": strings.TrimSpace(review.Comment),
	})
}

func CreateListingReview(c *fiber.Ctx) error {
	listingId := strings.TrimSpace(c.Params("id"))
	if listingId == "" {
		return SendErrorResponse(c, 400, "Listing ID is required", nil)
	}

	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	var body model.ReviewListingBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	if body.Rating < config.ReviewRatingMin || body.Rating > config.ReviewRatingMax {
		return SendErrorResponse(c, 400, "Rating must be between 1 and 5", nil)
	}

	if len(strings.TrimSpace(body.Comment)) > config.ReviewCommentMaxLength {
		return SendErrorResponse(c, 400, "Review comment must be at most 500 characters", nil)
	}

	review, err := repository.CreateListingReview(userId, listingId, body.Rating, body.Comment)
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	return SendSuccessResponse(c, 201, "Review submitted successfully", map[string]any{
		"id":      review.Id,
		"rating":  review.Rating,
		"comment": strings.TrimSpace(review.Comment),
	})
}

func UpdateListingReview(c *fiber.Ctx) error {
	listingId := strings.TrimSpace(c.Params("id"))
	if listingId == "" {
		return SendErrorResponse(c, 400, "Listing ID is required", nil)
	}

	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	var body model.ReviewListingBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	if body.Rating < config.ReviewRatingMin || body.Rating > config.ReviewRatingMax {
		return SendErrorResponse(c, 400, "Rating must be between 1 and 5", nil)
	}

	if len(strings.TrimSpace(body.Comment)) > config.ReviewCommentMaxLength {
		return SendErrorResponse(c, 400, "Review comment must be at most 500 characters", nil)
	}

	review, err := repository.UpdateListingReview(userId, listingId, body.Rating, body.Comment)
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Review updated successfully", map[string]any{
		"id":      review.Id,
		"rating":  review.Rating,
		"comment": strings.TrimSpace(review.Comment),
	})
}

func DeleteListingReview(c *fiber.Ctx) error {
	listingId := strings.TrimSpace(c.Params("id"))
	if listingId == "" {
		return SendErrorResponse(c, 400, "Listing ID is required", nil)
	}

	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return SendErrorResponse(c, 401, "User is not authenticated", nil)
	}

	if err := repository.DeleteListingReview(userId, listingId); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Review deleted successfully", map[string]any{
		"listingId": listingId,
	})
}

func GetListings(c *fiber.Ctx) error {
	userId := getOptionalUserIdFromSession(c)

	limit := 25
	if rawLimit := strings.TrimSpace(c.Query("limit")); rawLimit != "" {
		parsedLimit, parseErr := strconv.Atoi(rawLimit)
		if parseErr != nil || parsedLimit <= 0 {
			return SendErrorResponse(c, 400, "limit must be a valid positive number", parseErr)
		}
		if parsedLimit > 100 {
			parsedLimit = 100
		}
		limit = parsedLimit
	}

	offset := 0
	if rawOffset := strings.TrimSpace(c.Query("offset")); rawOffset != "" {
		parsedOffset, parseErr := strconv.Atoi(rawOffset)
		if parseErr != nil || parsedOffset < 0 {
			return SendErrorResponse(c, 400, "offset must be a valid non-negative number", parseErr)
		}
		offset = parsedOffset
	}

	parseOptionalInt := func(raw string) (*int, error) {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			return nil, nil
		}

		parsed, err := strconv.Atoi(trimmed)
		if err != nil {
			return nil, err
		}

		return &parsed, nil
	}

	priceMin, err := parseOptionalInt(c.Query("priceMin"))
	if err != nil {
		return SendErrorResponse(c, 400, "priceMin must be a valid number", err)
	}

	priceMax, err := parseOptionalInt(c.Query("priceMax"))
	if err != nil {
		return SendErrorResponse(c, 400, "priceMax must be a valid number", err)
	}

	if priceMin != nil && *priceMin < 0 {
		return SendErrorResponse(c, 400, "priceMin cannot be negative", nil)
	}
	if priceMax != nil && *priceMax < 0 {
		return SendErrorResponse(c, 400, "priceMax cannot be negative", nil)
	}
	if priceMin != nil && priceMax != nil && *priceMin > *priceMax {
		return SendErrorResponse(c, 400, "priceMin cannot be greater than priceMax", nil)
	}

	filters := model.ListingsFilter{
		Type:      strings.TrimSpace(c.Query("type")),
		Keyword:   strings.TrimSpace(c.Query("keyword")),
		Category:  strings.TrimSpace(c.Query("category")),
		Condition: strings.TrimSpace(c.Query("condition")),
		Province:  strings.TrimSpace(c.Query("province")),
		City:      strings.TrimSpace(c.Query("city")),
		PriceMin:  priceMin,
		PriceMax:  priceMax,
		Sort:      strings.TrimSpace(c.Query("sort")),
		Limit:     limit,
		Offset:    offset,
	}

	listings, total, err := repository.GetAllListings(userId, filters)
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
			"status":    strings.ToLower(strings.TrimSpace(l.Status)),
			"category":  l.Category,
			"condition": mapConditionDisplay(l.Condition),
			"location":  location,
			"postedAt":  l.CreatedAt.UTC().Format(time.RFC3339),
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
		"total":    total,
		"limit":    limit,
		"offset":   offset,
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
		parts := strings.Split(trimmed, ",")
		out := make([]string, 0, len(parts))
		for _, part := range parts {
			value := strings.TrimSpace(part)
			if value != "" {
				out = append(out, value)
			}
		}
		if len(out) == 0 {
			return []string{trimmed}
		}
		return out
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
		return ""
	}
	return images[0]
}

func mapRelatedListings(baseURL string, listings []model.ProfileListingFromDb) []map[string]any {
	items := make([]map[string]any, 0, len(listings))
	for _, l := range listings {
		img := l.ImageUrl
		if img == "" {
			img = ""
		} else if !strings.HasPrefix(img, "http://") && !strings.HasPrefix(img, "https://") {
			img = strings.TrimRight(baseURL, "/") + "/" + strings.TrimLeft(img, "/")
		}

		items = append(items, map[string]any{
			"id":        l.Id,
			"title":     l.Title,
			"price":     l.Price,
			"priceUnit": l.PriceUnit,
			"type":      l.Type,
			"status":    strings.ToLower(strings.TrimSpace(l.Status)),
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
