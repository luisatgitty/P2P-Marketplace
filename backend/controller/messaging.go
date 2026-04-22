package controller

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"p2p_marketplace/backend/config"
	"p2p_marketplace/backend/middleware"
	"p2p_marketplace/backend/model"
	"p2p_marketplace/backend/repository"

	"github.com/gofiber/fiber/v2"
)

func getAuthenticatedUserId(c *fiber.Ctx) (string, error) {
	userId := fmt.Sprintf("%v", c.Locals("userId"))
	if strings.TrimSpace(userId) == "" || userId == "%!v(<nil>)" {
		return "", fmt.Errorf("User is not authenticated")
	}
	return userId, nil
}

func toAbsoluteAssetURL(baseURL, raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return trimmed
	}
	return strings.TrimRight(baseURL, "/") + "/" + strings.TrimLeft(trimmed, "/")
}

func formatConversationSchedule(start, end *time.Time) string {
	if start == nil && end == nil {
		return ""
	}
	if start != nil && end != nil {
		return fmt.Sprintf("%s - %s", start.Format("Jan 02"), end.Format("Jan 02"))
	}
	if start != nil {
		return start.Format("Jan 02")
	}
	return end.Format("Jan 02")
}

func toActionPreviewText(content string) string {
	trimmed := strings.TrimSpace(content)
	prefixes := []string{"__OFFER_ACTION__:", "__DEAL_ACTION__:", "__SCHEDULE_ACTION__:", "__SOLD_ACTION__:"}
	for _, prefix := range prefixes {
		if strings.HasPrefix(trimmed, prefix) {
			action := strings.TrimSpace(strings.TrimPrefix(trimmed, prefix))
			if action == "" {
				return ""
			}
			return action
		}
	}
	return ""
}

