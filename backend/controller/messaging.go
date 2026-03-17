package controller

import (
	"fmt"
	"strings"
	"time"

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

func mapConversationPayload(baseURL string, row model.ConversationFromDb) map[string]any {
	lastMessageAt := ""
	if row.LastMessageAt != nil {
		lastMessageAt = row.LastMessageAt.UTC().Format(time.RFC3339)
	}

	return map[string]any{
		"id": row.Id,
		"listing": map[string]any{
			"id":          row.ListingId,
			"title":       row.ListingTitle,
			"price":       row.ListingPrice,
			"priceUnit":   row.ListingPriceUnit,
			"listingType": strings.ToUpper(strings.TrimSpace(row.ListingType)),
			"imageUrl":    toAbsoluteAssetURL(baseURL, row.ListingImageUrl),
			"status":      strings.ToUpper(strings.TrimSpace(row.ListingStatus)),
		},
		"otherParticipant": map[string]any{
			"id":              row.OtherUserId,
			"firstName":       row.OtherFirstName,
			"lastName":        row.OtherLastName,
			"profileImageUrl": toAbsoluteAssetURL(baseURL, row.OtherProfileImgUrl),
			"isOnline":        middleware.RealtimeHub.IsOnline(row.OtherUserId),
		},
		"lastMessage":            strings.TrimSpace(row.LastMessage),
		"lastMessageAt":          lastMessageAt,
		"otherLastReadMessageId": strings.TrimSpace(row.OtherLastReadMsgId),
		"unreadCount":            row.UnreadCount,
		"isSeller":               row.IsSeller,
	}
}

func GetConversations(c *fiber.Ctx) error {
	userId, err := getAuthenticatedUserId(c)
	if err != nil {
		return SendErrorResponse(c, 401, err.Error(), nil)
	}

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

	userId, err := getAuthenticatedUserId(c)
	if err != nil {
		return SendErrorResponse(c, 401, err.Error(), nil)
	}

	rows, attRows, reactRows, err := repository.GetMessagesByConversation(userId, conversationId)
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

	return SendSuccessResponse(c, 200, "Messages fetched successfully", map[string]any{"messages": messages})
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

	conversationId, err := repository.GetOrCreateConversationByListing(userId, strings.TrimSpace(body.ListingId))
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
	}

	return SendSuccessResponse(c, 200, "Conversation is ready", map[string]any{"conversationId": conversationId})
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
	if strings.TrimSpace(body.Content) == "" {
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

	msg, err := repository.CreateMessage(userId, conversationId, body.Content, replyToMessageId)
	if err != nil {
		return SendErrorResponse(c, 400, err.Error(), err)
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