func mapConversationPayload(baseURL string, row model.ConversationFromDb) map[string]any {
	daysOff := parseCSVOrJSONArray(row.DaysOff)
	timeWindows := parseTimeWindows(row.TimeWindows)
	availableFrom := ""
	if row.AvailableFrom != nil {
		availableFrom = row.AvailableFrom.Format("2006-01-02")
	}
	scheduleStart := ""
	if row.ScheduleStart != nil {
		scheduleStart = row.ScheduleStart.UTC().Format(time.RFC3339)
	}
	scheduleEnd := ""
	if row.ScheduleEnd != nil {
		scheduleEnd = row.ScheduleEnd.UTC().Format(time.RFC3339)
	}

	lastMessageAt := ""
	if row.LastMessageAt != nil {
		lastMessageAt = row.LastMessageAt.UTC().Format(time.RFC3339)
	}

	otherLockedUntil := ""
	if row.OtherLockedUntil != nil {
		otherLockedUntil = row.OtherLockedUntil.UTC().Format(time.RFC3339)
	}

	selfLockedUntil := ""
	if row.SelfLockedUntil != nil {
		selfLockedUntil = row.SelfLockedUntil.UTC().Format(time.RFC3339)
	}

	otherCity := strings.TrimSpace(row.OtherLocationCity)
	otherProvince := strings.TrimSpace(row.OtherLocationProv)
	otherLocation := strings.TrimSpace(strings.Join([]string{otherCity, otherProvince}, ", "))
	if otherCity == "" || otherProvince == "" {
		otherLocation = strings.TrimSpace(strings.Trim(strings.Join([]string{otherCity, otherProvince}, ", "), ", "))
	}

	now := time.Now().UTC()
	isOtherLocked := row.OtherLockedUntil != nil && row.OtherLockedUntil.After(now)
	isSelfLocked := row.SelfLockedUntil != nil && row.SelfLockedUntil.After(now)
	canSendMessage := row.OtherIsActive && !isOtherLocked && row.SelfIsActive && !isSelfLocked

	offerPrice := row.OfferPrice
	if offerPrice <= 0 {
		offerPrice = row.ListingPrice
	}

	return map[string]any{
		"id": row.Id,
		"listing": map[string]any{
			"id":                row.ListingId,
			"title":             row.ListingTitle,
			"price":             row.ListingPrice,
			"offer":             offerPrice,
			"transactionStatus": strings.ToUpper(strings.TrimSpace(row.TransactionStatus)),
			"providerAgreed":    row.ProviderAgreed,
			"clientAgreed":      row.ClientAgreed,
			"userAgreed":        row.UserAgreed,
			"canReview":         row.CanReview,
			"schedule":          formatConversationSchedule(row.ScheduleStart, row.ScheduleEnd),
			"scheduleStart":     scheduleStart,
			"scheduleEnd":       scheduleEnd,
			"availableFrom":     availableFrom,
			"daysOff":           daysOff,
			"timeWindows":       timeWindows,
			"priceUnit":         row.ListingPriceUnit,
			"listingType":       strings.ToUpper(strings.TrimSpace(row.ListingType)),
			"imageUrl":          toAbsoluteAssetURL(baseURL, row.ListingImageUrl),
			"status":            strings.ToUpper(strings.TrimSpace(row.ListingStatus)),
		},
		"otherParticipant": map[string]any{
			"id":                 row.OtherUserId,
			"firstName":          row.OtherFirstName,
			"lastName":           row.OtherLastName,
			"profileImageUrl":    toAbsoluteAssetURL(baseURL, row.OtherProfileImgUrl),
			"status":             strings.ToLower(strings.TrimSpace(row.OtherVerifStatus)),
			"cityMunicipality":   otherCity,
			"province":           otherProvince,
			"location":           otherLocation,
			"isOnline":           middleware.RealtimeHub.IsOnline(row.OtherUserId),
			"isActive":           row.OtherIsActive,
			"isLocked":           isOtherLocked,
			"accountLockedUntil": otherLockedUntil,
		},
		"lastMessage": func() string {
			actionText := toActionPreviewText(row.LastMessage)
			if actionText != "" {
				return actionText
			}
			return strings.TrimSpace(row.LastMessage)
		}(),
		"lastMessageAt":          lastMessageAt,
		"otherLastReadMessageId": strings.TrimSpace(row.OtherLastReadMsgId),
		"unreadCount":            row.UnreadCount,
		"isSeller":               row.IsSeller,
		"hasPendingReport":       row.HasPendingReport,
		"canSendMessage":         canSendMessage,
		"self": map[string]any{
			"isActive":           row.SelfIsActive,
			"isLocked":           isSelfLocked,
			"accountLockedUntil": selfLockedUntil,
		},
	}
}

func parseCSVOrJSONArray(raw string) []string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return []string{}
	}

	var parsed []string
	if err := json.Unmarshal([]byte(trimmed), &parsed); err == nil {
		out := make([]string, 0, len(parsed))
		for _, item := range parsed {
			value := strings.TrimSpace(item)
			if value != "" {
				out = append(out, value)
			}
		}
		return out
	}

	parts := strings.Split(trimmed, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value != "" {
			out = append(out, value)
		}
	}
	return out
}

func parseTimeWindows(raw string) []map[string]string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return []map[string]string{}
	}

	type windowRow struct {
		StartTime string `json:"startTime"`
		EndTime   string `json:"endTime"`
	}

	rows := make([]windowRow, 0)
	if err := json.Unmarshal([]byte(trimmed), &rows); err != nil {
		return []map[string]string{}
	}

	out := make([]map[string]string, 0, len(rows))
	for _, row := range rows {
		start := strings.TrimSpace(row.StartTime)
		end := strings.TrimSpace(row.EndTime)
		if start == "" || end == "" {
			continue
		}
		out = append(out, map[string]string{
			"startTime": start,
			"endTime":   end,
		})
	}

	return out
}

func GetConversations(c *fiber.Ctx) error {
	userId, err := getAuthenticatedUserId(c)
	if err != nil {
		return SendErrorResponse(c, 401, err.Error(), nil)
	}

	hasLimitParam := strings.TrimSpace(c.Query("limit")) != ""
	hasOffsetParam := strings.TrimSpace(c.Query("offset")) != ""
	hasPagination := hasLimitParam || hasOffsetParam

	limit := 15
	if hasPagination && hasLimitParam {
		parsedLimit, parseErr := strconv.Atoi(strings.TrimSpace(c.Query("limit")))
		if parseErr != nil || parsedLimit <= 0 {
			return SendErrorResponse(c, 400, "Limit must be a positive integer", parseErr)
		}
		if parsedLimit > 100 {
			parsedLimit = 100
		}
		limit = parsedLimit
	}

	offset := 0
	if hasPagination && hasOffsetParam {
		parsedOffset, parseErr := strconv.Atoi(strings.TrimSpace(c.Query("offset")))
		if parseErr != nil || parsedOffset < 0 {
			return SendErrorResponse(c, 400, "Offset must be a non-negative integer", parseErr)
		}
		offset = parsedOffset
	}

	if !hasPagination {
		rows, err := repository.GetConversationsByUser(userId)
		if err != nil {
			return SendErrorResponse(c, 500, err.Error(), err)
		}

		baseURL := c.BaseURL()
		items := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			items = append(items, mapConversationPayload(baseURL, row))
		}

		return SendSuccessResponse(c, 200, "Conversations fetched successfully", map[string]any{"conversations": items})
	}

	rows, total, err := repository.GetConversationsByUserPage(userId, limit, offset)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	baseURL := c.BaseURL()
	items := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapConversationPayload(baseURL, row))
	}

	return SendSuccessResponse(c, 200, "Conversations fetched successfully", map[string]any{
		"conversations": items,
		"total":         total,
		"limit":         limit,
		"offset":        offset,
	})
}

func GetConversation(c *fiber.Ctx) error {
	conversationId := strings.TrimSpace(c.Params("id"))
	if conversationId == "" {
		return SendErrorResponse(c, 400, "Conversation ID is required", nil)
	}

	userId, err := getAuthenticatedUserId(c)
	if err != nil {
		return SendErrorResponse(c, 401, err.Error(), nil)
	}

	row, err := repository.GetConversationById(userId, conversationId)
	if err != nil {
		return SendErrorResponse(c, 404, err.Error(), err)
	}

	payload := mapConversationPayload(c.BaseURL(), row)
	return SendSuccessResponse(c, 200, "Conversation fetched successfully", map[string]any{"conversation": payload})
}

func GetMessages(c *fiber.Ctx) error {
	conversationId := strings.TrimSpace(c.Params("id"))
	if conversationId == "" {
		return SendErrorResponse(c, 400, "Conversation ID is required", nil)
	}

	limit := config.MessagePageDefaultLimit
	if rawLimit := strings.TrimSpace(c.Query("limit")); rawLimit != "" {
		parsedLimit, parseErr := strconv.Atoi(rawLimit)
		if parseErr != nil || parsedLimit <= 0 {
			return SendErrorResponse(c, 400, "Limit must be a positive integer", parseErr)
		}
		if parsedLimit > config.MessagePageMaxLimit {
			parsedLimit = config.MessagePageMaxLimit
		}
		limit = parsedLimit
	}

	offset := 0
	if rawOffset := strings.TrimSpace(c.Query("offset")); rawOffset != "" {
		parsedOffset, parseErr := strconv.Atoi(rawOffset)
		if parseErr != nil || parsedOffset < 0 {
			return SendErrorResponse(c, 400, "Offset must be a non-negative integer", parseErr)
		}
		offset = parsedOffset
	}

	userId, err := getAuthenticatedUserId(c)
	if err != nil {
		return SendErrorResponse(c, 401, err.Error(), nil)
	}

	rows, attRows, reactRows, total, err := repository.GetMessagesByConversation(userId, conversationId, limit, offset)
	if err != nil {
		return SendErrorResponse(c, 500, err.Error(), err)
	}

	attachmentsByMessage := map[string][]map[string]any{}
	for _, att := range attRows {
		attachmentsByMessage[att.MessageId] = append(attachmentsByMessage[att.MessageId], map[string]any{
			"id":       att.Id,
			"fileUrl":  toAbsoluteAssetURL(c.BaseURL(), att.FileUrl),
			"fileType": strings.ToUpper(strings.TrimSpace(att.FileType)),
			"fileName": att.FileName,
			"fileSize": att.FileSize,
		})
	}

	reactionsByMessage := map[string][]map[string]any{}
	for _, react := range reactRows {
		reactionsByMessage[react.MessageId] = append(reactionsByMessage[react.MessageId], map[string]any{
			"userId": react.UserId,
			"type":   strings.ToUpper(strings.TrimSpace(react.Reaction)),
		})
	}

	messages := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		item := map[string]any{
			"id":             row.Id,
			"conversationId": row.ConversationId,
			"senderId":       row.SenderId,
			"status":         repository.NormalizeMessageStatus(row.Status),
			"createdAt":      row.CreatedAt.UTC().Format(time.RFC3339),
			"isEdited":       row.IsEdited,
			"isUnsent":       row.IsUnsent,
		}

		if !row.IsUnsent {
			trimmedContent := strings.TrimSpace(row.Content)
			if trimmedContent != "" {
				item["content"] = trimmedContent
			}
		}

		if atts, ok := attachmentsByMessage[row.Id]; ok && len(atts) > 0 {
			item["attachments"] = atts
		}
		if reacts, ok := reactionsByMessage[row.Id]; ok && len(reacts) > 0 {
			item["reactions"] = reacts
		}

		if strings.TrimSpace(row.ReplyMessageId) != "" {
			replySenderName := strings.TrimSpace(row.ReplySenderName)
			if row.ReplySenderId == userId {
				replySenderName = "You"
			}
			item["replyTo"] = map[string]any{
				"messageId":      row.ReplyMessageId,
				"senderId":       row.ReplySenderId,
				"senderName":     replySenderName,
				"contentPreview": strings.TrimSpace(row.ReplyContent),
			}
		}

		messages = append(messages, item)
	}

	return SendSuccessResponse(c, 200, "Messages fetched successfully", map[string]any{
		"messages": messages,
		"total":    total,
		"limit":    limit,
		"offset":   offset,
	})
}

func CreateConversationFromListing(c *fiber.Ctx) error {
	var body model.CreateConversationBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}
	if strings.TrimSpace(body.ListingId) == "" {
		return SendErrorResponse(c, 400, "Listing ID is required", nil)
	}

	userId, err := getAuthenticatedUserId(c)
	if err != nil {
		return SendErrorResponse(c, 401, err.Error(), nil)
	}

	offerPrice := 0
	if body.OfferPrice != nil {
		offerPrice = *body.OfferPrice
	}
	offerMessage := strings.TrimSpace(body.OfferMessage)
	startDate := strings.TrimSpace(body.StartDate)
	endDate := strings.TrimSpace(body.EndDate)
	startTime := strings.TrimSpace(body.StartTime)
	endTime := strings.TrimSpace(body.EndTime)
	scheduleMessage := strings.TrimSpace(body.ScheduleMessage)
	if utf8.RuneCountInString(offerMessage) > config.MessageContentMaxLength {
		return SendErrorResponse(c, 400, fmt.Sprintf("Offer message must not exceed %d characters", config.MessageContentMaxLength), nil)
	}
	if utf8.RuneCountInString(scheduleMessage) > config.MessageContentMaxLength {
		return SendErrorResponse(c, 400, fmt.Sprintf("Schedule message must not exceed %d characters", config.MessageContentMaxLength), nil)
	}
	hasScheduleRequest := startDate != "" || endDate != ""
	if hasScheduleRequest && (startDate == "" || endDate == "") {
		return SendErrorResponse(c, 400, "Start date and end date are required for schedule request", nil)
	}

	conversationId, err := repository.GetOrCreateConversationByListing(
		userId,
		strings.TrimSpace(body.ListingId),
		offerPrice,
		offerMessage,
		startDate,
		endDate,
		startTime,
		endTime,
		scheduleMessage,
	)
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	if offerPrice > 0 || hasScheduleRequest {
		conversation, convErr := repository.GetConversationById(userId, conversationId)
		if convErr != nil {
			return SendErrorResponse(c, 500, convErr.Error(), convErr)
		}

		realtimePayload := map[string]any{
			"type": "message:new",
			"data": map[string]any{
				"conversationId": conversationId,
			},
		}

		realtimeDealPayload := map[string]any{
			"type": "conversation:deal-updated",
			"data": map[string]any{
				"conversationId":    conversationId,
				"listingId":         conversation.ListingId,
				"transactionStatus": strings.ToUpper(strings.TrimSpace(conversation.TransactionStatus)),
				"providerAgreed":    conversation.ProviderAgreed,
				"clientAgreed":      conversation.ClientAgreed,
				"userAgreed":        conversation.UserAgreed,
			},
		}

		peerUserId, peerErr := repository.GetConversationPeerUserId(userId, conversationId)
		if peerErr == nil && strings.TrimSpace(peerUserId) != "" {
			middleware.RealtimeHub.SendToUser(peerUserId, realtimePayload)
			middleware.RealtimeHub.SendToUser(peerUserId, realtimeDealPayload)
		}
		middleware.RealtimeHub.SendToUser(userId, realtimePayload)
		middleware.RealtimeHub.SendToUser(userId, realtimeDealPayload)
	}

	return SendSuccessResponse(c, 200, "Conversation is ready", map[string]any{"conversationId": conversationId})
}

func UpdateConversationOfferByOwner(c *fiber.Ctx) error {
	conversationId := strings.TrimSpace(c.Params("id"))
	if conversationId == "" {
		return SendErrorResponse(c, 400, "Conversation ID is required", nil)
	}

	var body model.UpdateConversationOfferBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	offerPrice := 0
	if body.OfferPrice != nil {
		offerPrice = *body.OfferPrice
	}
	if offerPrice <= 0 {
		return SendErrorResponse(c, 400, "Offer price must be greater than 0", nil)
	}
	offerMessage := strings.TrimSpace(body.OfferMessage)
	if utf8.RuneCountInString(offerMessage) > config.MessageContentMaxLength {
		return SendErrorResponse(c, 400, fmt.Sprintf("Offer message must not exceed %d characters", config.MessageContentMaxLength), nil)
	}

	userId, err := getAuthenticatedUserId(c)
	if err != nil {
		return SendErrorResponse(c, 401, err.Error(), nil)
	}

	state, err := repository.UpdateConversationOfferByOwner(userId, conversationId, offerPrice, offerMessage)
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	realtimePayload := map[string]any{
		"type": "message:new",
		"data": map[string]any{
			"conversationId": state.ConversationId,
		},
	}

	realtimeDealPayload := map[string]any{
		"type": "conversation:deal-updated",
		"data": map[string]any{
			"conversationId":    state.ConversationId,
			"listingId":         state.ListingId,
			"transactionStatus": strings.ToUpper(strings.TrimSpace(state.TransactionStatus)),
			"providerAgreed":    state.ProviderAgreed,
			"clientAgreed":      state.ClientAgreed,
			"userAgreed":        state.UserAgreed,
		},
	}

	peerUserId, peerErr := repository.GetConversationPeerUserId(userId, conversationId)
	if peerErr == nil && strings.TrimSpace(peerUserId) != "" {
		middleware.RealtimeHub.SendToUser(peerUserId, realtimePayload)
		middleware.RealtimeHub.SendToUser(peerUserId, realtimeDealPayload)
	}
	middleware.RealtimeHub.SendToUser(userId, realtimePayload)
	middleware.RealtimeHub.SendToUser(userId, realtimeDealPayload)

	return SendSuccessResponse(c, 200, "Offer updated successfully", map[string]any{
		"conversationId": state.ConversationId,
	})
}

func SendMessage(c *fiber.Ctx) error {
	conversationId := strings.TrimSpace(c.Params("id"))
	if conversationId == "" {
		return SendErrorResponse(c, 400, "Conversation ID is required", nil)
	}

	var body model.SendMessageBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}
	if utf8.RuneCountInString(strings.TrimSpace(body.Content)) > config.MessageContentMaxLength {
		return SendErrorResponse(c, 400, fmt.Sprintf("Message content must not exceed %d characters", config.MessageContentMaxLength), nil)
	}
	if strings.TrimSpace(body.Content) == "" && len(body.Attachments) == 0 {
		return SendErrorResponse(c, 400, "Message content is required", nil)
	}

	userId, err := getAuthenticatedUserId(c)
	if err != nil {
		return SendErrorResponse(c, 401, err.Error(), nil)
	}

	replyToMessageId := ""
	if body.ReplyTo != nil {
		replyToMessageId = strings.TrimSpace(body.ReplyTo.MessageId)
	}

	msg, err := repository.CreateMessage(userId, conversationId, body.Content, replyToMessageId, body.Attachments)
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	attachments := make([]map[string]any, 0)
	if len(body.Attachments) > 0 {
		attRows, attErr := repository.GetMessageAttachmentsByMessageId(msg.Id)
		if attErr != nil {
			return SendErrorResponse(c, 500, attErr.Error(), attErr)
		}

		for _, att := range attRows {
			attachments = append(attachments, map[string]any{
				"id":       att.Id,
				"fileUrl":  toAbsoluteAssetURL(c.BaseURL(), att.FileUrl),
				"fileType": strings.ToUpper(strings.TrimSpace(att.FileType)),
				"fileName": att.FileName,
				"fileSize": att.FileSize,
			})
		}
	}

	payload := map[string]any{
		"id":             msg.Id,
		"conversationId": msg.ConversationId,
		"senderId":       msg.SenderId,
		"receiverId":     msg.ReceiverId,
		"content":        strings.TrimSpace(msg.Content),
		"status":         repository.NormalizeMessageStatus(msg.Status),
		"isEdited":       msg.IsEdited,
		"isUnsent":       msg.IsUnsent,
		"createdAt":      msg.CreatedAt.UTC().Format(time.RFC3339),
	}
	if len(attachments) > 0 {
		payload["attachments"] = attachments
	}
	if strings.TrimSpace(replyToMessageId) != "" {
		payload["replyTo"] = map[string]any{
			"messageId": replyToMessageId,
		}
	}

	if middleware.RealtimeHub.IsOnline(msg.ReceiverId) {
		_ = repository.MarkMessageDelivered(msg.ConversationId, msg.Id, msg.ReceiverId)
		payload["status"] = "DELIVERED"
		middleware.RealtimeHub.SendToUser(msg.SenderId, map[string]any{
			"type": "message:status",
			"data": map[string]any{
				"conversationId": msg.ConversationId,
				"messageId":      msg.Id,
				"status":         "DELIVERED",
			},
		})
	}

	middleware.RealtimeHub.SendToUser(msg.ReceiverId, map[string]any{
		"type": "message:new",
		"data": payload,
	})

	return SendSuccessResponse(c, 201, "Message sent successfully", map[string]any{"message": payload})
}

func ReactToMessage(c *fiber.Ctx) error {
	conversationId := strings.TrimSpace(c.Params("id"))
	messageId := strings.TrimSpace(c.Params("messageId"))
	if conversationId == "" || messageId == "" {
		return SendErrorResponse(c, 400, "Conversation ID and message ID are required", nil)
	}

	var body model.ReactMessageBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}

	userId, err := getAuthenticatedUserId(c)
	if err != nil {
		return SendErrorResponse(c, 401, err.Error(), nil)
	}

	if err := repository.UpsertMessageReaction(userId, conversationId, messageId, body.Reaction); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	peerUserId, err := repository.GetConversationPeerUserId(userId, conversationId)
	if err == nil && strings.TrimSpace(peerUserId) != "" {
		reactionValue := ""
		if body.Reaction != nil {
			reactionValue = strings.ToUpper(strings.TrimSpace(*body.Reaction))
		}

		middleware.RealtimeHub.SendToUser(peerUserId, map[string]any{
			"type": "reaction:update",
			"data": map[string]any{
				"conversationId": conversationId,
				"messageId":      messageId,
				"userId":         userId,
				"reaction":       reactionValue,
			},
		})
	}

	return SendSuccessResponse(c, 200, "Reaction updated successfully", nil)
}

func EditMessage(c *fiber.Ctx) error {
	conversationId := strings.TrimSpace(c.Params("id"))
	messageId := strings.TrimSpace(c.Params("messageId"))
	if conversationId == "" || messageId == "" {
		return SendErrorResponse(c, 400, "Conversation ID and message ID are required", nil)
	}

	var body model.EditMessageBody
	if err := c.BodyParser(&body); err != nil {
		return SendErrorResponse(c, 400, "Invalid request body. Please contact support.", err)
	}
	if utf8.RuneCountInString(strings.TrimSpace(body.Content)) > config.MessageContentMaxLength {
		return SendErrorResponse(c, 400, fmt.Sprintf("Message content must not exceed %d characters", config.MessageContentMaxLength), nil)
	}
	if strings.TrimSpace(body.Content) == "" {
		return SendErrorResponse(c, 400, "Message content is required", nil)
	}

	userId, err := getAuthenticatedUserId(c)
	if err != nil {
		return SendErrorResponse(c, 401, err.Error(), nil)
	}

	if err := repository.EditMessageContent(userId, conversationId, messageId, body.Content); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	peerUserId, peerErr := repository.GetConversationPeerUserId(userId, conversationId)
	if peerErr == nil && strings.TrimSpace(peerUserId) != "" {
		payload := map[string]any{
			"type": "message:edit",
			"data": map[string]any{
				"conversationId": conversationId,
				"messageId":      messageId,
				"content":        strings.TrimSpace(body.Content),
				"isEdited":       true,
			},
		}

		middleware.RealtimeHub.SendToUser(peerUserId, payload)
		middleware.RealtimeHub.SendToUser(userId, payload)
	}

	return SendSuccessResponse(c, 200, "Message edited successfully", nil)
}

func DeleteMessage(c *fiber.Ctx) error {
	conversationId := strings.TrimSpace(c.Params("id"))
	messageId := strings.TrimSpace(c.Params("messageId"))
	if conversationId == "" || messageId == "" {
		return SendErrorResponse(c, 400, "Conversation ID and message ID are required", nil)
	}

	userId, err := getAuthenticatedUserId(c)
	if err != nil {
		return SendErrorResponse(c, 401, err.Error(), nil)
	}

	unsend := strings.EqualFold(strings.TrimSpace(c.Query("unsend")), "true")
	if unsend {
		if err := repository.UnsendMessage(userId, conversationId, messageId); err != nil {
			return SendErrorResponse(c, 400, err.Error(), err)
		}

		peerUserId, peerErr := repository.GetConversationPeerUserId(userId, conversationId)
		if peerErr == nil && strings.TrimSpace(peerUserId) != "" {
			payload := map[string]any{
				"type": "message:unsend",
				"data": map[string]any{
					"conversationId": conversationId,
					"messageId":      messageId,
					"isUnsent":       true,
				},
			}

			middleware.RealtimeHub.SendToUser(peerUserId, payload)
			middleware.RealtimeHub.SendToUser(userId, payload)
		}

		return SendSuccessResponse(c, 200, "Message unsent successfully", nil)
	}

	if err := repository.DeleteMessageForUser(userId, conversationId, messageId); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Message deleted successfully", nil)
}

func MarkMessagesRead(c *fiber.Ctx) error {
	conversationId := strings.TrimSpace(c.Params("id"))
	if conversationId == "" {
		return SendErrorResponse(c, 400, "Conversation ID is required", nil)
	}

	userId, err := getAuthenticatedUserId(c)
	if err != nil {
		return SendErrorResponse(c, 401, err.Error(), nil)
	}

	lastReadMessageId, err := repository.MarkConversationRead(userId, conversationId)
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	peerUserId, peerErr := repository.GetConversationPeerUserId(userId, conversationId)
	if peerErr == nil && strings.TrimSpace(peerUserId) != "" {
		middleware.RealtimeHub.SendToUser(peerUserId, map[string]any{
			"type": "message:read",
			"data": map[string]any{
				"conversationId":    conversationId,
				"readerId":          userId,
				"lastReadMessageId": strings.TrimSpace(lastReadMessageId),
			},
		})

		if strings.TrimSpace(lastReadMessageId) != "" {
			middleware.RealtimeHub.SendToUser(peerUserId, map[string]any{
				"type": "message:status",
				"data": map[string]any{
					"conversationId": conversationId,
					"messageId":      strings.TrimSpace(lastReadMessageId),
					"status":         "READ",
				},
			})
		}
	}

	return SendSuccessResponse(c, 200, "Conversation marked as read", nil)
}

func DeleteConversation(c *fiber.Ctx) error {
	conversationId := strings.TrimSpace(c.Params("id"))
	if conversationId == "" {
		return SendErrorResponse(c, 400, "Conversation ID is required", nil)
	}

	userId, err := getAuthenticatedUserId(c)
	if err != nil {
		return SendErrorResponse(c, 401, err.Error(), nil)
	}

	if err := repository.DeleteConversationForUser(userId, conversationId); err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Conversation deleted successfully", nil)
}

func ToggleConversationDealAgreement(c *fiber.Ctx) error {
	conversationId := strings.TrimSpace(c.Params("id"))
	if conversationId == "" {
		return SendErrorResponse(c, 400, "Conversation ID is required", nil)
	}

	userId, err := getAuthenticatedUserId(c)
	if err != nil {
		return SendErrorResponse(c, 401, err.Error(), nil)
	}

	state, err := repository.ToggleConversationTransactionAgreement(userId, conversationId)
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	realtimeMessagePayload := map[string]any{
		"type": "message:new",
		"data": map[string]any{
			"conversationId": state.ConversationId,
		},
	}

	peerUserId, peerErr := repository.GetConversationPeerUserId(userId, conversationId)
	if peerErr == nil && strings.TrimSpace(peerUserId) != "" {
		payload := map[string]any{
			"type": "conversation:deal-updated",
			"data": map[string]any{
				"conversationId":    state.ConversationId,
				"listingId":         state.ListingId,
				"transactionStatus": strings.ToUpper(strings.TrimSpace(state.TransactionStatus)),
				"providerAgreed":    state.ProviderAgreed,
				"clientAgreed":      state.ClientAgreed,
				"userAgreed":        state.UserAgreed,
			},
		}

		middleware.RealtimeHub.SendToUser(peerUserId, payload)
		middleware.RealtimeHub.SendToUser(userId, payload)
		middleware.RealtimeHub.SendToUser(peerUserId, realtimeMessagePayload)
	}
	middleware.RealtimeHub.SendToUser(userId, realtimeMessagePayload)

	return SendSuccessResponse(c, 200, "Transaction agreement updated", map[string]any{
		"transactionStatus": strings.ToUpper(strings.TrimSpace(state.TransactionStatus)),
		"providerAgreed":    state.ProviderAgreed,
		"clientAgreed":      state.ClientAgreed,
		"userAgreed":        state.UserAgreed,
	})
}
